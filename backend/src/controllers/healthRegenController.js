/**
 * Health Regeneration Controller
 * Handles HTTP requests for health regeneration
 */

const healthRegenService = require('../services/healthRegenService');

class HealthRegenController {
  /**
   * Process health regeneration for character
   * POST /api/health-regen/:characterId
   */
  async processRegeneration(req, res, next) {
    try {
      const { characterId } = req.params;

      const result = await healthRegenService.processRegeneration(characterId);

      res.json({
        success: result.regenerated,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if character is in combat
   * GET /api/health-regen/:characterId/combat-status
   */
  async getCombatStatus(req, res, next) {
    try {
      const { characterId } = req.params;

      const inCombat = await healthRegenService.isInCombat(characterId);

      res.json({
        success: true,
        data: { inCombat }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HealthRegenController();


