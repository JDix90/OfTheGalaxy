/**
 * Lockpicking Controller
 * HTTP request handlers for lockpicking endpoints
 */

const lockpickingService = require('../services/lockpickingService');
const { authenticate } = require('../middleware/auth');

class LockpickingController {
  /**
   * Attempt to pick a lock
   * POST /api/lockpicking/attempt
   */
  async attemptPickLock(req, res, next) {
    try {
      const { characterId, lockId, lockTier, useAdvantage, toolQuality } = req.body;

      console.log('[Lockpicking Controller] Attempt request:', {
        characterId,
        lockId,
        lockTier,
        useAdvantage,
        toolQuality
      });

      // Validate required parameters
      if (!characterId || !lockId) {
        return res.status(400).json({
          success: false,
          error: 'characterId and lockId are required'
        });
      }

      // Validate and default lockTier
      const validatedLockTier = lockTier !== undefined && lockTier !== null 
        ? parseInt(lockTier) 
        : 1;
      
      if (isNaN(validatedLockTier) || validatedLockTier < 1 || validatedLockTier > 5) {
        return res.status(400).json({
          success: false,
          error: 'lockTier must be a number between 1 and 5'
        });
      }

      // Verify character belongs to user
      const { PlayerCharacter } = require('../models');
      const character = await PlayerCharacter.findByPk(characterId);
      if (!character || character.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Character not found or access denied'
        });
      }

      const result = await lockpickingService.attemptPickLock(
        characterId,
        lockId,
        validatedLockTier,
        useAdvantage || false,
        toolQuality || 0
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[Lockpicking Controller] Error:', error);
      console.error('[Lockpicking Controller] Error stack:', error.stack);
      console.error('[Lockpicking Controller] Request body:', req.body);
      next(error);
    }
  }

  /**
   * Get lockpicking success chance preview
   * GET /api/lockpicking/chance/:characterId
   */
  async getLockpickChance(req, res, next) {
    try {
      const { characterId } = req.params;
      const { lockTier, toolQuality } = req.query;

      if (!characterId || !lockTier) {
        return res.status(400).json({
          success: false,
          error: 'characterId and lockTier are required'
        });
      }

      // Verify character belongs to user
      const { PlayerCharacter } = require('../models');
      const character = await PlayerCharacter.findByPk(characterId);
      if (!character || character.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Character not found or access denied'
        });
      }

      const result = await lockpickingService.getLockpickChance(
        characterId,
        parseInt(lockTier),
        parseInt(toolQuality) || 0
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[Lockpicking Controller] Error:', error);
      next(error);
    }
  }
}

module.exports = new LockpickingController();

