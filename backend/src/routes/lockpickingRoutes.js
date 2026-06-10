/**
 * Lockpicking Routes
 * API routes for lockpicking operations
 */

const express = require('express');
const router = express.Router();
const lockpickingController = require('../controllers/lockpickingController');
const { authenticate } = require('../middleware/auth');

// Attempt to pick a lock
router.post('/attempt', authenticate, lockpickingController.attemptPickLock.bind(lockpickingController));

// Get lockpicking success chance preview
router.get('/chance/:characterId', authenticate, lockpickingController.getLockpickChance.bind(lockpickingController));

module.exports = router;

