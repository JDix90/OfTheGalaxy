/**
 * Tutorial Controller
 * Handles HTTP requests for tutorial system
 */

const tutorialService = require('../services/tutorialService');

class TutorialController {
  /**
   * Get tutorial state for character
   * GET /api/tutorial/state/:characterId
   */
  async getState(req, res, next) {
    try {
      const { characterId } = req.params;
      
      const progress = await tutorialService.getTutorialState(characterId);
      
      res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Update tutorial state
   * POST /api/tutorial/state/:characterId
   */
  async updateState(req, res, next) {
    try {
      const { characterId } = req.params;
      const updates = req.body;
      
      const progress = await tutorialService.updateTutorialState(characterId, updates);
      
      res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Complete a tutorial step
   * POST /api/tutorial/step/:characterId
   */
  async completeStep(req, res, next) {
    try {
      const { characterId } = req.params;
      const { stepId, stepData } = req.body;
      
      if (!stepId) {
        return res.status(400).json({
          success: false,
          error: 'stepId is required'
        });
      }
      
      const progress = await tutorialService.completeStep(characterId, stepId, stepData);
      
      res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Start tutorial
   * POST /api/tutorial/start/:characterId
   */
  async start(req, res, next) {
    try {
      const { characterId } = req.params;
      
      // Initialize tutorial if not already started
      const progress = await tutorialService.initializeTutorial(characterId);
      
      // Update state to starting
      await tutorialService.updateTutorialState(characterId, {
        state: 'starting'
      });
      
      // Try to assign tutorial quest, but don't fail if it doesn't work
      try {
        await tutorialService.assignTutorialQuest(characterId);
      } catch (questError) {
        console.warn(`[TutorialController] Failed to assign tutorial quest (non-fatal):`, questError.message);
        // Continue anyway - tutorial can proceed without quest assignment
      }
      
      // Update state to orient_ui to show first tooltip
      const updatedProgress = await tutorialService.updateTutorialState(characterId, {
        state: 'orient_ui'
      });
      
      // Return the updated progress with the correct state
      res.json({
        success: true,
        data: {
          progress: updatedProgress,
          message: 'Tutorial started'
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Complete tutorial
   * POST /api/tutorial/complete/:characterId
   */
  async complete(req, res, next) {
    try {
      const { characterId } = req.params;
      
      const progress = await tutorialService.completeTutorial(characterId);
      
      res.json({
        success: true,
        data: {
          progress,
          message: 'Tutorial completed'
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Skip tutorial
   * POST /api/tutorial/skip/:characterId
   */
  async skip(req, res, next) {
    try {
      const { characterId } = req.params;
      
      const progress = await tutorialService.skipTutorial(characterId);
      
      res.json({
        success: true,
        data: {
          progress,
          message: 'Tutorial skipped'
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Assign tutorial quest
   * POST /api/tutorial/assign-quest/:characterId
   */
  async assignQuest(req, res, next) {
    try {
      const { characterId } = req.params;
      
      const questProgress = await tutorialService.assignTutorialQuest(characterId);
      
      res.json({
        success: true,
        data: questProgress
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get tutorial NPC for character
   * GET /api/tutorial/npc/:characterId
   */
  async getTutorialNPC(req, res, next) {
    try {
      const { characterId } = req.params;
      const { subMapId } = req.query;
      
      const npc = await tutorialService.getTutorialNPC(characterId, subMapId);
      
      res.json({
        success: true,
        data: npc
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get tutorial config for character
   * GET /api/tutorial/config/:characterId
   */
  async getConfig(req, res, next) {
    try {
      const { characterId } = req.params;
      
      const character = await require('../models').PlayerCharacter.findByPk(characterId);
      if (!character) {
        return res.status(404).json({
          success: false,
          error: 'Character not found'
        });
      }
      
      const config = tutorialService.getTutorialConfigForBackground(character.background);
      
      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Ensure tutorial NPC exists on submap
   * POST /api/tutorial/ensure-npc/:characterId
   */
  async ensureNPCOnSubmap(req, res, next) {
    try {
      const { characterId } = req.params;
      const { subMapId } = req.body;
      
      if (!subMapId) {
        return res.status(400).json({
          success: false,
          error: 'subMapId is required'
        });
      }
      
      try {
        const npc = await tutorialService.ensureTutorialNPCOnSubmap(characterId, subMapId);
        
        res.json({
          success: true,
          data: npc
        });
      } catch (error) {
        // If NPC already exists (409 or unique constraint), that's fine - return success
        if (error.name === 'SequelizeUniqueConstraintError' || 
            error.message?.includes('already exists') ||
            error.message?.includes('duplicate') ||
            error.status === 409) {
          console.log(`[TutorialController] Tutorial NPC already exists for character ${characterId}, returning existing NPC`);
          // Try to get the existing NPC
          const character = await require('../models').PlayerCharacter.findByPk(characterId);
          if (character) {
            const config = tutorialService.getTutorialConfigForBackground(character.background);
            const existingNPC = await require('../models').NPC.findByPk(config.npcId);
            if (existingNPC) {
              return res.json({
                success: true,
                data: existingNPC,
                message: 'NPC already exists'
              });
            }
          }
          // If we can't find it, just return success anyway
          return res.json({
            success: true,
            message: 'NPC already exists'
          });
        }
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TutorialController();

