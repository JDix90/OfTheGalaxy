/**
 * WorldManager — the authoritative real-time loop for all planets.
 *
 * Holds one PlanetWorld per active planet, ticks them at a fixed step (hrtime accumulator,
 * ClaudeCraft/spike pattern), broadcasts per-recipient snapshots, autosaves character
 * position on a 30 s cadence (never per-tick), and GCs empty worlds. Created once and
 * attached to the http.Server WS endpoint.
 */

const { Op } = require('sequelize');
const { PlanetWorld } = require('./PlanetWorld');
const { loadPlanetMapData, loadSubmap } = require('./planetData');
const { CombatManager } = require('./combat');
const { CombatEncounter } = require('../models');
const characterService = require('../services/characterService');

const r2 = (n) => Math.round(n * 100) / 100;
const r3 = (n) => Math.round(n * 1000) / 1000;

/** Salvage encounterService's faction/planet enemy pool for ambient world spawns, filtered to
 *  ids that are real enemy templates (so generateRandomEnemy gets a usable pool). */
function buildEnemyPool(planet) {
  try {
    const encounterService = require('../services/encounterService');
    const { enemyTemplates } = require('../data/enemyTemplates');
    const raw = encounterService.getPlanetEnemyTypes(planet) || [];
    const valid = raw.filter((id) => enemyTemplates[id]);
    return valid.length ? valid : null; // null → generateRandomEnemy falls back to a difficulty pool
  } catch (e) {
    return null;
  }
}
const SAVE_MIN_MOVE = 0.6; // surface units; skip saves for tiny jitter
const MAX_WORLDS = 200;     // backstop against unbounded world growth (DoS)

class WorldManager {
  /**
   * @param {{ createSurfaceSim: Function, DEFAULTS: object }} simModule  the ESM surface sim
   * @param {{ submapToMapData: Function }} [submapModule]  the ESM submap→sim adapter (dungeons)
   */
  constructor(simModule, submapModule) {
    this.createSurfaceSim = simModule.createSurfaceSim;
    this.submapToMapData = submapModule && submapModule.submapToMapData;
    this.submapCoordDims = submapModule && submapModule.submapCoordDims;
    this.DEFAULTS = simModule.DEFAULTS;
    this.TICK_HZ = simModule.DEFAULTS.tickHz || 20;
    this.DT = 1 / this.TICK_HZ;
    this.worlds = new Map();      // planetId -> PlanetWorld
    this._loading = new Map();    // planetId -> Promise<PlanetWorld> (dedupe concurrent loads)
    this.combat = new CombatManager(); // Phase 4.3 engagement lifecycle (encounter records + rewards)
    this.tickN = 0;
    this.tickMsEMA = 0;
    this._loop = null;
    this._saveLoop = null;
  }

  /** Lazily create (or fetch) an authoritative world by key, building it with `build`. */
  async _getOrCreate(key, build) {
    if (this.worlds.has(key)) return this.worlds.get(key);
    if (this._loading.has(key)) return this._loading.get(key);
    if (this.worlds.size >= MAX_WORLDS) throw new Error('world-cap-reached');
    const p = (async () => {
      try {
        const world = await build();
        this.worlds.set(key, world);
        return world;
      } finally {
        // Always clear the in-flight entry — a failed load must NOT poison future joins.
        this._loading.delete(key);
      }
    })();
    this._loading.set(key, p);
    return p;
  }

  /** Lazily create (or fetch) a planet's surface world. */
  async getOrCreateWorld(planetId) {
    return this._getOrCreate(planetId, async () => {
      const { planet, mapData } = await loadPlanetMapData(planetId);
      const sim = this.createSurfaceSim(mapData || {}, { scale: this.DEFAULTS.scale });
      return new PlanetWorld(planetId, sim, mapData, {
        dangerLevel: (planet && planet.dangerLevel) || 1,
        enemyPool: buildEnemyPool(planet || {}),
      });
    });
  }

  /**
   * Lazily create (or fetch) a submap's authoritative real-time world. Generalizes the dungeon
   * path to any submap: dungeons populate with ambient enemies; "hub" submaps (e.g. the spaceport)
   * are safe — no ambient spawns, but scripted spawns (NPC/POI/quest/tutorial) still work. Client
   * and server build the SAME sim via the shared submapToMapData, so prediction reconciles.
   */
  async getOrCreateSubmapWorld(subMapId, opts = {}) {
    return this._getOrCreate(subMapId, async () => {
      const subMap = await loadSubmap(subMapId);
      // Guard: a submap world must belong to the joining character's planet.
      if (opts.planetId && subMap.planetId && String(subMap.planetId) !== String(opts.planetId)) {
        throw new Error('submap-planet-mismatch');
      }
      if (!this.submapToMapData) throw new Error('submap-sim-unavailable');
      const { mapData, scale } = this.submapToMapData(subMap);
      const sim = this.createSurfaceSim(mapData || {}, { scale });
      const d = subMap.layoutData || subMap.layout || {};
      const entrance = (d.entryPoints && d.entryPoints[0] && d.entryPoints[0].position) || d.entrance || null;
      // Padded dims (square-padded for dungeon grids) so spawn coords match the sim + client.
      const dims = this.submapCoordDims ? this.submapCoordDims(subMap)
        : { w: d.width || (d.size && d.size.width) || 12, h: d.height || (d.size && d.size.height) || 12 };
      const isDungeon = subMap.type === 'dungeon';
      const dangerLevel = opts.dangerLevel || (subMap.metadata && subMap.metadata.dangerLevel) || (isDungeon ? 6 : 1);
      // Bustling hubs get a server-authoritative ambient crowd (cosmetic walkers) that path
      // between the concourse's people-places — the storefronts, lounges, and hangar gates
      // (its NPC spawn points + entrance), so every player sees the same lively port.
      const crowd = (subMap.type === 'spaceport') ? this._buildCrowdConfig(d, dims) : null;
      return new PlanetWorld(subMapId, sim, mapData, {
        dangerLevel,
        ambient: isDungeon, // dungeons populate; hub submaps (spaceport/city/...) don't auto-spawn
        crowd,
        zone: { type: isDungeon ? 'dungeon' : (subMap.type || 'submap'), subMapId, planetId: subMap.planetId || opts.planetId, parentLocationId: subMap.parentLocationId, entrance, dims },
      });
    });
  }

  /** Back-compat alias — dungeons are just a submap world that populates. */
  async getOrCreateDungeon(subMapId, opts = {}) { return this.getOrCreateSubmapWorld(subMapId, opts); }

  /** Ambient-crowd config for a hub layout: destination waypoints (surface %) drawn from the
   *  NPC spawn points + entrance + a few concourse-center crossings, plus a target headcount. */
  _buildCrowdConfig(d, dims) {
    const W = d.width || (d.size && d.size.width) || dims.w || 12;
    const H = d.height || (d.size && d.size.height) || dims.h || 12;
    const pct = (gx, gy) => ({ x: ((gx + 0.5) / W) * 100, y: ((gy + 0.5) / H) * 100 });
    const points = [];
    for (const sp of (d.npcSpawnPoints || [])) { const p = sp.position || {}; if (Number.isFinite(p.x)) points.push(pct(p.x, p.y)); }
    for (const e of (d.entryPoints || [])) { const p = e.position || {}; if (Number.isFinite(p.x)) points.push(pct(p.x, p.y)); }
    // Destinations spread along the central walkway + toward the hangar gates, so walkers
    // traverse the whole concourse instead of clustering on the spawn points.
    points.push({ x: 18, y: 50 }, { x: 30, y: 46 }, { x: 42, y: 54 }, { x: 54, y: 48 }, { x: 66, y: 52 }, { x: 74, y: 40 }, { x: 74, y: 62 });
    return { count: 36, points };
  }

  start() {
    if (this._loop) return;
    let last = process.hrtime.bigint();
    let acc = 0;
    this._loop = setInterval(() => {
      const t0 = process.hrtime.bigint();
      const now = Date.now();
      let frame = Number(t0 - last) / 1e9;
      last = t0;
      if (frame > 0.25) frame = 0.25; // clamp after a stall; never spiral
      acc += frame;
      let steps = 0;
      while (acc >= this.DT && steps < 5) {
        for (const w of this.worlds.values()) w.step(this.DT, now);
        this.tickN++;
        acc -= this.DT;
        steps++;
      }
      // Process combat lifecycle intents (async, fire-and-forget; CombatManager guards re-entrancy).
      for (const w of this.worlds.values()) {
        const intents = w.drainIntents();
        if (intents) for (const it of intents) this.combat.handleIntent(w, it);
      }
      if (steps > 0) this.broadcast();
      this.gcEmpty();
      const dtMs = Number(process.hrtime.bigint() - t0) / 1e6;
      this.tickMsEMA = this.tickMsEMA * 0.9 + dtMs * 0.1;
    }, 1000 / this.TICK_HZ);

    this._saveLoop = setInterval(() => this.flushAll(), 30000);

    // Reap orphaned 'active' encounters (server crash / GC leftovers) so they don't
    // accumulate. Combat never lasts 30 min, so anything older is dead.
    this._cleanupLoop = setInterval(async () => {
      try {
        await CombatEncounter.update(
          { status: 'fled', endedAt: new Date() },
          { where: { status: 'active', updatedAt: { [Op.lt]: new Date(Date.now() - 30 * 60 * 1000) } } },
        );
      } catch (e) { /* non-fatal */ }
    }, 5 * 60 * 1000);
  }

  broadcast() {
    const serverMs = r3(this.tickMsEMA);
    const now = Date.now();
    for (const w of this.worlds.values()) {
      if (w.isEmpty()) continue;
      const players = w.playersWire();
      const enemies = w.enemiesWire();
      const crowd = w.crowdWire(); // shared ambient walkers (null when none → field omitted)
      const fx = w.drainFx(); // combat events this tick (shared by all recipients)
      for (const p of w.players.values()) {
        const ws = p.ws;
        if (!ws || ws.readyState !== ws.OPEN) continue;
        ws.send(JSON.stringify({
          t: 'snap',
          tick: this.tickN,
          serverMs,
          ack: p.lastSeq,
          actMs: p.lastClientTime,
          self: { x: r2(p.x), z: r2(p.z), f: r2(p.facing), hp: p.combatant ? p.combatant.stats.health : p.maxHp, maxHp: p.maxHp, dead: p.dead ? 1 : 0 },
          players,
          enemies,
          ...(crowd ? { crowd } : {}),
          fx,
          n: w.players.size,
        }));
      }
    }
  }

  /** Persist a player's combat vitals (always) + position (throttled by movement). */
  async flushPlayer(player, world, force = false) {
    // Combat hp/stamina — so a crash/disconnect doesn't lose recent combat state.
    if (player.combatant && player.combatant.stats) {
      try { await characterService.updateVitals(player.characterId, Math.round(player.combatant.stats.health), Math.round(player.combatant.stats.stamina)); } catch (e) { /* non-fatal */ }
    }
    try {
      const s = world.sim.worldToSurface(player.x, player.z);
      const moved = Math.hypot(
        (s.x - player._lastSavedSurf.x) * world.sim.scale,
        (s.y - player._lastSavedSurf.y) * world.sim.scale,
      );
      if (!force && moved < SAVE_MIN_MOVE) return;
      player._lastSavedSurf = { x: s.x, y: s.y };
      const zone = world.zone || { type: 'surface' };
      // Key on submap PRESENCE, not zone.type==='dungeon': hub submaps (spaceport/city) are
      // real-time submap worlds too (Phase 6a), so their location must persist as area:'submap'
      // with subMapId — else normal walking saves a subMapId-less 'surface' location and a
      // reconnect/resume loses the submap context (mirrors buildEncounterMeta's "any submap").
      const subMapId = zone.subMapId || world.subMapId || null;
      const loc = { x: Math.max(0, Math.min(100, s.x)), y: Math.max(0, Math.min(100, s.y)), area: subMapId ? 'submap' : 'surface' };
      if (subMapId) { loc.subMapId = subMapId; loc.parentLocationId = zone.parentLocationId || null; }
      await characterService.updateLocation(player.characterId, world.planetId, loc);
    } catch (e) {
      // Non-fatal: retry next interval / on disconnect.
    }
  }

  async flushAll() {
    const promises = [];
    for (const w of this.worlds.values()) {
      for (const p of w.players.values()) promises.push(this.flushPlayer(p, w));
    }
    await Promise.all(promises);
  }

  gcEmpty() {
    for (const [id, w] of this.worlds) {
      if (w.isEmpty()) this.worlds.delete(id);
    }
  }

  /** Find a live player by characterId across all worlds (players are keyed by characterId). */
  findPlayer(characterId) {
    const id = String(characterId);
    for (const w of this.worlds.values()) {
      const p = w.players.get(id);
      if (p) return { world: w, player: p };
    }
    return null;
  }

  /** True when the character is currently present in a realtime world. */
  hasLivePlayer(characterId) { return !!this.findPlayer(characterId); }

  /** Apply a consumable to a live in-world player (the HTTP inventory path delegates here so the
   *  authoritative in-world combatant — not character.currentHealth — receives the effect). */
  async useItemForCharacter(characterId, itemId) {
    const found = this.findPlayer(characterId);
    if (!found) return null;
    return this.combat.useItem(found.world, found.player, itemId);
  }

  /**
   * Server-authoritative scripted spawn from a client request (NPC "Attack" / POI combat / quest
   * combat). The client only sends a REFERENCE (npcId / poiId / questId+objectiveId); the server
   * derives the enemy + validates, then spawns tagged hostiles near the player. This replaces the
   * old startEncounter()→/game/combat turn-based entry points for these in-world fights.
   */
  async spawnFromRequest(world, player, msg) {
    if (!world || !player || !msg || player.dead) return;
    const near = { x: player.x, z: player.z };

    // Any NON-tutorial in-world fight starting means the tutorial drone fight is over (or was
    // abandoned) — lift the tutorial HP floor so a passive drone left un-killed can't make the
    // player immortal in an unrelated NPC/POI/quest fight.
    if (msg.kind !== 'tutorial') player._hpFloor = 0;

    if (msg.kind === 'tutorial') {
      // Idempotent: never stack a second training drone (or reset the HP floor) while one of this
      // player's is still live — repeated COMBAT_INTRO triggers shouldn't flood the dock.
      for (const e of world.enemies.values()) {
        if (e.tutorial && e.ownerId === player.id && !e.dead) return;
      }
      // The 3D onboarding fight: one weak, instanced training drone. It's PASSIVE until struck
      // (so a first-timer can read the coaching cards unharried), only the tutorial player can
      // engage it (no shared-world leakage / kill-stealing), and that player gets an HP floor so
      // the fight cannot kill them. The killed drone carries `tutorial` → finalize emits
      // `t:'combat_done'` which drives COMBAT_ENDED → COMBAT_COMPLETE → VENDOR_INTRO.
      const id = world.spawnScriptedEnemy({
        templateId: 'droid_security', name: 'Training Drone', enemyType: 'training_drone',
        level: Math.max(1, player.level || 1), difficulty: 'easy',
        near, tutorial: true, ownerId: player.id, passive: true,
      });
      if (id && player.combatant && player.combatant.stats) {
        player._hpFloor = Math.max(1, Math.ceil(player.combatant.stats.maxHealth * 0.5));
      }
      return;
    }

    if (msg.kind === 'npc' && msg.npcId) {
      const { NPC } = require('../models');
      const npc = await NPC.findByPk(String(msg.npcId));
      if (!npc) return;
      world.spawnScriptedEnemy({ name: npc.name || 'Hostile', level: npc.level || world._effLevel(), near });
      return;
    }

    if (msg.kind === 'poi' && msg.poiId) {
      const tids = await this._poiEnemyTemplates(world, String(msg.poiId));
      if (!tids || !tids.length) return;
      for (const tid of tids) world.spawnScriptedEnemy({ templateId: tid, near });
      return;
    }

    if (msg.kind === 'quest' && msg.questId && msg.objectiveId) {
      await this._spawnQuestEnemies(world, player, String(msg.questId), String(msg.objectiveId));
    }
  }

  /** Resolve a POI's enemy template ids (reuses poiService's POI→enemy logic, no encounter row). */
  async _poiEnemyTemplates(world, poiId) {
    try {
      const { Planet } = require('../models');
      const poiService = require('../services/poiService');
      const planet = await Planet.findByPk(world.planetId);
      if (!planet) return null;
      const pois = (planet.mapData && planet.mapData.pointsOfInterest) || planet.pointsOfInterest || [];
      const poi = pois.find((p) => String(p.id) === poiId);
      if (!poi) return null;
      const dangerLevel = poi.dangerLevel || planet.dangerLevel || 5;
      const numEnemies = Math.min(3, Math.ceil(dangerLevel / 3) + 1);
      const types = (typeof poiService.getEnemyTypesForPOI === 'function' && poiService.getEnemyTypesForPOI(poi)) || world.enemyPool || ['ironclad'];
      const out = [];
      for (let i = 0; i < numEnemies; i++) out.push(types[Math.floor(Math.random() * types.length)]);
      return out;
    } catch (e) {
      return null;
    }
  }

  /** Spawn a quest combat objective's enemies (validated: active quest, combat objective, prior
   *  steps done, once per session) — tagged so the kill credits exactly that objective. */
  async _spawnQuestEnemies(world, player, questId, objectiveId) {
    player._questSpawned = player._questSpawned || new Set();
    const spawnKey = `${questId}::${objectiveId}`; // objective ids are quest-local → key by quest too
    if (player._questSpawned.has(spawnKey)) return; // already spawned this session
    const { Quest, QuestProgress } = require('../models');
    const qp = await QuestProgress.findOne({ where: { characterId: player.characterId, questId, status: 'active' } });
    if (!qp) return;
    const quest = await Quest.findByPk(questId);
    if (!quest || !Array.isArray(quest.objectives)) return;
    const idx = quest.objectives.findIndex((o) => o.id === objectiveId);
    if (idx < 0) return;
    const obj = quest.objectives[idx];
    if (!/^defeat/.test(obj.type || '')) return;                       // combat objectives only
    // Only spawn on the quest's own planet (defense in depth; the client gates too).
    if (quest.startLocation && quest.startLocation.planet && String(quest.startLocation.planet) !== String(world.planetId)) return;
    const done = qp.objectivesCompleted || {};
    if (done[objectiveId]) return;                                     // already complete
    for (let i = 0; i < idx; i++) { if (!done[quest.objectives[i].id]) return; } // sequence gate

    const count = Math.max(1, Math.min(6, obj.count || 1));
    const name = String(obj.target || 'Enemy').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const level = player.level || world._effLevel();
    let spawned = 0;
    for (let i = 0; i < count; i++) {
      if (world.spawnScriptedEnemy({ name, enemyType: obj.target, level, near: { x: player.x, z: player.z }, questId, objectiveId })) spawned++;
    }
    // Only mark done if something actually spawned — otherwise (e.g. world at the enemy cap) leave
    // it so the client's retry can place them once there's room (no quest soft-lock).
    if (spawned > 0) player._questSpawned.add(spawnKey);
  }

  stop() {
    if (this._loop) clearInterval(this._loop);
    if (this._saveLoop) clearInterval(this._saveLoop);
    if (this._cleanupLoop) clearInterval(this._cleanupLoop);
    this._loop = this._saveLoop = this._cleanupLoop = null;
  }

  stats() {
    let players = 0;
    for (const w of this.worlds.values()) players += w.players.size;
    return { worlds: this.worlds.size, players, tick: this.tickN, tickMsEMA: r3(this.tickMsEMA) };
  }
}

module.exports = { WorldManager };
