import { describe, test, expect } from 'vitest';
import { createSurfaceSim, DEFAULTS } from '../../../shared/sim/surface.mjs';

// A POI of category 'market' (footprint radius ~3.6 world units) at surface (50,50),
// which maps to world origin. No tileMap → isolates the POI-footprint collision.
const mapData = { pointsOfInterest: [{ id: 'mk', type: 'market', x: 50, y: 50 }] };
const R = 3.6; // ~poiFootprintRadius('market')

describe('surface sim — POI footprint collision', () => {
  test('the POI footprint is non-walkable; just outside it is walkable', () => {
    const sim = createSurfaceSim(mapData, { scale: DEFAULTS.scale });
    expect(sim.isWalkableWorld(0, 0)).toBe(false);   // dead centre of the building
    expect(sim.isWalkableWorld(2, 0)).toBe(false);   // still inside the footprint
    expect(sim.isWalkableWorld(8, 0)).toBe(true);    // clear of it
  });

  test('a walker cannot push through the footprint (stops at the wall)', () => {
    const sim = createSurfaceSim(mapData, { scale: DEFAULTS.scale });
    let st = { x: 6, z: 0, facing: 0, level: 0 };
    for (let i = 0; i < 300; i++) st = sim.integrate(st, { f: 1, yaw: Math.PI / 2 }, 0.05); // drive toward -x (the POI)
    const dist = Math.hypot(st.x, st.z);
    expect(dist).toBeGreaterThan(R - 0.6); // never penetrated to the interior
    expect(st.x).toBeGreaterThan(0);        // stopped on the approach side, didn't tunnel through
  });

  test('a body that starts inside can still escape (no trap)', () => {
    const sim = createSurfaceSim(mapData, { scale: DEFAULTS.scale });
    let st = { x: 0, z: 0, facing: 0, level: 0 }; // spawned dead-centre (worst case)
    for (let i = 0; i < 200; i++) st = sim.integrate(st, { f: 1, yaw: Math.PI / 2 }, 0.05);
    expect(Math.hypot(st.x, st.z)).toBeGreaterThan(R); // walked all the way out
  });

  test('no POIs → walkability is unchanged (open ground stays open)', () => {
    const sim = createSurfaceSim({}, { scale: DEFAULTS.scale });
    expect(sim.isWalkableWorld(0, 0)).toBe(true);
  });
});

describe('surface sim — obstacleHeightWorld (camera-collision data)', () => {
  test('reports a POI building height inside its footprint, 0 outside', () => {
    const sim = createSurfaceSim(mapData, { scale: DEFAULTS.scale });
    expect(sim.obstacleHeightWorld(0, 0)).toBeGreaterThan(0); // inside the market footprint
    expect(sim.obstacleHeightWorld(20, 0)).toBe(0);           // open ground
  });

  test('reports a building tile height (storeys * STORY) and 0 on open tiles', () => {
    const gridSize = 50, tileSize = 2;
    const tiles = [];
    for (let y = 0; y < gridSize; y++) {
      const row = [];
      for (let x = 0; x < gridSize; x++) row.push({ type: 'open', walkable: true, visual: 'open' });
      tiles.push(row);
    }
    tiles[25][25] = { type: 'building', walkable: false, visual: 'building', height: 3 };
    const sim = createSurfaceSim({ tileMap: { gridSize, tileSize, tiles } }, { scale: DEFAULTS.scale });
    expect(sim.obstacleHeightWorld(1.6, 1.6)).toBeCloseTo(3 * 2.4, 1); // tile (25,25) → 3 storeys * STORY(2.4)
    expect(sim.obstacleHeightWorld(-16, -16)).toBe(0);                 // an open tile
  });
});
