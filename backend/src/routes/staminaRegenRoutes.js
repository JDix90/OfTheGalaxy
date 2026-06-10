/**
 * Stamina Regeneration Routes
 * API routes for stamina regeneration
 */

const express = require('express');
const router = express.Router();
const staminaRegenController = require('../controllers/staminaRegenController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Process stamina regeneration for character
router.post('/:characterId', staminaRegenController.processRegeneration.bind(staminaRegenController));

// Get stamina regeneration status
router.get('/:characterId/status', staminaRegenController.getStatus.bind(staminaRegenController));

module.exports = router;

