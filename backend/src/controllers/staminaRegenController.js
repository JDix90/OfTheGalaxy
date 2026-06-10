/**
 * Stamina Regeneration Controller
 * Handles HTTP requests for stamina regeneration
 */

const staminaRegenService = require('../services/staminaRegenService');

class StaminaRegenController {
  /**
   * Process stamina regeneration for character
   * POST /api/stamina-regen/:characterId
   */
  async processRegeneration(req, res, next) {
    try {
      const { characterId } = req.params;
      
      const result = await staminaRegenService.processRegeneration(characterId);
      
      res.json({
        success: result.regenerated,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get stamina regeneration status
   * GET /api/stamina-regen/:characterId/status
   */
  async getStatus(req, res, next) {
    try {
      const { characterId } = req.params;
      const { PlayerCharacter } = require('../models');
      
      const character = await PlayerCharacter.findByPk(characterId);
      if (!character) {
        return res.status(404).json({ error: 'Character not found' });
      }

      const regenRate = await staminaRegenService.getRegenRate(character);
      const inCombat = await staminaRegenService.isInCombat(characterId);
      const isFull = character.currentStamina >= character.maxStamina;

      res.json({
        success: true,
        data: {
          regenRate, // Stamina per minute
          inCombat,
          isFull,
          canRegenerate: !inCombat && !isFull,
          nextRegenIn: inCombat || isFull ? null : 30, // seconds until next tick
          currentStamina: character.currentStamina,
          maxStamina: character.maxStamina
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StaminaRegenController();

