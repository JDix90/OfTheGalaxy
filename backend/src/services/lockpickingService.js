/**
 * Lockpicking Service
 * Handles lockpicking attempts
 */

const { PlayerCharacter } = require('../models');
const { ProgressionSystem } = require('../utils/progressionSystem');
const { attemptLockpick } = require('../utils/successChecks');

class LockpickingService {
  /**
   * Attempt to pick a lock
   * @param {string} characterId - Character UUID
   * @param {string} lockId - Lock ID
   * @param {number} lockTier - Lock tier (1-5)
   * @param {boolean} useAdvantage - Whether to use advantage (master lockpicks, etc.)
   * @param {number} toolQuality - Tool quality bonus (null = auto-retrieve from equipped tool, 0 = no tool)
   * @returns {Promise<Object>} Lockpicking result
   */
  async attemptPickLock(characterId, lockId, lockTier, useAdvantage = false, toolQuality = null) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }
    
    try {
      const progressionSystem = new ProgressionSystem(character);
      
      // Get lockpicking skill level
      const lockpickingLevel = progressionSystem.getSkillLevel('stealth', 'lockpicking');
      
      // Get agility (ensure stats object exists)
      const stats = character.stats || {};
      const agility = stats.agility || 10;
      
      // Validate lockTier
      const validatedLockTier = parseInt(lockTier) || 1;
      if (validatedLockTier < 1 || validatedLockTier > 5) {
        throw new Error(`Invalid lockTier: ${lockTier}. Must be between 1 and 5.`);
      }
      
      // Check if lockpicking is unlocked
      if (lockpickingLevel <= 0) {
        return {
          success: false,
          chance: 0,
          reason: 'Lockpicking skill not unlocked',
          lockId,
          lockTier: validatedLockTier
        };
      }
      
      // Stamina cost based on lock tier
      const staminaCost = 5 + (validatedLockTier * 2); // 5 base + 2 per tier
      
      // Ensure currentStamina exists
      const currentStamina = character.currentStamina !== undefined && character.currentStamina !== null
        ? character.currentStamina
        : character.maxStamina || 100;
      
      // Check stamina
      if (currentStamina < staminaCost) {
        return {
          success: false,
          chance: 0,
          reason: `Not enough stamina. Need ${staminaCost}, have ${currentStamina}`,
          lockId,
          lockTier: validatedLockTier,
          staminaCost,
          currentStamina
        };
      }
      
      // Deduct stamina (even if attempt fails)
      character.currentStamina = Math.max(0, currentStamina - staminaCost);
      await character.save();
    
      // Auto-retrieve tool bonus if not provided
      let finalToolQuality = toolQuality;
      if (toolQuality === null) {
        try {
          const toolService = require('./toolService');
          finalToolQuality = await toolService.getToolBonus(characterId, 'lockpicking');
        } catch (error) {
          console.debug('[Lockpicking Service] Could not retrieve tool bonus:', error.message);
          finalToolQuality = 0;
        }
      }
    
      // Attempt lockpick
      const result = attemptLockpick(lockpickingLevel, agility, validatedLockTier, finalToolQuality, useAdvantage);
      
      return {
        success: result.success,
        chance: result.chance,
        usedAdvantage: result.usedAdvantage,
        lockId,
        lockTier: validatedLockTier,
        lockpickingLevel,
        agility,
        toolQuality: finalToolQuality,
        staminaCost,
        remainingStamina: character.currentStamina
      };
    } catch (error) {
      console.error('[Lockpicking Service] Error in attemptPickLock:', error);
      console.error('[Lockpicking Service] Error stack:', error.stack);
      throw new Error(`Lockpicking failed: ${error.message}`);
    }
  }
  
  /**
   * Get lockpicking success chance preview (for UI)
   * @param {string} characterId - Character UUID
   * @param {number} lockTier - Lock tier (1-5)
   * @param {number} toolQuality - Tool quality bonus (null = auto-retrieve from equipped tool)
   * @returns {Promise<Object>} Success chance information
   */
  async getLockpickChance(characterId, lockTier, toolQuality = null) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }
    
    const progressionSystem = new ProgressionSystem(character);
    const lockpickingLevel = progressionSystem.getSkillLevel('stealth', 'lockpicking');
    const agility = character.stats.agility || 10;
    
    // Auto-retrieve tool bonus if not provided
    let finalToolQuality = toolQuality;
    if (toolQuality === null) {
      try {
        const toolService = require('./toolService');
        finalToolQuality = await toolService.getToolBonus(characterId, 'lockpicking');
      } catch (error) {
        console.debug('[Lockpicking Service] Could not retrieve tool bonus:', error.message);
        finalToolQuality = 0;
      }
    }
    
    const { calculateSuccessChance } = require('../utils/successChecks');
    const difficulty = 10 + (lockTier * 5);
    const chance = calculateSuccessChance(lockpickingLevel, agility, difficulty, finalToolQuality);
    
    return {
      chance,
      lockpickingLevel,
      agility,
      difficulty,
      toolQuality: finalToolQuality
    };
  }
}

module.exports = new LockpickingService();

