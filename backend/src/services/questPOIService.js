/**
 * Quest POI Service
 * Creates and manages Points of Interest for quest objectives
 */

const { Planet } = require('../models');
const locationCalculator = require('../utils/locationCalculator');

class QuestPOIService {
  /**
   * Create a POI for a quest objective
   * @param {Object} quest - Quest instance
   * @param {Object} objective - Quest objective
   * @param {Object} questGiver - Quest giver NPC
   * @param {Object} planet - Planet model instance
   * @returns {Promise<Object>} Created POI
   */
  async createPOIForObjective(quest, objective, questGiver, planet) {
    // Calculate location coordinates from hint
    const locationHint = objective.location || questGiver.location;
    const calculatedLocation = locationCalculator.calculateLocationFromHint(
      locationHint,
      questGiver.location,
      planet
    );

    // Get existing POIs to avoid overlaps
    const existingPOIs = planet.pointsOfInterest || [];
    
    // Find valid location that doesn't overlap with existing POIs
    const validLocation = locationCalculator.findValidLocation(
      calculatedLocation,
      existingPOIs,
      8, // Minimum distance from other POIs
      20 // Max attempts
    );

    // Generate POI based on objective type
    const poi = this.generatePOIForObjectiveType(quest, objective, validLocation);

    // Add POI to planet's pointsOfInterest array
    // IMPORTANT: We must create a new array reference for Sequelize to detect the change
    let updatedPOIs = planet.pointsOfInterest ? [...planet.pointsOfInterest] : [];

    // Check if a POI for this quest objective already exists
    // Use questId and objectiveId to identify, not the timestamp-based POI ID
    const existingPOIIndex = updatedPOIs.findIndex(p => 
      p.questRelated && 
      p.questRelated.questId === quest.id && 
      p.questRelated.objectiveId === objective.id
    );
    
    if (existingPOIIndex >= 0) {
      // Update existing POI (preserve the original ID but update other properties)
      const existingPOI = updatedPOIs[existingPOIIndex];
      updatedPOIs[existingPOIIndex] = {
        ...poi,
        id: existingPOI.id // Keep the original ID
      };
      console.log(`[Quest POI] Updated existing POI ${existingPOI.id} for quest ${quest.id}, objective ${objective.id}`);
    } else {
      // Add new POI
      updatedPOIs.push(poi);
      console.log(`[Quest POI] Created new POI ${poi.id} for quest ${quest.id}, objective ${objective.id}`);
    }

    // Set the new array to ensure Sequelize detects the change
    planet.set('pointsOfInterest', updatedPOIs);

    // Save planet with updated POIs
    console.log(`[Quest POI] Saving ${updatedPOIs.length} POIs to planet ${planet.id} (adding POI ${poi.id})`);
    await planet.save();
    
    // Reload planet to ensure POIs are persisted
    await planet.reload();

    console.log(`[Quest POI] Created POI ${poi.id} (${poi.name}) at (${validLocation.x}, ${validLocation.y}) for quest ${quest.id}`);
    console.log(`[Quest POI] Planet ${planet.id} now has ${planet.pointsOfInterest?.length || 0} POIs in database after reload`);
    
    // Verify the POI was actually saved
    if (planet.pointsOfInterest && planet.pointsOfInterest.length > 0) {
      const savedPOI = planet.pointsOfInterest.find(p => p.id === poi.id);
      if (savedPOI) {
        console.log(`[Quest POI] ✓ Verified POI ${poi.id} is saved in database`);
      } else {
        console.warn(`[Quest POI] ⚠ WARNING: POI ${poi.id} was not found in database after save!`);
      }
    }

    return poi;
  }

  /**
   * Generate POI data based on objective type
   * @param {Object} quest - Quest instance
   * @param {Object} objective - Quest objective
   * @param {Object} location - Calculated location { x, y, area, planet }
   * @returns {Object} POI data
   */
  generatePOIForObjectiveType(quest, objective, location) {
    const poiId = `quest_${quest.id}_${objective.id}_${Date.now()}`;
    const questTitle = quest.title || 'Quest';
    const objectiveDesc = objective.description || '';

    let poiType = 'unknown';
    let poiName = 'Quest Location';
    let description = 'A location related to an active quest.';

    switch (objective.type) {
      case 'collect':
        poiType = this.getCollectPOIType(quest, objective);
        poiName = this.generateCollectPOIName(quest, objective);
        description = `A ${poiType.replace('_', ' ')} where you can find items for ${questTitle}.`;
        break;

      case 'discover':
        poiType = 'landmark';
        poiName = this.generateDiscoverPOIName(quest, objective);
        description = `A location to investigate for ${questTitle}.`;
        break;

      case 'travel':
        poiType = 'destination';
        poiName = this.generateTravelPOIName(quest, objective);
        description = `Your destination for ${questTitle}.`;
        break;

      case 'defeat':
        poiType = 'danger';
        poiName = this.generateDefeatPOIName(quest, objective);
        description = `A dangerous area where you may encounter enemies for ${questTitle}.`;
        break;

      default:
        poiType = 'landmark';
        poiName = `Quest Location for ${questTitle}`;
    }

    const poi = {
      id: poiId,
      name: poiName,
      type: poiType,
      x: location.x,
      y: location.y,
      description: description,
      questRelated: {
        questId: quest.id,
        objectiveId: objective.id,
        questTitle: quest.title
      },
      // Store quest items if this is a collect objective
      questItems: objective.type === 'collect' ? [{
        itemId: objective.target,
        count: objective.count || 1,
        questId: quest.id,
        objectiveId: objective.id
      }] : []
    };

    return poi;
  }

  /**
   * Get POI type for collect objectives
   */
  getCollectPOIType(quest, objective) {
    const questTitle = (quest.title || '').toLowerCase();
    const objectiveDesc = (objective.description || '').toLowerCase();

    if (objectiveDesc.includes('supply') || objectiveDesc.includes('storage') || 
        objectiveDesc.includes('warehouse') || objectiveDesc.includes('depot')) {
      return 'storage_facility';
    }
    if (objectiveDesc.includes('outpost') || objectiveDesc.includes('camp')) {
      return 'outpost';
    }
    if (objectiveDesc.includes('medical') || objectiveDesc.includes('medpac')) {
      return 'medical_center';
    }
    if (objectiveDesc.includes('food') || objectiveDesc.includes('ration')) {
      return 'market';
    }

    // Default based on quest context
    return 'storage_facility';
  }

  /**
   * Generate POI name for collect objectives
   */
  generateCollectPOIName(quest, objective) {
    const objectiveDesc = objective.description || '';
    
    if (objectiveDesc.includes('supply')) {
      return 'Supply Depot';
    }
    if (objectiveDesc.includes('storage')) {
      return 'Storage Facility';
    }
    if (objectiveDesc.includes('outpost')) {
      return 'Outpost';
    }
    if (objectiveDesc.includes('medical')) {
      return 'Medical Supply Cache';
    }
    if (objectiveDesc.includes('food')) {
      return 'Food Storage';
    }

    return 'Supply Cache';
  }

  /**
   * Generate POI name for discover objectives
   */
  generateDiscoverPOIName(quest, objective) {
    const objectiveDesc = objective.description || '';
    
    if (objectiveDesc.includes('evidence') || objectiveDesc.includes('clue')) {
      return 'Evidence Site';
    }
    if (objectiveDesc.includes('ruin') || objectiveDesc.includes('ancient')) {
      return 'Ancient Ruins';
    }
    if (objectiveDesc.includes('landmark')) {
      return 'Landmark';
    }

    return 'Discovery Site';
  }

  /**
   * Generate POI name for travel objectives
   */
  generateTravelPOIName(quest, objective) {
    const objectiveDesc = objective.description || '';
    
    if (objectiveDesc.includes('meet') || objectiveDesc.includes('rendezvous')) {
      return 'Meeting Point';
    }
    if (objectiveDesc.includes('destination')) {
      return 'Destination';
    }

    return 'Quest Destination';
  }

  /**
   * Generate POI name for defeat objectives
   */
  generateDefeatPOIName(quest, objective) {
    const objectiveDesc = objective.description || '';
    
    if (objectiveDesc.includes('camp') || objectiveDesc.includes('base')) {
      return 'Enemy Camp';
    }
    if (objectiveDesc.includes('hideout') || objectiveDesc.includes('lair')) {
      return 'Enemy Hideout';
    }

    return 'Danger Zone';
  }

  /**
   * Clean up POIs for a quest (when quest is completed or abandoned)
   * @param {string} questId - Quest ID
   * @param {string} planetId - Planet ID
   * @param {boolean} remove - If true, remove POIs; if false, just mark as inactive
   */
  async cleanupQuestPOIs(questId, planetId, remove = false) {
    const planet = await Planet.findByPk(planetId);
    if (!planet || !planet.pointsOfInterest) {
      return;
    }

    let updatedPOIs;
    if (remove) {
      // Remove POIs related to this quest
      updatedPOIs = planet.pointsOfInterest.filter(poi => {
        return !(poi.questRelated && poi.questRelated.questId === questId);
      });
    } else {
      // Mark POIs as inactive (keep them but mark as quest-complete)
      // Create new array with updated POIs
      updatedPOIs = planet.pointsOfInterest.map(poi => {
        if (poi.questRelated && poi.questRelated.questId === questId) {
          return {
            ...poi,
            questRelated: {
              ...poi.questRelated,
              completed: true
            }
          };
        }
        return poi;
      });
    }

    // Set the new array to ensure Sequelize detects the change
    planet.set('pointsOfInterest', updatedPOIs);
    await planet.save();
    console.log(`[Quest POI] Cleaned up POIs for quest ${questId} on planet ${planetId} (remove: ${remove})`);
  }

  /**
   * Get all POIs for a quest
   * @param {string} questId - Quest ID
   * @param {string} planetId - Planet ID
   * @returns {Promise<Array>} Array of POIs
   */
  async getQuestPOIs(questId, planetId) {
    const planet = await Planet.findByPk(planetId);
    if (!planet || !planet.pointsOfInterest) {
      return [];
    }

    return planet.pointsOfInterest.filter(poi => {
      return poi.questRelated && poi.questRelated.questId === questId;
    });
  }
}

module.exports = new QuestPOIService();

