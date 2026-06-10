/**
 * Movement Service
 * Handles character movement with conditional stamina costs
 */

const { PlayerCharacter } = require('../models');

class MovementService {
  /**
   * Move character with optional stamina cost (only when health < 20%)
   * @param {string} characterId - Character UUID
   * @param {number} deltaX - X movement
   * @param {number} deltaY - Y movement
   * @param {boolean} sprinting - Whether character is sprinting (not implemented yet)
   * @returns {Promise<Object>} Movement result
   */
  async moveCharacter(characterId, deltaX, deltaY, sprinting = false) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    // Calculate movement cost (only if health < 20%)
    const healthPercent = character.maxHealth > 0 
      ? (character.currentHealth / character.maxHealth) * 100 
      : 100;
    
    let staminaCost = 0;
    if (healthPercent < 20) {
      // Base cost: 1 stamina per tile
      const baseCost = 1;
      // Sprinting costs more (if implemented)
      const sprintCost = sprinting ? 2 : 0;
      staminaCost = baseCost + sprintCost;
      
      // Check stamina
      if (character.currentStamina < staminaCost) {
        throw new Error(`Not enough stamina. Need ${staminaCost}, have ${character.currentStamina}`);
      }
      
      // Deduct stamina
      character.currentStamina = Math.max(0, character.currentStamina - staminaCost);
      await character.save();
    }

    // Update location (movement always succeeds, stamina cost is separate)
    // Note: Actual location update is handled by characterService.updateLocation
    // This service just handles the stamina cost logic

    return {
      success: true,
      staminaCost,
      remainingStamina: character.currentStamina,
      healthPercent,
      appliesStaminaCost: healthPercent < 20
    };
  }

  /**
   * Check if movement would cost stamina
   * @param {string} characterId - Character UUID
   * @returns {Promise<Object>} Movement cost info
   */
  async getMovementCostInfo(characterId) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    const healthPercent = character.maxHealth > 0 
      ? (character.currentHealth / character.maxHealth) * 100 
      : 100;
    
    const appliesStaminaCost = healthPercent < 20;
    const staminaCost = appliesStaminaCost ? 1 : 0;

    return {
      appliesStaminaCost,
      staminaCost,
      healthPercent,
      currentStamina: character.currentStamina,
      hasEnoughStamina: character.currentStamina >= staminaCost
    };
  }
}

module.exports = new MovementService();

