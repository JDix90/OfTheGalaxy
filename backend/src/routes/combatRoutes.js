/**
 * Combat Routes
 * API routes for combat system
 */

const express = require('express');
const router = express.Router();
const combatController = require('../controllers/combatController');
const { authenticate } = require('../middleware/auth');
const { ensureCharacterOwnership, ensureEncounterOwnership } = require('../middleware/ownership');

// All routes require authentication
router.use(authenticate);

const ownsCharacter = ensureCharacterOwnership(); // params.characterId || body.characterId
const ownsEncounter = ensureEncounterOwnership(); // params.encounterId -> character -> owner

// Check for random encounter (characterId in body)
router.post('/check-encounter', ownsCharacter, combatController.checkEncounter.bind(combatController));

// Start a new combat encounter (characterId in body)
router.post('/start', ownsCharacter, combatController.startEncounter.bind(combatController));

// Get encounter state
router.get('/:encounterId', ownsEncounter, combatController.getEncounter.bind(combatController));

// Process enemy turn (auto-process if it's an enemy's turn)
router.post('/:encounterId/process-turn', ownsEncounter, combatController.processTurn.bind(combatController));

// Execute combat action
router.post('/:encounterId/action', ownsEncounter, combatController.executeAction.bind(combatController));

// Attempt to flee
router.post('/:encounterId/flee', ownsEncounter, combatController.flee.bind(combatController));

// Get active encounter for character (characterId in param)
router.get('/character/:characterId/active', ownsCharacter, combatController.getActiveEncounter.bind(combatController));

module.exports = router;

