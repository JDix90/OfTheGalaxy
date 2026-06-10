/**
 * Inventory Routes
 * API routes for inventory management
 */

const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticate } = require('../middleware/auth');
const { validateUUIDParam } = require('../middleware/validation');

// All routes require authentication
router.use(authenticate);

// Inventory operations (specific routes first)
router.get('/:characterId/equipped', validateUUIDParam('characterId'), inventoryController.getEquipped);
router.get('/:characterId/can-equip/:itemId', validateUUIDParam('characterId'), inventoryController.canEquipItem);
router.get('/:characterId/rarity/:rarity', validateUUIDParam('characterId'), inventoryController.getItemsByRarity);
router.get('/:characterId', validateUUIDParam('characterId'), inventoryController.getInventory);
router.post('/:characterId/items', validateUUIDParam('characterId'), inventoryController.addItem);
router.delete('/:characterId/items/:itemId', validateUUIDParam('characterId'), inventoryController.removeItem);
router.put('/:characterId/equip/:itemId', validateUUIDParam('characterId'), inventoryController.equipItem);
router.put('/:characterId/unequip/:itemId', validateUUIDParam('characterId'), inventoryController.unequipItem);
router.post('/:characterId/use/:itemId', validateUUIDParam('characterId'), inventoryController.useItem);

module.exports = router;


