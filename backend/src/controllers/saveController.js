/**
 * Save Controller
 * Handles HTTP requests for save/load management
 */

const saveService = require('../services/saveService');

class SaveController {
  /**
   * Get all save slots for current user
   * GET /api/saves
   */
  async getSaveSlots(req, res, next) {
    try {
      const userId = req.user.id;
      const slots = await saveService.getSaveSlots(userId);
      
      res.json({
        success: true,
        data: slots
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create or update a save slot
   * POST /api/saves/:slotNumber
   */
  async createSave(req, res, next) {
    try {
      const userId = req.user.id;
      const { slotNumber } = req.params;
      const { characterId, saveName } = req.body;

      if (!characterId) {
        return res.status(400).json({
          success: false,
          message: 'characterId is required'
        });
      }

      const slot = await saveService.createSave(userId, characterId, parseInt(slotNumber), saveName);
      
      res.json({
        success: true,
        data: slot
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Load a save slot
   * GET /api/saves/:slotNumber/load
   */
  async loadSave(req, res, next) {
    try {
      const userId = req.user.id;
      const { slotNumber } = req.params;
      
      const saveData = await saveService.loadSave(userId, parseInt(slotNumber));
      
      res.json({
        success: true,
        data: saveData
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Restore a save slot (apply the snapshot back to the live game state)
   * POST /api/saves/:slotNumber/restore
   */
  async restoreSave(req, res, next) {
    try {
      const userId = req.user.id;
      const { slotNumber } = req.params;

      const result = await saveService.restoreSave(userId, parseInt(slotNumber));

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a save slot
   * DELETE /api/saves/:slotNumber
   */
  async deleteSave(req, res, next) {
    try {
      const userId = req.user.id;
      const { slotNumber } = req.params;
      
      await saveService.deleteSave(userId, parseInt(slotNumber));
      
      res.json({
        success: true,
        message: 'Save slot deleted'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SaveController();


