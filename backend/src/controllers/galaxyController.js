/**
 * Galaxy Controller
 * HTTP request handlers for galaxy map endpoints
 */

const galaxyService = require('../services/galaxyService');
const { PlayerCharacter } = require('../models');

/**
 * Resolve POI overlaps by adjusting positions
 * POI sprites are 128px (144px when hovered), which is ~13% of map width
 * We need at least 15% separation to prevent visual overlap
 */
function resolvePOIOverlaps(pois) {
  if (!pois || pois.length === 0) return pois;
  
  // Filter out POIs without valid coordinates
  const validPOIs = pois.filter(poi => {
    const hasValidCoords = typeof poi.x === 'number' && typeof poi.y === 'number' && 
                           !isNaN(poi.x) && !isNaN(poi.y) &&
                           poi.x >= 0 && poi.x <= 100 &&
                           poi.y >= 0 && poi.y <= 100;
    if (!hasValidCoords) {
      console.warn(`[POI Overlap] Skipping POI ${poi.name || poi.id} with invalid coordinates: x=${poi.x}, y=${poi.y}`);
    }
    return hasValidCoords;
  });
  
  if (validPOIs.length === 0) return pois; // Return original if none are valid
  
  // POI priority order (higher priority POIs keep their positions)
  const priorityOrder = {
    'spaceport': 10,
    'city': 9,
    'capital': 9,
    'medical_center': 8,
    'government': 7,
    'temple': 7,
    'base': 6,
    'fortress': 6,
    'market': 5,
    'cantina': 4,
    'entertainment': 4,
    'industrial': 3,
    'settlement': 3,
    'village': 3,
    'wilderness': 2,
    'landscape': 2,
    'province': 2,
    'danger': 1,
    'unknown': 0
  };
  
  const getPriority = (poi) => {
    return priorityOrder[poi.type] || priorityOrder['unknown'];
  };
  
  // Sort POIs by priority (highest first) - these will keep their positions
  const sortedPOIs = [...validPOIs].sort((a, b) => getPriority(b) - getPriority(a));
  
  // Minimum distance between POIs (15% of map to prevent sprite overlap)
  const minDistance = 15;
  
  const resolved = [];
  const occupiedPositions = [];
  
  for (const poi of sortedPOIs) {
    // Skip if POI is null/undefined
    if (!poi) continue;
    
    // Ensure coordinates are valid numbers
    let finalX = typeof poi.x === 'number' && !isNaN(poi.x) ? poi.x : 50;
    let finalY = typeof poi.y === 'number' && !isNaN(poi.y) ? poi.y : 50;
    
    // Clamp to valid range
    finalX = Math.max(0, Math.min(100, finalX));
    finalY = Math.max(0, Math.min(100, finalY));
    
    // Check for overlaps with already placed POIs
    const hasOverlap = occupiedPositions.some(occupied => {
      if (!occupied || typeof occupied.x !== 'number' || typeof occupied.y !== 'number') {
        return false;
      }
      const dx = occupied.x - finalX;
      const dy = occupied.y - finalY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < minDistance;
    });
    
    if (hasOverlap) {
      // Find a new position that doesn't overlap
      let foundPosition = false;
      
      // Try positions in a spiral pattern around the original location
      const spiralOffsets = [
        { x: 0, y: -minDistance },      // North
        { x: minDistance, y: 0 },       // East
        { x: 0, y: minDistance },        // South
        { x: -minDistance, y: 0 },      // West
        { x: minDistance * 0.7, y: -minDistance * 0.7 },  // NE
        { x: minDistance * 0.7, y: minDistance * 0.7 },   // SE
        { x: -minDistance * 0.7, y: minDistance * 0.7 },  // SW
        { x: -minDistance * 0.7, y: -minDistance * 0.7 }, // NW
        { x: 0, y: -minDistance * 1.5 }, // Further North
        { x: minDistance * 1.5, y: 0 },  // Further East
        { x: 0, y: minDistance * 1.5 },  // Further South
        { x: -minDistance * 1.5, y: 0 }  // Further West
      ];
      
      for (const offset of spiralOffsets) {
        const testX = Math.max(5, Math.min(95, poi.x + offset.x));
        const testY = Math.max(5, Math.min(95, poi.y + offset.y));
        
        const stillOverlaps = occupiedPositions.some(occupied => {
          const dx = occupied.x - testX;
          const dy = occupied.y - testY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance < minDistance;
        });
        
        if (!stillOverlaps) {
          finalX = testX;
          finalY = testY;
          foundPosition = true;
          break;
        }
      }
      
      // If still no position found, use a random offset
      if (!foundPosition) {
        const angle = Math.random() * Math.PI * 2;
        const radius = minDistance + (Math.random() * minDistance);
        finalX = Math.max(5, Math.min(95, poi.x + Math.cos(angle) * radius));
        finalY = Math.max(5, Math.min(95, poi.y + Math.sin(angle) * radius));
      }
    }
    
    // Add resolved POI with adjusted position (don't include internal flags)
    const resolvedPOI = { ...poi };
    resolvedPOI.x = finalX;
    resolvedPOI.y = finalY;
    resolved.push(resolvedPOI);
    
    // Mark this position as occupied
    occupiedPositions.push({ x: finalX, y: finalY });
  }
  
  return resolved;
}

class GalaxyController {
  /**
   * Get galaxy map data
   * GET /api/galaxy/map
   */
  async getGalaxyMap(req, res, next) {
    try {
      const mapData = await galaxyService.getGalaxyMapData();
      res.json({
        success: true,
        data: mapData
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all star systems
   * GET /api/galaxy/systems
   */
  async getAllSystems(req, res, next) {
    try {
      const systems = await galaxyService.getAllSystems();
      res.json({
        success: true,
        data: systems
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single star system
   * GET /api/galaxy/systems/:id
   */
  async getSystemById(req, res, next) {
    try {
      const { id } = req.params;
      const system = await galaxyService.getSystemById(id);
      res.json({
        success: true,
        data: system
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all planets
   * GET /api/galaxy/planets
   */
  async getAllPlanets(req, res, next) {
    try {
      const planets = await galaxyService.getAllPlanets();
      res.json({
        success: true,
        data: planets
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get planets by system
   * GET /api/galaxy/systems/:systemId/planets
   */
  async getPlanetsBySystem(req, res, next) {
    try {
      const { systemId } = req.params;
      const planets = await galaxyService.getPlanetsBySystem(systemId);
      res.json({
        success: true,
        data: planets
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single planet
   * GET /api/galaxy/planets/:id
   */
  async getPlanetById(req, res, next) {
    try {
      const { id } = req.params;
      const planet = await galaxyService.getPlanetById(id);
      
      // Reload planet to get latest POIs from database
      if (planet) {
        await planet.reload();
      }
      
      // Add map data to planet response
      if (planet) {
        const { getPlanetMapData } = require('../data/planetMaps');
        const mapData = getPlanetMapData(planet);
        
        // Convert planet to plain object to ensure mapData is included
        const planetData = planet.toJSON ? planet.toJSON() : planet;
        planetData.mapData = mapData;
        
        // Load Nav-Mesh if available
        const { loadNavMesh } = require('../utils/navMeshLoader');
        const navMesh = loadNavMesh(id);
        if (navMesh) {
          planetData.navMesh = navMesh;
          console.log(`[Planet API] ${id}: Loaded Nav-Mesh with ${navMesh.polygons?.length || 0} polygons`);
        }

        // Generate tile map for all planets (classic RPG-style navigation)
        // Check if tile map is cached in database first
        if (planet.tileMap && planet.tileMap.tiles) {
          // Use cached tile map
          planetData.mapData.tileMap = planet.tileMap;
          console.log(`[Planet API] ${id}: Using cached tile map (${planet.tileMap.gridSize}x${planet.tileMap.gridSize} grid)`);
        } else {
          // Generate new tile map based on planet type
          const { generateTileMapByPlanetType } = require('../utils/tileMapGenerator');
          try {
            const tileMap = generateTileMapByPlanetType(planet, mapData);
            planetData.mapData.tileMap = tileMap;
            
            // Cache tile map in database (async, don't wait)
            planet.update({ tileMap: tileMap }).catch(err => {
              console.warn(`[Planet API] ${id}: Failed to cache tile map:`, err.message);
            });
            
            console.log(`[Planet API] ${id}: Generated tile map (${tileMap.gridSize}x${tileMap.gridSize} grid) for ${planet.planetType || planet.type}`);
          } catch (error) {
            console.warn(`[Planet API] ${id}: Failed to generate tile map:`, error.message);
          }
        }
        
        // Merge database POIs with map data POIs (database POIs take priority)
        // Get POIs directly from the planet model (after reload) to ensure we have the latest
        const databasePOIs = (planet.pointsOfInterest && Array.isArray(planet.pointsOfInterest)) 
          ? planet.pointsOfInterest 
          : (planetData.pointsOfInterest || []);
        const mapDataPOIs = mapData.pointsOfInterest || [];
        
        // Debug: Log what we're getting
        console.log(`[Planet API] ${planetData.id}: Database POIs: ${databasePOIs.length}, Map data POIs: ${mapDataPOIs.length}`);
        if (databasePOIs.length > 0) {
          console.log(`[Planet API] ${planetData.id}: Database POI IDs:`, databasePOIs.map(p => p.id || p.name).join(', '));
        }
        
        // Create a map of POI IDs from database to avoid duplicates
        const databasePOIIds = new Set(databasePOIs.map(poi => poi.id || poi.name));
        
        // Start with database POIs
        const mergedPOIs = [...databasePOIs];
        
        // Add map data POIs that don't exist in database
        mapDataPOIs.forEach(mapPOI => {
          const mapPOIId = mapPOI.id || mapPOI.name;
          if (!databasePOIIds.has(mapPOIId)) {
            mergedPOIs.push(mapPOI);
          }
        });
        
        // Resolve POI overlaps to prevent visual conflicts
        let resolvedPOIs = mergedPOIs;
        try {
          resolvedPOIs = resolvePOIOverlaps(mergedPOIs);
        } catch (error) {
          console.error(`[Planet API] Error resolving POI overlaps for ${planetData.id}:`, error);
          // Continue with unresolved POIs if overlap resolution fails
          resolvedPOIs = mergedPOIs;
        }
        
        // Update both planetData and mapData with resolved POIs
        planetData.pointsOfInterest = resolvedPOIs;
        planetData.mapData.pointsOfInterest = resolvedPOIs;
        
        // Debug logging
        console.log(`[Planet API] ${planetData.id}: Merged ${mergedPOIs.length} POIs (${databasePOIs.length} from DB, ${mapDataPOIs.length} from map data), resolved ${resolvedPOIs.length} after overlap detection`);
        
        res.json({
          success: true,
          data: planetData
        });
      } else {
        res.json({
          success: false,
          message: 'Planet not found'
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Nav-Mesh for a planet
   * GET /api/galaxy/planets/:id/navmesh
   */
  async getPlanetNavMesh(req, res, next) {
    try {
      const { id } = req.params;
      const { loadNavMesh } = require('../utils/navMeshLoader');
      const navMesh = loadNavMesh(id);
      
      if (navMesh) {
        res.json({
          success: true,
          navMesh: navMesh
        });
      } else {
        res.json({
          success: false,
          message: 'Nav-Mesh not found for this planet'
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get travel routes from a system
   * GET /api/galaxy/systems/:systemId/routes
   */
  async getRoutesFromSystem(req, res, next) {
    try {
      const { systemId } = req.params;
      const routes = await galaxyService.getRoutesFromSystem(systemId);
      res.json({
        success: true,
        data: routes
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Find path between two systems
   * GET /api/galaxy/path?from=:fromId&to=:toId
   */
  async findPath(req, res, next) {
    try {
      const { from, to } = req.query;
      
      if (!from || !to) {
        return res.status(400).json({
          success: false,
          error: 'Both "from" and "to" query parameters are required'
        });
      }

      const path = await galaxyService.findPath(from, to);
      res.json({
        success: true,
        data: path
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate travel cost
   * POST /api/galaxy/travel/cost
   */
  async calculateTravelCost(req, res, next) {
    try {
      const { fromPlanetId, toPlanetId } = req.body;

      if (!fromPlanetId || !toPlanetId) {
        return res.status(400).json({
          success: false,
          error: 'fromPlanetId and toPlanetId are required'
        });
      }

      console.log(`[Galaxy Controller] Calculating travel cost from ${fromPlanetId} to ${toPlanetId}`);

      const costInfo = await galaxyService.calculateTravelCost(fromPlanetId, toPlanetId);
      
      res.json({
        success: true,
        data: costInfo
      });
    } catch (error) {
      console.error('[Galaxy Controller] Error calculating travel cost:', error);
      console.error('[Galaxy Controller] Error stack:', error.stack);
      
      // Return appropriate status code based on error type
      const statusCode = error.message?.includes('not found') || error.message?.includes('missing') 
        ? 404 
        : error.message?.includes('No travel route') || error.message?.includes('No path')
        ? 400
        : 500;
      
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Server error. Please try again later.'
      });
    }
  }

  /**
   * Travel to a planet
   * POST /api/galaxy/travel
   */
  async travelToPlanet(req, res, next) {
    try {
      const { characterId, planetId, landingZone } = req.body;

      if (!characterId || !planetId) {
        return res.status(400).json({
          success: false,
          error: 'characterId and planetId are required'
        });
      }

      // Verify character belongs to user (if authenticated)
      const character = await PlayerCharacter.findByPk(characterId);
      if (!character) {
        return res.status(404).json({
          success: false,
          error: 'Character not found'
        });
      }

      // Verify character belongs to authenticated user
      if (req.user && req.user.id !== character.userId) {
        return res.status(403).json({
          success: false,
          error: 'Character does not belong to authenticated user'
        });
      }

      console.log(`[Galaxy Controller] Travel request: character=${characterId}, planet=${planetId}`);

      const result = await galaxyService.travelToPlanet(characterId, planetId, landingZone);
      
      res.json({
        success: true,
        data: {
          character: result.character,
          planet: result.planet,
          location: result.location,
          travelCost: result.travelCost,
          travelTime: result.travelTime,
          travelPath: result.travelPath
        }
      });
    } catch (error) {
      console.error('[Galaxy Controller] Error traveling to planet:', error);
      console.error('[Galaxy Controller] Error stack:', error.stack);
      
      // Handle specific errors
      if (error.message?.includes('Insufficient credits')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      if (error.message?.includes('No travel route') || error.message?.includes('Cannot calculate') || error.message?.includes('not found')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      
      // Generic error
      res.status(500).json({
        success: false,
        error: error.message || 'An error occurred while traveling'
      });
    }
  }
}

module.exports = new GalaxyController();

