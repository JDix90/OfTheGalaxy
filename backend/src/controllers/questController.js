/**
 * Quest Controller
 * Handles HTTP requests for quest management
 */

const questService = require('../services/questService');

class QuestController {
  /**
   * Get available quests for character
   * GET /api/quests/available/:characterId
   */
  async getAvailable(req, res, next) {
    try {
      const { characterId } = req.params;
      
      const quests = await questService.getAvailableQuests(characterId);
      
      res.json({
        success: true,
        data: quests
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get active quests for character
   * GET /api/quests/active/:characterId
   */
  async getActive(req, res, next) {
    try {
      const { characterId } = req.params;
      
      const quests = await questService.getActiveQuests(characterId);
      
      res.json({
        success: true,
        data: quests
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get completed quests for character
   * GET /api/quests/completed/:characterId
   */
  async getCompleted(req, res, next) {
    try {
      const { characterId } = req.params;
      
      const quests = await questService.getCompletedQuests(characterId);
      
      res.json({
        success: true,
        data: quests
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get quest by ID
   * GET /api/quests/:id?characterId=xxx
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const { characterId } = req.query; // Optional characterId for character-specific quest customization
      
      const quest = await questService.getQuest(id, characterId);
      
      res.json({
        success: true,
        data: quest
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get quests by faction
   * GET /api/quests/faction/:factionId
   */
  async getByFaction(req, res, next) {
    try {
      const { factionId } = req.params;
      
      const quests = await questService.getQuestsByFaction(factionId);
      
      res.json({
        success: true,
        data: quests
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available quests from a specific NPC
   * GET /api/quests/npc/:npcId/:characterId
   */
  async getByNPC(req, res, next) {
    try {
      const { npcId, characterId } = req.params;
      
      const quests = await questService.getQuestsByNPC(npcId, characterId);
      
      res.json({
        success: true,
        data: quests
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Start a quest
   * POST /api/quests/start
   */
  async start(req, res, next) {
    try {
      const { characterId, questId } = req.body;
      
      const result = await questService.startQuest(characterId, questId);
      
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update quest objective
   * PUT /api/quests/objective
   */
  async updateObjective(req, res, next) {
    try {
      const { characterId, questId, objectiveId, completed, progress } = req.body;
      
      const result = await questService.updateObjective(
        characterId,
        questId,
        objectiveId,
        completed,
        progress
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
   * Complete a quest
   * POST /api/quests/complete
   */
  async complete(req, res, next) {
    try {
      const { characterId, questId } = req.body;
      
      const result = await questService.completeQuest(characterId, questId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Abandon a quest
   * POST /api/quests/abandon
   */
  async abandon(req, res, next) {
    try {
      const { characterId, questId } = req.body;
      
      const result = await questService.abandonQuest(characterId, questId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available mini-quests for character
   * GET /api/quests/mini/available/:characterId?moralAlignment=altruistic
   */
  async getAvailableMiniQuests(req, res, next) {
    try {
      const { characterId } = req.params;
      const { moralAlignment } = req.query;
      
      const quests = await questService.getAvailableMiniQuests(characterId, moralAlignment || null);
      
      res.json({
        success: true,
        data: quests
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get active mini-quests for character
   * GET /api/quests/mini/active/:characterId?moralAlignment=criminal
   */
  async getActiveMiniQuests(req, res, next) {
    try {
      const { characterId } = req.params;
      const { moralAlignment } = req.query;
      
      const quests = await questService.getActiveMiniQuests(characterId, moralAlignment || null);
      
      res.json({
        success: true,
        data: quests
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get quest chain
   * GET /api/quests/chains/:chainId
   */
  async getQuestChain(req, res, next) {
    try {
      const { chainId } = req.params;
      
      const chain = await questService.getQuestChain(chainId);
      
      res.json({
        success: true,
        data: chain
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get next quest in chain for character
   * GET /api/quests/chains/:chainId/next/:characterId
   */
  async getNextInChain(req, res, next) {
    try {
      const { chainId, characterId } = req.params;
      
      const nextQuest = await questService.getNextQuestInChain(characterId, chainId);
      
      res.json({
        success: true,
        data: nextQuest
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get character's progress in a quest chain
   * GET /api/quests/chains/:chainId/progress/:characterId
   */
  async getChainProgress(req, res, next) {
    try {
      const { chainId, characterId } = req.params;
      
      const progress = await questService.getChainProgress(characterId, chainId);
      
      res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate quest chain structure
   * POST /api/quests/chains/:chainId/validate
   */
  async validateChain(req, res, next) {
    try {
      const { chainId } = req.params;
      
      const validation = await questService.validateQuestChain(chainId);
      
      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new QuestController();
