/**
 * Hacking Service
 * Handles hacking attempts
 */

const { PlayerCharacter } = require('../models');
const { ProgressionSystem } = require('../utils/progressionSystem');
const { attemptHack } = require('../utils/successChecks');

class HackingService {
  /**
   * Attempt to hack a terminal
   * @param {string} characterId - Character UUID
   * @param {string} terminalId - Terminal ID
   * @param {number} terminalTier - Terminal tier (1-5)
   * @param {boolean} useAdvantage - Whether to use advantage
   * @param {number} toolQuality - Tool quality bonus (null = auto-retrieve from equipped tool, 0 = no tool)
   * @returns {Promise<Object>} Hacking result
   */
  async attemptHackTerminal(characterId, terminalId, terminalTier, useAdvantage = false, toolQuality = null) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }
    
    const progressionSystem = new ProgressionSystem(character);
    
    // Get hacking skill level
    const hackingLevel = progressionSystem.getSkillLevel('technical', 'hacking');
    
    // Get intelligence
    const intelligence = character.stats.intelligence || 10;
    
    // Check if hacking is unlocked
    if (hackingLevel <= 0) {
      return {
        success: false,
        chance: 0,
        reason: 'Hacking skill not unlocked',
        terminalId,
        terminalTier
      };
    }
    
    // Stamina cost based on terminal tier
    const staminaCost = 5 + (terminalTier * 2); // 5 base + 2 per tier
    
    // Check stamina
    if (character.currentStamina < staminaCost) {
      return {
        success: false,
        chance: 0,
        reason: `Not enough stamina. Need ${staminaCost}, have ${character.currentStamina}`,
        terminalId,
        terminalTier,
        staminaCost,
        currentStamina: character.currentStamina
      };
    }
    
    // Deduct stamina (even if attempt fails)
    character.currentStamina = Math.max(0, character.currentStamina - staminaCost);
    await character.save();
    
    // Auto-retrieve tool bonus if not provided
    let finalToolQuality = toolQuality;
    if (toolQuality === null) {
      try {
        const toolService = require('./toolService');
        finalToolQuality = await toolService.getToolBonus(characterId, 'hacking');
      } catch (error) {
        console.debug('[Hacking Service] Could not retrieve tool bonus:', error.message);
        finalToolQuality = 0;
      }
    }
    
    // Attempt hack
    const result = attemptHack(hackingLevel, intelligence, terminalTier, finalToolQuality, useAdvantage);
    
    return {
      success: result.success,
      chance: result.chance,
      usedAdvantage: result.usedAdvantage,
      terminalId,
      terminalTier,
      hackingLevel,
      intelligence,
      toolQuality: finalToolQuality,
      staminaCost,
      remainingStamina: character.currentStamina
    };
  }
  
  /**
   * Get hacking success chance preview (for UI)
   * @param {string} characterId - Character UUID
   * @param {number} terminalTier - Terminal tier (1-5)
   * @param {number} toolQuality - Tool quality bonus (null = auto-retrieve from equipped tool)
   * @returns {Promise<Object>} Success chance information
   */
  async getHackChance(characterId, terminalTier, toolQuality = null) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }
    
    const progressionSystem = new ProgressionSystem(character);
    const hackingLevel = progressionSystem.getSkillLevel('technical', 'hacking');
    const intelligence = character.stats.intelligence || 10;
    
    // Auto-retrieve tool bonus if not provided
    let finalToolQuality = toolQuality;
    if (toolQuality === null) {
      try {
        const toolService = require('./toolService');
        finalToolQuality = await toolService.getToolBonus(characterId, 'hacking');
      } catch (error) {
        console.debug('[Hacking Service] Could not retrieve tool bonus:', error.message);
        finalToolQuality = 0;
      }
    }
    
    const { calculateSuccessChance } = require('../utils/successChecks');
    const difficulty = 12 + (terminalTier * 6);
    const chance = calculateSuccessChance(hackingLevel, intelligence, difficulty, finalToolQuality);
    
    return {
      chance,
      hackingLevel,
      intelligence,
      difficulty,
      toolQuality: finalToolQuality
    };
  }
}

module.exports = new HackingService();

