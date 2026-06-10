/**
 * Characterization tests for dungeon pathfinding (pure module).
 * Locks the behavior of the A* navigation that SubMapView depends on, so a future
 * decomposition of that component can be verified against a known-good contract.
 */

import { describe, test, expect } from 'vitest';
import {
  isNavigable,
  getNeighbors,
  percentToGrid,
  gridToPercent,
  findDungeonPath,
  findNearestNavigable
} from '../../../src/utils/dungeonPathfinding';

// 5x5 grid: 0 = wall, 1 = floor. A clear horizontal+vertical corridor.
const grid = [
  [1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 1, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 1, 1, 1, 1]
];

describe('isNavigable', () => {
  test('floor cells are navigable, walls are not', () => {
    expect(isNavigable(grid, 0, 0)).toBe(true);
    expect(isNavigable(grid, 1, 1)).toBe(false);
  });
  test('out-of-bounds and bad grids are not navigable', () => {
    expect(isNavigable(grid, -1, 0)).toBe(false);
    expect(isNavigable(grid, 0, 99)).toBe(false);
    expect(isNavigable(null, 0, 0)).toBe(false);
    expect(isNavigable([], 0, 0)).toBe(false);
  });
});

describe('getNeighbors', () => {
  test('returns only navigable 4-directional neighbors', () => {
    const n = getNeighbors(grid, 0, 0); // corner: right(1,0)=floor, down(0,1)=floor
    expect(n).toEqual(expect.arrayContaining([{ x: 1, y: 0 }, { x: 0, y: 1 }]));
    expect(n).toHaveLength(2);
  });
  test('excludes walls', () => {
    const n = getNeighbors(grid, 2, 0); // (1,0)&(3,0) floor; (2,1) wall
    expect(n).not.toContainEqual({ x: 2, y: 1 });
  });
});

describe('coordinate conversion', () => {
  test('percentToGrid clamps within grid bounds', () => {
    expect(percentToGrid(0, 0, 5, 5)).toEqual({ x: 0, y: 0 });
    expect(percentToGrid(100, 100, 5, 5)).toEqual({ x: 4, y: 4 }); // clamped to width-1
    expect(percentToGrid(50, 50, 10, 10)).toEqual({ x: 5, y: 5 });
  });
  test('gridToPercent returns cell centers within 0-100', () => {
    const p = gridToPercent(0, 0, 5, 5);
    expect(p.x).toBeCloseTo(10); // (0+0.5)/5*100
    expect(p.y).toBeCloseTo(10);
    const p2 = gridToPercent(4, 4, 5, 5);
    expect(p2.x).toBeLessThanOrEqual(100);
  });
});

describe('findDungeonPath (A*)', () => {
  test('returns single-element path when start equals end', () => {
    expect(findDungeonPath(grid, { x: 0, y: 0 }, { x: 0, y: 0 })).toEqual([{ x: 0, y: 0 }]);
  });

  test('returns direct path for adjacent cells', () => {
    expect(findDungeonPath(grid, { x: 0, y: 0 }, { x: 1, y: 0 })).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }]);
  });

  test('finds a valid connected path around walls', () => {
    const path = findDungeonPath(grid, { x: 0, y: 0 }, { x: 4, y: 4 });
    expect(Array.isArray(path)).toBe(true);
    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path[path.length - 1]).toEqual({ x: 4, y: 4 });
    // Every step is navigable and adjacent to the previous (no diagonal jumps, no walls).
    for (let i = 1; i < path.length; i++) {
      expect(isNavigable(grid, path[i].x, path[i].y)).toBe(true);
      const d = Math.abs(path[i].x - path[i - 1].x) + Math.abs(path[i].y - path[i - 1].y);
      expect(d).toBe(1);
    }
  });

  test('returns null when start is a wall, but finds a path to a connected floor cell', () => {
    expect(findDungeonPath(grid, { x: 1, y: 1 }, { x: 4, y: 4 })).toBeNull(); // start is a wall
    expect(findDungeonPath(grid, { x: 0, y: 0 }, { x: 0, y: 2 })).not.toBeNull(); // (0,2) connected on left edge
  });

  test('returns null for a floor cell that is walled off (isolated island)', () => {
    // (2,2) is floor but every orthogonal neighbour is a wall.
    expect(findDungeonPath(grid, { x: 0, y: 0 }, { x: 2, y: 2 })).toBeNull();
  });

  test('returns null for out-of-bounds endpoints', () => {
    expect(findDungeonPath(grid, { x: 0, y: 0 }, { x: 9, y: 9 })).toBeNull();
  });

  test('returns null when the target is walled off entirely', () => {
    const sealed = [
      [1, 1, 1],
      [1, 0, 0],
      [1, 0, 1] // (2,2) island surrounded by walls
    ];
    expect(findDungeonPath(sealed, { x: 0, y: 0 }, { x: 2, y: 2 })).toBeNull();
  });
});

describe('findNearestNavigable', () => {
  test('returns the same cell if already navigable', () => {
    expect(findNearestNavigable(grid, 0, 0)).toEqual({ x: 0, y: 0 });
  });
  test('finds a nearby floor cell when starting on a wall', () => {
    const near = findNearestNavigable(grid, 1, 1);
    expect(near).not.toBeNull();
    expect(isNavigable(grid, near.x, near.y)).toBe(true);
  });
});
