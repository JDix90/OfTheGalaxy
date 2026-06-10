/**
 * Dungeon connectivity (no DB).
 * Validates that generated dungeons are fully connected and that the
 * repair routine fixes deliberately disconnected layouts.
 */

const {
  generateDungeonMap,
  validateDungeon,
  repairConnectivity,
  computeReachable,
  isFloor
} = require('../../../src/utils/dungeonGenerator');
const { cellKey } = require('../../../src/utils/mazeAlgorithms');

function reachableSet(map) {
  return computeReachable(map.grid, map.width, map.height, map.entrance);
}

function allRoomsReachable(map, reachable) {
  return map.rooms.every((r) => {
    for (let y = r.y; y < r.y + r.height; y++) {
      for (let x = r.x; x < r.x + r.width; x++) {
        if (reachable.has(cellKey(x, y))) return true;
      }
    }
    return false;
  });
}

describe('dungeon connectivity', () => {
  const types = ['danger', 'mine', 'underworld', 'cave', 'ruins', 'fortress'];

  test.each(types)('generated %s dungeons are fully connected across seeds', (type) => {
    for (let seed = 1; seed <= 25; seed++) {
      const map = generateDungeonMap(type, seed);
      const reachable = reachableSet(map);
      expect(allRoomsReachable(map, reachable)).toBe(true);
      expect(reachable.has(cellKey(map.bossRoom.x, map.bossRoom.y))).toBe(true);
    }
  });

  test('validateDungeon detects an unreachable room', () => {
    const W = 7, H = 7;
    const grid = Array.from({ length: H }, () => Array(W).fill(0));
    grid[0][0] = 3; // entrance
    for (let y = 1; y < H; y++) grid[y][0] = 1; // left corridor
    const room = { id: 'R1', x: 5, y: 1, width: 2, height: 2 };
    for (let y = 1; y < 3; y++) for (let x = 5; x < 7; x++) grid[y][x] = 2; // isolated room
    const entrance = { x: 0, y: 0 };

    expect(validateDungeon(grid, W, H, entrance, [room])).toBe(false);
  });

  test('repairConnectivity carves a path to an unreachable room', () => {
    const W = 7, H = 7;
    const grid = Array.from({ length: H }, () => Array(W).fill(0));
    grid[0][0] = 3;
    for (let y = 1; y < H; y++) grid[y][0] = 1;
    const room = { id: 'R1', x: 5, y: 1, width: 2, height: 2 };
    for (let y = 1; y < 3; y++) for (let x = 5; x < 7; x++) grid[y][x] = 2;
    const entrance = { x: 0, y: 0 };

    const repairs = repairConnectivity(grid, W, H, entrance, [room], null);
    expect(repairs).toBeGreaterThanOrEqual(1);
    expect(validateDungeon(grid, W, H, entrance, [room])).toBe(true);
  });

  test('isFloor treats corridor/room/entrance/boss as floor and walls as not', () => {
    expect([1, 2, 3, 4].every(isFloor)).toBe(true);
    expect(isFloor(0)).toBe(false);
  });
});
