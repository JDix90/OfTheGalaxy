/**
 * Ability Definitions (Frontend)
 * Shared with backend for UI display
 */

// Frontend ability definitions (minimal set for UI)
// Full definitions are in backend, but we need basic ones for tooltips
const ABILITY_DEFINITIONS = {
  field_heal: {
    id: 'field_heal',
    name: 'Field Heal',
    description: 'Use your medical knowledge to restore health to yourself or an ally.',
    type: 'heal',
    targetType: 'ally',
    cost: { stamina: 25 },
    cooldown: 3,
    effects: {
      heal: {
        base: 40,
        scaling: { intelligence: 2 }
      }
    },
    source: 'skill'
  },
  // Add other abilities as needed for tooltips
  veil_insight: {
    id: 'veil_insight',
    name: 'Veil Insight',
    description: 'Unlocks Veil perception abilities',
    type: 'utility',
    targetType: 'self',
    cost: { stamina: 0 },
    cooldown: 0,
    effects: {},
    source: 'item'
  },
  weapon_mastery: {
    id: 'weapon_mastery',
    name: 'Weapon Mastery',
    description: 'Unlocks weapon specialization',
    type: 'utility',
    targetType: 'self',
    cost: { stamina: 0 },
    cooldown: 0,
    effects: {},
    source: 'item'
  }
};

/**
 * Get ability definition
 * @param {string} abilityId - Ability ID
 * @returns {Object|null} Ability definition
 */
export function getAbilityDefinition(abilityId) {
  return ABILITY_DEFINITIONS[abilityId] || null;
}

/**
 * Get all ability definitions
 * @returns {Object} All ability definitions
 */
export function getAllAbilityDefinitions() {
  return ABILITY_DEFINITIONS;
}

