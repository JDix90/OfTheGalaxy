/**
 * Achievement Routes
 * API routes for achievements
 */

const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievementController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get all achievements for character
router.get('/:characterId', achievementController.getAchievements.bind(achievementController));

// Get achievement statistics
router.get('/:characterId/stats', achievementController.getStats.bind(achievementController));

// Check and update achievements
router.post('/:characterId/check', achievementController.checkAchievements.bind(achievementController));

module.exports = router;


