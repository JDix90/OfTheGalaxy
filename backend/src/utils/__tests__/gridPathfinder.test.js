/**
 * Tests for the grid pathfinder used by enemy maze navigation.
 */

const { findPath } = require('../gridPathfinder');

// Build an isWalkable() from an ASCII map: '#' = wall, anything else walkable. Row 0 is y=0.
function gridFrom(rows) {
  const W = rows.length;
  return {
    W,
    isWalkable: (x, y) => x >= 0 && y >= 0 && x < W && y < rows.length && rows[y][x] !== '#',
  };
}

// Each step is 4-directional and adjacent; the final tile is the goal (or its neighbour).
function assertContiguous(path, start) {
  let prev = start;
  for (const p of path) {
    expect(Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y)).toBe(1);
    prev = p;
  }
}

describe('findPath', () => {
  it('returns [] when already at the goal', () => {
    const { isWalkable } = gridFrom(['....', '....', '....', '....']);
    expect(findPath(isWalkable, 4, { x: 1, y: 1 }, { x: 1, y: 1 })).toEqual([]);
  });

  it('finds a straight path across open ground', () => {
    const g = gridFrom(['.....', '.....', '.....', '.....', '.....']);
    const path = findPath(g.isWalkable, g.W, { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(path).not.toBeNull();
    expect(path[path.length - 1]).toEqual({ x: 4, y: 0 });
    assertContiguous(path, { x: 0, y: 0 });
    expect(path).toHaveLength(4);
  });

  it('routes around a wall instead of through it', () => {
    // A vertical wall with a gap at the bottom forces a detour.
    const g = gridFrom([
      '..#..',
      '..#..',
      '..#..',
      '..#..',
      '.....',
    ]);
    const start = { x: 0, y: 0 }, goal = { x: 4, y: 0 };
    const path = findPath(g.isWalkable, g.W, start, goal);
    expect(path).not.toBeNull();
    expect(path[path.length - 1]).toEqual(goal);
    assertContiguous(path, start);
    // every step is walkable (never enters the wall column except at the gap row)
    for (const p of path) expect(g.isWalkable(p.x, p.y)).toBe(true);
    // detour is longer than the 8-step manhattan distance
    expect(path.length).toBeGreaterThan(8);
  });

  it('returns null when the goal is walled off', () => {
    const g = gridFrom([
      '....#',
      '###.#',
      '...##', // (4,2) region sealed
      '###.#',
      '....#',
    ].map((r) => r)); // (kept simple: column 4 fully walled)
    const sealed = gridFrom([
      '.....',
      '.###.',
      '.#X#.', // X at (2,2) ringed by walls
      '.###.',
      '.....',
    ].map((r) => r.replace('X', '.')));
    expect(findPath(sealed.isWalkable, sealed.W, { x: 0, y: 0 }, { x: 2, y: 2 })).toBeNull();
  });

  it('routes to the nearest walkable neighbour when the goal tile is a wall', () => {
    const g = gridFrom(['....', '....', '....', '....']);
    // make the goal a wall by wrapping isWalkable
    const goal = { x: 3, y: 0 };
    const isWalkable = (x, y) => (x === goal.x && y === goal.y ? false : g.isWalkable(x, y));
    const path = findPath(isWalkable, g.W, { x: 0, y: 0 }, goal);
    expect(path).not.toBeNull();
    const last = path[path.length - 1];
    expect(Math.abs(last.x - goal.x) + Math.abs(last.y - goal.y)).toBe(1); // adjacent to goal
  });
});
