/**
 * Fast Travel Controller
 * Handles HTTP requests for fast travel
 */

const fastTravelService = require('../services/fastTravelService');

class FastTravelController {
  /**
   * Get available fast travel points
   * GET /api/fast-travel/:characterId/:planetId
   */
  async getPoints(req, res, next) {
    try {
      const { characterId, planetId } = req.params;

      const points = await fastTravelService.getFastTravelPoints(characterId, planetId);

      res.json({
        success: true,
        data: points
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fast travel to destination
   * POST /api/fast-travel/travel
   */
  async travel(req, res, next) {
    try {
      const { characterId, planetId, destinationId, options } = req.body;

      if (!characterId || !planetId || !destinationId) {
        return res.status(400).json({
          success: false,
          error: 'characterId, planetId, and destinationId are required'
        });
      }

      const result = await fastTravelService.fastTravel(
        characterId,
        planetId,
        destinationId,
        options
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FastTravelController();


