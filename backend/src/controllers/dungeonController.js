/**
 * Dungeon Controller
 * HTTP request handlers for dungeon-specific operations
 */

const dungeonQuestService = require('../services/dungeonQuestService');

class DungeonController {
  /**
   * Track depth reached in dungeon
   * POST /api/dungeons/:subMapId/track-depth
   */
  async trackDepth(req, res, next) {
    try {
      const { subMapId } = req.params;
      const { characterId, depthZone } = req.body;

      if (!characterId || depthZone === undefined) {
        return res.status(400).json({
          success: false,
          error: 'characterId and depthZone are required'
        });
      }

      await dungeonQuestService.trackDepthReached(characterId, subMapId, depthZone);

      res.json({
        success: true,
        message: 'Depth tracked successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DungeonController();


