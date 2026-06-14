/**
 * Enemy Templates
 * Defines enemy types with stats, equipment, and loot tables
 */

const enemyTemplates = {
  ironclad: {
    name: 'Ironclad',
    level: 1,
    tier: 'normal',
    stats: {
      health: 100,
      maxHealth: 100,
      stamina: 50,
      maxStamina: 50,
      attack: 22,
      defense: 10,
      speed: 12,
      accuracy: 64 // Ironclads still miss a fair bit
    },
    equipment: {
      weapon: { itemId: 'pulser_rifle_01', damage: 20 },
      armor: { itemId: 'armor_heavy_dominion_standard', defense: 15 }
    },
    lootTable: [
      { itemId: 'pulser_rifle_01', chance: 0.1, quantity: 1 },
      { itemId: 'pulser_pistol_dominion', chance: 0.15, quantity: 1 },
      { itemId: 'armor_light_dominion', chance: 0.08, quantity: 1 },
      { itemId: 'armor_medium_dominion', chance: 0.05, quantity: 1 },
      { itemId: 'credits', chance: 1.0, quantity: 50 }
    ],
    xpReward: 25,
    creditsReward: 50,
    faction: 'empire'
  },

  ironclad_sergeant: {
    name: 'Ironclad Sergeant',
    level: 3,
    tier: 'veteran',
    stats: {
      health: 150,
      maxHealth: 150,
      stamina: 60,
      maxStamina: 60,
      attack: 20,
      defense: 15,
      speed: 14,
      accuracy: 70
    },
    equipment: {
      weapon: { itemId: 'pulser_rifle_02', damage: 25 },
      armor: { itemId: 'armor_heavy_dominion_standard', defense: 20 }
    },
    lootTable: [
      { itemId: 'pulser_rifle_01', chance: 0.2, quantity: 1 },
      { itemId: 'pulser_rifle_02', chance: 0.15, quantity: 1 },
      { itemId: 'pulser_pistol_dominion_elite', chance: 0.1, quantity: 1 },
      { itemId: 'armor_medium_dominion', chance: 0.12, quantity: 1 },
      { itemId: 'armor_heavy_dominion_standard', chance: 0.08, quantity: 1 },
      { itemId: 'credits', chance: 1.0, quantity: 100 }
    ],
    xpReward: 50,
    creditsReward: 100,
    faction: 'empire'
  },

  pirate: {
    name: 'Pirate',
    level: 2,
    tier: 'veteran',
    stats: {
      health: 120,
      maxHealth: 120,
      stamina: 55,
      maxStamina: 55,
      attack: 18,
      defense: 12,
      speed: 13,
      accuracy: 65
    },
    equipment: {
      weapon: { itemId: 'pulser_pistol_01', damage: 18 },
      armor: { itemId: 'leather_armor', defense: 10 }
    },
    lootTable: [
      { itemId: 'pulser_pistol_01', chance: 0.15, quantity: 1 },
      { itemId: 'pulser_pistol_bounty', chance: 0.1, quantity: 1 },
      { itemId: 'armor_light_01', chance: 0.08, quantity: 1 },
      { itemId: 'shock_blade', chance: 0.12, quantity: 1 },
      { itemId: 'credits', chance: 1.0, quantity: 75 }
    ],
    xpReward: 35,
    creditsReward: 75,
    faction: null
  },

  syndicate_thug: {
    name: 'Syndicate Thug',
    level: 3,
    tier: 'veteran',
    stats: {
      health: 140,
      maxHealth: 140,
      stamina: 60,
      maxStamina: 60,
      attack: 20,
      defense: 14,
      speed: 13,
      accuracy: 65
    },
    equipment: {
      weapon: { itemId: 'pulser_pistol_01', damage: 22 },
      armor: { itemId: 'leather_armor', defense: 12 }
    },
    lootTable: [
      { itemId: 'pulser_pistol_01', chance: 0.1, quantity: 1 },
      { itemId: 'credits', chance: 1.0, quantity: 80 }
    ],
    xpReward: 40,
    creditsReward: 80,
    faction: null
  },

  pirate_captain: {
    name: 'Pirate Captain',
    level: 5,
    tier: 'elite',
    stats: {
      health: 175,
      maxHealth: 175,
      stamina: 70,
      maxStamina: 70,
      attack: 24,
      defense: 18,
      speed: 16,
      accuracy: 75
    },
    equipment: {
      weapon: { itemId: 'pulser_rifle_01', damage: 30 },
      armor: { itemId: 'reinforced_armor', defense: 25 }
    },
    lootTable: [
      { itemId: 'pulser_rifle_01', chance: 0.3, quantity: 1 },
      { itemId: 'credits', chance: 1.0, quantity: 200 }
    ],
    xpReward: 100,
    creditsReward: 200,
    faction: null
  },

  droid_security: {
    name: 'Security Droid',
    level: 2,
    tier: 'veteran',
    stats: {
      health: 110,
      maxHealth: 110,
      stamina: 80,
      maxStamina: 80,
      attack: 16,
      defense: 20,
      speed: 10,
      accuracy: 80
    },
    equipment: {
      weapon: { itemId: 'pulser_pistol_01', damage: 15 },
      armor: { itemId: 'droid_armor', defense: 25 }
    },
    lootTable: [
      { itemId: 'droid_parts', chance: 0.5, quantity: 1 },
      { itemId: 'credits', chance: 1.0, quantity: 60 }
    ],
    xpReward: 30,
    creditsReward: 60,
    faction: null
  },

  bounty_hunter: {
    name: 'Bounty Hunter',
    level: 4,
    tier: 'elite',
    stats: {
      health: 165,
      maxHealth: 165,
      stamina: 65,
      maxStamina: 65,
      attack: 21,
      defense: 16,
      speed: 15,
      accuracy: 80
    },
    equipment: {
      weapon: { itemId: 'pulser_rifle_01', damage: 28 },
      armor: { itemId: 'bounty_hunter_armor', defense: 22 }
    },
    lootTable: [
      { itemId: 'pulser_rifle_01', chance: 0.25, quantity: 1 },
      { itemId: 'credits', chance: 1.0, quantity: 150 }
    ],
    xpReward: 75,
    creditsReward: 150,
    faction: null
  },

  wild_animal: {
    name: 'Wild Animal',
    level: 1,
    tier: 'normal',
    stats: {
      health: 90,
      maxHealth: 90,
      stamina: 60,
      maxStamina: 60,
      attack: 19,
      defense: 8,
      speed: 16,
      accuracy: 70
    },
    equipment: {
      weapon: { itemId: 'claws', damage: 16 },
      armor: { itemId: 'hide', defense: 8 }
    },
    lootTable: [
      { itemId: 'animal_parts', chance: 0.3, quantity: 1 },
      { itemId: 'credits', chance: 0.5, quantity: 30 }
    ],
    xpReward: 20,
    creditsReward: 30,
    faction: null
  }
};

/**
 * Get enemy template by ID
 */
function getEnemyTemplate(enemyId) {
  return enemyTemplates[enemyId] || null;
}

/**
 * Get all enemy templates
 */
function getAllEnemyTemplates() {
  return enemyTemplates;
}

/**
 * Scale enemy stats based on player level
 * Enemies are scaled to match player level, not exceed it
 */
function scaleEnemyForLevel(enemyTemplate, playerLevel, difficulty = 'moderate') {
  if (!enemyTemplate) return null;

  // Difficulty multipliers
  const difficultyMultipliers = {
    easy: { health: 0.75, attack: 0.80, defense: 0.85, xp: 0.70, credits: 0.75 },
    moderate: { health: 1.0, attack: 1.0, defense: 1.0, xp: 1.0, credits: 1.0 },
    hard: { health: 1.25, attack: 1.20, defense: 1.15, xp: 1.30, credits: 1.25 }
  };

  const multiplier = difficultyMultipliers[difficulty] || difficultyMultipliers.moderate;

  // Calculate base stats for player level
  // Player health formula: 100 + (level - 1) * 5
  const basePlayerHealth = 100 + (playerLevel - 1) * 5;
  
  // Scale enemy health to be proportional to player health, then apply difficulty
  // Base enemy health at level 1 is typically 90-140, player is 100
  // We want enemies to scale more conservatively to match player progression
  const levelScale = 1 + (playerLevel - 1) * 0.08; // 8% per level (slower than before)
  const baseHealth = Math.round(enemyTemplate.stats.health * levelScale);
  
  // Apply difficulty multiplier
  const scaledHealth = Math.round(baseHealth * multiplier.health);
  const scaledMaxHealth = scaledHealth;
  
  // Attack and defense scale more conservatively
  const attackScale = 1 + (playerLevel - 1) * 0.10; // 10% per level (keeps pace with per-level player power)
  const defenseScale = 1 + (playerLevel - 1) * 0.05; // 5% per level
  // XP scales faster than the other stats so kills-to-level stays reasonable
  // against the flattened XP curve (was tied to the 8% health levelScale).
  const xpScale = 1 + (playerLevel - 1) * 0.50;

  const scaled = {
    ...enemyTemplate,
    level: playerLevel,
    difficulty: difficulty,
    stats: {
      ...enemyTemplate.stats,
      health: scaledHealth,
      maxHealth: scaledMaxHealth,
      attack: Math.round(enemyTemplate.stats.attack * attackScale * multiplier.attack),
      defense: Math.round(enemyTemplate.stats.defense * defenseScale * multiplier.defense),
      stamina: enemyTemplate.stats.stamina,
      maxStamina: enemyTemplate.stats.maxStamina,
      speed: enemyTemplate.stats.speed,
      accuracy: enemyTemplate.stats.accuracy
    },
    xpReward: Math.round(enemyTemplate.xpReward * xpScale * multiplier.xp),
    creditsReward: Math.round(enemyTemplate.creditsReward * levelScale * multiplier.credits)
  };

  return scaled;
}

/**
 * Get enemy templates by difficulty tier
 */
function getEnemiesByDifficulty(difficulty) {
  const difficultyTiers = {
    easy: ['wild_animal', 'ironclad', 'droid_security'],
    moderate: ['pirate', 'syndicate_thug', 'ironclad_sergeant', 'droid_security'],
    hard: ['bounty_hunter', 'pirate_captain', 'ironclad_sergeant']
  };
  
  return difficultyTiers[difficulty] || difficultyTiers.moderate;
}

/**
 * Generate random enemy from template pool with difficulty
 * @param {number} playerLevel - Player's level
 * @param {string} difficulty - 'easy', 'moderate', or 'hard'
 * @param {Array} enemyPool - Optional pool of enemy IDs to choose from
 */
function generateRandomEnemy(playerLevel, difficulty = 'moderate', enemyPool = null) {
  let pool = enemyPool;
  
  // If no pool specified, use difficulty-appropriate enemies
  if (!pool) {
    pool = getEnemiesByDifficulty(difficulty);
  }
  
  const randomEnemyId = pool[Math.floor(Math.random() * pool.length)];
  const template = enemyTemplates[randomEnemyId];
  
  if (!template) {
    // Fallback to ironclad if template not found
    return scaleEnemyForLevel(enemyTemplates.ironclad, playerLevel, difficulty);
  }

  return scaleEnemyForLevel(template, playerLevel, difficulty);
}

module.exports = {
  enemyTemplates,
  getEnemyTemplate,
  getAllEnemyTemplates,
  scaleEnemyForLevel,
  generateRandomEnemy
};


