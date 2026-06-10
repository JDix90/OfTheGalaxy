/**
 * Combat Controller
 * HTTP request handlers for combat system
 */

const combatService = require('../services/combatService');
const encounterService = require('../services/encounterService');
const { CombatEncounter } = require('../models');

class CombatController {
  /**
   * Start a new combat encounter
   * POST /api/combat/start
   */
  async startEncounter(req, res, next) {
    try {
      const { characterId } = req.body;
      const { encounterType = 'random', enemies = null, options = {} } = req.body;

      if (!characterId) {
        return res.status(400).json({
          success: false,
          error: 'characterId is required'
        });
      }

      const encounter = await combatService.createEncounter(
        characterId,
        encounterType,
        enemies,
        options
      );

      res.json({
        success: true,
        data: encounter
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get encounter state
   * GET /api/combat/:encounterId
   */
  async getEncounter(req, res, next) {
    try {
      const { encounterId } = req.params;

      const encounter = await combatService.getEncounterState(encounterId);

      res.json({
        success: true,
        data: encounter
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Execute combat action
   * POST /api/combat/:encounterId/action
   */
  async executeAction(req, res, next) {
    try {
      const { encounterId } = req.params;
      const { combatantId, actionType, targetId = null, params = {} } = req.body;

      if (!combatantId || !actionType) {
        return res.status(400).json({
          success: false,
          error: 'combatantId and actionType are required'
        });
      }

      const result = await combatService.executeAction(
        encounterId,
        combatantId,
        actionType,
        targetId,
        params
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Attempt to flee combat
   * POST /api/combat/:encounterId/flee
   */
  async flee(req, res, next) {
    try {
      const { encounterId } = req.params;
      const { combatantId } = req.body;

      if (!combatantId) {
        return res.status(400).json({
          success: false,
          error: 'combatantId is required'
        });
      }

      const result = await combatService.executeAction(
        encounterId,
        combatantId,
        'flee'
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check for random encounter
   * POST /api/combat/check-encounter
   */
  async checkEncounter(req, res, next) {
    try {
      const { characterId, planetId, dangerLevel, location } = req.body;

      if (!characterId || !planetId || dangerLevel === undefined) {
        return res.status(400).json({
          success: false,
          error: 'characterId, planetId, and dangerLevel are required'
        });
      }

      const encounterResult = await encounterService.checkRandomEncounter(
        characterId,
        planetId,
        dangerLevel,
        location
      );

      res.json({
        success: true,
        data: encounterResult
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process enemy turn (auto-process if it's an enemy's turn)
   * POST /api/combat/:encounterId/process-turn
   */
  async processTurn(req, res, next) {
    try {
      const { encounterId } = req.params;

      const encounter = await combatService.getEncounterState(encounterId);
      
      if (!encounter) {
        return res.status(404).json({
          success: false,
          error: 'Combat encounter not found'
        });
      }

      if (encounter.status !== 'active') {
        return res.json({
          success: true,
          data: {
            encounter,
            processed: false,
            message: 'Combat is not active'
          }
        });
      }

      // Check if it's an enemy's turn
      const currentCombatantId = encounter.turnOrder[encounter.currentTurn];
      const currentCombatant = encounter.combatants.find(c => c.id === currentCombatantId);

      if (currentCombatant && currentCombatant.type === 'enemy') {
        // Process enemy turns
        const result = await combatService.processEnemyTurns(encounterId);
        res.json({
          success: true,
          data: result
        });
      } else {
        // It's the player's turn, just return the encounter
        res.json({
          success: true,
          data: {
            encounter,
            processed: false,
            message: 'Player turn'
          }
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get active encounter for character
   * GET /api/combat/character/:characterId/active
   */
  async getActiveEncounter(req, res, next) {
    try {
      const { characterId } = req.params;

      const encounter = await CombatEncounter.findOne({
        where: {
          characterId,
          status: 'active'
        },
        order: [['startedAt', 'DESC']]
      });

      if (!encounter) {
        return res.json({
          success: true,
          data: null
        });
      }

      res.json({
        success: true,
        data: encounter.toJSON()
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CombatController();

