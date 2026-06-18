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
