/**
 * Ability Service
 * Handles permanent ability unlocks from items
 */

const { PlayerCharacter } = require('../models');
const { getItemDefinition } = require('../data/items');

class AbilityService {
  /**
   * Unlock ability from item
   * @param {string} characterId - Character UUID
   * @param {string} itemId - Item ID that unlocks the ability
   * @returns {Promise<Object>} Unlock result
   */
  async unlockAbility(characterId, itemId) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    const itemDef = getItemDefinition(itemId);
    if (!itemDef) {
      throw new Error('Item not found');
    }

    // Check if item has permanent ability
    const permanentAbility = itemDef.stats?.permanentAbility;
    if (!permanentAbility) {
      throw new Error('Item does not unlock an ability');
    }

    // Get current abilities
    const abilities = character.abilities || [];
    
    // Check if ability is already unlocked
    if (abilities.includes(permanentAbility)) {
      return {
        success: false,
        message: 'Ability already unlocked',
        ability: permanentAbility
      };
    }

    // Unlock ability
    abilities.push(permanentAbility);
    character.abilities = abilities;
    await character.save();

    return {
      success: true,
      message: `Unlocked ability: ${permanentAbility}`,
      ability: permanentAbility,
      abilities: abilities
    };
  }

  /**
   * Get all unlocked abilities for a character
   * @param {string} characterId - Character UUID
   * @returns {Promise<Array>} Array of ability IDs
   */
  async getAbilities(characterId) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    return character.abilities || [];
  }

  /**
   * Check if character has ability
   * @param {string} characterId - Character UUID
   * @param {string} abilityId - Ability ID to check
   * @returns {Promise<boolean>} True if ability is unlocked
   */
  async hasAbility(characterId, abilityId) {
    const abilities = await this.getAbilities(characterId);
    return abilities.includes(abilityId);
  }

  /**
   * Get ability display information
   * @param {string} abilityId - Ability ID
   * @returns {Object} Ability display info
   */
  getAbilityInfo(abilityId) {
    const abilityInfo = {
      veil_insight: {
        name: 'Veil Insight',
        description: 'Unlocks Veil perception abilities',
        category: 'force'
      },
      force_artifact_mastery: {
        name: 'Veil Artifact Mastery',
        description: 'Unlocks artifact-related abilities',
        category: 'force'
      },
      veil_mastery: {
        name: 'Veil Mastery',
        description: 'Unlocks advanced Veil abilities',
        category: 'force'
      },
      weapon_mastery: {
        name: 'Weapon Mastery',
        description: 'Unlocks weapon specialization',
        category: 'combat'
      },
      armor_mastery: {
        name: 'Armor Mastery',
        description: 'Unlocks armor specialization',
        category: 'combat'
      },
      data_analysis_mastery: {
        name: 'Data Analysis Mastery',
        description: 'Unlocks advanced data analysis',
        category: 'utility'
      },
      slicing_mastery: {
        name: 'Slicing Mastery',
        description: 'Unlocks advanced hacking',
        category: 'utility'
      }
    };

    return abilityInfo[abilityId] || {
      name: abilityId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: 'Unknown ability',
      category: 'unknown'
    };
  }
}

module.exports = new AbilityService();


