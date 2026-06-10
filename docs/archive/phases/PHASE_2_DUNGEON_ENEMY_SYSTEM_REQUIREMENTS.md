# Phase 2: Dungeon Enemy System - Requirements & Integration Guide

## Document Status
**Version:** 1.0  
**Date:** Created for Phase 2 Implementation  
**Status:** Ready for Implementation

---

## Executive Summary

Phase 2 implements the enemy system for dungeon submaps, including depth-based enemy spawning, difficulty scaling, visual representation, and combat initiation. This phase transforms dungeons from empty mazes into challenging combat encounters that scale with player progression and dungeon depth.

**Key Features:**
- Depth-based enemy placement in rooms
- Difficulty scaling by depth zone
- Red enemy icons with pulsing animation
- Combat initiation at 1 adjacent cell distance
- Enemy respawn on re-entry
- Exclusion of regular NPCs from dungeons

---

## 1. Core Requirements

### 1.1 NPC Exclusion Rule
**CRITICAL:** Regular NPCs (quest givers, vendors, dialogue NPCs) **MUST NOT** populate in dungeon submaps.

**Implementation:**
- Modify `loadSubMapNPCs()` in `SubMapView.jsx` to skip NPC loading for dungeon types
- Update `npcController.getBySubMap()` to return empty array for dungeon submaps
- Prevent `npcGenerator.generateSubMapNPCs()` from generating NPCs for dungeon types
- Ensure no NPCs are loaded or displayed when `subMap.type === 'dungeon'`

**Code Changes:**
```javascript
// In SubMapView.jsx - loadSubMapNPCs()
if (subMap.type === 'dungeon') {
  // Dungeons do not have regular NPCs - only enemy combatants
  setNpcs([]);
  return;
}
```

### 1.2 Enemy Combatant System
Dungeons use a separate enemy combatant system distinct from regular NPCs:
- **Enemy Combatants:** Hostile entities that trigger combat
- **Storage:** Stored in `subMap.metadata.enemies` array
- **Visual:** Red icons (distinct from gold NPC icons)
- **Behavior:** Auto-trigger combat when player is within 1 adjacent cell

---

## 2. Enemy Spawning System

### 2.1 Depth-Based Placement

**Enemy Spawn Rules:**
1. **Spawn Locations:** Enemies spawn only in **rooms** (cell type `2`), never in corridors
2. **Depth Zones:** Enemy difficulty and density scale with depth zone:
   - **Entrance (Zone 0):** No enemies (safe zone)
   - **Shallow (Zone 1):** 20% of rooms have enemies (1-2 enemies per room)
   - **Mid (Zone 2):** 40% of rooms have enemies (1-3 enemies per room)
   - **Deep (Zone 3):** 60% of rooms have enemies (2-3 enemies per room)
   - **Boss (Zone 4):** Boss room always has 1 boss enemy

3. **Spawn Distance:** Enemies spawn at least 2 cells away from entrance
4. **Room Selection:** Random selection of eligible rooms based on depth zone

### 2.2 Enemy Spawn Algorithm

**Pseudocode:**
```javascript
function spawnDungeonEnemies(dungeonLayout, playerLevel, dungeonType) {
  const enemies = [];
  const { grid, rooms, depthZones, entrance } = dungeonLayout;
  
  // Skip entrance zone (zone 0)
  for (let zoneIndex = 1; zoneIndex < depthZones.length; zoneIndex++) {
    const zone = depthZones[zoneIndex];
    const zoneRooms = rooms.filter(room => room.depth === zoneIndex);
    
    // Calculate spawn density for this zone
    const spawnDensity = getSpawnDensity(zoneIndex);
    const roomsToSpawn = Math.ceil(zoneRooms.length * spawnDensity);
    
    // Randomly select rooms
    const selectedRooms = shuffle(zoneRooms).slice(0, roomsToSpawn);
    
    // Spawn enemies in selected rooms
    for (const room of selectedRooms) {
      const enemyCount = getEnemyCountForZone(zoneIndex);
      const roomEnemies = spawnEnemiesInRoom(
        room, 
        enemyCount, 
        playerLevel, 
        zoneIndex,
        dungeonType
      );
      enemies.push(...roomEnemies);
    }
  }
  
  // Always spawn boss in boss room (zone 4)
  const bossRoom = findBossRoom(dungeonLayout);
  if (bossRoom) {
    const boss = spawnBossEnemy(bossRoom, playerLevel, dungeonType);
    enemies.push(boss);
  }
  
  return enemies;
}
```

### 2.3 Spawn Density Configuration

```javascript
const SPAWN_DENSITY = {
  entrance: 0.0,  // No enemies in entrance zone
  shallow: 0.2,   // 20% of rooms
  mid: 0.4,       // 40% of rooms
  deep: 0.6,      // 60% of rooms
  boss: 1.0       // Always spawn boss
};

const ENEMY_COUNT_PER_ROOM = {
  shallow: { min: 1, max: 2 },
  mid: { min: 1, max: 3 },
  deep: { min: 2, max: 3 },
  boss: { min: 1, max: 1 }
};
```

### 2.4 Enemy Selection by Dungeon Type

Different dungeon types should favor different enemy types:

```javascript
const DUNGEON_ENEMY_POOLS = {
  danger: ['pirate', 'syndicate_thug', 'wampa', 'tusken_raider'],
  mine: ['syndicate_thug', 'mining_droid', 'security_droid'],
  underworld: ['syndicate_thug', 'pirate', 'criminal', 'bounty_hunter'],
  cave: ['wampa', 'wild_animal', 'creature'],
  ruins: ['ancient_guardian', 'security_droid', 'ghost'],
  fortress: ['stormtrooper', 'stormtrooper_sergeant', 'imperial_officer']
};
```

---

## 3. Difficulty Scaling System

### 3.1 Depth-Based Difficulty Tiers

**Difficulty increases with depth:**

| Depth Zone | Difficulty Tier | Multiplier | Description |
|------------|----------------|------------|-------------|
| Entrance (0) | None | N/A | Safe zone, no enemies |
| Shallow (1) | Easy | 0.8x | 20% easier than player level |
| Mid (2) | Moderate | 1.0x | Matches player level |
| Deep (3) | Hard | 1.3x | 30% harder than player level |
| Boss (4) | Very Hard | 1.5x | 50% harder than player level |

### 3.2 Enemy Scaling Formula

**Base Scaling (from existing system):**
```javascript
// From enemyTemplates.js - scaleEnemyForLevel()
function scaleEnemyForLevel(enemyTemplate, playerLevel, difficulty) {
  const levelDiff = enemyTemplate.level - playerLevel;
  const baseMultiplier = 1 + (levelDiff * 0.08); // 8% per level difference
  
  // Apply difficulty tier multiplier
  const difficultyMultipliers = {
    easy: 0.8,
    moderate: 1.0,
    hard: 1.3
  };
  
  const difficultyMultiplier = difficultyMultipliers[difficulty] || 1.0;
  
  // Scale stats
  const healthMultiplier = baseMultiplier * difficultyMultiplier;
  const attackMultiplier = baseMultiplier * difficultyMultiplier;
  const defenseMultiplier = baseMultiplier * difficultyMultiplier;
  
  // Apply to enemy stats
  return {
    ...enemyTemplate,
    level: playerLevel + Math.floor(levelDiff * difficultyMultiplier),
    stats: {
      health: Math.floor(enemyTemplate.stats.health * healthMultiplier),
      maxHealth: Math.floor(enemyTemplate.stats.maxHealth * healthMultiplier),
      attack: Math.floor(enemyTemplate.stats.attack * attackMultiplier),
      defense: Math.floor(enemyTemplate.stats.defense * defenseMultiplier),
      // ... other stats
    },
    xpReward: Math.floor(enemyTemplate.xpReward * difficultyMultiplier),
    creditsReward: Math.floor(enemyTemplate.creditsReward * difficultyMultiplier)
  };
}
```

**Depth-Based Enhancement:**
```javascript
function scaleEnemyForDepth(enemyTemplate, playerLevel, depthZone) {
  const difficultyTiers = {
    0: null,        // Entrance - no enemies
    1: 'easy',      // Shallow
    2: 'moderate',  // Mid
    3: 'hard',      // Deep
    4: 'very_hard'  // Boss
  };
  
  const difficulty = difficultyTiers[depthZone];
  if (!difficulty) return null; // No enemy in entrance
  
  // For boss zone, use very_hard multiplier
  if (depthZone === 4) {
    return scaleEnemyForLevel(enemyTemplate, playerLevel, 'hard', 1.5);
  }
  
  return scaleEnemyForLevel(enemyTemplate, playerLevel, difficulty);
}
```

### 3.3 Boss Enemy Scaling

**Boss enemies are special:**
- Use `very_hard` difficulty (1.5x multiplier)
- Additional stat bonuses:
  - +50% health
  - +25% attack
  - +25% defense
- Special boss mechanics (reserved for Phase 5)

---

## 4. Visual Representation

### 4.1 Red Enemy Icons

**Visual Design:**
- **Color:** Red (`#ef4444` or `#dc2626`) - distinct from gold NPC icons
- **Size:** 10-12px radius (slightly larger than player icon)
- **Shape:** Circle with white border
- **Label:** Enemy name or "Enemy" if name unavailable

**Rendering Code:**
```javascript
function drawEnemyIcon(ctx, x, y, enemy, isHovered) {
  const radius = isHovered ? 12 : 10;
  
  // Red fill
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // White border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Pulsing animation (if not in combat)
  if (!enemy.inCombat) {
    const pulse = Math.sin(Date.now() / 500) * 2; // Pulse every 500ms
    ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 + pulse * 0.3})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  
  // Label
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 2;
  ctx.fillText(enemy.name || 'Enemy', x, y + radius + 4);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}
```

### 4.2 Pulsing Animation

**Animation Details:**
- **Frequency:** 500ms cycle (2 pulses per second)
- **Effect:** Border opacity pulses from 0.5 to 0.8
- **Purpose:** Draw attention to enemy presence
- **Disable:** When enemy is in combat or defeated

**Implementation:**
```javascript
// In render loop
const pulsePhase = (Date.now() / 500) % (Math.PI * 2);
const pulseOpacity = 0.5 + (Math.sin(pulsePhase) * 0.3);
```

### 4.3 Enemy Hover Tooltips

**Tooltip Information:**
- Enemy name
- Level
- Difficulty tier (Easy/Moderate/Hard/Very Hard)
- Health bar (if visible)
- Depth zone

**Tooltip Rendering:**
```javascript
function drawEnemyTooltip(ctx, x, y, enemy) {
  const tooltipWidth = 150;
  const tooltipHeight = 80;
  const tooltipX = x - tooltipWidth / 2;
  const tooltipY = y - tooltipHeight - 20;
  
  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
  
  // Border
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
  
  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(enemy.name, tooltipX + 10, tooltipY + 15);
  
  ctx.font = '10px sans-serif';
  ctx.fillText(`Level: ${enemy.level}`, tooltipX + 10, tooltipY + 30);
  ctx.fillText(`Difficulty: ${enemy.difficultyTier}`, tooltipX + 10, tooltipY + 45);
  ctx.fillText(`Zone: ${enemy.depthZone}`, tooltipX + 10, tooltipY + 60);
}
```

---

## 5. Combat Initiation System

### 5.1 Proximity Detection

**CRITICAL REQUIREMENT:** Combat triggers when player is within **1 adjacent cell** of an enemy.

**Adjacent Cell Definition:**
- **Manhattan Distance:** `|playerX - enemyX| + |playerY - enemyY| <= 1`
- **Valid Adjacent Positions:**
  - Same cell: `(0, 0)` - player on enemy cell
  - North: `(0, -1)` - player 1 cell above enemy
  - South: `(0, +1)` - player 1 cell below enemy
  - East: `(+1, 0)` - player 1 cell right of enemy
  - West: `(-1, 0)` - player 1 cell left of enemy

**NOT Valid (diagonal):**
- `(1, 1)` - diagonal (Manhattan distance = 2)
- `(-1, -1)` - diagonal (Manhattan distance = 2)

### 5.2 Combat Trigger Logic

**Implementation:**
```javascript
function checkCombatProximity(playerGridPos, enemies, grid) {
  for (const enemy of enemies) {
    if (enemy.defeated || enemy.inCombat) continue;
    
    const enemyGridPos = enemy.position; // { x, y } in grid coordinates
    
    // Calculate Manhattan distance
    const dx = Math.abs(playerGridPos.x - enemyGridPos.x);
    const dy = Math.abs(playerGridPos.y - enemyGridPos.y);
    const distance = dx + dy;
    
    // Check if adjacent (distance <= 1)
    if (distance <= 1) {
      // Verify path is clear (optional - can skip for adjacent)
      // For now, adjacent = immediate combat trigger
      return {
        shouldTrigger: true,
        enemy: enemy,
        distance: distance
      };
    }
  }
  
  return { shouldTrigger: false };
}
```

### 5.3 Combat Initiation Flow

**Sequence:**
1. Player moves to new cell
2. Check proximity to all active enemies
3. If enemy within 1 adjacent cell:
   - Mark enemy as `inCombat: true`
   - Create combat encounter via `combatService.createEncounter()`
   - Navigate to combat view
   - Remove enemy from map (or mark as defeated after combat)

**Code Integration:**
```javascript
// In SubMapView.jsx - after player movement
async function handlePlayerMovement(newGridPos) {
  // Update player position
  await updatePlayerPosition(newGridPos);
  
  // Check for combat proximity
  const combatCheck = checkCombatProximity(newGridPos, dungeonEnemies, grid);
  
  if (combatCheck.shouldTrigger) {
    const { enemy } = combatCheck;
    
    // Create combat encounter
    const encounter = await combatService.createEncounter(
      characterId,
      'dungeon',
      [enemy.templateId] // Use enemy template ID
    );
    
    // Navigate to combat view
    navigate(`/game/combat/${encounter.id}`);
  }
}
```

### 5.4 Post-Combat Handling

**After Combat:**
1. If player wins:
   - Mark enemy as `defeated: true`
   - Remove enemy from map (or gray out icon)
   - Update dungeon progress
   - Return player to dungeon submap

2. If player loses:
   - Return player to entrance
   - Reset dungeon state (or keep progress)
   - Enemies remain (or respawn based on respawn logic)

3. If player flees:
   - Return player to previous cell
   - Enemy remains active
   - Can re-engage if still adjacent

---

## 6. Enemy Respawn System

### 6.1 Respawn Rules

**When Player Re-enters Dungeon:**
- **Defeated Enemies:** Respawn if player left and re-entered
- **Boss Enemies:** Do NOT respawn if defeated (permanent defeat)
- **Respawn Timing:** Immediate on re-entry (no cooldown)

**Respawn Logic:**
```javascript
function shouldRespawnEnemy(enemy, dungeonProgress) {
  // Boss enemies never respawn
  if (enemy.isBoss && enemy.defeated) {
    return false;
  }
  
  // Regular enemies respawn on re-entry
  if (enemy.defeated && dungeonProgress.lastExitTime) {
    return true; // Player left and returned
  }
  
  return false;
}
```

### 6.2 Respawn Implementation

**On Dungeon Entry:**
```javascript
async function loadDungeonEnemies(subMap, character) {
  const metadata = subMap.metadata || {};
  const existingEnemies = metadata.enemies || [];
  const dungeonProgress = metadata.progress || {};
  
  // Check if player re-entered
  const lastExitTime = dungeonProgress.lastExitTime;
  const hasReEntered = lastExitTime && (Date.now() - lastExitTime) > 1000; // 1 second buffer
  
  if (hasReEntered) {
    // Respawn defeated enemies (except bosses)
    const respawnedEnemies = existingEnemies.map(enemy => {
      if (shouldRespawnEnemy(enemy, dungeonProgress)) {
        return {
          ...enemy,
          defeated: false,
          inCombat: false,
          currentHealth: enemy.maxHealth // Reset health
        };
      }
      return enemy;
    });
    
    // Update submap metadata
    await updateSubMapMetadata(subMap.id, {
      enemies: respawnedEnemies
    });
    
    return respawnedEnemies;
  }
  
  // First entry - spawn enemies
  if (existingEnemies.length === 0) {
    const newEnemies = await spawnDungeonEnemies(
      subMap.layoutData,
      character.level,
      subMap.metadata.dungeonType
    );
    
    // Save to metadata
    await updateSubMapMetadata(subMap.id, {
      enemies: newEnemies
    });
    
    return newEnemies;
  }
  
  return existingEnemies;
}
```

---

## 7. Data Models & Database

### 7.1 SubMap Metadata Structure

**Enemy Storage:**
```javascript
{
  metadata: {
    dungeonType: 'danger',
    designVariant: 'spiral_depth',
    algorithm: 'recursive_backtracking',
    enemies: [
      {
        id: 'enemy_001',
        templateId: 'syndicate_thug',
        name: 'Syndicate Thug',
        level: 5,
        difficultyTier: 'moderate',
        depthZone: 2,
        position: { x: 12, y: 15 }, // Grid coordinates
        stats: {
          health: 150,
          maxHealth: 150,
          attack: 25,
          defense: 18,
          // ... other stats
        },
        defeated: false,
        inCombat: false,
        isBoss: false,
        xpReward: 50,
        creditsReward: 100
      },
      // ... more enemies
    ],
    progress: {
      exploredCells: [],
      defeatedEnemies: ['enemy_001', 'enemy_003'],
      lastExitTime: null,
      lastEntryTime: Date.now()
    }
  }
}
```

### 7.2 Enemy Data Schema

```javascript
interface DungeonEnemy {
  id: string;                    // Unique enemy ID
  templateId: string;             // Reference to enemyTemplates.js
  name: string;                   // Display name
  level: number;                 // Scaled level
  difficultyTier: 'easy' | 'moderate' | 'hard' | 'very_hard';
  depthZone: number;              // 0-4 (entrance to boss)
  position: { x: number; y: number; }; // Grid coordinates
  stats: {
    health: number;
    maxHealth: number;
    attack: number;
    defense: number;
    stamina: number;
    maxStamina: number;
    speed: number;
    accuracy: number;
  };
  defeated: boolean;
  inCombat: boolean;
  isBoss: boolean;
  xpReward: number;
  creditsReward: number;
  lootTable?: Array<{ itemId: string; chance: number; quantity: number; }>;
}
```

---

## 8. API Endpoints

### 8.1 New Endpoints

**Get Dungeon Enemies:**
```
GET /api/submaps/:subMapId/enemies
Response: {
  success: true,
  data: Array<DungeonEnemy>
}
```

**Update Enemy State:**
```
PUT /api/submaps/:subMapId/enemies/:enemyId
Body: {
  defeated: boolean,
  inCombat: boolean,
  currentHealth: number
}
Response: {
  success: true,
  data: DungeonEnemy
}
```

**Spawn Dungeon Enemies:**
```
POST /api/submaps/:subMapId/enemies/spawn
Body: {
  playerLevel: number,
  dungeonType: string
}
Response: {
  success: true,
  data: Array<DungeonEnemy>,
  count: number
}
```

### 8.2 Modified Endpoints

**Get SubMap (Enhanced):**
```
GET /api/submaps/:subMapId
Response: {
  ...existing submap data,
  enemies: Array<DungeonEnemy>, // Added
  progress: DungeonProgress     // Added
}
```

---

## 9. Frontend Components

### 9.1 Enemy Rendering Component

**New File:** `frontend/src/utils/dungeonEnemyRenderer.js`

```javascript
export function drawDungeonEnemies(ctx, width, height, enemies, grid, layout, hoveredEnemy) {
  if (!enemies || enemies.length === 0) return;
  
  const gridWidth = layout.size?.width || 20;
  const gridHeight = layout.size?.height || 20;
  const cellWidth = width / gridWidth;
  const cellHeight = height / gridHeight;
  
  enemies.forEach(enemy => {
    if (enemy.defeated) return; // Skip defeated enemies
    
    // Convert grid coordinates to pixel coordinates
    const pixelX = (enemy.position.x + 0.5) * cellWidth;
    const pixelY = (enemy.position.y + 0.5) * cellHeight;
    
    // Draw enemy icon
    drawEnemyIcon(ctx, pixelX, pixelY, enemy, hoveredEnemy?.id === enemy.id);
    
    // Draw tooltip if hovered
    if (hoveredEnemy?.id === enemy.id) {
      drawEnemyTooltip(ctx, pixelX, pixelY, enemy);
    }
  });
}
```

### 9.2 Combat Proximity Checker

**New File:** `frontend/src/utils/dungeonCombatTrigger.js`

```javascript
export function checkCombatProximity(playerGridPos, enemies) {
  for (const enemy of enemies) {
    if (enemy.defeated || enemy.inCombat) continue;
    
    const dx = Math.abs(playerGridPos.x - enemy.position.x);
    const dy = Math.abs(playerGridPos.y - enemy.position.y);
    const distance = dx + dy;
    
    if (distance <= 1) {
      return {
        shouldTrigger: true,
        enemy: enemy,
        distance: distance
      };
    }
  }
  
  return { shouldTrigger: false };
}
```

### 9.3 SubMapView Integration

**Modifications to `SubMapView.jsx`:**

1. **Skip NPC Loading for Dungeons:**
```javascript
const loadSubMapNPCs = useCallback(async (subMap) => {
  // CRITICAL: Dungeons do not have regular NPCs
  if (subMap.type === 'dungeon') {
    setNpcs([]);
    return;
  }
  
  // ... existing NPC loading logic for non-dungeons
}, []);
```

2. **Load Dungeon Enemies:**
```javascript
const [dungeonEnemies, setDungeonEnemies] = useState([]);

const loadDungeonEnemies = useCallback(async (subMap, character) => {
  if (subMap.type !== 'dungeon') return;
  
  try {
    const response = await subMapApi.getDungeonEnemies(subMap.id);
    if (response.success) {
      setDungeonEnemies(response.data || []);
    }
  } catch (error) {
    console.error('Failed to load dungeon enemies:', error);
    setDungeonEnemies([]);
  }
}, []);
```

3. **Combat Proximity Check:**
```javascript
// After player movement
useEffect(() => {
  if (subMap?.type !== 'dungeon' || !currentCharacter || dungeonEnemies.length === 0) return;
  
  const playerGridPos = percentToGrid(
    currentCharacter.currentLocation.x,
    currentCharacter.currentLocation.y,
    layout.size.width,
    layout.size.height
  );
  
  const combatCheck = checkCombatProximity(playerGridPos, dungeonEnemies);
  
  if (combatCheck.shouldTrigger) {
    handleCombatTrigger(combatCheck.enemy);
  }
}, [currentCharacter?.currentLocation, dungeonEnemies, subMap]);
```

4. **Render Enemies:**
```javascript
// In renderSubMapOptimized
if (subMap.type === 'dungeon' && dungeonEnemies.length > 0) {
  drawDungeonEnemies(
    ctx,
    width,
    height,
    dungeonEnemies,
    layout.grid,
    layout,
    hoveredEnemy
  );
}
```

---

## 10. Backend Services

### 10.1 Dungeon Enemy Service

**New File:** `backend/src/services/dungeonEnemyService.js`

```javascript
const { SubMap } = require('../models');
const { generateRandomEnemy, getEnemyTemplate } = require('../data/enemyTemplates');
const { spawnDungeonEnemies } = require('../utils/dungeonEnemySpawner');

class DungeonEnemyService {
  /**
   * Get enemies for a dungeon submap
   */
  async getDungeonEnemies(subMapId) {
    const subMap = await SubMap.findByPk(subMapId);
    if (!subMap || subMap.type !== 'dungeon') {
      throw new Error('SubMap is not a dungeon');
    }
    
    const metadata = subMap.metadata || {};
    return metadata.enemies || [];
  }
  
  /**
   * Spawn enemies for a dungeon
   */
  async spawnDungeonEnemies(subMapId, playerLevel) {
    const subMap = await SubMap.findByPk(subMapId);
    if (!subMap || subMap.type !== 'dungeon') {
      throw new Error('SubMap is not a dungeon');
    }
    
    const layout = subMap.layoutData || {};
    const dungeonType = subMap.metadata?.dungeonType || 'danger';
    
    // Spawn enemies
    const enemies = spawnDungeonEnemies(layout, playerLevel, dungeonType);
    
    // Update submap metadata
    const metadata = subMap.metadata || {};
    metadata.enemies = enemies;
    metadata.progress = metadata.progress || {};
    metadata.progress.lastEntryTime = new Date();
    
    await subMap.update({ metadata });
    
    return enemies;
  }
  
  /**
   * Update enemy state (defeated, inCombat, etc.)
   */
  async updateEnemyState(subMapId, enemyId, updates) {
    const subMap = await SubMap.findByPk(subMapId);
    if (!subMap || subMap.type !== 'dungeon') {
      throw new Error('SubMap is not a dungeon');
    }
    
    const metadata = subMap.metadata || {};
    const enemies = metadata.enemies || [];
    
    const enemyIndex = enemies.findIndex(e => e.id === enemyId);
    if (enemyIndex === -1) {
      throw new Error('Enemy not found');
    }
    
    enemies[enemyIndex] = { ...enemies[enemyIndex], ...updates };
    metadata.enemies = enemies;
    
    await subMap.update({ metadata });
    
    return enemies[enemyIndex];
  }
  
  /**
   * Handle enemy respawn on re-entry
   */
  async handleDungeonReEntry(subMapId) {
    const subMap = await SubMap.findByPk(subMapId);
    if (!subMap || subMap.type !== 'dungeon') {
      throw new Error('SubMap is not a dungeon');
    }
    
    const metadata = subMap.metadata || {};
    const enemies = metadata.enemies || [];
    const progress = metadata.progress || {};
    
    // Respawn defeated enemies (except bosses)
    const respawnedEnemies = enemies.map(enemy => {
      if (enemy.defeated && !enemy.isBoss) {
        return {
          ...enemy,
          defeated: false,
          inCombat: false,
          stats: {
            ...enemy.stats,
            health: enemy.stats.maxHealth
          }
        };
      }
      return enemy;
    });
    
    metadata.enemies = respawnedEnemies;
    metadata.progress.lastEntryTime = new Date();
    
    await subMap.update({ metadata });
    
    return respawnedEnemies;
  }
}

module.exports = new DungeonEnemyService();
```

### 10.2 Dungeon Enemy Spawner Utility

**New File:** `backend/src/utils/dungeonEnemySpawner.js`

```javascript
const { generateRandomEnemy, getEnemyTemplate } = require('../data/enemyTemplates');
const { v4: uuidv4 } = require('uuid');

const SPAWN_DENSITY = {
  0: 0.0,  // Entrance - no enemies
  1: 0.2,  // Shallow - 20%
  2: 0.4,  // Mid - 40%
  3: 0.6,  // Deep - 60%
  4: 1.0   // Boss - always
};

const ENEMY_COUNT_PER_ROOM = {
  1: { min: 1, max: 2 },  // Shallow
  2: { min: 1, max: 3 },  // Mid
  3: { min: 2, max: 3 },  // Deep
  4: { min: 1, max: 1 }   // Boss
};

const DUNGEON_ENEMY_POOLS = {
  danger: ['pirate', 'syndicate_thug', 'wampa', 'tusken_raider'],
  mine: ['syndicate_thug', 'mining_droid', 'security_droid'],
  underworld: ['syndicate_thug', 'pirate', 'criminal', 'bounty_hunter'],
  cave: ['wampa', 'wild_animal', 'creature'],
  ruins: ['ancient_guardian', 'security_droid', 'ghost'],
  fortress: ['stormtrooper', 'stormtrooper_sergeant', 'imperial_officer']
};

function getDifficultyTier(depthZone) {
  const tiers = {
    0: null,
    1: 'easy',
    2: 'moderate',
    3: 'hard',
    4: 'very_hard'
  };
  return tiers[depthZone] || 'moderate';
}

function spawnEnemiesInRoom(room, count, playerLevel, depthZone, dungeonType) {
  const enemies = [];
  const enemyPool = DUNGEON_ENEMY_POOLS[dungeonType] || DUNGEON_ENEMY_POOLS.danger;
  const difficultyTier = getDifficultyTier(depthZone);
  
  for (let i = 0; i < count; i++) {
    // Select random enemy from pool
    const templateId = enemyPool[Math.floor(Math.random() * enemyPool.length)];
    const baseTemplate = getEnemyTemplate(templateId);
    
    if (!baseTemplate) continue;
    
    // Scale enemy for level and difficulty
    const scaledEnemy = scaleEnemyForDepth(baseTemplate, playerLevel, depthZone);
    
    if (!scaledEnemy) continue;
    
    // Random position within room
    const roomX = room.x + Math.floor(Math.random() * room.width);
    const roomY = room.y + Math.floor(Math.random() * room.height);
    
    enemies.push({
      id: uuidv4(),
      templateId: templateId,
      name: scaledEnemy.name,
      level: scaledEnemy.level,
      difficultyTier: difficultyTier,
      depthZone: depthZone,
      position: { x: roomX, y: roomY },
      stats: scaledEnemy.stats,
      defeated: false,
      inCombat: false,
      isBoss: depthZone === 4,
      xpReward: scaledEnemy.xpReward,
      creditsReward: scaledEnemy.creditsReward,
      lootTable: scaledEnemy.lootTable || []
    });
  }
  
  return enemies;
}

function scaleEnemyForDepth(enemyTemplate, playerLevel, depthZone) {
  const difficultyTier = getDifficultyTier(depthZone);
  if (!difficultyTier) return null;
  
  // Use existing scaleEnemyForLevel function
  const { scaleEnemyForLevel } = require('../data/enemyTemplates');
  
  // For boss zone, apply additional multiplier
  if (depthZone === 4) {
    const scaled = scaleEnemyForLevel(enemyTemplate, playerLevel, 'hard');
    // Apply 1.5x multiplier for bosses
    return {
      ...scaled,
      stats: {
        ...scaled.stats,
        health: Math.floor(scaled.stats.health * 1.5),
        maxHealth: Math.floor(scaled.stats.maxHealth * 1.5),
        attack: Math.floor(scaled.stats.attack * 1.25),
        defense: Math.floor(scaled.stats.defense * 1.25)
      },
      xpReward: Math.floor(scaled.xpReward * 1.5),
      creditsReward: Math.floor(scaled.creditsReward * 1.5)
    };
  }
  
  return scaleEnemyForLevel(enemyTemplate, playerLevel, difficultyTier);
}

function spawnDungeonEnemies(layout, playerLevel, dungeonType) {
  const { grid, rooms, depthZones, entrance } = layout;
  const enemies = [];
  
  // Skip entrance zone (zone 0)
  for (let zoneIndex = 1; zoneIndex < depthZones.length; zoneIndex++) {
    const zone = depthZones[zoneIndex];
    const zoneRooms = rooms.filter(room => room.depth === zoneIndex);
    
    if (zoneRooms.length === 0) continue;
    
    // Calculate spawn density
    const spawnDensity = SPAWN_DENSITY[zoneIndex] || 0.2;
    const roomsToSpawn = Math.max(1, Math.ceil(zoneRooms.length * spawnDensity));
    
    // Randomly select rooms
    const shuffledRooms = [...zoneRooms].sort(() => Math.random() - 0.5);
    const selectedRooms = shuffledRooms.slice(0, roomsToSpawn);
    
    // Spawn enemies in selected rooms
    for (const room of selectedRooms) {
      const countRange = ENEMY_COUNT_PER_ROOM[zoneIndex] || { min: 1, max: 2 };
      const enemyCount = countRange.min + Math.floor(Math.random() * (countRange.max - countRange.min + 1));
      
      const roomEnemies = spawnEnemiesInRoom(room, enemyCount, playerLevel, zoneIndex, dungeonType);
      enemies.push(...roomEnemies);
    }
  }
  
  // Always spawn boss in boss room (zone 4)
  const bossRoom = rooms.find(room => room.depth === 4) || 
                   { x: layout.bossRoom?.x || layout.size.width - 5, 
                     y: layout.bossRoom?.y || layout.size.height - 5, 
                     width: 5, height: 5 };
  
  if (bossRoom) {
    const boss = spawnEnemiesInRoom(bossRoom, 1, playerLevel, 4, dungeonType);
    enemies.push(...boss);
  }
  
  return enemies;
}

module.exports = {
  spawnDungeonEnemies,
  spawnEnemiesInRoom,
  scaleEnemyForDepth
};
```

---

## 11. Integration Points

### 11.1 Combat Service Integration

**Modify `combatService.createEncounter()` to handle dungeon enemies:**

```javascript
// In combatService.js
async createEncounter(characterId, encounterType, enemies = null, options = {}) {
  // ... existing code ...
  
  // If this is a dungeon encounter, use enemy data from options
  if (encounterType === 'dungeon' && options.dungeonEnemy) {
    const dungeonEnemy = options.dungeonEnemy;
    const enemyTemplate = getEnemyTemplate(dungeonEnemy.templateId);
    
    if (!enemyTemplate) {
      throw new Error(`Enemy template not found: ${dungeonEnemy.templateId}`);
    }
    
    // Use scaled stats from dungeon enemy
    const enemyCombatant = {
      id: dungeonEnemy.id,
      type: 'enemy',
      name: dungeonEnemy.name,
      level: dungeonEnemy.level,
      stats: dungeonEnemy.stats,
      equipment: enemyTemplate.equipment || {},
      lootTable: dungeonEnemy.lootTable || enemyTemplate.lootTable || []
    };
    
    combatants.push(enemyCombatant);
  }
  
  // ... rest of existing code ...
}
```

### 11.2 SubMap Service Integration

**Modify `subMapService.getSubMapForLocation()` to spawn enemies on first entry:**

```javascript
// In subMapService.js
async getSubMapForLocation(planetId, parentLocationId, parentLocationType, locationType) {
  // ... existing submap creation/generation ...
  
  // If this is a dungeon and has no enemies, spawn them
  if (subMap.type === 'dungeon') {
    const metadata = subMap.metadata || {};
    const enemies = metadata.enemies || [];
    
    if (enemies.length === 0) {
      // Get character level (if available)
      const characterLevel = req?.user?.character?.level || 1;
      
      // Spawn enemies
      const dungeonEnemyService = require('./dungeonEnemyService');
      await dungeonEnemyService.spawnDungeonEnemies(subMap.id, characterLevel);
      
      // Reload submap to get enemies
      subMap = await SubMap.findByPk(subMap.id);
    }
  }
  
  return subMap.toJSON();
}
```

---

## 12. Testing Requirements

### 12.1 Functional Tests

1. **Enemy Spawning:**
   - ✅ Enemies spawn only in rooms
   - ✅ No enemies in entrance zone
   - ✅ Spawn density matches depth zone
   - ✅ Boss always spawns in boss room
   - ✅ Enemy count per room is correct

2. **Difficulty Scaling:**
   - ✅ Shallow enemies are easier than player
   - ✅ Mid enemies match player level
   - ✅ Deep enemies are harder than player
   - ✅ Boss enemies are significantly harder

3. **Visual Representation:**
   - ✅ Red enemy icons visible
   - ✅ Pulsing animation works
   - ✅ Tooltips display correctly
   - ✅ Defeated enemies disappear/gray out

4. **Combat Initiation:**
   - ✅ Combat triggers at 1 adjacent cell
   - ✅ Combat does NOT trigger at diagonal
   - ✅ Combat does NOT trigger at distance > 1
   - ✅ Multiple enemies can trigger combat

5. **NPC Exclusion:**
   - ✅ No regular NPCs in dungeon submaps
   - ✅ Only enemy combatants appear
   - ✅ NPC loading is skipped for dungeons

6. **Respawn System:**
   - ✅ Regular enemies respawn on re-entry
   - ✅ Boss enemies do NOT respawn
   - ✅ Respawned enemies have full health

### 12.2 Performance Tests

- Enemy spawning completes in < 200ms
- Combat proximity check completes in < 10ms
- Rendering maintains 60 FPS with 20+ enemies
- No memory leaks from enemy data

### 12.3 Edge Cases

- Empty dungeon (no rooms)
- Single room dungeon
- All enemies defeated
- Player at dungeon entrance
- Player adjacent to multiple enemies
- Boss room without boss

---

## 13. Implementation Checklist

### Backend Tasks
- [ ] Create `dungeonEnemyService.js`
- [ ] Create `dungeonEnemySpawner.js` utility
- [ ] Add enemy spawn endpoints to `subMapController.js`
- [ ] Modify `npcController.getBySubMap()` to exclude dungeons
- [ ] Modify `npcGenerator.generateSubMapNPCs()` to skip dungeons
- [ ] Update `combatService.createEncounter()` for dungeon enemies
- [ ] Add enemy respawn logic
- [ ] Update `subMapService` to spawn enemies on first entry

### Frontend Tasks
- [ ] Create `dungeonEnemyRenderer.js`
- [ ] Create `dungeonCombatTrigger.js`
- [ ] Modify `SubMapView.jsx` to skip NPC loading for dungeons
- [ ] Add dungeon enemy loading to `SubMapView.jsx`
- [ ] Add combat proximity checking
- [ ] Integrate enemy rendering into submap renderer
- [ ] Add enemy hover tooltips
- [ ] Add pulsing animation
- [ ] Update `subMapApi.js` with enemy endpoints

### Testing Tasks
- [ ] Test enemy spawning for all dungeon types
- [ ] Test difficulty scaling across depth zones
- [ ] Test combat trigger at 1 adjacent cell
- [ ] Test NPC exclusion from dungeons
- [ ] Test enemy respawn on re-entry
- [ ] Test boss enemy non-respawn
- [ ] Performance testing

---

## 14. Success Criteria

### Functional Requirements
- ✅ Enemies spawn in rooms with correct density
- ✅ Difficulty scales correctly with depth
- ✅ Red enemy icons visible and animated
- ✅ Combat triggers at 1 adjacent cell
- ✅ No regular NPCs in dungeons
- ✅ Enemies respawn on re-entry (except bosses)

### Performance Requirements
- ✅ Enemy spawning < 200ms
- ✅ Combat check < 10ms
- ✅ Rendering maintains 60 FPS

### User Experience Requirements
- ✅ Enemies are clearly visible
- ✅ Combat feels responsive
- ✅ Difficulty progression is noticeable
- ✅ Visual feedback is clear

---

## 15. Known Limitations & Future Enhancements

### Phase 2 Limitations
- Boss mechanics are basic (Phase 5 will add special mechanics)
- No enemy patrol/movement (static positions)
- No enemy aggro range visualization
- No enemy type variety within same room

### Future Enhancements (Post-Phase 2)
- Enemy patrol patterns
- Enemy aggro visualization
- Multiple enemy types per room
- Elite enemy variants
- Enemy group tactics

---

## Conclusion

Phase 2 transforms dungeons from empty mazes into challenging combat encounters. The system ensures:
- **Clear Visual Feedback:** Red icons with pulsing animation
- **Balanced Difficulty:** Scaling with depth and player level
- **Responsive Combat:** Immediate trigger at 1 adjacent cell
- **Proper Isolation:** No regular NPCs in dungeons
- **Persistent Progress:** Enemy respawn on re-entry (except bosses)

**Ready for Implementation**


