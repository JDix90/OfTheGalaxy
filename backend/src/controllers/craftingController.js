/**
 * Crafting Controller
 * Handles HTTP requests for crafting operations
 */

const craftingService = require('../services/craftingService');

class CraftingController {
  /**
   * Get available recipes for a character
   * GET /api/crafting/:characterId/recipes
   */
  async getRecipes(req, res, next) {
    try {
      const { characterId } = req.params;
      const userId = req.user.id;

      // Verify character belongs to user
      const { PlayerCharacter } = require('../models');
      const character = await PlayerCharacter.findByPk(characterId);
      
      if (!character) {
        return res.status(404).json({
          success: false,
          message: 'Character not found'
        });
      }

      if (character.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const recipes = await craftingService.getAvailableRecipes(characterId);
      
      res.json({
        success: true,
        data: recipes,
        count: recipes.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recipe details
   * GET /api/crafting/recipes/:recipeId
   */
  async getRecipeDetails(req, res, next) {
    try {
      const { recipeId } = req.params;
      
      const recipe = craftingService.getRecipeDetails(recipeId);
      
      if (!recipe) {
        return res.status(404).json({
          success: false,
          message: 'Recipe not found'
        });
      }

      res.json({
        success: true,
        data: recipe
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if character can craft a recipe
   * GET /api/crafting/:characterId/can-craft/:recipeId
   */
  async canCraft(req, res, next) {
    try {
      const { characterId, recipeId } = req.params;
      const userId = req.user.id;

      // Verify character belongs to user
      const { PlayerCharacter } = require('../models');
      const character = await PlayerCharacter.findByPk(characterId);
      
      if (!character) {
        return res.status(404).json({
          success: false,
          message: 'Character not found'
        });
      }

      if (character.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const validation = await craftingService.canCraft(characterId, recipeId);
      
      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Craft an item
   * POST /api/crafting/:characterId/craft/:recipeId
   */
  async craftItem(req, res, next) {
    try {
      const { characterId, recipeId } = req.params;
      const { quantity = 1 } = req.body;
      const userId = req.user.id;

      // Verify character belongs to user
      const { PlayerCharacter } = require('../models');
      const character = await PlayerCharacter.findByPk(characterId);
      
      if (!character) {
        return res.status(404).json({
          success: false,
          message: 'Character not found'
        });
      }

      if (character.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Validate quantity
      if (quantity < 1 || quantity > 10) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be between 1 and 10'
        });
      }

      const result = await craftingService.craftItem(characterId, recipeId, quantity);
      
      res.json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CraftingController();


