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
const { CombatEncounter } = require('../models');

const BASIC = 'basic_attack';
const BASIC_RANGE = 2.8;       // melee
const BASIC_CD_MS = 850;
const BASIC_STAMINA = 3;
const ABILITY_RANGE_RANGED = 13;
const ABILITY_RANGE_MELEE = 6;
const TURN_MS = 1000;          // ability cooldown: turns → ms
const ENEMY_MELEE = 2.8;
const ENEMY_CD_MS = 1400;
const DISENGAGE_MS = 6000;
// Dodge-roll (Phase 4.4)
const DODGE_CD_MS = 1000;
const IFRAME_MS = 450;       // invulnerability window
const DASH_SPEED = 17;       // world units/s during the dash
const DASH_MS = 180;

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

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

  if (abilityId === BASIC) {
    if (!enemy || enemy.dead) return;
    if (now < (player.abilityCdUntil[BASIC] || 0)) return;
    if (dist(player, enemy) > BASIC_RANGE) return;
    if (player.combatant.stats.stamina < BASIC_STAMINA) return;
    player.combatant.stats.stamina = Math.max(0, player.combatant.stats.stamina - BASIC_STAMINA);
    const res = combatService.calculateDamage(player.combatant, enemy.combatant);
    applyDamage(enemy.combatant, res);
    player.abilityCdUntil[BASIC] = now + BASIC_CD_MS;
    afterPlayerHit(world, player, enemy, res, now, BASIC);
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

  // enemy-targeted (damage / debuff)
  if (!enemy || enemy.dead) return;
  const range = eff.damage ? ABILITY_RANGE_RANGED : ABILITY_RANGE_MELEE;
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
  afterPlayerHit(world, player, enemy, res, now, abilityId);
}

function afterPlayerHit(world, player, enemy, res, now, abilityId) {
  player.lastCombatAt = now;
  if (!player.engagedEnemies.has(enemy.id)) player.engagedEnemies.set(enemy.id, enemy.combatant);
  world.pushFx({ type: 'hit', sourceId: player.id, targetId: enemy.id, x: enemy.x, z: enemy.z, dmg: res.damage || 0, crit: !!res.critical, dodged: !!res.dodged, miss: !res.hit, ability: abilityId });
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
  if (dist(enemy, target) > ENEMY_MELEE) return;
  if (now < (enemy.attackCdUntil || 0)) return;
  enemy.attackCdUntil = now + ENEMY_CD_MS;
  // Dodge i-frames: the swing whiffs.
  if (now < (target.iFrameUntil || 0)) {
    world.pushFx({ type: 'hit', sourceId: enemy.id, targetId: target.id, x: target.x, z: target.z, dmg: 0, dodged: true });
    return;
  }
  const res = combatService.calculateDamage(enemy.combatant, target.combatant);
  applyDamage(target.combatant, res);
  target.lastCombatAt = now;
  if (!target.engagedEnemies.has(enemy.id)) target.engagedEnemies.set(enemy.id, enemy.combatant);
  world.pushFx({ type: 'hit', sourceId: enemy.id, targetId: target.id, x: target.x, z: target.z, dmg: res.damage || 0, crit: !!res.critical, dodged: !!res.dodged, miss: !res.hit });
  world.pushIntent({ type: 'engage', playerId: target.id });
  if (target.combatant.stats.health <= 0 && !target.dead) {
    target.dead = true;
    world.pushFx({ type: 'death', id: target.id, kind: 'player' });
    world.pushIntent({ type: 'lost', playerId: target.id });
  }
}

class CombatManager {
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

  /** Create the encounter record (abandoning any stale active one first). No guards. */
  async _createRecord(world, player) {
    // A character must never hold two active encounters (would double rewards). Abandon
    // any leftover active encounter — realtime crash orphans or a stale REST encounter.
    await CombatEncounter.update(
      { status: 'fled', endedAt: new Date() },
      { where: { characterId: player.characterId, status: 'active' } },
    );
    const enc = await CombatEncounter.create({
      characterId: player.characterId,
      encounterType: 'random',
      combatants: [player.combatant, ...player.engagedEnemies.values()],
      turnOrder: [], currentTurn: 0, status: 'active',
      metadata: { realtime: true, planetId: world.planetId },
    });
    player.encounterId = enc.id;
  }

  async ensureEncounter(world, player) {
    if (player.encounterId || player._engaging || player._finalizing || player.engagedEnemies.size === 0) return;
    player._engaging = true;
    try { await this._createRecord(world, player); } finally { player._engaging = false; }
  }

  async finalize(world, player, status) {
    if (player._finalizing) return; // mutex: serialize finalization (no double endEncounter/rewards)
    player._finalizing = true;
    try {
      if (!player.encounterId && player.engagedEnemies.size > 0) {
        try { await this._createRecord(world, player); } catch (e) { /* one-shot kill before engage landed */ }
      }
      const id = player.encounterId;
      const enemyCombatants = [...player.engagedEnemies.values()];
      // Clear engagement up-front so a new fight starts fresh.
      player.encounterId = null;
      player.engagedEnemies.clear();
      player._fleePushed = false;
      // A 'fled' finalize (e.g. disconnect) where every engaged enemy is already dead is
      // actually a win — grant the kill's rewards (covers the kill+disconnect-same-tick race).
      let outcome = status;
      if (outcome === 'fled' && enemyCombatants.length && enemyCombatants.every((c) => c.stats.health <= 0)) outcome = 'won';
      if (id) {
        const enc = await CombatEncounter.findByPk(id);
        if (enc) {
          enc.combatants = [player.combatant, ...enemyCombatants]; // sync final hp + dead enemies
          enc.changed('combatants', true);
          await enc.save();
          await combatService.endEncounter(id, outcome); // rewards / quests / respawn / hp-save
        }
      }
      if (outcome === 'lost') await this._respawn(world, player);
    } finally {
      player._finalizing = false;
    }
  }

  /** endEncounter('lost') already respawned the character (hp + location); mirror it in-world. */
  async _respawn(world, player) {
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
        const loc = character.currentLocation;
        if (loc && Number.isFinite(loc.x)) {
          const sx = loc.x > 100 ? loc.x / 10 : loc.x;
          const sy = loc.y > 100 ? loc.y / 10 : loc.y;
          const w = world.sim.surfaceToWorld(sx, sy);
          player.x = w.x; player.z = w.z;
        }
      }
    } catch (e) { /* ignore */ }
    player.dead = false;
    player.abilityCdUntil = {};
    // Clear dodge timers so an in-progress dodge can't grant invulnerability post-respawn.
    player.iFrameUntil = 0;
    player.dashUntil = 0;
    player.dodgeCdUntil = 0;
    if (player.ws && player.ws.readyState === player.ws.OPEN) {
      try { player.ws.send(JSON.stringify({ t: 'respawn', x: player.x, z: player.z, hp: player.combatant ? player.combatant.stats.health : undefined })); } catch (_) {}
    }
  }
}

module.exports = {
  CombatManager, resolveCast, resolveDodge, enemyTryAttack, applyDamage,
  buildEnemyActorCombatant: (template) => combatService.buildEnemyCombatant(template),
  DISENGAGE_MS,
};
