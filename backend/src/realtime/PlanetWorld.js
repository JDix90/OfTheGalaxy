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
const { resolveCast, resolveDodge, enemyTryAttack, buildEnemyActorCombatant, DISENGAGE_MS } = require('./combat');

const PALETTE = ['#ffcf5c', '#6cf0c2', '#7db8ff', '#ff8d6c', '#d18cff', '#9affa0', '#ff5a8a', '#5ad1ff'];
const TWO_PI = Math.PI * 2;
const MAX_PLAYERS = 200; // per-world cap (DoS backstop)
// Enemy AI (Phase 4.2 — movement + aggro only; combat resolution lands in P4.3).
const AGGRO_RADIUS = 16;   // world units: a player this close pulls an enemy into chase
const LEASH = 24;          // enemies won't chase beyond this from home
const PATROL_SPEED = 3.2;
const CHASE_SPEED = 5.4;
const STAMINA_REGEN = 3;     // stamina per second regenerated in-world (no rejoin-to-refill)
const DECAY_INTERVAL = 1.2;  // seconds ≈ one "turn" — decays combat status/temporary effects
const r2 = (n) => Math.round(n * 100) / 100;
const normYaw = (y) => (typeof y === 'number' && Number.isFinite(y) ? ((y % TWO_PI) + TWO_PI) % TWO_PI : null);

class PlanetWorld {
  /**
   * @param {string} planetId
   * @param {object} sim     a createSurfaceSim(mapData) instance (integrate + coord maps)
   * @param {object} mapData the planet mapData (for spawn)
   */
  constructor(planetId, sim, mapData, options = {}) {
    // `planetId` is the world KEY (a subMapId for dungeons). zone.planetId is the real planet.
    this.zone = options.zone || { type: 'surface' };
    this.zoneId = planetId;
    this.planetId = this.zone.planetId || planetId; // real planet (combat + persistence)
    this.subMapId = this.zone.subMapId || null;
    this.sim = sim;
    this.mapData = mapData || {};
    this.players = new Map();  // playerId -> player
    this.enemies = new Map();  // enemyId -> enemy
    this._nextColor = 0;
    this.fx = [];              // combat events for broadcast (drained each snapshot)
    this.intents = [];         // engagement lifecycle intents (drained each tick → CombatManager)
    this._decayAcc = 0;        // accumulator for periodic status-effect decay
    this.spawnEnemies(options.dangerLevel || 1);
  }

  pushFx(ev) { if (this.fx.length < 256) this.fx.push(ev); }
  pushIntent(it) { this.intents.push(it); }
  drainFx() { if (this.fx.length === 0) return null; const f = this.fx; this.fx = []; return f; }
  drainIntents() { if (this.intents.length === 0) return null; const i = this.intents; this.intents = []; return i; }

  /** Resolve a player combat cast (basic attack / ability) against a target enemy. */
  handleCast(playerId, msg, now) {
    resolveCast(this, this.players.get(playerId), msg, now);
  }

  /** Resolve a dodge-roll (i-frames + dash). */
  handleDodge(playerId, now) {
    resolveDodge(this, this.players.get(playerId), now);
  }

  /** Deterministic scan for any walkable 0–100 point (fallback for sparse dungeon grids). */
  _scanWalkable() {
    for (let sy = 3; sy < 100; sy += 3) {
      for (let sx = 3; sx < 100; sx += 3) {
        if (this.sim.isWalkableSurface(sx, sy)) return { x: sx, y: sy };
      }
    }
    return { x: 50, y: 50 };
  }

  /** Find a random walkable world position for enemy placement (scans if random fails). */
  _randomWalkable() {
    for (let i = 0; i < 24; i++) {
      const sx = 12 + Math.random() * 76;
      const sy = 12 + Math.random() * 76;
      if (this.sim.isWalkableSurface(sx, sy)) return this.sim.surfaceToWorld(sx, sy);
    }
    const p = this._scanWalkable();
    return this.sim.surfaceToWorld(p.x, p.y);
  }

  /** Populate the world with patrolling enemies scaled to the planet's danger level. */
  spawnEnemies(dangerLevel) {
    const count = Math.max(2, Math.min(8, 2 + Math.floor(dangerLevel / 2)));
    for (let i = 0; i < count; i++) {
      let t;
      try { t = generateRandomEnemy(dangerLevel); } catch (e) { t = null; }
      if (!t || !t.stats) continue;
      let combatant;
      try { combatant = buildEnemyActorCombatant(t); } catch (e) { continue; }
      if (!combatant || !combatant.stats) continue;
      combatant.temporaryEffects = combatant.temporaryEffects || [];
      const home = this._randomWalkable();
      this.enemies.set(`e${i}`, {
        id: `e${i}`,
        name: t.name || 'Hostile',
        level: t.level || dangerLevel,
        tier: t.tier || 'normal',
        templateKey: t.templateKey || t.key || null,
        combatant,                              // full combat stat block (hp = combatant.stats.health)
        maxHp: combatant.stats.maxHealth,
        x: home.x, z: home.z, facing: 0,
        home, patrolRadius: 4 + Math.random() * 3, phase: Math.random() * TWO_PI,
        state: 'patrol', targetId: null, _t: Math.random() * 10,
        dead: false, attackCdUntil: 0,
      });
    }
  }

  /** Resolve a character's spawn (world units) — mirrors the client's useSurfaceWorld. */
  spawnFor(character) {
    // Dungeon: spawn just inside the entrance (or resume saved position on this submap).
    if (this.zone.type === 'dungeon') {
      const dims = this.zone.dims || { w: 12, h: 12 };
      const gridToPct = (v, dim) => (v > dim ? (v > 100 ? v / 10 : v) : ((v + 0.5) / dim) * 100);
      let sx = 50, sy = 50;
      const e = this.zone.entrance;
      if (e && Number.isFinite(e.x)) {
        sx = gridToPct(e.x, dims.w); sy = gridToPct(e.y, dims.h);
        sx += sx < 50 ? 4 : -4; sy += sy < 50 ? 4 : -4; // nudge off the entrance wall
      }
      const loc = character && character.currentLocation;
      if (loc && loc.subMapId === this.subMapId && Number.isFinite(loc.x) && (loc.x || loc.y)) {
        sx = loc.x > 100 ? loc.x / 10 : loc.x; sy = loc.y > 100 ? loc.y / 10 : loc.y;
      }
      if (!this.sim.isWalkableSurface(sx, sy)) { const p = this._scanWalkable(); sx = p.x; sy = p.y; }
      const w = this.sim.surfaceToWorld(sx, sy);
      return { x: w.x, z: w.z, facing: Math.PI };
    }
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
  addPlayer({ id, character, ws, combatant, abilities }) {
    if (this.players.size >= MAX_PLAYERS && !this.players.has(id)) return null;
    const spawn = this.spawnFor(character);
    const color = PALETTE[this._nextColor++ % PALETTE.length];
    if (combatant) combatant.temporaryEffects = combatant.temporaryEffects || [];
    const player = {
      id,
      ws,
      characterId: character.id,
      userId: character.userId,
      name: character.name || 'Traveler',
      color,
      x: spawn.x, z: spawn.z, facing: spawn.facing,
      moving: false, speed: 0,
      maxHp: combatant ? combatant.stats.maxHealth : character.maxHealth,
      input: { f: 0, b: 0, l: 0, r: 0, run: 0, yaw: 0 },
      lastSeq: 0,
      lastClientTime: 0,
      // combat state (Phase 4.3/4.4) — hp lives in combatant.stats.health
      combatant,
      abilities: Array.isArray(abilities) ? abilities : [],
      dead: false,
      engagedEnemies: new Map(),  // enemyId -> enemy combatant (kept for rewards even after death)
      encounterId: null,
      _engaging: false,
      _finalizing: false,
      _fleePushed: false,
      _stamFrac: 0,
      abilityCdUntil: {},
      lastCombatAt: 0,
      // dodge-roll (Phase 4.4)
      iFrameUntil: 0,
      dashUntil: 0,
      dashSpeed: 0,
      dodgeCdUntil: 0,
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

  /** Decrement combat status/temporary effect durations; drop expired (real-time decay). */
  _decay(c) {
    if (!c) return;
    if (Array.isArray(c.statusEffects) && c.statusEffects.length) {
      c.statusEffects = c.statusEffects.filter((e) => { if (e.duration == null) return true; e.duration -= 1; return e.duration > 0; });
    }
    if (Array.isArray(c.temporaryEffects) && c.temporaryEffects.length) {
      c.temporaryEffects = c.temporaryEffects.filter((e) => { if (e.duration == null) return true; e.duration -= DECAY_INTERVAL; return e.duration > 0; });
    }
  }

  /** Integrate one fixed step for every player + enemy. */
  step(dt, now) {
    // Periodic effect decay (~1 turn worth) so combat buffs/debuffs aren't permanent.
    this._decayAcc += dt;
    const decayNow = this._decayAcc >= DECAY_INTERVAL;
    if (decayNow) this._decayAcc = 0;

    for (const p of this.players.values()) {
      // Dead players hold position until respawn; they don't integrate input.
      if (!p.dead) {
        const next = this.sim.integrate({ x: p.x, z: p.z, facing: p.facing }, p.input, dt);
        p.x = next.x; p.z = next.z; p.facing = next.facing;
        p.moving = next.moving; p.speed = next.speed;
        // Dodge dash: a brief burst in the facing direction (on top of input movement).
        if (p.dashUntil && now < p.dashUntil) {
          const step = (p.dashSpeed || 0) * dt;
          this._tryMove(p, Math.sin(p.facing) * step, Math.cos(p.facing) * step);
        }
      } else {
        p.moving = false; p.speed = 0;
      }
      // Stamina regen + effect decay (combat). Stamina stays an INTEGER (DB column is int)
      // via a fractional accumulator — never write a float to currentStamina.
      if (p.combatant) {
        const s = p.combatant.stats;
        p._stamFrac += STAMINA_REGEN * dt;
        const whole = Math.floor(p._stamFrac);
        if (whole > 0) { p._stamFrac -= whole; s.stamina = Math.min(s.maxStamina, s.stamina + whole); }
        if (decayNow) this._decay(p.combatant);
      }
      // Disengage: drop an idle-too-long engagement so a fresh fight starts a new encounter.
      // _fleePushed guards against re-queueing while the async finalize lands.
      if (p.encounterId && !p.dead && !p._fleePushed && now - p.lastCombatAt > DISENGAGE_MS) {
        p._fleePushed = true;
        this.pushIntent({ type: 'flee', playerId: p.id });
      }
    }
    if (decayNow) for (const e of this.enemies.values()) this._decay(e.combatant);
    this.stepEnemies(dt, now);
  }

  /** Collision-aware directional move (try full, then axis-slide) — mirrors the sim. */
  _tryMove(e, mx, mz) {
    if (this.sim.isWalkableWorld(e.x + mx, e.z + mz)) { e.x += mx; e.z += mz; }
    else if (this.sim.isWalkableWorld(e.x + mx, e.z)) { e.x += mx; }
    else if (this.sim.isWalkableWorld(e.x, e.z + mz)) { e.z += mz; }
  }

  /** Enemy AI: chase the nearest in-range player, else patrol around home. Attacks in melee. */
  stepEnemies(dt, now) {
    if (this.enemies.size === 0) return;
    for (const e of this.enemies.values()) {
      if (e.dead) continue;
      e._t += dt;
      // nearest LIVING player
      let target = null, best = Infinity;
      for (const p of this.players.values()) {
        if (p.dead) continue;
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
      const dx = tx - e.x, dz = tz - e.z, dd = Math.hypot(dx, dz);
      if (dd > 0.15) {
        const ux = dx / dd, uz = dz / dd;
        e.facing = Math.atan2(ux, uz); // 0 = +Z (sim convention)
        const stp = speed * dt;
        this._tryMove(e, ux * stp, uz * stp);
      }
      // Attack when chasing a player in melee range (combat.js handles range/cooldown/death).
      if (e.state === 'chase' && target) enemyTryAttack(this, e, target, now);
    }
  }

  /** Shared wire array of all players (remotes filter out `you` client-side). */
  playersWire() {
    const out = [];
    for (const p of this.players.values()) {
      out.push({
        id: p.id, x: r2(p.x), z: r2(p.z), f: r2(p.facing), m: p.moving ? 1 : 0, c: p.color, name: p.name,
        hp: p.combatant ? p.combatant.stats.health : p.maxHp, maxHp: p.maxHp, dead: p.dead ? 1 : 0,
      });
    }
    return out;
  }

  /** Wire array of enemies for snapshots. */
  enemiesWire() {
    const out = [];
    for (const e of this.enemies.values()) {
      out.push({ id: e.id, x: r2(e.x), z: r2(e.z), f: r2(e.facing), hp: e.combatant.stats.health, maxHp: e.maxHp, name: e.name, level: e.level, tier: e.tier, st: e.state });
    }
    return out;
  }

  isEmpty() { return this.players.size === 0; }
}

module.exports = { PlanetWorld };
