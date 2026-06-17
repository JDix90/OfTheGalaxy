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
const HEALTH_REGEN = 4;          // hp/sec regenerated OUT of combat (authoritative; flushed to DB)
const OOC_REGEN_DELAY_MS = 5000; // wait this long after the last combat before health regen kicks in
const RESPAWN_INTERVAL = 8;      // seconds between ambient enemy respawns (replaces the encounter roll)
const MAX_WORLD_ENEMIES = 30;    // hard cap on live enemies per world (scripted-spawn DoS backstop)
const DECAY_INTERVAL = 1.2;  // seconds ≈ one "turn" — decays combat status/temporary effects
// Ambient crowd (Phase 6b) — non-combat background walkers for "bustling" hub submaps
// (the spaceport). Purely cosmetic presence: they path between waypoints, never fight, and
// are streamed in the snapshot so every player sees the same crowd.
const CROWD_SPEED = 2.6;            // ambient walk speed (m/s)
const CROWD_PAUSE_MIN_MS = 1200;    // dwell range once a walker reaches a destination
const CROWD_PAUSE_MAX_MS = 4200;
const CROWD_ROLES = 6;              // tint buckets (client maps to muted civilian colors)
const MAX_CROWD = 48;              // hard cap per world (bandwidth + render backstop)
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
    // they can't move. The surface else-branch below misapplies a stale surface coord with no
    // walkability guard, which is why hub submaps must take this path too.
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
        if (e.ownerId && p.id !== e.ownerId) continue;
        const d = Math.hypot(p.x - e.x, p.z - e.z);
        if (d < best) { best = d; target = p; }
      }
      const passive = e.aggressive === false; // passive (unstruck tutorial drone) → patrol only
      const distHome = Math.hypot(e.x - e.home.x, e.z - e.home.z);
      let tx, tz, speed;
      if (target && !passive && best < AGGRO_RADIUS && distHome < LEASH) {
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
        speed: CROWD_SPEED * (0.8 + Math.random() * 0.5),
        tx: t.x, tz: t.z, pauseUntil: 0,
      });
    }
  }

  /** Walk each crowd member toward its destination; dwell on arrival, then pick a new one. */
  stepCrowd(dt, now) {
    if (this.crowd.size === 0) return;
    for (const c of this.crowd.values()) {
      if (c.pauseUntil && now < c.pauseUntil) continue;
      const dx = c.tx - c.x, dz = c.tz - c.z, dd = Math.hypot(dx, dz);
      if (dd < 0.6) { // arrived: dwell, then choose a new destination
        c.pauseUntil = now + CROWD_PAUSE_MIN_MS + Math.random() * (CROWD_PAUSE_MAX_MS - CROWD_PAUSE_MIN_MS);
        const t = this._pickWaypoint(); c.tx = t.x; c.tz = t.z;
        continue;
      }
      const ux = dx / dd, uz = dz / dd;
      c.facing = Math.atan2(ux, uz); // 0 = +Z (sim convention)
      const bx = c.x, bz = c.z;
      this._tryMove(c, ux * c.speed * dt, uz * c.speed * dt);
      // Stuck against a wall (no progress) → repick a destination so they don't grind in place.
      if (Math.abs(c.x - bx) < 1e-4 && Math.abs(c.z - bz) < 1e-4) { const t = this._pickWaypoint(); c.tx = t.x; c.tz = t.z; }
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
