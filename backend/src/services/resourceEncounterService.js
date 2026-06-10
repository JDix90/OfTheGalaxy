/**
 * Resource Encounter Service
 * Handles random resource discovery encounters in submaps
 */

const { PlayerCharacter, Planet, SubMap } = require('../models');

class ResourceEncounterService {
  constructor() {
    this.encounterCooldowns = new Map(); // Map<characterId, timestamp>
  }

  /**
   * Check if a resource encounter should trigger in a submap
   * @param {string} characterId - The ID of the player character
   * @param {string} subMapId - The ID of the current submap
   * @returns {Promise<object>} { shouldTrigger: boolean, resource: object|null }
   */
  async checkResourceEncounter(characterId, subMapId) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    // Get submap with planet data
    const subMap = await SubMap.findByPk(subMapId, {
      include: [{
        model: Planet,
        as: 'planet',
        attributes: ['id', 'name', 'resources']
      }]
    });

    if (!subMap || !subMap.planet) {
      return { shouldTrigger: false, resource: null };
    }

    const planet = subMap.planet;
    
    // Check if planet has resources defined
    if (!planet.resources || !Array.isArray(planet.resources) || planet.resources.length === 0) {
      return { shouldTrigger: false, resource: null };
    }

    // Find resources available at this submap's parent location
    const parentLocationId = subMap.parentLocationId;
    const availableResources = planet.resources.filter(resource => {
      if (!resource.locations || !Array.isArray(resource.locations)) {
        return false;
      }
      // Check if parent location name matches any location in the resource's locations array
      return resource.locations.some(location => {
        const locationLower = location.toLowerCase();
        const parentLower = (parentLocationId || '').toLowerCase();
        return locationLower.includes(parentLower) || parentLower.includes(locationLower);
      });
    });

    if (availableResources.length === 0) {
      return { shouldTrigger: false, resource: null };
    }

    // Check cooldown
    const lastEncounterTime = this.encounterCooldowns.get(characterId);
    const now = Date.now();
    const COOLDOWN_MS = 15000; // 15 seconds cooldown between resource encounters

    if (lastEncounterTime && (now - lastEncounterTime < COOLDOWN_MS)) {
      return { shouldTrigger: false, resource: null };
    }

    // Calculate encounter chance
    // Base chance: 15% per move in resource-rich areas
    let encounterChance = 0.15;
    
    // Increase chance based on submap type (mines have higher chance)
    if (subMap.type === 'mine') {
      encounterChance = 0.25; // 25% chance in mines
    } else if (subMap.type === 'wilderness') {
      encounterChance = 0.20; // 20% chance in wilderness
    }

    const roll = Math.random();

    if (roll <= encounterChance) {
      // Trigger resource encounter
      this.encounterCooldowns.set(characterId, now);

      // Randomly select one of the available resources
      const selectedResource = availableResources[Math.floor(Math.random() * availableResources.length)];

      return {
        shouldTrigger: true,
        resource: {
          id: selectedResource.id,
          name: selectedResource.name,
          type: selectedResource.type,
          rarity: selectedResource.rarity,
          description: selectedResource.description,
          baseValue: selectedResource.baseValue,
          weight: selectedResource.weight,
          stackSize: selectedResource.stackSize
        }
      };
    }

    return {
      shouldTrigger: false,
      resource: null
    };
  }
}

module.exports = new ResourceEncounterService();



