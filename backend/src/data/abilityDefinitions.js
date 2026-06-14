/**
 * Ability Definitions
 * Defines all combat abilities with their effects, costs, and targeting
 */

const ABILITY_TYPES = {
  DAMAGE: 'damage',
  HEAL: 'heal',
  BUFF: 'buff',
  DEBUFF: 'debuff',
  UTILITY: 'utility'
};

const TARGET_TYPES = {
  SELF: 'self',
  ENEMY: 'enemy',
  ALLY: 'ally',
  ALL_ENEMIES: 'all_enemies',
  ALL_ALLIES: 'all_allies'
};

/**
 * Ability Definitions
 * Each ability has:
 * - id: Unique identifier
 * - name: Display name
 * - description: What the ability does
 * - type: Ability type (damage, heal, buff, debuff, utility)
 * - targetType: Who can be targeted (self, enemy, ally, all_enemies, all_allies)
 * - cost: Resource cost (stamina, health, etc.)
 * - cooldown: Turns before ability can be used again
 * - effects: What the ability does
 * - source: Where the ability comes from ('item' or 'skill')
 */
const ABILITY_DEFINITIONS = {
  // Item-Based Abilities
  veil_insight: {
    id: 'veil_insight',
    name: 'Veil Insight',
    description: 'Use the Veil to gain insight into your enemy, reducing their accuracy for 2 turns.',
    type: ABILITY_TYPES.DEBUFF,
    targetType: TARGET_TYPES.ENEMY,
    cost: { stamina: 20 },
    cooldown: 3,
    effects: {
      debuff: {
        accuracy: -15,
        duration: 2
      }
    },
    source: 'item'
  },
  force_artifact_mastery: {
    id: 'force_artifact_mastery',
    name: 'Veil Artifact Mastery',
    description: 'Channel ancient Veil power through your artifact, dealing Veil damage and restoring stamina.',
    type: ABILITY_TYPES.DAMAGE,
    targetType: TARGET_TYPES.ENEMY,
    cost: { stamina: 30 },
    cooldown: 4,
    effects: {
      damage: {
        base: 25,
        type: 'force',
        scaling: { forcePower: 0.5 } // 50% of Veil Power as bonus damage
      },
      selfHeal: {
        stamina: 15
      }
    },
    source: 'item'
  },
  veil_mastery: {
    id: 'veil_mastery',
    name: 'Veil Mastery',
    description: 'Unleash your mastery of the Veil, dealing significant damage and stunning the target for 1 turn.',
    type: ABILITY_TYPES.DAMAGE,
    targetType: TARGET_TYPES.ENEMY,
    cost: { stamina: 40 },
    cooldown: 5,
    effects: {
      damage: {
        base: 40,
        type: 'force',
        scaling: { forcePower: 0.75 }
      },
      debuff: {
        stun: true,
        duration: 1
      }
    },
    source: 'item'
  },
  weapon_mastery: {
    id: 'weapon_mastery',
    name: 'Weapon Mastery',
    description: 'Execute a masterful strike with your weapon, dealing increased damage with a chance to crit.',
    type: ABILITY_TYPES.DAMAGE,
    targetType: TARGET_TYPES.ENEMY,
    cost: { stamina: 25 },
    cooldown: 3,
    effects: {
      damage: {
        base: 30,
        type: 'physical',
        scaling: { attack: 0.5 },
        critChance: 0.25 // 25% crit chance
      }
    },
    source: 'item'
  },
  armor_mastery: {
    id: 'armor_mastery',
    name: 'Armor Mastery',
    description: 'Fortify your defenses, increasing your defense and reducing incoming damage for 3 turns.',
    type: ABILITY_TYPES.BUFF,
    targetType: TARGET_TYPES.SELF,
    cost: { stamina: 20 },
    cooldown: 4,
    effects: {
      buff: {
        defense: 10,
        damageReduction: 0.15, // 15% damage reduction
        duration: 3
      }
    },
    source: 'item'
  },
  data_analysis_mastery: {
    id: 'data_analysis_mastery',
    name: 'Data Analysis',
    description: 'Analyze enemy patterns, revealing their weaknesses and increasing your accuracy for 3 turns.',
    type: ABILITY_TYPES.BUFF,
    targetType: TARGET_TYPES.SELF,
    cost: { stamina: 15 },
    cooldown: 3,
    effects: {
      buff: {
        accuracy: 20,
        critChance: 0.10,
        duration: 3
      }
    },
    source: 'item'
  },
  slicing_mastery: {
    id: 'slicing_mastery',
    name: 'Slicing Mastery',
    description: 'Hack into enemy systems, dealing ion damage to droids or disrupting enemy electronics.',
    type: ABILITY_TYPES.DAMAGE,
    targetType: TARGET_TYPES.ENEMY,
    cost: { stamina: 20 },
    cooldown: 3,
    effects: {
      damage: {
        base: 20,
        type: 'ion',
        droidBonus: 0.5 // 50% bonus damage to droids
      },
      debuff: {
        accuracy: -10,
        duration: 2
      }
    },
    source: 'item'
  },

  // Skill Tree Abilities
  pick_lock: {
    id: 'pick_lock',
    name: 'Pick Lock',
    description: 'Not usable in combat - used for opening locked doors and containers.',
    type: ABILITY_TYPES.UTILITY,
    targetType: TARGET_TYPES.SELF,
    cost: { stamina: 0 },
    cooldown: 0,
    effects: {},
    source: 'skill',
    combatUsable: false
  },
  field_heal: {
    id: 'field_heal',
    name: 'Field Heal',
    description: 'Use your medical knowledge to restore health to yourself or an ally.',
    type: ABILITY_TYPES.HEAL,
    targetType: TARGET_TYPES.ALLY,
    cost: { stamina: 25 },
    cooldown: 3,
    effects: {
      heal: {
        base: 40,
        scaling: { intelligence: 2 } // +2 HP per intelligence point
      }
    },
    source: 'skill'
  }
};

/**
 * Get ability definition
 * @param {string} abilityId - Ability ID
 * @returns {Object|null} Ability definition
 */
function getAbilityDefinition(abilityId) {
  return ABILITY_DEFINITIONS[abilityId] || null;
}

/**
 * Get all ability definitions
 * @returns {Object} All ability definitions
 */
function getAllAbilityDefinitions() {
  return ABILITY_DEFINITIONS;
}

/**
 * Check if ability is usable in combat
 * @param {string} abilityId - Ability ID
 * @returns {boolean} True if usable in combat
 */
function isCombatUsable(abilityId) {
  const ability = getAbilityDefinition(abilityId);
  if (!ability) return false;
  return ability.combatUsable !== false; // Default to true unless explicitly false
}

/**
 * Get abilities by source
 * @param {string} source - Source type ('item' or 'skill')
 * @returns {Array} Array of ability definitions
 */
function getAbilitiesBySource(source) {
  return Object.values(ABILITY_DEFINITIONS).filter(ability => ability.source === source);
}

module.exports = {
  ABILITY_TYPES,
  TARGET_TYPES,
  ABILITY_DEFINITIONS,
  getAbilityDefinition,
  getAllAbilityDefinitions,
  isCombatUsable,
  getAbilitiesBySource
};


