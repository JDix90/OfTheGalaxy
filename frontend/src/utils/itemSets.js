/**
 * Item Sets Utility
 * Frontend utilities for item set information
 */

/**
 * Item Set Definitions (matches backend itemSets.js)
 */
const ITEM_SETS = {
  dominion_set: {
    id: 'dominion_set',
    name: 'Dominion Set',
    description: 'Equipment worn by Dominion personnel. Provides accuracy and defense bonuses.',
    pieces: [
      'pulser_rifle_01',
      'armor_heavy_dominion_standard',
      'dominion_commendation'
    ],
    bonuses: {
      2: {
        accuracy: 5,
        description: '2-piece: +5% accuracy'
      },
      3: {
        accuracy: 10,
        defense: 5,
        description: '3-piece: +10% accuracy, +5% defense'
      }
    }
  },
  keeper_set: {
    id: 'keeper_set',
    name: 'Keeper Set',
    description: 'Equipment used by Keeper. Enhances Veil abilities and power.',
    pieces: [
      'arcblade_01',
      'armor_light_keeper',
      'keeper_artifact'
    ],
    bonuses: {
      2: {
        forcePower: 10,
        description: '2-piece: +10 Veil Power'
      },
      3: {
        forcePower: 20,
        forceAbilityEffectiveness: 15,
        description: '3-piece: +20 Veil Power, +15% Veil ability effectiveness'
      }
    }
  },
  smuggler_set: {
    id: 'smuggler_set',
    name: 'Smuggler Set',
    description: 'Equipment favored by smugglers. Improves smuggling success and charisma.',
    pieces: [
      'pulser_pistol_01',
      'armor_light_smuggler',
      'smuggler_badge'
    ],
    bonuses: {
      2: {
        smugglingSuccess: 10,
        description: '2-piece: +10% smuggling success'
      },
      3: {
        smugglingSuccess: 20,
        charisma: 5,
        description: '3-piece: +20% smuggling success, +5 charisma'
      }
    }
  },
  ironkin_set: {
    id: 'ironkin_set',
    name: 'Ironkin Set',
    description: 'Ironkin-crafted equipment. Provides significant combat bonuses.',
    pieces: [
      'weapon_ironkin_01',
      'armor_heavy_beskar',
      'accessory_ironkin_01'
    ],
    bonuses: {
      2: {
        damage: 10,
        defense: 10,
        description: '2-piece: +10% damage, +10% defense'
      },
      3: {
        damage: 20,
        defense: 20,
        energyResistance: 15,
        description: '3-piece: +20% damage, +20% defense, +15% energy resistance'
      }
    }
  }
};

/**
 * Get set that contains an item
 * @param {string} itemId - Item ID
 * @returns {Object|null} Set definition
 */
export function getSetForItem(itemId) {
  for (const setId in ITEM_SETS) {
    const set = ITEM_SETS[setId];
    if (set.pieces.includes(itemId)) {
      return set;
    }
  }
  return null;
}

/**
 * Get set display information
 * @param {string} setId - Set ID
 * @returns {Object|null} Set definition
 */
export function getSetDisplay(setId) {
  return ITEM_SETS[setId] || null;
}

/**
 * Get all sets
 * @returns {Object} All set definitions
 */
export function getAllSets() {
  return ITEM_SETS;
}

/**
 * Format set bonus description
 * @param {Object} bonus - Bonus object
 * @returns {string} Formatted description
 */
export function formatSetBonus(bonus) {
  if (!bonus) return '';
  
  const parts = [];
  if (bonus.accuracy) parts.push(`+${bonus.accuracy}% Accuracy`);
  if (bonus.defense) parts.push(`+${bonus.defense}% Defense`);
  if (bonus.damage) parts.push(`+${bonus.damage}% Damage`);
  if (bonus.forcePower) parts.push(`+${bonus.forcePower} Veil Power`);
  if (bonus.charisma) parts.push(`+${bonus.charisma} Charisma`);
  if (bonus.smugglingSuccess) parts.push(`+${bonus.smugglingSuccess}% Smuggling`);
  if (bonus.energyResistance) parts.push(`+${bonus.energyResistance}% Energy Uprising`);
  if (bonus.forceAbilityEffectiveness) parts.push(`+${bonus.forceAbilityEffectiveness}% Veil Ability Effectiveness`);
  
  return parts.join(', ') || bonus.description || 'Set bonus';
}


