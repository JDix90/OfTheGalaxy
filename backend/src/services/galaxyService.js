/**
 * Galaxy Service
 * Business logic for galaxy map, planets, and travel
 */

const { StarSystem, Planet, TravelRoute, PlayerCharacter } = require('../models');

class GalaxyService {
  /**
   * Get all star systems with their planets
   */
  async getAllSystems() {
    const systems = await StarSystem.findAll({
      include: [{
        model: Planet,
        as: 'planets',
        required: false
      }],
      order: [['name', 'ASC']]
    });

    return systems;
  }

  /**
   * Get a single star system by ID
   */
  async getSystemById(systemId) {
    const system = await StarSystem.findByPk(systemId, {
      include: [{
        model: Planet,
        as: 'planets',
        required: false
      }, {
        model: TravelRoute,
        as: 'outgoingRoutes',
        include: [{
          model: StarSystem,
          as: 'toSystem',
          attributes: ['id', 'name', 'coordinates']
        }]
      }]
    });

    if (!system) {
      throw new Error('Star system not found');
    }

    return system;
  }

  /**
   * Get all planets
   */
  async getAllPlanets() {
    const planets = await Planet.findAll({
      include: [{
        model: StarSystem,
        as: 'system',
        attributes: ['id', 'name', 'region', 'coordinates']
      }],
      order: [['name', 'ASC']]
    });

    return planets;
  }

  /**
   * Get planets by system
   */
  async getPlanetsBySystem(systemId) {
    const planets = await Planet.findAll({
      where: { systemId },
      include: [{
        model: StarSystem,
        as: 'system',
        attributes: ['id', 'name', 'region']
      }],
      order: [['name', 'ASC']]
    });

    return planets;
  }

  /**
   * Get a single planet by ID
   */
  async getPlanetById(planetId) {
    const planet = await Planet.findByPk(planetId, {
      include: [{
        model: StarSystem,
        as: 'system',
        include: [{
          model: TravelRoute,
          as: 'outgoingRoutes',
          include: [{
            model: StarSystem,
            as: 'toSystem',
            attributes: ['id', 'name', 'coordinates']
          }]
        }]
      }]
    });

    if (!planet) {
      throw new Error('Planet not found');
    }

    return planet;
  }

  /**
   * Get all travel routes
   */
  async getAllRoutes() {
    const routes = await TravelRoute.findAll({
      where: { isActive: true },
      include: [
        {
          model: StarSystem,
          as: 'fromSystem',
          attributes: ['id', 'name', 'coordinates']
        },
        {
          model: StarSystem,
          as: 'toSystem',
          attributes: ['id', 'name', 'coordinates']
        }
      ]
    });

    return routes;
  }

  /**
   * Get travel routes from a specific system
   */
  async getRoutesFromSystem(systemId) {
    const routes = await TravelRoute.findAll({
      where: {
        fromSystemId: systemId,
        isActive: true
      },
      include: [{
        model: StarSystem,
        as: 'toSystem',
        attributes: ['id', 'name', 'coordinates', 'region', 'dangerLevel']
      }],
      order: [['travelTime', 'ASC']]
    });

    return routes;
  }

  /**
   * Get travel routes to a specific system
   */
  async getRoutesToSystem(systemId) {
    const routes = await TravelRoute.findAll({
      where: {
        toSystemId: systemId,
        isActive: true
      },
      include: [{
        model: StarSystem,
        as: 'fromSystem',
        attributes: ['id', 'name', 'coordinates', 'region']
      }]
    });

    return routes;
  }

  /**
   * Find path between two systems (simple BFS)
   */
  async findPath(fromSystemId, toSystemId) {
    try {
      if (!fromSystemId || !toSystemId) {
        throw new Error('fromSystemId and toSystemId are required');
      }

      if (fromSystemId === toSystemId) {
        return { path: [fromSystemId], distance: 0, cost: 0, time: 0 };
      }

      // Get all active routes
      const allRoutes = await TravelRoute.findAll({
        where: { isActive: true },
        attributes: ['fromSystemId', 'toSystemId', 'travelTime', 'cost']
      });

      if (!allRoutes || allRoutes.length === 0) {
        throw new Error('No active travel routes found in the galaxy');
      }

      // Build adjacency list
      const graph = {};
      for (const route of allRoutes) {
        if (!route.fromSystemId || !route.toSystemId) {
          console.warn('[Galaxy Service] Skipping invalid route:', route);
          continue;
        }
        if (!graph[route.fromSystemId]) {
          graph[route.fromSystemId] = [];
        }
        graph[route.fromSystemId].push({
          to: route.toSystemId,
          time: route.travelTime || 0,
          cost: route.cost || 0
        });
      }

      // Check if source system has any routes
      if (!graph[fromSystemId] || graph[fromSystemId].length === 0) {
        throw new Error(`No outgoing routes from system ${fromSystemId}`);
      }

      // BFS to find shortest path
      const queue = [{ system: fromSystemId, path: [fromSystemId], time: 0, cost: 0 }];
      const visited = new Set();
      const maxDepth = 20; // Increased max depth to allow longer paths

      while (queue.length > 0) {
        const current = queue.shift();

        // Check depth limit based on path length, not iterations
        if (current.path.length > maxDepth) {
          continue; // Skip paths that are too long
        }

        if (current.system === toSystemId) {
          return {
            path: current.path,
            distance: current.path.length - 1,
            time: current.time,
            cost: current.cost
          };
        }

        if (visited.has(current.system)) continue;
        visited.add(current.system);

        const neighbors = graph[current.system] || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor.to)) {
            queue.push({
              system: neighbor.to,
              path: [...current.path, neighbor.to],
              time: current.time + (neighbor.time || 0),
              cost: current.cost + (neighbor.cost || 0)
            });
          }
        }
      }

      throw new Error(`No path found between system ${fromSystemId} and ${toSystemId} (searched ${visited.size} systems)`);
    } catch (error) {
      console.error(`[Galaxy Service] Error finding path from ${fromSystemId} to ${toSystemId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate travel cost between two planets
   */
  async calculateTravelCost(fromPlanetId, toPlanetId) {
    try {
      if (!fromPlanetId || !toPlanetId) {
        throw new Error('fromPlanetId and toPlanetId are required');
      }

      const fromPlanet = await Planet.findByPk(fromPlanetId, {
        include: [{ model: StarSystem, as: 'system' }]
      });
      const toPlanet = await Planet.findByPk(toPlanetId, {
        include: [{ model: StarSystem, as: 'system' }]
      });

      if (!fromPlanet) {
        throw new Error(`Source planet not found: ${fromPlanetId}`);
      }
      if (!toPlanet) {
        throw new Error(`Destination planet not found: ${toPlanetId}`);
      }

      // Same planet - no cost
      if (fromPlanetId === toPlanetId) {
        return { cost: 0, time: 0, path: [] };
      }

      // Same system - minimal cost (local travel)
      if (fromPlanet.systemId === toPlanet.systemId) {
        return { cost: 10, time: 0, path: [fromPlanet.systemId] };
      }

      // Check if planets have valid system IDs
      if (!fromPlanet.systemId) {
        throw new Error(`Source planet ${fromPlanetId} (${fromPlanet.name}) is missing system information`);
      }
      if (!toPlanet.systemId) {
        throw new Error(`Destination planet ${toPlanetId} (${toPlanet.name}) is missing system information`);
      }

      // Different systems - calculate route cost
      try {
        const path = await this.findPath(fromPlanet.systemId, toPlanet.systemId);
        if (!path) {
          throw new Error('Path calculation returned null');
        }
        return {
          cost: path.cost || 0,
          time: path.time || 0,
          path: path.path || []
        };
      } catch (pathError) {
        console.error(`[Galaxy Service] Path finding error from ${fromPlanet.systemId} to ${toPlanet.systemId}:`, pathError);
        throw new Error(`No travel route found between ${fromPlanet.name} and ${toPlanet.name}: ${pathError.message}`);
      }
    } catch (error) {
      console.error(`[Galaxy Service] Error calculating travel cost from ${fromPlanetId} to ${toPlanetId}:`, error);
      throw error;
    }
  }

  /**
   * Travel to a planet (update character location)
   */
  async travelToPlanet(characterId, planetId, landingZone = null) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    const planet = await Planet.findByPk(planetId, {
      include: [{
        model: StarSystem,
        as: 'system'
      }]
    });

    if (!planet) {
      throw new Error('Planet not found');
    }

    // Calculate travel cost
    const currentPlanetId = character.currentPlanet;
    let travelCost = 0;
    let travelTime = 0;
    let travelPath = [];

    if (currentPlanetId && currentPlanetId !== planetId) {
      try {
        const costInfo = await this.calculateTravelCost(currentPlanetId, planetId);
        travelCost = costInfo.cost;
        travelTime = costInfo.time;
        travelPath = costInfo.path;
      } catch (error) {
        throw new Error(`Cannot calculate travel cost: ${error.message}`);
      }

      // Check if character has enough credits
      if (character.credits < travelCost) {
        throw new Error(`Insufficient credits. Required: ${travelCost}, Available: ${character.credits}`);
      }

      // Deduct credits
      character.credits -= travelCost;
    }

    // Determine landing zone
    let location = { x: 0, y: 0, area: 'landing_zone' };
    if (landingZone && planet.landingZones && planet.landingZones.length > 0) {
      const zone = planet.landingZones.find(z => z.id === landingZone);
      if (zone) {
        location = {
          x: zone.x || 0,
          y: zone.y || 0,
          area: zone.area || 'landing_zone'
        };
      }
    } else if (planet.landingZones && planet.landingZones.length > 0) {
      const defaultZone = planet.landingZones[0];
      location = {
        x: defaultZone.x || 0,
        y: defaultZone.y || 0,
        area: defaultZone.area || 'landing_zone'
      };
    }

    // Update character location
    character.currentPlanet = planetId;
    character.currentLocation = location;
    await character.save();
    
    // Track quest objectives for travel type
    try {
      await this.trackTravelObjectives(characterId, planetId, location.area);
    } catch (error) {
      console.warn('[Galaxy Service] Failed to track travel objectives:', error);
      // Don't fail travel if quest tracking fails
    }

    return {
      character,
      planet,
      location,
      travelCost,
      travelTime,
      travelPath
    };
  }

  /**
   * Get galaxy map data (systems, planets, routes) for visualization
   */
  async getGalaxyMapData() {
    const [systems, routes] = await Promise.all([
      this.getAllSystems(),
      this.getAllRoutes()
    ]);

    return {
      systems: systems.map(system => ({
        id: system.id,
        name: system.name,
        region: system.region,
        coordinates: system.coordinates,
        factionControl: system.factionControl,
        dangerLevel: system.dangerLevel,
        planets: system.planets?.map(p => ({
          id: p.id,
          name: p.name,
          planetType: p.planetType,
          climate: p.climate,
          factionControl: p.factionControl,
          dangerLevel: p.dangerLevel
        })) || []
      })),
      routes: routes.map(route => ({
        id: route.id,
        from: {
          id: route.fromSystem.id,
          name: route.fromSystem.name,
          coordinates: route.fromSystem.coordinates
        },
        to: {
          id: route.toSystem.id,
          name: route.toSystem.name,
          coordinates: route.toSystem.coordinates
        },
        travelTime: route.travelTime,
        cost: route.cost,
        routeType: route.routeType
      }))
    };
  }

  /**
   * Track travel objectives when player travels to locations
   * @param {string} characterId - Character ID
   * @param {string} planetId - Planet ID traveled to
   * @param {string} area - Area traveled to
   */
  async trackTravelObjectives(characterId, planetId, area = null) {
    const { QuestProgress, Quest } = require('../models');
    const questService = require('./questService');
    
    // Get all active quests for this character
    const activeQuests = await QuestProgress.findAll({
      where: {
        characterId,
        status: 'active'
      }
    });
    
    // Check each active quest for travel objectives
    for (const questProgress of activeQuests) {
      const quest = await Quest.findByPk(questProgress.questId);
      if (!quest || !quest.objectives) continue;
      
      for (const objective of quest.objectives) {
        // Skip if already completed
        if (questProgress.isObjectiveComplete(objective.id)) {
          continue;
        }
        
        // Check if this is a travel objective
        if (objective.type === 'travel') {
          const objectiveLocation = objective.location || {};
          const objectivePlanet = objectiveLocation.planet;
          const objectiveArea = objectiveLocation.area;
          const objectiveTarget = objective.target; // POI ID
          
          // Match by planet and area
          if (objectivePlanet === planetId && 
              (!objectiveArea || objectiveArea === area)) {
            await questService.updateObjective(
              characterId,
              quest.id,
              objective.id,
              true,
              { planetId, area, traveledAt: new Date().toISOString() }
            );
            console.log(`[Quest] Travel objective ${objective.id} completed (planet: ${planetId}, area: ${area})`);
          }
          // Match by target POI (if POI is on this planet)
          else if (objectiveTarget) {
            // Check if target POI is on this planet
            // This would require checking POI data, but for now we'll mark it if planet matches
            // In a full implementation, we'd check the POI's planet
            if (objectivePlanet === planetId) {
              await questService.updateObjective(
                characterId,
                quest.id,
                objective.id,
                true,
                { planetId, target: objectiveTarget, traveledAt: new Date().toISOString() }
              );
              console.log(`[Quest] Travel objective ${objective.id} completed (target: ${objectiveTarget})`);
            }
          }
        }
      }
    }
  }
}

module.exports = new GalaxyService();

