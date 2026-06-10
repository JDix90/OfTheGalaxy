/**
 * POI Controller
 * Handles HTTP requests for POI interactions
 */

const poiService = require('../services/poiService');
const { POIInteraction } = require('../models');

class POIController {
  /**
   * Interact with a POI
   * POST /api/pois/interact
   */
  async interact(req, res, next) {
    const { characterId, planetId, poi, interactionType } = req.body;
    
    try {
      if (!characterId || !planetId || !poi) {
        return res.status(400).json({
          success: false,
          error: 'characterId, planetId, and poi are required'
        });
      }

      const result = await poiService.interactWithPOI(
        characterId,
        planetId,
        poi,
        interactionType
      );

      res.json({
        success: result.success,
        data: result
      });
    } catch (error) {
      // Log detailed error for debugging
      console.error('POI interaction error:', {
        message: error.message,
        name: error.name,
        validationErrors: error.errors,
        poi: poi ? { id: poi.id, name: poi.name, type: poi.type } : 'missing',
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      });
      
      // Return more detailed error message for validation errors
      if (error.name === 'SequelizeValidationError') {
        const validationMessages = error.errors?.map(e => `${e.path}: ${e.message}`).join(', ') || error.message;
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: validationMessages,
          details: error.errors?.map(e => ({ field: e.path, message: e.message }))
        });
      }
      
      next(error);
    }
  }

  /**
   * Get POI interactions for character on planet
   * GET /api/pois/:characterId/:planetId
   */
  async getInteractions(req, res, next) {
    try {
      const { characterId, planetId } = req.params;

      const interactions = await poiService.getPOIInteractions(characterId, planetId);

      res.json({
        success: true,
        data: interactions
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get POI state
   * GET /api/pois/:characterId/:planetId/:poiId/state
   */
  async getState(req, res, next) {
    try {
      const { characterId, planetId, poiId } = req.params;

      const state = await poiService.getPOIState(characterId, planetId, poiId);

      res.json({
        success: true,
        data: { state }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update POI after combat
   * POST /api/pois/update-combat
   */
  async updateAfterCombat(req, res, next) {
    try {
      const { characterId, planetId, poiId, combatWon } = req.body;

      if (!characterId || !planetId || !poiId || combatWon === undefined) {
        return res.status(400).json({
          success: false,
          error: 'characterId, planetId, poiId, and combatWon are required'
        });
      }

      await poiService.updatePOIAfterCombat(characterId, planetId, poiId, combatWon);

      res.json({
        success: true,
        message: 'POI state updated after combat'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new POIController();

