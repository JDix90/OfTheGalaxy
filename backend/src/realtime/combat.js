/**
 * realtime/combat — server-authoritative real-time combat (Phase 4.3, full encounter
 * integration).
 *
 * RESOLUTION is in-memory and synchronous: it reuses combatService's PURE math
 * (calculateDamage / calculateAbilityDamage / getTemporaryEffects / applyAbilityDebuff)
 * directly on the actors' combatant blocks — no per-hit DB I/O. Turn cooldowns become
 * millisecond timers; abilities gain a spatial range. fx events carry the target's hit
 * position so the client renders damage numbers in the right spot.
 *
 * LIFECYCLE is async: an engagement is backed by a real `CombatEncounter` record so kills
 * flow through the EXISTING `endEncounter` → `distributeRewards` / quests / achievements /
 * respawn. The CombatManager (owned by WorldManager) processes engage/win/lost/flee intents.
 * A per-player `_finalizing` mutex serializes finalization (no double-finalize / double
 * rewards), and ensureEncounter abandons any stale `active` encounter first so a character
 * never has two active encounters at once.
 */

const combatService = require('../services/combatService');
const { getAbilityDefinition, isCombatUsable } = require('../data/abilityDefinitions');
const { weaponWorldRange, weaponClass, MELEE_WORLD_RANGE } = require('../data/items');
const { CombatEncounter } = require('../models');

const BASIC = 'basic_attack';
const BASIC_RANGE = MELEE_WORLD_RANGE; // fallback melee reach when unarmed (weapon-driven otherwise)
const BASIC_CD_MS = 850;
const BASIC_STAMINA = 3;
const ABILITY_RANGE_RANGED = 13;
const ABILITY_RANGE_MELEE = 6;
const TURN_MS = 1000;          // ability cooldown: turns → ms
const ENEMY_MELEE = 2.8;
const ENEMY_CD_MS = 1400;
const ENEMY_RANGED_CD_MS = 1900; // ranged enemies fire a touch slower than melee swings
const DISENGAGE_MS = 6000;
// Dodge-roll (Phase 4.4)
const DODGE_CD_MS = 1000;
const IFRAME_MS = 450;       // invulnerability window
const DASH_SPEED = 17;       // world units/s during the dash
const DASH_MS = 180;

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/** Equipped-weapon world attack range for a combatant (melee/unarmed → MELEE_WORLD_RANGE). */
const attackRangeOf = (combatant) => weaponWorldRange(combatant && combatant.equipment && combatant.equipment.weapon);
/** True when the combatant's equipped weapon is a ranged class (drives the tracer/ranged feel). */
const isRangedWeapon = (combatant) => weaponClass(combatant && combatant.equipment && combatant.equipment.weapon) === 'ranged';

/** Dodge-roll: brief i-frames + a forward dash (applied in PlanetWorld.step). */
function resolveDodge(world, player, now) {
  if (!player || player.dead) return;
  if (now < (player.dodgeCdUntil || 0)) return;
  player.dodgeCdUntil = now + DODGE_CD_MS;
  player.iFrameUntil = now + IFRAME_MS;
  player.dashUntil = now + DASH_MS;
  player.dashSpeed = DASH_SPEED;
  world.pushFx({ type: 'dodge', id: player.id, x: player.x, z: player.z });
}

/** Apply a calculateDamage-style result to a combatant (shield first, then health). */
function applyDamage(target, result) {
  if (!result || !result.hit) return;
  if (result.shieldDamage > 0 && Array.isArray(target.temporaryEffects)) {
    for (let i = target.temporaryEffects.length - 1; i >= 0; i--) {
      const e = target.temporaryEffects[i];
      if (e.type === 'shield' && e.duration > 0) {
        e.value = Math.max(0, e.value - result.shieldDamage);
        if (e.value <= 0) target.temporaryEffects.splice(i, 1); // drop depleted shield (no leak)
        break;
      }
    }
  }
  // Keep health an integer (DB column is int; endEncounter persists it verbatim).
  if (result.damage > 0) target.stats.health = Math.max(0, Math.round(target.stats.health - result.damage));
}

/** Player → enemy cast (basic attack or ability). Sync; mutates state + queues fx/intents. */
function resolveCast(world, player, msg, now) {
  if (!player || player.dead || !player.combatant) return;
  const enemy = world.enemies.get(String(msg.targetId)); // may be null for self-cast abilities
  const abilityId = msg.ability || BASIC;
  // Instanced (e.g. tutorial) enemies can only be engaged by their owner — no kill-stealing the
  // training drone in a shared spaceport world.
  if (enemy && enemy.ownerId && enemy.ownerId !== player.id) return;

  if (abilityId === BASIC) {
    if (!enemy || enemy.dead) return;
    if (now < (player.abilityCdUntil[BASIC] || 0)) return;
    if (dist(player, enemy) > attackRangeOf(player.combatant)) return;
    if (player.combatant.stats.stamina < BASIC_STAMINA) return;
    player.combatant.stats.stamina = Math.max(0, player.combatant.stats.stamina - BASIC_STAMINA);
    const res = combatService.calculateDamage(player.combatant, enemy.combatant);
    applyDamage(enemy.combatant, res);
    player.abilityCdUntil[BASIC] = now + BASIC_CD_MS;
    afterPlayerHit(world, player, enemy, res, now, BASIC, isRangedWeapon(player.combatant));
    return;
  }

  const def = getAbilityDefinition(abilityId);
  if (!def || !isCombatUsable(abilityId)) {
    if (!def) console.warn('[combat] invalid ability cast', { player: player.id, ability: abilityId });
    return;
  }
  // Must actually know the ability (server-authoritative kit). A player with no abilities
  // can only basic-attack — the empty-array case must REJECT, not fall open.
  if (!Array.isArray(player.abilities) || !player.abilities.includes(abilityId)) return;
  if (now < (player.abilityCdUntil[abilityId] || 0)) return;
  const cost = (def.cost && def.cost.stamina) || 0;
  if (player.combatant.stats.stamina < cost) return;
  const eff = def.effects || {};
  const selfCast = def.targetType === 'self' || def.targetType === 'ally'; // targetType is authoritative

  if (selfCast) {
    player.combatant.stats.stamina = Math.max(0, player.combatant.stats.stamina - cost);
    const enc = { combatants: [player.combatant] };
    if (eff.heal) {
      const before = player.combatant.stats.health;
      try { combatService.calculateAbilityHeal(enc, player.combatant, player.combatant, def); } catch (e) {}
      player.combatant.stats.health = Math.min(player.combatant.stats.maxHealth, Math.round(player.combatant.stats.health));
      world.pushFx({ type: 'heal', targetId: player.id, x: player.x, z: player.z, amount: Math.max(0, Math.round(player.combatant.stats.health - before)), ability: abilityId });
    }
    if (eff.buff) {
      try { combatService.applyAbilityBuff(enc, player.combatant, player.combatant, eff.buff); } catch (e) {}
      world.pushFx({ type: 'buff', targetId: player.id, x: player.x, z: player.z, ability: abilityId });
    }
    player.abilityCdUntil[abilityId] = now + (def.cooldown || 1) * TURN_MS;
    player.lastCombatAt = now;
    return;
  }

  // enemy-targeted (damage / debuff). A damage ability reaches at least ABILITY_RANGE_RANGED, but a
  // ranged weapon (e.g. sniper) extends it to the weapon's world range; non-damage debuffs stay short.
  if (!enemy || enemy.dead) return;
  const range = eff.damage ? Math.max(ABILITY_RANGE_RANGED, attackRangeOf(player.combatant)) : ABILITY_RANGE_MELEE;
  if (dist(player, enemy) > range) return;
  player.combatant.stats.stamina = Math.max(0, player.combatant.stats.stamina - cost);
  const enc = { combatants: [player.combatant, enemy.combatant] };
  let res = { hit: true, damage: 0, critical: false };
  if (eff.damage) {
    const out = combatService.calculateAbilityDamage(enc, player.combatant, [enemy.combatant], def); // mutates target hp
    const td = out && out.targets && out.targets[0];
    res = { hit: true, damage: td ? td.damage : 0, critical: td ? !!td.critical : false };
    enemy.combatant.stats.health = Math.max(0, Math.round(enemy.combatant.stats.health)); // keep integer
  }
  if (eff.debuff) {
    try { combatService.applyAbilityDebuff(enc, player.combatant, enemy.combatant, eff.debuff); } catch (e) {}
  }
  player.abilityCdUntil[abilityId] = now + (def.cooldown || 1) * TURN_MS;
  // A damage ability fired from a ranged weapon draws the ranged tracer/muzzle feel too.
  afterPlayerHit(world, player, enemy, res, now, abilityId, !!eff.damage && isRangedWeapon(player.combatant));
}

function afterPlayerHit(world, player, enemy, res, now, abilityId, ranged = false) {
  player.lastCombatAt = now;
  enemy.aggressive = true; // a struck enemy fights back — wakes a passive/tutorial drone
  if (!player.engagedEnemies.has(enemy.id)) player.engagedEnemies.set(enemy.id, enemy.combatant);
  // sx/sz = attacker origin; `ranged` lets the client draw a bolt/tracer + muzzle flash from it.
  world.pushFx({ type: 'hit', sourceId: player.id, targetId: enemy.id, x: enemy.x, z: enemy.z, sx: player.x, sz: player.z, ranged: !!ranged, dmg: res.damage || 0, crit: !!res.critical, dodged: !!res.dodged, miss: !res.hit, ability: abilityId });
  world.pushIntent({ type: 'engage', playerId: player.id });
  if (enemy.combatant.stats.health <= 0) onEnemyDeath(world, player, enemy);
}

function onEnemyDeath(world, player, enemy) {
  if (enemy.dead) return;
  enemy.dead = true;
  world.pushFx({ type: 'death', id: enemy.id, kind: 'enemy' });
  world.enemies.delete(enemy.id); // remove the actor; its combatant stays in engagedEnemies for rewards
  // Win when every engaged enemy is down.
  const allDead = ![...player.engagedEnemies.values()].some((c) => c.stats.health > 0);
  if (allDead) world.pushIntent({ type: 'win', playerId: player.id });
}

/** Enemy → player melee attack (called from the enemy AI when in range + off cooldown). */
function enemyTryAttack(world, enemy, target, now) {
  if (enemy.dead || !target || target.dead) return;
  // Range + cooldown are weapon-driven: a rifle-armed enemy attacks from its weapon's world range,
  // a melee enemy only at ~2.8. `ranged` drives the enemy→player tracer + a slightly slower cadence.
  const ranged = isRangedWeapon(enemy.combatant);
  if (dist(enemy, target) > attackRangeOf(enemy.combatant)) return;
  if (now < (enemy.attackCdUntil || 0)) return;
  enemy.attackCdUntil = now + (ranged ? ENEMY_RANGED_CD_MS : ENEMY_CD_MS);
  // Dodge i-frames: the swing/shot whiffs.
  if (now < (target.iFrameUntil || 0)) {
    world.pushFx({ type: 'hit', sourceId: enemy.id, targetId: target.id, x: target.x, z: target.z, sx: enemy.x, sz: enemy.z, ranged, dmg: 0, dodged: true });
    return;
  }
  const res = combatService.calculateDamage(enemy.combatant, target.combatant);
  applyDamage(target.combatant, res);
  // Tutorial safety floor: a first-timer can't be killed by the training drone (set while the
  // tutorial fight is live; cleared on finalize). No effect on normal players (_hpFloor unset).
  if (target._hpFloor && target.combatant.stats.health < target._hpFloor) {
    target.combatant.stats.health = target._hpFloor;
  }
  target.lastCombatAt = now;
  if (!target.engagedEnemies.has(enemy.id)) target.engagedEnemies.set(enemy.id, enemy.combatant);
  world.pushFx({ type: 'hit', sourceId: enemy.id, targetId: target.id, x: target.x, z: target.z, sx: enemy.x, sz: enemy.z, ranged, dmg: res.damage || 0, crit: !!res.critical, dodged: !!res.dodged, miss: !res.hit });
  world.pushIntent({ type: 'engage', playerId: target.id });
  if (target.combatant.stats.health <= 0 && !target.dead) {
    target.dead = true;
    world.pushFx({ type: 'death', id: target.id, kind: 'player' });
    world.pushIntent({ type: 'lost', playerId: target.id });
  }
}

// A turn-based encounter created within this window is treated as a LIVE fight the player just
// started (the brief pre-navigation race where a 3D enemy could still land a hit) and is NOT
// clobbered by the realtime engine. Anything older is a stale orphan and is safe to abandon —
// while a player is connected to the 3D world they are, by definition, not on the turn-based
// combat screen, so an old active turn-based row means they walked away from it.
const FRESH_TURNBASED_MS = 60 * 1000;

/**
 * Derive a realtime encounter's `encounterType` + `metadata` from the world it happens in.
 * Surface → 'random'. ANY submap world (dungeon OR hub like the spaceport) → subMapId/
 * parentLocationId + a `respawn` point (the entrance, as 0–100 surface %) so a death stays
 * COHERENT in the submap instead of being kicked to a surface POI (the data-integrity fix).
 * Only true dungeons get encounterType 'dungeon' (which also runs endEncounter's dungeon-service
 * branch: clear_dungeon tracking, enemy-state, 0.5× penalty); hub submaps stay 'random'.
 * Pure (no I/O) so it can be unit-tested without a DB.
 */
function buildEncounterMeta(world) {
  const zone = (world && world.zone) || { type: 'surface' };
  const metadata = { realtime: true, planetId: world && world.planetId };
  const subMapId = zone.subMapId || (world && world.subMapId) || null;
  if (!subMapId) return { encounterType: 'random', metadata }; // pure surface
  metadata.subMapId = subMapId;
  metadata.parentLocationId = zone.parentLocationId || null;
  const dims = zone.dims || { w: 12, h: 12 };
  const e = zone.entrance;
  if (e && Number.isFinite(e.x) && Number.isFinite(e.y)) {
    // Same grid→percent mapping PlanetWorld.spawnFor uses (cell-center; percent kept as-is).
    const g2p = (v, dim) => (v > dim ? (v > 100 ? v / 10 : v) : ((v + 0.5) / dim) * 100);
    metadata.respawn = { x: g2p(e.x, dims.w), y: g2p(e.y, dims.h) };
  }
  return { encounterType: zone.type === 'dungeon' ? 'dungeon' : 'random', metadata };
}

/** Build the client ability hotbar from a character's known, combat-usable abilities. */
function buildHotbar(character) {
  const known = Array.isArray(character.abilities) ? character.abilities : [];
  const out = [];
  for (const id of known) {
    if (!isCombatUsable(id)) continue;
    const d = getAbilityDefinition(id);
    if (!d) continue;
    out.push({ id, name: d.name, type: d.type, cd: d.cooldown || 1, stam: (d.cost && d.cost.stamina) || 0, target: d.targetType });
  }
  return out;
}

class CombatManager {
  /** Send a message to one player's socket (best-effort; never throws into the tick). */
  _send(player, msg) {
    if (player && player.ws && player.ws.readyState === player.ws.OPEN) {
      try { player.ws.send(JSON.stringify(msg)); } catch (_) {}
    }
  }

  /**
   * Apply a consumable to the player's AUTHORITATIVE in-world combatant (heal / stamina /
   * temporary effects), decrement inventory, and track use-item quest objectives (e.g.
   * tutorial_heal). Used by the WS `t:'item'` path AND — for a live in-world player — by the
   * HTTP inventory path, so a heal is never lost to the realtime autosave overwriting a direct
   * currentHealth write. Throws on an invalid/absent consumable: the WS handler swallows it;
   * the HTTP path surfaces it as an error.
   */
  async useItem(world, player, itemId) {
    if (!player || !player.combatant || !itemId) throw new Error('Item not usable');
    if (player.dead) throw new Error('Cannot use items while defeated');
    const { getItemDefinition } = require('../data/items');
    const itemDef = getItemDefinition(itemId);
    if (!itemDef || itemDef.type !== 'consumable') throw new Error('Item is not a consumable');
    const inventoryService = require('../services/inventoryService');
    // Decrement FIRST — throws if the player doesn't actually have it (so no effect is applied).
    await inventoryService.removeItem(player.characterId, itemId, 1);

    const st = player.combatant.stats;
    const before = st.health;
    const heal = (itemDef.stats && (itemDef.stats.healthRestore || itemDef.stats.healing)) || 0;
    if (itemDef.stats && itemDef.stats.fullHeal === true) st.health = st.maxHealth;
    else if (heal > 0) st.health = Math.min(st.maxHealth, Math.round(st.health + heal));
    const healed = Math.max(0, Math.round(st.health - before));

    const sta = (itemDef.stats && itemDef.stats.staminaRestore) || 0;
    let stamRestored = 0;
    if (sta > 0) { const b = st.stamina; st.stamina = Math.min(st.maxStamina, st.stamina + sta); stamRestored = st.stamina - b; }

    // Temporary effects (shield / accuracy / damage / stealth) — same shape as executeUseItem.
    player.combatant.temporaryEffects = player.combatant.temporaryEffects || [];
    const addEff = (type, key, dur) => { if (itemDef.stats && itemDef.stats[key]) player.combatant.temporaryEffects.push({ type, value: itemDef.stats[key], duration: (itemDef.stats.duration || dur), source: itemId }); };
    addEff('shield', 'temporaryShield', 300); addEff('accuracy', 'temporaryAccuracy', 180);
    addEff('damage', 'temporaryDamage', 240); addEff('stealth', 'temporaryStealth', 300);

    try { await inventoryService.trackUseItemObjectives(player.characterId, itemId); } catch (e) { /* non-fatal */ }

    if (healed > 0) world.pushFx({ type: 'heal', targetId: player.id, x: player.x, z: player.z, amount: healed });
    else world.pushFx({ type: 'buff', targetId: player.id, x: player.x, z: player.z });

    return { itemId, itemName: itemDef.name, healthRestored: healed, staminaRestored: stamRestored, fullHeal: !!(itemDef.stats && itemDef.stats.fullHeal) };
  }

  async handleIntent(world, intent) {
    const player = world.players.get(intent.playerId);
    if (!player) return;
    try {
      if (intent.type === 'engage') await this.ensureEncounter(world, player);
      else if (intent.type === 'win') await this.finalize(world, player, 'won');
      else if (intent.type === 'lost') await this.finalize(world, player, 'lost');
      else if (intent.type === 'flee') await this.finalize(world, player, 'fled');
    } catch (e) { /* non-fatal — combat must never crash the tick */ }
  }

  /**
   * Create the encounter record. A character must never hold two active encounters (would
   * double rewards), so we reconcile existing active rows first:
   *   - a FRESH turn-based (non-realtime) encounter → the player just started a card fight;
   *     SUPPRESS the realtime record (return false) rather than clobber it (cross-engine guard).
   *   - realtime orphans + stale turn-based orphans → abandon ('fled').
   * Returns true if a record was created (player.encounterId set), false if suppressed.
   */
  async _createRecord(world, player) {
    const active = await CombatEncounter.findAll({
      where: { characterId: player.characterId, status: 'active' },
      attributes: ['id', 'metadata', 'createdAt'],
    });
    const now = Date.now();
    const liveTurnBased = active.find((e) => {
      const realtime = e.metadata && e.metadata.realtime;
      const age = now - new Date(e.createdAt).getTime();
      return !realtime && age >= 0 && age < FRESH_TURNBASED_MS;
    });
    if (liveTurnBased) return false; // don't clobber a just-started turn-based fight

    const abandonIds = active.map((e) => e.id);
    if (abandonIds.length) {
      await CombatEncounter.update(
        { status: 'fled', endedAt: new Date() },
        { where: { id: abandonIds } },
      );
    }

    const { encounterType, metadata } = buildEncounterMeta(world);
    const enc = await CombatEncounter.create({
      characterId: player.characterId,
      encounterType,
      combatants: [player.combatant, ...player.engagedEnemies.values()],
      turnOrder: [], currentTurn: 0, status: 'active',
      metadata,
    });
    player.encounterId = enc.id;
    return true;
  }

  async ensureEncounter(world, player) {
    if (player.encounterId || player._engaging || player._finalizing || player.engagedEnemies.size === 0) return;
    // Cross-engine suppression backoff: while a fresh turn-based fight blocks realtime record
    // creation, don't re-run the active-encounter query on every landed hit — retry at most ~1.5s.
    if (player._suppressedUntil && Date.now() < player._suppressedUntil) return;
    player._engaging = true;
    try {
      const created = await this._createRecord(world, player);
      if (created === false) player._suppressedUntil = Date.now() + 1500;
    } finally { player._engaging = false; }
  }

  async finalize(world, player, status) {
    if (player._finalizing) return; // mutex: serialize finalization (no double endEncounter/rewards)
    player._finalizing = true;
    try {
      // One-shot kill before an engage landed → create the record now (unless the cross-engine
      // guard is actively suppressing: a fresh turn-based fight owns this character right now).
      if (!player.encounterId && player.engagedEnemies.size > 0
          && !(player._suppressedUntil && Date.now() < player._suppressedUntil)) {
        try { await this._createRecord(world, player); } catch (e) { /* non-fatal */ }
      }
      const id = player.encounterId;
      const enemyCombatants = [...player.engagedEnemies.values()];
      // A scripted tutorial drone was in this fight? (the combatant carries `tutorial`.) Used to
      // signal the tutorial state machine on a win + to lift the tutorial HP floor.
      const hadTutorial = enemyCombatants.some((c) => c && c.tutorial);
      // Clear engagement up-front so a new fight starts fresh.
      player.encounterId = null;
      player.engagedEnemies.clear();
      player._fleePushed = false;
      // A 'fled' finalize (e.g. disconnect) where every engaged enemy is already dead is
      // actually a win — grant the kill's rewards (covers the kill+disconnect-same-tick race).
      let outcome = status;
      if (outcome === 'fled' && enemyCombatants.length && enemyCombatants.every((c) => c.stats.health <= 0)) outcome = 'won';
      let result = null;
      if (id) {
        const enc = await CombatEncounter.findByPk(id);
        if (enc) {
          enc.combatants = [player.combatant, ...enemyCombatants]; // sync final hp + dead enemies
          enc.changed('combatants', true);
          await enc.save();
          result = await combatService.endEncounter(id, outcome); // rewards / quests / respawn / hp-save
        }
      }
      // A win may have leveled the character up (PlayerCharacter.addXP raises maxHealth/stats and
      // full-heals). Rebuild the in-world combatant so the HP bar + damage math use current stats
      // (not the join-time snapshot); the next snapshot carries the new maxHp to the client.
      if (outcome === 'won' && id && player.combatant) {
        try { await this._refreshCombatant(player); } catch (e) { /* keep stale rather than crash the tick */ }
        // Victory feedback: a non-blocking reward toast (xp / credits / loot / level-up).
        const rw = result && result.metadata && result.metadata.rewards;
        if (rw) this._send(player, { t: 'reward', xp: rw.xp || 0, credits: rw.credits || 0, loot: rw.loot || [], leveledUp: rw.leveledUp || [], newLevel: rw.newLevel, reputation: rw.reputation || [] });
      }
      // The tutorial HP floor is scoped to the live drone fight — lift it on ANY finalize so it
      // can never leak into a later in-world fight (e.g. a spaceport NPC/POI/quest spawn) and make
      // the player immortal. The combat_done signal stays gated on an actual tutorial-tagged win,
      // which advances the tutorial state machine (COMBAT_ENDED → COMBAT_COMPLETE → VENDOR_INTRO).
      player._hpFloor = 0;
      if (hadTutorial && outcome === 'won') this._send(player, { t: 'combat_done', tutorial: true });
      // On loss, restore the in-world player. With an encounter (id), endEncounter already did
      // the authoritative DB respawn (40% heal / fee / location) and this mirrors it (+ a death
      // toast). Without an id (cross-engine guard suppressed a spurious 3D death while a turn-
      // based fight owns the character), it's an in-world-only resurrect from DB health — no fee.
      if (outcome === 'lost') await this._respawn(world, player, result && result.metadata && result.metadata.respawn);
    } finally {
      player._finalizing = false;
    }
  }

  /** Re-derive the in-world combatant + castable kit from the DB (post level-up / equip change). */
  async _refreshCombatant(player) {
    const { PlayerCharacter } = require('../models');
    const character = await PlayerCharacter.findByPk(player.characterId);
    if (!character) return;
    const fresh = await combatService.buildPlayerCombatant(character);
    if (!fresh || !fresh.stats) return;
    fresh.temporaryEffects = fresh.temporaryEffects || [];
    player.combatant = fresh;
    player.maxHp = fresh.stats.maxHealth;
    // A level-up can unlock new abilities; refresh the server-authoritative kit AND push the
    // rebuilt hotbar so the client shows any newly-unlocked ability buttons mid-session.
    if (Array.isArray(character.abilities)) {
      player.abilities = character.abilities.filter((aid) => isCombatUsable(aid));
    }
    this._send(player, { t: 'hotbar', hotbar: buildHotbar(character), atkRange: attackRangeOf(player.combatant) });
  }

  /** endEncounter('lost') already respawned the character (hp + location); mirror it in-world.
   *  `respawnInfo` (from endEncounter's metadata) carries the safe-location area + medical fee
   *  for the client's death toast. */
  async _respawn(world, player, respawnInfo) {
    try {
      const { PlayerCharacter } = require('../models');
      const character = await PlayerCharacter.findByPk(player.characterId);
      if (character) {
        if (player.combatant) {
          player.combatant.stats.health = character.currentHealth;
          player.combatant.stats.stamina = character.currentStamina;
          player.combatant.statusEffects = [];   // clear combat effects on respawn
          player.combatant.temporaryEffects = [];
        }
        // Position: ANY submap world (dungeon OR hub like the spaceport) derives a valid in-world
        // spawn from its OWN spawn logic (entrance + subMapId-guarded resume + walkability), so the
        // respawn lands somewhere reachable. Applying the respawn's surface-style coord through the
        // submap sim produced an out-of-bounds position (the old bug). Surface worlds map
        // currentLocation as before.
        if (world.zone && world.zone.subMapId) {
          const sp = world.spawnFor(character);
          player.x = sp.x; player.z = sp.z; player.facing = sp.facing;
        } else {
          const loc = character.currentLocation;
          if (loc && Number.isFinite(loc.x)) {
            const sx = loc.x > 100 ? loc.x / 10 : loc.x;
            const sy = loc.y > 100 ? loc.y / 10 : loc.y;
            const w = world.sim.surfaceToWorld(sx, sy);
            player.x = w.x; player.z = w.z;
          }
        }
      }
    } catch (e) { /* ignore */ }
    player.dead = false;
    player.abilityCdUntil = {};
    player._hpFloor = 0; // tutorial safety floor never survives a respawn
    // Clear dodge timers so an in-progress dodge can't grant invulnerability post-respawn.
    player.iFrameUntil = 0;
    player.dashUntil = 0;
    player.dodgeCdUntil = 0;
    this._send(player, {
      t: 'respawn',
      x: player.x, z: player.z,
      hp: player.combatant ? player.combatant.stats.health : undefined,
      area: (respawnInfo && respawnInfo.area) || null,
      fee: (respawnInfo && respawnInfo.medicalFee) || 0,
      restored: respawnInfo && respawnInfo.healthRestored,
    });
  }
}

module.exports = {
  CombatManager, resolveCast, resolveDodge, enemyTryAttack, applyDamage,
  buildEnemyActorCombatant: (template) => combatService.buildEnemyCombatant(template),
  buildEncounterMeta, buildHotbar, attackRangeOf, isRangedWeapon,
  DISENGAGE_MS, FRESH_TURNBASED_MS,
};
