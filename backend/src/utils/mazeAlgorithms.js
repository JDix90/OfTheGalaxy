/**
 * Maze Generation Algorithms
 * Multiple algorithms for generating varied dungeon layouts
 */

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
 * Get neighbors of a cell (up, down, left, right)
 */
function getNeighbors(x, y, width, height) {
  const neighbors = [];
  const directions = [
    { dx: 0, dy: -1 }, // Up
    { dx: 1, dy: 0 },  // Right
    { dx: 0, dy: 1 },  // Down
    { dx: -1, dy: 0 }  // Left
  ];

  for (const dir of directions) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      neighbors.push({ x: nx, y: ny });
    }
  }

  return neighbors;
}

/**
 * Get cell key for Map/Set
 */
function cellKey(x, y) {
  return `${x},${y}`;
}

/**
 * Recursive Backtracking Algorithm
 * Creates a perfect maze with one solution path
 * Uses a checkerboard pattern where we only carve odd cells (to create walls between)
 */
function recursiveBacktracking(width, height, seed) {
  const random = seededRandom(seed);
  // Initialize as all walls
  const grid = Array(height).fill(null).map(() => Array(width).fill(0)); // 0 = wall
  
  // We'll work with a "cell grid" that's half the size (only odd coordinates)
  // This creates walls between cells naturally
  const cellWidth = Math.floor((width - 1) / 2);
  const cellHeight = Math.floor((height - 1) / 2);
  
  if (cellWidth < 1 || cellHeight < 1) {
    // If too small, just return a simple corridor
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (x % 2 === 1 && y % 2 === 1) {
          grid[y][x] = 1; // Corridor
        }
      }
    }
    return grid;
  }

  const visited = new Set();
  const stack = [];

  // Start from top edge (odd coordinates only)
  const startCellX = Math.floor(random() * cellWidth);
  const startCellY = 0;
  const startX = startCellX * 2 + 1;
  const startY = startCellY * 2 + 1;
  
  grid[startY][startX] = 1; // 1 = corridor
  visited.add(cellKey(startCellX, startCellY));
  stack.push({ x: startCellX, y: startCellY });

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    
    // Get neighbors in cell space (adjacent cells)
    const cellNeighbors = [];
    const directions = [
      { dx: 0, dy: -1 }, // Up
      { dx: 1, dy: 0 },  // Right
      { dx: 0, dy: 1 },  // Down
      { dx: -1, dy: 0 }  // Left
    ];
    
    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      if (nx >= 0 && nx < cellWidth && ny >= 0 && ny < cellHeight) {
        const neighborKey = cellKey(nx, ny);
        if (!visited.has(neighborKey)) {
          cellNeighbors.push({ x: nx, y: ny });
        }
      }
    }

    if (cellNeighbors.length > 0) {
      const next = cellNeighbors[Math.floor(random() * cellNeighbors.length)];
      
      // Convert cell coordinates to grid coordinates
      const currentGridX = current.x * 2 + 1;
      const currentGridY = current.y * 2 + 1;
      const nextGridX = next.x * 2 + 1;
      const nextGridY = next.y * 2 + 1;
      
      // Carve path between current and next (including the wall between them)
      const wallX = currentGridX + (nextGridX - currentGridX) / 2;
      const wallY = currentGridY + (nextGridY - currentGridY) / 2;
      
      grid[wallY][wallX] = 1; // Carve through wall
      grid[nextGridY][nextGridX] = 1; // Carve destination cell
      
      visited.add(cellKey(next.x, next.y));
      stack.push(next);
    } else {
      stack.pop();
    }
  }

  return grid;
}

/**
 * Prim's Algorithm
 * Creates a more open maze with multiple solution paths
 * Uses checkerboard pattern for proper wall structure
 */
function primsAlgorithm(width, height, seed) {
  const random = seededRandom(seed);
  // Initialize as all walls
  const grid = Array(height).fill(null).map(() => Array(width).fill(0)); // 0 = wall
  
  // Work with cell grid (odd coordinates only)
  const cellWidth = Math.floor((width - 1) / 2);
  const cellHeight = Math.floor((height - 1) / 2);
  
  if (cellWidth < 1 || cellHeight < 1) {
    // If too small, just return a simple corridor
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (x % 2 === 1 && y % 2 === 1) {
          grid[y][x] = 1; // Corridor
        }
      }
    }
    return grid;
  }

  const walls = [];
  const inMaze = new Set();

  // Start from top edge (odd coordinates)
  const startCellX = Math.floor(random() * cellWidth);
  const startCellY = 0;
  const startX = startCellX * 2 + 1;
  const startY = startCellY * 2 + 1;
  
  grid[startY][startX] = 1; // 1 = corridor
  inMaze.add(cellKey(startCellX, startCellY));

  // Add walls of starting cell (in cell space)
  const directions = [
    { dx: 0, dy: -1 }, // Up
    { dx: 1, dy: 0 },  // Right
    { dx: 0, dy: 1 },  // Down
    { dx: -1, dy: 0 }  // Left
  ];
  
  for (const dir of directions) {
    const nx = startCellX + dir.dx;
    const ny = startCellY + dir.dy;
    if (nx >= 0 && nx < cellWidth && ny >= 0 && ny < cellHeight) {
      walls.push({ cellX: nx, cellY: ny, from: { x: startCellX, y: startCellY } });
    }
  }

  while (walls.length > 0) {
    const wallIndex = Math.floor(random() * walls.length);
    const wall = walls.splice(wallIndex, 1)[0];
    const wallKey = cellKey(wall.cellX, wall.cellY);

    if (!inMaze.has(wallKey)) {
      // Convert to grid coordinates
      const wallGridX = wall.cellX * 2 + 1;
      const wallGridY = wall.cellY * 2 + 1;
      const fromGridX = wall.from.x * 2 + 1;
      const fromGridY = wall.from.y * 2 + 1;
      
      // Carve path (wall between and destination)
      const betweenX = fromGridX + (wallGridX - fromGridX) / 2;
      const betweenY = fromGridY + (wallGridY - fromGridY) / 2;
      
      grid[betweenY][betweenX] = 1; // Carve through wall
      grid[wallGridY][wallGridX] = 1; // Carve destination
      inMaze.add(wallKey);

      // Add new walls (in cell space)
      for (const dir of directions) {
        const nx = wall.cellX + dir.dx;
        const ny = wall.cellY + dir.dy;
        if (nx >= 0 && nx < cellWidth && ny >= 0 && ny < cellHeight) {
          const neighborKey = cellKey(nx, ny);
          if (!inMaze.has(neighborKey)) {
            walls.push({ cellX: nx, cellY: ny, from: { x: wall.cellX, y: wall.cellY } });
          }
        }
      }
    }
  }

  return grid;
}

/**
 * Kruskal's Algorithm
 * Creates a highly interconnected maze
 * Uses checkerboard pattern for proper wall structure
 */
function kruskalsAlgorithm(width, height, seed) {
  const random = seededRandom(seed);
  // Initialize as all walls
  const grid = Array(height).fill(null).map(() => Array(width).fill(0)); // 0 = wall
  
  // Work with cell grid (odd coordinates only)
  const cellWidth = Math.floor((width - 1) / 2);
  const cellHeight = Math.floor((height - 1) / 2);
  
  if (cellWidth < 1 || cellHeight < 1) {
    // If too small, just return a simple corridor
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (x % 2 === 1 && y % 2 === 1) {
          grid[y][x] = 1; // Corridor
        }
      }
    }
    return grid;
  }

  const edges = [];
  const parent = new Map();
  const rank = new Map();

  // Initialize union-find for cell grid
  for (let cy = 0; cy < cellHeight; cy++) {
    for (let cx = 0; cx < cellWidth; cx++) {
      const key = cellKey(cx, cy);
      parent.set(key, key);
      rank.set(key, 0);
    }
  }

  // Find with path compression
  function find(key) {
    if (parent.get(key) !== key) {
      parent.set(key, find(parent.get(key)));
    }
    return parent.get(key);
  }

  // Union by rank
  function union(key1, key2) {
    const root1 = find(key1);
    const root2 = find(key2);
    if (root1 === root2) return false;

    if (rank.get(root1) < rank.get(root2)) {
      parent.set(root1, root2);
    } else if (rank.get(root1) > rank.get(root2)) {
      parent.set(root2, root1);
    } else {
      parent.set(root2, root1);
      rank.set(root1, rank.get(root1) + 1);
    }
    return true;
  }

  // Create all possible edges between cells
  for (let cy = 0; cy < cellHeight; cy++) {
    for (let cx = 0; cx < cellWidth; cx++) {
      if (cx < cellWidth - 1) {
        edges.push({ from: { x: cx, y: cy }, to: { x: cx + 1, y: cy } });
      }
      if (cy < cellHeight - 1) {
        edges.push({ from: { x: cx, y: cy }, to: { x: cx, y: cy + 1 } });
      }
    }
  }

  // Shuffle edges
  for (let i = edges.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [edges[i], edges[j]] = [edges[j], edges[i]];
  }

  // Process edges
  for (const edge of edges) {
    const fromKey = cellKey(edge.from.x, edge.from.y);
    const toKey = cellKey(edge.to.x, edge.to.y);

    if (union(fromKey, toKey)) {
      // Convert cell coordinates to grid coordinates
      const fromGridX = edge.from.x * 2 + 1;
      const fromGridY = edge.from.y * 2 + 1;
      const toGridX = edge.to.x * 2 + 1;
      const toGridY = edge.to.y * 2 + 1;
      
      // Carve cells and wall between
      grid[fromGridY][fromGridX] = 1;
      grid[toGridY][toGridX] = 1;
      
      // Carve path between (wall)
      const midX = fromGridX + (toGridX - fromGridX) / 2;
      const midY = fromGridY + (toGridY - fromGridY) / 2;
      if (midX >= 0 && midX < width && midY >= 0 && midY < height) {
        grid[midY][midX] = 1;
      }
    }
  }

  return grid;
}

/**
 * Hybrid Algorithm
 * Combines room placement with maze generation
 */
function hybridAlgorithm(width, height, seed, roomCount = 8) {
  const random = seededRandom(seed);
  const grid = Array(height).fill(null).map(() => Array(width).fill(0)); // 0 = wall

  // Place rooms first
  const rooms = [];
  const minRoomSize = 3;
  const maxRoomSize = 5;

  for (let i = 0; i < roomCount; i++) {
    let attempts = 0;
    let placed = false;

    while (!placed && attempts < 50) {
      const roomWidth = minRoomSize + Math.floor(random() * (maxRoomSize - minRoomSize + 1));
      const roomHeight = minRoomSize + Math.floor(random() * (maxRoomSize - minRoomSize + 1));
      const x = 1 + Math.floor(random() * (width - roomWidth - 2));
      const y = 1 + Math.floor(random() * (height - roomHeight - 2));

      // Check if room overlaps with existing rooms or is too close to edge
      let overlaps = false;
      if (x < 1 || y < 1 || x + roomWidth >= width - 1 || y + roomHeight >= height - 1) {
        overlaps = true;
      }
      for (const room of rooms) {
        if (!(x + roomWidth + 2 < room.x || x > room.x + room.width + 2 ||
              y + roomHeight + 2 < room.y || y > room.y + room.height + 2)) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        // Place room
        for (let ry = y; ry < y + roomHeight; ry++) {
          for (let rx = x; rx < x + roomWidth; rx++) {
            grid[ry][rx] = 2; // 2 = room
          }
        }
        rooms.push({ x, y, width: roomWidth, height: roomHeight });
        placed = true;
      }
      attempts++;
    }
  }

  // Connect rooms with corridors using Prim's-like algorithm
  const roomCenters = rooms.map(r => ({
    x: Math.floor(r.x + r.width / 2),
    y: Math.floor(r.y + r.height / 2)
  }));

  // Add entrance room at top
  const entranceX = Math.floor(width / 2);
  const entranceY = 0;
  grid[entranceY][entranceX] = 3; // 3 = entrance
  roomCenters.unshift({ x: entranceX, y: entranceY });

  // Connect all rooms
  const connected = new Set([0]); // Start with entrance
  const unconnected = new Set(Array.from({ length: roomCenters.length - 1 }, (_, i) => i + 1));

  while (unconnected.size > 0) {
    let minDist = Infinity;
    let bestFrom = -1;
    let bestTo = -1;

    for (const fromIdx of connected) {
      for (const toIdx of unconnected) {
        const dist = Math.abs(roomCenters[fromIdx].x - roomCenters[toIdx].x) +
                     Math.abs(roomCenters[fromIdx].y - roomCenters[toIdx].y);
        if (dist < minDist) {
          minDist = dist;
          bestFrom = fromIdx;
          bestTo = toIdx;
        }
      }
    }

    // Carve corridor
    const from = roomCenters[bestFrom];
    const to = roomCenters[bestTo];

    // Horizontal first, then vertical
    for (let x = Math.min(from.x, to.x); x <= Math.max(from.x, to.x); x++) {
      if (grid[from.y][x] === 0) grid[from.y][x] = 1; // Corridor
    }
    for (let y = Math.min(from.y, to.y); y <= Math.max(from.y, to.y); y++) {
      if (grid[y][to.x] === 0) grid[y][to.x] = 1; // Corridor
    }

    connected.add(bestTo);
    unconnected.delete(bestTo);
  }

  // Fill remaining walls and ensure proper cell types
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] !== 2 && grid[y][x] !== 3) {
        // Check if this should be a corridor (adjacent to room or other corridor)
        const neighbors = getNeighbors(x, y, width, height);
        const hasRoomOrCorridor = neighbors.some(n => {
          const val = grid[n.y][n.x];
          return val === 2 || val === 3 || val === 1;
        });
        if (hasRoomOrCorridor && grid[y][x] === 0) {
          grid[y][x] = 1; // Make it a corridor
        } else if (!hasRoomOrCorridor) {
          grid[y][x] = 0; // Keep as wall
        }
      }
    }
  }

  return { grid, rooms };
}

/**
 * Select algorithm based on dungeon type and variant
 */
function selectAlgorithm(dungeonType, designVariant, seed) {
  const random = seededRandom(seed);
  const algorithmMap = {
    linear_branching: 'recursive_backtracking',
    circular_hub: 'prims',
    grid_perfect: 'recursive_backtracking',
    room_corridor: 'hybrid',
    spiral_depth: 'prims'
  };

  const algorithmName = algorithmMap[designVariant] || 'recursive_backtracking';
  return algorithmName;
}

/**
 * Generate maze using selected algorithm
 */
function generateMaze(width, height, algorithm, seed) {
  switch (algorithm) {
    case 'recursive_backtracking':
      return recursiveBacktracking(width, height, seed);
    case 'prims':
      return primsAlgorithm(width, height, seed);
    case 'kruskal':
      return kruskalsAlgorithm(width, height, seed);
    case 'hybrid':
      return hybridAlgorithm(width, height, seed);
    default:
      return recursiveBacktracking(width, height, seed);
  }
}

module.exports = {
  recursiveBacktracking,
  primsAlgorithm,
  kruskalsAlgorithm,
  hybridAlgorithm,
  selectAlgorithm,
  generateMaze,
  getNeighbors,
  cellKey
};

