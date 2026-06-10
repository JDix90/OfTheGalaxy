/**
 * Collision Map Service
 * Generates and manages collision maps for submap layouts
 * Handles building walls, doors, and walkable areas
 */

class CollisionMapService {
  /**
   * Collision cell types
   */
  static COLLISION_TYPES = {
    WALKABLE: 0,      // Open area, walkable
    WALL: 1,          // Building wall, impassable
    DOOR: 2,          // Unlocked door, passable
    LOCKED_DOOR: 3,   // Locked door, impassable until unlocked
    RESTRICTED: 4     // Restricted area (future use)
  };

  /**
   * Generate collision map from submap layout
   * @param {Object} subMap - Submap object with layoutData
   * @param {Object} options - Options for generation
   * @returns {Object} Collision map object
   */
  generateCollisionMap(subMap, options = {}) {
    const {
      resolution = 100,  // 100x100 grid for percentage-based maps
      includeDoors = true,
      includeWalls = true
    } = options;

    const layout = subMap.layoutData || subMap.layout || {};
    const buildings = layout.buildings || [];
    const zones = layout.zones || [];
    const mapWidth = layout.width || 15;
    const mapHeight = layout.height || 15;

    // Initialize collision map (all walkable by default)
    const cells = Array(resolution).fill(null).map(() => 
      Array(resolution).fill(this.constructor.COLLISION_TYPES.WALKABLE)
    );

    // Store door information separately for quick lookup
    const doors = [];

    // Process buildings to mark walls and doors
    if (includeWalls && buildings.length > 0) {
      buildings.forEach(building => {
        const collisionData = this._processBuilding(
          building,
          mapWidth,
          mapHeight,
          resolution,
          includeDoors
        );

        // Mark walls in collision map
        collisionData.walls.forEach(wall => {
          if (wall.x >= 0 && wall.x < resolution && wall.y >= 0 && wall.y < resolution) {
            cells[wall.y][wall.x] = this.constructor.COLLISION_TYPES.WALL;
          }
        });

        // Collect doors
        if (collisionData.doors) {
          collisionData.doors.forEach(door => {
            doors.push({
              ...door,
              buildingId: building.id,
              buildingName: building.name
            });
          });
        }
      });
    }

    // Mark doors in collision map
    if (includeDoors) {
      doors.forEach(door => {
        const doorX = door.cellX;
        const doorY = door.cellY;
        if (doorX >= 0 && doorX < resolution && doorY >= 0 && doorY < resolution) {
          const collisionType = door.locked 
            ? this.constructor.COLLISION_TYPES.LOCKED_DOOR
            : this.constructor.COLLISION_TYPES.DOOR;
          cells[doorY][doorX] = collisionType;
        }
      });
    }

    // Process furniture for building interiors (mark as walls/obstacles)
    const furniture = layout.furniture || [];
    if (furniture.length > 0) {
      furniture.forEach(item => {
        const itemPos = item.position || {};
        const itemSize = item.size || { width: 1, height: 1 };
        
        // Convert furniture position to collision map coordinates
        const startX = Math.floor((itemPos.x / mapWidth) * resolution);
        const startY = Math.floor((itemPos.y / mapHeight) * resolution);
        const endX = Math.floor(((itemPos.x + itemSize.width) / mapWidth) * resolution);
        const endY = Math.floor(((itemPos.y + itemSize.height) / mapHeight) * resolution);
        
        // Mark furniture area as wall (impassable)
        for (let y = startY; y <= endY && y < resolution; y++) {
          for (let x = startX; x <= endX && x < resolution; x++) {
            if (x >= 0 && y >= 0) {
              cells[y][x] = this.constructor.COLLISION_TYPES.WALL;
            }
          }
        }
      });
    }

    // Process interactive elements (some may be obstacles)
    const interactiveElements = layout.interactiveElements || [];
    if (interactiveElements.length > 0) {
      interactiveElements.forEach(element => {
        // Storage containers and vendors are obstacles (can't walk through them)
        if (element.type === 'storage' || element.type === 'vendor') {
          const elemPos = element.position || {};
          const elemSize = element.size || { width: 1, height: 1 };
          
          const startX = Math.floor((elemPos.x / mapWidth) * resolution);
          const startY = Math.floor((elemPos.y / mapHeight) * resolution);
          const endX = Math.floor(((elemPos.x + elemSize.width) / mapWidth) * resolution);
          const endY = Math.floor(((elemPos.y + elemSize.height) / mapHeight) * resolution);
          
          for (let y = startY; y <= endY && y < resolution; y++) {
            for (let x = startX; x <= endX && x < resolution; x++) {
              if (x >= 0 && y >= 0 && x < resolution && y < resolution) {
                cells[y][x] = this.constructor.COLLISION_TYPES.WALL;
              }
            }
          }
        }
      });
    }

    return {
      resolution,
      cells,
      doors,
      mapWidth,
      mapHeight,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Process a single building to extract collision data
   * @private
   */
  _processBuilding(building, mapWidth, mapHeight, resolution, includeDoors) {
    const { position, size, entrance, collision } = building;
    
    // Convert building grid coordinates to collision grid cells
    const startX = Math.floor((position.x / mapWidth) * resolution);
    const startY = Math.floor((position.y / mapHeight) * resolution);
    const endX = Math.floor(((position.x + size.width) / mapWidth) * resolution);
    const endY = Math.floor(((position.y + size.height) / mapHeight) * resolution);

    const walls = [];
    const doors = [];
    let doorPositions = new Set(); // Track door positions to exclude from walls

    // First pass: identify door positions
    if (includeDoors) {
      if (collision && collision.doors) {
        for (const door of collision.doors) {
          const doorX = Math.floor((door.position.x / mapWidth) * resolution);
          const doorY = Math.floor((door.position.y / mapHeight) * resolution);
          doorPositions.add(`${doorX},${doorY}`);
          
          doors.push({
            id: door.id || `door_${building.id}_${doors.length}`,
            cellX: doorX,
            cellY: doorY,
            position: door.position,
            locked: door.locked !== undefined ? door.locked : false,
            lockLevel: door.lockLevel || 0,
            requiresKey: door.requiresKey || null,
            opensTo: door.opensTo || null,
            buildingId: building.id
          });
        }
      } else if (entrance) {
        // Use entrance position as door if no explicit door definition
        const entranceX = Math.floor((entrance.x / mapWidth) * resolution);
        const entranceY = Math.floor((entrance.y / mapHeight) * resolution);
        doorPositions.add(`${entranceX},${entranceY}`);
        
        doors.push({
          id: `door_${building.id}_entrance`,
          cellX: entranceX,
          cellY: entranceY,
          position: entrance,
          locked: false, // Default to unlocked if not specified
          lockLevel: 0,
          requiresKey: null,
          opensTo: building.subMapId || null,
          buildingId: building.id
        });
      }
    }

    // Second pass: mark all building cells as walls (perimeter AND interior)
    // This prevents players from walking through or into buildings
    // Doors are excluded and will be marked separately in the collision map
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        // Check if this exact position is a door (with small tolerance)
        let isDoor = false;
        for (const doorPos of doorPositions) {
          const [doorX, doorY] = doorPos.split(',').map(Number);
          // Allow 1-cell tolerance for door position
          if (Math.abs(x - doorX) <= 1 && Math.abs(y - doorY) <= 1) {
            isDoor = true;
            break;
          }
        }
        
        // Mark as wall if not a door and within bounds
        if (!isDoor && x >= 0 && x < resolution && y >= 0 && y < resolution) {
          walls.push({ x, y });
        }
      }
    }

    return { walls, doors };
  }

  /**
   * Check if a position is walkable
   * @param {Object} collisionMap - Collision map object
   * @param {number} x - X coordinate (percentage 0-100)
   * @param {number} y - Y coordinate (percentage 0-100)
   * @returns {Object} Result with allowed flag and details
   */
  isWalkable(collisionMap, x, y) {
    if (!collisionMap || !collisionMap.cells) {
      return { allowed: true, reason: 'no_collision_map' };
    }

    const resolution = collisionMap.resolution || 100;
    
    // Convert percentage to collision cell
    const cellX = Math.floor((x / 100) * resolution);
    const cellY = Math.floor((y / 100) * resolution);

    // Check bounds
    if (cellX < 0 || cellX >= resolution || cellY < 0 || cellY >= resolution) {
      return { allowed: false, reason: 'out_of_bounds' };
    }

    const cellValue = collisionMap.cells[cellY][cellX];
    const door = this.getDoorAt(collisionMap, x, y);

    // Check collision type
    switch (cellValue) {
      case this.constructor.COLLISION_TYPES.WALKABLE:
        return { allowed: true, reason: 'walkable' };
      
      case this.constructor.COLLISION_TYPES.WALL:
        return { allowed: false, reason: 'wall' };
      
      case this.constructor.COLLISION_TYPES.DOOR:
        return { 
          allowed: true, 
          reason: 'door',
          door: door
        };
      
      case this.constructor.COLLISION_TYPES.LOCKED_DOOR:
        return { 
          allowed: false, 
          reason: 'locked_door',
          door: door
        };
      
      case this.constructor.COLLISION_TYPES.RESTRICTED:
        return { allowed: false, reason: 'restricted' };
      
      default:
        return { allowed: true, reason: 'unknown' };
    }
  }

  /**
   * Check if a position intersects with a building
   * @param {Object} collisionMap - Collision map object
   * @param {number} x - X coordinate (percentage)
   * @param {number} y - Y coordinate (percentage)
   * @returns {Object|null} Building info if intersection found
   */
  intersectsBuilding(collisionMap, x, y) {
    // This would require building data to be stored in collision map
    // For now, we can check if it's a wall
    const walkable = this.isWalkable(collisionMap, x, y);
    if (!walkable.allowed && walkable.reason === 'wall') {
      return { type: 'wall' };
    }
    return null;
  }

  /**
   * Get door at a specific position
   * @param {Object} collisionMap - Collision map object
   * @param {number} x - X coordinate (percentage)
   * @param {number} y - Y coordinate (percentage)
   * @returns {Object|null} Door object if found
   */
  getDoorAt(collisionMap, x, y) {
    if (!collisionMap || !collisionMap.doors) {
      return null;
    }

    const resolution = collisionMap.resolution || 100;
    const cellX = Math.floor((x / 100) * resolution);
    const cellY = Math.floor((y / 100) * resolution);

    // Find door at this position (with small tolerance)
    return collisionMap.doors.find(door => {
      return Math.abs(door.cellX - cellX) <= 1 && Math.abs(door.cellY - cellY) <= 1;
    }) || null;
  }

  /**
   * Find nearest walkable position
   * @param {Object} collisionMap - Collision map object
   * @param {number} x - X coordinate (percentage)
   * @param {number} y - Y coordinate (percentage)
   * @param {number} radius - Search radius in percentage points
   * @returns {Object|null} Nearest walkable position or null
   */
  findNearestWalkable(collisionMap, x, y, radius = 5) {
    if (!collisionMap || !collisionMap.cells) {
      return { x, y }; // Return original if no collision map
    }

    const resolution = collisionMap.resolution || 100;
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

        const walkable = this.isWalkable(collisionMap, clampedX, clampedY);
        if (walkable.allowed && walkable.reason !== 'locked_door') {
          return { x: clampedX, y: clampedY };
        }
      }
    }

    return null; // No walkable position found
  }

  /**
   * Update door state in collision map
   * @param {Object} collisionMap - Collision map object
   * @param {string} doorId - Door ID to update
   * @param {boolean} locked - New locked state
   * @returns {Object} Updated collision map
   */
  updateDoorState(collisionMap, doorId, locked) {
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
      ? this.constructor.COLLISION_TYPES.LOCKED_DOOR
      : this.constructor.COLLISION_TYPES.DOOR;
    
    if (door.cellY >= 0 && door.cellY < collisionMap.cells.length &&
        door.cellX >= 0 && door.cellX < collisionMap.cells[door.cellY].length) {
      collisionMap.cells[door.cellY][door.cellX] = collisionType;
    }

    return collisionMap;
  }

  /**
   * Check if path is clear between two points
   * @param {Object} collisionMap - Collision map object
   * @param {number} startX - Start X (percentage)
   * @param {number} startY - Start Y (percentage)
   * @param {number} endX - End X (percentage)
   * @param {number} endY - End Y (percentage)
   * @param {number} stepSize - Step size for line check (percentage)
   * @returns {Object} Result with allowed flag and blocking info
   */
  isPathClear(collisionMap, startX, startY, endX, endY, stepSize = 0.5) {
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

      const walkable = this.isWalkable(collisionMap, checkX, checkY);
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
}

module.exports = new CollisionMapService();

