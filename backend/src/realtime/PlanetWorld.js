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

const { generateRandomEnemy } = require('../data/enemyTemplates');

const PALETTE = ['#ffcf5c', '#6cf0c2', '#7db8ff', '#ff8d6c', '#d18cff', '#9affa0', '#ff5a8a', '#5ad1ff'];
const TWO_PI = Math.PI * 2;
const MAX_PLAYERS = 200; // per-world cap (DoS backstop)
// Enemy AI (Phase 4.2 — movement + aggro only; combat resolution lands in P4.3).
const AGGRO_RADIUS = 16;   // world units: a player this close pulls an enemy into chase
const LEASH = 24;          // enemies won't chase beyond this from home
const PATROL_SPEED = 3.2;
const CHASE_SPEED = 5.4;
const r2 = (n) => Math.round(n * 100) / 100;
const normYaw = (y) => (typeof y === 'number' && Number.isFinite(y) ? ((y % TWO_PI) + TWO_PI) % TWO_PI : null);

class PlanetWorld {
  /**
   * @param {string} planetId
   * @param {object} sim     a createSurfaceSim(mapData) instance (integrate + coord maps)
   * @param {object} mapData the planet mapData (for spawn)
   */
  constructor(planetId, sim, mapData, options = {}) {
    this.planetId = planetId;
    this.sim = sim;
    this.mapData = mapData || {};
    this.players = new Map();  // playerId -> player
    this.enemies = new Map();  // enemyId -> enemy
    this._nextColor = 0;
    this.spawnEnemies(options.dangerLevel || 1);
  }

  /** Find a random walkable world position (away from spawn) for enemy placement. */
  _randomWalkable() {
    for (let i = 0; i < 24; i++) {
      const sx = 12 + Math.random() * 76;
      const sy = 12 + Math.random() * 76;
      if (this.sim.isWalkableSurface(sx, sy)) return this.sim.surfaceToWorld(sx, sy);
    }
    return this.sim.surfaceToWorld(50, 50);
  }

  /** Populate the world with patrolling enemies scaled to the planet's danger level. */
  spawnEnemies(dangerLevel) {
    const count = Math.max(2, Math.min(8, 2 + Math.floor(dangerLevel / 2)));
    for (let i = 0; i < count; i++) {
      let t;
      try { t = generateRandomEnemy(dangerLevel); } catch (e) { t = null; }
      if (!t || !t.stats) continue;
      const home = this._randomWalkable();
      this.enemies.set(`e${i}`, {
        id: `e${i}`,
        name: t.name || 'Hostile',
        level: t.level || dangerLevel,
        tier: t.tier || 'normal',
        templateKey: t.templateKey || t.key || null,
        hp: t.stats.health, maxHp: t.stats.maxHealth,
        x: home.x, z: home.z, facing: 0,
        home, patrolRadius: 4 + Math.random() * 3, phase: Math.random() * TWO_PI,
        state: 'patrol', targetId: null, _t: Math.random() * 10,
      });
    }
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

  /** Integrate one fixed step for every player + enemy. */
  step(dt) {
    for (const p of this.players.values()) {
      const next = this.sim.integrate({ x: p.x, z: p.z, facing: p.facing }, p.input, dt);
      p.x = next.x; p.z = next.z; p.facing = next.facing;
      p.moving = next.moving; p.speed = next.speed;
    }
    this.stepEnemies(dt);
  }

  /** Collision-aware directional move (try full, then axis-slide) — mirrors the sim. */
  _tryMove(e, mx, mz) {
    if (this.sim.isWalkableWorld(e.x + mx, e.z + mz)) { e.x += mx; e.z += mz; }
    else if (this.sim.isWalkableWorld(e.x + mx, e.z)) { e.x += mx; }
    else if (this.sim.isWalkableWorld(e.x, e.z + mz)) { e.z += mz; }
  }

  /** Enemy AI: chase the nearest in-range player, else patrol around home. */
  stepEnemies(dt) {
    if (this.enemies.size === 0) return;
    for (const e of this.enemies.values()) {
      e._t += dt;
      // nearest player
      let target = null, best = Infinity;
      for (const p of this.players.values()) {
        const d = Math.hypot(p.x - e.x, p.z - e.z);
        if (d < best) { best = d; target = p; }
      }
      const distHome = Math.hypot(e.x - e.home.x, e.z - e.home.z);
      let tx, tz, speed;
      if (target && best < AGGRO_RADIUS && distHome < LEASH) {
        e.state = 'chase'; e.targetId = target.id; tx = target.x; tz = target.z; speed = CHASE_SPEED;
      } else if (distHome > e.patrolRadius * 1.5) {
        e.state = 'patrol'; e.targetId = null; tx = e.home.x; tz = e.home.z; speed = PATROL_SPEED; // leash home
      } else {
        e.state = 'patrol'; e.targetId = null;
        const a = e._t * 0.5 + e.phase;
        tx = e.home.x + Math.cos(a) * e.patrolRadius;
        tz = e.home.z + Math.sin(a) * e.patrolRadius;
        speed = PATROL_SPEED;
      }
      const dx = tx - e.x, dz = tz - e.z, dist = Math.hypot(dx, dz);
      if (dist > 0.15) {
        const ux = dx / dist, uz = dz / dist;
        e.facing = Math.atan2(ux, uz); // 0 = +Z (sim convention)
        const stp = speed * dt;
        this._tryMove(e, ux * stp, uz * stp);
      }
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

  /** Wire array of enemies for snapshots. */
  enemiesWire() {
    const out = [];
    for (const e of this.enemies.values()) {
      out.push({ id: e.id, x: r2(e.x), z: r2(e.z), f: r2(e.facing), hp: e.hp, maxHp: e.maxHp, name: e.name, level: e.level, tier: e.tier, st: e.state });
    }
    return out;
  }

  isEmpty() { return this.players.size === 0; }
}

module.exports = { PlanetWorld };
