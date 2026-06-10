/**
 * Sub-Map Routes
 * API routes for sub-map operations
 */

const express = require('express');
const router = express.Router();
const subMapController = require('../controllers/subMapController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get sub-map by ID
router.get('/:id', subMapController.getSubMapById);

// Get sub-map for location (creates if doesn't exist)
router.get('/location/:planetId/:parentLocationId/:parentLocationType/:type', 
  subMapController.getSubMapForLocation);

// Get all sub-maps for a planet
router.get('/planet/:planetId', subMapController.getSubMapsByPlanet);

// Get all sub-maps for a parent location
router.get('/parent/:planetId/:parentLocationId/:parentLocationType', 
  subMapController.getSubMapsByParent);

// Create or update sub-map
router.post('/', subMapController.saveSubMap);

// Delete sub-map
router.delete('/:id', subMapController.deleteSubMap);

// Check for resource encounter in submap
router.post('/:subMapId/check-resource-encounter', subMapController.checkResourceEncounter.bind(subMapController));

// Dungeon enemy endpoints
router.get('/:subMapId/enemies', subMapController.getDungeonEnemies.bind(subMapController));
router.post('/:subMapId/enemies/spawn', subMapController.spawnDungeonEnemies.bind(subMapController));
router.put('/:subMapId/enemies/:enemyId', subMapController.updateEnemyState.bind(subMapController));
router.post('/:subMapId/enemies/respawn', subMapController.respawnDungeonEnemies.bind(subMapController));
router.post('/:subMapId/enemies/exit', subMapController.markDungeonExit.bind(subMapController));
router.post('/:subMapId/enemies/:enemyId/search', subMapController.searchDefeatedEnemy.bind(subMapController));

// Dungeon quest tracking endpoint
const dungeonController = require('../controllers/dungeonController');
router.post('/:subMapId/track-depth', dungeonController.trackDepth.bind(dungeonController));

// Building interior endpoint
router.post('/building-interior/:planetId/:buildingId', subMapController.getBuildingInterior.bind(subMapController));

module.exports = router;


