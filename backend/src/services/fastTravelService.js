/**
 * Fast Travel Service
 * Handles fast travel between discovered locations
 */

const { PlayerCharacter, Planet, Discovery } = require('../models');
const { Op } = require('sequelize');

class FastTravelService {
  /**
   * Get available fast travel points for character on planet
   */
  async getFastTravelPoints(characterId, planetId) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    const planet = await Planet.findByPk(planetId);
    if (!planet) {
      throw new Error('Planet not found');
    }

    // Get discovered fast travel points
    const discoveries = await Discovery.findAll({
      where: {
        characterId,
        planetId,
        locationType: 'fast_travel_point'
      }
    });

    // Get fast travel points from planet map data
    const mapData = planet.mapData || {};
    const fastTravelPoints = mapData.fastTravelPoints || [];

    // Filter to only discovered points
    const availablePoints = fastTravelPoints.filter(point => {
      const discovery = discoveries.find(d => 
        d.locationId === (point.id || point.name)
      );
      return discovery !== undefined; // Only show discovered points
    });

    return availablePoints;
  }

  /**
   * Fast travel to a location
   */
  async fastTravel(characterId, planetId, destinationId, options = {}) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    // Check if character has active combat
    const { CombatEncounter } = require('../models');
    const activeCombat = await CombatEncounter.findOne({
      where: {
        characterId,
        status: 'active'
      }
    });

    if (activeCombat) {
      throw new Error('Cannot fast travel during combat');
    }

    // Check if character is in a quest that prevents fast travel
    // This would check quest restrictions (future enhancement)

    const planet = await Planet.findByPk(planetId);
    if (!planet) {
      throw new Error('Planet not found');
    }

    // Get destination point
    const mapData = planet.mapData || {};
    const fastTravelPoints = mapData.fastTravelPoints || [];
    const destination = fastTravelPoints.find(p => 
      (p.id || p.name) === destinationId
    );

    if (!destination) {
      throw new Error('Fast travel destination not found');
    }

    // Verify destination is discovered
    const discovery = await Discovery.findOne({
      where: {
        characterId,
        planetId,
        locationType: 'fast_travel_point',
        locationId: destinationId
      }
    });

    if (!discovery) {
      throw new Error('Fast travel destination not discovered');
    }

    // Calculate travel cost
    const cost = this.calculateTravelCost(character, destination, options);

    // Check if character can afford it
    if (character.credits < cost) {
      throw new Error('Insufficient credits for fast travel');
    }

    // Deduct cost
    character.credits -= cost;

    // Update character location
    character.currentLocation = {
      x: destination.x,
      y: destination.y,
      area: destination.area || 'surface'
    };

    await character.save();
    
    // Track quest objectives for travel type
    try {
      const galaxyService = require('./galaxyService');
      await galaxyService.trackTravelObjectives(characterId, planetId, character.currentLocation.area);
    } catch (error) {
      console.warn('[Fast Travel Service] Failed to track travel objectives:', error);
      // Don't fail fast travel if quest tracking fails
    }

    return {
      success: true,
      destination,
      cost,
      newLocation: character.currentLocation
    };
  }

  /**
   * Calculate fast travel cost
   */
  calculateTravelCost(character, destination, options = {}) {
    // Base cost
    let cost = 50;

    // Distance modifier (if distance is provided)
    if (destination.distance) {
      cost += destination.distance * 2;
    }

    // Level modifier (higher level = more expensive)
    cost += character.level * 5;

    // Apply discount if character has good faction reputation
    // This would check faction reputation (future enhancement)

    // Minimum cost
    return Math.max(10, Math.floor(cost));
  }

  /**
   * Discover a fast travel point
   */
  async discoverFastTravelPoint(characterId, planetId, pointId, pointName) {
    const { discoveryService } = require('./discoveryService');
    
    return await discoveryService.recordDiscovery(
      characterId,
      planetId,
      'fast_travel_point',
      pointId,
      {
        name: pointName,
        metadata: { type: 'fast_travel_point' }
      }
    );
  }
}

module.exports = new FastTravelService();


