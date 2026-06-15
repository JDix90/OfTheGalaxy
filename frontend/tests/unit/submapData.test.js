import { describe, it, expect } from 'vitest';
import {
  createSubmapSim, toPct, buildSubmapExits, buildSubmapNpcs, buildSubmapWaypoints,
} from '../../src/components/submap3d/submapData';

// Mirrors the real Drydock "Coronet Spaceport" submap: 12x12, fully walkable, exit at
// grid (1,6), no buildings.
function spaceport(extra = {}) {
  return {
    id: 'drydock_coronet_spaceport_spaceport', type: 'spaceport', planetId: 'drydock',
    layoutData: {
      width: 12, height: 12, gridSize: 40,
      exitPoints: [{ id: 'main_exit', label: 'Exit to Surface', position: { x: 1, y: 6 } }],
      entryPoints: [{ id: 'main_entrance', position: { x: 1, y: 6 } }],
      buildings: [], pointsOfInterest: [],
      collisionMap: { resolution: 100, cells: Array.from({ length: 100 }, () => Array(100).fill(0)) },
      ...extra,
    },
  };
}

describe('submapData — sim from collisionMap', () => {
  it('collisionMap spaceport: ~85u interior, center walkable, oob blocked', () => {
    const sim = createSubmapSim(spaceport());
    expect(sim.worldHalf).toBeCloseTo(42.5, 5); // 50 * collision scale (0.85)
    expect(sim.isWalkableSurface(50, 50)).toBe(true);
    expect(sim.isWalkableSurface(-1, 50)).toBe(false);
  });

  it('dungeon grid: walls block, rooms/corridors pass (square-padded)', () => {
    const dungeon = {
      id: 'd1', type: 'dungeon',
      layoutData: { size: { width: 4, height: 4 }, grid: [
        [0, 0, 0, 0],
        [0, 2, 1, 0],
        [0, 1, 3, 0],
        [0, 0, 0, 0],
      ] },
    };
    const sim = createSubmapSim(dungeon);
    expect(sim.worldHalf).toBeCloseTo(60, 5); // 50 * dungeon scale (1.2)
    // grid cell (1,1)=room → walkable; (0,0)=wall → blocked. tileSize=100/4=25.
    expect(sim.isWalkableSurface(25 * 1.5, 25 * 1.5)).toBe(true); // center of cell (1,1)
    expect(sim.isWalkableSurface(25 * 0.5, 25 * 0.5)).toBe(false); // center of cell (0,0) wall
  });

  it('wall cells block, floor cells pass', () => {
    const sm = spaceport();
    sm.layoutData.collisionMap.cells[50][50] = 1; // wall
    const sim = createSubmapSim(sm);
    expect(sim.isWalkableSurface(50.5, 50.5)).toBe(false);
    expect(sim.isWalkableSurface(20.5, 20.5)).toBe(true);
  });
});

describe('submapData — coordinate conversion + builders', () => {
  it('toPct maps grid cell → cell-center percent', () => {
    const p = toPct(1, 6, 12, 12);
    expect(p.x).toBeCloseTo(12.5, 1);
    expect(p.y).toBeCloseTo(54.17, 1);
  });

  it('exits placed at the converted world position', () => {
    const sm = spaceport();
    const sim = createSubmapSim(sm);
    const exits = buildSubmapExits(sm, sim);
    expect(exits).toHaveLength(1);
    expect(exits[0].label).toBe('Exit to Surface');
    const w = sim.surfaceToWorld(toPct(1, 6, 12, 12).x, toPct(1, 6, 12, 12).y);
    expect(exits[0].wx).toBeCloseTo(w.x, 5);
    expect(exits[0].wz).toBeCloseTo(w.z, 5);
  });

  it('NPC coords: grid converts to cell-center, percent kept as-is', () => {
    const sm = spaceport();
    const sim = createSubmapSim(sm);
    const npcs = buildSubmapNpcs([
      { id: 'npc_tutorial_dockmaster_jax', name: 'Dockmaster Jax', npcType: 'quest_giver', location: { x: 6, y: 6 } }, // grid
      { id: 'vend1', name: 'Vendor', npcType: 'vendor', location: { x: 75, y: 30 } }, // percent (> dim)
    ], sm, sim);
    expect(npcs).toHaveLength(2);
    const jax = npcs.find((n) => n.id.includes('jax'));
    expect(jax.sx).toBeCloseTo(54.17, 1); // grid 6 on 12 → cell center
    const vend = npcs.find((n) => n.id === 'vend1');
    expect(vend.sx).toBeCloseTo(75, 1);
    expect(vend.sy).toBeCloseTo(30, 1);
  });

  it('waypoints: built for incomplete in-submap objectives, skipped when complete', () => {
    const sm = spaceport();
    const sim = createSubmapSim(sm);
    const q = (done) => ([{ quest: { id: 'q1', title: 'T', objectives: [{ id: 'o1', description: 'Go', location: { subMapId: sm.id, x: 8, y: 8 } }] }, progress: { objectivesCompleted: done ? { o1: true } : {} } }]);
    expect(buildSubmapWaypoints(q(false), sm, sim)).toHaveLength(1);
    expect(buildSubmapWaypoints(q(true), sm, sim)).toHaveLength(0);
  });
});
