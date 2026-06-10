/**
 * Vendor Routes
 * API routes for vendor/trading operations
 */

const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get vendor inventory
router.get('/:npcId', vendorController.getVendorInventory);

// Get price quotes
router.get('/:npcId/buy/:itemId', vendorController.getBuyPrice);
router.get('/:npcId/sell/:itemId', vendorController.getSellPrice);

// Trading operations
router.post('/:npcId/buy', vendorController.buyItem);
router.post('/:npcId/sell', vendorController.sellItem);

module.exports = router;


