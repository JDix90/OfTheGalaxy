# Terrain Navigation System Analysis
## Learning from Classic RPGs: Pokemon, Zelda, Runescape, KOTOR

## Core Principles from Classic Games

### 1. **Visual Clarity is Everything**
**What Makes These Games Work:**
- **Pokemon**: Trees, rocks, water are VISUALLY OBVIOUS. You see a tree, you know you can't walk through it.
- **Zelda**: Walls, rocks, bushes are distinct visual elements. No ambiguity.
- **Runescape**: Buildings have clear walls, roads are distinct from grass, water is obvious.
- **KOTOR**: 3D buildings and structures that clearly block movement.

**Key Insight:** Players should NEVER wonder "can I walk here?" - it should be visually obvious.

### 2. **Tile-Based or Zone-Based Systems**
**How They Work:**
- **Pokemon/Zelda**: Grid-based tiles (16x16 or 32x32 pixels per tile)
- Each tile is either walkable or not
- Visual representation matches the logic exactly
- Simple binary: Can walk? Yes/No

**Our Approach:**
- Use a **tile grid system** (e.g., 2% of map per tile = 50x50 grid)
- Each tile has a type: `walkable`, `building`, `street`, `alley`, `plaza`
- Visual rendering matches tile type exactly

### 3. **Clear Pathway Visualization**
**What They Do:**
- **Pokemon Routes**: Distinct terrain (grass vs. road vs. water)
- **Runescape Roads**: Clearly marked paths between cities
- **Zelda Paths**: Stone paths, bridges, obvious routes
- **KOTOR Streets**: 3D street models that guide movement

**Our Approach:**
- Draw **actual streets** as light-colored pathways
- Draw **buildings** as dark rectangular blocks
- Make main routes visually prominent (wider, brighter)
- Secondary routes (alleys) narrower and darker

### 4. **Obstacle Types by Environment**
**Examples:**
- **Urban (KOTOR Taris)**: Buildings, walls, structures (rectangular blocks)
- **Forest (Pokemon)**: Trees (circular), bushes, tall grass
- **Desert (Zelda)**: Rocks, sand dunes, quicksand
- **Ocean (Runescape)**: Water (blue), islands (land), bridges

**Our System:**
- **Urban Planets**: Buildings (dark rectangles), streets (light paths), plazas (open areas)
- **Desert Planets**: Rocks (dark circles), dunes (textured), oases (light)
- **Ocean Planets**: Water (dark blue), islands (light), channels (lighter blue)
- **Forest Planets**: Trees (dark circles), clearings (light), paths (obvious)

### 5. **Simple Movement Rules**
**How They Work:**
- Click/tap walkable area → move there
- Click obstacle → can't move (maybe show "Blocked" message)
- Pathfinding is automatic and invisible
- Visual feedback on hover (highlight walkable tiles)

**Our System:**
- Click on walkable tile → move
- Click on building/obstacle → show "Cannot move here - Building blocks the way"
- Hover shows tile type
- Simple path preview (line, not complex visualization)

---

## Proposed System: Tile-Based Visual Navigation

### Architecture

#### Tile Grid System
```
Map: 100x100 (percentage coordinates)
Tile Size: 2% of map = 50x50 tile grid
Each tile: walkable or obstacle
```

#### Tile Types (Urban Planet Example)
1. **Building** (obstacle)
   - Visual: Dark rectangular block
   - Size: 2-4 tiles
   - Placement: Around POIs

2. **Main Street** (walkable)
   - Visual: Wide light gray/white path
   - Width: 3-4 tiles
   - Connects major districts

3. **Alley** (walkable)
   - Visual: Narrow darker path
   - Width: 1-2 tiles
   - Connects buildings

4. **Plaza** (walkable)
   - Visual: Open light area
   - Size: 4-8 tiles
   - Around major POIs (markets, spaceports)

5. **Open Space** (walkable)
   - Visual: Base terrain color
   - Default walkable area

### Visual Rendering Strategy

#### Layer Order (Bottom to Top)
1. **Base Terrain**: Planet background color/texture
2. **Buildings**: Dark rectangular blocks (obstacles)
3. **Streets/Alleys**: Light pathways (walkable)
4. **Plazas**: Open areas (walkable)
5. **POIs**: Icons on top
6. **Player**: On top of everything

#### Urban Planet Visual Style
```
[Building] [Street] [Building] [Street] [Building]
[Street]   [Plaza]  [Street]   [Plaza]  [Street]
[Building] [Alley]  [Building] [Alley]  [Building]
```

**Colors:**
- Buildings: `rgba(20, 20, 30, 0.8)` - Dark, obvious blocks
- Main Streets: `rgba(180, 180, 200, 0.6)` - Light, wide paths
- Alleys: `rgba(120, 120, 140, 0.5)` - Narrower, darker
- Plazas: `rgba(200, 200, 220, 0.3)` - Open areas

### Implementation Plan

#### Phase 1: Tile Map Generation
1. Create 50x50 tile grid for 100x100 map
2. Generate tile map based on POI locations:
   - Place buildings around POIs
   - Create streets connecting districts
   - Add plazas around major locations
   - Fill remaining with open space

#### Phase 2: Visual Rendering
1. Render base terrain
2. Render buildings (dark blocks)
3. Render streets (light paths)
4. Render plazas (open areas)
5. Render POIs on top
6. Render player

#### Phase 3: Movement System
1. Convert click coordinates to tile coordinates
2. Check tile type (walkable or obstacle)
3. If walkable, calculate path through walkable tiles
4. Move player along path
5. If obstacle, show "Blocked" message

#### Phase 4: Planet-Type System
1. Define obstacle types per planet type
2. Create rendering functions for each type
3. Apply appropriate visuals

---

## Nar Shaddaa Specific Design

### District Layout
1. **Spaceport District** (48, 48)
   - Large plaza (walkable)
   - Building blocks around edges
   - Main streets radiating outward

2. **Entertainment District** (30, 35)
   - Multiple buildings (casinos, clubs)
   - Wide main street from spaceport
   - Narrow alleys between buildings

3. **Upper Levels** (75, 25)
   - Large buildings (palaces, mansions)
   - Elevated pathways (skywalks)
   - Exclusive access routes

4. **Central City** (50, 50)
   - Grid-like street system
   - Buildings around markets
   - Multiple plazas

5. **Lower Levels** (15, 75)
   - Dense building blocks
   - Narrow winding alleys
   - Few open spaces

### Pathway Network
- **Main Arteries**: Wide streets connecting districts
- **Secondary Routes**: Alleys connecting buildings
- **Plazas**: Open areas at major POIs
- **Connections**: Clear visual routes from spaceport to all districts

---

## Key Differences from Current System

### Current (Wrong):
- Abstract NavMesh polygons (not visually clear)
- Subtle building blocks (hard to see)
- Complex pathfinding visualization
- Not intuitive

### Proposed (Right):
- Clear tile-based system
- Obvious visual obstacles (dark buildings)
- Simple pathway visualization (light streets)
- Visually intuitive like classic RPGs

---

## Success Criteria

1. ✅ **Visual Clarity**: Player immediately sees what's walkable
2. ✅ **Intuitive**: No explanation needed - obvious from visuals
3. ✅ **Lore-Accurate**: Obstacles match planet type
4. ✅ **Simple**: Works like Pokemon/Zelda - just works
