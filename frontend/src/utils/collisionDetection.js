/**
 * Collision Detection Utilities
 * Frontend utilities for checking collision and movement restrictions
 */

/**
 * Collision cell types (must match backend)
 */
export const COLLISION_TYPES = {
  WALKABLE: 0,
  WALL: 1,
  DOOR: 2,
  LOCKED_DOOR: 3,
  RESTRICTED: 4
};

/**
 * Check if movement to position is allowed
 * @param {Object} collisionMap - Collision map from submap
 * @param {number} currentX - Current X coordinate (percentage 0-100)
 * @param {number} currentY - Current Y coordinate (percentage 0-100)
 * @param {number} targetX - Target X coordinate (percentage 0-100)
 * @param {number} targetY - Target Y coordinate (percentage 0-100)
 * @returns {Object} Result with allowed flag, reason, and door info
 */
export function canMoveTo(collisionMap, currentX, currentY, targetX, targetY) {
  // If no collision map, allow movement (backward compatibility)
  if (!collisionMap || !collisionMap.cells) {
    return { allowed: true, reason: 'no_collision_map' };
  }

  const resolution = collisionMap.resolution || 100;
  
  // Convert percentage to collision cell
  const targetCellX = Math.floor((targetX / 100) * resolution);
  const targetCellY = Math.floor((targetY / 100) * resolution);

  // Check bounds
  if (targetCellX < 0 || targetCellX >= resolution || 
      targetCellY < 0 || targetCellY >= resolution) {
    return { allowed: false, reason: 'out_of_bounds' };
  }

  const cellValue = collisionMap.cells[targetCellY][targetCellX];
  const door = getDoorAt(collisionMap, targetX, targetY);

  // SPECIAL CASE: If cell is marked as WALL but we found a door nearby,
  // treat it as a door (this handles cases where door position doesn't exactly match cell)
  if (cellValue === COLLISION_TYPES.WALL && door) {
    // Check if door is unlocked
    const isUnlocked = !door.locked;
    if (isUnlocked) {
      return {
        allowed: true,
        reason: 'door',
        door: door
      };
    } else {
      return {
        allowed: false,
        reason: 'locked_door',
        door: door
      };
    }
  }

  // Check collision type
  switch (cellValue) {
    case COLLISION_TYPES.WALKABLE:
      return { allowed: true, reason: 'walkable' };
    
    case COLLISION_TYPES.WALL:
      return { allowed: false, reason: 'wall' };
    
    case COLLISION_TYPES.DOOR:
      return { 
        allowed: true, 
        reason: 'door',
        door: door || null
      };
    
    case COLLISION_TYPES.LOCKED_DOOR:
      return { 
        allowed: false, 
        reason: 'locked_door',
        door: door || null
      };
    
    case COLLISION_TYPES.RESTRICTED:
      return { allowed: false, reason: 'restricted' };
    
    default:
      // Unknown value - allow for safety
      return { allowed: true, reason: 'unknown' };
  }
}

/**
 * Check if position is walkable
 * @param {Object} collisionMap - Collision map
 * @param {number} x - X coordinate (percentage)
 * @param {number} y - Y coordinate (percentage)
 * @returns {Object} Result with allowed flag and reason
 */
export function isWalkable(collisionMap, x, y) {
  return canMoveTo(collisionMap, x, y, x, y);
}

/**
 * Check if position intersects with a building
 * @param {Object} collisionMap - Collision map
 * @param {number} x - X coordinate (percentage)
 * @param {number} y - Y coordinate (percentage)
 * @returns {Object|null} Building info if intersection found
 */
export function intersectsBuilding(collisionMap, x, y) {
  const walkable = isWalkable(collisionMap, x, y);
  if (!walkable.allowed && walkable.reason === 'wall') {
    return { type: 'wall' };
  }
  return null;
}

/**
 * Get door at a specific position
 * @param {Object} collisionMap - Collision map
 * @param {number} x - X coordinate (percentage)
 * @param {number} y - Y coordinate (percentage)
 * @returns {Object|null} Door object if found
 */
export function getDoorAt(collisionMap, x, y) {
  if (!collisionMap || !collisionMap.doors) {
    return null;
  }

  const resolution = collisionMap.resolution || 100;
  const cellX = Math.floor((x / 100) * resolution);
  const cellY = Math.floor((y / 100) * resolution);

  // First, try exact match
  let door = collisionMap.doors.find(door => {
    return door.cellX === cellX && door.cellY === cellY;
  });

  // If no exact match, try with tolerance (check adjacent cells)
  if (!door) {
    door = collisionMap.doors.find(door => {
      const dx = Math.abs(door.cellX - cellX);
      const dy = Math.abs(door.cellY - cellY);
      // Allow 2-cell tolerance for door detection
      return dx <= 2 && dy <= 2;
    });
  }

  // If still no match, try matching by position (percentage coordinates)
  if (!door) {
    door = collisionMap.doors.find(door => {
      if (!door.position) return false;
      const dx = Math.abs(door.position.x - x);
      const dy = Math.abs(door.position.y - y);
      // Allow 2% tolerance for position-based matching
      return dx <= 2 && dy <= 2;
    });
  }

  return door || null;
}

/**
 * Find nearest walkable position
 * @param {Object} collisionMap - Collision map
 * @param {number} x - X coordinate (percentage)
 * @param {number} y - Y coordinate (percentage)
 * @param {number} radius - Search radius in percentage points
 * @returns {Object|null} Nearest walkable position or null
 */
export function findNearestWalkable(collisionMap, x, y, radius = 5) {
  if (!collisionMap || !collisionMap.cells) {
    return { x, y }; // Return original if no collision map
  }

  const stepSize = 1; // Search in 1% increments

  // Spiral search outward from center
  for (let r = 0; r <= radius; r += stepSize) {
    for (let angle = 0; angle < 360; angle += 15) {
      const rad = (angle * Math.PI) / 180;
      const checkX = x + r * Math.cos(rad);
      const checkY = y + r * Math.sin(rad);

      // Clamp to bounds
      const clampedX = Math.max(0, Math.min(100, checkX));
      const clampedY = Math.max(0, Math.min(100, checkY));

      const walkable = isWalkable(collisionMap, clampedX, clampedY);
      if (walkable.allowed && walkable.reason !== 'locked_door') {
        return { x: clampedX, y: clampedY };
      }
    }
  }

  return null; // No walkable position found
}

/**
 * Check if path is clear between two points
 * @param {Object} collisionMap - Collision map
 * @param {number} startX - Start X (percentage)
 * @param {number} startY - Start Y (percentage)
 * @param {number} endX - End X (percentage)
 * @param {number} endY - End Y (percentage)
 * @param {number} stepSize - Step size for line check (percentage)
 * @returns {Object} Result with allowed flag and blocking info
 */
export function isPathClear(collisionMap, startX, startY, endX, endY, stepSize = 0.5) {
  if (!collisionMap || !collisionMap.cells) {
    return { allowed: true, reason: 'no_collision_map' };
  }

  const dx = endX - startX;
  const dy = endY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(distance / stepSize);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const checkX = startX + dx * t;
    const checkY = startY + dy * t;

    const walkable = isWalkable(collisionMap, checkX, checkY);
    if (!walkable.allowed && walkable.reason !== 'door') {
      return {
        allowed: false,
        reason: walkable.reason,
        blockedAt: { x: checkX, y: checkY },
        door: walkable.door
      };
    }
  }

  return { allowed: true, reason: 'clear' };
}

/**
 * Update door state in collision map (for client-side updates)
 * @param {Object} collisionMap - Collision map
 * @param {string} doorId - Door ID to update
 * @param {boolean} locked - New locked state
 * @returns {Object} Updated collision map
 */
export function updateDoorState(collisionMap, doorId, locked) {
  if (!collisionMap || !collisionMap.doors || !collisionMap.cells) {
    return collisionMap;
  }

  const door = collisionMap.doors.find(d => d.id === doorId);
  if (!door) {
    return collisionMap;
  }

  // Update door state
  door.locked = locked;

  // Update collision map cell
  const collisionType = locked 
    ? COLLISION_TYPES.LOCKED_DOOR
    : COLLISION_TYPES.DOOR;
  
  if (door.cellY >= 0 && door.cellY < collisionMap.cells.length &&
      door.cellX >= 0 && door.cellX < collisionMap.cells[door.cellY].length) {
    collisionMap.cells[door.cellY][door.cellX] = collisionType;
  }

  return collisionMap;
}

