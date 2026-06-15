/**
 * WorldManager — the authoritative real-time loop for all planets.
 *
 * Holds one PlanetWorld per active planet, ticks them at a fixed step (hrtime accumulator,
 * ClaudeCraft/spike pattern), broadcasts per-recipient snapshots, autosaves character
 * position on a 30 s cadence (never per-tick), and GCs empty worlds. Created once and
 * attached to the http.Server WS endpoint.
 */

const { PlanetWorld } = require('./PlanetWorld');
const { loadPlanetMapData } = require('./planetData');
const characterService = require('../services/characterService');

const r2 = (n) => Math.round(n * 100) / 100;
const r3 = (n) => Math.round(n * 1000) / 1000;
const SAVE_MIN_MOVE = 0.6; // surface units; skip saves for tiny jitter
const MAX_WORLDS = 200;     // backstop against unbounded world growth (DoS)

class WorldManager {
  /** @param {{ createSurfaceSim: Function, DEFAULTS: object }} simModule  the ESM sim, imported once */
  constructor(simModule) {
    this.createSurfaceSim = simModule.createSurfaceSim;
    this.DEFAULTS = simModule.DEFAULTS;
    this.TICK_HZ = simModule.DEFAULTS.tickHz || 20;
    this.DT = 1 / this.TICK_HZ;
    this.worlds = new Map();      // planetId -> PlanetWorld
    this._loading = new Map();    // planetId -> Promise<PlanetWorld> (dedupe concurrent loads)
    this.tickN = 0;
    this.tickMsEMA = 0;
    this._loop = null;
    this._saveLoop = null;
  }

  /** Lazily create (or fetch) a planet's authoritative world. */
  async getOrCreateWorld(planetId) {
    if (this.worlds.has(planetId)) return this.worlds.get(planetId);
    if (this._loading.has(planetId)) return this._loading.get(planetId);
    if (this.worlds.size >= MAX_WORLDS) throw new Error('world-cap-reached');
    const p = (async () => {
      try {
        const { mapData } = await loadPlanetMapData(planetId);
        const sim = this.createSurfaceSim(mapData || {}, { scale: this.DEFAULTS.scale });
        const world = new PlanetWorld(planetId, sim, mapData);
        this.worlds.set(planetId, world);
        return world;
      } finally {
        // Always clear the in-flight entry — a failed load must NOT poison future joins.
        this._loading.delete(planetId);
      }
    })();
    this._loading.set(planetId, p);
    return p;
  }

  start() {
    if (this._loop) return;
    let last = process.hrtime.bigint();
    let acc = 0;
    this._loop = setInterval(() => {
      const t0 = process.hrtime.bigint();
      let frame = Number(t0 - last) / 1e9;
      last = t0;
      if (frame > 0.25) frame = 0.25; // clamp after a stall; never spiral
      acc += frame;
      let steps = 0;
      while (acc >= this.DT && steps < 5) {
        for (const w of this.worlds.values()) w.step(this.DT);
        this.tickN++;
        acc -= this.DT;
        steps++;
      }
      if (steps > 0) this.broadcast();
      this.gcEmpty();
      const dtMs = Number(process.hrtime.bigint() - t0) / 1e6;
      this.tickMsEMA = this.tickMsEMA * 0.9 + dtMs * 0.1;
    }, 1000 / this.TICK_HZ);

    this._saveLoop = setInterval(() => this.flushAll(), 30000);
  }

  broadcast() {
    const serverMs = r3(this.tickMsEMA);
    const now = Date.now();
    for (const w of this.worlds.values()) {
      if (w.isEmpty()) continue;
      const players = w.playersWire();
      for (const p of w.players.values()) {
        const ws = p.ws;
        if (!ws || ws.readyState !== ws.OPEN) continue;
        ws.send(JSON.stringify({
          t: 'snap',
          tick: this.tickN,
          serverMs,
          ack: p.lastSeq,
          actMs: p.lastClientTime,
          self: { x: r2(p.x), z: r2(p.z), f: r2(p.facing) },
          players,
          n: w.players.size,
        }));
      }
    }
  }

  /** Persist one player's position to the DB (throttled by movement). */
  async flushPlayer(player, world, force = false) {
    try {
      const s = world.sim.worldToSurface(player.x, player.z);
      const moved = Math.hypot(
        (s.x - player._lastSavedSurf.x) * world.sim.scale,
        (s.y - player._lastSavedSurf.y) * world.sim.scale,
      );
      if (!force && moved < SAVE_MIN_MOVE) return;
      player._lastSavedSurf = { x: s.x, y: s.y };
      await characterService.updateLocation(player.characterId, world.planetId, {
        x: Math.max(0, Math.min(100, s.x)),
        y: Math.max(0, Math.min(100, s.y)),
        area: 'surface',
      });
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

  stop() {
    if (this._loop) clearInterval(this._loop);
    if (this._saveLoop) clearInterval(this._saveLoop);
    this._loop = this._saveLoop = null;
  }

  stats() {
    let players = 0;
    for (const w of this.worlds.values()) players += w.players.size;
    return { worlds: this.worlds.size, players, tick: this.tickN, tickMsEMA: r3(this.tickMsEMA) };
  }
}

module.exports = { WorldManager };
