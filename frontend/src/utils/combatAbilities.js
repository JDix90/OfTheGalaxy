/**
 * Combat Abilities Utility
 * Gets and formats available combat abilities for a character
 */

import { SKILL_DEFINITIONS } from '../data/skills';

/**
 * Ability definitions for combat (matches backend abilityDefinitions.js)
 */
const COMBAT_ABILITY_DEFINITIONS = {
  // Item-Based Abilities
  force_insight: {
    id: 'force_insight',
    name: 'Force Insight',
    description: 'Use the Force to gain insight into your enemy, reducing their accuracy for 2 turns.',
    cost: { stamina: 20 },
    cooldown: 3,
    targetType: 'enemy',
    icon: '👁️'
  },
  force_artifact_mastery: {
    id: 'force_artifact_mastery',
    name: 'Force Artifact Mastery',
    description: 'Channel ancient Force power through your artifact, dealing Force damage and restoring stamina.',
    cost: { stamina: 30 },
    cooldown: 4,
    targetType: 'enemy',
    icon: '🔮'
  },
  force_mastery: {
    id: 'force_mastery',
    name: 'Force Mastery',
    description: 'Unleash your mastery of the Force, dealing significant damage and stunning the target for 1 turn.',
    cost: { stamina: 40 },
    cooldown: 5,
    targetType: 'enemy',
    icon: '⚡'
  },
  weapon_mastery: {
    id: 'weapon_mastery',
    name: 'Weapon Mastery',
    description: 'Execute a masterful strike with your weapon, dealing increased damage with a chance to crit.',
    cost: { stamina: 25 },
    cooldown: 3,
    targetType: 'enemy',
    icon: '⚔️'
  },
  armor_mastery: {
    id: 'armor_mastery',
    name: 'Armor Mastery',
    description: 'Fortify your defenses, increasing your defense and reducing incoming damage for 3 turns.',
    cost: { stamina: 20 },
    cooldown: 4,
    targetType: 'self',
    icon: '🛡️'
  },
  data_analysis_mastery: {
    id: 'data_analysis_mastery',
    name: 'Data Analysis',
    description: 'Analyze enemy patterns, revealing their weaknesses and increasing your accuracy for 3 turns.',
    cost: { stamina: 15 },
    cooldown: 3,
    targetType: 'self',
    icon: '📊'
  },
  slicing_mastery: {
    id: 'slicing_mastery',
    name: 'Slicing Mastery',
    description: 'Hack into enemy systems, dealing ion damage to droids or disrupting enemy electronics.',
    cost: { stamina: 20 },
    cooldown: 3,
    targetType: 'enemy',
    icon: '💻'
  },
  // Skill Tree Abilities
  field_heal: {
    id: 'field_heal',
    name: 'Field Heal',
    description: 'Use your medical knowledge to restore health to yourself or an ally.',
    cost: { stamina: 25 },
    cooldown: 3,
    targetType: 'ally',
    icon: '💚'
  }
};

/**
 * Get all available combat abilities for a character
 * Combines item-based abilities and skill tree abilities
 * @param {Object} character - Character object
 * @param {Object} combatant - Combatant object (for cooldowns)
 * @returns {Array} Array of available combat abilities
 */
export function getAvailableCombatAbilities(character, combatant = null) {
  const abilities = [];

  // Get item-based abilities (from character.abilities array)
  // Handle both CharacterManager objects and plain character objects
  const characterData = character?.character || character;
  const itemAbilities = characterData?.abilities || character?.abilities || [];
  itemAbilities.forEach(abilityId => {
    const abilityDef = COMBAT_ABILITY_DEFINITIONS[abilityId];
    if (abilityDef) {
      abilities.push({
        ...abilityDef,
        source: 'item',
        available: isAbilityAvailable(abilityDef, combatant)
      });
    }
  });

  // Get skill tree abilities
  const skills = characterData?.skills || character?.skills;
  if (skills) {
    for (const [tree, treeSkills] of Object.entries(skills)) {
      for (const [skillId, skillData] of Object.entries(treeSkills)) {
        if (skillData.level > 0) {
          const skillDef = SKILL_DEFINITIONS[tree]?.[skillId];
          if (skillDef && skillDef.abilities) {
            skillDef.abilities.forEach(ability => {
              // Only include combat-usable abilities
              if (ability.id !== 'pick_lock') { // Exclude non-combat abilities
                const abilityDef = COMBAT_ABILITY_DEFINITIONS[ability.id];
                if (abilityDef) {
                  abilities.push({
                    ...abilityDef,
                    source: 'skill',
                    skillTree: tree,
                    skillId: skillId,
                    available: isAbilityAvailable(abilityDef, combatant)
                  });
                } else {
                  // Fallback for abilities not in definitions
                  abilities.push({
                    id: ability.id,
                    name: ability.name,
                    description: ability.description,
                    cost: { stamina: 20 },
                    cooldown: 3,
                    targetType: 'enemy',
                    icon: '✨',
                    source: 'skill',
                    skillTree: tree,
                    skillId: skillId,
                    available: isAbilityAvailable({ cost: { stamina: 20 } }, combatant)
                  });
                }
              }
            });
          }
        }
      }
    }
  }

  return abilities;
}

/**
 * Check if an ability is available (has enough stamina and not on cooldown)
 * @param {Object} abilityDef - Ability definition
 * @param {Object} combatant - Combatant object
 * @returns {Object} Availability info
 */
function isAbilityAvailable(abilityDef, combatant) {
  if (!combatant) {
    return { available: true, reason: null };
  }

  // Check stamina
  const staminaCost = abilityDef.cost?.stamina || 0;
  if (combatant.stats.stamina < staminaCost) {
    return {
      available: false,
      reason: `Not enough stamina (need ${staminaCost})`
    };
  }

  // Check cooldown
  const cooldowns = combatant.abilityCooldowns || {};
  if (cooldowns[abilityDef.id] && cooldowns[abilityDef.id] > 0) {
    return {
      available: false,
      reason: `On cooldown (${cooldowns[abilityDef.id]} turns)`
    };
  }

  return { available: true, reason: null };
}

/**
 * Get ability definition by ID
 * @param {string} abilityId - Ability ID
 * @returns {Object|null} Ability definition
 */
export function getCombatAbilityDefinition(abilityId) {
  return COMBAT_ABILITY_DEFINITIONS[abilityId] || null;
}

