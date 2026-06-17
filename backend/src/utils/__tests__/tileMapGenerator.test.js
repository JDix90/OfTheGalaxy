/**
 * Tests for the tile-map generator — planet-type dispatch, the maze-like urban "medina"
 * generator (connectivity, height/style tagging, determinism), and the walkability helpers.
 */

const {
  generateTileMapByPlanetType,
  generateUrbanTileMap,
  TILEMAP_VERSION,
  isWalkable,
  getTileType,
} = require('../tileMapGenerator');

const PLANET_TYPES = ['urban', 'desert', 'forest', 'ocean', 'ice', 'volcanic', 'barren'];

const sampleMap = () => ({
  pointsOfInterest: [
    { x: 20, y: 20, name: 'A', type: 'shop' },
    { x: 80, y: 30, name: 'B', type: 'shop' },
    { x: 50, y: 75, name: 'C', type: 'palace' },
    { x: 12, y: 88, name: 'D', type: 'spaceport' },
  ],
  spaceport: { x: 50, y: 50 },
});

// Flood the walkable network from the spawn tile and report which (tileX,tileY) are reachable.
function reachableSet(tileMap, startTileX, startTileY) {
  const { gridSize, tiles } = tileMap;
  const seen = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
  const inB = (x, y) => x >= 0 && y >= 0 && x < gridSize && y < gridSize;
  if (!inB(startTileX, startTileY) || !tiles[startTileY][startTileX].walkable) return seen;
  const q = [[startTileX, startTileY]];
  seen[startTileY][startTileX] = true;
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (inB(nx, ny) && !seen[ny][nx] && tiles[ny][nx].walkable) { seen[ny][nx] = true; q.push([nx, ny]); }
    }
  }
  return seen;
}

// Is some walkable tile within `radius` of (tx,ty) reachable? (POI centres sit in a small pocket.)
function reachableNear(seen, tileMap, tx, ty, radius = 2) {
  const { gridSize } = tileMap;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = tx + dx, y = ty + dy;
      if (x >= 0 && y >= 0 && x < gridSize && y < gridSize && seen[y][x]) return true;
    }
  }
  return false;
}

describe('generateTileMapByPlanetType', () => {
  it.each(PLANET_TYPES)('produces a full, version-stamped grid for %s planets', (planetType) => {
    const tm = generateTileMapByPlanetType({ planetType }, sampleMap());
    expect(tm.version).toBe(TILEMAP_VERSION);
    expect(tm.gridSize).toBeGreaterThan(0);
    expect(tm.tiles).toHaveLength(tm.gridSize);
    expect(tm.tiles[0]).toHaveLength(tm.gridSize);
    // every cell is a well-formed tile
    for (const row of tm.tiles) for (const t of row) {
      expect(typeof t.type).toBe('string');
      expect(typeof t.walkable).toBe('boolean');
    }
  });

  it('routes forest planets to the forest generator (trees), not the urban fallback', () => {
    const tm = generateTileMapByPlanetType({ planetType: 'forest' }, sampleMap());
    const types = new Set();
    for (const row of tm.tiles) for (const t of row) types.add(t.type);
    expect(types.has('tree')).toBe(true);
    expect(types.has('building')).toBe(false); // urban fallback would have produced buildings
  });
});

describe('urban medina generator', () => {
  it('carves a connected maze with both buildings and walkable alleys', () => {
    const tm = generateUrbanTileMap(sampleMap());
    let walk = 0, build = 0;
    for (const row of tm.tiles) for (const t of row) { if (t.walkable) walk++; if (t.type === 'building') build++; }
    const total = tm.gridSize * tm.gridSize;
    // Dense, but not a solid block and not wide open — a real maze.
    expect(walk).toBeGreaterThan(total * 0.25);
    expect(walk).toBeLessThan(total * 0.7);
    expect(build).toBeGreaterThan(total * 0.25);
  });

  it('keeps every POI and the spaceport reachable from the spawn', () => {
    const md = sampleMap();
    const tm = generateUrbanTileMap(md);
    const ts = tm.tileSize;
    const center = Math.floor(tm.gridSize / 2);
    const seen = reachableSet(tm, center, center);
    for (const poi of md.pointsOfInterest) {
      expect(reachableNear(seen, tm, Math.floor(poi.x / ts), Math.floor(poi.y / ts))).toBe(true);
    }
    expect(reachableNear(seen, tm, Math.floor(md.spaceport.x / ts), Math.floor(md.spaceport.y / ts))).toBe(true);
  });

  it('tags building tiles with a render height (1-4 storeys) and a style', () => {
    const tm = generateUrbanTileMap(sampleMap());
    const heights = new Set();
    for (const row of tm.tiles) for (const t of row) {
      if (t.type === 'building') {
        expect(t.height).toBeGreaterThanOrEqual(1);
        expect(t.height).toBeLessThanOrEqual(4);
        expect(t.style).toBeGreaterThanOrEqual(0);
        heights.add(t.height);
      }
    }
    expect(heights.size).toBeGreaterThan(1); // varied rooftops, not one uniform height
  });

  it('is deterministic for the same map (client & server sims must agree)', () => {
    const a = generateUrbanTileMap(sampleMap());
    const b = generateUrbanTileMap(sampleMap());
    for (let y = 0; y < a.gridSize; y++) {
      for (let x = 0; x < a.gridSize; x++) {
        expect(b.tiles[y][x].type).toBe(a.tiles[y][x].type);
        expect(b.tiles[y][x].height).toBe(a.tiles[y][x].height);
      }
    }
  });
});

describe('walkability helpers', () => {
  it('isWalkable / getTileType respect tile flags and bounds', () => {
    const tm = generateUrbanTileMap(sampleMap());
    expect(isWalkable(tm, -1, -1)).toBe(false);          // out of bounds
    expect(isWalkable(tm, 1e6, 1e6)).toBe(false);
    // an interior building tile reports its type and is not walkable
    let found = null;
    for (let y = 0; y < tm.gridSize && !found; y++) {
      for (let x = 0; x < tm.gridSize; x++) {
        if (tm.tiles[y][x].type === 'building') { found = { x: x * tm.tileSize, y: y * tm.tileSize }; break; }
      }
    }
    expect(found).not.toBeNull();
    expect(getTileType(tm, found.x, found.y)).toBe('building');
    expect(isWalkable(tm, found.x, found.y)).toBe(false);
  });
});
