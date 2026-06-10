/**
 * Dungeon Enemy Spawner
 * Handles spawning enemies in dungeon rooms and corridors based on depth zones
 * - Rooms: 1-3 enemies per room (based on depth zone)
 * - Corridors: 1-2 enemies per corridor group (number of groups = number of rooms)
 */

const { getEnemyTemplate, scaleEnemyForLevel } = require('../data/enemyTemplates');
const { v4: uuidv4 } = require('uuid');

/**
 * Spawn density by depth zone
 */
const SPAWN_DENSITY = {
  0: 0.0,  // Entrance - no enemies
  1: 0.2,  // Shallow - 20%
  2: 0.4,  // Mid - 40%
  3: 0.6,  // Deep - 60%
  4: 1.0   // Boss - always
};

/**
 * Enemy count per room by depth zone
 */
const ENEMY_COUNT_PER_ROOM = {
  1: { min: 1, max: 2 },  // Shallow
  2: { min: 1, max: 3 },  // Mid
  3: { min: 2, max: 3 },  // Deep
  4: { min: 1, max: 1 }   // Boss
};

/**
 * Enemy pools by dungeon type
 */
const DUNGEON_ENEMY_POOLS = {
  danger: ['pirate', 'syndicate_thug', 'wild_animal'],
  mine: ['syndicate_thug', 'droid_security'],
  underworld: ['syndicate_thug', 'pirate', 'bounty_hunter'],
  cave: ['wild_animal'],
  ruins: ['droid_security', 'wild_animal'],
  fortress: ['stormtrooper', 'stormtrooper_sergeant']
};

/**
 * Get difficulty tier for depth zone
 */
function getDifficultyTier(depthZone) {
  const tiers = {
    0: null,        // Entrance - no enemies
    1: 'easy',      // Shallow
    2: 'moderate',  // Mid
    3: 'hard',      // Deep
    4: 'very_hard'  // Boss (will use 'hard' with 1.5x multiplier)
  };
  return tiers[depthZone] || 'moderate';
}

/**
 * Scale enemy for depth zone with boss multiplier
 */
function scaleEnemyForDepth(enemyTemplate, playerLevel, depthZone) {
  const difficultyTier = getDifficultyTier(depthZone);
  if (!difficultyTier) return null;
  
  // For boss zone, use 'hard' difficulty with additional multiplier
  if (depthZone === 4) {
    const scaled = scaleEnemyForLevel(enemyTemplate, playerLevel, 'hard');
    if (!scaled) return null;
    
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
  
  // For other zones, use standard scaling
  return scaleEnemyForLevel(enemyTemplate, playerLevel, difficultyTier);
}

/**
 * Enhance loot table for dungeon enemies
 * Adds common/uncommon items and medpacs to dungeon enemy loot tables
 */
function enhanceDungeonEnemyLoot(baseLootTable, depthZone) {
  const enhancedLoot = [...baseLootTable];
  
  // Common items that can drop from dungeon enemies
  const commonItems = [
    { itemId: 'medpac_01', chance: 0.25, quantity: 1 },      // 25% chance for medpac
    { itemId: 'stimpack_01', chance: 0.15, quantity: 1 },   // 15% chance for stimpack
    { itemId: 'scrap_metal_01', chance: 0.20, quantity: 1 }, // 20% chance for scrap
    { itemId: 'energy_cell_01', chance: 0.15, quantity: 1 } // 15% chance for energy cell
  ];
  
  // Uncommon weapons (higher chance in deeper zones)
  const uncommonWeapons = [
    { itemId: 'blaster_pistol_01', chance: 0.08, quantity: 1 },
    { itemId: 'blaster_pistol_imperial', chance: 0.06, quantity: 1 },
    { itemId: 'blaster_pistol_rebel', chance: 0.06, quantity: 1 },
    { itemId: 'blaster_rifle_generic', chance: 0.05, quantity: 1 },
    { itemId: 'vibroblade', chance: 0.07, quantity: 1 },
    { itemId: 'vibrosword', chance: 0.05, quantity: 1 }
  ];
  
  // Uncommon armors (higher chance in deeper zones)
  const uncommonArmors = [
    { itemId: 'armor_light_01', chance: 0.05, quantity: 1 },
    { itemId: 'armor_light_02', chance: 0.04, quantity: 1 },
    { itemId: 'armor_medium_01', chance: 0.04, quantity: 1 },
    { itemId: 'armor_medium_02', chance: 0.03, quantity: 1 }
  ];
  
  // Rare items (only in deeper zones)
  const rareWeapons = [
    { itemId: 'blaster_pistol_02', chance: 0.03, quantity: 1 },
    { itemId: 'blaster_rifle_02', chance: 0.03, quantity: 1 },
    { itemId: 'blaster_pistol_03', chance: 0.02, quantity: 1 },
    { itemId: 'electrostaff', chance: 0.02, quantity: 1 }
  ];
  
  const rareArmors = [
    { itemId: 'armor_light_03', chance: 0.02, quantity: 1 },
    { itemId: 'armor_medium_03', chance: 0.02, quantity: 1 },
    { itemId: 'armor_heavy_02', chance: 0.02, quantity: 1 },
    { itemId: 'armor_heavy_03', chance: 0.01, quantity: 1 }
  ];
  
  // Add common items (always available)
  enhancedLoot.push(...commonItems);
  
  // Add uncommon items with higher chance in deeper zones
  if (depthZone >= 2) {
    // Mid zones and deeper get uncommon items
    const zoneMultiplier = 1 + (depthZone - 2) * 0.5;
    enhancedLoot.push(...uncommonWeapons.map(item => ({
      ...item,
      chance: Math.min(0.3, item.chance * zoneMultiplier)
    })));
    enhancedLoot.push(...uncommonArmors.map(item => ({
      ...item,
      chance: Math.min(0.25, item.chance * zoneMultiplier)
    })));
  }
  
  // Add rare items in deeper zones (zone 3+)
  if (depthZone >= 3) {
    const rareMultiplier = 1 + (depthZone - 3) * 0.3;
    enhancedLoot.push(...rareWeapons.map(item => ({
      ...item,
      chance: Math.min(0.15, item.chance * rareMultiplier)
    })));
    enhancedLoot.push(...rareArmors.map(item => ({
      ...item,
      chance: Math.min(0.12, item.chance * rareMultiplier)
    })));
  }
  
  return enhancedLoot;
}

/**
 * Spawn enemies in a specific room
 */
function spawnEnemiesInRoom(room, count, playerLevel, depthZone, dungeonType) {
  const enemies = [];
  const enemyPool = DUNGEON_ENEMY_POOLS[dungeonType] || DUNGEON_ENEMY_POOLS.danger;
  
  for (let i = 0; i < count; i++) {
    // Select random enemy from pool
    const templateId = enemyPool[Math.floor(Math.random() * enemyPool.length)];
    const baseTemplate = getEnemyTemplate(templateId);
    
    if (!baseTemplate) {
      console.warn(`[Dungeon Enemy Spawner] Enemy template not found: ${templateId}`);
      continue;
    }
    
    // Scale enemy for level and difficulty
    const scaledEnemy = scaleEnemyForDepth(baseTemplate, playerLevel, depthZone);
    
    if (!scaledEnemy) continue;
    
    // Random position within room (ensure it's in a navigable cell)
    // For now, place in center of room, will be adjusted if needed
    const roomCenterX = room.x + Math.floor(room.width / 2);
    const roomCenterY = room.y + Math.floor(room.height / 2);
    
    // Add slight random offset within room bounds
    const offsetX = Math.floor(Math.random() * Math.min(room.width - 1, 3)) - Math.floor(Math.min(room.width - 1, 3) / 2);
    const offsetY = Math.floor(Math.random() * Math.min(room.height - 1, 3)) - Math.floor(Math.min(room.height - 1, 3) / 2);
    
    const enemyX = Math.max(room.x, Math.min(room.x + room.width - 1, roomCenterX + offsetX));
    const enemyY = Math.max(room.y, Math.min(room.y + room.height - 1, roomCenterY + offsetY));
    
    const difficultyTier = getDifficultyTier(depthZone);
    
    // Enhance loot table for dungeon enemies - add common/uncommon items and medpacs
    const enhancedLootTable = enhanceDungeonEnemyLoot(baseTemplate.lootTable || [], depthZone);
    
    enemies.push({
      id: uuidv4(),
      templateId: templateId,
      name: scaledEnemy.name || baseTemplate.name,
      level: scaledEnemy.level || playerLevel,
      difficultyTier: difficultyTier || 'moderate',
      depthZone: depthZone,
      position: { x: enemyX, y: enemyY },
      stats: {
        health: scaledEnemy.stats.health,
        maxHealth: scaledEnemy.stats.maxHealth,
        attack: scaledEnemy.stats.attack,
        defense: scaledEnemy.stats.defense,
        stamina: scaledEnemy.stats.stamina || scaledEnemy.stats.maxStamina,
        maxStamina: scaledEnemy.stats.maxStamina,
        speed: scaledEnemy.stats.speed,
        accuracy: scaledEnemy.stats.accuracy
      },
      defeated: false,
      inCombat: false,
      isBoss: depthZone === 4,
      xpReward: scaledEnemy.xpReward,
      creditsReward: scaledEnemy.creditsReward,
      lootTable: enhancedLootTable
    });
  }
  
  return enemies;
}

/**
 * Spawn enemies in a corridor group (1-2 enemies)
 */
function spawnEnemiesInCorridor(corridorPosition, count, playerLevel, depthZone, dungeonType, grid) {
  const enemies = [];
  const enemyPool = DUNGEON_ENEMY_POOLS[dungeonType] || DUNGEON_ENEMY_POOLS.danger;
  
  // Find nearby navigable corridor cells for enemy placement
  const { x, y } = corridorPosition;
  const possiblePositions = [];
  
  // Check adjacent cells (up, down, left, right) for navigable corridor cells
  const directions = [
    { dx: 0, dy: -1 }, // Up
    { dx: 0, dy: 1 },  // Down
    { dx: -1, dy: 0 }, // Left
    { dx: 1, dy: 0 }   // Right
  ];
  
  // Check the position itself and adjacent cells
  if (grid[y] && grid[y][x] === 1) { // Corridor
    possiblePositions.push({ x, y });
  }
  
  for (const dir of directions) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;
    if (grid[ny] && grid[ny][nx] === 1) { // Corridor
      possiblePositions.push({ x: nx, y: ny });
    }
  }
  
  // Remove duplicates
  const uniquePositions = [];
  const seen = new Set();
  for (const pos of possiblePositions) {
    const key = `${pos.x},${pos.y}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniquePositions.push(pos);
    }
  }
  
  // Shuffle and take up to 'count' positions
  const shuffled = uniquePositions.sort(() => Math.random() - 0.5);
  const selectedPositions = shuffled.slice(0, Math.min(count, uniquePositions.length));
  
  for (const pos of selectedPositions) {
    // Select random enemy from pool
    const templateId = enemyPool[Math.floor(Math.random() * enemyPool.length)];
    const baseTemplate = getEnemyTemplate(templateId);
    
    if (!baseTemplate) {
      console.warn(`[Dungeon Enemy Spawner] Enemy template not found: ${templateId}`);
      continue;
    }
    
    // Scale enemy for level and difficulty
    const scaledEnemy = scaleEnemyForDepth(baseTemplate, playerLevel, depthZone);
    
    if (!scaledEnemy) continue;
    
    const difficultyTier = getDifficultyTier(depthZone);
    
    enemies.push({
      id: uuidv4(),
      templateId: templateId,
      name: scaledEnemy.name || baseTemplate.name,
      level: scaledEnemy.level || playerLevel,
      difficultyTier: difficultyTier || 'moderate',
      depthZone: depthZone,
      position: { x: pos.x, y: pos.y },
      stats: {
        health: scaledEnemy.stats.health,
        maxHealth: scaledEnemy.stats.maxHealth,
        attack: scaledEnemy.stats.attack,
        defense: scaledEnemy.stats.defense,
        stamina: scaledEnemy.stats.stamina || scaledEnemy.stats.maxStamina,
        maxStamina: scaledEnemy.stats.maxStamina,
        speed: scaledEnemy.stats.speed,
        accuracy: scaledEnemy.stats.accuracy
      },
      defeated: false,
      inCombat: false,
      isBoss: false, // Corridor enemies are never bosses
      xpReward: scaledEnemy.xpReward,
      creditsReward: scaledEnemy.creditsReward,
      lootTable: enhanceDungeonEnemyLoot(baseTemplate.lootTable || [], depthZone)
    });
  }
  
  return enemies;
}

/**
 * Main function to spawn enemies for a dungeon
 */
function spawnDungeonEnemies(layout, playerLevel, dungeonType) {
  const { grid, rooms, depthZones, entrance } = layout;
  
  if (!rooms || rooms.length === 0) {
    console.warn('[Dungeon Enemy Spawner] No rooms found in dungeon layout');
    return [];
  }
  
  if (!depthZones || depthZones.length === 0) {
    console.warn('[Dungeon Enemy Spawner] No depth zones found in dungeon layout');
    return [];
  }
  
  const enemies = [];
  const gridWidth = grid[0]?.length || 0;
  const gridHeight = grid.length || 0;
  
  // Collect all corridor cells (cell type 1) for potential enemy spawning
  const corridorCells = [];
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      if (grid[y][x] === 1) { // Corridor
        // Calculate depth zone for this corridor cell
        const distance = Math.abs(x - entrance.x) + Math.abs(y - entrance.y);
        let depthZone = 0;
        for (const zone of depthZones) {
          if (distance >= zone.minDistance && distance <= zone.maxDistance) {
            depthZone = zone.depth;
            break;
          }
        }
        // Skip entrance zone (zone 0) - no enemies there
        if (depthZone > 0) {
          corridorCells.push({ x, y, depthZone });
        }
      }
    }
  }
  
  // Skip entrance zone (zone 0) - no enemies there
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
  
  // Spawn enemies in corridors
  // Number of corridor groups = number of rooms (excluding boss room)
  const nonBossRooms = rooms.filter(room => room.depth !== 4);
  const corridorGroupCount = nonBossRooms.length;
  
  if (corridorGroupCount > 0 && corridorCells.length > 0) {
    // Filter corridor cells by depth zone (exclude entrance zone)
    const validCorridorCells = corridorCells.filter(cell => cell.depthZone > 0);
    
    // Shuffle and select corridor positions for groups
    const shuffledCorridors = [...validCorridorCells].sort(() => Math.random() - 0.5);
    const selectedCorridorPositions = shuffledCorridors.slice(0, Math.min(corridorGroupCount, validCorridorCells.length));
    
    // Spawn 1-2 enemies per corridor group
    for (const corridorPos of selectedCorridorPositions) {
      const enemyCount = 1 + Math.floor(Math.random() * 2); // 1-2 enemies
      const corridorEnemies = spawnEnemiesInCorridor(
        corridorPos,
        enemyCount,
        playerLevel,
        corridorPos.depthZone,
        dungeonType,
        grid
      );
      enemies.push(...corridorEnemies);
    }
  }
  
  // Always spawn boss in boss room (zone 4)
  // Find boss room - it should be the room with depth 4, or use bossRoom position
  const bossRoom = rooms.find(room => room.depth === 4);
  
  if (bossRoom) {
    const boss = spawnEnemiesInRoom(bossRoom, 1, playerLevel, 4, dungeonType);
    enemies.push(...boss);
  } else if (layout.bossRoom) {
    // Fallback: create a room at boss position if no boss room found
    const bossRoomFallback = {
      x: layout.bossRoom.x - 2,
      y: layout.bossRoom.y - 2,
      width: 5,
      height: 5,
      depth: 4
    };
    const boss = spawnEnemiesInRoom(bossRoomFallback, 1, playerLevel, 4, dungeonType);
    enemies.push(...boss);
  }
  
  console.log(`[Dungeon Enemy Spawner] Spawned ${enemies.length} enemies (${enemies.filter(e => !e.isBoss).length} regular, ${enemies.filter(e => e.isBoss).length} boss) for dungeon type: ${dungeonType}`);
  
  return enemies;
}

module.exports = {
  spawnDungeonEnemies,
  spawnEnemiesInRoom,
  spawnEnemiesInCorridor,
  scaleEnemyForDepth,
  getDifficultyTier,
  SPAWN_DENSITY,
  ENEMY_COUNT_PER_ROOM,
  DUNGEON_ENEMY_POOLS
};

