/**
 * Tile Map Generator
 * Creates tile-based maps for planets (like Pokemon/Zelda style)
 * Each tile is either walkable or an obstacle
 */

// ---- deterministic helpers for the medina (urban) generator ----
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash2(x, y, seed) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2246822519)) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return h >>> 0;
}
// Carve a straight (L-shaped) walkable corridor between two tiles — used to rescue marooned pockets.
function carveLine(tiles, gridSize, x0, y0, x1, y1) {
  const set = (x, y) => { if (x >= 0 && y >= 0 && x < gridSize && y < gridSize && !tiles[y][x].walkable) tiles[y][x] = { type: 'street', walkable: true, visual: 'street' }; };
  let x = x0, y = y0;
  while (x !== x1) { set(x, y); x += x1 > x ? 1 : -1; }
  while (y !== y1) { set(x, y); y += y1 > y ? 1 : -1; }
  set(x1, y1);
}
// Flood the walkable network from a central seed; carve straight stubs so every `mustReach`
// tile is connected. Guarantees POI pockets aren't sealed off inside the building mass.
function connectWalkable(tiles, gridSize, mustReach) {
  const inB = (x, y) => x >= 0 && y >= 0 && x < gridSize && y < gridSize;
  const nearestWalkable = (cx, cy) => {
    for (let r = 0; r < gridSize; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx, y = cy + dy; if (inB(x, y) && tiles[y][x].walkable) return { x, y };
    }
    return null;
  };
  const flood = (seed) => {
    const seen = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
    if (!seed) return seen;
    const q = [seed]; seen[seed.y][seed.x] = true;
    while (q.length) {
      const { x, y } = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (inB(nx, ny) && !seen[ny][nx] && tiles[ny][nx].walkable) { seen[ny][nx] = true; q.push({ x: nx, y: ny }); }
      }
    }
    return seen;
  };
  const seedTile = nearestWalkable(gridSize >> 1, gridSize >> 1);
  let seen = flood(seedTile);
  const nearestSeen = (cx, cy) => {
    for (let r = 1; r < gridSize; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx, y = cy + dy; if (inB(x, y) && seen[y][x]) return { x, y };
    }
    return seedTile;
  };
  for (const m of mustReach) {
    if (!inB(m.x, m.y) || (seen[m.y] && seen[m.y][m.x])) continue;
    const tgt = nearestSeen(m.x, m.y);
    if (tgt) { carveLine(tiles, gridSize, m.x, m.y, tgt.x, tgt.y); seen = flood(seedTile); }
  }
}

/**
 * Generate a tile map for an urban planet — a dense, maze-like medina.
 * The whole map starts as buildings; a braided maze of narrow alleys is carved through it,
 * with souk plazas, market stalls, and a walkable pocket around every POI. Building tiles carry
 * a `height` (storeys) + `style` so the 3D surface can draw varied, crowded rooftops.
 * @param {Object} mapData - Planet map data with POIs and districts
 * @param {number} tileSize - Size of each tile as percentage (default 2% = 50x50 grid)
 * @returns {Object} Tile map with walkable/obstacle information
 */
function generateUrbanTileMap(mapData, tileSize = 2) {
  const gridSize = Math.floor(100 / tileSize); // 50x50 grid for 2% tiles
  const tiles = [];
  const tileMap = { gridSize, tileSize, tiles, style: 'medina' };

  const pois = mapData.pointsOfInterest || [];
  // Deterministic per-planet RNG so a planet always regenerates the same medina.
  let seed = Math.abs((mapData.seed | 0) ||
    pois.reduce((s, p) => s + Math.floor((p.x || 0) * 31 + (p.y || 0) * 17), gridSize * 101)) || 12345;
  const rng = mulberry32(seed);

  // 1) Solid block of buildings to start.
  for (let y = 0; y < gridSize; y++) {
    tiles[y] = [];
    for (let x = 0; x < gridSize; x++) tiles[y][x] = { type: 'building', walkable: false, visual: 'building' };
  }
  const inB = (x, y) => x >= 0 && y >= 0 && x < gridSize && y < gridSize;
  const carve = (x, y, type = 'street') => { if (inB(x, y)) tiles[y][x] = { type, walkable: true, visual: type }; };

  // 2) Braided maze of alleys on a cell lattice (recursive backtracker + a few extra loops).
  const STREET = 2, WALL = 2, PITCH = STREET + WALL, margin = 1;
  const cellsX = Math.floor((gridSize - margin * 2 - STREET) / PITCH) + 1;
  const cellsY = Math.floor((gridSize - margin * 2 - STREET) / PITCH) + 1;
  const originOf = (i, j) => ({ ox: margin + i * PITCH, oy: margin + j * PITCH });
  const carveCell = (i, j) => { const { ox, oy } = originOf(i, j); for (let dy = 0; dy < STREET; dy++) for (let dx = 0; dx < STREET; dx++) carve(ox + dx, oy + dy); };
  const carvePassage = (i, j, ni, nj) => {
    const { ox, oy } = originOf(i, j);
    if (ni > i) for (let dy = 0; dy < STREET; dy++) for (let g = 0; g < WALL; g++) carve(ox + STREET + g, oy + dy);
    else if (ni < i) for (let dy = 0; dy < STREET; dy++) for (let g = 1; g <= WALL; g++) carve(ox - g, oy + dy);
    else if (nj > j) for (let dx = 0; dx < STREET; dx++) for (let g = 0; g < WALL; g++) carve(ox + dx, oy + STREET + g);
    else for (let dx = 0; dx < STREET; dx++) for (let g = 1; g <= WALL; g++) carve(ox + dx, oy - g);
  };
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const visited = Array.from({ length: cellsY }, () => Array(cellsX).fill(false));
  const stack = [[0, 0]]; visited[0][0] = true; carveCell(0, 0);
  while (stack.length) {
    const [ci, cj] = stack[stack.length - 1];
    const open = DIRS.map(([dx, dy]) => [ci + dx, cj + dy]).filter(([ni, nj]) => ni >= 0 && nj >= 0 && ni < cellsX && nj < cellsY && !visited[nj][ni]);
    if (open.length) { const [ni, nj] = open[(rng() * open.length) | 0]; visited[nj][ni] = true; carveCell(ni, nj); carvePassage(ci, cj, ni, nj); stack.push([ni, nj]); }
    else stack.pop();
  }
  // Braid: extra passages create loops/through-routes (less labyrinth, more bustling medina).
  for (let cj = 0; cj < cellsY; cj++) for (let ci = 0; ci < cellsX; ci++) {
    if (rng() < 0.14) {
      const opts = DIRS.map(([dx, dy]) => [ci + dx, cj + dy]).filter(([ni, nj]) => ni >= 0 && nj >= 0 && ni < cellsX && nj < cellsY);
      if (opts.length) { const [ni, nj] = opts[(rng() * opts.length) | 0]; carvePassage(ci, cj, ni, nj); }
    }
  }

  // 3) Souk plazas: open a few cells into wider market squares.
  const plazas = [];
  const plazaCount = 2 + ((rng() * 3) | 0);
  for (let p = 0; p < plazaCount; p++) {
    const ci = (rng() * cellsX) | 0, cj = (rng() * cellsY) | 0;
    const { ox, oy } = originOf(ci, cj);
    for (let dy = -1; dy <= STREET; dy++) for (let dx = -1; dx <= STREET; dx++) {
      const x = ox + dx, y = oy + dy;
      if (x >= margin && y >= margin && x < gridSize - margin && y < gridSize - margin) carve(x, y, 'plaza');
    }
    plazas.push({ x: ox + (STREET >> 1), y: oy + (STREET >> 1) });
  }

  // 4) POIs + spaceport: carve a walkable pocket so each structure sits in the open and stays enterable.
  const anchors = pois.map(p => ({ x: Math.floor((p.x ?? 50) / tileSize), y: Math.floor((p.y ?? 50) / tileSize) }));
  if (mapData.spaceport && Number.isFinite(mapData.spaceport.x)) {
    anchors.push({ x: Math.floor(mapData.spaceport.x / tileSize), y: Math.floor(mapData.spaceport.y / tileSize) });
  }
  anchors.forEach(a => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) carve(a.x + dx, a.y + dy, 'plaza'); });

  // 5) Guarantee every pocket connects to the alley network (carve straight stubs if marooned).
  connectWalkable(tiles, gridSize, anchors);

  // 6) Tag building tiles with a coherent per-block height + style for the 3D renderer.
  for (let y = 0; y < gridSize; y++) for (let x = 0; x < gridSize; x++) {
    const t = tiles[y][x];
    if (t.type !== 'building') continue;
    const sbx = Math.floor((x - margin) / PITCH), sby = Math.floor((y - margin) / PITCH);
    const hh = hash2(sbx, sby, seed);
    const roll = (hh & 0xffff) / 0xffff;
    t.height = roll < 0.42 ? 1 : roll < 0.74 ? 2 : roll < 0.92 ? 3 : 4; // mostly low, a few towers
    t.style = (hh >>> 16) % 5;
  }

  // 7) Market stalls at plaza corners (small obstacles; the plaza centre stays passable).
  plazas.forEach(pl => {
    [[pl.x - 1, pl.y - 1], [pl.x + 1, pl.y - 1], [pl.x - 1, pl.y + 1], [pl.x + 1, pl.y + 1]].forEach(([sx, sy]) => {
      if (inB(sx, sy) && tiles[sy][sx].walkable && rng() < 0.7) {
        tiles[sy][sx] = { type: 'stall', walkable: false, visual: 'stall', stallStyle: (rng() * 4) | 0 };
      }
    });
  });

  return tileMap;
}

/**
 * Create a building (obstacle) at tile coordinates
 */
function createBuilding(tileMap, centerX, centerY, width, height) {
  const halfWidth = Math.floor(width / 2);
  const halfHeight = Math.floor(height / 2);
  
  for (let y = centerY - halfHeight; y <= centerY + halfHeight; y++) {
    for (let x = centerX - halfWidth; x <= centerX + halfWidth; x++) {
      if (x >= 0 && x < tileMap.gridSize && y >= 0 && y < tileMap.gridSize) {
        tileMap.tiles[y][x] = {
          type: 'building',
          walkable: false,
          visual: 'building'
        };
      }
    }
  }
}

/**
 * Create a plaza (walkable open area) at tile coordinates
 */
function createPlaza(tileMap, centerX, centerY, width, height) {
  const halfWidth = Math.floor(width / 2);
  const halfHeight = Math.floor(height / 2);
  
  for (let y = centerY - halfHeight; y <= centerY + halfHeight; y++) {
    for (let x = centerX - halfWidth; x <= centerX + halfWidth; x++) {
      if (x >= 0 && x < tileMap.gridSize && y >= 0 && y < tileMap.gridSize) {
        const existing = tileMap.tiles[y][x];
        if (existing.type !== 'building') {
          tileMap.tiles[y][x] = {
            type: 'plaza',
            walkable: true,
            visual: 'plaza'
          };
        }
      }
    }
  }
}

/**
 * Create a street connecting two POIs
 */
function createStreet(tileMap, fromPOI, toPOI, width) {
  const fromX = Math.floor(fromPOI.x / tileMap.tileSize);
  const fromY = Math.floor(fromPOI.y / tileMap.tileSize);
  const toX = Math.floor(toPOI.x / tileMap.tileSize);
  const toY = Math.floor(toPOI.y / tileMap.tileSize);

  // Use Bresenham-like algorithm to create street
  const dx = Math.abs(toX - fromX);
  const dy = Math.abs(toY - fromY);
  const sx = fromX < toX ? 1 : -1;
  const sy = fromY < toY ? 1 : -1;
  let err = dx - dy;

  let x = fromX;
  let y = fromY;

  while (true) {
    // Create street tiles around current position
    const halfWidth = Math.floor(width / 2);
    for (let wy = -halfWidth; wy <= halfWidth; wy++) {
      for (let wx = -halfWidth; wx <= halfWidth; wx++) {
        const tx = x + wx;
        const ty = y + wy;
        if (tx >= 0 && tx < tileMap.gridSize && ty >= 0 && ty < tileMap.gridSize) {
          const existing = tileMap.tiles[ty][tx];
          if (existing.type !== 'building') {
            tileMap.tiles[ty][tx] = {
              type: width >= 3 ? 'main_street' : 'alley',
              walkable: true,
              visual: width >= 3 ? 'main_street' : 'alley'
            };
          }
        }
      }
    }

    if (x === toX && y === toY) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

/**
 * Create alleys around buildings (narrow pathways)
 */
function createAlleys(tileMap) {
  // Find building clusters and create narrow alleys between them
  for (let y = 1; y < tileMap.gridSize - 1; y++) {
    for (let x = 1; x < tileMap.gridSize - 1; x++) {
      const tile = tileMap.tiles[y][x];
      
      // If surrounded by buildings, make it an alley
      if (tile.type === 'open') {
        const neighbors = [
          tileMap.tiles[y - 1][x],
          tileMap.tiles[y + 1][x],
          tileMap.tiles[y][x - 1],
          tileMap.tiles[y][x + 1]
        ];
        
        const buildingCount = neighbors.filter(n => n.type === 'building').length;
        if (buildingCount >= 2) {
          tile.type = 'alley';
          tile.visual = 'alley';
        }
      }
    }
  }
}

/**
 * Check if a coordinate (0-100) is walkable
 */
function isWalkable(tileMap, x, y) {
  const tileX = Math.floor(x / tileMap.tileSize);
  const tileY = Math.floor(y / tileMap.tileSize);
  
  if (tileX < 0 || tileX >= tileMap.gridSize || tileY < 0 || tileY >= tileMap.gridSize) {
    return false;
  }
  
  return tileMap.tiles[tileY][tileX].walkable;
}

/**
 * Get tile type at coordinates
 */
function getTileType(tileMap, x, y) {
  const tileX = Math.floor(x / tileMap.tileSize);
  const tileY = Math.floor(y / tileMap.tileSize);
  
  if (tileX < 0 || tileX >= tileMap.gridSize || tileY < 0 || tileY >= tileMap.gridSize) {
    return 'out_of_bounds';
  }
  
  return tileMap.tiles[tileY][tileX].type;
}

/**
 * Generate a tile map for a desert planet
 */
function generateDesertTileMap(mapData, tileSize = 2) {
  const gridSize = Math.floor(100 / tileSize);
  const tileMap = {
    gridSize: gridSize,
    tileSize: tileSize,
    tiles: []
  };

  // Initialize all tiles as open terrain (walkable)
  for (let y = 0; y < gridSize; y++) {
    tileMap.tiles[y] = [];
    for (let x = 0; x < gridSize; x++) {
      tileMap.tiles[y][x] = {
        type: 'open',
        walkable: true,
        visual: 'terrain'
      };
    }
  }

  const pois = mapData.pointsOfInterest || [];
  
  // Place rocks (5-10% of map, random)
  const rockCount = Math.floor((gridSize * gridSize) * 0.08);
  for (let i = 0; i < rockCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    const size = Math.random() < 0.7 ? 1 : 2; // 70% small, 30% large
    createObstacle(tileMap, x, y, size, size, 'rock');
  }

  // Place sand dunes (10-15% of map)
  const duneCount = Math.floor((gridSize * gridSize) * 0.12);
  for (let i = 0; i < duneCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    tileMap.tiles[y][x].type = 'sand_dune';
    tileMap.tiles[y][x].walkable = true; // Difficult but walkable
    tileMap.tiles[y][x].visual = 'sand_dune';
  }

  // Create canyons (2-3 major canyons)
  const canyonCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < canyonCount; i++) {
    const startX = Math.floor(Math.random() * gridSize);
    const startY = Math.floor(Math.random() * gridSize);
    const endX = Math.floor(Math.random() * gridSize);
    const endY = Math.floor(Math.random() * gridSize);
    createCanyon(tileMap, startX, startY, endX, endY);
  }

  // Place oases near settlements
  const settlements = pois.filter(p => p.type === 'settlement' || p.type === 'city');
  settlements.forEach(settlement => {
    const tileX = Math.floor(settlement.x / tileSize);
    const tileY = Math.floor(settlement.y / tileSize);
    createOasis(tileMap, tileX, tileY, 2, 2);
  });

  // Create settlements (smaller buildings than urban)
  pois.forEach(poi => {
    if (poi.type !== 'city' && poi.type !== 'settlement' && poi.type !== 'landscape' && poi.type !== 'wilderness') {
      const tileX = Math.floor(poi.x / tileSize);
      const tileY = Math.floor(poi.y / tileSize);
      const size = poi.type === 'spaceport' ? 2 : 1;
      createObstacle(tileMap, tileX, tileY, size, size, 'building');
    }
  });

  // Create roads connecting settlements
  const spaceport = pois.find(p => p.type === 'spaceport');
  if (spaceport) {
    settlements.forEach(settlement => {
      createPath(tileMap, spaceport, settlement, 3); // 3 tiles wide (road)
    });
  }

  // Create trails between nearby POIs
  for (let i = 0; i < pois.length; i++) {
    for (let j = i + 1; j < pois.length; j++) {
      const poi1 = pois[i];
      const poi2 = pois[j];
      const distance = Math.sqrt(Math.pow(poi1.x - poi2.x, 2) + Math.pow(poi1.y - poi2.y, 2));
      if (distance < 25 && distance > 5) {
        createPath(tileMap, poi1, poi2, 1); // 1 tile wide (trail)
      }
    }
  }

  return tileMap;
}

/**
 * Generate a tile map for a forest/jungle planet
 */
function generateForestTileMap(mapData, tileSize = 2) {
  const gridSize = Math.floor(100 / tileSize);
  const tileMap = {
    gridSize: gridSize,
    tileSize: tileSize,
    tiles: []
  };

  // Initialize all tiles as open terrain
  for (let y = 0; y < gridSize; y++) {
    tileMap.tiles[y] = [];
    for (let x = 0; x < gridSize; x++) {
      tileMap.tiles[y][x] = {
        type: 'open',
        walkable: true,
        visual: 'terrain'
      };
    }
  }

  const pois = mapData.pointsOfInterest || [];

  // Place dense tree clusters (20-30% of map)
  const clusterCount = Math.floor((gridSize * gridSize) * 0.25);
  for (let i = 0; i < clusterCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    const size = Math.random() < 0.5 ? 1 : 2;
    createObstacle(tileMap, x, y, size, size, 'tree');
  }

  // Place scattered individual trees (10-15% of map)
  const treeCount = Math.floor((gridSize * gridSize) * 0.12);
  for (let i = 0; i < treeCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    if (tileMap.tiles[y][x].type === 'open') {
      tileMap.tiles[y][x] = {
        type: 'tree',
        walkable: false,
        visual: 'tree'
      };
    }
  }

  // Create clearings around POIs
  pois.forEach(poi => {
    const tileX = Math.floor(poi.x / tileSize);
    const tileY = Math.floor(poi.y / tileSize);
    createClearing(tileMap, tileX, tileY, 3, 3);
  });

  // Place swamps in low-lying areas (5-10% of map)
  const swampCount = Math.floor((gridSize * gridSize) * 0.07);
  for (let i = 0; i < swampCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    tileMap.tiles[y][x].type = 'swamp';
    tileMap.tiles[y][x].walkable = true; // Difficult but walkable
    tileMap.tiles[y][x].visual = 'swamp';
  }

  // Create trails between POIs
  const majorPOIs = pois.filter(p => p.type === 'city' || p.type === 'spaceport' || p.type === 'base');
  for (let i = 0; i < majorPOIs.length; i++) {
    for (let j = i + 1; j < majorPOIs.length; j++) {
      createPath(tileMap, majorPOIs[i], majorPOIs[j], 1); // 1 tile wide (trail)
    }
  }

  return tileMap;
}

/**
 * Generate a tile map for an ocean planet
 */
function generateOceanTileMap(mapData, tileSize = 2) {
  const gridSize = Math.floor(100 / tileSize);
  const tileMap = {
    gridSize: gridSize,
    tileSize: tileSize,
    tiles: []
  };

  // Initialize all tiles as water (impassable)
  for (let y = 0; y < gridSize; y++) {
    tileMap.tiles[y] = [];
    for (let x = 0; x < gridSize; x++) {
      tileMap.tiles[y][x] = {
        type: 'water',
        walkable: false,
        visual: 'water'
      };
    }
  }

  const pois = mapData.pointsOfInterest || [];

  // Create main island (20-30% of map)
  const mainIslandX = Math.floor(gridSize * 0.5);
  const mainIslandY = Math.floor(gridSize * 0.5);
  const islandSize = Math.floor(gridSize * 0.25);
  createIsland(tileMap, mainIslandX, mainIslandY, islandSize, islandSize);

  // Create 2-3 secondary islands (5-10% each)
  const secondaryIslandCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < secondaryIslandCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    const size = Math.floor(gridSize * 0.08);
    createIsland(tileMap, x, y, size, size);
  }

  // Create channels between islands (navigable water)
  const islands = findIslands(tileMap);
  for (let i = 0; i < islands.length; i++) {
    for (let j = i + 1; j < islands.length; j++) {
      createChannel(tileMap, islands[i], islands[j], 2); // 2 tiles wide
    }
  }

  // Place POIs on islands
  pois.forEach(poi => {
    const tileX = Math.floor(poi.x / tileSize);
    const tileY = Math.floor(poi.y / tileSize);
    if (tileMap.tiles[tileY] && tileMap.tiles[tileY][tileX] && tileMap.tiles[tileY][tileX].type === 'island') {
      const size = poi.type === 'spaceport' ? 2 : 1;
      createObstacle(tileMap, tileX, tileY, size, size, 'building');
    }
  });

  return tileMap;
}

/**
 * Generate a tile map for an ice/snow planet
 */
function generateIceTileMap(mapData, tileSize = 2) {
  const gridSize = Math.floor(100 / tileSize);
  const tileMap = {
    gridSize: gridSize,
    tileSize: tileSize,
    tiles: []
  };

  // Initialize all tiles as open terrain
  for (let y = 0; y < gridSize; y++) {
    tileMap.tiles[y] = [];
    for (let x = 0; x < gridSize; x++) {
      tileMap.tiles[y][x] = {
        type: 'open',
        walkable: true,
        visual: 'terrain'
      };
    }
  }

  const pois = mapData.pointsOfInterest || [];

  // Create ice cliffs (2-3 major barriers)
  const cliffCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < cliffCount; i++) {
    const startX = Math.floor(Math.random() * gridSize);
    const startY = Math.floor(Math.random() * gridSize);
    const endX = Math.floor(Math.random() * gridSize);
    const endY = Math.floor(Math.random() * gridSize);
    createCanyon(tileMap, startX, startY, endX, endY); // Reuse canyon logic for cliffs
  }

  // Place crevasses (3-5 dangerous areas)
  const crevasseCount = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < crevasseCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    createObstacle(tileMap, x, y, 1, 2, 'crevasse');
  }

  // Place snow drifts (10-15% of map)
  const driftCount = Math.floor((gridSize * gridSize) * 0.12);
  for (let i = 0; i < driftCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    tileMap.tiles[y][x].type = 'snow_drift';
    tileMap.tiles[y][x].walkable = true; // Difficult but walkable
    tileMap.tiles[y][x].visual = 'snow_drift';
  }

  // Create frozen lakes (2-3 large areas)
  const lakeCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < lakeCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    createClearing(tileMap, x, y, 4, 4); // Use clearing logic for lakes
    // Mark as frozen lake
    for (let ly = y - 2; ly <= y + 2; ly++) {
      for (let lx = x - 2; lx <= x + 2; lx++) {
        if (lx >= 0 && lx < gridSize && ly >= 0 && ly < gridSize) {
          if (tileMap.tiles[ly][lx].type === 'clearing') {
            tileMap.tiles[ly][lx].type = 'frozen_lake';
            tileMap.tiles[ly][lx].visual = 'frozen_lake';
          }
        }
      }
    }
  }

  // Create bases (buildings)
  pois.forEach(poi => {
    if (poi.type === 'base' || poi.type === 'spaceport') {
      const tileX = Math.floor(poi.x / tileSize);
      const tileY = Math.floor(poi.y / tileSize);
      createObstacle(tileMap, tileX, tileY, 2, 2, 'building');
    }
  });

  // Create ice roads connecting bases
  const bases = pois.filter(p => p.type === 'base' || p.type === 'spaceport');
  for (let i = 0; i < bases.length; i++) {
    for (let j = i + 1; j < bases.length; j++) {
      createPath(tileMap, bases[i], bases[j], 2); // 2 tiles wide (ice road)
    }
  }

  return tileMap;
}

/**
 * Generate a tile map for a volcanic planet
 */
function generateVolcanicTileMap(mapData, tileSize = 2) {
  const gridSize = Math.floor(100 / tileSize);
  const tileMap = {
    gridSize: gridSize,
    tileSize: tileSize,
    tiles: []
  };

  // Initialize all tiles as open terrain
  for (let y = 0; y < gridSize; y++) {
    tileMap.tiles[y] = [];
    for (let x = 0; x < gridSize; x++) {
      tileMap.tiles[y][x] = {
        type: 'open',
        walkable: true,
        visual: 'terrain'
      };
    }
  }

  const pois = mapData.pointsOfInterest || [];

  // Create lava flows (3-5 major barriers)
  const lavaFlowCount = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < lavaFlowCount; i++) {
    const startX = Math.floor(Math.random() * gridSize);
    const startY = Math.floor(Math.random() * gridSize);
    const endX = Math.floor(Math.random() * gridSize);
    const endY = Math.floor(Math.random() * gridSize);
    createLavaFlow(tileMap, startX, startY, endX, endY);
  }

  // Place volcanic vents (5-10 dangerous areas)
  const ventCount = 5 + Math.floor(Math.random() * 6);
  for (let i = 0; i < ventCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    createObstacle(tileMap, x, y, 1, 1, 'volcanic_vent');
  }

  // Place unstable ground around vents (10-15% of map)
  const unstableCount = Math.floor((gridSize * gridSize) * 0.12);
  for (let i = 0; i < unstableCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    if (tileMap.tiles[y][x].type === 'open') {
      tileMap.tiles[y][x].type = 'unstable_ground';
      tileMap.tiles[y][x].walkable = true; // Difficult but walkable
      tileMap.tiles[y][x].visual = 'unstable_ground';
    }
  }

  // Create safe zones around POIs
  pois.forEach(poi => {
    const tileX = Math.floor(poi.x / tileSize);
    const tileY = Math.floor(poi.y / tileSize);
    createClearing(tileMap, tileX, tileY, 3, 3); // Safe zone
  });

  // Create bases
  pois.forEach(poi => {
    if (poi.type === 'base' || poi.type === 'industrial') {
      const tileX = Math.floor(poi.x / tileSize);
      const tileY = Math.floor(poi.y / tileSize);
      createObstacle(tileMap, tileX, tileY, 2, 2, 'building');
    }
  });

  // Create safe paths between safe zones
  const safeZones = pois.filter(p => p.type === 'base' || p.type === 'spaceport');
  for (let i = 0; i < safeZones.length; i++) {
    for (let j = i + 1; j < safeZones.length; j++) {
      createPath(tileMap, safeZones[i], safeZones[j], 1); // 1 tile wide (safe path)
    }
  }

  return tileMap;
}

/**
 * Generate a tile map for a barren/desolate planet
 */
function generateBarrenTileMap(mapData, tileSize = 2) {
  const gridSize = Math.floor(100 / tileSize);
  const tileMap = {
    gridSize: gridSize,
    tileSize: tileSize,
    tiles: []
  };

  // Initialize all tiles as open terrain (most of map is walkable)
  for (let y = 0; y < gridSize; y++) {
    tileMap.tiles[y] = [];
    for (let x = 0; x < gridSize; x++) {
      tileMap.tiles[y][x] = {
        type: 'open',
        walkable: true,
        visual: 'terrain'
      };
    }
  }

  const pois = mapData.pointsOfInterest || [];

  // Place craters (5-10% of map)
  const craterCount = Math.floor((gridSize * gridSize) * 0.07);
  for (let i = 0; i < craterCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    const size = Math.random() < 0.7 ? 1 : 2;
    createObstacle(tileMap, x, y, size, size, 'crater');
  }

  // Place rock formations (5-10% of map)
  const rockCount = Math.floor((gridSize * gridSize) * 0.07);
  for (let i = 0; i < rockCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    const size = Math.random() < 0.6 ? 1 : (Math.random() < 0.8 ? 2 : 3);
    createObstacle(tileMap, x, y, size, size, 'rock');
  }

  // Place ruins (3-5% of map)
  const ruinCount = Math.floor((gridSize * gridSize) * 0.04);
  for (let i = 0; i < ruinCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    if (tileMap.tiles[y][x].type === 'open') {
      tileMap.tiles[y][x].type = 'ruin';
      tileMap.tiles[y][x].walkable = true; // Difficult but walkable
      tileMap.tiles[y][x].visual = 'ruin';
    }
  }

  // Create sparse settlements
  pois.forEach(poi => {
    if (poi.type !== 'landscape' && poi.type !== 'wilderness') {
      const tileX = Math.floor(poi.x / tileSize);
      const tileY = Math.floor(poi.y / tileSize);
      const size = poi.type === 'spaceport' ? 2 : 1;
      createObstacle(tileMap, tileX, tileY, size, size, 'building');
    }
  });

  // Create roads connecting settlements
  const settlements = pois.filter(p => p.type === 'settlement' || p.type === 'city' || p.type === 'spaceport');
  for (let i = 0; i < settlements.length; i++) {
    for (let j = i + 1; j < settlements.length; j++) {
      createPath(tileMap, settlements[i], settlements[j], 2); // 2 tiles wide (road)
    }
  }

  return tileMap;
}

// Helper functions for all planet types

function createObstacle(tileMap, centerX, centerY, width, height, type) {
  const halfWidth = Math.floor(width / 2);
  const halfHeight = Math.floor(height / 2);
  
  for (let y = centerY - halfHeight; y <= centerY + halfHeight; y++) {
    for (let x = centerX - halfWidth; x <= centerX + halfWidth; x++) {
      if (x >= 0 && x < tileMap.gridSize && y >= 0 && y < tileMap.gridSize) {
        tileMap.tiles[y][x] = {
          type: type,
          walkable: false,
          visual: type
        };
      }
    }
  }
}

function createClearing(tileMap, centerX, centerY, width, height) {
  const halfWidth = Math.floor(width / 2);
  const halfHeight = Math.floor(height / 2);
  
  for (let y = centerY - halfHeight; y <= centerY + halfHeight; y++) {
    for (let x = centerX - halfWidth; x <= centerX + halfWidth; x++) {
      if (x >= 0 && x < tileMap.gridSize && y >= 0 && y < tileMap.gridSize) {
        const existing = tileMap.tiles[y][x];
        if (existing.type !== 'building' && existing.type !== 'rock' && existing.type !== 'tree') {
          tileMap.tiles[y][x] = {
            type: 'clearing',
            walkable: true,
            visual: 'clearing'
          };
        }
      }
    }
  }
}

function createCanyon(tileMap, startX, startY, endX, endY) {
  const dx = Math.abs(endX - startX);
  const dy = Math.abs(endY - startY);
  const sx = startX < endX ? 1 : -1;
  const sy = startY < endY ? 1 : -1;
  let err = dx - dy;

  let x = startX;
  let y = startY;

  while (true) {
    if (x >= 0 && x < tileMap.gridSize && y >= 0 && y < tileMap.gridSize) {
      tileMap.tiles[y][x] = {
        type: 'canyon',
        walkable: false,
        visual: 'canyon'
      };
    }

    if (x === endX && y === endY) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

function createOasis(tileMap, centerX, centerY, width, height) {
  const halfWidth = Math.floor(width / 2);
  const halfHeight = Math.floor(height / 2);
  
  for (let y = centerY - halfHeight; y <= centerY + halfHeight; y++) {
    for (let x = centerX - halfWidth; x <= centerX + halfWidth; x++) {
      if (x >= 0 && x < tileMap.gridSize && y >= 0 && y < tileMap.gridSize) {
        tileMap.tiles[y][x] = {
          type: 'oasis',
          walkable: true,
          visual: 'oasis'
        };
      }
    }
  }
}

function createPath(tileMap, fromPOI, toPOI, width) {
  const fromX = Math.floor(fromPOI.x / tileMap.tileSize);
  const fromY = Math.floor(fromPOI.y / tileMap.tileSize);
  const toX = Math.floor(toPOI.x / tileMap.tileSize);
  const toY = Math.floor(toPOI.y / tileMap.tileSize);

  const dx = Math.abs(toX - fromX);
  const dy = Math.abs(toY - fromY);
  const sx = fromX < toX ? 1 : -1;
  const sy = fromY < toY ? 1 : -1;
  let err = dx - dy;

  let x = fromX;
  let y = fromY;

  while (true) {
    const halfWidth = Math.floor(width / 2);
    for (let wy = -halfWidth; wy <= halfWidth; wy++) {
      for (let wx = -halfWidth; wx <= halfWidth; wx++) {
        const tx = x + wx;
        const ty = y + wy;
        if (tx >= 0 && tx < tileMap.gridSize && ty >= 0 && ty < tileMap.gridSize) {
          const existing = tileMap.tiles[ty][tx];
          if (existing.type !== 'building' && existing.type !== 'rock' && existing.type !== 'tree' && 
              existing.type !== 'canyon' && existing.type !== 'lava_flow' && existing.type !== 'crevasse') {
            tileMap.tiles[ty][tx] = {
              type: width >= 3 ? 'road' : 'trail',
              walkable: true,
              visual: width >= 3 ? 'road' : 'trail'
            };
          }
        }
      }
    }

    if (x === toX && y === toY) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

function createIsland(tileMap, centerX, centerY, width, height) {
  const halfWidth = Math.floor(width / 2);
  const halfHeight = Math.floor(height / 2);
  
  for (let y = centerY - halfHeight; y <= centerY + halfHeight; y++) {
    for (let x = centerX - halfWidth; x <= centerX + halfWidth; x++) {
      if (x >= 0 && x < tileMap.gridSize && y >= 0 && y < tileMap.gridSize) {
        // Create organic island shape (ellipse)
        const dx = (x - centerX) / halfWidth;
        const dy = (y - centerY) / halfHeight;
        if (dx * dx + dy * dy <= 1) {
          tileMap.tiles[y][x] = {
            type: 'island',
            walkable: true,
            visual: 'island'
          };
        }
      }
    }
  }
}

function findIslands(tileMap) {
  const islands = [];
  const visited = new Set();
  
  for (let y = 0; y < tileMap.gridSize; y++) {
    for (let x = 0; x < tileMap.gridSize; x++) {
      if (tileMap.tiles[y][x].type === 'island' && !visited.has(`${x},${y}`)) {
        // Find island center (simple: use first tile)
        islands.push({ x, y });
        // Mark connected tiles as visited (simple flood fill)
        floodFill(tileMap, x, y, visited);
      }
    }
  }
  
  return islands;
}

function floodFill(tileMap, startX, startY, visited) {
  const stack = [[startX, startY]];
  
  while (stack.length > 0) {
    const [x, y] = stack.pop();
    const key = `${x},${y}`;
    
    if (visited.has(key)) continue;
    if (x < 0 || x >= tileMap.gridSize || y < 0 || y >= tileMap.gridSize) continue;
    if (tileMap.tiles[y][x].type !== 'island') continue;
    
    visited.add(key);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}

function createChannel(tileMap, fromIsland, toIsland, width) {
  const fromX = fromIsland.x;
  const fromY = fromIsland.y;
  const toX = toIsland.x;
  const toY = toIsland.y;

  const dx = Math.abs(toX - fromX);
  const dy = Math.abs(toY - fromY);
  const sx = fromX < toX ? 1 : -1;
  const sy = fromY < toY ? 1 : -1;
  let err = dx - dy;

  let x = fromX;
  let y = fromY;

  while (true) {
    const halfWidth = Math.floor(width / 2);
    for (let wy = -halfWidth; wy <= halfWidth; wy++) {
      for (let wx = -halfWidth; wx <= halfWidth; wx++) {
        const tx = x + wx;
        const ty = y + wy;
        if (tx >= 0 && tx < tileMap.gridSize && ty >= 0 && ty < tileMap.gridSize) {
          if (tileMap.tiles[ty][tx].type === 'water') {
            tileMap.tiles[ty][tx] = {
              type: 'channel',
              walkable: true,
              visual: 'channel'
            };
          }
        }
      }
    }

    if (x === toX && y === toY) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

function createLavaFlow(tileMap, startX, startY, endX, endY) {
  const dx = Math.abs(endX - startX);
  const dy = Math.abs(endY - startY);
  const sx = startX < endX ? 1 : -1;
  const sy = startY < endY ? 1 : -1;
  let err = dx - dy;

  let x = startX;
  let y = startY;

  while (true) {
    if (x >= 0 && x < tileMap.gridSize && y >= 0 && y < tileMap.gridSize) {
      tileMap.tiles[y][x] = {
        type: 'lava_flow',
        walkable: false,
        visual: 'lava_flow'
      };
    }

    if (x === endX && y === endY) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

/**
 * Generate tile map based on planet type
 */
// Bump when a generator's output shape changes so cached planet.tileMap grids regenerate.
// v2: urban planets become a dense maze-like medina (height/style-tagged buildings + stalls).
const TILEMAP_VERSION = 2;

function generateTileMapByPlanetType(planet, mapData, tileSize = 2) {
  const tm = _dispatchTileMapByPlanetType(planet, mapData, tileSize);
  if (tm && typeof tm === 'object') tm.version = TILEMAP_VERSION;
  return tm;
}

function _dispatchTileMapByPlanetType(planet, mapData, tileSize = 2) {
  const planetType = planet.planetType || planet.type;
  const terrain = mapData.terrain;

  // Urban planets
  if (planetType === 'urban' || terrain === 'urban_sprawl') {
    return generateUrbanTileMap(mapData, tileSize);
  }

  // Desert planets
  if (planetType === 'desert' || terrain === 'desert') {
    return generateDesertTileMap(mapData, tileSize);
  }

  // Forest/Jungle planets
  if (planetType === 'jungle' || planetType === 'forest' || terrain === 'jungle' || terrain === 'forest') {
    return generateForestTileMap(mapData, tileSize);
  }

  // Ocean planets
  if (planetType === 'ocean' || terrain === 'ocean') {
    return generateOceanTileMap(mapData, tileSize);
  }

  // Ice/Snow planets
  if (planetType === 'ice' || terrain === 'ice') {
    return generateIceTileMap(mapData, tileSize);
  }

  // Volcanic planets
  if (planetType === 'volcanic' || terrain === 'volcanic') {
    return generateVolcanicTileMap(mapData, tileSize);
  }

  // Barren planets
  if (planetType === 'barren' || terrain === 'barren' || terrain === 'wasteland') {
    return generateBarrenTileMap(mapData, tileSize);
  }

  // Default: use urban for unknown types (fallback)
  console.warn(`[Tile Map] Unknown planet type: ${planetType}, terrain: ${terrain}, using urban generator`);
  return generateUrbanTileMap(mapData, tileSize);
}

module.exports = {
  generateUrbanTileMap,
  generateDesertTileMap,
  generateForestTileMap,
  generateOceanTileMap,
  generateIceTileMap,
  generateVolcanicTileMap,
  generateBarrenTileMap,
  generateTileMapByPlanetType,
  TILEMAP_VERSION,
  isWalkable,
  getTileType
};

