/**
 * Tutorial Routes
 * API routes for tutorial system
 */

const express = require('express');
const router = express.Router();
const tutorialController = require('../controllers/tutorialController');
const { authenticate } = require('../middleware/auth');
const { validateUUIDParam } = require('../middleware/validation');

// All routes require authentication
router.use(authenticate);

// Tutorial state management
router.get('/state/:characterId', validateUUIDParam('characterId'), tutorialController.getState);
router.post('/state/:characterId', validateUUIDParam('characterId'), tutorialController.updateState);
router.post('/step/:characterId', validateUUIDParam('characterId'), tutorialController.completeStep);

// Tutorial actions
router.post('/start/:characterId', validateUUIDParam('characterId'), tutorialController.start);
router.post('/complete/:characterId', validateUUIDParam('characterId'), tutorialController.complete);
router.post('/skip/:characterId', validateUUIDParam('characterId'), tutorialController.skip);

// Tutorial quest assignment
router.post('/assign-quest/:characterId', validateUUIDParam('characterId'), tutorialController.assignQuest);

// Tutorial NPC
router.get('/npc/:characterId', validateUUIDParam('characterId'), tutorialController.getTutorialNPC);
router.post('/ensure-npc/:characterId', validateUUIDParam('characterId'), tutorialController.ensureNPCOnSubmap);

// Tutorial config
router.get('/config/:characterId', validateUUIDParam('characterId'), tutorialController.getConfig);

module.exports = router;

