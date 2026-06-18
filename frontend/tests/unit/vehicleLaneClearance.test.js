import { describe, test, expect } from 'vitest';
import { createSurfaceSim, DEFAULTS } from '../../../shared/sim/surface.mjs';
import { clearestSubRun } from '../../src/components/surface3d/SurfaceVehicles.jsx';

// A 2-tile-wide horizontal street (tile rows 24-25 → world z spanning -3.2..3.2),
// buildings everywhere else. A lane runs along row 24 (centreline world z = -1.6),
// so there's only 1.6 units of clearance to the wall on the -z side.
function streetMap() {
  const gridSize = 50, tileSize = 2;
  const tiles = [];
  for (let y = 0; y < gridSize; y++) {
    const row = [];
    for (let x = 0; x < gridSize; x++) row.push({ type: 'building', walkable: false, visual: 'building' });
    tiles.push(row);
  }
  for (let x = 5; x < 45; x++) { tiles[24][x] = { type: 'street', walkable: true, visual: 'street' }; tiles[25][x] = { type: 'street', walkable: true, visual: 'street' }; }
  return { gridSize, tileSize, tiles };
}

describe('vehicle lane clearance (footprint, not centreline)', () => {
  const sim = createSurfaceSim({ tileMap: streetMap() }, { scale: DEFAULTS.scale });
  const run = { a: [-59.2, -1.6], b: [59.2, -1.6], len: 118.4 }; // along the row-24 centreline

  test('a vehicle that fits the lane width is kept', () => {
    const r = clearestSubRun(run, sim.isWalkableWorld, 4, 1.0, 2); // half-width 1.0 < 1.6 clearance
    expect(r).not.toBeNull();
    expect(r.len).toBeGreaterThan(4);
  });

  test('a vehicle wider than the lane is rejected (would overhang the wall)', () => {
    const r = clearestSubRun(run, sim.isWalkableWorld, 4, 2.5, 2); // half-width 2.5 > 1.6 → pokes into the building
    expect(r).toBeNull();
  });

  test('the kept lane is fully clear at the vehicle footprint', () => {
    const r = clearestSubRun(run, sim.isWalkableWorld, 4, 1.0, 2);
    const dx = r.b[0] - r.a[0], dz = r.b[1] - r.a[1], L = Math.hypot(dx, dz);
    const ux = dx / L, uz = dz / L, px = -uz, pz = ux;
    for (let t = 0; t <= 1; t += 0.1) {
      const x = r.a[0] + dx * t, z = r.a[1] + dz * t;
      expect(sim.isWalkableWorld(x + px * 1.0, z + pz * 1.0)).toBe(true);
      expect(sim.isWalkableWorld(x - px * 1.0, z - pz * 1.0)).toBe(true);
    }
  });
});

// Regression for the clip bug: a wide vehicle (the speeder body spans ~2 tiles) could straddle an
// obstacle tile poking into the MIDDLE of its width. The old check only sampled the centreline + the
// two ±halfW edges, so a tile between those points was missed and the vehicle drove through it. The
// full-footprint grid catches it.
describe('vehicle lane clearance — obstacle inside the body width', () => {
  const S = DEFAULTS.scale, TS = 2;
  const w = (tx, ty) => [(((tx + 0.5) * TS) - 50) * S, (((ty + 0.5) * TS) - 50) * S]; // tile centre → world
  // A WIDE band (tile rows 21..27, cols 5..44) walkable, with ONE building tile poking into the
  // middle at (col 25, row 26). A wide body drives the row-24 centreline; the old centre+edges check
  // sampled rows 21/24/27 and sailed over the row-26 bump.
  function wideBandWithBump() {
    const gridSize = 50, tileSize = 2;
    const tiles = [];
    for (let y = 0; y < gridSize; y++) { const row = []; for (let x = 0; x < gridSize; x++) row.push({ type: 'building', walkable: false, visual: 'building' }); tiles.push(row); }
    for (let ty = 21; ty <= 27; ty++) for (let tx = 5; tx <= 44; tx++) tiles[ty][tx] = { type: 'street', walkable: true, visual: 'street' };
    tiles[26][25] = { type: 'building', walkable: false, visual: 'building' };
    return { gridSize, tileSize, tiles };
  }
  const sim = createSurfaceSim({ tileMap: wideBandWithBump() }, { scale: S });
  const run = { a: w(6, 24), b: w(44, 24), len: 38 };
  const halfW = 9.6, halfL = 2; // body spans ~3 tiles either side of the lane

  test('the old centreline+edges check would have missed the bump (the bug)', () => {
    // Sampling only the lane point and the ±halfW edges along the whole run never sees the bump...
    const [ax, az] = run.a, [bx, bz] = run.b; const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
    const ux = dx / L, uz = dz / L, px = -uz, pz = ux;
    let threePointClear = true;
    for (let t = 0; t <= 1; t += 0.01) {
      const x = ax + dx * t, z = az + dz * t;
      if (!(sim.isWalkableWorld(x, z) && sim.isWalkableWorld(x + px * halfW, z + pz * halfW) && sim.isWalkableWorld(x - px * halfW, z - pz * halfW))) threePointClear = false;
    }
    expect(threePointClear).toBe(true);
    // ...but the bump really is inside the body's width.
    expect(sim.isWalkableWorld(...w(25, 26))).toBe(false);
  });

  test('the returned lane never puts the body over the mid-width obstacle', () => {
    const r = clearestSubRun(run, sim.isWalkableWorld, 4, halfW, halfL);
    expect(r).not.toBeNull();
    const dx = r.b[0] - r.a[0], dz = r.b[1] - r.a[1], L = Math.hypot(dx, dz) || 1;
    const ux = dx / L, uz = dz / L, px = -uz, pz = ux;
    for (let t = 0; t <= 1; t += 0.02) {
      const cx = r.a[0] + dx * t, cz = r.a[1] + dz * t;
      for (let li = -2; li <= 2; li++) for (let wi = -2; wi <= 2; wi++) {
        const fx = cx + ux * (li / 2) * halfL + px * (wi / 2) * halfW;
        const fz = cz + uz * (li / 2) * halfL + pz * (wi / 2) * halfW;
        expect(sim.isWalkableWorld(fx, fz)).toBe(true);
      }
    }
  });
});
