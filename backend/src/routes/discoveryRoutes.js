/**
 * Discovery Routes
 * API routes for discovery/exploration operations
 */

const express = require('express');
const router = express.Router();
const discoveryController = require('../controllers/discoveryController');
const { authenticate } = require('../middleware/auth');
const { validateUUIDParam } = require('../middleware/validation');

// All routes require authentication
router.use(authenticate);

// Record a discovery
router.post('/', discoveryController.recordDiscovery);

// Get discoveries for a character
router.get('/:characterId', validateUUIDParam('characterId'), discoveryController.getDiscoveries);

// Get discovery statistics
router.get('/:characterId/stats', validateUUIDParam('characterId'), discoveryController.getStats);

// Get planet completion
router.get('/:characterId/planet/:planetId/completion', validateUUIDParam('characterId'), discoveryController.getPlanetCompletion);

// Check if location is discovered
router.get('/:characterId/check/:planetId/:locationId', validateUUIDParam('characterId'), discoveryController.checkDiscovery);

// Get discovered locations for a planet
router.get('/:characterId/planet/:planetId/locations', validateUUIDParam('characterId'), discoveryController.getPlanetLocations);

module.exports = router;


