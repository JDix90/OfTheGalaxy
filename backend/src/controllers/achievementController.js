/**
 * Achievement Controller
 * Handles HTTP requests for achievements
 */

const achievementService = require('../services/achievementService');

class AchievementController {
  /**
   * Get all achievements for character
   * GET /api/achievements/:characterId
   */
  async getAchievements(req, res, next) {
    try {
      const { characterId } = req.params;

      const achievements = await achievementService.getAchievements(characterId);

      res.json({
        success: true,
        data: achievements
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get achievement statistics
   * GET /api/achievements/:characterId/stats
   */
  async getStats(req, res, next) {
    try {
      const { characterId } = req.params;

      const stats = await achievementService.getAchievementStats(characterId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check and update achievements
   * POST /api/achievements/:characterId/check
   */
  async checkAchievements(req, res, next) {
    try {
      const { characterId } = req.params;
      const { type } = req.body; // 'discovery', 'combat', or 'all'

      if (type === 'discovery' || type === 'all') {
        await achievementService.checkDiscoveryAchievements(characterId);
      }

      if (type === 'combat' || type === 'all') {
        await achievementService.checkCombatAchievements(characterId);
      }

      res.json({
        success: true,
        message: 'Achievements checked'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AchievementController();


