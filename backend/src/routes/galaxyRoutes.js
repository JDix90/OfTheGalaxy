/**
 * Galaxy Routes
 * API routes for galaxy map functionality
 */

const express = require('express');
const router = express.Router();
const galaxyController = require('../controllers/galaxyController');
const { authenticate } = require('../middleware/auth');

// Public routes (galaxy map data)
router.get('/map', galaxyController.getGalaxyMap);
router.get('/systems', galaxyController.getAllSystems);
router.get('/systems/:id', galaxyController.getSystemById);
router.get('/systems/:systemId/planets', galaxyController.getPlanetsBySystem);
router.get('/planets', galaxyController.getAllPlanets);
router.get('/planets/:id', galaxyController.getPlanetById);
router.get('/planets/:id/navmesh', galaxyController.getPlanetNavMesh);
router.get('/systems/:systemId/routes', galaxyController.getRoutesFromSystem);
router.get('/path', galaxyController.findPath);

// Protected routes (require authentication)
router.post('/travel/cost', authenticate, galaxyController.calculateTravelCost);
router.post('/travel', authenticate, galaxyController.travelToPlanet);

module.exports = router;

