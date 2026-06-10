/**
 * Crafting Routes
 * API routes for crafting system
 */

const express = require('express');
const router = express.Router();
const craftingController = require('../controllers/craftingController');
const { authenticate } = require('../middleware/auth');
const { validateUUIDParam } = require('../middleware/validation');

// All routes require authentication
router.use(authenticate);

// Recipe operations
router.get('/recipes/:recipeId', craftingController.getRecipeDetails);
router.get('/:characterId/recipes', validateUUIDParam('characterId'), craftingController.getRecipes);
router.get('/:characterId/can-craft/:recipeId', validateUUIDParam('characterId'), craftingController.canCraft);
router.post('/:characterId/craft/:recipeId', validateUUIDParam('characterId'), craftingController.craftItem);

module.exports = router;


