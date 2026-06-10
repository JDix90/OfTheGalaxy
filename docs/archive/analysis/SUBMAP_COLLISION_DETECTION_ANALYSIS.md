# Submap Collision Detection & Movement Restrictions
## Comprehensive Analysis & Implementation Plan

**Date:** December 2024  
**Status:** Analysis & Recommendations  
**Purpose:** Analyze current submap movement system and provide recommendations for implementing collision detection and movement restrictions

---

## Executive Summary

Currently, **dungeon submaps have collision detection** using a grid-based system, but **non-dungeon submaps (cities, buildings, etc.) allow free movement** - players can walk through walls and buildings. This document provides a comprehensive analysis and implementation plan to add proper collision detection for all submap types, enabling realistic movement restrictions and integration with the lockpicking system.

---

## 1. Current State Analysis

### 1.1 Dungeon Submaps ✅ (Has Collision)

**Current Implementation:**
- Uses **grid-based collision system**
- Grid values: `0` = wall (non-navigable), `1` = corridor, `2` = room
- Movement checks `isNavigable(grid, x, y)` before allowing movement
- Pathfinding system (`findDungeonPath`) respects walls
- **Movement is properly restricted**

**Code Location:**
- `frontend/src/pages/SubMapView.jsx` (lines 1547-1812)
- `frontend/src/utils/dungeonPathfinding.js`

**Key Functions:**
```javascript
// Checks if a grid cell is navigable
isNavigable(grid, x, y)

// Finds path avoiding walls
findDungeonPath(grid, start, end)

// Converts percentage to grid coordinates
percentToGrid(x, y, gridWidth, gridHeight)
```

### 1.2 Non-Dungeon Submaps ❌ (No Collision)

**Current Implementation:**
- Uses **percentage-based movement** (0-100 coordinates)
- Buildings are **rendered visually** but have **no collision data**
- Movement code explicitly allows free movement:
  ```javascript
  // For non-dungeon submaps, allow free movement (existing behavior)
  ```
- Players can walk through walls, buildings, and any visual element

**Code Location:**
- `frontend/src/pages/SubMapView.jsx` (lines 1812-1830)
- `frontend/src/utils/subMapRenderer.js` (drawBuildings function)

**Building Structure:**
```javascript
buildings: [
  {
    id: string,
    name: string,
    type: string,        // 'residential', 'commercial', etc.
    position: { x, y },  // Grid coordinates (0-100)
    size: { width, height }, // Grid units
    entrance: { x, y }, // Entrance position
    subMapId: string    // Interior sub-map ID
  }
]
```

**Problem:** Buildings have position and size, but no collision checking is performed during movement.

---

## 2. Root Cause Analysis

### 2.1 Why No Collision Detection?

1. **Different Coordinate Systems:**
   - Dungeons: Grid-based (discrete cells)
   - Cities: Percentage-based (continuous 0-100)
   - Buildings: Grid coordinates but no collision map

2. **Legacy Design:**
   - Original implementation focused on visual rendering
   - Movement was added later without collision integration
   - Dungeons got collision because they needed it for gameplay

3. **Missing Collision Data:**
   - Buildings are defined but don't have collision boundaries
   - No system to check if a position intersects with a building
   - No door/entrance collision system

### 2.2 Impact on Gameplay

**Current Issues:**
- ❌ Players can walk through walls (breaks immersion)
- ❌ No way to restrict access to locked areas
- ❌ Lockpicking system can't be used for doors
- ❌ Building interiors can't be properly gated
- ❌ No way to create "restricted areas" in cities

**Future Blockers:**
- Can't implement locked doors
- Can't create secure facilities
- Can't add building entry restrictions
- Can't create proper stealth gameplay

---

## 3. Recommended Solution Architecture

### 3.1 Hybrid Collision System

**Approach:** Create a unified collision system that works for both grid-based (dungeons) and percentage-based (cities) submaps.

#### 3.1.1 Collision Map Generation

**For Non-Dungeon Submaps:**
1. Generate a **collision map** from building definitions
2. Use a **spatial grid** (similar to dungeons but finer resolution)
3. Mark cells as:
   - `WALL` - Building walls (impassable)
   - `DOOR` - Doorways (passable if unlocked)
   - `LOCKED_DOOR` - Locked doors (impassable until unlocked)
   - `OPEN` - Walkable areas
   - `RESTRICTED` - Areas requiring special access

**For Dungeon Submaps:**
- Keep existing grid system
- Enhance with door support

#### 3.1.2 Building Collision Data Structure

```javascript
{
  buildings: [
    {
      id: "building_1",
      name: "Residential Building",
      type: "residential",
      position: { x: 20, y: 30 },
      size: { width: 15, height: 10 },
      collision: {
        // Wall boundaries
        walls: [
          { x: 20, y: 30, width: 15, height: 1 },  // Top wall
          { x: 20, y: 40, width: 15, height: 1 },  // Bottom wall
          { x: 20, y: 30, width: 1, height: 10 },  // Left wall
          { x: 35, y: 30, width: 1, height: 10 }   // Right wall
        ],
        // Doors/entrances
        doors: [
          {
            id: "door_1",
            position: { x: 27, y: 30 },  // Front door
            locked: false,
            lockLevel: 0,  // 0 = unlocked, 1-5 = lock difficulty
            requiresKey: null,  // Item ID if key required
            opensTo: "building_1_interior"  // Interior sub-map
          }
        ],
        // Interior collision (if building has interior)
        interior: {
          subMapId: "building_1_interior",
          entryPoint: { x: 50, y: 50 }  // Where player spawns inside
        }
      }
    }
  ],
  // Collision map (generated from buildings)
  collisionMap: {
    resolution: 100,  // 100x100 grid for percentage-based maps
    cells: [
      // Array of collision types for each cell
      // 0 = open, 1 = wall, 2 = door, 3 = locked door
    ]
  }
}
```

---

## 4. Implementation Plan

### Phase 1: Collision Map Generation (Week 1)

#### 4.1.1 Backend: Collision Map Service

**File:** `backend/src/services/collisionMapService.js`

**Functions:**
```javascript
class CollisionMapService {
  /**
   * Generate collision map from submap layout
   */
  generateCollisionMap(subMap) {
    // 1. Create empty collision grid (100x100 for percentage-based)
    // 2. Mark building walls as impassable
    // 3. Mark doorways as passable (or locked)
    // 4. Mark zones as walkable
    // 5. Return collision map
  }

  /**
   * Check if position is walkable
   */
  isWalkable(collisionMap, x, y) {
    // Convert percentage to grid cell
    // Check collision map value
    // Return true if walkable
  }

  /**
   * Check if position intersects with building
   */
  intersectsBuilding(buildings, x, y) {
    // Check if point is inside any building's wall boundaries
    // Return building info if intersection found
  }

  /**
   * Get door at position
   */
  getDoorAt(buildings, x, y) {
    // Check if position is at a door
    // Return door info if found
  }
}
```

#### 4.1.2 Frontend: Collision Detection Utility

**File:** `frontend/src/utils/collisionDetection.js`

**Functions:**
```javascript
/**
 * Check if movement to position is allowed
 */
export function canMoveTo(collisionMap, currentX, currentY, targetX, targetY) {
  // 1. Check if target is walkable
  // 2. Check if path is clear (line-of-sight check)
  // 3. Check for doors in path
  // 4. Return { allowed: boolean, reason: string, door: object }
}

/**
 * Check if position is inside a building
 */
export function isInsideBuilding(buildings, x, y) {
  // Check if point is inside any building's interior
}

/**
 * Get nearest walkable position
 */
export function findNearestWalkable(collisionMap, x, y, radius = 5) {
  // Find nearest walkable cell if current position is invalid
}
```

### Phase 2: Movement Integration (Week 1-2)

#### 4.2.1 Update Movement Function

**File:** `frontend/src/pages/SubMapView.jsx`

**Changes:**
```javascript
const movePlayer = useCallback(async (x, y, usePathfinding = false) => {
  // ... existing code ...
  
  // For non-dungeon submaps, check collision
  if (!isDungeon && subMap.collisionMap) {
    // Check if target position is walkable
    const canMove = canMoveTo(
      subMap.collisionMap,
      currentLoc.x,
      currentLoc.y,
      targetX,
      targetY
    );
    
    if (!canMove.allowed) {
      // Handle blocked movement
      if (canMove.door && canMove.door.locked) {
        // Show lockpicking prompt
        setPendingDoorInteraction(canMove.door);
        notify({
          type: 'info',
          title: 'Locked Door',
          message: `This door is locked. Press [E] to attempt lockpicking.`
        });
      } else {
        // Blocked by wall
        notify({
          type: 'warning',
          title: 'Movement Blocked',
          message: 'You cannot move through walls.'
        });
      }
      setIsMoving(false);
      return;
    }
  }
  
  // ... continue with movement ...
}, [subMap, isMoving]);
```

#### 4.2.2 Pathfinding for Non-Dungeons

**Enhancement:** Add A* pathfinding for non-dungeon submaps that respects collision map.

**File:** `frontend/src/utils/pathfinding.js` (new)

```javascript
/**
 * Find path avoiding walls and buildings
 */
export function findPath(collisionMap, start, end) {
  // A* pathfinding algorithm
  // Respects collision map
  // Returns path array or null if no path
}
```

### Phase 3: Door & Lockpicking Integration (Week 2-3)

#### 4.3.1 Door Interaction System

**File:** `frontend/src/components/submap/DoorInteraction.jsx` (new)

**Features:**
- Detect when player approaches locked door
- Show interaction prompt
- Handle lockpicking attempt
- Unlock door on success
- Update collision map

#### 4.3.2 Lockpicking Integration

**File:** `frontend/src/pages/SubMapView.jsx`

**Add:**
```javascript
// Door interaction state
const [pendingDoor, setPendingDoor] = useState(null);
const [lockpickingActive, setLockpickingActive] = useState(false);

// Handle door interaction
const handleDoorInteraction = async (door) => {
  if (door.locked) {
    // Start lockpicking
    setLockpickingActive(true);
    // Call lockpicking service
    const result = await lockpickingService.attemptPickLock(
      currentCharacter.id,
      door.lockLevel,
      door.id
    );
    
    if (result.success) {
      // Unlock door
      door.locked = false;
      // Update collision map
      updateCollisionMap(door.id, 'unlocked');
      notify({
        type: 'success',
        title: 'Door Unlocked',
        message: 'You successfully picked the lock!'
      });
    }
    setLockpickingActive(false);
  } else {
    // Enter building
    enterBuilding(door.opensTo);
  }
};
```

#### 4.3.3 Collision Map Updates

**When door is unlocked:**
- Update collision map to mark door as walkable
- Persist unlock state (store in database or character state)
- Update visual rendering to show unlocked door

### Phase 4: Building Entry System (Week 3)

#### 4.4.1 Building Interior Access

**Enhancement:** When player interacts with unlocked door, enter building interior.

**Implementation:**
```javascript
const enterBuilding = async (buildingId, door) => {
  // 1. Get building interior sub-map
  const interiorSubMap = await subMapApi.getBuildingInterior(buildingId);
  
  // 2. Save current position (for exit)
  const exitPosition = {
    subMapId: subMap.id,
    position: { x: currentCharacter.currentLocation.x, y: currentCharacter.currentLocation.y }
  };
  
  // 3. Navigate to interior
  navigate(`/game/submap/${planetId}/${buildingId}/building/${interiorSubMap.id}`, {
    state: {
      exitPosition,
      parentSubMap: subMap.id
    }
  });
};
```

---

## 5. Technical Implementation Details

### 5.1 Collision Map Resolution

**Recommendation:** Use 100x100 grid for percentage-based submaps
- **Pros:** Fine enough for smooth movement, coarse enough for performance
- **Cons:** Slightly less precise than pixel-perfect, but acceptable

**Alternative:** Use 200x200 for higher precision (more memory, slower checks)

### 5.2 Performance Considerations

**Optimizations:**
1. **Spatial Indexing:** Use quadtree or spatial hash for fast building lookups
2. **Caching:** Cache collision maps in memory
3. **Lazy Generation:** Generate collision map on first access
4. **Dirty Checking:** Only regenerate collision map when buildings change

### 5.3 Coordinate System Conversion

**Challenge:** Buildings use grid coordinates, movement uses percentages.

**Solution:**
```javascript
// Convert building grid position to percentage
function gridToPercent(gridX, gridY, mapWidth, mapHeight) {
  return {
    x: (gridX / mapWidth) * 100,
    y: (gridY / mapHeight) * 100
  };
}

// Convert percentage to collision grid cell
function percentToCollisionCell(percentX, percentY, resolution = 100) {
  return {
    x: Math.floor((percentX / 100) * resolution),
    y: Math.floor((percentY / 100) * resolution)
  };
}
```

---

## 6. Data Structure Enhancements

### 6.1 SubMap Layout Schema Update

**Current:**
```javascript
layout: {
  buildings: [...],
  zones: [...],
  entryPoints: [...]
}
```

**Enhanced:**
```javascript
layout: {
  buildings: [...],
  zones: [...],
  entryPoints: [...],
  collisionMap: {
    resolution: 100,
    cells: [...],  // Generated from buildings
    doors: [...]   // Door positions and states
  }
}
```

### 6.2 Building Schema Enhancement

**Add collision data:**
```javascript
building: {
  // ... existing fields ...
  collision: {
    walls: [...],      // Wall boundaries
    doors: [...],      // Door definitions
    interior: {...}   // Interior sub-map info
  }
}
```

### 6.3 Door State Persistence

**Store door unlock states:**
- Option 1: In character state (per-character unlocks)
- Option 2: In submap state (global unlocks)
- Option 3: Hybrid (character-specific for some, global for others)

**Recommendation:** Character-specific for most doors (allows replayability)

---

## 7. User Experience Enhancements

### 7.1 Visual Feedback

**Wall Collision:**
- Show subtle "blocked" animation when hitting wall
- Play sound effect
- Show message: "You cannot move through walls"

**Door Interaction:**
- Highlight door when nearby
- Show interaction prompt: "[E] to interact"
- Show lock icon for locked doors
- Animate door opening when unlocked

### 7.2 Movement Smoothing

**Issue:** Grid-based collision can feel "sticky" with percentage movement.

**Solution:**
- Use collision map for validation, but allow smooth percentage movement
- Only block movement when actually hitting a wall
- Use "snap to walkable" for invalid positions

### 7.3 Pathfinding Visualization (Optional)

**Debug Mode:**
- Show collision map overlay
- Visualize pathfinding routes
- Highlight walkable/non-walkable areas

---

## 8. Integration with Existing Systems

### 8.1 Lockpicking System

**Current State:**
- Lockpicking service exists (`lockpickingService.js`)
- Uses skill checks and success calculations
- Has stamina costs

**Integration:**
- Add door lockpicking endpoint
- Store door unlock state
- Update collision map on unlock
- Show lockpicking UI when interacting with locked door

### 8.2 Quest System

**Enhancement:** Quests can require unlocking doors
- "Break into the facility" quests
- "Rescue mission" requiring door access
- "Stealth mission" with locked areas

### 8.3 Stealth System (Future)

**Foundation:** Collision enables:
- Hiding behind buildings
- Line-of-sight calculations
- Cover mechanics
- Stealth gameplay

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1)
- ✅ Collision map generation service
- ✅ Collision detection utilities
- ✅ Basic movement blocking

### Phase 2: Integration (Week 2)
- ✅ Movement system integration
- ✅ Visual feedback

### Phase 3: Doors & Lockpicking (Week 2-3)
- ✅ Door interaction system
- ✅ Lockpicking integration
- ✅ Door state persistence

### Phase 4: Polish (Week 3)
- ✅ Building entry system
- ✅ Exit system
- ✅ UI/UX improvements

---

## 10. Testing Plan

### 10.1 Unit Tests

**Collision Detection:**
- Test collision map generation
- Test walkability checks
- Test door detection
- Test building intersection

### 10.2 Integration Tests

**Movement:**
- Test movement blocking at walls
- Test door interaction
- Test lockpicking flow
- Test building entry/exit

### 10.3 User Testing

**Scenarios:**
1. Walk into building wall → Should be blocked
2. Approach locked door → Should show interaction prompt
3. Pick lock → Should unlock and allow entry
4. Enter building → Should load interior sub-map
5. Exit building → Should return to exterior

---

## 11. Future Enhancements

### 11.1 Advanced Collision Features

- **Dynamic Collision:** Moving objects, elevators
- **Multi-Level Collision:** Stairs, ramps, height differences
- **Destructible Walls:** Some walls can be destroyed
- **Secret Passages:** Hidden doors and passages

### 11.2 Stealth Integration

- **Line of Sight:** Calculate visibility from NPCs
- **Cover System:** Buildings provide cover
- **Detection:** NPCs detect player based on line of sight

### 11.3 Building Interiors

- **Procedural Interiors:** Generate building interiors
- **Room System:** Multiple rooms per building
- **Furniture Collision:** Chairs, tables, etc. block movement

---

## 12. Risk Assessment

### 12.1 Technical Risks

**Risk:** Performance impact of collision checking
- **Mitigation:** Use efficient spatial indexing, cache collision maps

**Risk:** Coordinate system complexity
- **Mitigation:** Clear conversion functions, comprehensive testing

**Risk:** Breaking existing movement
- **Mitigation:** Gradual rollout, feature flags, extensive testing

### 12.2 Design Risks

**Risk:** Movement feels too restrictive
- **Mitigation:** Smooth movement, clear visual feedback, generous collision boundaries

**Risk:** Lockpicking becomes frustrating
- **Mitigation:** Clear difficulty indicators, skill-based success rates, retry options

---

## 13. Success Metrics

### 13.1 Technical Metrics

- Collision check performance: < 1ms per check
- Collision map generation: < 100ms for typical submap
- Memory usage: < 10MB per collision map

### 13.2 User Experience Metrics

- Movement feels natural and responsive
- No false positives (blocking valid movement)
- Clear feedback when movement is blocked
- Lockpicking feels rewarding, not frustrating

---

## 14. Conclusion

Implementing collision detection for non-dungeon submaps is **critical** for:
1. **Immersion:** Players can't walk through walls
2. **Gameplay:** Enables lockpicking, stealth, and restricted areas
3. **Expansion:** Foundation for future features (stealth, cover, etc.)

**Recommended Approach:**
- Start with Phase 1 (collision map generation)
- Integrate gradually (Phase 2)
- Add doors and lockpicking (Phase 3)
- Polish and expand (Phase 4)

**Estimated Timeline:** 3-4 weeks for full implementation

**Priority:** **HIGH** - Blocks lockpicking system integration and breaks immersion

---

## Appendix A: Code Examples

### A.1 Collision Map Generation

```javascript
function generateCollisionMap(subMap) {
  const resolution = 100;
  const map = Array(resolution).fill(null).map(() => 
    Array(resolution).fill(0) // 0 = walkable
  );
  
  const layout = subMap.layoutData || subMap.layout;
  const buildings = layout.buildings || [];
  
  // Mark building walls as impassable
  buildings.forEach(building => {
    const { position, size } = building;
    const startX = Math.floor((position.x / layout.width) * resolution);
    const startY = Math.floor((position.y / layout.height) * resolution);
    const endX = Math.floor(((position.x + size.width) / layout.width) * resolution);
    const endY = Math.floor(((position.y + size.height) / layout.height) * resolution);
    
    // Mark walls (perimeter)
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (x === startX || x === endX || y === startY || y === endY) {
          if (x >= 0 && x < resolution && y >= 0 && y < resolution) {
            map[y][x] = 1; // Wall
          }
        }
      }
    }
    
    // Mark doors as special (2 = door, 3 = locked door)
    if (building.collision?.doors) {
      building.collision.doors.forEach(door => {
        const doorX = Math.floor((door.position.x / layout.width) * resolution);
        const doorY = Math.floor((door.position.y / layout.height) * resolution);
        if (doorX >= 0 && doorX < resolution && doorY >= 0 && doorY < resolution) {
          map[doorY][doorX] = door.locked ? 3 : 2; // Locked door or door
        }
      });
    }
  });
  
  return {
    resolution,
    cells: map,
    buildings: buildings.map(b => b.id)
  };
}
```

### A.2 Movement Collision Check

```javascript
function canMoveTo(collisionMap, currentX, currentY, targetX, targetY) {
  const resolution = collisionMap.resolution;
  const cells = collisionMap.cells;
  
  // Convert percentage to collision cell
  const targetCellX = Math.floor((targetX / 100) * resolution);
  const targetCellY = Math.floor((targetY / 100) * resolution);
  
  // Check bounds
  if (targetCellX < 0 || targetCellX >= resolution || 
      targetCellY < 0 || targetCellY >= resolution) {
    return { allowed: false, reason: 'out_of_bounds' };
  }
  
  const cellValue = cells[targetCellY][targetCellX];
  
  // Check collision type
  if (cellValue === 1) {
    return { allowed: false, reason: 'wall' };
  } else if (cellValue === 3) {
    return { 
      allowed: false, 
      reason: 'locked_door',
      door: getDoorAtPosition(collisionMap, targetCellX, targetCellY)
    };
  } else if (cellValue === 2) {
    return { 
      allowed: true, 
      reason: 'door',
      door: getDoorAtPosition(collisionMap, targetCellX, targetCellY)
    };
  }
  
  return { allowed: true, reason: 'walkable' };
}
```

---

## Next Steps

1. **Review this document** with the team
2. **Prioritize phases** based on game roadmap
3. **Create detailed task breakdown** for Phase 1
4. **Begin implementation** with collision map generation service

