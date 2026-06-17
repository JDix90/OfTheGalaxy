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

// Buyback (items the character previously sold here)
router.get('/:npcId/buyback', vendorController.getBuyback);

// Trading operations
router.post('/:npcId/buy', vendorController.buyItem);
router.post('/:npcId/sell', vendorController.sellItem);
router.post('/:npcId/buyback', vendorController.buybackItem);

module.exports = router;


