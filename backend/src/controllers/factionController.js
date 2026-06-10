/**
 * Faction Controller
 * Handles HTTP requests for faction reputation management
 */

const factionService = require('../services/factionService');
const { getFactionDisplayName } = require('../data/factionList');

class FactionController {
  /**
   * Get all faction reputations for a character
   * GET /api/factions/:characterId
   */
  async getReputations(req, res, next) {
    try {
      const { characterId } = req.params;
      
      const reputations = await factionService.getAllReputations(characterId);
      
      // Get all factions from factionList to show all possible factions
      const { factions } = require('../data/factionList');
      
      // Create a map of existing reputations
      const reputationMap = new Map();
      reputations.forEach(rep => {
        reputationMap.set(rep.factionId, rep);
      });
      
      // Enrich with faction display names
      // Only show factions that have reputation records (even if reputation is 0)
      // This ensures we only show factions the player has actually interacted with
      const enriched = reputations.map(rep => ({
        ...rep.toJSON(),
        factionName: getFactionDisplayName(rep.factionId),
        tierInfo: factionService.getTierInfo(rep.tier)
      }));
      
      res.json({ success: true, data: enriched });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get reputation for a specific faction
   * GET /api/factions/:characterId/:factionId
   */
  async getReputation(req, res, next) {
    try {
      const { characterId, factionId } = req.params;
      
      const reputation = await factionService.getReputation(characterId, factionId);
      
      res.json({
        success: true,
        data: {
          ...reputation,
          factionName: getFactionDisplayName(factionId),
          tierInfo: factionService.getTierInfo(reputation.tier)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update faction reputation
   * POST /api/factions/:characterId/:factionId
   */
  async updateReputation(req, res, next) {
    try {
      const { characterId, factionId } = req.params;
      const { amount } = req.body;
      
      if (typeof amount !== 'number') {
        return res.status(400).json({
          success: false,
          error: 'Amount must be a number'
        });
      }
      
      const reputation = await factionService.updateReputation(characterId, factionId, amount);
      
      res.json({
        success: true,
        data: {
          ...reputation.toJSON(),
          factionName: getFactionDisplayName(factionId),
          tierInfo: factionService.getTierInfo(reputation.tier)
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FactionController();

