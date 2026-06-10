/**
 * Building Interior Service
 * Handles generation and access to building interior submaps
 */

const { SubMap, Planet } = require('../models');
const subMapGenerator = require('./subMapGenerator');
const collisionMapService = require('./collisionMapService');

class BuildingInteriorService {
  /**
   * Get or create building interior submap
   * @param {string} planetId - Planet ID
   * @param {string} buildingId - Building ID
   * @param {Object} buildingData - Building data from parent submap
   * @returns {Promise<Object>} Building interior submap
   */
  async getOrCreateBuildingInterior(planetId, buildingId, buildingData) {
    // Generate interior submap ID
    const interiorSubMapId = `${planetId}_${buildingId}_interior`;
    
    // Try to find existing interior
    let interiorSubMap = await SubMap.findByPk(interiorSubMapId, {
      include: [{
        model: Planet,
        as: 'planet',
        attributes: ['id', 'name', 'planetType', 'climate']
      }]
    });

    if (interiorSubMap) {
      // Ensure collision map exists
      const layout = interiorSubMap.layoutData || interiorSubMap.layout || {};
      if (!layout.collisionMap) {
        interiorSubMap.layoutData.collisionMap = collisionMapService.generateCollisionMap(interiorSubMap);
        await SubMap.update(
          { layoutData: interiorSubMap.layoutData },
          { where: { id: interiorSubMapId } }
        );
      }
      return interiorSubMap.toJSON();
    }

    // Generate new interior submap
    const planet = await Planet.findByPk(planetId);
    if (!planet) {
      throw new Error('Planet not found');
    }

    // Generate interior layout based on building type
    const interiorLayout = this.generateBuildingInterior(buildingData, planet);

    // Create interior submap
    interiorSubMap = await SubMap.create({
      id: interiorSubMapId,
      name: `${buildingData.name || 'Building'} Interior`,
      type: 'building_interior',
      template: buildingData.type || 'residential',
      parentLocationId: buildingId,
      parentLocationType: 'building',
      planetId: planetId,
      layoutData: interiorLayout,
      metadata: {
        buildingId: buildingId,
        buildingType: buildingData.type,
        buildingName: buildingData.name
      }
    });

    // Generate collision map for interior
    const layout = interiorSubMap.layoutData || interiorSubMap.layout || {};
    layout.collisionMap = collisionMapService.generateCollisionMap(interiorSubMap);
    await SubMap.update(
      { layoutData: layout },
      { where: { id: interiorSubMapId } }
    );

    // Reload with associations
    interiorSubMap = await SubMap.findByPk(interiorSubMapId, {
      include: [{
        model: Planet,
        as: 'planet',
        attributes: ['id', 'name', 'planetType', 'climate']
      }]
    });

    return interiorSubMap.toJSON();
  }

  /**
   * Generate building interior layout
   * @param {Object} buildingData - Building data from parent submap
   * @param {Object} planet - Planet data
   * @returns {Object} Interior layout
   */
  generateBuildingInterior(buildingData, planet) {
    const buildingType = buildingData.type || 'residential';
    const size = buildingData.size || { width: 2, height: 2 };
    
    // Interior dimensions - 8x8 to 12x12 (smaller than city submaps which are 12-25)
    // Sometimes irregular for variety
    const rnd = Math.random();
    const isIrregular = rnd < 0.3; // 30% chance of irregular shape
    
    let interiorWidth, interiorHeight;
    
    if (isIrregular) {
      // Irregular shape: one dimension larger than the other
      const baseSize = 8 + Math.floor(Math.random() * 5); // 8-12
      const variation = Math.floor(Math.random() * 3) - 1; // -1 to +1
      interiorWidth = Math.max(8, Math.min(12, baseSize + variation));
      interiorHeight = Math.max(8, Math.min(12, baseSize - variation));
    } else {
      // Regular square or slightly rectangular
      const baseSize = 8 + Math.floor(Math.random() * 5); // 8-12
      const slightVariation = Math.floor(Math.random() * 2) - 1; // -1 to +1
      interiorWidth = Math.max(8, Math.min(12, baseSize + slightVariation));
      interiorHeight = Math.max(8, Math.min(12, baseSize - slightVariation));
    }

    // Create zones/rooms based on building type
    const zones = this.generateZones(buildingType, interiorWidth, interiorHeight);
    const rooms = this.generateRooms(buildingType, interiorWidth, interiorHeight);

    const layout = {
      width: interiorWidth,
      height: interiorHeight,
      gridSize: 40,
      zones: zones,
      rooms: rooms,
      buildings: [],
      entryPoints: [
        {
          id: 'exit',
          label: 'Exit',
          position: { x: interiorWidth / 2, y: interiorHeight - 1 },
          type: 'exit',
          exitsTo: {
            subMapId: buildingData.parentSubMapId || null,
            position: buildingData.entrance || { x: 50, y: 50 }
          }
        }
      ],
      exitPoints: [],
      pointsOfInterest: []
    };

    // Add furniture/features based on building type
    const furniture = this.generateFurniture(buildingType, interiorWidth, interiorHeight, rooms);
    layout.furniture = furniture;

    // Add NPC spawn points
    const npcSpawnPoints = this.generateNPCSpawnPoints(buildingType, interiorWidth, interiorHeight, rooms);
    layout.npcSpawnPoints = npcSpawnPoints;

    // Add interactive elements
    const interactiveElements = this.generateInteractiveElements(buildingType, interiorWidth, interiorHeight);
    layout.interactiveElements = interactiveElements;

    // Add decorations
    const decorations = this.generateDecorations(buildingType, interiorWidth, interiorHeight);
    layout.decorations = decorations;

    return layout;
  }

  /**
   * Generate zones for the interior
   */
  generateZones(buildingType, width, height) {
    const zones = [];
    
    switch (buildingType) {
      case 'residential':
        // Main living area
        zones.push({
          id: 'main',
          name: 'Main Room',
          type: 'living',
          bounds: { x: 0, y: 0, width: width, height: height * 0.7 }
        });
        // Kitchen area (if space allows)
        if (width >= 10) {
          zones.push({
            id: 'kitchen',
            name: 'Kitchen',
            type: 'kitchen',
            bounds: { x: width * 0.7, y: 0, width: width * 0.3, height: height * 0.4 }
          });
        }
        break;
      case 'commercial':
        // Sales floor
        zones.push({
          id: 'sales',
          name: 'Sales Floor',
          type: 'commercial',
          bounds: { x: 0, y: 0, width: width, height: height * 0.8 }
        });
        // Storage area
        zones.push({
          id: 'storage',
          name: 'Storage',
          type: 'storage',
          bounds: { x: 0, y: height * 0.8, width: width * 0.3, height: height * 0.2 }
        });
        break;
      default:
        zones.push({
          id: 'main',
          name: 'Main Area',
          type: 'generic',
          bounds: { x: 0, y: 0, width: width, height: height }
        });
    }
    
    return zones;
  }

  /**
   * Generate rooms for the interior
   */
  generateRooms(buildingType, width, height) {
    const rooms = [];
    
    switch (buildingType) {
      case 'residential':
        // Main living room
        rooms.push({
          id: 'living',
          name: 'Living Room',
          x: 1,
          y: 1,
          width: width - 2,
          height: Math.floor(height * 0.6) - 1,
          type: 'living'
        });
        // Bedroom area (if space allows)
        if (width >= 10) {
          rooms.push({
            id: 'bedroom',
            name: 'Bedroom',
            x: 1,
            y: Math.floor(height * 0.6),
            width: Math.floor(width * 0.5) - 1,
            height: height - Math.floor(height * 0.6) - 1,
            type: 'bedroom'
          });
        }
        break;
      case 'commercial':
        // Main shop floor
        rooms.push({
          id: 'shop',
          name: 'Shop Floor',
          x: 1,
          y: 1,
          width: width - 2,
          height: Math.floor(height * 0.7) - 1,
          type: 'commercial'
        });
        break;
      default:
        rooms.push({
          id: 'main',
          name: 'Main Room',
          x: 1,
          y: 1,
          width: width - 2,
          height: height - 2,
          type: 'generic'
        });
    }
    
    return rooms;
  }

  /**
   * Generate furniture based on building type
   */
  generateFurniture(buildingType, width, height, rooms) {
    const furniture = [];
    const mainRoom = rooms.find(r => r.id === 'main' || r.id === 'living' || r.id === 'shop') || rooms[0];
    
    if (!mainRoom) return furniture;

    switch (buildingType) {
      case 'residential':
        // Bed - place in corner
        furniture.push({
          id: 'bed_1',
          type: 'bed',
          position: { x: mainRoom.x + 2, y: mainRoom.y + 2 },
          size: { width: 2, height: 1 },
          rotation: 0
        });
        // Table - center area
        furniture.push({
          id: 'table_1',
          type: 'table',
          position: { x: mainRoom.x + Math.floor(mainRoom.width / 2) - 1, y: mainRoom.y + Math.floor(mainRoom.height / 2) },
          size: { width: 1, height: 1 },
          rotation: 0
        });
        // Storage/chest - opposite corner
        furniture.push({
          id: 'storage_1',
          type: 'storage',
          position: { x: mainRoom.x + mainRoom.width - 3, y: mainRoom.y + 2 },
          size: { width: 1, height: 1 },
          rotation: 0
        });
        // Chair - near table
        furniture.push({
          id: 'chair_1',
          type: 'chair',
          position: { x: mainRoom.x + Math.floor(mainRoom.width / 2) - 1, y: mainRoom.y + Math.floor(mainRoom.height / 2) + 2 },
          size: { width: 1, height: 1 },
          rotation: 0
        });
        // Additional furniture if space allows
        if (width >= 10) {
          furniture.push({
            id: 'shelf_1',
            type: 'shelf',
            position: { x: mainRoom.x + mainRoom.width - 2, y: mainRoom.y + 3 },
            size: { width: 1, height: 2 },
            rotation: 0
          });
        }
        break;
      case 'commercial':
        // Counter
        furniture.push({
          id: 'counter_1',
          type: 'counter',
          position: { x: mainRoom.x + 1, y: mainRoom.y + 1 },
          size: { width: Math.min(4, mainRoom.width - 2), height: 1 },
          rotation: 0
        });
        // Shelves
        furniture.push({
          id: 'shelf_1',
          type: 'shelf',
          position: { x: mainRoom.x + mainRoom.width - 2, y: mainRoom.y + 1 },
          size: { width: 1, height: Math.min(4, mainRoom.height - 2) },
          rotation: 0
        });
        // Display case
        furniture.push({
          id: 'display_1',
          type: 'display',
          position: { x: mainRoom.x + 3, y: mainRoom.y + 3 },
          size: { width: 2, height: 1 },
          rotation: 0
        });
        // Additional shelf
        if (width >= 10) {
          furniture.push({
            id: 'shelf_2',
            type: 'shelf',
            position: { x: mainRoom.x + 1, y: mainRoom.y + mainRoom.height - 3 },
            size: { width: 2, height: 1 },
            rotation: 0
          });
        }
        break;
      default:
        // Generic furniture
        furniture.push({
          id: 'furniture_1',
          type: 'furniture',
          position: { x: mainRoom.x + 2, y: mainRoom.y + 2 },
          size: { width: 2, height: 1 },
          rotation: 0
        });
    }

    return furniture;
  }

  /**
   * Generate NPC spawn points
   */
  generateNPCSpawnPoints(buildingType, width, height, rooms) {
    const spawnPoints = [];
    const mainRoom = rooms.find(r => r.id === 'main' || r.id === 'living' || r.id === 'shop') || rooms[0];
    
    if (!mainRoom) return spawnPoints;

    switch (buildingType) {
      case 'residential':
        // 0-2 residents
        const residentCount = Math.floor(Math.random() * 3);
        for (let i = 0; i < residentCount; i++) {
          spawnPoints.push({
            position: {
              x: mainRoom.x + Math.floor(mainRoom.width / 2) + (i * 2 - 1),
              y: mainRoom.y + Math.floor(mainRoom.height / 2)
            },
            type: 'resident',
            weight: 0.6
          });
        }
        break;
      case 'commercial':
        // 1-3 NPCs (vendor + customers)
        const npcCount = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < npcCount; i++) {
          spawnPoints.push({
            position: {
              x: mainRoom.x + 2 + (i * 2),
              y: mainRoom.y + 2 + (i % 2)
            },
            type: i === 0 ? 'vendor' : 'customer',
            weight: i === 0 ? 1.0 : 0.5
          });
        }
        break;
      default:
        // 0-1 generic NPC
        if (Math.random() > 0.5) {
          spawnPoints.push({
            position: {
              x: mainRoom.x + Math.floor(mainRoom.width / 2),
              y: mainRoom.y + Math.floor(mainRoom.height / 2)
            },
            type: 'occupant',
            weight: 0.5
          });
        }
    }

    return spawnPoints;
  }

  /**
   * Generate interactive elements
   */
  generateInteractiveElements(buildingType, width, height) {
    const elements = [];

    switch (buildingType) {
      case 'residential':
        // Storage container
        elements.push({
          id: 'storage_1',
          type: 'storage',
          position: { x: width - 3, y: 2 },
          size: { width: 1, height: 1 },
          interactionType: 'loot'
        });
        break;
      case 'commercial':
        // Vendor counter
        elements.push({
          id: 'vendor_1',
          type: 'vendor',
          position: { x: 2, y: 2 },
          size: { width: 3, height: 1 },
          interactionType: 'trade'
        });
        break;
    }

    return elements;
  }

  /**
   * Generate decorations
   */
  generateDecorations(buildingType, width, height) {
    const decorations = [];

    switch (buildingType) {
      case 'residential':
        // Wall decorations
        decorations.push({
          id: 'decoration_1',
          type: 'wall_art',
          position: { x: width / 2, y: 1 },
          size: { width: 1, height: 1 }
        });
        // Lighting
        decorations.push({
          id: 'light_1',
          type: 'light',
          position: { x: width / 2, y: height / 2 },
          size: { width: 1, height: 1 }
        });
        break;
      case 'commercial':
        // Sign
        decorations.push({
          id: 'sign_1',
          type: 'sign',
          position: { x: width / 2, y: 1 },
          size: { width: 2, height: 1 }
        });
        // Lighting
        decorations.push({
          id: 'light_1',
          type: 'light',
          position: { x: width / 2, y: height / 2 },
          size: { width: 1, height: 1 }
        });
        break;
    }

    return decorations;
  }
}

module.exports = new BuildingInteriorService();

