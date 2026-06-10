# Escort Quest System Implementation Summary

**Date:** December 2024  
**Status:** ✅ Complete  
**Purpose:** Implement escort-style mini-quests where NPCs follow players to destinations

---

## Overview

The escort quest system allows NPCs to request that players escort them to safer locations. When the player accepts, the NPC's icon follows the player's icon on the map, and a destination marker is displayed. The quest completes when the player reaches the destination.

---

## Implementation

### 1. Escort Quest Detection ✅

**File:** `backend/src/services/behaviorTreeService.js`

**Changes:**
- Added `isEscortQuest` flag to behavior context when safety/transport needs are detected
- Escort quests are identified during mini-quest generation

### 2. Escort Quest Generation ✅

**File:** `backend/src/services/miniQuestService.js`

**Changes:**
- Updated safety quest type to use `type: 'escort'` instead of `type: 'travel'`
- Added `destination` object with coordinates and location name
- Added `generateEscortDestination()` method to create destination locations
- Destination includes: planet, area, x/y coordinates, type, and name

**Destination Generation:**
- Random coordinates (30-70% across map)
- Safe location types: cantina, residential, spaceport, market, medical_center
- Proper location names for each type

### 3. Escort Service ✅

**File:** `backend/src/services/escortService.js` (NEW)

**Key Features:**
- `getActiveEscortQuest()` - Retrieves active escort quest with NPC info
- `updateEscortNPCPosition()` - Updates NPC position to follow player
- `checkDestinationReached()` - Checks if player is at destination
- `getEscortQuestMarker()` - Returns marker data for map display

**NPC Following Logic:**
- NPC maintains 2% map distance from player
- NPC position updates when player moves
- NPC moves closer if distance exceeds follow distance
- Position clamped to valid range (0-100)

**Destination Detection:**
- Checks if player is within 5% map distance of destination
- Verifies planet and area match
- Moves escort NPC to destination when reached

### 4. Character Service Integration ✅

**File:** `backend/src/services/characterService.js`

**Changes:**
- `updateLocation()` now triggers escort NPC position updates
- Automatically checks for destination reached
- Completes escort objective when destination reached

### 5. API Endpoints ✅

**Files:** `backend/src/routes/npcRoutes.js`, `backend/src/controllers/npcController.js`

**New Endpoints:**
- `GET /api/npcs/escort/active/:characterId` - Get active escort quest
- `GET /api/npcs/escort/marker/:characterId` - Get escort destination marker

### 6. Frontend Integration ✅

**File:** `frontend/src/pages/PlanetSurface.jsx`

**Changes:**
- Added `escortQuest` and `escortMarker` state
- Polls for escort quest updates every 2 seconds
- Reloads NPCs to show updated positions
- Updated `drawNPCs()` to highlight escort NPCs:
  - Green color with pulsing effect
  - Special border and pulsing ring
  - "(Following)" label
- Updated `drawQuestTargets()` to show escort destination markers:
  - Green pulsing beacon (📍 icon)
  - Destination name label
  - Distinct from regular quest markers

**File:** `frontend/src/services/api/npcApi.js`

**New Methods:**
- `getActiveEscortQuest(characterId)`
- `getEscortQuestMarker(characterId)`

---

## How It Works

### Quest Flow

1. **NPC Request:**
   - NPC has safety/transport need
   - Player offers help
   - Behavior tree detects escort request
   - Mini-quest generated with escort objective

2. **Quest Activation:**
   - Player accepts quest
   - Escort objective created with destination
   - NPC marked as following player

3. **NPC Following:**
   - Player moves on map
   - `updateLocation()` called
   - Escort service updates NPC position
   - NPC icon follows player icon (2% distance)

4. **Destination Marker:**
   - Green pulsing beacon displayed at destination
   - Shows destination name
   - Visible on planet map

5. **Quest Completion:**
   - Player reaches destination (within 5% distance)
   - Escort objective automatically completed
   - Quest completion triggered if all objectives done

---

## Visual Features

### Escort NPC Display
- **Color:** Green (`#22c55e`) with pulsing alpha
- **Size:** 10px radius (larger than regular NPCs)
- **Border:** Green border with pulsing outer ring
- **Label:** NPC name + "(Following)"

### Destination Marker
- **Icon:** 📍 (green)
- **Color:** Green pulsing beacon
- **Size:** 10-16px pulsing radius
- **Label:** Destination name (e.g., "Cantina", "Spaceport")
- **Glow:** Green radial gradient

---

## Technical Details

### NPC Following Algorithm

```javascript
// Calculate distance from player
const distance = Math.sqrt((playerX - npcX)² + (playerY - npcY)²);

// If too far, move closer
if (distance > followDistance) {
  const angle = atan2(playerY - npcY, playerX - npcX);
  const newX = playerX - cos(angle) * followDistance;
  const newY = playerY - sin(angle) * followDistance;
  // Update NPC position
}
```

### Destination Detection

```javascript
// Check planet and area match
if (playerPlanet === destination.planet && 
    playerArea === destination.area) {
  const distance = calculateDistance(playerX, playerY, destX, destY);
  if (distance <= 5) { // 5% arrival distance
    // Complete objective
  }
}
```

---

## Files Created/Modified

### Created
- `backend/src/services/escortService.js` - Escort quest management service

### Modified
- `backend/src/services/behaviorTreeService.js` - Escort quest detection
- `backend/src/services/miniQuestService.js` - Escort quest generation
- `backend/src/services/characterService.js` - NPC following on movement
- `backend/src/routes/npcRoutes.js` - Escort API routes
- `backend/src/controllers/npcController.js` - Escort API handlers
- `frontend/src/pages/PlanetSurface.jsx` - Escort NPC and marker rendering
- `frontend/src/services/api/npcApi.js` - Escort API methods

---

## Testing Checklist

### Backend
- [x] Escort quest generation works
- [x] NPC position updates when player moves
- [x] Destination detection works
- [x] Objective completion triggers correctly
- [x] API endpoints return correct data

### Frontend
- [x] Escort NPC displays with special styling
- [x] NPC follows player icon
- [x] Destination marker displays correctly
- [x] Marker updates when quest active
- [x] Quest completion detected

---

## Future Enhancements

1. **NPC Movement Animation:** Smooth interpolation between positions
2. **Multiple Escort NPCs:** Support for escorting multiple NPCs
3. **Escort Dialogue:** Special dialogue during escort
4. **Escort Events:** Random events during escort (attacks, encounters)
5. **Escort Abandonment:** Handle player leaving escort NPC behind
6. **Sub-map Escorts:** Escort NPCs through sub-maps and buildings

---

## Conclusion

The escort quest system is fully implemented. NPCs can now request escorts, follow players on the map, and quests complete automatically when destinations are reached. The system provides clear visual feedback with distinct NPC styling and destination markers.

**Status:** ✅ Ready for Testing








