/**
 * Character Routes
 * API routes for character management
 */

const express = require('express');
const router = express.Router();
const characterController = require('../controllers/characterController');
const { authenticate } = require('../middleware/auth');
const { 
  validateCharacterCreation, 
  validateAddXP, 
  validateSkillAllocation,
  validateAttributeAllocation,
  validateLocationUpdate,
  validateUUIDParam
} = require('../middleware/validation');
const { characterCreationLimiter } = require('../middleware/rateLimiter');
const { ensureCharacterOwnership } = require('../middleware/ownership');

// All routes require authentication
router.use(authenticate);

// Ownership guard for any route that targets a specific character by :id
const ownsCharacter = ensureCharacterOwnership(['params.id']);

// Character CRUD
router.post('/', characterCreationLimiter, validateCharacterCreation, characterController.create);
router.get('/', characterController.getAll);
router.get('/:id', ownsCharacter, characterController.getById);
router.delete('/:id', ownsCharacter, characterController.delete);

// Character progression
router.post('/:id/xp', validateUUIDParam('id'), ownsCharacter, validateAddXP, characterController.addXP);
router.post('/:id/skills', validateUUIDParam('id'), ownsCharacter, validateSkillAllocation, characterController.allocateSkill);
router.post('/:id/attributes', validateUUIDParam('id'), ownsCharacter, validateAttributeAllocation, characterController.allocateAttribute);

// Character state
router.put('/:id/location', validateUUIDParam('id'), ownsCharacter, validateLocationUpdate, characterController.updateLocation);
router.put('/:id/vitals', validateUUIDParam('id'), ownsCharacter, characterController.updateVitals);
router.post('/:id/rest', validateUUIDParam('id'), ownsCharacter, characterController.rest);

module.exports = router;
