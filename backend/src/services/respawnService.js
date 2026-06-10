/**
 * Respawn Service
 * Handles player respawn after defeat in combat
 */

const { PlayerCharacter, Planet } = require('../models');

class RespawnService {
  /**
   * Find nearest safe location (spaceport or medical center) on a planet
   * @param {string} planetId - Planet ID
   * @returns {Promise<Object>} Safe location with coordinates
   */
  async findNearestSafeLocation(planetId) {
    const planet = await Planet.findByPk(planetId);
    
    if (!planet) {
      throw new Error(`Planet ${planetId} not found`);
    }

    // Get planet map data (JSONB field, may need to be accessed directly)
    const mapData = planet.mapData || planet.get('mapData') || {};
    
    console.log(`🔍 Finding safe location for planet ${planetId}:`, {
      hasMapData: !!mapData,
      mapDataKeys: Object.keys(mapData),
      hasPointsOfInterest: !!mapData.pointsOfInterest,
      pointsOfInterestCount: mapData.pointsOfInterest?.length || 0
    });
    
    // Priority 1: Check for Medical Center in pointsOfInterest
    if (mapData.pointsOfInterest && Array.isArray(mapData.pointsOfInterest)) {
      const medicalCenter = mapData.pointsOfInterest.find(poi => poi.type === 'medical_center');
      if (medicalCenter) {
        const spawnX = medicalCenter.spawnX || medicalCenter.x || 50;
        const spawnY = medicalCenter.spawnY || medicalCenter.y || 50;
        
        console.log(`✅ Found Medical Center at:`, { x: spawnX, y: spawnY, name: medicalCenter.name });
        
        return {
          type: 'medical_center',
          name: medicalCenter.name || 'Medical Center',
          x: spawnX,
          y: spawnY,
          area: 'medical_center',
          description: medicalCenter.description || 'Medical facility'
        };
      }
    }
    
    // Priority 2: Check for Medical Center in medicalCenters array
    if (mapData.medicalCenters && Array.isArray(mapData.medicalCenters)) {
      const medicalCenter = mapData.medicalCenters[0]; // Use first Medical Center
      if (medicalCenter) {
        const spawnX = medicalCenter.x || 50;
        const spawnY = medicalCenter.y || 50;
        
        console.log(`✅ Found Medical Center from medicalCenters array:`, { x: spawnX, y: spawnY, name: medicalCenter.name });
        
        return {
          type: 'medical_center',
          name: medicalCenter.name || 'Medical Center',
          x: spawnX,
          y: spawnY,
          area: 'medical_center',
          description: medicalCenter.description || 'Medical facility'
        };
      }
    }
    
    // Priority 3: Use Spaceport from pointsOfInterest
    // Spaceports are stored in mapData.pointsOfInterest with type: 'spaceport'
    if (mapData.pointsOfInterest && Array.isArray(mapData.pointsOfInterest)) {
      const spaceport = mapData.pointsOfInterest.find(poi => poi.type === 'spaceport');
      if (spaceport) {
        const spawnX = spaceport.spawnX || spaceport.x || 50;
        const spawnY = spaceport.spawnY || spaceport.y || 50;
        
        console.log(`✅ Found spaceport at:`, { x: spawnX, y: spawnY, name: spaceport.name });
        
        return {
          type: 'spaceport',
          name: spaceport.name || 'Spaceport',
          x: spawnX,
          y: spawnY,
          area: 'spaceport',
          description: spaceport.description || 'Spaceport medical facilities'
        };
      }
    }
    
    // Fallback: Try to get map data from planetMaps.js if not in database
    try {
      const { getPlanetMapData } = require('../data/planetMaps');
      const generatedMapData = getPlanetMapData(planet);
      
      // Check for Medical Center first
      if (generatedMapData && generatedMapData.pointsOfInterest) {
        const medicalCenter = generatedMapData.pointsOfInterest.find(poi => poi.type === 'medical_center');
        if (medicalCenter) {
          const spawnX = medicalCenter.x || 50;
          const spawnY = medicalCenter.y || 50;
          
          console.log(`✅ Found Medical Center from generated map data at:`, { x: spawnX, y: spawnY, name: medicalCenter.name });
          
          return {
            type: 'medical_center',
            name: medicalCenter.name || 'Medical Center',
            x: spawnX,
            y: spawnY,
            area: 'medical_center',
            description: medicalCenter.description || 'Medical facility'
          };
        }
      }
      
      // Check medicalCenters array
      if (generatedMapData && generatedMapData.medicalCenters && generatedMapData.medicalCenters.length > 0) {
        const medicalCenter = generatedMapData.medicalCenters[0];
        const spawnX = medicalCenter.x || 50;
        const spawnY = medicalCenter.y || 50;
        
        console.log(`✅ Found Medical Center from generated medicalCenters array:`, { x: spawnX, y: spawnY, name: medicalCenter.name });
        
        return {
          type: 'medical_center',
          name: medicalCenter.name || 'Medical Center',
          x: spawnX,
          y: spawnY,
          area: 'medical_center',
          description: medicalCenter.description || 'Medical facility'
        };
      }
      
      // Fallback to spaceport
      if (generatedMapData && generatedMapData.pointsOfInterest) {
        const spaceport = generatedMapData.pointsOfInterest.find(poi => poi.type === 'spaceport');
        if (spaceport) {
          const spawnX = spaceport.spawnX || spaceport.x || 50;
          const spawnY = spaceport.spawnY || spaceport.y || 50;
          
          console.log(`✅ Found spaceport from generated map data at:`, { x: spawnX, y: spawnY, name: spaceport.name });
          
          return {
            type: 'spaceport',
            name: spaceport.name || 'Spaceport',
            x: spawnX,
            y: spawnY,
            area: 'spaceport',
            description: spaceport.description || 'Spaceport medical facilities'
          };
        }
      }
    } catch (error) {
      console.warn(`⚠️  Failed to get generated map data:`, error.message);
    }

    // Fallback: Use planet center (shouldn't happen, but safety net)
    console.warn(`⚠️  No spaceport found for planet ${planetId}, using fallback location`);
    return {
      type: 'landing_zone',
      name: 'Landing Zone',
      x: 50,
      y: 50,
      area: 'landing_zone',
      description: 'Planet landing zone'
    };
  }

  /**
   * Calculate medical fee based on character level
   * @param {number} level - Character level
   * @returns {number} Medical fee in credits
   */
  calculateMedicalFee(level) {
    const baseFee = 100;
    const levelMultiplier = 50;
    return baseFee + (level * levelMultiplier);
  }

  /**
   * Respawn player after defeat
   * @param {string} characterId - Character UUID
   * @param {Object} options - Respawn options
   * @param {number} options.healthRestorePercent - Health restoration percentage (default: 50)
   * @param {boolean} options.chargeFee - Whether to charge medical fee (default: true)
   * @returns {Promise<Object>} Respawn result
   */
  async respawnPlayer(characterId, options = {}) {
    const {
      healthRestorePercent = 50,
      chargeFee = true
    } = options;

    console.log(`💀 Respawn player ${characterId} with options:`, options);

    const character = await PlayerCharacter.findByPk(characterId);
    
    if (!character) {
      throw new Error('Character not found');
    }

    console.log(`📍 Character current planet: ${character.currentPlanet}`);

    // Find nearest safe location on current planet
    let safeLocation;
    try {
      safeLocation = await this.findNearestSafeLocation(character.currentPlanet);
      console.log(`✅ Safe location found:`, safeLocation);
    } catch (error) {
      console.error(`❌ Failed to find safe location:`, error);
      throw error;
    }
    
    // Calculate health restoration
    const restoredHealth = Math.floor(character.maxHealth * (healthRestorePercent / 100));
    
    // Calculate medical fee
    let medicalFee = 0;
    if (chargeFee) {
      medicalFee = this.calculateMedicalFee(character.level);
      // If player can't afford it, make it free (emergency care)
      if (character.credits < medicalFee) {
        console.log(`💰 Player can't afford medical fee (${medicalFee}), providing free emergency care`);
        medicalFee = 0;
      }
    }

    // Update character
    const oldLocation = character.currentLocation;
    character.currentHealth = restoredHealth;
    character.currentLocation = {
      x: safeLocation.x,
      y: safeLocation.y,
      area: safeLocation.area
    };
    character.credits = Math.max(0, character.credits - medicalFee);

    await character.save();

    console.log(`✅ Player respawned:`, {
      oldLocation,
      newLocation: character.currentLocation,
      health: `${restoredHealth}/${character.maxHealth}`,
      medicalFee,
      credits: character.credits
    });

    return {
      success: true,
      location: safeLocation,
      healthRestored: restoredHealth,
      healthRestorePercent,
      medicalFee,
      character: character.toJSON()
    };
  }
}

module.exports = new RespawnService();

