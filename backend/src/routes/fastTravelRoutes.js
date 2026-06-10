/**
 * Fast Travel Routes
 * API routes for fast travel
 */

const express = require('express');
const router = express.Router();
const fastTravelController = require('../controllers/fastTravelController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get available fast travel points
router.get('/:characterId/:planetId', fastTravelController.getPoints.bind(fastTravelController));

// Fast travel to destination
router.post('/travel', fastTravelController.travel.bind(fastTravelController));

module.exports = router;


