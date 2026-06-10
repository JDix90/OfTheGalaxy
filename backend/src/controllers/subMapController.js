/**
 * Sub-Map Controller
 * HTTP request handlers for sub-map endpoints
 */

const subMapService = require('../services/subMapService');
const resourceEncounterService = require('../services/resourceEncounterService');
const dungeonEnemyService = require('../services/dungeonEnemyService');
const buildingInteriorService = require('../services/buildingInteriorService');

class SubMapController {
  /**
   * Get sub-map by ID
   * GET /api/submaps/:id
   */
  async getSubMapById(req, res, next) {
    try {
      const { id } = req.params;
      const subMap = await subMapService.getSubMapById(id);

      if (!subMap) {
        return res.status(404).json({
          success: false,
          error: 'Sub-map not found'
        });
      }

      res.json({
        success: true,
        data: subMap
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get sub-map for a location (creates if doesn't exist)
   * GET /api/submaps/location/:planetId/:parentLocationId/:parentLocationType/:type
   */
  async getSubMapForLocation(req, res, next) {
    try {
      const { planetId, parentLocationId, parentLocationType, type } = req.params;
      
      console.log(`[SubMap Controller] Getting submap for: planet=${planetId}, location=${parentLocationId}, parentType=${parentLocationType}, type=${type}`);
      
      const subMap = await subMapService.getSubMapForLocation(
        planetId,
        decodeURIComponent(parentLocationId),
        parentLocationType,
        type
      );

      res.json({
        success: true,
        data: subMap
      });
    } catch (error) {
      console.error('[SubMap Controller] Error getting submap:', error);
      console.error('[SubMap Controller] Error stack:', error.stack);
      console.error('[SubMap Controller] Error details:', {
        planetId,
        parentLocationId,
        parentLocationType,
        type,
        message: error.message,
        name: error.name
      });
      
      // Return more specific error response
      res.status(500).json({
        success: false,
        error: error.message || 'Server error. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Get all sub-maps for a planet
   * GET /api/submaps/planet/:planetId
   */
  async getSubMapsByPlanet(req, res, next) {
    try {
      const { planetId } = req.params;
      const subMaps = await subMapService.getSubMapsByPlanet(planetId);

      res.json({
        success: true,
        data: subMaps
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all sub-maps for a parent location
   * GET /api/submaps/parent/:planetId/:parentLocationId/:parentLocationType
   */
  async getSubMapsByParent(req, res, next) {
    try {
      const { planetId, parentLocationId, parentLocationType } = req.params;
      const subMaps = await subMapService.getSubMapsByParent(
        planetId,
        parentLocationId,
        parentLocationType
      );

      res.json({
        success: true,
        data: subMaps
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create or update sub-map
   * POST /api/submaps
   */
  async saveSubMap(req, res, next) {
    try {
      const subMapData = req.body;
      const result = await subMapService.saveSubMap(subMapData);

      res.json({
        success: true,
        data: result.subMap,
        created: result.created
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete sub-map
   * DELETE /api/submaps/:id
   */
  async deleteSubMap(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = await subMapService.deleteSubMap(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Sub-map not found'
        });
      }

      res.json({
        success: true,
        message: 'Sub-map deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check for resource encounter in submap
   * POST /api/submaps/:subMapId/check-resource-encounter
   */
  async checkResourceEncounter(req, res, next) {
    try {
      const { subMapId } = req.params;
      const { characterId } = req.body;

      if (!characterId) {
        return res.status(400).json({
          success: false,
          error: 'characterId is required'
        });
      }

      const result = await resourceEncounterService.checkResourceEncounter(characterId, subMapId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dungeon enemies
   * GET /api/submaps/:subMapId/enemies
   */
  async getDungeonEnemies(req, res, next) {
    try {
      const { subMapId } = req.params;
      const enemies = await dungeonEnemyService.getDungeonEnemies(subMapId);

      res.json({
        success: true,
        data: enemies,
        count: enemies.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Spawn dungeon enemies
   * POST /api/submaps/:subMapId/enemies/spawn
   */
  async spawnDungeonEnemies(req, res, next) {
    try {
      const { subMapId } = req.params;
      const { playerLevel } = req.body;

      if (!playerLevel || typeof playerLevel !== 'number') {
        return res.status(400).json({
          success: false,
          error: 'playerLevel is required and must be a number'
        });
      }

      const enemies = await dungeonEnemyService.spawnDungeonEnemies(subMapId, playerLevel);

      res.json({
        success: true,
        data: enemies,
        count: enemies.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update enemy state
   * PUT /api/submaps/:subMapId/enemies/:enemyId
   */
  async updateEnemyState(req, res, next) {
    try {
      const { subMapId, enemyId } = req.params;
      const updates = req.body;

      const enemy = await dungeonEnemyService.updateEnemyState(subMapId, enemyId, updates);

      res.json({
        success: true,
        data: enemy
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle dungeon re-entry (respawn enemies)
   * POST /api/submaps/:subMapId/enemies/respawn
   * Body: { playerLevel: number }
   */
  async respawnDungeonEnemies(req, res, next) {
    try {
      const { subMapId } = req.params;
      const { playerLevel } = req.body;

      if (!playerLevel || typeof playerLevel !== 'number') {
        return res.status(400).json({
          success: false,
          error: 'playerLevel is required and must be a number'
        });
      }

      const enemies = await dungeonEnemyService.handleDungeonReEntry(subMapId, playerLevel);

      res.json({
        success: true,
        data: enemies,
        count: enemies.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark dungeon exit (for respawn tracking)
   * POST /api/submaps/:subMapId/enemies/exit
   */
  async markDungeonExit(req, res, next) {
    try {
      const { subMapId } = req.params;
      console.log(`[SubMap Controller] markDungeonExit called for submap: ${subMapId}`);
      await dungeonEnemyService.markDungeonExit(subMapId);

      // Verify it was saved by fetching fresh data
      const subMapService = require('../services/subMapService');
      const subMap = await subMapService.getSubMapById(subMapId);
      const lastExitTime = subMap?.metadata?.progress?.lastExitTime;
      console.log(`[SubMap Controller] markDungeonExit completed for submap: ${subMapId}`, {
        lastExitTimeSaved: !!lastExitTime,
        lastExitTime
      });

      res.json({
        success: true,
        message: 'Dungeon exit marked',
        data: {
          lastExitTime
        }
      });
    } catch (error) {
      console.error(`[SubMap Controller] Error marking dungeon exit:`, error);
      next(error);
    }
  }

  /**
   * Search a defeated enemy for loot
   * POST /api/submaps/:subMapId/enemies/:enemyId/search
   */
  async searchDefeatedEnemy(req, res, next) {
    try {
      const { subMapId, enemyId } = req.params;
      const { characterId } = req.body;

      if (!characterId) {
        return res.status(400).json({
          success: false,
          error: 'characterId is required'
        });
      }

      const result = await dungeonEnemyService.searchDefeatedEnemy(subMapId, enemyId, characterId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get or create building interior submap
   * POST /api/submaps/building-interior/:planetId/:buildingId
   */
  async getBuildingInterior(req, res, next) {
    try {
      const { planetId, buildingId } = req.params;
      const { buildingData } = req.body; // Building data from parent submap

      if (!planetId || !buildingId) {
        return res.status(400).json({
          success: false,
          error: 'planetId and buildingId are required'
        });
      }

      const interiorSubMap = await buildingInteriorService.getOrCreateBuildingInterior(
        planetId,
        buildingId,
        buildingData || {}
      );

      res.json({
        success: true,
        data: interiorSubMap
      });
    } catch (error) {
      console.error('[SubMap Controller] Error getting building interior:', error);
      next(error);
    }
  }
}

module.exports = new SubMapController();


