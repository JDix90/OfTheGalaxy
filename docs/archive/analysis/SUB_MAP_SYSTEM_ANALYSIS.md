# Sub-Map System Implementation Analysis

## Executive Summary

This document provides a comprehensive analysis and implementation plan for creating sub-maps for buildings, cities, and locations on planets. The system will allow players to "enter" locations from the planet surface and explore detailed interior/exterior maps with unique layouts based on location type.

## Current System Overview

### Existing Structure
- **Planet Surface Maps**: 2D canvas-based maps showing terrain, cities, POIs, markets, and NPCs
- **Location Types**: Cities, markets, POIs (palaces, cantinas, temples, etc.), spaceports
- **Interaction**: Players can click on locations to select them, but cannot "enter" them
- **Data Storage**: Location data stored in `planet.mapData.mapLayout.locations`, `pointsOfInterest`, and `markets`

### Current Limitations
- No way to enter/explore locations in detail
- Locations are just markers on the planet surface
- No interior/exterior sub-maps for buildings or cities
- No hierarchical navigation (planet → location → building → room)

## Sub-Map System Design

### 1. Sub-Map Types & Templates

#### 1.1 City Sub-Maps
**Template Type**: `city`
**Layout Style**: Urban street grid with buildings
**Components**:
- Street grid (main streets, side streets, alleys)
- Building blocks (residential, commercial, industrial)
- Public spaces (squares, parks, plazas)
- Key buildings (government, temples, markets)
- NPC spawn points
- Entry/exit points (back to planet surface)

**Visual Style**:
- Top-down view
- Grid-based layout
- Building footprints
- Street markings
- Urban atmosphere matching planet type

**Size**: Medium (larger than buildings, smaller than planet)
**Scale**: 1 city block = ~50-100 pixels

#### 1.2 Spaceport Sub-Maps
**Template Type**: `spaceport`
**Layout Style**: Terminal/hangar layout
**Components**:
- Landing pads (multiple sizes)
- Terminal buildings
- Hangar bays
- Control tower
- Cargo areas
- Vendor stalls (ship parts, fuel, supplies)
- NPCs (pilots, mechanics, officials)
- Exit to planet surface
- Ship selection/boarding area

**Visual Style**:
- Industrial/functional
- Clear pathways between areas
- Distinct zones (arrival, departure, cargo, services)

**Size**: Small to Medium
**Scale**: 1 hangar = ~30-50 pixels

#### 1.3 Market Sub-Maps
**Template Type**: `market`
**Layout Style**: Vendor stalls and trading areas
**Components**:
- Vendor stalls (arranged in rows or clusters)
- Trading floor
- Storage areas
- Currency exchange (if applicable)
- NPC vendors
- Player inventory access
- Exit to parent location

**Visual Style**:
- Colorful, bustling
- Clear vendor areas
- Easy navigation between stalls

**Size**: Small
**Scale**: 1 stall = ~20-30 pixels

#### 1.4 Building Interiors
**Template Types**: Multiple based on building function

##### 1.4.1 Cantina/Tavern (`cantina`)
**Components**:
- Main bar area
- Seating areas (tables, booths)
- Stage/entertainment area
- Private rooms/booths
- Storage/kitchen
- NPCs (bartender, patrons, entertainers)
- Quest givers
- Exit to parent location

##### 1.4.2 Palace (`palace`)
**Components**:
- Grand entrance hall
- Throne room/audience chamber
- Private quarters
- Council chambers
- Gardens/courtyards
- Guard posts
- NPCs (royalty, guards, advisors)
- Exit to parent location

##### 1.4.3 Temple (`temple`)
**Components**:
- Main hall/sanctuary
- Meditation chambers
- Library/archives
- Training areas
- Living quarters
- NPCs (priests, acolytes, guardians)
- Exit to parent location

##### 1.4.4 Government Building (`government`)
**Components**:
- Reception area
- Offices
- Council chambers
- Archives
- NPCs (officials, clerks, guards)
- Exit to parent location

##### 1.4.5 Base/Facility (`base`)
**Components**:
- Command center
- Barracks
- Armory
- Hangar
- Medical bay
- NPCs (soldiers, officers, technicians)
- Exit to parent location

#### 1.5 Point of Interest Sub-Maps
**Template Types**: Varies by POI type
- **Landscape**: Natural feature exploration (caves, groves, etc.)
- **Wilderness**: Open exploration area
- **Danger**: Hazardous area with challenges
- **Arena**: Competition/combat area
- **Mine**: Mining facility layout

### 2. Data Structure Design

#### 2.1 Sub-Map Data Schema
```javascript
{
  id: string,                    // Unique identifier
  name: string,                  // Display name
  type: string,                  // Template type (city, spaceport, cantina, etc.)
  parentLocation: {              // Reference to parent
    planetId: string,
    locationId: string,
    locationType: string         // 'city', 'poi', 'market', etc.
  },
  template: string,              // Template variant (e.g., 'large_city', 'small_spaceport')
  layout: {
    width: number,               // Map width in grid units
    height: number,              // Map height in grid units
    gridSize: number,            // Pixels per grid unit
    zones: [                     // Different areas of the map
      {
        id: string,
        name: string,
        type: string,            // 'street', 'building', 'plaza', etc.
        bounds: { x, y, width, height },
        connections: [string]    // IDs of connected zones
      }
    ],
    buildings: [                 // For city maps
      {
        id: string,
        name: string,
        type: string,            // 'residential', 'commercial', 'government', etc.
        position: { x, y },
        size: { width, height },
        entrance: { x, y },      // Where player enters building
        subMapId: string         // If building has interior sub-map
      }
    ],
    pointsOfInterest: [          // Key locations within sub-map
      {
        id: string,
        name: string,
        type: string,
        position: { x, y },
        description: string
      }
    ],
    npcSpawnPoints: [            // Where NPCs can appear
      {
        id: string,
        position: { x, y },
        npcIds: [string],        // Possible NPCs at this point
        spawnChance: number
      }
    ],
    entryPoints: [               // Where player enters from parent
      {
        id: string,
        position: { x, y },
        label: string,           // e.g., "Main Entrance"
        fromParent: {            // Where on parent map this connects
          locationId: string,
          position: { x, y }
        }
      }
    ],
    exitPoints: [                // Ways to leave sub-map
      {
        id: string,
        position: { x, y },
        label: string,
        toParent: {
          locationId: string,
          position: { x, y }    // Where player appears on parent
        }
      }
    ]
  },
  metadata: {
    description: string,
    lore: string,
    faction: string,
    dangerLevel: number,
    restrictions: {              // Access restrictions
      requiresQuest: string,
      requiresFaction: string,
      requiresItem: string
    }
  }
}
```

#### 2.2 Template System
Templates define the structure and layout patterns for each sub-map type:

```javascript
const subMapTemplates = {
  city: {
    variants: ['small', 'medium', 'large', 'capital'],
    generate: (variant, seed) => {
      // Procedural generation based on variant
      // Returns layout structure
    },
    defaultSize: { width: 20, height: 20 },  // Grid units
    requiredZones: ['entrance', 'residential', 'commercial'],
    optionalZones: ['government', 'temple', 'market', 'industrial']
  },
  spaceport: {
    variants: ['small', 'medium', 'large', 'military'],
    generate: (variant, seed) => { /* ... */ },
    defaultSize: { width: 15, height: 15 },
    requiredZones: ['landing_pad', 'terminal', 'hangar'],
    optionalZones: ['cargo', 'control_tower', 'repair_bay']
  },
  cantina: {
    variants: ['small', 'medium', 'large', 'luxury'],
    generate: (variant, seed) => { /* ... */ },
    defaultSize: { width: 10, height: 10 },
    requiredZones: ['bar', 'seating'],
    optionalZones: ['stage', 'private_room', 'gambling']
  },
  // ... more templates
};
```

### 3. Navigation & Routing

#### 3.1 Route Structure
```
/galaxy → /game/planet/:planetId → /game/location/:locationId → /game/submap/:subMapId
```

#### 3.2 Navigation Flow
1. **Planet Surface**: Player sees location markers
2. **Click Location**: Opens location detail panel with "Enter" button
3. **Enter Location**: 
   - If location has sub-map → Navigate to sub-map view
   - If location is simple → Show detail panel/interaction menu
4. **Sub-Map View**: Player can explore, interact with NPCs, enter buildings
5. **Exit Sub-Map**: Return to parent (planet surface or parent location)

#### 3.3 Location Hierarchy
```
Planet Surface
  ├── City (has sub-map)
  │   ├── Street Grid
  │   ├── Buildings (some have interiors)
  │   │   ├── Cantina (interior sub-map)
  │   │   ├── Market (interior sub-map)
  │   │   └── Residential (no interior, just marker)
  │   └── POIs within city
  ├── Spaceport (has sub-map)
  │   ├── Terminal
  │   ├── Hangars
  │   └── Services
  ├── POI (may have sub-map)
  │   └── Interior/Exploration area
  └── Market (has sub-map)
      └── Vendor stalls
```

### 4. Rendering System

#### 4.1 Sub-Map Renderer Component
**File**: `frontend/src/pages/SubMapView.jsx`

**Responsibilities**:
- Render sub-map layout based on template
- Handle player movement within sub-map
- Display NPCs, interactive elements
- Handle entry/exit transitions
- Manage zoom/pan for sub-maps

**Rendering Layers**:
1. Background/floor
2. Walls/structures
3. Furniture/decorations
4. Interactive elements (doors, vendors, NPCs)
5. Player position
6. UI overlays

#### 4.2 Sub-Map Renderer Utility
**File**: `frontend/src/utils/subMapRenderer.js`

**Functions**:
- `renderSubMap(ctx, width, height, subMap, zoom, pan)`
- `renderCityMap(ctx, subMap)`
- `renderSpaceportMap(ctx, subMap)`
- `renderBuildingInterior(ctx, subMap)`
- `renderMarketMap(ctx, subMap)`

#### 4.3 Visual Styles by Type
- **Cities**: Urban grid, building footprints, streets
- **Spaceports**: Industrial, functional, clear zones
- **Cantinas**: Warm, social, detailed interiors
- **Palaces**: Grand, ornate, spacious
- **Temples**: Serene, architectural, symbolic
- **Markets**: Colorful, bustling, organized stalls

### 5. Interaction Model

#### 5.1 Entering Locations
**Current**: Click location → Select (shows info panel)
**New**: Click location → Select → "Enter" button → Navigate to sub-map

**Implementation**:
```javascript
// In PlanetSurface.jsx
const handleEnterLocation = (location) => {
  // Check if location has sub-map
  if (location.subMapId) {
    navigate(`/game/location/${location.id}`);
  } else {
    // Show interaction menu for simple locations
    showLocationMenu(location);
  }
};
```

#### 5.2 Movement in Sub-Maps
- Similar to planet surface movement
- Arrow keys/WASD navigation
- Click-to-move (optional)
- Grid-based or free movement (depends on template)

#### 5.3 Interacting with Elements
- **Doors**: Enter building interiors
- **NPCs**: Talk/interact
- **Vendors**: Open shop interface
- **Objects**: Examine/interact
- **Exits**: Return to parent location

### 6. Backend Integration

#### 6.1 API Endpoints
```javascript
// Get sub-map data
GET /api/locations/:locationId/submap
Response: { success: true, data: subMapData }

// Get all sub-maps for a location
GET /api/locations/:locationId/submaps
Response: { success: true, data: [subMapData] }

// Create/update sub-map (admin)
POST /api/locations/:locationId/submap
PUT /api/locations/:locationId/submap/:subMapId
```

#### 6.2 Database Schema
**New Table**: `sub_maps`
```sql
CREATE TABLE sub_maps (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL,
  template VARCHAR(50),
  parent_location_id VARCHAR(100),
  parent_location_type VARCHAR(50),
  planet_id VARCHAR(100),
  layout_data JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (planet_id) REFERENCES planets(id)
);
```

#### 6.3 Data Generation
- **Lore-accurate locations**: Use `planetMaps.js` data
- **Procedural generation**: For generic locations
- **Template-based**: Use templates for consistent layouts
- **Seeded random**: Consistent generation per location

### 7. Implementation Phases

#### Phase 1: Foundation (Week 1)
- [ ] Create sub-map data structure
- [ ] Design template system
- [ ] Create database schema
- [ ] Build basic API endpoints
- [ ] Create SubMapView component shell

#### Phase 2: Core Templates (Week 2)
- [ ] Implement city template
- [ ] Implement spaceport template
- [ ] Implement market template
- [ ] Create sub-map renderer utilities
- [ ] Basic navigation (enter/exit)

#### Phase 3: Building Interiors (Week 3)
- [ ] Implement cantina template
- [ ] Implement palace template
- [ ] Implement temple template
- [ ] Implement government building template
- [ ] Door/entrance system

#### Phase 4: Integration (Week 4)
- [ ] Integrate with planet surface clicks
- [ ] Player movement in sub-maps
- [ ] NPC spawning in sub-maps
- [ ] Interaction system
- [ ] UI polish

#### Phase 5: Advanced Features (Week 5+)
- [ ] Procedural generation improvements
- [ ] More template variants
- [ ] Quest integration
- [ ] Faction-specific layouts
- [ ] Dynamic content (events, changes)

### 8. Technical Considerations

#### 8.1 Performance
- **Lazy Loading**: Load sub-map data only when entering
- **Caching**: Cache generated sub-maps
- **Optimization**: Efficient rendering for large city maps
- **Memory Management**: Unload sub-maps when exiting

#### 8.2 Scalability
- **Template System**: Easy to add new types
- **Procedural Generation**: Infinite variety
- **Data Storage**: Efficient JSONB storage
- **API Design**: RESTful, extensible

#### 8.3 User Experience
- **Smooth Transitions**: Fade in/out when entering/exiting
- **Clear Navigation**: Always know where you are
- **Breadcrumb Trail**: Show location hierarchy
- **Quick Exit**: Easy return to planet surface

#### 8.4 Consistency
- **Visual Style**: Match planet/location theme
- **Scale**: Consistent sizing across sub-maps
- **Interaction**: Uniform interaction patterns
- **Lore Accuracy**: Star Wars canon compliance

### 9. Example Implementation Flow

#### 9.1 Player Clicks "Theed" City on Naboo
1. `PlanetSurface.jsx` detects click on city marker
2. Sets `selectedCity` state
3. Shows location detail panel with "Enter Theed" button
4. Player clicks "Enter Theed"
5. Component checks if city has sub-map:
   - If yes: Navigate to `/game/location/theed`
   - If no: Generate sub-map on-demand or show simple menu

#### 9.2 Entering Theed City Sub-Map
1. `SubMapView.jsx` loads
2. Fetches sub-map data: `GET /api/locations/theed/submap`
3. If no sub-map exists, generates one using city template
4. Renders city layout (streets, buildings, etc.)
5. Player spawns at entry point
6. Player can explore, enter buildings, talk to NPCs

#### 9.3 Entering Building Within City
1. Player moves to building marker
2. Clicks building (e.g., "Theed Cantina")
3. If building has interior sub-map:
   - Navigate to `/game/submap/theed_cantina`
4. `SubMapView.jsx` loads cantina interior
5. Player can interact with bartender, patrons, etc.

#### 9.4 Exiting Sub-Map
1. Player clicks "Exit" button or moves to exit point
2. Navigate back to parent location
3. Player appears at exit point on parent map
4. Maintains position context

### 10. Template Examples

#### 10.1 Small City Template
```
Grid: 15x15 units
Zones:
  - Entrance (1x1) at edge
  - Main Street (horizontal, 3 units wide)
  - Residential blocks (4x4 each, 2 blocks)
  - Commercial area (5x5, shops)
  - Small plaza (3x3)
Buildings: 8-12 buildings
NPCs: 5-10 spawn points
```

#### 10.2 Medium Spaceport Template
```
Grid: 12x12 units
Zones:
  - Terminal building (4x6)
  - Landing pad 1 (3x3)
  - Landing pad 2 (3x3)
  - Hangar bay (4x4)
  - Cargo area (3x3)
  - Services (2x3, vendors)
NPCs: 3-6 spawn points
```

#### 10.3 Cantina Template
```
Grid: 8x8 units
Zones:
  - Bar area (2x6, along one wall)
  - Main seating (4x4, tables)
  - Stage area (2x2)
  - Private booth (1x1)
  - Storage (1x1)
NPCs: 4-8 spawn points (bartender + patrons)
```

### 11. Data Flow Diagram

```
Planet Surface (PlanetSurface.jsx)
    │
    ├─→ Click Location
    │   │
    │   ├─→ Has Sub-Map?
    │   │   │
    │   │   ├─→ Yes → Navigate to SubMapView
    │   │   │         │
    │   │   │         ├─→ Load Sub-Map Data (API)
    │   │   │         │
    │   │   │         ├─→ Generate if Missing (Template)
    │   │   │         │
    │   │   │         └─→ Render Sub-Map
    │   │   │
    │   │   └─→ No → Show Interaction Menu
    │   │
    │   └─→ Sub-Map View (SubMapView.jsx)
    │       │
    │       ├─→ Player Movement
    │       │
    │       ├─→ Click Building/Element
    │       │   │
    │       │   └─→ Has Interior?
    │       │       │
    │       │       └─→ Yes → Navigate to Interior Sub-Map
    │       │
    │       └─→ Exit → Return to Planet Surface
```

### 12. Key Files to Create/Modify

#### New Files:
- `frontend/src/pages/SubMapView.jsx` - Main sub-map component
- `frontend/src/utils/subMapRenderer.js` - Rendering utilities
- `frontend/src/services/subMapTemplates.js` - Template definitions
- `frontend/src/services/api/subMapApi.js` - API client
- `backend/src/models/SubMap.js` - Sequelize model
- `backend/src/controllers/subMapController.js` - API controller
- `backend/src/routes/subMapRoutes.js` - API routes
- `backend/src/services/subMapService.js` - Business logic
- `backend/src/services/subMapGenerator.js` - Procedural generation

#### Modified Files:
- `frontend/src/pages/PlanetSurface.jsx` - Add "Enter" functionality
- `frontend/src/App.jsx` - Add sub-map routes
- `backend/src/migrations/` - Add sub_maps table migration
- `backend/src/data/planetMaps.js` - Add sub-map references

### 13. Success Criteria

1. ✅ Players can enter cities and see detailed street layouts
2. ✅ Players can enter spaceports and navigate terminals/hangars
3. ✅ Players can enter buildings (cantinas, palaces, etc.) and see interiors
4. ✅ Players can navigate between sub-maps and return to planet surface
5. ✅ Sub-maps are visually distinct and match location themes
6. ✅ NPCs spawn appropriately in sub-maps
7. ✅ System is extensible for new location types
8. ✅ Performance is acceptable (60fps rendering)
9. ✅ Data is efficiently stored and retrieved
10. ✅ Lore-accurate for Star Wars locations

## Conclusion

This sub-map system will significantly enhance the game's exploration and immersion by allowing players to enter and explore detailed locations. The template-based approach ensures consistency while allowing for procedural variety. The hierarchical navigation system maintains context and provides clear player orientation.

The implementation should be phased, starting with core templates (city, spaceport, market) and building up to more complex building interiors. Each phase should be tested and polished before moving to the next.

The system is designed to be extensible, allowing easy addition of new location types and templates as the game evolves.


