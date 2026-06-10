/**
 * Stamina Regeneration Service
 * Handles time-based automatic stamina regeneration
 */

const { PlayerCharacter, CombatEncounter } = require('../models');
const { ProgressionSystem } = require('../utils/progressionSystem');

class StaminaRegenService {
  /**
   * Process stamina regeneration for a character
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
        message: 'Cannot regenerate stamina during combat'
      };
    }

    // Check if character is at full stamina
    if (character.currentStamina >= character.maxStamina) {
      return {
        regenerated: false,
        reason: 'full_stamina',
        message: 'Character is already at full stamina'
      };
    }

    // Calculate regeneration amount
    const regenAmount = await this.calculateRegenAmount(character);
    const oldStamina = character.currentStamina;
    const newStamina = Math.min(character.maxStamina, character.currentStamina + regenAmount);
    
    character.currentStamina = newStamina;
    await character.save();

    return {
      regenerated: true,
      amount: newStamina - oldStamina,
      oldStamina,
      newStamina,
      maxStamina: character.maxStamina,
      regenRate: await this.getRegenRate(character) // For UI display
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
   * @returns {Promise<number>} Stamina points to regenerate
   */
  async calculateRegenAmount(character) {
    // Base regeneration: 1% of max stamina per minute
    // With regeneration tick every 30 seconds, that's 0.5% per tick
    const baseRegenPercent = 0.005; // 0.5% per tick (30 seconds)
    const baseRegen = Math.floor(character.maxStamina * baseRegenPercent);

    // Get regeneration modifiers from skills/items
    const regenModifier = await this.getRegenModifier(character);
    let modifiedRegen = Math.floor(baseRegen * regenModifier);

    // Apply stamina status effect modifiers (exhausted/fatigued reduce regen)
    const { calculateStaminaStatusModifiers } = require('../data/staminaStatusEffects');
    const staminaModifiers = calculateStaminaStatusModifiers(character);
    if (staminaModifiers.staminaRegenBonus !== 0) {
      modifiedRegen = Math.max(1, Math.floor(modifiedRegen * (1 + staminaModifiers.staminaRegenBonus / 100)));
    }

    // Minimum 1 stamina per tick
    return Math.max(1, modifiedRegen);
  }

  /**
   * Get regeneration rate modifier from skills/items
   * @param {Object} character - Character object
   * @returns {Promise<number>} Multiplier (1.0 = base, 1.5 = 50% faster, etc.)
   */
  async getRegenModifier(character) {
    let modifier = 1.0;

    // Check skill bonuses
    const progressionSystem = new ProgressionSystem(character);
    const passiveBonuses = progressionSystem.getPassiveBonuses();
    
    // Add stamina regen bonus from skills (if implemented)
    if (passiveBonuses.other?.staminaRegenBonus) {
      modifier += passiveBonuses.other.staminaRegenBonus / 100; // Convert % to multiplier
    }

    // Check equipped items for regeneration bonuses
    const inventoryService = require('./inventoryService');
    const { getItemDefinition } = require('../data/items');
    try {
      const equippedItems = await inventoryService.getEquipped(character.id);
      for (const invItem of equippedItems) {
        const itemDef = getItemDefinition(invItem.itemId);
        if (itemDef && itemDef.stats?.staminaRegenBonus) {
          modifier += itemDef.stats.staminaRegenBonus / 100; // Convert % to multiplier
        }
      }
    } catch (error) {
      // Silently fail if inventory service unavailable
      console.debug('[Stamina Regen] Could not check equipped items:', error.message);
    }

    return modifier;
  }

  /**
   * Get current regeneration rate (for UI display)
   * @param {Object} character - Character object
   * @returns {Promise<number>} Stamina per minute
   */
  async getRegenRate(character) {
    const regenPerTick = await this.calculateRegenAmount(character);
    return regenPerTick * 2; // 2 ticks per minute = per minute rate
  }

  /**
   * Process regeneration for all active characters
   * This would be called periodically (e.g., every 30 seconds)
   * @returns {Promise<Array>} Array of regeneration results
   */
  async processAllRegeneration() {
    // Get all characters that are not at full stamina
    const { Op } = require('sequelize');
    const characters = await PlayerCharacter.findAll({
      where: {
        currentStamina: {
          [Op.lt]: require('sequelize').col('max_stamina')
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
        console.error(`Failed to process stamina regeneration for character ${character.id}:`, error);
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

module.exports = new StaminaRegenService();

