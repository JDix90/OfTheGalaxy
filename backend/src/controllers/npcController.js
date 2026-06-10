/**
 * NPC Controller
 * Handles HTTP requests for NPC interactions
 */

const npcService = require('../services/npcService');
const npcGenerator = require('../services/npcGenerator');
const suggestedResponseService = require('../services/suggestedResponseService');
const conversationHistoryService = require('../services/conversationHistoryService');
const conversationContextService = require('../services/conversationContextService');
const { Planet, SubMap } = require('../models');

class NPCController {
  /**
   * Get NPC by ID
   * GET /api/npcs/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const { characterId } = req.query;
      
      let result;
      if (characterId) {
        result = await npcService.getNPCWithRelationship(id, characterId);
      } else {
        result = await npcService.getNPC(id);
      }
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get NPCs by location
   * GET /api/npcs/location/:planet
   */
  async getByLocation(req, res, next) {
    try {
      const { planet } = req.params;
      const { area } = req.query;
      
      const npcs = await npcService.getNPCsByLocation(planet, area);
      
      res.json({
        success: true,
        data: npcs
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get NPCs by faction
   * GET /api/npcs/faction/:factionId
   */
  async getByFaction(req, res, next) {
    try {
      const { factionId } = req.params;
      
      const npcs = await npcService.getNPCsByFaction(factionId);
      
      res.json({
        success: true,
        data: npcs
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all companions
   * GET /api/npcs/companions
   */
  async getCompanions(req, res, next) {
    try {
      const npcs = await npcService.getAllCompanions();
      
      res.json({
        success: true,
        data: npcs
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all vendors
   * GET /api/npcs/vendors
   */
  async getVendors(req, res, next) {
    try {
      const npcs = await npcService.getAllVendors();
      
      res.json({
        success: true,
        data: npcs
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process dialogue with NPC
   * POST /api/npcs/:id/dialogue
   */
  async dialogue(req, res, next) {
    try {
      const { id } = req.params;
      const { characterId, message } = req.body;
      
      const result = await npcService.processDialogue(id, characterId, message);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get suggested responses for NPC dialogue
   * POST /api/npcs/:id/suggested-responses
   */
  async getSuggestedResponses(req, res, next) {
    try {
      const { id } = req.params;
      const { characterId, conversationHistory } = req.body;
      
      if (!characterId) {
        return res.status(400).json({
          success: false,
          error: 'characterId is required'
        });
      }
      
      const { npc, relationship } = await npcService.getNPCWithRelationship(id, characterId);
      const { PlayerCharacter } = require('../models');
      const character = await PlayerCharacter.findByPk(characterId);
      
      if (!character) {
        return res.status(404).json({
          success: false,
          error: 'Character not found'
        });
      }
      
      const suggestions = await suggestedResponseService.generateSuggestedResponses(
        npc,
        relationship,
        character,
        conversationHistory || []
      );
      
      res.json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Recruit NPC as companion
   * POST /api/npcs/:id/recruit
   */
  async recruit(req, res, next) {
    try {
      const { id } = req.params;
      const { characterId } = req.body;
      
      const result = await npcService.recruitCompanion(id, characterId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Dismiss companion
   * POST /api/npcs/:id/dismiss
   */
  async dismiss(req, res, next) {
    try {
      const { id } = req.params;
      const { characterId } = req.body;
      
      const result = await npcService.dismissCompanion(id, characterId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recruited companions for character
   * GET /api/npcs/recruited/:characterId
   */
  async getRecruited(req, res, next) {
    try {
      const { characterId } = req.params;
      
      const companions = await npcService.getRecruitedCompanions(characterId);
      
      res.json({
        success: true,
        data: companions
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate NPCs for a planet
   * POST /api/npcs/generate/planet/:planetId
   */
  async generateForPlanet(req, res, next) {
    try {
      const { planetId } = req.params;
      const { count } = req.body;
      
      const planet = await Planet.findByPk(planetId);
      
      if (!planet) {
        return res.status(404).json({
          success: false,
          error: 'Planet not found'
        });
      }
      
      const npcs = await npcGenerator.generatePlanetNPCs(planet, count);
      
      res.json({
        success: true,
        data: npcs,
        count: npcs.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate NPCs for a sub-map
   * POST /api/npcs/generate/submap/:subMapId
   */
  async generateForSubMap(req, res, next) {
    try {
      const { subMapId } = req.params;
      const { count } = req.body;
      
      console.log(`[NPC Controller] Generating NPCs for submap: ${subMapId}`);
      
      const subMap = await SubMap.findByPk(subMapId);
      
      if (!subMap) {
        return res.status(404).json({
          success: false,
          error: 'Sub-map not found'
        });
      }
      
      const planet = await Planet.findByPk(subMap.planetId);
      
      if (!planet) {
        return res.status(404).json({
          success: false,
          error: 'Planet not found'
        });
      }
      
      console.log(`[NPC Controller] Submap type: ${subMap.type}, subMapType: ${subMap.subMapType || 'none'}`);
      
      const npcs = await npcGenerator.generateSubMapNPCs(subMap, planet, count);
      
      console.log(`[NPC Controller] Generated ${npcs.length} NPCs for submap ${subMapId}`);
      
      res.json({
        success: true,
        data: npcs,
        count: npcs.length
      });
    } catch (error) {
      console.error(`[NPC Controller] Error generating NPCs for submap ${req.params.subMapId}:`, error);
      next(error);
    }
  }

  /**
   * Get NPCs by sub-map
   * GET /api/npcs/submap/:subMapId
   */
  async getBySubMap(req, res, next) {
    try {
      const { subMapId } = req.params;
      const { parentLocationId, planetId, area } = req.query;
      
      const { NPC, SubMap } = require('../models');
      
      // CRITICAL: Dungeons do not have regular NPCs - only enemy combatants
      const subMap = await SubMap.findByPk(subMapId);
      if (subMap && subMap.type === 'dungeon') {
        return res.json({
          success: true,
          data: []
        });
      }
      
      // Get NPCs by subMapId first
      let npcs = await NPC.findBySubMap(subMapId);
      
      // Also check for NPCs by area if provided
      // This handles NPCs from content files that have area set but no subMapId
      // Map common location names to area names
      const areaMap = {
        'lessu': 'lessu',
        'Lessu, the Capital City': 'lessu',
        'Lessu': 'lessu',
        'tann_province': 'tann_province',
        'Tann Province': 'tann_province',
        'Refugee Settlement': 'tann_province'
      };
      
      const areaToCheck = area || (parentLocationId && areaMap[parentLocationId.toLowerCase()]) || parentLocationId?.toLowerCase();
      
      if (areaToCheck && planetId) {
        console.log(`[NPC Controller] Checking for NPCs by area: ${areaToCheck} on planet ${planetId}`);
        const areaNPCs = await NPC.findByLocation(planetId, areaToCheck);
        if (areaNPCs.length > 0) {
          // Merge with existing NPCs, avoiding duplicates
          const existingIds = new Set(npcs.map(n => n.id));
          const newNPCs = areaNPCs.filter(n => !existingIds.has(n.id));
          npcs = [...npcs, ...newNPCs];
          console.log(`[NPC Controller] Found ${areaNPCs.length} NPCs by area, ${newNPCs.length} new ones added`);
        }
      }
      
      res.json({
        success: true,
        data: npcs
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all NPCs
   * GET /api/npcs
   */
  async getAll(req, res, next) {
    try {
      const { limit, offset, npcType, factionId, planetId, systemId } = req.query;
      
      const options = {};
      if (limit) options.limit = parseInt(limit, 10);
      if (offset) options.offset = parseInt(offset, 10);
      if (npcType) options.npcType = npcType;
      if (factionId) options.factionId = factionId;
      if (planetId) options.planetId = planetId;
      if (systemId) options.systemId = systemId;
      
      const npcs = await npcService.getAllNPCs(options);
      
      res.json({
        success: true,
        data: npcs,
        count: npcs.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get active escort quest for character
   * GET /api/npcs/escort/active/:characterId
   */
  async getActiveEscortQuest(req, res, next) {
    try {
      const { characterId } = req.params;
      const escortService = require('../services/escortService');
      
      const escortQuest = await escortService.getActiveEscortQuest(characterId);
      
      res.json({
        success: true,
        data: escortQuest
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get escort quest marker for map display
   * GET /api/npcs/escort/marker/:characterId
   */
  async getEscortQuestMarker(req, res, next) {
    try {
      const { characterId } = req.params;
      const escortService = require('../services/escortService');
      
      const marker = await escortService.getEscortQuestMarker(characterId);
      
      res.json({
        success: true,
        data: marker
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get conversation history for NPC-Character relationship
   * GET /api/npcs/:id/conversation-history
   */
  async getConversationHistory(req, res, next) {
    try {
      const { id } = req.params;
      const { characterId } = req.query;
      const { limit, offset, topic, questId, search } = req.query;
      
      if (!characterId) {
        return res.status(400).json({
          success: false,
          error: 'characterId is required'
        });
      }
      
      const options = {};
      if (limit) options.limit = parseInt(limit, 10);
      if (offset) options.offset = parseInt(offset, 10);
      if (topic) options.topic = topic;
      if (questId) options.questId = questId;
      if (search) options.searchQuery = search; // Phase 5: Search support
      
      const result = await conversationHistoryService.loadConversationHistory(
        id,
        characterId,
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

  /**
   * Get conversation topics for NPC-Character relationship
   * GET /api/npcs/:id/conversation-topics
   */
  async getConversationTopics(req, res, next) {
    try {
      const { id } = req.params;
      const { characterId } = req.query;
      
      if (!characterId) {
        return res.status(400).json({
          success: false,
          error: 'characterId is required'
        });
      }
      
      const topics = await conversationHistoryService.getConversationTopics(id, characterId);
      
      res.json({
        success: true,
        data: { topics }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get conversation context for dialogue generation
   * GET /api/npcs/:id/conversation-context
   */
  async getConversationContext(req, res, next) {
    try {
      const { id } = req.params;
      const { characterId, playerMessage } = req.query;
      
      if (!characterId) {
        return res.status(400).json({
          success: false,
          error: 'characterId is required'
        });
      }
      
      const context = await conversationContextService.buildContext(
        id,
        characterId,
        playerMessage || ''
      );
      
      res.json({
        success: true,
        data: context
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NPCController();
