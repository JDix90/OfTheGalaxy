/**
 * NPC Routes
 * API routes for NPC interactions
 */

const express = require('express');
const router = express.Router();
const npcController = require('../controllers/npcController');
const { authenticate } = require('../middleware/auth');
const { ensureCharacterOwnership } = require('../middleware/ownership');
const { dialogueLimiter } = require('../middleware/rateLimiter');

// All routes require authentication
router.use(authenticate);

// Player must own the character they speak as (characterId in body)
const ownsCharacter = ensureCharacterOwnership();

// NPC queries
router.get('/', npcController.getAll); // Must be before /:id route
router.get('/companions', npcController.getCompanions);
router.get('/vendors', npcController.getVendors);
router.get('/location/:planet', npcController.getByLocation);
router.get('/faction/:factionId', npcController.getByFaction);
router.get('/recruited/:characterId', npcController.getRecruited);
router.get('/submap/:subMapId', npcController.getBySubMap);
router.get('/:id', npcController.getById);

// NPC generation
router.post('/generate/planet/:planetId', npcController.generateForPlanet);
router.post('/generate/submap/:subMapId', npcController.generateForSubMap);

// NPC interactions (AI-backed -> rate limited + ownership checked)
router.post('/:id/dialogue', dialogueLimiter, ownsCharacter, npcController.dialogue);
router.post('/:id/suggested-responses', dialogueLimiter, ownsCharacter, npcController.getSuggestedResponses);
router.post('/:id/recruit', npcController.recruit);
router.post('/:id/dismiss', npcController.dismiss);

// Conversation history endpoints (must be before /:id route to avoid conflicts)
router.get('/:id/conversation-history', npcController.getConversationHistory);
router.get('/:id/conversation-topics', npcController.getConversationTopics);
router.get('/:id/conversation-context', npcController.getConversationContext);

// Escort quest routes
router.get('/escort/active/:characterId', npcController.getActiveEscortQuest);
router.get('/escort/marker/:characterId', npcController.getEscortQuestMarker);

module.exports = router;
