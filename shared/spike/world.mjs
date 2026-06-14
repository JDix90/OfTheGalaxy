/**
 * shared/spike/world.mjs — Phase-0 spike: the ONE shared sim/world module.
 *
 * THE EXPERIMENT: this exact file is imported by BOTH
 *   - the authoritative Node server (backend/spike/spikeServer.js, via `await import()`), and
 *   - the R3F browser client (frontend/src/spike/*, via a normal Vite `import`).
 *
 * It mirrors World of ClaudeCraft's central trick: a single deterministic sim core
 * that runs identically server-side (authoritative) and client-side (prediction /
 * offline). Movement + collision live here so the client's prediction and the
 * server's integration produce the SAME result from the SAME inputs — which is what
 * makes the loop authoritative-ready from day one (drift ≈ 0, no rubber-banding).
 *
 * Pure data + pure functions only. No three.js, no Node, no DOM — so it loads in
 * both runtimes. (This cross-boundary import is itself a tested data point for the
 * architecture recommendation: OtG's backend is CommonJS, the frontend is ESM.)
 */

// ---- Simulation constants ---------------------------------------------------
export const TICK_HZ = 20;               // authoritative tick rate (ClaudeCraft uses 20)
export const DT = 1 / TICK_HZ;           // fixed timestep, seconds
export const SNAPSHOT_HZ = 20;           // server→client broadcast rate
export const INPUT_HZ = 20;              // client→server input send rate

export const WALK_SPEED = 6.0;           // units / second
export const RUN_MULT = 1.8;
export const PLAYER_RADIUS = 0.55;
export const GROUND_HALF = 40;           // ground plane is 80 x 80, centered at origin
export const WORLD_LIMIT = GROUND_HALF - 1; // clamp players just inside the edge

// ---- The world: static colliders, tagged by streaming "chunk" ---------------
// Each prop is an axis-aligned box. `hx/hz` are half-extents on the ground plane,
// `h` is visual height. `chunk` drives the world-streaming SEAM stub on the client
// (props load/unload by area as the player crosses chunk borders).
export const CHUNKS = {
  alpha:  { id: 'alpha',  label: 'Landing Pad — Alpha', center: { x: 0,  z: 0 } },
  beacon: { id: 'beacon', label: 'Relay Beacon — East', center: { x: 26, z: 0 } },
};

export const PROPS = [
  // --- chunk: alpha (spawn area) ---
  { id: 'crate-1',   chunk: 'alpha', type: 'crate',   x: -6,  z: -4,  hx: 1.0, hz: 1.0, h: 2.0 },
  { id: 'crate-2',   chunk: 'alpha', type: 'crate',   x: -4,  z: -5,  hx: 1.0, hz: 1.0, h: 2.0 },
  { id: 'crate-3',   chunk: 'alpha', type: 'crate',   x: -5,  z: -3,  hx: 1.0, hz: 1.0, h: 2.0 },
  { id: 'pillar-1',  chunk: 'alpha', type: 'pillar',  x: 7,   z: -7,  hx: 0.8, hz: 0.8, h: 5.0 },
  { id: 'pillar-2',  chunk: 'alpha', type: 'pillar',  x: 7,   z: 7,   hx: 0.8, hz: 0.8, h: 5.0 },
  { id: 'pillar-3',  chunk: 'alpha', type: 'pillar',  x: -8,  z: 8,   hx: 0.8, hz: 0.8, h: 5.0 },
  { id: 'wall-n',    chunk: 'alpha', type: 'wall',    x: 0,   z: -14, hx: 9.0, hz: 0.6, h: 3.0 },
  { id: 'habitat-1', chunk: 'alpha', type: 'habitat', x: -14, z: 0,   hx: 3.0, hz: 4.0, h: 4.0 },
  // --- chunk: beacon (east, loads when you walk over) ---
  { id: 'beacon-core',  chunk: 'beacon', type: 'beacon',  x: 26, z: 0,  hx: 1.4, hz: 1.4, h: 7.0 },
  { id: 'beacon-wall-1',chunk: 'beacon', type: 'wall',    x: 22, z: -6, hx: 0.6, hz: 4.0, h: 3.0 },
  { id: 'beacon-wall-2',chunk: 'beacon', type: 'wall',    x: 30, z: 6,  hx: 0.6, hz: 4.0, h: 3.0 },
  { id: 'beacon-crate', chunk: 'beacon', type: 'crate',   x: 23, z: 4,  hx: 1.0, hz: 1.0, h: 2.0 },
];

/** Which chunk a world position belongs to (used by the streaming seam stub). */
export function chunkAt(x /*, z */) {
  return x > 14 ? 'beacon' : 'alpha';
}

// ---- Movement + collision (the deterministic core) --------------------------

/** Resolve a player circle out of one AABB prop. Mutates+returns {x,z}. */
function resolveCircleBox(pos, prop, radius) {
  const minX = prop.x - prop.hx, maxX = prop.x + prop.hx;
  const minZ = prop.z - prop.hz, maxZ = prop.z + prop.hz;
  // Closest point on the box to the circle center.
  const cx = Math.max(minX, Math.min(pos.x, maxX));
  const cz = Math.max(minZ, Math.min(pos.z, maxZ));
  const dx = pos.x - cx;
  const dz = pos.z - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= radius * radius) return pos; // not penetrating

  if (d2 > 1e-8) {
    const d = Math.sqrt(d2);
    const push = (radius - d) / d;
    pos.x += dx * push;
    pos.z += dz * push;
  } else {
    // Center is inside the box — push out along the shallowest axis.
    const toLeft = pos.x - minX, toRight = maxX - pos.x;
    const toBack = pos.z - minZ, toFront = maxZ - pos.z;
    const minPen = Math.min(toLeft, toRight, toBack, toFront);
    if (minPen === toLeft) pos.x = minX - radius;
    else if (minPen === toRight) pos.x = maxX + radius;
    else if (minPen === toBack) pos.z = minZ - radius;
    else pos.z = maxZ + radius;
  }
  return pos;
}

/**
 * The authoritative movement step — identical on server and client.
 *
 * @param state {x, z, facing}  current position + heading (radians)
 * @param input {f,b,l,r, run, yaw}  button flags (0/1), run toggle, camera yaw
 * @param dt    seconds for this step
 * @returns a NEW {x, z, facing, moving, speed}
 */
export function integrateMovement(state, input, dt) {
  const yaw = input.yaw || 0;
  // Camera-relative basis: forward is where the camera looks; right is +90°.
  const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);
  const rgtX = Math.cos(yaw),  rgtZ = -Math.sin(yaw);

  const fwd = (input.f ? 1 : 0) - (input.b ? 1 : 0);
  const strafe = (input.r ? 1 : 0) - (input.l ? 1 : 0);

  let mx = fwdX * fwd + rgtX * strafe;
  let mz = fwdZ * fwd + rgtZ * strafe;
  const len = Math.hypot(mx, mz);

  let facing = state.facing || 0;
  let moving = false;
  let speed = 0;

  const next = { x: state.x, z: state.z };
  if (len > 1e-4) {
    mx /= len; mz /= len;
    speed = WALK_SPEED * (input.run ? RUN_MULT : 1);
    next.x += mx * speed * dt;
    next.z += mz * speed * dt;
    facing = Math.atan2(mx, mz); // face movement direction (atan2(x,z): 0 = +Z)
    moving = true;
  }

  // Collide against every prop (a couple of passes settles corners).
  for (let pass = 0; pass < 2; pass++) {
    for (const prop of PROPS) resolveCircleBox(next, prop, PLAYER_RADIUS);
  }
  // World bounds.
  next.x = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, next.x));
  next.z = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, next.z));

  return { x: next.x, z: next.z, facing, moving, speed };
}

/** Shortest signed angular difference a→b, in (-π, π]. (render-side helper) */
export function shortestAngle(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
