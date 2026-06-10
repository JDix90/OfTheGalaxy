/**
 * Save Routes
 * API routes for save/load management
 */

const express = require('express');
const router = express.Router();
const saveController = require('../controllers/saveController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Save operations
router.get('/', saveController.getSaveSlots);
router.post('/:slotNumber', saveController.createSave);
router.get('/:slotNumber/load', saveController.loadSave);
router.post('/:slotNumber/restore', saveController.restoreSave);
router.delete('/:slotNumber', saveController.deleteSave);

module.exports = router;


