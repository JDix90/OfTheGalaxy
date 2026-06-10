/**
 * Character Controller
 * Handles HTTP requests for character management
 */

const characterService = require('../services/characterService');

class CharacterController {
  /**
   * Create new character
   * POST /api/characters
   */
  async create(req, res, next) {
    try {
      const userId = req.user.id; // Assumes auth middleware sets req.user
      const characterData = req.body;
      
      const character = await characterService.createCharacter(userId, characterData);
      
      res.status(201).json({
        success: true,
        data: character
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get character by ID
   * GET /api/characters/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      
      const character = await characterService.getCharacter(id);
      
      res.json({
        success: true,
        data: character
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all characters for current user
   * GET /api/characters
   */
  async getAll(req, res, next) {
    try {
      const userId = req.user.id;
      
      const characters = await characterService.getCharactersForUser(userId);
      
      res.json({
        success: true,
        data: characters
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add XP to character
   * POST /api/characters/:id/xp
   */
  async addXP(req, res, next) {
    try {
      const { id } = req.params;
      const { amount, source } = req.body;
      
      const result = await characterService.addXP(id, amount, source);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Allocate skill point
   * POST /api/characters/:id/skills
   */
  async allocateSkill(req, res, next) {
    try {
      const { id } = req.params;
      const { tree, skillId } = req.body;
      
      const character = await characterService.allocateSkillPoint(id, tree, skillId);
      
      res.json({
        success: true,
        data: character
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Allocate attribute point
   * POST /api/characters/:id/attributes
   */
  async allocateAttribute(req, res, next) {
    try {
      const { id } = req.params;
      const { attribute } = req.body;
      
      const character = await characterService.allocateAttributePoint(id, attribute);
      
      res.json({
        success: true,
        data: character
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update character location
   * PUT /api/characters/:id/location
   */
  async updateLocation(req, res, next) {
    try {
      const { id } = req.params;
      const { planet, location } = req.body;
      
      const character = await characterService.updateLocation(id, planet, location);
      
      res.json({
        success: true,
        data: character
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update character vitals (health/stamina)
   * PUT /api/characters/:id/vitals
   */
  async updateVitals(req, res, next) {
    try {
      const { id } = req.params;
      const { health, stamina } = req.body;
      
      const character = await characterService.updateVitals(id, health, stamina);
      
      res.json({
        success: true,
        data: character
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Rest (restore health and stamina)
   * POST /api/characters/:id/rest
   */
  async rest(req, res, next) {
    try {
      const { id } = req.params;
      
      const character = await characterService.rest(id);
      
      res.json({
        success: true,
        data: character
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete character
   * DELETE /api/characters/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      await characterService.deleteCharacter(id, userId);
      
      res.json({
        success: true,
        message: 'Character deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CharacterController();
