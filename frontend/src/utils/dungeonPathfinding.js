/**
 * Dungeon Pathfinding
 * A* pathfinding for dungeon grid-based movement
 */

/**
 * Check if a cell is navigable (not a wall)
 * @param {Array} grid - 2D array representing dungeon grid
 * @param {number} x - Grid X coordinate
 * @param {number} y - Grid Y coordinate
 * @returns {boolean} True if cell is navigable
 */
export function isNavigable(grid, x, y) {
  if (!grid || !Array.isArray(grid) || grid.length === 0) return false;
  if (y < 0 || y >= grid.length) return false;
  if (x < 0 || x >= grid[y].length) return false;
  
  const cellValue = grid[y][x];
  // Cell values: 0 = wall (impassable), 1 = corridor (navigable), 2 = room (navigable), 
  // 3 = entrance (navigable), 4 = boss room (navigable), 5 = treasure cache (navigable)
  // All except 0 are navigable
  return cellValue !== 0;
}

/**
 * Get neighbors of a cell (up, down, left, right)
 * @param {Array} grid - 2D array representing dungeon grid
 * @param {number} x - Grid X coordinate
 * @param {number} y - Grid Y coordinate
 * @returns {Array} Array of {x, y} neighbor coordinates
 */
export function getNeighbors(grid, x, y) {
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
    if (isNavigable(grid, nx, ny)) {
      neighbors.push({ x: nx, y: ny });
    }
  }

  return neighbors;
}

/**
 * Convert percentage coordinates (0-100) to grid coordinates
 * @param {number} percentX - X coordinate as percentage (0-100)
 * @param {number} percentY - Y coordinate as percentage (0-100)
 * @param {number} gridWidth - Grid width in cells
 * @param {number} gridHeight - Grid height in cells
 * @returns {Object} Grid coordinates {x, y}
 */
export function percentToGrid(percentX, percentY, gridWidth, gridHeight) {
  const gridX = Math.floor((percentX / 100) * gridWidth);
  const gridY = Math.floor((percentY / 100) * gridHeight);
  return {
    x: Math.max(0, Math.min(gridWidth - 1, gridX)),
    y: Math.max(0, Math.min(gridHeight - 1, gridY))
  };
}

/**
 * Convert grid coordinates to percentage coordinates (0-100)
 * @param {number} gridX - Grid X coordinate
 * @param {number} gridY - Grid Y coordinate
 * @param {number} gridWidth - Grid width in cells
 * @param {number} gridHeight - Grid height in cells
 * @returns {Object} Percentage coordinates {x, y}
 */
export function gridToPercent(gridX, gridY, gridWidth, gridHeight) {
  const percentX = ((gridX + 0.5) / gridWidth) * 100;
  const percentY = ((gridY + 0.5) / gridHeight) * 100;
  return {
    x: Math.max(0, Math.min(100, percentX)),
    y: Math.max(0, Math.min(100, percentY))
  };
}

/**
 * Heuristic function for A* (Manhattan distance)
 */
function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * A* pathfinding for dungeon grid
 * @param {Array} grid - 2D array representing dungeon grid
 * @param {Object} start - Start point in grid coordinates {x, y}
 * @param {Object} end - End point in grid coordinates {x, y}
 * @returns {Array} Path as array of grid coordinates, or null if no path found
 */
export function findDungeonPath(grid, start, end) {
  if (!grid || !Array.isArray(grid) || grid.length === 0) {
    console.warn('[Dungeon Pathfinding] Grid is invalid');
    return null;
  }
  
  const gridHeight = grid.length;
  const gridWidth = grid[0]?.length || 0;
  
  if (gridWidth === 0) {
    console.warn('[Dungeon Pathfinding] Grid width is 0');
    return null;
  }

  // Validate start and end points are within bounds
  if (start.x < 0 || start.x >= gridWidth || start.y < 0 || start.y >= gridHeight) {
    console.warn(`[Dungeon Pathfinding] Start point (${start.x}, ${start.y}) is out of bounds (${gridWidth}x${gridHeight})`);
    return null;
  }
  
  if (end.x < 0 || end.x >= gridWidth || end.y < 0 || end.y >= gridHeight) {
    console.warn(`[Dungeon Pathfinding] End point (${end.x}, ${end.y}) is out of bounds (${gridWidth}x${gridHeight})`);
    return null;
  }

  // Validate start and end points are navigable
  const startValue = grid[start.y]?.[start.x];
  const endValue = grid[end.y]?.[end.x];
  
  if (!isNavigable(grid, start.x, start.y)) {
    console.warn(`[Dungeon Pathfinding] Start point (${start.x}, ${start.y}) is not navigable (value: ${startValue})`);
    return null;
  }
  
  if (!isNavigable(grid, end.x, end.y)) {
    console.warn(`[Dungeon Pathfinding] End point (${end.x}, ${end.y}) is not navigable (value: ${endValue})`);
    return null;
  }

  // If start and end are the same, return single point
  if (start.x === end.x && start.y === end.y) {
    return [start];
  }
  
  // If start and end are adjacent, return direct path
  const dx = Math.abs(start.x - end.x);
  const dy = Math.abs(start.y - end.y);
  if (dx <= 1 && dy <= 1 && (dx + dy) === 1) {
    // Adjacent cells - check if direct path is possible
    return [start, end];
  }

  // A* algorithm
  const openSet = new Set([`${start.x},${start.y}`]);
  const closedSet = new Set();
  const cameFrom = new Map();
  const gScore = new Map(); // Cost from start
  const fScore = new Map(); // Estimated total cost

  // Initialize scores
  gScore.set(`${start.x},${start.y}`, 0);
  fScore.set(`${start.x},${start.y}`, heuristic(start, end));

  let iterations = 0;
  const maxIterations = gridWidth * gridHeight * 2; // Safety limit
  
  while (openSet.size > 0 && iterations < maxIterations) {
    iterations++;
    
    // Find node in openSet with lowest fScore
    let current = null;
    let lowestF = Infinity;
    for (const key of openSet) {
      const f = fScore.get(key) ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        current = key;
      }
    }

    if (!current) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Dungeon Pathfinding] No current node found in openSet');
      }
      break;
    }

    const [currentX, currentY] = current.split(',').map(Number);
    
    // Validate current node is navigable (safety check)
    if (!isNavigable(grid, currentX, currentY)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Dungeon Pathfinding] Current node (${currentX}, ${currentY}) is not navigable, skipping`);
      }
      openSet.delete(current);
      closedSet.add(current);
      continue;
    }
    
    // Check if we reached the goal
    if (currentX === end.x && currentY === end.y) {
      // Reconstruct path
      const path = [];
      let node = current;
      while (node) {
        const [x, y] = node.split(',').map(Number);
        path.unshift({ x, y });
        node = cameFrom.get(node);
      }
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Dungeon Pathfinding] Path found: ${path.length} steps, ${iterations} iterations`);
      }
      return path;
    }

    openSet.delete(current);
    closedSet.add(current);

    // Check neighbors
    const neighbors = getNeighbors(grid, currentX, currentY);
    
    // Debug: Log if no neighbors found (might indicate disconnected region)
    if (neighbors.length === 0 && process.env.NODE_ENV === 'development') {
      console.warn(`[Dungeon Pathfinding] No navigable neighbors found at (${currentX}, ${currentY}), cell value: ${grid[currentY]?.[currentX]}`);
    }
    
    // CRITICAL: If no neighbors, we're in a dead end - continue to next node
    if (neighbors.length === 0) {
      continue;
    }
    
    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.x},${neighbor.y}`;
      
      // Skip if already processed
      if (closedSet.has(neighborKey)) continue;

      // NOTE: use ?? not || — the start node has gScore 0, and `0 || Infinity`
      // is Infinity, which poisons every neighbor's score and breaks A*.
      const currentG = gScore.get(current) ?? Infinity;
      const tentativeG = currentG + 1; // Each step costs 1

      // If neighbor not in open set, add it
      if (!openSet.has(neighborKey)) {
        openSet.add(neighborKey);
        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentativeG);
        fScore.set(neighborKey, tentativeG + heuristic(neighbor, end));
      } else {
        // Neighbor already in open set - check if this path is better
        const existingG = gScore.get(neighborKey) ?? Infinity;
        if (tentativeG < existingG) {
          // This path is better - update it
          cameFrom.set(neighborKey, current);
          gScore.set(neighborKey, tentativeG);
          fScore.set(neighborKey, tentativeG + heuristic(neighbor, end));
        }
      }
    }
    
    // Safety check: prevent infinite loops
    if (closedSet.size > gridWidth * gridHeight) {
      console.error('[Dungeon Pathfinding] Pathfinding exceeded grid size - possible infinite loop');
      break;
    }
  }

  // No path found - log diagnostic info
  if (process.env.NODE_ENV === 'development') {
    console.warn('[Dungeon Pathfinding] No path found', {
      from: start,
      to: end,
      fromValue: grid[start.y]?.[start.x],
      toValue: grid[end.y]?.[end.x],
      nodesExplored: closedSet.size,
      gridSize: `${gridWidth}x${gridHeight}`
    });
  }
  
  return null;
}

/**
 * Find nearest navigable cell to a given point
 * @param {Array} grid - 2D array representing dungeon grid
 * @param {number} x - Grid X coordinate
 * @param {number} y - Grid Y coordinate
 * @param {number} maxDistance - Maximum distance to search
 * @returns {Object} Nearest navigable cell {x, y} or null
 */
export function findNearestNavigable(grid, x, y, maxDistance = 5) {
  if (isNavigable(grid, x, y)) {
    return { x, y };
  }

  // Spiral search for nearest navigable cell
  for (let distance = 1; distance <= maxDistance; distance++) {
    for (let dx = -distance; dx <= distance; dx++) {
      for (let dy = -distance; dy <= distance; dy++) {
        if (Math.abs(dx) === distance || Math.abs(dy) === distance) {
          const nx = x + dx;
          const ny = y + dy;
          if (isNavigable(grid, nx, ny)) {
            return { x: nx, y: ny };
          }
        }
      }
    }
  }

  return null;
}

/**
 * Smooth path by removing unnecessary waypoints
 * @param {Array} path - Path as array of {x, y} coordinates
 * @param {Array} grid - 2D array representing dungeon grid
 * @returns {Array} Smoothed path
 */
export function smoothDungeonPath(path, grid) {
  if (!path || path.length <= 2) return path;

  const smoothed = [path[0]];
  
  for (let i = 1; i < path.length - 1; i++) {
    const prev = smoothed[smoothed.length - 1];
    const next = path[i + 1];
    
    // Check if we can skip this point (direct line is navigable)
    if (!canMoveDirectly(grid, prev, next)) {
      smoothed.push(path[i]);
    }
  }
  
  smoothed.push(path[path.length - 1]);
  return smoothed;
}

/**
 * Check if we can move directly from point A to point B
 * (simplified - just checks if both points are navigable)
 */
function canMoveDirectly(grid, a, b) {
  // For now, just check if both endpoints are navigable
  // A more sophisticated version would check the line between them
  return isNavigable(grid, a.x, a.y) && isNavigable(grid, b.x, b.y);
}

