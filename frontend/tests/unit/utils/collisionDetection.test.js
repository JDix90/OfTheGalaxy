/**
 * Characterization tests for surface collision detection (pure module).
 * Locks the movement/door rules that PlanetSurface and SubMapView depend on.
 */

import { describe, test, expect } from 'vitest';
import {
  COLLISION_TYPES,
  canMoveTo,
  isWalkable,
  getDoorAt,
  findNearestWalkable
} from '../../../src/utils/collisionDetection';

// 4x4 collision grid (resolution 4). Row-major cells[y][x].
function mapWith(cells, doors = []) {
  return { resolution: cells.length, cells, doors };
}

const W = COLLISION_TYPES.WALKABLE; // 0
const X = COLLISION_TYPES.WALL;     // 1
const cells = [
  [W, W, X, W],
  [W, X, X, W],
  [W, W, W, W],
  [X, X, W, W]
];
const map = mapWith(cells);

// Convert a cell index to a percentage that lands inside that cell (resolution 4 -> 25% per cell).
const pct = (cell) => cell * 25 + 12; // ~center of the cell

describe('canMoveTo', () => {
  test('allows movement when there is no collision map (backward compatible)', () => {
    expect(canMoveTo(null, 0, 0, 50, 50)).toEqual({ allowed: true, reason: 'no_collision_map' });
  });

  test('allows movement onto walkable cells', () => {
    const r = canMoveTo(map, pct(0), pct(0), pct(0), pct(2)); // target cell (0,2) walkable
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe('walkable');
  });

  test('blocks movement into walls', () => {
    const r = canMoveTo(map, pct(0), pct(0), pct(2), pct(0)); // target cell (2,0) wall
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('wall');
  });

  test('blocks out-of-bounds targets', () => {
    const r = canMoveTo(map, pct(0), pct(0), 200, 200);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('out_of_bounds');
  });
});

describe('door handling', () => {
  test('an unlocked door over a wall cell is passable', () => {
    // getDoorAt matches by cellX/cellY; the wall cell here is (2,0).
    const doorMap = mapWith(cells, [{ id: 'd1', cellX: 2, cellY: 0, locked: false }]);
    const r = canMoveTo(doorMap, pct(3), pct(0), pct(2), pct(0)); // wall cell but door present
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe('door');
  });

  test('a locked door over a wall cell is blocked', () => {
    const doorMap = mapWith(cells, [{ id: 'd1', cellX: 2, cellY: 0, locked: true }]);
    const r = canMoveTo(doorMap, pct(3), pct(0), pct(2), pct(0));
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('locked_door');
  });

  test('getDoorAt returns null when there are no doors', () => {
    expect(getDoorAt(map, pct(0), pct(0))).toBeNull();
  });
});

describe('isWalkable / findNearestWalkable', () => {
  test('isWalkable mirrors canMoveTo for the same point', () => {
    expect(isWalkable(map, pct(0), pct(2)).allowed).toBe(true);
    expect(isWalkable(map, pct(2), pct(0)).allowed).toBe(false);
  });

  test('findNearestWalkable returns a walkable point near a wall', () => {
    // Radius must exceed the cell size (25%) to escape the wall cell into a neighbour.
    const near = findNearestWalkable(map, pct(2), pct(0), 30);
    expect(near).toBeTruthy();
    if (near) {
      expect(isWalkable(map, near.x, near.y).allowed).toBe(true);
    }
  });
});
