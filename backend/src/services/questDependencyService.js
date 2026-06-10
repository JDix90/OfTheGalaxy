/**
 * Quest Dependency Service
 * Ensures all quest dependencies (items, NPCs, locations) are procedurally generated
 * when a quest is created, so players can actually complete the quest
 */

const { NPC, Item, SubMap, Planet } = require('../models');
const npcGenerator = require('./npcGenerator');
const { getAllItemDefinitions } = require('../data/items');
const questPOIService = require('./questPOIService');

class QuestDependencyService {
  /**
   * Ensure all quest dependencies exist
   * @param {Object} quest - Quest instance
   * @param {Object} questGiver - NPC who gave the quest
   * @returns {Promise<Object>} Generated dependencies
   */
  async ensureQuestDependencies(quest, questGiver) {
    const dependencies = {
      items: [],
      npcs: [],
      locations: []
    };

    if (!quest.objectives || quest.objectives.length === 0) {
      return dependencies;
    }

    // Process each objective
    for (const objective of quest.objectives) {
      try {
        switch (objective.type) {
          case 'collect':
            await this.ensureCollectDependency(quest, questGiver, objective, dependencies);
            break;
          case 'deliver':
            await this.ensureDeliverDependency(quest, questGiver, objective, dependencies);
            break;
          case 'interact':
            await this.ensureInteractDependency(quest, questGiver, objective, dependencies);
            break;
          case 'defeat':
            await this.ensureDefeatDependency(quest, questGiver, objective, dependencies);
            break;
          case 'travel':
            await this.ensureTravelDependency(quest, questGiver, objective, dependencies);
            break;
          case 'discover':
            await this.ensureDiscoverDependency(quest, questGiver, objective, dependencies);
            break;
        }
      } catch (error) {
        console.error(`[Quest Dependencies] Error ensuring dependency for objective ${objective.id}:`, error);
        // Continue with other objectives even if one fails
      }
    }

    return dependencies;
  }

  /**
   * Ensure collect objective has items at the location
   */
  async ensureCollectDependency(quest, questGiver, objective, dependencies) {
    const itemId = objective.target;
    const count = objective.count || 1;
    const location = objective.location || questGiver.location;

    // Check if item definition exists
    const itemDef = getAllItemDefinitions()[itemId];
    if (!itemDef) {
      console.warn(`[Quest Dependencies] Item ${itemId} not found in item definitions`);
      return;
    }

    // Find or create item in database
    let item = await Item.findByPk(itemId);
    if (!item) {
      // Create item from definition
      item = await Item.create({
        id: itemDef.id,
        name: itemDef.name,
        itemType: itemDef.type,
        rarity: itemDef.rarity || 'common',
        description: itemDef.description || '',
        stats: itemDef.stats || {},
        equipmentSlot: itemDef.equipmentSlot || null,
        baseValue: itemDef.value || 0,
        weight: itemDef.weight || 0,
        factionId: itemDef.factionId || null,
        minReputationTier: itemDef.minReputationTier || null
      });
      console.log(`[Quest Dependencies] Created item: ${itemId}`);
    }

    // Get planet to create POI
    const planetId = questGiver.location?.planet || quest.startLocation?.planet;
    if (!planetId) {
      console.warn(`[Quest Dependencies] Cannot create POI: no planet ID found`);
      // Fallback to metadata storage
      this.storeItemInMetadata(quest, itemId, count, location);
      return;
    }

    const planet = await Planet.findByPk(planetId);
    if (!planet) {
      console.warn(`[Quest Dependencies] Planet ${planetId} not found, storing items in metadata`);
      this.storeItemInMetadata(quest, itemId, count, location);
      return;
    }

    // Create POI for this collect objective
    try {
      console.log(`[Quest Dependencies] Creating collect POI for objective ${objective.id} on planet ${planetId}`);
      const poi = await questPOIService.createPOIForObjective(quest, objective, questGiver, planet);
      
      // Reload quest to get fresh objectives array, then update
      await quest.reload();
      const objectives = quest.objectives || [];
      const objectiveIndex = objectives.findIndex(obj => obj.id === objective.id);
      if (objectiveIndex >= 0) {
        if (!objectives[objectiveIndex].metadata) {
          objectives[objectiveIndex].metadata = {};
        }
        objectives[objectiveIndex].metadata.poiId = poi.id;
        objectives[objectiveIndex].metadata.poiLocation = { x: poi.x, y: poi.y };
        quest.objectives = objectives;
        await quest.save();
        console.log(`[Quest Dependencies] Updated quest ${quest.id} with POI metadata for objective ${objective.id}`);
      }
      
      dependencies.items.push({ itemId, count, location, poiId: poi.id });
      dependencies.locations.push({ poiId: poi.id, poiName: poi.name, type: 'collect' });
      console.log(`[Quest Dependencies] ✓ Created POI ${poi.id} (${poi.name}) with ${count}x ${itemId} at (${poi.x}, ${poi.y})`);
    } catch (error) {
      console.error(`[Quest Dependencies] Error creating POI for collect objective:`, error);
      // Fallback to metadata storage
      this.storeItemInMetadata(quest, itemId, count, location);
    }
  }

  /**
   * Store items in quest metadata (fallback method)
   */
  storeItemInMetadata(quest, itemId, count, location) {
    if (!quest.miniQuestData) {
      quest.miniQuestData = {};
    }
    if (!quest.miniQuestData.itemLocations) {
      quest.miniQuestData.itemLocations = {};
    }
    
    const locationKey = this.getLocationKey(location);
    if (!quest.miniQuestData.itemLocations[locationKey]) {
      quest.miniQuestData.itemLocations[locationKey] = [];
    }
    
    quest.miniQuestData.itemLocations[locationKey].push({
      itemId: itemId,
      count: count,
      location: location
    });
  }

  /**
   * Ensure deliver objective has target NPC
   */
  async ensureDeliverDependency(quest, questGiver, objective, dependencies) {
    const targetNPCId = objective.target;
    
    // If target is the quest giver, no need to create
    if (targetNPCId === questGiver.id) {
      return;
    }

    // Check if NPC exists
    let targetNPC = await NPC.findByPk(targetNPCId);
    
    if (!targetNPC) {
      // Generate target NPC at the specified location
      const location = objective.location || questGiver.location;
      targetNPC = await this.generateTargetNPC(questGiver, location, objective);
      console.log(`[Quest Dependencies] Generated target NPC: ${targetNPC.id} (${targetNPC.name})`);
    }

    dependencies.npcs.push({ npcId: targetNPC.id, npcName: targetNPC.name, location: targetNPC.location });
  }

  /**
   * Ensure interact objective has target NPC
   */
  async ensureInteractDependency(quest, questGiver, objective, dependencies) {
    const targetNPCId = objective.target;
    
    // Skip if target is 'unknown_npc' placeholder
    if (targetNPCId === 'unknown_npc' || targetNPCId === 'target_npc') {
      // Generate a new NPC for this interaction
      const location = objective.location || questGiver.location;
      const targetNPC = await this.generateTargetNPC(questGiver, location, objective);
      
      // Update objective with actual NPC ID
      objective.target = targetNPC.id;
      await quest.save();
      
      dependencies.npcs.push({ npcId: targetNPC.id, npcName: targetNPC.name, location: targetNPC.location });
      console.log(`[Quest Dependencies] Generated interaction target NPC: ${targetNPC.id} (${targetNPC.name})`);
      return;
    }

    // Check if NPC exists
    let targetNPC = await NPC.findByPk(targetNPCId);
    
    if (!targetNPC) {
      // Generate target NPC
      const location = objective.location || questGiver.location;
      targetNPC = await this.generateTargetNPC(questGiver, location, objective);
      console.log(`[Quest Dependencies] Generated interaction NPC: ${targetNPC.id} (${targetNPC.name})`);
    }

    dependencies.npcs.push({ npcId: targetNPC.id, npcName: targetNPC.name, location: targetNPC.location });
  }

  /**
   * Ensure defeat objective has target NPC
   */
  async ensureDefeatDependency(quest, questGiver, objective, dependencies) {
    const targetNPCId = objective.target;
    
    // Skip if target is 'unknown_npc' placeholder
    if (targetNPCId === 'unknown_npc' || targetNPCId === 'target_npc') {
      // Generate a combat NPC for this objective
      const location = objective.location || questGiver.location;
      const targetNPC = await this.generateCombatNPC(questGiver, location, objective);
      
      // Update objective with actual NPC ID
      objective.target = targetNPC.id;
      await quest.save();
      
      dependencies.npcs.push({ npcId: targetNPC.id, npcName: targetNPC.name, location: targetNPC.location });
      console.log(`[Quest Dependencies] Generated combat target NPC: ${targetNPC.id} (${targetNPC.name})`);
      return;
    }

    // Check if NPC exists
    let targetNPC = await NPC.findByPk(targetNPCId);
    
    if (!targetNPC) {
      // Generate combat NPC
      const location = objective.location || questGiver.location;
      targetNPC = await this.generateCombatNPC(questGiver, location, objective);
      console.log(`[Quest Dependencies] Generated combat NPC: ${targetNPC.id} (${targetNPC.name})`);
    }

    dependencies.npcs.push({ npcId: targetNPC.id, npcName: targetNPC.name, location: targetNPC.location });
  }

  /**
   * Ensure travel objective has valid location
   */
  async ensureTravelDependency(quest, questGiver, objective, dependencies) {
    const location = objective.location || questGiver.location;
    
    if (!location) {
      console.warn(`[Quest Dependencies] Travel objective ${objective.id} has no location`);
      return;
    }

    // Get planet to create POI
    const planetId = questGiver.location?.planet || quest.startLocation?.planet;
    if (!planetId) {
      console.warn(`[Quest Dependencies] Cannot create travel POI: no planet ID found`);
      dependencies.locations.push({ location, type: 'travel' });
      return;
    }

    const planet = await Planet.findByPk(planetId);
    if (!planet) {
      console.warn(`[Quest Dependencies] Planet ${planetId} not found for travel objective`);
      dependencies.locations.push({ location, type: 'travel' });
      return;
    }

    // Create POI for travel destination
    try {
      const poi = await questPOIService.createPOIForObjective(quest, objective, questGiver, planet);
      
      // Reload quest to get fresh objectives array, then update
      await quest.reload();
      const objectives = quest.objectives || [];
      const objectiveIndex = objectives.findIndex(obj => obj.id === objective.id);
      if (objectiveIndex >= 0) {
        if (!objectives[objectiveIndex].metadata) {
          objectives[objectiveIndex].metadata = {};
        }
        objectives[objectiveIndex].metadata.poiId = poi.id;
        objectives[objectiveIndex].metadata.poiLocation = { x: poi.x, y: poi.y };
        quest.objectives = objectives;
        await quest.save();
        console.log(`[Quest Dependencies] Updated quest ${quest.id} with POI metadata for objective ${objective.id}`);
      }
      
      dependencies.locations.push({ poiId: poi.id, poiName: poi.name, location, type: 'travel' });
      console.log(`[Quest Dependencies] ✓ Created travel POI ${poi.id} (${poi.name}) at (${poi.x}, ${poi.y})`);
    } catch (error) {
      console.error(`[Quest Dependencies] Error creating travel POI:`, error);
      dependencies.locations.push({ location, type: 'travel' });
    }
  }

  /**
   * Ensure discover objective has valid location
   */
  async ensureDiscoverDependency(quest, questGiver, objective, dependencies) {
    const location = objective.location || questGiver.location;
    
    // Get planet to create POI
    const planetId = questGiver.location?.planet || quest.startLocation?.planet;
    if (!planetId) {
      console.warn(`[Quest Dependencies] Cannot create discover POI: no planet ID found for objective ${objective.id}`);
      dependencies.locations.push({ location, type: 'discover' });
      return;
    }

    const planet = await Planet.findByPk(planetId);
    if (!planet) {
      console.warn(`[Quest Dependencies] Planet ${planetId} not found for discover objective ${objective.id}`);
      dependencies.locations.push({ location, type: 'discover' });
      return;
    }

    // Create POI for discovery location
    try {
      console.log(`[Quest Dependencies] Creating discover POI for objective ${objective.id} on planet ${planetId}`);
      const poi = await questPOIService.createPOIForObjective(quest, objective, questGiver, planet);
      
      // Store POI ID in objective metadata
      if (!objective.metadata) {
        objective.metadata = {};
      }
      objective.metadata.poiId = poi.id;
      objective.metadata.poiLocation = { x: poi.x, y: poi.y };
      
      // Reload quest to get fresh objectives array, then update
      await quest.reload();
      const objectives = quest.objectives || [];
      const objectiveIndex = objectives.findIndex(obj => obj.id === objective.id);
      if (objectiveIndex >= 0) {
        if (!objectives[objectiveIndex].metadata) {
          objectives[objectiveIndex].metadata = {};
        }
        objectives[objectiveIndex].metadata.poiId = poi.id;
        objectives[objectiveIndex].metadata.poiLocation = { x: poi.x, y: poi.y };
        quest.objectives = objectives;
        await quest.save();
        console.log(`[Quest Dependencies] Updated quest ${quest.id} with POI metadata for objective ${objective.id}`);
      }
      
      dependencies.locations.push({ poiId: poi.id, poiName: poi.name, location, type: 'discover' });
      console.log(`[Quest Dependencies] ✓ Created discover POI ${poi.id} (${poi.name}) at (${poi.x}, ${poi.y})`);
    } catch (error) {
      console.error(`[Quest Dependencies] Error creating discover POI:`, error);
      console.error(error.stack);
      dependencies.locations.push({ location, type: 'discover' });
    }
  }

  /**
   * Generate a target NPC for quest objectives
   */
  async generateTargetNPC(questGiver, location, objective) {
    const planetId = location?.planet || questGiver.location?.planet;
    const area = location?.area || questGiver.location?.area || 'surface';
    
    // Get planet
    const planet = await Planet.findByPk(planetId);
    if (!planet) {
      throw new Error(`Planet ${planetId} not found for quest dependency`);
    }

    // Generate NPC template
    const npcId = `quest_target_${questGiver.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Determine NPC characteristics based on objective
    let npcType = 'generic';
    let occupation = 'citizen';
    let factionId = null;
    
    if (objective.deceptionType) {
      // For deceptive quests, target might be a rival or neutral NPC
      npcType = 'random_encounter';
      occupation = 'merchant';
    } else if (objective.sabotageType) {
      // For sabotage, target might be a guard or facility worker
      npcType = 'random_encounter';
      occupation = 'guard';
    }

    // Use quest giver's location as base
    const npcLocation = {
      planet: planetId,
      area: area,
      x: questGiver.location?.x || 0,
      y: questGiver.location?.y || 0
    };

    // Generate seeded random for consistent NPC generation
    let seedValue = npcId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const seededRandom = () => {
      seedValue = (seedValue * 9301 + 49297) % 233280;
      return seedValue / 233280;
    };

    // Generate NPC using npcGenerator
    const npc = await npcGenerator.generateNPC({
      id: npcId,
      name: this.generateNPCName(seededRandom),
      species: this.selectRandomSpecies(planet, seededRandom),
      occupation: occupation,
      npcType: npcType,
      location: npcLocation,
      factionId: factionId || questGiver.factionId,
      isCompanion: false,
      dialogue: {
        greeting: {
          stranger: 'Hello.',
          acquaintance: 'Oh, hello again.',
          friend: 'Good to see you.',
          confidant: 'My friend, welcome.'
        },
        questRelated: {},
        general: []
      },
      personalityTraits: {},
      biography: `A ${occupation} on ${planet.name}.`,
      seed: npcId,
      rnd: seededRandom
    });

    return npc;
  }

  /**
   * Generate a combat NPC for defeat objectives
   */
  async generateCombatNPC(questGiver, location, objective) {
    const planetId = location?.planet || questGiver.location?.planet;
    const area = location?.area || questGiver.location?.area || 'surface';
    
    // Get planet
    const planet = await Planet.findByPk(planetId);
    if (!planet) {
      throw new Error(`Planet ${planetId} not found for quest dependency`);
    }

    // Generate combat NPC
    const npcId = `quest_combat_${questGiver.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const npcLocation = {
      planet: planetId,
      area: area,
      x: questGiver.location?.x || 0,
      y: questGiver.location?.y || 0
    };

    // Generate seeded random for consistent NPC generation
    let seedValue = npcId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const seededRandom = () => {
      seedValue = (seedValue * 9301 + 49297) % 233280;
      return seedValue / 233280;
    };

    // Combat NPCs are typically enemies or rivals
    const npc = await npcGenerator.generateNPC({
      id: npcId,
      name: this.generateNPCName(seededRandom),
      species: this.selectRandomSpecies(planet, seededRandom),
      occupation: 'combatant',
      npcType: 'random_encounter',
      location: npcLocation,
      factionId: null, // Combat NPCs might be independent
      isCompanion: false,
      dialogue: {
        greeting: {
          stranger: 'What do you want?',
          acquaintance: 'You again?',
          friend: '',
          confidant: ''
        },
        questRelated: {},
        general: []
      },
      personalityTraits: {
        aggression: 70,
        hostility: 60
      },
      biography: `A combatant on ${planet.name}.`,
      seed: npcId,
      rnd: seededRandom
    });

    return npc;
  }

  /**
   * Generate NPC name
   */
  generateNPCName(rnd = Math.random) {
    const firstNames = ['Jax', 'Kira', 'Zara', 'Dex', 'Mira', 'Kai', 'Nova', 'Rex', 'Luna', 'Zoe'];
    const lastNames = ['Vex', 'Korr', 'Nex', 'Torr', 'Voss', 'Karr', 'Nox', 'Tarr', 'Vell', 'Kell'];
    const firstName = firstNames[Math.floor(rnd() * firstNames.length)];
    const lastName = lastNames[Math.floor(rnd() * lastNames.length)];
    return `${firstName} ${lastName}`;
  }

  /**
   * Select random species for planet
   */
  selectRandomSpecies(planet, rnd = Math.random) {
    // Common species across the galaxy
    const commonSpecies = ['human', 'twilek', 'rodian', 'zabrak', 'togruta', 'mirialan'];
    return commonSpecies[Math.floor(rnd() * commonSpecies.length)];
  }

  /**
   * Get location key for storage
   */
  getLocationKey(location) {
    if (typeof location === 'string') {
      return location;
    }
    if (location?.planet && location?.area) {
      return `${location.planet}_${location.area}`;
    }
    if (location?.planet) {
      return location.planet;
    }
    return 'unknown';
  }
}

module.exports = new QuestDependencyService();

