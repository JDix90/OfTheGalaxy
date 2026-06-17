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
const { findPath } = require('../utils/gridPathfinder');

const PALETTE = ['#ffcf5c', '#6cf0c2', '#7db8ff', '#ff8d6c', '#d18cff', '#9affa0', '#ff5a8a', '#5ad1ff'];
const TWO_PI = Math.PI * 2;
const MAX_PLAYERS = 200; // per-world cap (DoS backstop)
// Enemy AI (Phase 4.2 — movement + aggro only; combat resolution lands in P4.3).
const AGGRO_RADIUS = 16;   // world units: a player this close pulls an enemy into chase
const LEASH = 24;          // enemies won't chase beyond this from home
const PATROL_SPEED = 3.2;
const CHASE_SPEED = 5.4;
const REPATH_MS = 500;     // how often a chasing enemy re-solves its maze route to the player
const STAMINA_REGEN = 3;     // stamina per second regenerated in-world (no rejoin-to-refill)
const HEALTH_REGEN = 4;          // hp/sec regenerated OUT of combat (authoritative; flushed to DB)
const OOC_REGEN_DELAY_MS = 5000; // wait this long after the last combat before health regen kicks in
const RESPAWN_INTERVAL = 8;      // seconds between ambient enemy respawns (replaces the encounter roll)
const MAX_WORLD_ENEMIES = 30;    // hard cap on live enemies per world (scripted-spawn DoS backstop)
const DECAY_INTERVAL = 1.2;  // seconds ≈ one "turn" — decays combat status/temporary effects
// Ambient crowd (Phase 6b) — non-combat background walkers for "bustling" hub submaps
// (the spaceport). Purely cosmetic presence: they path between waypoints, never fight, and
// are streamed in the snapshot so every player sees the same crowd.
const CROWD_SPEED = 2.9;            // ambient walk speed (m/s)
const CROWD_PAUSE_MIN_MS = 600;     // dwell range once a walker reaches a destination (short =
const CROWD_PAUSE_MAX_MS = 2400;    // more walking, less standing around → reads as bustling)
const CROWD_ROLES = 6;              // tint buckets (client maps to muted civilian colors)
const MAX_CROWD = 64;              // hard cap per world (bandwidth + render backstop)
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
    this.dangerLevel = options.dangerLevel || 1;
    this.enemyPool = (Array.isArray(options.enemyPool) && options.enemyPool.length) ? options.enemyPool : null; // faction/planet-appropriate template ids
    this.ambient = options.ambient !== false; // safe hubs (e.g. the spaceport) pass ambient:false — no auto enemies, but scripted spawns (NPC/POI/quest/tutorial) still work
    this._enemySeq = 0;        // monotonic id source so respawned enemies get fresh ids
    this._respawnAcc = 0;      // accumulator for ambient respawn (replaces the old random-encounter roll)
    // Ambient crowd (cosmetic background walkers; e.g. spaceport concourse).
    this.crowd = new Map();    // crowdId -> walker
    this._crowdSeq = 0;
    this._crowdWps = [];       // world-space destination waypoints
    this.crowdCfg = (options.crowd && options.crowd.count > 0) ? options.crowd : null;
    if (this.ambient) this.spawnEnemies();
    if (this.crowdCfg) this.spawnCrowd();
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

  /** Nearest walkable 0–100 point to (sx,sy) — spirals outward, falls back to a global scan.
   *  Keeps a snapped spawn near its intended spot (vs _scanWalkable's top-left-most cell). */
  _nearestWalkableSurface(sx, sy) {
    for (let r = 2; r <= 60; r += 2) {
      for (let a = 0; a < 24; a++) {
        const ang = (a / 24) * TWO_PI;
        const nx = sx + Math.cos(ang) * r, ny = sy + Math.sin(ang) * r;
        if (nx >= 0 && ny >= 0 && nx <= 100 && ny <= 100 && this.sim.isWalkableSurface(nx, ny)) return { x: nx, y: ny };
      }
    }
    return this._scanWalkable();
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

  /** Any player on this world currently escorting? (raises spawn target + difficulty). */
  _anyEscort() { for (const p of this.players.values()) if (p.escort) return true; return false; }

  /** Target ambient-enemy population: danger-scaled, bumped while a player is escorting. */
  _targetCount() {
    const base = Math.max(2, Math.min(8, 2 + Math.floor(this.dangerLevel / 2)));
    return Math.min(10, base + (this._anyEscort() ? 2 : 0));
  }

  /** Effective enemy level: the planet's danger blended with the average player level present,
   *  so a high-level player isn't trivially safe and a low-level player isn't overrun. */
  _effLevel() {
    let sum = 0, n = 0;
    for (const p of this.players.values()) { if (p.level) { sum += p.level; n++; } }
    return Math.max(this.dangerLevel, n ? Math.round(sum / n) : 0);
  }

  /** A walkable home that isn't on top of a player (for ambient respawns). */
  _farWalkable(minDist = 22) {
    for (let i = 0; i < 16; i++) {
      const w = this._randomWalkable();
      let ok = true;
      for (const p of this.players.values()) { if (Math.hypot(p.x - w.x, p.z - w.z) < minDist) { ok = false; break; } }
      if (ok) return w;
    }
    return this._randomWalkable();
  }

  /** A walkable point ~`dist` units around `p` (for scripted spawns near the player). */
  _nearWalkable(p, dist = 7) {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * TWO_PI;
      const r = dist * (0.7 + Math.random() * 0.6);
      const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
      if (this.sim.isWalkableWorld(x, z)) return { x, z };
    }
    return this._farWalkable(dist);
  }

  /**
   * Spawn a SCRIPTED enemy (NPC attack / POI / quest) — distinct from ambient `_spawnOne`.
   * The combatant carries `enemyType` (for type-based quest matching) and optional
   * `questId`/`objectiveId` (for precise objective crediting in updateQuestCombatObjectives).
   * Returns the world enemy id, or null. `spec`: { level?, name?, enemyType?, templateId?,
   * difficulty?, near?:{x,z}, questId?, objectiveId?, ownerId?, tutorial?, passive?, isBoss? }.
   * `ownerId` instances the enemy (only that player can engage / is chased); `passive` makes it
   * wait until struck (low-aggro tutorial drone); `tutorial` tags the combatant so the kill is
   * detectable in finalize.
   */
  spawnScriptedEnemy(spec = {}) {
    if (this.enemies.size >= MAX_WORLD_ENEMIES) return null; // backstop vs scripted-spawn flooding
    const level = spec.level || this._effLevel();
    const pool = spec.templateId ? [spec.templateId] : (this.enemyPool || null);
    let t;
    try { t = generateRandomEnemy(level, spec.difficulty || 'moderate', pool); } catch (e) { return null; }
    if (!t || !t.stats) return null;
    let combatant;
    try { combatant = buildEnemyActorCombatant(t); } catch (e) { return null; }
    if (!combatant || !combatant.stats) return null;
    combatant.temporaryEffects = [];
    if (spec.name) combatant.name = spec.name;
    if (spec.enemyType) combatant.enemyType = spec.enemyType;       // quest matching by type
    if (spec.questId) combatant.questId = spec.questId;             // precise objective credit
    if (spec.objectiveId) combatant.objectiveId = spec.objectiveId;
    if (spec.tutorial) combatant.tutorial = true;                   // finalize detects tutorial kills
    if (spec.isBoss) combatant.isBoss = true;                       // credits the defeat_boss achievement
    const home = (spec.near && Number.isFinite(spec.near.x)) ? this._nearWalkable(spec.near) : this._farWalkable();
    const id = `s${this._enemySeq++}`; // 's' = scripted (vs 'e' ambient)
    this.enemies.set(id, {
      id,
      name: spec.name || t.name || 'Hostile',
      level: t.level || level,
      tier: t.tier || 'normal',
      templateKey: spec.enemyType || t.templateKey || t.key || null,
      combatant,
      maxHp: combatant.stats.maxHealth,
      x: home.x, z: home.z, facing: 0,
      home, patrolRadius: 3 + Math.random() * 2, phase: Math.random() * TWO_PI,
      state: 'patrol', targetId: null, _t: Math.random() * 4,
      dead: false, attackCdUntil: 0, scripted: true,
      ownerId: spec.ownerId || null,   // instanced: only the owner can engage / is chased
      tutorial: !!spec.tutorial,
      aggressive: !spec.passive,       // passive enemies (tutorial drone) wait until struck
    });
    return id;
  }

  /** Spawn one ambient enemy (faction/planet pool, level-blended, escort-aware difficulty). */
  _spawnOne(home) {
    const level = this._effLevel();
    const difficulty = this._anyEscort() ? 'hard' : 'moderate';
    let t;
    try { t = generateRandomEnemy(level, difficulty, this.enemyPool); } catch (e) { return false; }
    if (!t || !t.stats) return false;
    let combatant;
    try { combatant = buildEnemyActorCombatant(t); } catch (e) { return false; }
    if (!combatant || !combatant.stats) return false;
    combatant.temporaryEffects = combatant.temporaryEffects || [];
    const h = home || this._randomWalkable();
    const id = `e${this._enemySeq++}`;
    this.enemies.set(id, {
      id,
      name: t.name || 'Hostile',
      level: t.level || level,
      tier: t.tier || 'normal',
      templateKey: t.templateKey || t.key || null,
      combatant,                              // full combat stat block (hp = combatant.stats.health)
      maxHp: combatant.stats.maxHealth,
      x: h.x, z: h.z, facing: 0,
      home: h, patrolRadius: 4 + Math.random() * 3, phase: Math.random() * TWO_PI,
      state: 'patrol', targetId: null, _t: Math.random() * 10,
      dead: false, attackCdUntil: 0,
    });
    return true;
  }

  /** Fill the world up to the current target population (initial spawn). */
  spawnEnemies() {
    let guard = 0;
    while (this.enemies.size < this._targetCount() && guard++ < 12) {
      if (!this._spawnOne()) break;
    }
  }

  /** Resolve a character's spawn (world units) — mirrors the client's useSurfaceWorld. */
  spawnFor(character) {
    // ANY submap world (dungeon OR hub like the spaceport): spawn just inside the entrance, or
    // resume the saved position ONLY if it belongs to THIS submap, and always fall back to a
    // walkable cell. This mirrors the client's submapSpawn exactly — essential because in realtime
    // the client adopts this welcome.spawn, so a mismatch (or an in-wall spawn) pins the player and
    // they can't move. (The surface else-branch below now snaps to walkable too, but hubs still
    // take this entrance-aware path.)
    if (this.zone.subMapId) {
      const dims = this.zone.dims || { w: 12, h: 12 };
      const gridToPct = (v, dim) => (v > dim ? (v > 100 ? v / 10 : v) : ((v + 0.5) / dim) * 100);
      let sx = 50, sy = 50;
      const e = this.zone.entrance;
      if (e && Number.isFinite(e.x)) {
        sx = gridToPct(e.x, dims.w); sy = gridToPct(e.y, dims.h);
        sx += sx < 50 ? 6 : -6; sy += sy < 50 ? 6 : -6; // nudge off entrance wall (matches client submapSpawn)
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
    // Guard against an in-wall spawn: a saved position from before the planet's tileMap changed
    // (e.g. the dense medina rewrite turned old open ground into buildings), or a spaceport coord
    // that lands on a building. Snap to the nearest walkable cell so the player is never boxed in.
    if (!this.sim.isWalkableSurface(sx, sy)) { const p = this._nearestWalkableSurface(sx, sy); sx = p.x; sy = p.y; }
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
      level: character.level || 1,   // for enemy level-blending
      escort: false,                 // set async at join (escort-quest escalation)
      color,
      x: spawn.x, z: spawn.z, facing: spawn.facing, roofLevel: 0, // 0 ground / 1 rooftop (NOT `level`, which is the character level above)
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
      _hpFrac: 0,
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
        const next = this.sim.integrate({ x: p.x, z: p.z, facing: p.facing, level: p.roofLevel || 0 }, p.input, dt);
        p.x = next.x; p.z = next.z; p.facing = next.facing;
        p.moving = next.moving; p.speed = next.speed; p.roofLevel = next.level || 0;
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
        // Out-of-combat health regen (authoritative): only when not in an encounter AND combat
        // has lapsed, so it can't "leak" free healing while enemies are still attacking (the
        // disengage-window bug). The in-world value is what the snapshot shows + what gets flushed.
        if (!p.dead && !p.encounterId && (now - (p.lastCombatAt || 0)) > OOC_REGEN_DELAY_MS && s.health < s.maxHealth) {
          p._hpFrac += HEALTH_REGEN * dt;
          const wh = Math.floor(p._hpFrac);
          if (wh > 0) { p._hpFrac -= wh; s.health = Math.min(s.maxHealth, s.health + wh); }
        }
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
    this.stepCrowd(dt, now);

    // Ambient respawn: keep the world populated over time (this replaces the old movement-driven
    // random-encounter roll). Trickle one hostile in every RESPAWN_INTERVAL, away from players,
    // only while someone is here and below the danger/escort-scaled target.
    if (this.ambient) {
      this._respawnAcc += dt;
      if (this._respawnAcc >= RESPAWN_INTERVAL) {
        this._respawnAcc = 0;
        if (this.players.size > 0 && this.enemies.size < this._targetCount()) this._spawnOne(this._farWalkable());
      }
    }
  }

  /** Collision-aware directional move (try full, then axis-slide) — mirrors the sim. */
  _tryMove(e, mx, mz) {
    if (this.sim.isWalkableWorld(e.x + mx, e.z + mz)) { e.x += mx; e.z += mz; }
    else if (this.sim.isWalkableWorld(e.x + mx, e.z)) { e.x += mx; }
    else if (this.sim.isWalkableWorld(e.x, e.z + mz)) { e.z += mz; }
  }

  /** True if the straight world-space segment a→b stays on walkable ground (sampled ~1u apart). */
  _lineOfSight(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz)));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (!this.sim.isWalkableWorld(ax + dx * t, az + dz * t)) return false;
    }
    return true;
  }

  /**
   * Route steering: returns the world point an actor should head toward this tick to reach (tx,tz).
   * On open ground or with clear line-of-sight it's the target itself (cheap, and the final approach).
   * When buildings occlude it (the medina maze), it BFS-routes on the tile grid and steers to the next
   * waypoint, so the actor rounds corners instead of grinding against a wall. The route is cached and
   * only re-solved when the goal changes tile or every REPATH_MS. Shared by chase (target = player)
   * and patrol (target = a wander point near home).
   */
  _routeSteer(e, tx, tz, now) {
    if (!this.sim.hasTileMap || this._lineOfSight(e.x, e.z, tx, tz)) {
      e._path = null;
      return { x: tx, z: tz };
    }
    const ts = this.sim.tileSize, gs = this.sim.gridSize;
    const toTile = (wx, wz) => {
      const s = this.sim.worldToSurface(wx, wz);
      return { x: Math.min(gs - 1, Math.max(0, Math.floor(s.x / ts))), y: Math.min(gs - 1, Math.max(0, Math.floor(s.y / ts))) };
    };
    const tileToWorld = (tile) => this.sim.surfaceToWorld((tile.x + 0.5) * ts, (tile.y + 0.5) * ts);
    const startTile = toTile(e.x, e.z), goalTile = toTile(tx, tz);

    if (!e._path || !e._pathGoal || e._pathGoal.x !== goalTile.x || e._pathGoal.y !== goalTile.y || (now - (e._pathAt || 0)) > REPATH_MS) {
      const path = findPath((x, y) => this.sim.isWalkableSurface((x + 0.5) * ts, (y + 0.5) * ts), gs, startTile, goalTile);
      e._path = path && path.length ? path : null;
      e._pathGoal = goalTile; e._pathAt = now; e._pathIdx = 0;
    }
    if (!e._path) return { x: tx, z: tz }; // unreachable → straight (best effort)

    // Pop waypoints we've effectively reached, then steer to the next.
    const reach = ts * this.sim.scale * 0.6;
    let wp = e._path[e._pathIdx];
    while (wp) {
      const w = tileToWorld(wp);
      if (Math.hypot(w.x - e.x, w.z - e.z) <= reach) { e._pathIdx++; wp = e._path[e._pathIdx]; }
      else break;
    }
    if (!wp) return { x: tx, z: tz };
    const w = tileToWorld(wp);
    return { x: w.x, z: w.z };
  }

  /** A reachable wander destination within ~patrolRadius of home (for natural alley roaming). */
  _wanderPoint(e) {
    const R = e.patrolRadius;
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * TWO_PI;
      const r = R * (0.45 + Math.random() * 0.85); // 0.45R..1.3R — varied, stays inside the leash
      const x = e.home.x + Math.cos(a) * r, z = e.home.z + Math.sin(a) * r;
      if (this.sim.isWalkableWorld(x, z)) return { x, z };
    }
    return { x: e.home.x, z: e.home.z };
  }

  /**
   * Patrol steering: amble between reachable points near home, ROUTING through the alleys (via
   * _routeSteer) and pausing briefly on arrival — like the ambient crowd. Replaces the old
   * parametric circle that cut straight through medina buildings and left enemies grinding walls.
   */
  _patrolSteer(e, now) {
    // Shoved too far from home (e.g. knockback) → route straight back before resuming the amble.
    if (Math.hypot(e.x - e.home.x, e.z - e.home.z) > e.patrolRadius * 1.5) {
      if (!e._wander || (e._wander.x !== e.home.x || e._wander.z !== e.home.z)) { e._wander = { x: e.home.x, z: e.home.z }; e._path = null; }
      e._wanderPauseUntil = 0;
    }
    // Reached the current destination → start a short dwell, then pick a new one.
    if (e._wander && Math.hypot(e.x - e._wander.x, e.z - e._wander.z) < 0.8) {
      e._wander = null; e._path = null; e._wanderPauseUntil = now + 600 + Math.random() * 2200;
    }
    if (e._wanderPauseUntil && now < e._wanderPauseUntil) return { x: e.x, z: e.z }; // dwell in place
    if (!e._wander) { e._wander = this._wanderPoint(e); e._path = null; }
    return this._routeSteer(e, e._wander.x, e._wander.z, now);
  }

  /** Enemy AI: chase the nearest in-range player, else patrol around home. Attacks in melee. */
  stepEnemies(dt, now) {
    if (this.enemies.size === 0) return;
    for (const e of this.enemies.values()) {
      if (e.dead) continue;
      e._t += dt;
      // nearest LIVING player. Instanced enemies (e.g. the tutorial drone) only consider their
      // owner, so they never chase or attack bystanders in the shared world.
      let target = null, best = Infinity;
      for (const p of this.players.values()) {
        if (p.dead) continue;
        if (p.roofLevel) continue; // up on the rooftops → out of reach of ground enemies (a refuge)
        if (e.ownerId && p.id !== e.ownerId) continue;
        const d = Math.hypot(p.x - e.x, p.z - e.z);
        if (d < best) { best = d; target = p; }
      }
      const passive = e.aggressive === false; // passive (unstruck tutorial drone) → patrol only
      const distHome = Math.hypot(e.x - e.home.x, e.z - e.home.z);
      let tx, tz, speed;
      let patrolling = false;
      if (target && !passive && best < AGGRO_RADIUS && distHome < LEASH) {
        e.state = 'chase'; e.targetId = target.id; speed = CHASE_SPEED;
        // Steer along a maze route when the player is occluded by buildings; head straight on open
        // ground / clear line-of-sight (the common case, and the final approach).
        const steer = this._routeSteer(e, target.x, target.z, now);
        tx = steer.x; tz = steer.z;
      } else {
        e.state = 'patrol'; e.targetId = null; speed = PATROL_SPEED; patrolling = true;
        // Amble between reachable points near home, routing through the alleys (not a circle that
        // cuts through buildings).
        const steer = this._patrolSteer(e, now);
        tx = steer.x; tz = steer.z;
      }
      const dx = tx - e.x, dz = tz - e.z, dd = Math.hypot(dx, dz);
      const bx = e.x, bz = e.z;
      if (dd > 0.15) {
        const ux = dx / dd, uz = dz / dd;
        e.facing = Math.atan2(ux, uz); // 0 = +Z (sim convention)
        const stp = speed * dt;
        this._tryMove(e, ux * stp, uz * stp);
      }
      // Stuck against a wall while patrolling (no progress, not dwelling) → drop the destination so
      // the next tick picks a fresh reachable one (mirrors the crowd's anti-grind guard).
      if (patrolling && !(e._wanderPauseUntil && now < e._wanderPauseUntil) &&
          Math.abs(e.x - bx) < 1e-4 && Math.abs(e.z - bz) < 1e-4) { e._wander = null; e._path = null; }
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
        ...(p.roofLevel ? { l: p.roofLevel } : {}), // rooftop level (omitted on the ground to save bytes)
      });
    }
    return out;
  }

  /** Resolve the crowd's destination waypoints (world coords) from the configured surface
   *  points, dropping any that aren't walkable; always leaves at least a few fallbacks. */
  _crowdWaypoints() {
    const pts = [];
    for (const p of (this.crowdCfg.points || [])) {
      if (Number.isFinite(p.x) && Number.isFinite(p.y) && this.sim.isWalkableSurface(p.x, p.y)) {
        pts.push(this.sim.surfaceToWorld(p.x, p.y));
      }
    }
    let guard = 0;
    while (pts.length < 4 && guard++ < 8) pts.push(this._randomWalkable());
    return pts;
  }

  _pickWaypoint() {
    return this._crowdWps[(Math.random() * this._crowdWps.length) | 0] || this._randomWalkable();
  }

  /** Populate the ambient crowd at random walkable points, each headed to a waypoint. */
  spawnCrowd() {
    this._crowdWps = this._crowdWaypoints();
    const n = Math.min(MAX_CROWD, this.crowdCfg.count | 0);
    for (let i = 0; i < n; i++) {
      const start = this._randomWalkable();
      const t = this._pickWaypoint();
      const id = `c${this._crowdSeq++}`;
      this.crowd.set(id, {
        id, x: start.x, z: start.z, facing: Math.random() * TWO_PI,
        role: (Math.random() * CROWD_ROLES) | 0,
        speed: CROWD_SPEED * (0.72 + Math.random() * 0.7),
        tx: t.x, tz: t.z, pauseUntil: 0,
      });
    }
  }

  /** Walk each crowd member toward its destination; dwell on arrival, then pick a new one.
   *  Routes through the alleys via _routeSteer (same as enemies) so a medina-surface crowd
   *  ambles the souks instead of grinding against building walls. */
  stepCrowd(dt, now) {
    if (this.crowd.size === 0) return;
    for (const c of this.crowd.values()) {
      if (c.pauseUntil && now < c.pauseUntil) continue;
      const dx = c.tx - c.x, dz = c.tz - c.z, dd = Math.hypot(dx, dz);
      if (dd < 0.6) { // arrived: dwell, then choose a new destination
        c.pauseUntil = now + CROWD_PAUSE_MIN_MS + Math.random() * (CROWD_PAUSE_MAX_MS - CROWD_PAUSE_MIN_MS);
        const t = this._pickWaypoint(); c.tx = t.x; c.tz = t.z; c._path = null;
        continue;
      }
      const bx = c.x, bz = c.z;
      const steer = this._routeSteer(c, c.tx, c.tz, now);
      const sx = steer.x - c.x, sz = steer.z - c.z, sd = Math.hypot(sx, sz);
      if (sd > 1e-3) {
        const ux = sx / sd, uz = sz / sd;
        c.facing = Math.atan2(ux, uz); // 0 = +Z (sim convention)
        this._tryMove(c, ux * c.speed * dt, uz * c.speed * dt);
      }
      // Stuck against a wall (no progress) → repick a destination so they don't grind in place.
      if (Math.abs(c.x - bx) < 1e-4 && Math.abs(c.z - bz) < 1e-4) { const t = this._pickWaypoint(); c.tx = t.x; c.tz = t.z; c._path = null; }
    }
  }

  /** Wire array of the ambient crowd for snapshots (null when empty → field omitted). */
  crowdWire() {
    if (this.crowd.size === 0) return null;
    const out = [];
    for (const c of this.crowd.values()) out.push({ id: c.id, x: r2(c.x), z: r2(c.z), f: r2(c.facing), r: c.role });
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
