/**
 * Health Regeneration Service
 * Handles time-based automatic health regeneration
 */

const { PlayerCharacter, CombatEncounter } = require('../models');

class HealthRegenService {
  /**
   * Process health regeneration for a character
   * @param {string} characterId - Character UUID
   * @returns {Promise<Object>} Regeneration result
   */
  async processRegeneration(characterId) {
    const character = await PlayerCharacter.findByPk(characterId);
    
    if (!character) {
      throw new Error('Character not found');
    }

    // Check if character is in combat
    const inCombat = await this.isInCombat(characterId);
    if (inCombat) {
      return {
        regenerated: false,
        reason: 'in_combat',
        message: 'Cannot regenerate health during combat'
      };
    }

    // Check if character is at full health
    if (character.currentHealth >= character.maxHealth) {
      return {
        regenerated: false,
        reason: 'full_health',
        message: 'Character is already at full health'
      };
    }

    // Calculate regeneration amount (now async to check equipment)
    const regenAmount = await this.calculateRegenAmount(character);
    const oldHealth = character.currentHealth;
    const newHealth = Math.min(character.maxHealth, character.currentHealth + regenAmount);
    
    character.currentHealth = newHealth;
    await character.save();

    return {
      regenerated: true,
      amount: newHealth - oldHealth,
      oldHealth,
      newHealth,
      maxHealth: character.maxHealth
    };
  }

  /**
   * Check if character is in active combat
   * @param {string} characterId - Character UUID
   * @returns {Promise<boolean>} True if in combat
   */
  async isInCombat(characterId) {
    const activeCombat = await CombatEncounter.findOne({
      where: {
        characterId,
        status: 'active'
      }
    });

    return !!activeCombat;
  }

  /**
   * Calculate regeneration amount per tick
   * @param {Object} character - Character object
   * @returns {Promise<number>} Health points to regenerate
   */
  async calculateRegenAmount(character) {
    // Base regeneration: 1% of max health per minute
    // With regeneration tick every 30 seconds, that's 0.5% per tick
    const baseRegenPercent = 0.005; // 0.5% per tick (30 seconds)
    const baseRegen = Math.floor(character.maxHealth * baseRegenPercent);

    // Check equipped items for health regen bonus
    let modifier = 1.0;
    try {
      const inventoryService = require('./inventoryService');
      const { getItemDefinition } = require('../data/items');
      const equippedItems = await inventoryService.getEquipped(character.id);
      
      for (const invItem of equippedItems) {
        const itemDef = getItemDefinition(invItem.itemId);
        if (itemDef && itemDef.stats?.healthRegenBonus) {
          modifier += itemDef.stats.healthRegenBonus / 100; // Convert % to multiplier
        }
      }
    } catch (error) {
      // Silently fail if inventory service unavailable
      console.debug('[Health Regen] Could not check equipped items:', error.message);
    }

    // Apply modifier
    const modifiedRegen = Math.floor(baseRegen * modifier);

    // Minimum 1 HP per tick
    return Math.max(1, modifiedRegen);
  }

  /**
   * Process regeneration for all active characters
   * This would be called periodically (e.g., every 30 seconds)
   * @returns {Promise<Array>} Array of regeneration results
   */
  async processAllRegeneration() {
    // Get all characters that are not at full health
    const characters = await PlayerCharacter.findAll({
      where: {
        currentHealth: {
          [require('sequelize').Op.lt]: require('sequelize').col('max_health')
        }
      }
    });

    const results = [];
    for (const character of characters) {
      try {
        const result = await this.processRegeneration(character.id);
        results.push({
          characterId: character.id,
          ...result
        });
      } catch (error) {
        console.error(`Failed to process regeneration for character ${character.id}:`, error);
        results.push({
          characterId: character.id,
          regenerated: false,
          error: error.message
        });
      }
    }

    return results;
  }
}

module.exports = new HealthRegenService();


