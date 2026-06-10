/**
 * Quest Routes
 * API routes for quest management
 */

const express = require('express');
const router = express.Router();
const questController = require('../controllers/questController');
const { authenticate } = require('../middleware/auth');
const { ensureCharacterOwnership, ensureCharacterOwnershipOptional } = require('../middleware/ownership');

// All routes require authentication
router.use(authenticate);

// Resolve characterId from the param or body depending on the route shape
const ownsCharacter = ensureCharacterOwnership(); // params.characterId || body.characterId || query.characterId

// Quest queries (all expose a specific character's quest state -> must own it)
router.get('/available/:characterId', ownsCharacter, questController.getAvailable);
router.get('/active/:characterId', ownsCharacter, questController.getActive);
router.get('/completed/:characterId', ownsCharacter, questController.getCompleted);
router.get('/faction/:factionId', questController.getByFaction);
router.get('/npc/:npcId/:characterId', ownsCharacter, questController.getByNPC);
// Quest definition lookup: characterId is an optional query param for customization
router.get('/:id', ensureCharacterOwnershipOptional(), questController.getById);

// Mini-quest specific routes
router.get('/mini/available/:characterId', ownsCharacter, questController.getAvailableMiniQuests);
router.get('/mini/active/:characterId', ownsCharacter, questController.getActiveMiniQuests);

// Quest chain routes
router.get('/chains/:chainId', questController.getQuestChain);
router.get('/chains/:chainId/next/:characterId', ownsCharacter, questController.getNextInChain);
router.get('/chains/:chainId/progress/:characterId', ownsCharacter, questController.getChainProgress);
router.post('/chains/:chainId/validate', questController.validateChain);

// Quest actions (characterId in body -> must own it)
router.post('/start', ownsCharacter, questController.start);
router.put('/objective', ownsCharacter, questController.updateObjective);
router.post('/complete', ownsCharacter, questController.complete);
router.post('/abandon', ownsCharacter, questController.abandon);

module.exports = router;
