/**
 * Dungeon Generator
 * Generates maze-like dungeon layouts with multiple design variants
 */

const { generateMaze, selectAlgorithm, getNeighbors, cellKey } = require('./mazeAlgorithms');

/**
 * Seeded random number generator
 */
function seededRandom(seed) {
  let value = seed;
  return function() {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

/**
 * Get seed from string
 */
function getSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) || 12345;
}

/**
 * Dungeon size configuration by type
 */
const DUNGEON_SIZE_CONFIG = {
  danger: {
    min: { width: 15, height: 15 },
    max: { width: 25, height: 25 },
    default: { width: 20, height: 20 }
  },
  mine: {
    min: { width: 20, height: 20 },
    max: { width: 30, height: 30 },
    default: { width: 25, height: 25 }
  },
  underworld: {
    min: { width: 18, height: 18 },
    max: { width: 28, height: 28 },
    default: { width: 23, height: 23 }
  },
  cave: {
    min: { width: 15, height: 15 },
    max: { width: 25, height: 25 },
    default: { width: 20, height: 20 }
  },
  ruins: {
    min: { width: 20, height: 20 },
    max: { width: 30, height: 30 },
    default: { width: 25, height: 25 }
  },
  fortress: {
    min: { width: 22, height: 22 },
    max: { width: 30, height: 30 },
    default: { width: 28, height: 28 }
  }
};

/**
 * Design variants by dungeon type
 */
const DUNGEON_VARIANTS = {
  danger: ['spiral_depth', 'grid_perfect', 'linear_branching'],
  mine: ['linear_branching', 'room_corridor', 'circular_hub'],
  underworld: ['grid_perfect', 'circular_hub', 'spiral_depth'],
  cave: ['spiral_depth', 'circular_hub', 'room_corridor'],
  ruins: ['circular_hub', 'spiral_depth', 'grid_perfect'],
  fortress: ['room_corridor', 'linear_branching', 'circular_hub']
};

/**
 * Calculate distance from entrance
 */
function calculateDistance(x, y, entranceX, entranceY) {
  return Math.abs(x - entranceX) + Math.abs(y - entranceY);
}

/**
 * Find furthest point from entrance
 */
function findFurthestPoint(grid, entranceX, entranceY, width, height) {
  let maxDist = 0;
  let furthest = { x: entranceX, y: entranceY };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === 1 || grid[y][x] === 2) { // Corridor or room
        const dist = calculateDistance(x, y, entranceX, entranceY);
        if (dist > maxDist) {
          maxDist = dist;
          furthest = { x, y };
        }
      }
    }
  }

  return furthest;
}

/**
 * Place rooms in dungeon
 */
function placeRooms(grid, width, height, random, roomCount = 8) {
  const rooms = [];
  const minRoomSize = 3;
  const maxRoomSize = 5;

  for (let i = 0; i < roomCount; i++) {
    let attempts = 0;
    let placed = false;

    while (!placed && attempts < 50) {
      const roomWidth = minRoomSize + Math.floor(random() * (maxRoomSize - minRoomSize + 1));
      const roomHeight = minRoomSize + Math.floor(random() * (maxRoomSize - minRoomSize + 1));
      const x = 2 + Math.floor(random() * (width - roomWidth - 4));
      const y = 2 + Math.floor(random() * (height - roomHeight - 4));

      // Check if room overlaps with existing rooms or is too close to edge
      let overlaps = false;
      if (x < 1 || y < 1 || x + roomWidth >= width - 1 || y + roomHeight >= height - 1) {
        overlaps = true;
      }
      if (!overlaps) {
        for (let ry = y - 1; ry < y + roomHeight + 1; ry++) {
          for (let rx = x - 1; rx < x + roomWidth + 1; rx++) {
            if (grid[ry][rx] === 2) { // Already a room
              overlaps = true;
              break;
            }
          }
          if (overlaps) break;
        }
      }

      if (!overlaps) {
        // Place room - rooms replace walls but preserve corridor connectivity
        // Rooms are navigable spaces, so they can be placed on walls or corridors
        for (let ry = y; ry < y + roomHeight; ry++) {
          for (let rx = x; rx < x + roomWidth; rx++) {
            // Rooms replace walls (0) but can also be placed on corridors (1)
            // We mark them as rooms (2) which are still navigable
            if (grid[ry][rx] === 0 || grid[ry][rx] === 1) {
              grid[ry][rx] = 2; // 2 = room (navigable)
            }
          }
        }
        rooms.push({
          id: `room_${i}`,
          x,
          y,
          width: roomWidth,
          height: roomHeight,
          depth: 0 // Will be calculated later
        });
        placed = true;
      }
      attempts++;
    }
  }

  return rooms;
}

/**
 * Connect rooms to corridors
 */
function connectRoomsToCorridors(grid, rooms, width, height) {
  for (const room of rooms) {
    const centerX = Math.floor(room.x + room.width / 2);
    const centerY = Math.floor(room.y + room.height / 2);

    // Find nearest corridor
    let nearestCorridor = null;
    let minDist = Infinity;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (grid[y][x] === 1) { // Corridor
          const dist = Math.abs(x - centerX) + Math.abs(y - centerY);
          if (dist < minDist) {
            minDist = dist;
            nearestCorridor = { x, y };
          }
        }
      }
    }

    if (nearestCorridor) {
      // Carve path from room center to nearest corridor
      // Horizontal first, then vertical
      for (let x = Math.min(centerX, nearestCorridor.x); x <= Math.max(centerX, nearestCorridor.x); x++) {
        if (grid[centerY][x] === 0) grid[centerY][x] = 1; // Corridor
      }
      for (let y = Math.min(centerY, nearestCorridor.y); y <= Math.max(centerY, nearestCorridor.y); y++) {
        if (grid[y][nearestCorridor.x] === 0) grid[y][nearestCorridor.x] = 1; // Corridor
      }
    }
  }
}

/**
 * Calculate depth zones
 */
function calculateDepthZones(grid, width, height, entrance, bossRoom) {
  const maxDistance = calculateDistance(bossRoom.x, bossRoom.y, entrance.x, entrance.y);
  const zoneCount = 5;
  const zoneSize = Math.ceil(maxDistance / zoneCount);

  const depthZones = [];
  for (let i = 0; i < zoneCount; i++) {
    depthZones.push({
      name: i === 0 ? 'Entrance' : i === zoneCount - 1 ? 'Boss' : 
            i === 1 ? 'Shallow' : i === 2 ? 'Mid' : 'Deep',
      depth: i,
      minDistance: i * zoneSize,
      maxDistance: (i + 1) * zoneSize
    });
  }

  return depthZones;
}

/**
 * Assign room depths
 */
function assignRoomDepths(rooms, entrance, depthZones) {
  for (const room of rooms) {
    const centerX = Math.floor(room.x + room.width / 2);
    const centerY = Math.floor(room.y + room.height / 2);
    const distance = calculateDistance(centerX, centerY, entrance.x, entrance.y);

    for (const zone of depthZones) {
      if (distance >= zone.minDistance && distance <= zone.maxDistance) {
        room.depth = zone.depth;
        break;
      }
    }
  }
}

/**
 * Cell-type helpers. Floors (anything a player can stand on) are corridor(1),
 * room(2), entrance(3) and boss(4); walls are 0.
 */
function isFloor(value) {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

/**
 * Flood-fill from the entrance and return the set of reachable floor cell keys.
 */
function computeReachable(grid, width, height, entrance) {
  const visited = new Set();
  const queue = [{ x: entrance.x, y: entrance.y }];
  visited.add(cellKey(entrance.x, entrance.y));

  while (queue.length > 0) {
    const current = queue.shift();
    const neighbors = getNeighbors(current.x, current.y, width, height);
    for (const neighbor of neighbors) {
      const key = cellKey(neighbor.x, neighbor.y);
      if (!visited.has(key) && isFloor(grid[neighbor.y][neighbor.x])) {
        visited.add(key);
        queue.push(neighbor);
      }
    }
  }
  return visited;
}

/** True if any cell of the room is in the reachable set. */
function isRoomReachable(room, reachable) {
  for (let ry = room.y; ry < room.y + room.height; ry++) {
    for (let rx = room.x; rx < room.x + room.width; rx++) {
      if (reachable.has(cellKey(rx, ry))) return true;
    }
  }
  return false;
}

/**
 * Carve a corridor connecting `target` to the nearest already-reachable floor
 * cell. BFS over the whole grid (walls are traversable for pathfinding), then
 * turn every wall cell along the path into a corridor. Returns true if a
 * connection was made.
 */
function carvePathToReachable(grid, width, height, target, reachable) {
  const startKey = cellKey(target.x, target.y);
  const parent = new Map();
  const queue = [target];
  const seen = new Set([startKey]);

  while (queue.length > 0) {
    const current = queue.shift();
    const key = cellKey(current.x, current.y);

    // Reached the connected network (but not the target's own already-seen start).
    if (reachable.has(key) && key !== startKey) {
      // Walk back to target, carving walls into corridors.
      let step = current;
      while (step) {
        if (grid[step.y][step.x] === 0) grid[step.y][step.x] = 1;
        step = parent.get(cellKey(step.x, step.y));
      }
      return true;
    }

    for (const neighbor of getNeighbors(current.x, current.y, width, height)) {
      const nKey = cellKey(neighbor.x, neighbor.y);
      if (!seen.has(nKey)) {
        seen.add(nKey);
        parent.set(nKey, current);
        queue.push(neighbor);
      }
    }
  }
  return false;
}

/**
 * Ensure every room and the boss room are reachable from the entrance, carving
 * corridors where needed. Deterministic (no randomness), so the seeded layout
 * stays reproducible. Returns the number of repairs made.
 */
function repairConnectivity(grid, width, height, entrance, rooms, bossCenter) {
  let repairs = 0;
  let reachable = computeReachable(grid, width, height, entrance);

  const targets = [];
  for (const room of rooms) {
    if (!isRoomReachable(room, reachable)) {
      targets.push({ x: room.x + Math.floor(room.width / 2), y: room.y + Math.floor(room.height / 2), label: `room ${room.id}` });
    }
  }
  if (bossCenter && !reachable.has(cellKey(bossCenter.x, bossCenter.y))) {
    targets.push({ x: bossCenter.x, y: bossCenter.y, label: 'boss room' });
  }

  for (const target of targets) {
    // Re-check: an earlier carve may have already connected this target.
    if (reachable.has(cellKey(target.x, target.y))) continue;
    const connected = carvePathToReachable(grid, width, height, target, reachable);
    if (connected) {
      repairs++;
      reachable = computeReachable(grid, width, height, entrance);
      console.log(`[Dungeon Generator] Repaired connectivity to ${target.label}`);
    } else {
      console.warn(`[Dungeon Generator] Could not carve a path to ${target.label}`);
    }
  }
  return repairs;
}

/**
 * Validate dungeon layout: every room AND the boss room must be reachable from
 * the entrance. Returns true only if fully connected.
 */
function validateDungeon(grid, width, height, entrance, rooms, bossCenter = null) {
  const reachable = computeReachable(grid, width, height, entrance);
  if (reachable.size === 0) return false;

  for (const room of rooms) {
    if (!isRoomReachable(room, reachable)) {
      console.warn(`[Dungeon Generator] Room ${room.id} is not reachable`);
      return false;
    }
  }

  if (bossCenter && !reachable.has(cellKey(bossCenter.x, bossCenter.y))) {
    console.warn('[Dungeon Generator] Boss room is not reachable');
    return false;
  }

  return true;
}

/**
 * Generate dungeon map
 */
function generateDungeonMap(dungeonType, seed, designVariant = null, attempt = 0) {
  const MAX_ATTEMPTS = 8;
  const random = seededRandom(seed);

  // Get size configuration
  const sizeConfig = DUNGEON_SIZE_CONFIG[dungeonType] || DUNGEON_SIZE_CONFIG.danger;
  const sizeVariance = 0.2; // ±20% variance
  const variance = 1 + (random() * sizeVariance * 2 - sizeVariance);
  const width = Math.max(
    sizeConfig.min.width,
    Math.min(
      sizeConfig.max.width,
      Math.floor(sizeConfig.default.width * variance)
    )
  );
  const height = Math.max(
    sizeConfig.min.height,
    Math.min(
      sizeConfig.max.height,
      Math.floor(sizeConfig.default.height * variance)
    )
  );

  // Select design variant
  const availableVariants = DUNGEON_VARIANTS[dungeonType] || DUNGEON_VARIANTS.danger;
  const variant = designVariant || availableVariants[Math.floor(random() * availableVariants.length)];

  // Select algorithm
  const algorithm = selectAlgorithm(dungeonType, variant, seed);

  // Generate base maze
  let mazeResult = generateMaze(width, height, algorithm, seed);
  let grid, rooms;

  if (algorithm === 'hybrid') {
    grid = mazeResult.grid;
    rooms = mazeResult.rooms || [];
  } else {
    grid = mazeResult;
    // Place rooms in the maze
    const roomCount = 5 + Math.floor(random() * 10); // 5-15 rooms
    rooms = placeRooms(grid, width, height, random, roomCount);
    connectRoomsToCorridors(grid, rooms, width, height);
  }

  // Place entrance (top edge, center)
  const entranceX = Math.floor(width / 2);
  const entranceY = 0;
  grid[entranceY][entranceX] = 3; // 3 = entrance
  const entrance = { x: entranceX, y: entranceY };

  // Ensure entrance connects to maze
  if (grid[entranceY + 1][entranceX] === 0) {
    grid[entranceY + 1][entranceX] = 1; // Corridor
  }

  // Find boss room location (furthest point)
  const bossRoom = findFurthestPoint(grid, entranceX, entranceY, width, height);
  grid[bossRoom.y][bossRoom.x] = 4; // 4 = boss room

  // Expand boss room to 5x5
  const bossRoomSize = 5;
  const bossRoomX = Math.max(0, Math.min(width - bossRoomSize, bossRoom.x - Math.floor(bossRoomSize / 2)));
  const bossRoomY = Math.max(0, Math.min(height - bossRoomSize, bossRoom.y - Math.floor(bossRoomSize / 2)));

  for (let y = bossRoomY; y < bossRoomY + bossRoomSize && y < height; y++) {
    for (let x = bossRoomX; x < bossRoomX + bossRoomSize && x < width; x++) {
      grid[y][x] = 4; // Boss room
    }
  }

  const finalBossRoom = {
    x: bossRoomX + Math.floor(bossRoomSize / 2),
    y: bossRoomY + Math.floor(bossRoomSize / 2)
  };

  // Calculate depth zones
  const depthZones = calculateDepthZones(grid, width, height, entrance, finalBossRoom);

  // Assign room depths
  assignRoomDepths(rooms, entrance, depthZones);

  // Repair connectivity: deterministically carve corridors to any room or boss
  // room the entrance can't reach, so quest objectives can never be stranded.
  repairConnectivity(grid, width, height, entrance, rooms, finalBossRoom);

  // Validate dungeon (now includes the boss room). If repair somehow didn't
  // fully connect it, reseed — bounded by MAX_ATTEMPTS to avoid infinite recursion.
  const isValid = validateDungeon(grid, width, height, entrance, rooms, finalBossRoom);
  if (!isValid) {
    if (attempt >= MAX_ATTEMPTS) {
      console.error(`[Dungeon Generator] Still invalid after ${MAX_ATTEMPTS} attempts; returning best-effort layout.`);
    } else {
      console.warn('[Dungeon Generator] Generated dungeon failed validation, regenerating...');
      return generateDungeonMap(dungeonType, seed + 1, designVariant, attempt + 1);
    }
  }

  // CRITICAL: Ensure dungeon has walls (at least 20% of cells should be walls)
  let wallCount = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === 0) wallCount++;
    }
  }
  const wallPercent = (wallCount / (width * height)) * 100;
  if (wallPercent < 20 && attempt < MAX_ATTEMPTS) {
    console.error(`[Dungeon Generator] CRITICAL: Generated dungeon has only ${wallPercent.toFixed(1)}% walls (minimum 20% required). Regenerating...`);
    // Retry with different seed
    return generateDungeonMap(dungeonType, seed + 1, designVariant, attempt + 1);
  }

  // Build corridors list
  const corridors = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === 1) { // Corridor
        const distance = calculateDistance(x, y, entrance.x, entrance.y);
        let depth = 0;
        for (const zone of depthZones) {
          if (distance >= zone.minDistance && distance <= zone.maxDistance) {
            depth = zone.depth;
            break;
          }
        }
        corridors.push({
          from: { x, y },
          to: { x, y },
          depth
        });
      }
    }
  }

  return {
    width,
    height,
    grid,
    rooms,
    corridors,
    entrance,
    bossRoom: finalBossRoom,
    depthZones,
    designVariant: variant,
    algorithm
  };
}

module.exports = {
  generateDungeonMap,
  DUNGEON_SIZE_CONFIG,
  DUNGEON_VARIANTS,
  getSeed,
  // Exported for testing / reuse
  computeReachable,
  validateDungeon,
  repairConnectivity,
  isFloor
};

