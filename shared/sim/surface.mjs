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

  // ---- walkability ----
  function isWalkableSurface(sx, sy) {
    if (sx < 0 || sx > 100 || sy < 0 || sy > 100) return false;
    if (!tileMap) return true; // open planet — anywhere in bounds is fine
    const tx = Math.floor(sx / tileSize);
    const ty = Math.floor(sy / tileSize);
    if (tx < 0 || ty < 0 || tx >= gridSize || ty >= gridSize) return false;
    const row = tileMap.tiles && tileMap.tiles[ty];
    const tile = row && row[tx];
    if (!tile) return false; // missing tile = blocked (matches 2D surface)
    return tile.walkable === true && !OBSTACLE_TILE_TYPES.has(tile.type);
  }
  function isWalkableWorld(x, z) {
    const s = worldToSurface(x, z);
    return isWalkableSurface(s.x, s.y);
  }

  /**
   * Authoritative movement step (identical wherever it runs).
   * @param state {x, z, facing}   world-space position + heading (radians)
   * @param input {f,b,l,r, run, yaw}  button flags + run + camera yaw
   * @param dt    seconds
   * @returns new {x, z, facing, moving, speed}  (speed in world units/s)
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

    if (len > 1e-4) {
      mx /= len; mz /= len;
      speed = walkSpeed * (input.run ? runMult : 1);
      const dx = mx * speed * dt;
      const dz = mz * speed * dt;

      // Attempt full move; if blocked, slide along each axis independently.
      if (isWalkableWorld(state.x + dx, state.z + dz)) {
        nx = state.x + dx; nz = state.z + dz;
      } else {
        if (isWalkableWorld(state.x + dx, state.z)) nx = state.x + dx;
        if (isWalkableWorld(state.x, state.z + dz)) nz = state.z + dz;
      }
      facing = Math.atan2(mx, mz); // atan2(x, z): 0 faces +Z
      moving = (nx !== state.x || nz !== state.z);
    }

    // Hard clamp to the plane (belt-and-suspenders; tile bounds usually catch it).
    nx = Math.max(-worldLimit, Math.min(worldLimit, nx));
    nz = Math.max(-worldLimit, Math.min(worldLimit, nz));

    return { x: nx, z: nz, facing, moving, speed };
  }

  return {
    scale, walkSpeed, runMult, worldHalf, worldLimit, tileSize, gridSize,
    hasTileMap: !!tileMap,
    surfaceToWorld, worldToSurface,
    isWalkableSurface, isWalkableWorld,
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
