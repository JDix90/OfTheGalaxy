/**
 * Discovery Service
 * Handles discovery tracking, first visit bonuses, and exploration rewards
 */

const { Discovery, PlayerCharacter } = require('../models');
const characterService = require('./characterService');

class DiscoveryService {
  /**
   * Record a discovery
   * @param {string} characterId - Character UUID
   * @param {string} planetId - Planet ID
   * @param {string} locationType - Type of location (poi, city, landmark, etc.)
   * @param {string} locationId - Unique location identifier
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Discovery record and reward info
   */
  async recordDiscovery(characterId, planetId, locationType, locationId, options = {}) {
    const {
      locationName = null,
      metadata = {},
      awardRewards = true,
      evidenceId = null
    } = options;

    // Check if already discovered
    const existing = await Discovery.findOne({
      where: {
        characterId,
        planetId,
        locationId
      }
    });

    if (existing) {
      return {
        discovery: existing,
        isNew: false,
        rewards: null
      };
    }

    // Check if this is a first discovery (no other character has discovered it)
    const firstDiscovery = await this.checkFirstDiscovery(planetId, locationId);

    try {
      // Create discovery record
      const discovery = await Discovery.create({
        characterId,
        planetId,
        locationType,
        locationId,
        locationName,
        firstDiscovery,
        metadata
      });

      // Award rewards if this is a new discovery
      let rewards = null;
      if (awardRewards) {
        rewards = await this.awardDiscoveryRewards(characterId, locationType, firstDiscovery);
      }

      // Track quest objectives for discover type
      try {
        await this.trackDiscoverObjectives(characterId, locationId, evidenceId || metadata.evidenceId);
      } catch (error) {
        console.warn('[Discovery Service] Failed to track discover objectives:', error);
        // Don't fail discovery if quest tracking fails
      }

      // Check achievements after discovery
      try {
        const achievementService = require('./achievementService');
        await achievementService.checkDiscoveryAchievements(characterId);
      } catch (error) {
        console.warn('Failed to check discovery achievements:', error);
        // Don't fail discovery if achievement check fails
      }

      return {
        discovery,
        isNew: true,
        firstDiscovery,
        rewards
      };
    } catch (error) {
      // Handle race condition: if discovery was created between our check and create
      // (e.g., React StrictMode double-rendering), catch the unique constraint violation
      if (error.name === 'SequelizeUniqueConstraintError' || error.name === 'SequelizeDatabaseError') {
        // Try to find the existing discovery
        const existing = await Discovery.findOne({
          where: {
            characterId,
            planetId,
            locationId
          }
        });

        if (existing) {
          return {
            discovery: existing,
            isNew: false,
            firstDiscovery: existing.firstDiscovery,
            rewards: null
          };
        }
      }

      // Re-throw if it's a different error
      throw error;
    }
  }

  /**
   * Check if this is a first discovery
   * @param {string} planetId - Planet ID
   * @param {string} locationId - Location ID
   * @returns {Promise<boolean>} True if first discovery
   */
  async checkFirstDiscovery(planetId, locationId) {
    const existing = await Discovery.findOne({
      where: {
        planetId,
        locationId
      }
    });

    return !existing;
  }

  /**
   * Award rewards for discovering a location
   * @param {string} characterId - Character UUID
   * @param {string} locationType - Type of location
   * @param {boolean} firstDiscovery - Is this a first discovery?
   * @returns {Promise<Object>} Rewards awarded
   */
  async awardDiscoveryRewards(characterId, locationType, firstDiscovery = false) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    // Base rewards by location type
    const baseRewards = {
      poi: { xp: 10, credits: 25 },
      city: { xp: 25, credits: 50 },
      landmark: { xp: 50, credits: 100 },
      hidden_location: { xp: 100, credits: 200 },
      scannable_object: { xp: 15, credits: 30 },
      fast_travel_point: { xp: 20, credits: 40 },
      sub_map: { xp: 30, credits: 60 }
    };

    const rewards = baseRewards[locationType] || { xp: 10, credits: 25 };

    // First discovery bonus (2x rewards)
    if (firstDiscovery) {
      rewards.xp *= 2;
      rewards.credits *= 2;
    }

    // Award XP
    if (rewards.xp > 0) {
      await characterService.addXP(characterId, rewards.xp, `discovery_${locationType}`);
    }

    // Award credits
    if (rewards.credits > 0) {
      character.credits = (character.credits || 0) + rewards.credits;
      await character.save();
    }

    return {
      xp: rewards.xp,
      credits: rewards.credits,
      firstDiscoveryBonus: firstDiscovery
    };
  }

  /**
   * Get all discoveries for a character
   * @param {string} characterId - Character UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} List of discoveries
   */
  async getDiscoveries(characterId, filters = {}) {
    const {
      planetId = null,
      locationType = null,
      limit = null,
      offset = 0
    } = filters;

    const where = { characterId };
    if (planetId) where.planetId = planetId;
    if (locationType) where.locationType = locationType;

    const options = {
      where,
      order: [['discovered_at', 'DESC']],
      offset
    };

    if (limit) {
      options.limit = limit;
    }

    return await Discovery.findAll(options);
  }

  /**
   * Get discovery statistics for a character
   * @param {string} characterId - Character UUID
   * @returns {Promise<Object>} Discovery statistics
   */
  async getDiscoveryStats(characterId) {
    const discoveries = await Discovery.findAll({
      where: { characterId }
    });

    const stats = {
      total: discoveries.length,
      byType: {},
      byPlanet: {},
      firstDiscoveries: 0,
      totalXP: 0,
      totalCredits: 0
    };

    discoveries.forEach(discovery => {
      // Count by type
      stats.byType[discovery.locationType] = (stats.byType[discovery.locationType] || 0) + 1;

      // Count by planet
      stats.byPlanet[discovery.planetId] = (stats.byPlanet[discovery.planetId] || 0) + 1;

      // Count first discoveries
      if (discovery.firstDiscovery) {
        stats.firstDiscoveries++;
      }
    });

    return stats;
  }

  /**
   * Get discovery completion percentage for a planet
   * @param {string} characterId - Character UUID
   * @param {string} planetId - Planet ID
   * @param {number} totalLocations - Total discoverable locations on planet
   * @returns {Promise<number>} Completion percentage (0-100)
   */
  async getPlanetCompletion(characterId, planetId, totalLocations = null) {
    const discovered = await Discovery.count({
      where: {
        characterId,
        planetId
      }
    });

    if (!totalLocations || totalLocations === 0) {
      return 0;
    }

    return Math.round((discovered / totalLocations) * 100);
  }

  /**
   * Check if a location has been discovered
   * @param {string} characterId - Character UUID
   * @param {string} planetId - Planet ID
   * @param {string} locationId - Location ID
   * @returns {Promise<boolean>} True if discovered
   */
  async isDiscovered(characterId, planetId, locationId) {
    const discovery = await Discovery.findOne({
      where: {
        characterId,
        planetId,
        locationId
      }
    });

    return !!discovery;
  }

  /**
   * Get discovered locations for a planet
   * @param {string} characterId - Character UUID
   * @param {string} planetId - Planet ID
   * @returns {Promise<Array>} List of discovered location IDs
   */
  async getDiscoveredLocations(characterId, planetId) {
    const discoveries = await Discovery.findAll({
      where: {
        characterId,
        planetId
      },
      attributes: ['locationId', 'locationType', 'locationName', 'discoveredAt', 'firstDiscovery']
    });

    return discoveries.map(d => ({
      locationId: d.locationId,
      locationType: d.locationType,
      locationName: d.locationName,
      discoveredAt: d.discoveredAt,
      firstDiscovery: d.firstDiscovery
    }));
  }

  /**
   * Track discover objectives when evidence/locations are discovered
   * @param {string} characterId - Character ID
   * @param {string} locationId - Location ID that was discovered
   * @param {string} evidenceId - Optional evidence ID
   */
  async trackDiscoverObjectives(characterId, locationId, evidenceId = null) {
    const { QuestProgress, Quest } = require('../models');
    const questService = require('./questService');
    
    // Get all active quests for this character
    const activeQuests = await QuestProgress.findAll({
      where: {
        characterId,
        status: 'active'
      }
    });
    
    // Check each active quest for discover objectives
    for (const questProgress of activeQuests) {
      const quest = await Quest.findByPk(questProgress.questId);
      if (!quest || !quest.objectives) continue;
      
      for (const objective of quest.objectives) {
        // Skip if already completed
        if (questProgress.isObjectiveComplete(objective.id)) {
          continue;
        }
        
        // Check if this is a discover objective
        if (objective.type === 'discover') {
          // Match by evidenceId if specified
          if (objective.evidenceId && evidenceId && objective.evidenceId === evidenceId) {
            await questService.updateObjective(
              characterId,
              quest.id,
              objective.id,
              true,
              { evidenceId, discoveredAt: new Date().toISOString() }
            );
            console.log(`[Quest] Discover objective ${objective.id} completed (evidence: ${evidenceId})`);
          }
          // Match by locationId if specified
          else if (objective.target && objective.target === locationId) {
            await questService.updateObjective(
              characterId,
              quest.id,
              objective.id,
              true,
              { locationId, discoveredAt: new Date().toISOString() }
            );
            console.log(`[Quest] Discover objective ${objective.id} completed (location: ${locationId})`);
          }
        }
      }
    }
  }
}

module.exports = new DiscoveryService();

