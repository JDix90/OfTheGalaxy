/**
 * Item Set Definitions
 * Defines item sets that provide bonuses when multiple pieces are equipped
 */

/**
 * Item Set Definitions
 * Each set has:
 * - id: Unique set identifier
 * - name: Display name
 * - description: Set description
 * - pieces: Array of item IDs that belong to the set
 * - bonuses: Object with piece count as keys and bonus objects as values
 */
const ITEM_SETS = {
  imperial_set: {
    id: 'imperial_set',
    name: 'Imperial Set',
    description: 'Equipment worn by Imperial personnel. Provides accuracy and defense bonuses.',
    pieces: [
      'blaster_rifle_01', // E-11 Blaster Rifle
      'armor_heavy_imperial_standard', // Stormtrooper Armor
      'imperial_commendation' // Imperial Commendation (accessory)
    ],
    bonuses: {
      2: {
        accuracy: 5, // +5% accuracy
        description: '2-piece: +5% accuracy'
      },
      3: {
        accuracy: 10, // +10% accuracy
        defense: 5, // +5% defense
        description: '3-piece: +10% accuracy, +5% defense'
      }
    }
  },
  jedi_set: {
    id: 'jedi_set',
    name: 'Jedi Set',
    description: 'Equipment used by Jedi. Enhances Force abilities and power.',
    pieces: [
      'lightsaber_01', // Lightsaber
      'armor_light_jedi', // Jedi Robes
      'jedi_artifact' // Jedi Artifact (accessory)
    ],
    bonuses: {
      2: {
        forcePower: 10, // +10 Force Power
        description: '2-piece: +10 Force Power'
      },
      3: {
        forcePower: 20, // +20 Force Power
        forceAbilityEffectiveness: 15, // +15% Force ability effectiveness
        description: '3-piece: +20 Force Power, +15% Force ability effectiveness'
      }
    }
  },
  smuggler_set: {
    id: 'smuggler_set',
    name: 'Smuggler Set',
    description: 'Equipment favored by smugglers. Improves smuggling success and charisma.',
    pieces: [
      'blaster_pistol_01', // Blaster Pistol
      'armor_light_smuggler', // Smuggler's Vest
      'smuggler_badge' // Master Smuggler's Badge (accessory)
    ],
    bonuses: {
      2: {
        smugglingSuccess: 10, // +10% smuggling success
        description: '2-piece: +10% smuggling success'
      },
      3: {
        smugglingSuccess: 20, // +20% smuggling success
        charisma: 5, // +5 charisma
        description: '3-piece: +20% smuggling success, +5 charisma'
      }
    }
  },
  mandalorian_set: {
    id: 'mandalorian_set',
    name: 'Mandalorian Set',
    description: 'Mandalorian-crafted equipment. Provides significant combat bonuses.',
    pieces: [
      'blaster_pistol_mandalorian', // Mandalorian Blaster Pistol
      'armor_heavy_beskar', // Beskar Armor
      'krayt_pearl' // Krayt Dragon Pearl (Mandalorian accessory)
    ],
    bonuses: {
      2: {
        damage: 10, // +10% damage
        defense: 10, // +10% defense
        description: '2-piece: +10% damage, +10% defense'
      },
      3: {
        damage: 20, // +20% damage
        defense: 20, // +20% defense
        energyResistance: 0.15, // +15% energy resistance
        description: '3-piece: +20% damage, +20% defense, +15% energy resistance'
      }
    }
  },
  corporate_set: {
    id: 'corporate_set',
    name: 'Corporate Sector Set',
    description: 'Equipment used by Corporate Sector Authority personnel. Provides intelligence and defense bonuses.',
    pieces: [
      'blaster_rifle_corporate', // Czerka C-20 Blaster Rifle
      'armor_medium_corporate', // Corporate Medium Armor
      'corporate_commendation' // Corporate Sector Commendation (accessory)
    ],
    bonuses: {
      2: {
        intelligence: 5, // +5 intelligence
        defense: 5, // +5% defense
        description: '2-piece: +5 intelligence, +5% defense'
      },
      3: {
        intelligence: 10, // +10 intelligence
        defense: 10, // +10% defense
        dataAnalysis: 15, // +15% data analysis effectiveness
        description: '3-piece: +10 intelligence, +10% defense, +15% data analysis effectiveness'
      }
    }
  },
  bounty_hunter_set: {
    id: 'bounty_hunter_set',
    name: 'Bounty Hunter Set',
    description: 'Equipment favored by bounty hunters. Provides combat and accuracy bonuses.',
    pieces: [
      'blaster_pistol_bounty', // EE-3 Blaster Pistol
      'armor_medium_bounty', // Bounty Hunter Armor
      'bounty_hunter_badge' // Bounty Hunter's Badge (accessory)
    ],
    bonuses: {
      2: {
        damage: 8, // +8% damage
        accuracy: 5, // +5% accuracy
        description: '2-piece: +8% damage, +5% accuracy'
      },
      3: {
        damage: 15, // +15% damage
        accuracy: 10, // +10% accuracy
        criticalChance: 5, // +5% critical hit chance
        description: '3-piece: +15% damage, +10% accuracy, +5% critical hit chance'
      }
    }
  },
  outer_rim_set: {
    id: 'outer_rim_set',
    name: 'Outer Rim Settler Set',
    description: 'Equipment used by Outer Rim settlers. Provides survival and crafting bonuses.',
    pieces: [
      'blaster_pistol_outer_rim', // Outer Rim Blaster Pistol
      'armor_medium_outer_rim', // Outer Rim Settler Armor
      'outer_rim_commendation' // Outer Rim Settler's Commendation (accessory)
    ],
    bonuses: {
      2: {
        crafting: 10, // +10 crafting skill
        repair: 10, // +10 repair skill
        description: '2-piece: +10 crafting, +10 repair'
      },
      3: {
        crafting: 20, // +20 crafting skill
        repair: 20, // +20 repair skill
        survivalBonus: 15, // +15% survival effectiveness
        description: '3-piece: +20 crafting, +20 repair, +15% survival effectiveness'
      }
    }
  }
};

/**
 * Get set by ID
 * @param {string} setId - Set ID
 * @returns {Object|null} Set definition
 */
function getSet(setId) {
  return ITEM_SETS[setId] || null;
}

/**
 * Get all sets
 * @returns {Object} All set definitions
 */
function getAllSets() {
  return ITEM_SETS;
}

/**
 * Get set that contains an item
 * @param {string} itemId - Item ID
 * @returns {Object|null} Set definition that contains the item
 */
function getSetForItem(itemId) {
  for (const setId in ITEM_SETS) {
    const set = ITEM_SETS[setId];
    if (set.pieces.includes(itemId)) {
      return set;
    }
  }
  return null;
}

/**
 * Get all sets for multiple items
 * @param {Array<string>} itemIds - Array of item IDs
 * @returns {Array<Object>} Array of sets that contain any of the items
 */
function getSetsForItems(itemIds) {
  const sets = new Map();
  
  for (const itemId of itemIds) {
    const set = getSetForItem(itemId);
    if (set && !sets.has(set.id)) {
      sets.set(set.id, set);
    }
  }
  
  return Array.from(sets.values());
}

/**
 * Calculate set bonuses for equipped items
 * @param {Array<string>} equippedItemIds - Array of equipped item IDs
 * @returns {Object} Set bonuses object with setId as keys
 */
function calculateSetBonuses(equippedItemIds) {
  const bonuses = {};
  
  // Get all sets that have pieces equipped
  const relevantSets = getSetsForItems(equippedItemIds);
  
  for (const set of relevantSets) {
    // Count how many pieces of this set are equipped
    const equippedPieces = set.pieces.filter(itemId => equippedItemIds.includes(itemId));
    const pieceCount = equippedPieces.length;
    
    if (pieceCount >= 2) {
      // Get the highest bonus tier achieved
      let activeBonus = null;
      if (pieceCount >= 3 && set.bonuses[3]) {
        activeBonus = set.bonuses[3];
      } else if (pieceCount >= 2 && set.bonuses[2]) {
        activeBonus = set.bonuses[2];
      }
      
      if (activeBonus) {
        bonuses[set.id] = {
          setId: set.id,
          setName: set.name,
          pieceCount: pieceCount,
          totalPieces: set.pieces.length,
          bonus: activeBonus,
          equippedPieces: equippedPieces
        };
      }
    }
  }
  
  return bonuses;
}

/**
 * Apply set bonuses to character stats
 * @param {Object} characterStats - Character stats object
 * @param {Object} setBonuses - Set bonuses from calculateSetBonuses
 * @returns {Object} Modified stats with set bonuses applied
 */
function applySetBonuses(characterStats, setBonuses) {
  const modifiedStats = { ...characterStats };
  
  for (const setId in setBonuses) {
    const setBonus = setBonuses[setId];
    const bonus = setBonus.bonus;
    
    // Apply percentage bonuses
    if (bonus.accuracy) {
      modifiedStats.accuracy = (modifiedStats.accuracy || 0) + bonus.accuracy;
    }
    if (bonus.defense) {
      modifiedStats.defense = (modifiedStats.defense || 0) + (modifiedStats.defense || 0) * (bonus.defense / 100);
    }
    if (bonus.damage) {
      modifiedStats.attack = (modifiedStats.attack || 0) + (modifiedStats.attack || 0) * (bonus.damage / 100);
    }
    
    // Apply flat bonuses
    if (bonus.forcePower) {
      modifiedStats.forcePower = (modifiedStats.forcePower || 0) + bonus.forcePower;
    }
    if (bonus.charisma) {
      modifiedStats.charisma = (modifiedStats.charisma || 0) + bonus.charisma;
    }
    
    // Apply special bonuses
    if (bonus.energyResistance) {
      if (!modifiedStats.combatModifiers) {
        modifiedStats.combatModifiers = {};
      }
      modifiedStats.combatModifiers.energyResistance = 
        (modifiedStats.combatModifiers.energyResistance || 0) + bonus.energyResistance;
    }
    if (bonus.forceAbilityEffectiveness) {
      if (!modifiedStats.combatModifiers) {
        modifiedStats.combatModifiers = {};
      }
      modifiedStats.combatModifiers.forceAbilityEffectiveness = 
        (modifiedStats.combatModifiers.forceAbilityEffectiveness || 0) + (bonus.forceAbilityEffectiveness / 100);
    }
    if (bonus.smugglingSuccess) {
      modifiedStats.smugglingBonus = (modifiedStats.smugglingBonus || 0) + bonus.smugglingSuccess;
    }
    if (bonus.dataAnalysis) {
      if (!modifiedStats.combatModifiers) {
        modifiedStats.combatModifiers = {};
      }
      modifiedStats.combatModifiers.dataAnalysis = 
        (modifiedStats.combatModifiers.dataAnalysis || 0) + (bonus.dataAnalysis / 100);
    }
    if (bonus.criticalChance) {
      if (!modifiedStats.combatModifiers) {
        modifiedStats.combatModifiers = {};
      }
      modifiedStats.combatModifiers.criticalChance = 
        (modifiedStats.combatModifiers.criticalChance || 0) + (bonus.criticalChance / 100);
    }
    if (bonus.survivalBonus) {
      if (!modifiedStats.combatModifiers) {
        modifiedStats.combatModifiers = {};
      }
      modifiedStats.combatModifiers.survivalBonus = 
        (modifiedStats.combatModifiers.survivalBonus || 0) + (bonus.survivalBonus / 100);
    }
    // Apply flat skill bonuses
    if (bonus.crafting) {
      modifiedStats.crafting = (modifiedStats.crafting || 0) + bonus.crafting;
    }
    if (bonus.repair) {
      modifiedStats.repair = (modifiedStats.repair || 0) + bonus.repair;
    }
    if (bonus.intelligence) {
      modifiedStats.intelligence = (modifiedStats.intelligence || 0) + bonus.intelligence;
    }
  }
  
  return modifiedStats;
}

module.exports = {
  ITEM_SETS,
  getSet,
  getAllSets,
  getSetForItem,
  getSetsForItems,
  calculateSetBonuses,
  applySetBonuses
};

