/**
 * Discovery Controller
 * Handles HTTP requests for discovery/exploration operations
 */

const discoveryService = require('../services/discoveryService');

class DiscoveryController {
  /**
   * Record a discovery
   * POST /api/discoveries
   */
  async recordDiscovery(req, res, next) {
    try {
      const { characterId } = req.body;
      const { planetId, locationType, locationId, locationName, metadata, awardRewards } = req.body;

      if (!characterId || !planetId || !locationType || !locationId) {
        return res.status(400).json({
          success: false,
          error: 'characterId, planetId, locationType, and locationId are required'
        });
      }

      const result = await discoveryService.recordDiscovery(
        characterId,
        planetId,
        locationType,
        locationId,
        {
          locationName,
          metadata: metadata || {},
          awardRewards: awardRewards !== false // Default to true
        }
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      // Handle unique constraint errors (race conditions) gracefully
      if (error.name === 'SequelizeUniqueConstraintError') {
        // Try to return the existing discovery
        try {
          const { Discovery } = require('../models');
          const existing = await Discovery.findOne({
            where: {
              characterId: req.body.characterId,
              planetId: req.body.planetId,
              locationId: req.body.locationId
            }
          });

          if (existing) {
            return res.json({
              success: true,
              data: {
                discovery: existing,
                isNew: false,
                rewards: null
              }
            });
          }
        } catch (lookupError) {
          // If we can't find it, fall through to next(error)
        }
      }
      next(error);
    }
  }

  /**
   * Get all discoveries for a character
   * GET /api/discoveries/:characterId
   */
  async getDiscoveries(req, res, next) {
    try {
      const { characterId } = req.params;
      const { planetId, locationType, limit, offset } = req.query;

      const filters = {};
      if (planetId) filters.planetId = planetId;
      if (locationType) filters.locationType = locationType;
      if (limit) filters.limit = parseInt(limit);
      if (offset) filters.offset = parseInt(offset);

      const discoveries = await discoveryService.getDiscoveries(characterId, filters);

      res.json({
        success: true,
        data: discoveries
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get discovery statistics
   * GET /api/discoveries/:characterId/stats
   */
  async getStats(req, res, next) {
    try {
      const { characterId } = req.params;

      const stats = await discoveryService.getDiscoveryStats(characterId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get planet completion percentage
   * GET /api/discoveries/:characterId/planet/:planetId/completion
   */
  async getPlanetCompletion(req, res, next) {
    try {
      const { characterId, planetId } = req.params;
      const { totalLocations } = req.query;

      const completion = await discoveryService.getPlanetCompletion(
        characterId,
        planetId,
        totalLocations ? parseInt(totalLocations) : null
      );

      res.json({
        success: true,
        data: {
          planetId,
          completion,
          totalLocations: totalLocations ? parseInt(totalLocations) : null
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if location is discovered
   * GET /api/discoveries/:characterId/check/:planetId/:locationId
   */
  async checkDiscovery(req, res, next) {
    try {
      const { characterId, planetId, locationId } = req.params;

      const isDiscovered = await discoveryService.isDiscovered(characterId, planetId, locationId);

      res.json({
        success: true,
        data: {
          isDiscovered,
          characterId,
          planetId,
          locationId
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get discovered locations for a planet
   * GET /api/discoveries/:characterId/planet/:planetId/locations
   */
  async getPlanetLocations(req, res, next) {
    try {
      const { characterId, planetId } = req.params;

      const locations = await discoveryService.getDiscoveredLocations(characterId, planetId);

      res.json({
        success: true,
        data: locations
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DiscoveryController();

