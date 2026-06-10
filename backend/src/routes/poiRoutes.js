/**
 * POI Routes
 * API routes for POI interactions
 */

const express = require('express');
const router = express.Router();
const poiController = require('../controllers/poiController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Interact with a POI
router.post('/interact', poiController.interact.bind(poiController));

// Get POI interactions for character on planet
router.get('/:characterId/:planetId', poiController.getInteractions.bind(poiController));

// Get POI state
router.get('/:characterId/:planetId/:poiId/state', poiController.getState.bind(poiController));

// Update POI after combat
router.post('/update-combat', poiController.updateAfterCombat.bind(poiController));

module.exports = router;


