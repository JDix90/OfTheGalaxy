/**
 * POI Service
 * Handles POI interaction logic
 */

const { POIInteraction, PlayerCharacter, Planet } = require('../models');
const { Op } = require('sequelize');
const combatService = require('./combatService');
const questService = require('./questService');
const discoveryService = require('./discoveryService');
const inventoryService = require('./inventoryService');
const { getItemDefinition } = require('../data/items');

class POIService {
  /**
   * Get or create POI interaction record
   */
  async getOrCreateInteraction(characterId, planetId, poi) {
    // Ensure POI has required fields
    if (!poi) {
      throw new Error('POI object is required');
    }
    
    const poiId = poi.id || poi.name || String(poi); // Use ID if available, otherwise name, or convert to string
    const poiName = poi.name || poiId || 'Unknown POI';
    const poiType = poi.type || 'unknown';
    
    if (!poiId || poiId === 'undefined') {
      throw new Error('POI must have an id or name');
    }
    
    let interaction = await POIInteraction.findOne({
      where: {
        characterId,
        planetId,
        poiId
      }
    });

    if (!interaction) {
      // Determine interaction type based on POI type
      let interactionType = this.determineInteractionType(poi);
      
      // Validate interaction type is allowed
      const allowedTypes = ['combat', 'loot', 'quest', 'discovery', 'fast_travel', 'enter', 'investigate', 'medical', 'harvest'];
      if (!allowedTypes.includes(interactionType)) {
        console.warn(`Invalid interaction type determined: ${interactionType} for POI type: ${poiType}, defaulting to 'investigate'`);
        interactionType = 'investigate';
      }
      
      try {
        interaction = await POIInteraction.create({
          characterId,
          planetId,
          poiId,
          poiName,
          poiType,
          interactionType,
          state: 'undiscovered'
        });
      } catch (createError) {
        // Handle unique constraint error (race condition - another request created it)
        if (createError.name === 'SequelizeUniqueConstraintError' || 
            createError.name === 'SequelizeDatabaseError' ||
            (createError.parent && createError.parent.code === '23505')) {
          // Try to find the existing interaction that was just created
          console.log('POI interaction already exists (race condition), fetching existing record:', {
            characterId,
            planetId,
            poiId
          });
          interaction = await POIInteraction.findOne({
            where: {
              characterId,
              planetId,
              poiId
            }
          });
          
          if (!interaction) {
            // If we still can't find it, throw the original error
            console.error('Failed to find existing POIInteraction after unique constraint error:', {
              error: createError.message,
              data: { characterId, planetId, poiId }
            });
            throw createError;
          }
        } else {
          // For other errors, log and rethrow
          console.error('Error creating POIInteraction:', {
            error: createError.message,
            name: createError.name,
            validationErrors: createError.errors,
            data: { characterId, planetId, poiId, poiName, poiType, interactionType }
          });
          throw createError;
        }
      }
    }

    return interaction;
  }

  /**
   * Determine interaction type based on POI type
   */
  determineInteractionType(poi) {
    // Map POI types to interaction types
    const typeMap = {
      'danger': 'combat',
      'base': 'combat',
      'pirate': 'combat',
      'hostile': 'combat',
      'temple': 'quest',
      'government': 'quest',
      'palace': 'quest',
      'landscape': 'discovery',
      'ruins': 'loot',
      'wreck': 'loot',
      'cache': 'loot',
      'spaceport': 'fast_travel',
      'medical_center': 'medical',
      'market': 'enter',
      'cantina': 'enter',
      'entertainment': 'enter',
      'mine': 'harvest',
      'wilderness': 'harvest'
    };

    return typeMap[poi.type] || 'investigate';
  }

  /**
   * Interact with a POI
   */
  async interactWithPOI(characterId, planetId, poi, interactionType = null) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    const planet = await Planet.findByPk(planetId);
    if (!planet) {
      throw new Error('Planet not found');
    }

    // Get or create interaction record
    const interaction = await this.getOrCreateInteraction(characterId, planetId, poi);
    
    // Determine interaction type if not provided
    let finalInteractionType = interactionType || interaction.interactionType;
    
    // Validate interaction type is allowed
    const allowedTypes = ['combat', 'loot', 'quest', 'discovery', 'fast_travel', 'enter', 'investigate', 'medical', 'harvest'];
    if (finalInteractionType && !allowedTypes.includes(finalInteractionType)) {
      console.warn(`Invalid interaction type provided: ${finalInteractionType}, defaulting to interaction's type: ${interaction.interactionType}`);
      finalInteractionType = interaction.interactionType;
    }

    // Update interaction state
    const now = new Date();
    if (interaction.state === 'undiscovered') {
      interaction.state = 'discovered';
      interaction.firstInteractionAt = now;
    }
    interaction.lastInteractionAt = now;
    interaction.interactionCount += 1;

    let result = {
      success: true,
      interaction,
      rewards: null,
      combatEncounter: null,
      questTriggered: null
    };

    // Handle different interaction types
    switch (finalInteractionType) {
      case 'combat':
        result = await this.handleCombatPOI(character, planet, poi, interaction);
        break;
      case 'loot':
        result = await this.handleLootPOI(character, planet, poi, interaction);
        break;
      case 'quest':
        result = await this.handleQuestPOI(character, planet, poi, interaction);
        break;
      case 'discovery':
        result = await this.handleDiscoveryPOI(character, planet, poi, interaction);
        break;
      case 'fast_travel':
        result = await this.handleFastTravelPOI(character, planet, poi, interaction);
        break;
      case 'enter':
        result = await this.handleEnterPOI(character, planet, poi, interaction);
        break;
      case 'investigate':
        result = await this.handleInvestigatePOI(character, planet, poi, interaction);
        break;
      case 'medical':
        result = await this.handleMedicalPOI(character, planet, poi, interaction);
        break;
      case 'harvest':
        result = await this.handleHarvestPOI(character, planet, poi, interaction);
        break;
      default:
        result.message = `Unknown interaction type: ${finalInteractionType}`;
    }

    // Save interaction
    await interaction.save();

    return result;
  }

  /**
   * Handle combat POI
   */
  async handleCombatPOI(character, planet, poi, interaction) {
    // Generate enemies based on POI danger level
    const dangerLevel = poi.dangerLevel || planet.dangerLevel || 5;
    const numEnemies = Math.min(3, Math.ceil(dangerLevel / 3) + Math.floor(Math.random() * 2));
    
    const enemies = [];
    for (let i = 0; i < numEnemies; i++) {
      // Generate appropriate enemy type based on POI
      const enemyTypes = this.getEnemyTypesForPOI(poi);
      const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      enemies.push(enemyType);
    }

    // Create combat encounter
    const encounter = await combatService.createEncounter(
      character.id,
      'poi',
      enemies
    );

    interaction.state = 'discovered'; // Will be updated to 'completed' after combat victory
    interaction.metadata = {
      ...interaction.metadata,
      encounterId: encounter.id,
      enemies: enemies
    };

    return {
      success: true,
      interaction,
      combatEncounter: encounter,
      message: `Combat encounter triggered at ${poi.name}`
    };
  }

  /**
   * Handle loot POI
   */
  async handleLootPOI(character, planet, poi, interaction) {
    if (interaction.state === 'searched') {
      return {
        success: false,
        interaction,
        message: 'This location has already been searched'
      };
    }

    // Generate loot
    const loot = this.generateLoot(poi, planet);
    const rewards = {
      credits: loot.credits || 0,
      items: loot.items || []
    };

    // Add credits
    if (rewards.credits > 0) {
      character.credits += rewards.credits;
      await character.save();
    }

    // Add items to inventory
    for (const item of rewards.items) {
      await inventoryService.addItem(character.id, item.itemId, item.quantity || 1);
    }

    interaction.state = 'searched';
    interaction.metadata = {
      ...interaction.metadata,
      lootFound: rewards
    };

    return {
      success: true,
      interaction,
      rewards,
      message: `Found ${rewards.credits} credits and ${rewards.items.length} items`
    };
  }

  /**
   * Handle quest POI
   */
  async handleQuestPOI(character, planet, poi, interaction) {
    // Check for available quests at this POI
    // This would integrate with quest system to trigger quests
    const questTriggered = null; // Placeholder for quest integration

    interaction.state = 'discovered';
    interaction.metadata = {
      ...interaction.metadata,
      questTriggered
    };

    return {
      success: true,
      interaction,
      questTriggered,
      message: `Investigated ${poi.name}`
    };
  }

  /**
   * Handle discovery POI
   */
  async handleDiscoveryPOI(character, planet, poi, interaction) {
    // Record discovery
    await discoveryService.recordDiscovery(
      character.id,
      planet.id,
      'poi',
      poi.id || poi.name,
      {
        name: poi.name,
        type: poi.type,
        description: poi.description,
        coordinates: { x: poi.x, y: poi.y }
      }
    );

    // Explore/Discover on a quest POI must ALSO collect its items + credit the bound objective
    // (this is the action a player naturally takes to "go find the items / reach the place");
    // previously only Investigate/Enter collected, so Exploring a quest POI did nothing.
    const { itemsGranted, objectivesCredited } = await this.collectQuestItemsFromPOI(character, poi);
    objectivesCredited.push(...await this.creditQuestPOIObjective(character, poi));

    interaction.state = 'discovered';
    interaction.metadata = {
      ...interaction.metadata,
      discovered: true
    };

    let message = `Discovered ${poi.name}`;
    if (itemsGranted.length > 0) {
      message += `. Found: ${itemsGranted.map(i => `${i.count}x ${i.itemId}`).join(', ')}`;
    }

    return {
      success: true,
      interaction,
      message: message,
      itemsGranted: itemsGranted,
      objectivesCredited: objectivesCredited
    };
  }

  /**
   * Handle fast travel POI
   */
  async handleFastTravelPOI(character, planet, poi, interaction) {
    // Discover fast travel point
    const poiId = poi.id || poi.name;
    await discoveryService.recordDiscovery(
      character.id,
      planet.id,
      'fast_travel_point',
      poiId,
      {
        name: poi.name,
        type: poi.type,
        description: poi.description,
        coordinates: { x: poi.x, y: poi.y }
      }
    );

    interaction.state = 'discovered';
    
    return {
      success: true,
      interaction,
      message: `Fast travel point unlocked: ${poi.name}`
    };
  }

  /**
   * Handle enter POI (sub-map)
   */
  async handleEnterPOI(character, planet, poi, interaction) {
    const subMapService = require('./subMapService');

    // Check for quest items at this POI (before entering sub-map) + credit any bound reach objective
    const { itemsGranted, objectivesCredited } = await this.collectQuestItemsFromPOI(character, poi);
    objectivesCredited.push(...await this.creditQuestPOIObjective(character, poi));

    // Determine sub-map type from POI type
    // Check if this is a dungeon POI first
    const isDungeon = poi.type === 'danger' || 
                      poi.type === 'mine' || 
                      poi.type === 'underworld' || 
                      poi.type === 'cave' || 
                      poi.type === 'ruins' || 
                      poi.type === 'fortress' ||
                      (poi.metadata && poi.metadata.isDungeon === true) ||
                      (poi.dangerLevel && poi.dangerLevel >= 6);
    
    let subMapType = poi.type;
    if (isDungeon) {
      subMapType = 'dungeon';
    } else if (poi.type === 'medical_center') {
      subMapType = 'medical_center';
    } else if (poi.type === 'spaceport') {
      subMapType = 'spaceport';
    } else if (poi.type === 'market') {
      subMapType = 'market';
    } else if (poi.type === 'city') {
      subMapType = 'city';
    } else if (poi.type === 'settlement') {
      subMapType = 'settlement';
    } else if (poi.type === 'province') {
      subMapType = 'settlement'; // Provinces use settlement layout
    } else {
      // Default to city for unknown types
      subMapType = 'city';
    }
    
    // Get or create sub-map for this POI
    // Pass the original POI type as parentLocationType so dungeon generator can determine dungeon type
    const poiId = poi.id || poi.name;
    const subMap = await subMapService.getSubMapForLocation(
      planet.id,
      poiId,
      isDungeon ? poi.type : 'poi', // Pass POI type for dungeons, 'poi' for others
      subMapType
    );
    
    interaction.state = 'discovered';
    interaction.metadata = {
      ...interaction.metadata,
      subMapId: subMap.id,
      enteredAt: new Date()
    };
    
    let message = `Entered ${poi.name}`;
    if (itemsGranted.length > 0) {
      const itemNames = itemsGranted.map(item => `${item.count}x ${item.itemId}`).join(', ');
      message += `. Found: ${itemNames}`;
    }
    
    return {
      success: true,
      interaction,
      subMap,
      message: message,
      itemsGranted: itemsGranted,
      objectivesCredited: objectivesCredited
    };
  }

  /**
   * Collect quest items from a POI (shared by Enter / Investigate / Explore).
   * Returns { itemsGranted, objectivesCredited } so callers can give the player feedback.
   *
   * A quest-`collect` POI carries `questItems: [{ itemId, count, questId, objectiveId }]` (stamped
   * by questPOIService) where `count` is the FULL amount the objective needs. Interacting with the
   * POI is the "find the items" gameplay beat, so this:
   *   - grants the real item BEST-EFFORT (a missing/flavor item id must NOT block the objective);
   *   - credits the objective, accumulating progress and marking it COMPLETE when the target is met
   *     (previously hard-coded `completed:false`, which soft-locked the quest — it could never be
   *     turned in even after collecting).
   */
  async collectQuestItemsFromPOI(character, poi) {
    const questItems = poi.questItems || [];
    const itemsGranted = [];
    const objectivesCredited = []; // { questId, objectiveId, questTitle, itemId, count, completed }
    if (questItems.length === 0) return { itemsGranted, objectivesCredited };

    const { QuestProgress, Quest } = require('../models');
    const inventoryService = require('./inventoryService');
    const questService = require('./questService');

    const activeQuests = await QuestProgress.findAll({
      where: { characterId: character.id, status: 'active' },
      include: [{ model: Quest, as: 'quest' }]
    });

    for (const questItem of questItems) {
      const matchingQuest = activeQuests.find(qp => qp.quest && qp.quest.id === questItem.questId);
      if (!matchingQuest) continue;
      const quest = matchingQuest.quest || await Quest.findByPk(matchingQuest.questId);
      if (!quest) continue;
      const objective = (quest.objectives || []).find(obj => obj.id === questItem.objectiveId);
      if (!objective) continue;
      if (matchingQuest.objectivesCompleted?.[objective.id]) continue; // already done

      const count = questItem.count || 1;

      // Best-effort grant the actual item — never let a missing/invalid item id (some quest targets
      // are flavor strings, not real item ids) block the objective credit below.
      try {
        await inventoryService.addItem(character.id, questItem.itemId, count, `quest_${quest.id}`);
        itemsGranted.push({ itemId: questItem.itemId, count });
        console.log(`[POI Service] Granted ${count}x ${questItem.itemId} to character ${character.id} from quest POI`);
      } catch (itemError) {
        console.warn(`[POI Service] quest item '${questItem.itemId}' not grantable (${itemError.message}); crediting objective anyway`);
      }

      // Credit the objective: accumulate against the target and complete when met.
      const target = objective.count || objective.quantity || 1;
      const prevProgress = Number(matchingQuest.objectiveProgress?.[objective.id]) || 0;
      const newProgress = Math.min(target, prevProgress + count);
      const completed = newProgress >= target;
      try {
        await questService.updateObjective(character.id, quest.id, objective.id, completed, newProgress);
        objectivesCredited.push({ questId: quest.id, objectiveId: objective.id, questTitle: quest.title, itemId: questItem.itemId, count, completed });
        console.log(`[POI Service] Credited collect objective ${quest.id}/${objective.id}: ${newProgress}/${target}${completed ? ' (COMPLETE)' : ''}`);
      } catch (credErr) {
        console.error(`[POI Service] Failed to credit collect objective ${quest.id}/${objective.id}:`, credErr.message);
      }
    }

    return { itemsGranted, objectivesCredited };
  }

  /**
   * Credit a quest POI's BOUND objective directly via `poi.questRelated` ({questId, objectiveId}).
   * Used for `discover` / `travel` objectives that are satisfied simply by reaching/interacting
   * with the POI (collect is count-based → handled by collectQuestItemsFromPOI; defeat is credited
   * by the combat kill funnel). This binding is reliable where the old discover-by-name/locationId
   * matching was not (POI ids never matched objective.target). Returns objectivesCredited entries.
   */
  async creditQuestPOIObjective(character, poi) {
    const qr = poi.questRelated;
    if (!qr || !qr.questId || !qr.objectiveId) return [];
    const { QuestProgress, Quest } = require('../models');
    const questService = require('./questService');

    const qp = await QuestProgress.findOne({ where: { characterId: character.id, questId: qr.questId, status: 'active' } });
    if (!qp) return [];
    if (qp.objectivesCompleted?.[qr.objectiveId]) return [];
    const quest = await Quest.findByPk(qr.questId);
    const objective = quest && (quest.objectives || []).find(o => o.id === qr.objectiveId);
    if (!objective) return [];
    // Only auto-complete reach/find objectives here.
    if (!['discover', 'travel'].includes(objective.type)) return [];

    try {
      await questService.updateObjective(character.id, qr.questId, qr.objectiveId, true, 1);
      console.log(`[POI Service] Completed ${objective.type} objective ${qr.questId}/${qr.objectiveId} on POI interaction`);
      return [{ questId: qr.questId, objectiveId: qr.objectiveId, questTitle: quest.title, completed: true }];
    } catch (e) {
      console.error(`[POI Service] Failed to credit quest-POI objective ${qr.questId}/${qr.objectiveId}:`, e.message);
      return [];
    }
  }

  /**
   * Handle investigate POI
   */
  async handleInvestigatePOI(character, planet, poi, interaction) {
    // Generic investigation
    interaction.state = 'discovered';

    // Check for quest items at this POI + credit any bound reach (discover/travel) objective
    const { itemsGranted, objectivesCredited } = await this.collectQuestItemsFromPOI(character, poi);
    objectivesCredited.push(...await this.creditQuestPOIObjective(character, poi));

    // Get lore-accurate description for the POI
    const loreDescription = this.getPOILoreDescription(poi, planet);

    let message = `Investigated ${poi.name}`;
    if (itemsGranted.length > 0) {
      const itemNames = itemsGranted.map(item => `${item.count}x ${item.itemId}`).join(', ');
      message += `. Found: ${itemNames}`;
    }

    return {
      success: true,
      interaction,
      lore: loreDescription,
      message: message,
      itemsGranted: itemsGranted,
      objectivesCredited: objectivesCredited
    };
  }

  /**
   * Get lore-accurate description for a POI
   */
  getPOILoreDescription(poi, planet) {
    const poiType = poi.type || 'unknown';
    const poiName = poi.name || 'Unknown Location';
    const planetName = planet?.name || 'Unknown Planet';
    
    // Use existing description if available and detailed
    if (poi.description && poi.description.length > 50) {
      return poi.description;
    }
    
    // Generate lore-accurate descriptions based on POI type
    const loreDescriptions = {
      'temple': `The ${poiName} stands as an ancient monument to the Veil. Its architecture reflects centuries of Keeper tradition, with towering spires reaching toward the sky. The interior is said to contain ancient holocrons and artifacts of great power. Many have sought to understand its mysteries, but few have uncovered its deepest secrets.`,
      'government': `The ${poiName} serves as the seat of power on ${planetName}. Its imposing structure houses the planet's administrative offices and meeting chambers. The building's design reflects the authority and stability of the local government, with security measures visible throughout.`,
      'palace': `The ${poiName} is a magnificent structure that once served as the residence of ${planetName}'s ruling elite. Its opulent halls and grand architecture speak to a bygone era of wealth and influence. Though its original occupants may be gone, the building retains an air of regal authority.`,
      'spaceport': `The ${poiName} is a bustling hub of interstellar travel. Ships of all sizes dock here, from small freighters to massive capital ships. The constant flow of travelers and cargo makes this one of the busiest locations on ${planetName}. The facility includes landing pads, maintenance bays, and passenger terminals.`,
      'market': `The ${poiName} is a vibrant commercial district where traders from across the galaxy converge. Stalls and shops line the streets, offering everything from basic supplies to rare artifacts. The air is filled with the sounds of haggling merchants and the smells of exotic foods.`,
      'medical_center': `The ${poiName} provides essential medical services to the inhabitants of ${planetName}. Equipped with advanced medical technology, the facility can treat everything from minor injuries to life-threatening conditions. The staff are trained in both conventional and specialized medical procedures.`,
      'entertainment': `The ${poiName} is a lively entertainment district known for its nightlife and cultural attractions. Here, visitors can find cantinas, theaters, and various forms of recreation. The area comes alive after dark, with music and lights filling the streets.`,
      'ruins': `The ${poiName} are the remains of an ancient structure, its original purpose lost to time. Crumbling walls and weathered stone suggest it was once something significant. Archaeologists and treasure hunters are drawn to such sites, hoping to uncover secrets from the past.`,
      'wreck': `The ${poiName} is the wreckage of a crashed starship, its hull twisted and broken. Scavengers have likely picked over the remains, but there may still be valuable components or cargo hidden within. The wreck serves as a reminder of the dangers of space travel.`,
      'cache': `A hidden cache has been discovered at ${poiName}. Such locations are often used by smugglers or rebels to store supplies and equipment. The contents may include weapons, credits, or other valuable items, but accessing them could be dangerous.`,
      'base': `The ${poiName} appears to be a military or paramilitary installation. Its defensive structures and strategic location suggest it serves an important tactical purpose. Approaching such facilities requires caution, as they are likely well-guarded.`,
      'danger': `The ${poiName} is marked as a dangerous area. Local authorities advise against entering, as the location is known for criminal activity or environmental hazards. Those who venture here do so at their own risk.`,
    };
    
    return loreDescriptions[poiType] || `The ${poiName} is a notable location on ${planetName}. ${poi.description || 'Little is known about this place, but it draws the attention of travelers and locals alike.'}`;
  }

  /**
   * Handle medical center POI
   */
  async handleMedicalPOI(character, planet, poi, interaction) {
    // Medical centers allow healing
    // Check if character needs healing
    const healthPercent = (character.currentHealth / character.maxHealth) * 100;
    
    if (healthPercent >= 100) {
      return {
        success: false,
        interaction,
        message: 'You are already at full health'
      };
    }

    // Calculate healing cost
    const missingHealth = character.maxHealth - character.currentHealth;
    const healingCost = Math.floor(missingHealth * 2); // 2 credits per HP

    // Check if player can afford it
    if (character.credits < healingCost) {
      return {
        success: false,
        interaction,
        message: `Insufficient credits. Healing costs ${healingCost} credits.`
      };
    }

    // Heal character
    character.currentHealth = character.maxHealth;
    character.credits -= healingCost;

    await character.save();

    interaction.state = 'discovered';
    interaction.metadata = {
      ...interaction.metadata,
      lastHealing: new Date(),
      healingCost
    };
    await interaction.save();

    return {
      success: true,
      interaction,
      rewards: {
        healthRestored: missingHealth,
        cost: healingCost
      },
      message: `Healed to full health for ${healingCost} credits`
    };
  }

  /**
   * Handle harvest POI (resource gathering)
   */
  async handleHarvestPOI(character, planet, poi, interaction) {
    // Check if planet has resources defined
    if (!planet.resources || !Array.isArray(planet.resources) || planet.resources.length === 0) {
      return {
        success: false,
        interaction,
        message: 'No resources available at this location'
      };
    }

    // Find resources available at this POI location
    const poiName = poi.name || poi.id;
    const availableResources = planet.resources.filter(resource => {
      if (!resource.locations || !Array.isArray(resource.locations)) {
        return false;
      }
      // Check if POI name matches any location in the resource's locations array
      return resource.locations.some(location => 
        location.toLowerCase().includes(poiName.toLowerCase()) ||
        poiName.toLowerCase().includes(location.toLowerCase())
      );
    });

    if (availableResources.length === 0) {
      return {
        success: false,
        interaction,
        message: `No harvestable resources found at ${poiName}`
      };
    }

    // Harvest resources (with some randomness)
    const harvestedResources = [];
    const rewards = {
      items: []
    };

    for (const resource of availableResources) {
      // 70% chance to harvest each resource
      if (Math.random() < 0.7) {
        // Determine quantity based on rarity
        let quantity = 1;
        const rarityMultipliers = {
          'common': 3,
          'uncommon': 2,
          'rare': 1,
          'epic': 1,
          'legendary': 1
        };
        const multiplier = rarityMultipliers[resource.rarity] || 1;
        quantity = Math.floor(Math.random() * multiplier) + 1;

        // Check if resource item exists in items database
        const itemDef = getItemDefinition(resource.id);
        if (!itemDef) {
          console.warn(`Resource item ${resource.id} not found in items database, skipping`);
          continue;
        }

        // Add to inventory
        try {
          await inventoryService.addItem(character.id, resource.id, quantity, 'harvest');
          harvestedResources.push({
            itemId: resource.id,
            name: resource.name,
            quantity
          });
          rewards.items.push({
            itemId: resource.id,
            quantity
          });
        } catch (error) {
          console.error(`Failed to add resource ${resource.id} to inventory:`, error);
        }
      }
    }

    if (harvestedResources.length === 0) {
      return {
        success: false,
        interaction,
        message: 'No resources were successfully harvested this time'
      };
    }

    // Update interaction state
    const lastHarvest = interaction.metadata?.lastHarvest ? new Date(interaction.metadata.lastHarvest) : null;
    const harvestCount = (interaction.metadata?.harvestCount || 0) + 1;
    
    interaction.state = 'discovered';
    interaction.metadata = {
      ...interaction.metadata,
      lastHarvest: new Date(),
      harvestCount,
      totalHarvested: (interaction.metadata?.totalHarvested || 0) + harvestedResources.length
    };

    const resourceNames = harvestedResources.map(r => `${r.quantity}x ${r.name}`).join(', ');
    return {
      success: true,
      interaction,
      rewards,
      message: `Harvested: ${resourceNames}`
    };
  }

  /**
   * Get enemy types for POI
   */
  getEnemyTypesForPOI(poi) {
    const enemyMap = {
      'danger': ['ironclad', 'pirate'],
      'base': ['ironclad', 'dominion_officer'],
      'pirate': ['pirate', 'smuggler'],
      'hostile': ['bounty_hunter', 'thug']
    };

    return enemyMap[poi.type] || ['ironclad'];
  }

  /**
   * Generate loot for POI
   */
  generateLoot(poi, planet) {
    const loot = {
      credits: 0,
      items: []
    };

    // Base credits based on POI type
    const creditRanges = {
      'ruins': [50, 200],
      'wreck': [100, 300],
      'cache': [200, 500]
    };

    const range = creditRanges[poi.type] || [10, 50];
    loot.credits = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];

    // Chance for items
    if (Math.random() < 0.3) {
      // Add random item
      const itemTypes = ['consumable', 'equipment'];
      const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
      // This would use item definitions
      loot.items.push({
        itemId: 'medpac_01', // Placeholder
        quantity: 1
      });
    }

    return loot;
  }

  /**
   * Get POI interactions for character on planet
   */
  async getPOIInteractions(characterId, planetId) {
    return await POIInteraction.findAll({
      where: {
        characterId,
        planetId
      }
    });
  }

  /**
   * Get POI interaction state
   */
  async getPOIState(characterId, planetId, poiId) {
    const interaction = await POIInteraction.findOne({
      where: {
        characterId,
        planetId,
        poiId
      }
    });

    return interaction ? interaction.state : 'undiscovered';
  }

  /**
   * Update POI state after combat
   */
  async updatePOIAfterCombat(characterId, planetId, poiId, combatWon) {
    const interaction = await POIInteraction.findOne({
      where: {
        characterId,
        planetId,
        poiId
      }
    });

    if (interaction && interaction.interactionType === 'combat') {
      if (combatWon) {
        interaction.state = 'completed';
        // Award loot after combat victory
        const poi = { id: poiId }; // Would need to fetch actual POI data
        const planet = await Planet.findByPk(planetId);
        const loot = this.generateLoot(poi, planet);
        interaction.metadata = {
          ...interaction.metadata,
          lootAwarded: loot
        };
      } else {
        interaction.state = 'failed';
      }
      await interaction.save();
    }
  }
}

module.exports = new POIService();

