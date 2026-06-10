/**
 * Health Regeneration Routes
 * API routes for health regeneration
 */

const express = require('express');
const router = express.Router();
const healthRegenController = require('../controllers/healthRegenController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Process health regeneration for character
router.post('/:characterId', healthRegenController.processRegeneration.bind(healthRegenController));

// Check combat status
router.get('/:characterId/combat-status', healthRegenController.getCombatStatus.bind(healthRegenController));

module.exports = router;


