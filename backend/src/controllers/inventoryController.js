/**
 * Inventory Controller
 * Handles HTTP requests for inventory management
 */

const inventoryService = require('../services/inventoryService');

class InventoryController {
  /**
   * Get inventory for a character
   * GET /api/inventory/:characterId?rarity=rare
   */
  async getInventory(req, res, next) {
    try {
      const { characterId } = req.params;
      const { rarity } = req.query;
      const userId = req.user.id;

      // Verify character belongs to user
      const { PlayerCharacter } = require('../models');
      const character = await PlayerCharacter.findByPk(characterId);
      
      if (!character) {
        return res.status(404).json({
          success: false,
          message: 'Character not found'
        });
      }

      if (character.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Get inventory with enriched item data and optional rarity filter
      const inventory = await inventoryService.getInventoryWithItemData(characterId, rarity || null);
      
      res.json({
        success: true,
        data: inventory
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add item to inventory
   * POST /api/inventory/:characterId/items
   */
  async addItem(req, res, next) {
    try {
      const { characterId } = req.params;
      const { itemId, quantity = 1, acquiredFrom } = req.body;
      const userId = req.user.id;

      // Verify character belongs to user
      const { PlayerCharacter } = require('../models');
      const character = await PlayerCharacter.findByPk(characterId);
      
      if (!character) {
        return res.status(404).json({
          success: false,
          message: 'Character not found'
        });
      }

      if (character.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      if (!itemId) {
        return res.status(400).json({
          success: false,
          message: 'itemId is required'
        });
      }

      const item = await inventoryService.addItem(characterId, itemId, quantity, acquiredFrom);
      
      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove item from inventory
   * DELETE /api/inventory/:characterId/items/:itemId
   */
  async removeItem(req, res, next) {
    try {
      const { characterId, itemId } = req.params;
      const { quantity = 1 } = req.body;
      const userId = req.user.id;

      // Verify character belongs to user
      const { PlayerCharacter } = require('../models');
      const character = await PlayerCharacter.findByPk(characterId);
      
      if (!character) {
        return res.status(404).json({
          success: false,
          message: 'Character not found'
        });
      }

      if (character.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const item = await inventoryService.removeItem(characterId, itemId, quantity);
      
      res.json({
        success: true,
        data: item,
        message: 'Item removed'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Equip an item
   * PUT /api/inventory/:characterId/equip/:itemId
   */
  async equipItem(req, res, next) {
    try {
      const { characterId, itemId } = req.params;
      const { slot } = req.body;
      const userId = req.user.id;

      // Verify character belongs to user
      const { PlayerCharacter } = require('../models');
      const character = await PlayerCharacter.findByPk(characterId);
      
      if (!character) {
        return res.status(404).json({
          success: false,
          message: 'Character not found'
        });
      }

      if (character.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      if (!slot) {
        return res.status(400).json({
          success: false,
          message: 'slot is required'
        });
      }

      // Check if item can be equipped (faction requirements)
      const canEquip = await inventoryService.canEquipItem(characterId, itemId);
      if (!canEquip.canEquip) {
        return res.status(403).json({
          success: false,
          message: canEquip.reason || 'Cannot equip item'
        });
      }

      const item = await inventoryService.equipItem(characterId, itemId, slot);
      
      res.json({
        success: true,
        data: item,
        message: 'Item equipped'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Use a consumable item
   * POST /api/inventory/:characterId/use/:itemId
   */
  async useItem(req, res, next) {
    try {
      const { characterId, itemId } = req.params;
      const userId = req.user.id;

      // Verify character belongs to user
      const { PlayerCharacter } = require('../models');
      const character = await PlayerCharacter.findByPk(characterId);
      
      if (!character) {
        return res.status(404).json({
          success: false,
          message: 'Character not found'
        });
      }

      if (character.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const result = await inventoryService.useItem(characterId, itemId);
      
      res.json({
        success: true,
        data: result,
        message: `Used ${result.itemName}`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unequip an item
   * PUT /api/inventory/:characterId/unequip/:itemId
   */
  async unequipItem(req, res, next) {
    try {
      const { characterId, itemId } = req.params;
      const userId = req.user.id;

      // Verify character belongs to user
      const { PlayerCharacter } = require('../models');
      const character = await PlayerCharacter.findByPk(characterId);
      
      if (!character) {
        return res.status(404).json({
          success: false,
          message: 'Character not found'
        });
      }

      if (character.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const item = await inventoryService.unequipItem(characterId, itemId);
      
      res.json({
        success: true,
        data: item,
        message: 'Item unequipped'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get equipped items
   * GET /api/inventory/:characterId/equipped
   */
  async getEquipped(req, res, next) {
    try {
      const { characterId } = req.params;
      const userId = req.user.id;

      // Verify character belongs to user
      const { PlayerCharacter } = require('../models');
      const character = await PlayerCharacter.findByPk(characterId);
      
      if (!character) {
        return res.status(404).json({
          success: false,
          message: 'Character not found'
        });
      }

      if (character.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const equipped = await inventoryService.getEquipped(characterId);
      
      res.json({
        success: true,
        data: equipped
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if item can be equipped
   * GET /api/inventory/:characterId/can-equip/:itemId
   */
  async canEquipItem(req, res, next) {
    try {
      const { characterId, itemId } = req.params;
      const userId = req.user.id;

      // Verify character belongs to user
      const { PlayerCharacter } = require('../models');
      const character = await PlayerCharacter.findByPk(characterId);
      
      if (!character) {
        return res.status(404).json({
          success: false,
          message: 'Character not found'
        });
      }

      if (character.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const result = await inventoryService.canEquipItem(characterId, itemId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get items by rarity
   * GET /api/inventory/:characterId/rarity/:rarity
   */
  async getItemsByRarity(req, res, next) {
    try {
      const { characterId, rarity } = req.params;
      const userId = req.user.id;

      // Verify character belongs to user
      const { PlayerCharacter } = require('../models');
      const character = await PlayerCharacter.findByPk(characterId);
      
      if (!character) {
        return res.status(404).json({
          success: false,
          message: 'Character not found'
        });
      }

      if (character.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Validate rarity
      const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
      if (!validRarities.includes(rarity)) {
        return res.status(400).json({
          success: false,
          message: `Invalid rarity. Must be one of: ${validRarities.join(', ')}`
        });
      }

      const items = await inventoryService.getItemsByRarity(characterId, rarity);
      
      res.json({
        success: true,
        data: items
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InventoryController();


