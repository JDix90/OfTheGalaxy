# Planet Map Redesign: Integration Implementation Plan

**Date:** December 2024  
**Status:** In Progress

---

## Overview

This document outlines the step-by-step implementation plan for integrating the redesigned planet map system with Nav-Mesh pathfinding, biome rendering, and coordinate system standardization.

---

## Phase 1: Foundation (Completed ✅)

### ✅ 1.1 Nav-Mesh Specification
- [x] Created `NAV_MESH_SPECIFICATION.md` with complete data format
- [x] Defined JSON schema for Nav-Mesh data
- [x] Created validation rules and requirements

### ✅ 1.2 Nav-Mesh Tools
- [x] Created `validate-navmesh.js` validation tool
- [x] Created `navMeshGenerator.js` for automated generation
- [x] Created `navMeshLoader.js` for loading Nav-Meshes

### ✅ 1.3 Pathfinding Implementation
- [x] Created `pathfinding.js` with A* algorithm
- [x] Implemented path smoothing
- [x] Created performance test script

### ✅ 1.4 Coordinate Reconciliation
- [x] Created `reconcile-poi-coordinates.js` tool
- [x] Defined single source of truth for all POI coordinates
- [x] Created coordinate conversion utilities

### ✅ 1.5 Test Nav-Mesh Data
- [x] Created Nav-Mesh for Tatooine
- [x] Created Nav-Mesh for Dantooine
- [x] Created Nav-Mesh for Hoth

---

## Phase 2: Backend Integration (In Progress)

### 2.1 Nav-Mesh API Endpoint
- [x] Added Nav-Mesh loading to `galaxyController.getPlanetById`
- [ ] Add dedicated Nav-Mesh endpoint: `GET /api/galaxy/planets/:id/navmesh`
- [ ] Add Nav-Mesh validation endpoint

### 2.2 Coordinate System Updates
- [ ] Update backend to use 0-1000 internal format consistently
- [ ] Migrate existing POI coordinates to new format
- [ ] Update quest objective coordinates

### 2.3 POI Coordinate Migration
- [ ] Run `reconcile-poi-coordinates.js` to export master coordinate list
- [ ] Update database POI coordinates
- [ ] Validate all POIs are in navigable terrain

---

## Phase 3: Frontend Integration (Next)

### 3.1 Navigation Manager Integration
- [ ] Integrate `navigationManager` into `PlanetSurface.jsx`
- [ ] Load Nav-Mesh when planet loads
- [ ] Cache Nav-Mesh data

### 3.2 Movement System Update
- [ ] Update `movePlayer` to use pathfinding
- [ ] Add path animation/interpolation
- [ ] Handle path updates during movement
- [ ] Add movement speed based on terrain type

### 3.3 Click Handling Update
- [ ] Update `handleCanvasMouseDown` to validate navigation
- [ ] Add "cannot go there" feedback for impassable terrain
- [ ] Integrate pathfinding for click-to-move

### 3.4 Path Preview
- [ ] Add path preview on hover (in `handleCanvasMouseMove`)
- [ ] Render path on Navigation Layer
- [ ] Add visual feedback for terrain types

### 3.5 Coordinate Conversion
- [ ] Replace all coordinate conversions with `coordinateConverter` utilities
- [ ] Update NPC coordinate handling
- [ ] Update POI coordinate handling
- [ ] Update quest target coordinate handling

---

## Phase 4: Biome Rendering (Next)

### 4.1 Biome Data Loading
- [ ] Load biome boundaries from planet data
- [ ] Integrate biome data with Nav-Mesh

### 4.2 Biome Rendering
- [ ] Integrate `biomeRenderer` into map renderer
- [ ] Add biome layer to rendering pipeline
- [ ] Test biome rendering performance

### 4.3 Biome Transitions
- [ ] Implement transition zone rendering
- [ ] Add gradient blending between biomes

---

## Phase 5: Visual Effects (Future)

### 5.1 Particle Effects
- [ ] Implement particle system
- [ ] Add weather effects
- [ ] Add atmospheric effects

### 5.2 Lighting Effects
- [ ] Implement simulated volumetric lighting
- [ ] Add dynamic shadows
- [ ] Add bloom effects

---

## Implementation Steps

### Step 1: Update Movement System (Current)

**File:** `frontend/src/pages/PlanetSurface.jsx`

**Changes:**
1. Import `navigationManager` and `coordinateConverter`
2. Update `movePlayer` to:
   - Check if destination is navigable
   - Calculate path using pathfinding
   - Animate movement along path
   - Handle terrain-based movement speed

**Code Example:**
```javascript
const movePlayer = React.useCallback(async (x, y) => {
  const character = useCharacterStore.getState().currentCharacter;
  if (!character || !planet || isMoving) return;

  setIsMoving(true);
  try {
    // Convert display coordinates to internal
    const internalCoords = coordinateConverter.displayToInternal(x, y);
    const currentCoords = coordinateConverter.displayToInternal(
      character.currentLocation.x,
      character.currentLocation.y
    );

    // Check if navigable
    const navigable = await navigationManager.isNavigable(planet.id, internalCoords);
    if (!navigable) {
      // Show "cannot go there" feedback
      console.warn('Destination is not navigable');
      setIsMoving(false);
      return;
    }

    // Calculate path
    const path = await navigationManager.findPath(
      planet.id,
      currentCoords,
      internalCoords
    );

    if (!path || path.length === 0) {
      console.warn('No path found');
      setIsMoving(false);
      return;
    }

    // Animate movement along path
    await animateMovement(path);
    
    // Update location
    const location = { x, y, area: 'surface' };
    const updatedCharacter = await updateLocation(planet.id, location);
    if (updatedCharacter) {
      setCurrentCharacter(updatedCharacter);
      await checkForEncounter(updatedCharacter, planet);
    }
  } catch (error) {
    console.error('Failed to move player:', error);
  } finally {
    setIsMoving(false);
  }
}, [planet, isMoving, updateLocation, setCurrentCharacter, checkForEncounter]);
```

### Step 2: Add Path Preview

**File:** `frontend/src/pages/PlanetSurface.jsx`

**Changes:**
1. Add `hoveredPath` state
2. Update `handleCanvasMouseMove` to calculate path preview
3. Add path rendering in map renderer

### Step 3: Update Coordinate System

**File:** `frontend/src/pages/PlanetSurface.jsx`

**Changes:**
1. Replace all coordinate conversions with `coordinateConverter` utilities
2. Update NPC coordinate handling
3. Update POI coordinate handling
4. Update quest target coordinate handling

### Step 4: Integrate Biome Rendering

**File:** `frontend/src/utils/planetMapRenderer.js`

**Changes:**
1. Import `biomeRenderer`
2. Add biome rendering layer
3. Integrate with existing rendering pipeline

---

## Testing Checklist

### Navigation Testing
- [ ] Player can move to navigable terrain
- [ ] Player cannot move to impassable terrain
- [ ] Pathfinding finds optimal paths
- [ ] Path preview shows on hover
- [ ] Movement animation works smoothly

### Coordinate Testing
- [ ] All POIs render at correct locations
- [ ] NPCs render at correct locations
- [ ] Quest targets render at correct locations
- [ ] Click detection works correctly
- [ ] Coordinate conversions are accurate

### Performance Testing
- [ ] Pathfinding completes in < 16ms (60 FPS target)
- [ ] No frame rate drops during movement
- [ ] Nav-Mesh loading doesn't block UI
- [ ] Memory usage is within budget

### Integration Testing
- [ ] Existing quests still work
- [ ] NPC interactions still work
- [ ] POI interactions still work
- [ ] Fast travel still works
- [ ] No regressions in existing features

---

## Rollout Plan

1. **Test on Tatooine** (Week 1)
   - Deploy Nav-Mesh and pathfinding
   - Test all movement scenarios
   - Validate performance

2. **Test on Dantooine** (Week 1)
   - Deploy Nav-Mesh and pathfinding
   - Test biome rendering
   - Validate coordinate system

3. **Test on Hoth** (Week 2)
   - Deploy Nav-Mesh with impassable terrain
   - Test difficult terrain movement
   - Validate pathfinding with obstacles

4. **Full Rollout** (Week 3+)
   - Deploy to all 22 key planets
   - Monitor performance
   - Fix any issues

---

## Known Issues & Solutions

### Issue: Pathfinding Performance
**Solution:** Use hierarchical pathfinding for long distances, cache common paths

### Issue: Coordinate Discrepancies
**Solution:** Use single source of truth from `reconcile-poi-coordinates.js`

### Issue: Nav-Mesh Coverage
**Solution:** Validate Nav-Mesh covers all navigable terrain and POIs

---

## Next Steps

1. Complete backend Nav-Mesh API endpoint
2. Integrate pathfinding into movement system
3. Add path preview on hover
4. Update coordinate system throughout codebase
5. Integrate biome rendering
6. Test on all three test planets
7. Performance optimization
8. Full rollout


