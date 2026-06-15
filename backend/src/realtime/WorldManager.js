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
      return new PlanetWorld(planetId, sim, mapData, { dangerLevel: (planet && planet.dangerLevel) || 1 });
    });
  }

  /** Lazily create (or fetch) a dungeon submap's authoritative world (real-time combat). */
  async getOrCreateDungeon(subMapId, opts = {}) {
    return this._getOrCreate(subMapId, async () => {
      const subMap = await loadSubmap(subMapId);
      // Guard: a dungeon world must belong to the joining character's planet.
      if (opts.planetId && subMap.planetId && String(subMap.planetId) !== String(opts.planetId)) {
        throw new Error('dungeon-planet-mismatch');
      }
      if (!this.submapToMapData) throw new Error('submap-sim-unavailable');
      const { mapData, scale } = this.submapToMapData(subMap);
      const sim = this.createSurfaceSim(mapData || {}, { scale });
      const d = subMap.layoutData || subMap.layout || {};
      const entrance = (d.entryPoints && d.entryPoints[0] && d.entryPoints[0].position) || d.entrance || null;
      // Padded dims (square-padded for dungeon grids) so spawn coords match the sim + client.
      const dims = this.submapCoordDims ? this.submapCoordDims(subMap)
        : { w: d.width || (d.size && d.size.width) || 12, h: d.height || (d.size && d.size.height) || 12 };
      const dangerLevel = opts.dangerLevel || (subMap.metadata && subMap.metadata.dangerLevel) || 6;
      return new PlanetWorld(subMapId, sim, mapData, {
        dangerLevel,
        zone: { type: 'dungeon', subMapId, planetId: subMap.planetId || opts.planetId, parentLocationId: subMap.parentLocationId, entrance, dims },
      });
    });
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
      const loc = { x: Math.max(0, Math.min(100, s.x)), y: Math.max(0, Math.min(100, s.y)), area: zone.type === 'dungeon' ? 'submap' : 'surface' };
      if (zone.type === 'dungeon') { loc.subMapId = zone.subMapId; loc.parentLocationId = zone.parentLocationId; }
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
