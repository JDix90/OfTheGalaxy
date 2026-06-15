/**
 * PlanetWorld — one planet's authoritative real-time world (server side).
 *
 * Owns the in-memory positions of every player on the planet. Movement is integrated
 * from client INPUTS (never trusted positions) via the SAME shared surface sim the client
 * uses for prediction, so client prediction tracks server authority. Ticked at a fixed
 * step by WorldManager; produces per-recipient snapshots.
 *
 * Phase 4.0 = players + movement. Enemies/combat slot into the same registry + tick later.
 */

const PALETTE = ['#ffcf5c', '#6cf0c2', '#7db8ff', '#ff8d6c', '#d18cff', '#9affa0', '#ff5a8a', '#5ad1ff'];
const TWO_PI = Math.PI * 2;
const MAX_PLAYERS = 200; // per-world cap (DoS backstop)
const r2 = (n) => Math.round(n * 100) / 100;
const normYaw = (y) => (typeof y === 'number' && Number.isFinite(y) ? ((y % TWO_PI) + TWO_PI) % TWO_PI : null);

class PlanetWorld {
  /**
   * @param {string} planetId
   * @param {object} sim     a createSurfaceSim(mapData) instance (integrate + coord maps)
   * @param {object} mapData the planet mapData (for spawn)
   */
  constructor(planetId, sim, mapData) {
    this.planetId = planetId;
    this.sim = sim;
    this.mapData = mapData || {};
    this.players = new Map(); // playerId -> player
    this._nextColor = 0;
  }

  /** Resolve a character's spawn (world units) — mirrors the client's useSurfaceWorld. */
  spawnFor(character) {
    const sp = this.mapData.spaceport;
    const loc = character && character.currentLocation;
    const onThisPlanet = character && character.currentPlanet === this.planetId;
    let sx = 50, sy = 50;
    const finite = (v) => Number.isFinite(v);
    if (onThisPlanet && loc && finite(loc.x) && finite(loc.y) && (loc.x || loc.y)) {
      sx = loc.x > 100 ? loc.x / 10 : loc.x;
      sy = loc.y > 100 ? loc.y / 10 : loc.y;
    } else if (sp && finite(sp.spawnX)) {
      sx = sp.spawnX; sy = sp.spawnY;
    } else if (sp && finite(sp.x)) {
      sx = sp.x; sy = sp.y;
    }
    const w = this.sim.surfaceToWorld(sx, sy);
    return { x: w.x, z: w.z, facing: Math.PI };
  }

  /**
   * Add a player. `id` is a stable per-connection id. Returns the player record.
   */
  addPlayer({ id, character, ws }) {
    if (this.players.size >= MAX_PLAYERS && !this.players.has(id)) return null;
    const spawn = this.spawnFor(character);
    const color = PALETTE[this._nextColor++ % PALETTE.length];
    const player = {
      id,
      ws,
      characterId: character.id,
      userId: character.userId,
      name: character.name || 'Traveler',
      color,
      x: spawn.x, z: spawn.z, facing: spawn.facing,
      moving: false, speed: 0,
      hp: character.currentHealth, maxHp: character.maxHealth,
      input: { f: 0, b: 0, l: 0, r: 0, run: 0, yaw: 0 },
      lastSeq: 0,
      lastClientTime: 0,
      // persistence bookkeeping
      _saveAcc: 0,
      _lastSavedSurf: this.sim.worldToSurface(spawn.x, spawn.z),
    };
    this.players.set(id, player);
    return player;
  }

  removePlayer(id) {
    this.players.delete(id);
  }

  /** Apply a client input message (trust flags + yaw only, never positions). */
  applyInput(id, msg) {
    const p = this.players.get(id);
    if (!p) return;
    const yaw = normYaw(msg.yaw);
    p.input = {
      f: msg.f ? 1 : 0, b: msg.b ? 1 : 0, l: msg.l ? 1 : 0, r: msg.r ? 1 : 0,
      run: msg.run ? 1 : 0,
      yaw: yaw != null ? yaw : p.input.yaw,
    };
    p.lastSeq = msg.seq | 0;
    p.lastClientTime = msg.ct || 0;
  }

  /** Integrate one fixed step for every player. */
  step(dt) {
    for (const p of this.players.values()) {
      const next = this.sim.integrate({ x: p.x, z: p.z, facing: p.facing }, p.input, dt);
      p.x = next.x; p.z = next.z; p.facing = next.facing;
      p.moving = next.moving; p.speed = next.speed;
    }
  }

  /** Shared wire array of all players (remotes filter out `you` client-side). */
  playersWire() {
    const out = [];
    for (const p of this.players.values()) {
      out.push({ id: p.id, x: r2(p.x), z: r2(p.z), f: r2(p.facing), m: p.moving ? 1 : 0, c: p.color, name: p.name });
    }
    return out;
  }

  isEmpty() { return this.players.size === 0; }
}

module.exports = { PlanetWorld };
