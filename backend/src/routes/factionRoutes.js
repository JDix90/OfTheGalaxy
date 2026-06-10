/**
 * Faction Routes
 * API routes for faction reputation management
 */

const express = require('express');
const router = express.Router();
const factionController = require('../controllers/factionController');
const { authenticate } = require('../middleware/auth');
const { validateUUIDParam } = require('../middleware/validation');

// All routes require authentication
router.use(authenticate);

// Get all reputations for a character
router.get('/:characterId', validateUUIDParam('characterId'), factionController.getReputations);

// Get specific faction reputation
router.get('/:characterId/:factionId', validateUUIDParam('characterId'), factionController.getReputation);

// Update faction reputation
router.post('/:characterId/:factionId', validateUUIDParam('characterId'), factionController.updateReputation);

module.exports = router;


