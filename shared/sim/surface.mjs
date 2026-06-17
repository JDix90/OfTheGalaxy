/**
 * shared/sim/surface.mjs — the durable, runtime-neutral surface sim (Phase 1).
 *
 * Promoted from the Phase-0 spike's `shared/spike/world.mjs` into a real, reusable
 * sim core. Same principle: ONE deterministic module imported by both the client
 * (prediction / single-player) and, later, the authoritative server — so the live
 * world stays authoritative-ready from day one (see PHASE-0-SPIKE-RECOMMENDATION.md).
 *
 * It ingests an existing OtG `planet.mapData` and provides:
 *   - coordinate mapping between the game's 0–100 "surface" space and 3D world units,
 *   - real-time camera-relative movement integration,
 *   - tile-grid collision against `mapData.tileMap` (the same walkability the 2D
 *     surface uses), with wall-sliding.
 *
 * Pure data + pure functions. No three.js, no Node, no DOM — loads in any runtime.
 * The sim works in WORLD units (3D meters); it converts to surface coords only at
 * the two boundaries that need them: tile collision and persistence/interaction.
 */

// Tile types the 2D surface treats as impassable (PlanetSurface.jsx movement guards).
export const OBSTACLE_TILE_TYPES = new Set([
  'building', 'rock', 'tree', 'canyon', 'lava_flow', 'volcanic_vent',
  'crevasse', 'crater', 'water',
]);

// Defaults — world-unit speeds so they read naturally against a ~1.7-unit character.
export const DEFAULTS = {
  scale: 1.6,        // world units per surface-percent  (=> 0–100 maps to a 160u plane)
  walkSpeed: 6.5,    // world units / second
  runMult: 1.9,
  tickHz: 20,        // authoritative-ready fixed step (used by the server path later)
};

// World height of one building storey — the medina renderer (MedinaBuildings) draws building boxes
// `height * STORY` tall, and a player on a roof stands at that same Y. Single source of truth.
export const STORY = 2.4;
// Rooftop traversal rule: you may only walk between rooftops that are FLUSH (same height) — there's
// a literal storey-tall wall between roofs of different heights, so stepping across one would read as
// climbing a wall / dropping off a ledge. All level changes go through 'stair' tiles instead. (0 =
// flush-only. Connecting different-height roofs is a future "rooftop bridges" feature.)
const MAX_ROOF_STEP = 0;

/**
 * Build a surface sim bound to one planet's mapData.
 * @param mapData  planet.mapData ({ tileMap?, ... })  — tileMap optional (open planets).
 * @param opts     { scale?, walkSpeed?, runMult? }
 */
export function createSurfaceSim(mapData = {}, opts = {}) {
  const scale = opts.scale ?? DEFAULTS.scale;
  const walkSpeed = opts.walkSpeed ?? DEFAULTS.walkSpeed;
  const runMult = opts.runMult ?? DEFAULTS.runMult;

  const tileMap = mapData.tileMap || null;
  const tileSize = tileMap?.tileSize || 2;
  const gridSize = tileMap?.gridSize || 50;

  const worldHalf = 50 * scale;        // half-extent of the ground plane in world units
  const worldLimit = worldHalf - 0.5;  // clamp just inside the edge

  // ---- coordinate mapping (surface 0–100  <->  world units, origin-centered) ----
  const surfaceToWorld = (sx, sy) => ({ x: (sx - 50) * scale, z: (sy - 50) * scale });
  const worldToSurface = (x, z) => ({ x: x / scale + 50, y: z / scale + 50 });

  // ---- tile lookup + per-level walkability ----
  function tileAt(sx, sy) {
    if (!tileMap || sx < 0 || sx > 100 || sy < 0 || sy > 100) return null;
    const tx = Math.floor(sx / tileSize), ty = Math.floor(sy / tileSize);
    if (tx < 0 || ty < 0 || tx >= gridSize || ty >= gridSize) return null;
    const row = tileMap.tiles && tileMap.tiles[ty];
    return (row && row[tx]) || null;
  }
  const groundWalkable = (t) => !!t && t.walkable === true && !OBSTACLE_TILE_TYPES.has(t.type);
  // Tiles you can stand ON at roof level: building tops, stair landings, and bridge decks. A
  // 'bridge' is dual-level — ground-walkable below (you walk under it) AND a roof deck above (you
  // cross it), connecting two same-height roofs over an alley.
  const isRoofTile = (t) => !!t && (t.type === 'building' || t.type === 'stair' || t.type === 'bridge');
  const storeysOf = (t) => (t && t.height) ? t.height : 0;

  // Ground walkability (level 0) — the long-standing surface collision used by enemies, crowd,
  // pathfinding, and spawns. Unchanged: 'stair' tiles read as walkable, buildings as blocked.
  function isWalkableSurface(sx, sy) {
    if (sx < 0 || sx > 100 || sy < 0 || sy > 100) return false;
    if (!tileMap) return true; // open planet — anywhere in bounds is fine
    return groundWalkable(tileAt(sx, sy));
  }
  function isWalkableWorld(x, z) {
    const s = worldToSurface(x, z);
    return isWalkableSurface(s.x, s.y);
  }

  /** World Y a body stands at for a given level at (sx,sy): 0 on the ground, the roof top
   *  (storeys * STORY) when up on a building/stair. Used by the renderer for player height. */
  function surfaceLevelY(sx, sy, level) {
    if (!level) return 0;
    const t = tileAt(sx, sy);
    return (t && t.height ? t.height : 1) * STORY;
  }

  /**
   * Resolve a single attempted move (world from→to) at the player's current level, returning the
   * landing { x, z, level } or null if blocked. Ground↔roof transitions happen only via 'stair'
   * tiles; roof↔roof steps are capped at MAX_ROOF_STEP storeys. On planets without rooftops (no
   * stair/building-roof reachability) this only ever yields level 0 — identical to the old 2D move.
   */
  function resolveStep(fromX, fromZ, toX, toZ, level) {
    const ts = worldToSurface(toX, toZ);
    if (ts.x < 0 || ts.x > 100 || ts.y < 0 || ts.y > 100) return null;
    if (!tileMap) return level ? null : { x: toX, z: toZ, level: 0 }; // open planet = ground only
    const toT = tileAt(ts.x, ts.y);
    if (!toT) return null;
    const fs = worldToSurface(fromX, fromZ);
    const fromT = tileAt(fs.x, fs.y);
    if (level === 0) {
      if (groundWalkable(toT)) return { x: toX, z: toZ, level: 0 };
      // ascend: step off a stair onto the adjacent roof (≤ MAX_ROOF_STEP storeys)
      if (fromT && fromT.type === 'stair' && isRoofTile(toT) && Math.abs(storeysOf(toT) - storeysOf(fromT)) <= MAX_ROOF_STEP) {
        return { x: toX, z: toZ, level: 1 };
      }
      return null;
    }
    // level 1 (on the rooftops)
    if (isRoofTile(toT) && fromT && Math.abs(storeysOf(toT) - storeysOf(fromT)) <= MAX_ROOF_STEP) {
      return { x: toX, z: toZ, level: 1 };
    }
    // descend: step off a stair down to the ground
    if (fromT && fromT.type === 'stair' && groundWalkable(toT)) return { x: toX, z: toZ, level: 0 };
    return null;
  }

  /**
   * Authoritative movement step (identical wherever it runs).
   * @param state {x, z, facing, level?}   world-space position + heading (radians) + level (0 ground)
   * @param input {f,b,l,r, run, yaw}  button flags + run + camera yaw
   * @param dt    seconds
   * @returns new {x, z, facing, moving, speed, level}  (speed in world units/s)
   */
  function integrate(state, input, dt) {
    const yaw = input.yaw || 0;
    const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);
    const rgtX = Math.cos(yaw), rgtZ = -Math.sin(yaw);

    const fwd = (input.f ? 1 : 0) - (input.b ? 1 : 0);
    const strafe = (input.r ? 1 : 0) - (input.l ? 1 : 0);

    let mx = fwdX * fwd + rgtX * strafe;
    let mz = fwdZ * fwd + rgtZ * strafe;
    const len = Math.hypot(mx, mz);

    let facing = state.facing || 0;
    let moving = false;
    let speed = 0;
    let nx = state.x;
    let nz = state.z;
    let level = state.level || 0;

    if (len > 1e-4) {
      mx /= len; mz /= len;
      speed = walkSpeed * (input.run ? runMult : 1);
      const dx = mx * speed * dt;
      const dz = mz * speed * dt;

      // Attempt the full move; if blocked, slide along each axis independently. resolveStep also
      // resolves ground↔roof level transitions (via stairs) — on flat planets it never changes level.
      const full = resolveStep(state.x, state.z, state.x + dx, state.z + dz, level);
      if (full) {
        nx = full.x; nz = full.z; level = full.level;
      } else {
        const sX = resolveStep(state.x, state.z, state.x + dx, state.z, level);
        const sZ = resolveStep(state.x, state.z, state.x, state.z + dz, level);
        if (sX) nx = sX.x;
        if (sZ) nz = sZ.z;
        // Slides run along walls and almost never cross a level boundary; if one does, adopt it
        // (deterministic, so client + server agree).
        if (sX && sX.level !== level) level = sX.level;
        else if (sZ && sZ.level !== level) level = sZ.level;
      }
      facing = Math.atan2(mx, mz); // atan2(x, z): 0 faces +Z
      moving = (nx !== state.x || nz !== state.z);
    }

    // Hard clamp to the plane (belt-and-suspenders; tile bounds usually catch it).
    nx = Math.max(-worldLimit, Math.min(worldLimit, nx));
    nz = Math.max(-worldLimit, Math.min(worldLimit, nz));

    return { x: nx, z: nz, facing, moving, speed, level };
  }

  return {
    scale, walkSpeed, runMult, worldHalf, worldLimit, tileSize, gridSize,
    hasTileMap: !!tileMap,
    surfaceToWorld, worldToSurface,
    isWalkableSurface, isWalkableWorld,
    surfaceLevelY,
    integrate,
  };
}

/** Shortest signed angular difference a→b, in (-π, π]. (render-side helper) */
export function shortestAngle(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Normalize a possibly-0–1000 coord pair down to 0–100 (NPC coords are mixed). */
export function normalizeSurfaceCoord(x, y) {
  return { x: x > 100 ? x / 10 : x, y: y > 100 ? y / 10 : y };
}
