/**
 * Vendor Controller
 * Handles HTTP requests for vendor/trading operations
 */

const vendorService = require('../services/vendorService');

class VendorController {
  /**
   * Get vendor inventory
   * GET /api/vendors/:npcId
   */
  async getVendorInventory(req, res, next) {
    try {
      const { npcId } = req.params;
      
      const inventory = await vendorService.getVendorInventory(npcId);
      
      res.json({
        success: true,
        data: inventory
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get buy price quote
   * GET /api/vendors/:npcId/buy/:itemId?quantity=1
   */
  async getBuyPrice(req, res, next) {
    try {
      const { npcId, itemId } = req.params;
      const { characterId } = req.query;
      const quantity = parseInt(req.query.quantity) || 1;
      
      if (!characterId) {
        return res.status(400).json({
          success: false,
          error: 'characterId is required'
        });
      }
      
      const quote = await vendorService.getBuyPrice(characterId, npcId, itemId, quantity);
      
      res.json({
        success: true,
        data: quote
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get sell price quote
   * GET /api/vendors/:npcId/sell/:itemId?quantity=1
   */
  async getSellPrice(req, res, next) {
    try {
      const { npcId, itemId } = req.params;
      const { characterId } = req.query;
      const quantity = parseInt(req.query.quantity) || 1;
      
      if (!characterId) {
        return res.status(400).json({
          success: false,
          error: 'characterId is required'
        });
      }
      
      const quote = await vendorService.getSellPrice(characterId, npcId, itemId, quantity);
      
      res.json({
        success: true,
        data: quote
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Buy item from vendor
   * POST /api/vendors/:npcId/buy
   */
  async buyItem(req, res, next) {
    try {
      const { npcId } = req.params;
      const { characterId, itemId, quantity = 1 } = req.body;
      
      if (!characterId || !itemId) {
        return res.status(400).json({
          success: false,
          error: 'characterId and itemId are required'
        });
      }
      
      const result = await vendorService.buyItem(characterId, npcId, itemId, quantity);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get buyback list (items the character previously sold here)
   * GET /api/vendors/:npcId/buyback?characterId=
   */
  async getBuyback(req, res, next) {
    try {
      const { npcId } = req.params;
      const { characterId } = req.query;

      if (!characterId) {
        return res.status(400).json({
          success: false,
          error: 'characterId is required'
        });
      }

      const buyback = await vendorService.getBuyback(characterId, npcId);

      res.json({
        success: true,
        data: buyback
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Buy back a previously-sold item
   * POST /api/vendors/:npcId/buyback
   */
  async buybackItem(req, res, next) {
    try {
      const { npcId } = req.params;
      const { characterId, itemId, quantity = 1 } = req.body;

      if (!characterId || !itemId) {
        return res.status(400).json({
          success: false,
          error: 'characterId and itemId are required'
        });
      }

      const result = await vendorService.buybackItem(characterId, npcId, itemId, quantity);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sell item to vendor
   * POST /api/vendors/:npcId/sell
   */
  async sellItem(req, res, next) {
    try {
      const { npcId } = req.params;
      const { characterId, itemId, quantity = 1 } = req.body;
      
      if (!characterId || !itemId) {
        return res.status(400).json({
          success: false,
          error: 'characterId and itemId are required'
        });
      }
      
      const result = await vendorService.sellItem(characterId, npcId, itemId, quantity);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VendorController();


