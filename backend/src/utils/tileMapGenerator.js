/**
 * Tile Map Generator
 * Creates tile-based maps for planets (like Pokemon/Zelda style)
 * Each tile is either walkable or an obstacle
 */

/**
 * Generate a tile map for an urban planet
 * @param {Object} mapData - Planet map data with POIs and districts
 * @param {number} tileSize - Size of each tile as percentage (default 2% = 50x50 grid)
 * @returns {Object} Tile map with walkable/obstacle information
 */
function generateUrbanTileMap(mapData, tileSize = 2) {
  const gridSize = Math.floor(100 / tileSize); // 50x50 grid for 2% tiles
  const tileMap = {
    gridSize: gridSize,
    tileSize: tileSize,
    tiles: []
  };

  // Initialize all tiles as open space (walkable)
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
  const districts = mapData.mapLayout?.districts || [];

  // Place buildings around POIs
  pois.forEach(poi => {
    if (poi.type === 'city' || poi.type === 'entertainment') {
      // Districts are large areas - create plazas instead of buildings
      const tileX = Math.floor(poi.x / tileSize);
      const tileY = Math.floor(poi.y / tileSize);
      createPlaza(tileMap, tileX, tileY, 4, 4);
    } else {
      // Individual POIs get buildings
      const tileX = Math.floor(poi.x / tileSize);
      const tileY = Math.floor(poi.y / tileSize);
      createBuilding(tileMap, tileX, tileY, 2, 2);
    }
  });

  // Create main streets connecting districts
  const majorPOIs = pois.filter(p => 
    p.type === 'spaceport' || 
    p.type === 'city' || 
    p.type === 'palace' ||
    p.type === 'entertainment'
  );

  // Connect spaceport to all major districts
  const spaceport = majorPOIs.find(p => p.type === 'spaceport');
  if (spaceport) {
    majorPOIs.forEach(target => {
      if (target !== spaceport) {
        createStreet(tileMap, spaceport, target, 3); // 3 tiles wide
      }
    });
  }

  // Create secondary streets between nearby POIs
  for (let i = 0; i < pois.length; i++) {
    for (let j = i + 1; j < pois.length; j++) {
      const poi1 = pois[i];
      const poi2 = pois[j];
      const distance = Math.sqrt(
        Math.pow(poi1.x - poi2.x, 2) + Math.pow(poi1.y - poi2.y, 2)
      );
      
      // Connect nearby POIs (within 30% of map)
      if (distance < 30 && distance > 5) {
        createStreet(tileMap, poi1, poi2, 2); // 2 tiles wide (alley)
      }
    }
  }

  // Fill in alleys around buildings
  createAlleys(tileMap);

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
function generateTileMapByPlanetType(planet, mapData, tileSize = 2) {
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
  if (planetType === 'jungle' || terrain === 'jungle' || terrain === 'forest') {
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
  isWalkable,
  getTileType
};

