/**
 * Mini-Quest Service
 * Generates dynamic mini-quests from NPC motivations, personality, and needs
 * Supports full moral spectrum: altruistic, neutral, deceptive, criminal
 */

const { Quest, NPC } = require('../models');

class MiniQuestService {
  /**
   * Generate a mini-quest from NPC motivation/need
   * @param {Object} npc - NPC instance
   * @param {Object} character - Player character
   * @param {Object} context - Context (urgent need, motivation, etc.)
   * @returns {Promise<Quest>} Generated mini-quest
   */
  async generateMiniQuest(npc, character, context) {
    // Determine moral alignment based on NPC personality and motivation
    const moralAlignment = this.determineMoralAlignment(npc, context);
    
    // Generate quest based on moral alignment and context
    const questData = await this.generateQuestData(npc, character, context, moralAlignment);
    
    // Generate quest ID
    const questId = this.generateQuestId(npc, context, moralAlignment);
    
    // Check if quest already exists
    const existing = await Quest.findByPk(questId);
    if (existing) {
      return existing;
    }
    
    // Create quest
    const quest = await Quest.create({
      id: questId,
      questType: 'mini',
      moralAlignment: moralAlignment,
      title: questData.title,
      description: questData.description,
      shortDescription: questData.shortDescription || questData.description.substring(0, 500),
      objectives: questData.objectives,
      rewards: questData.rewards,
      prerequisites: {
        level: 1,
        reputation: {},
        completedQuests: [],
        items: []
      },
      questGiverId: npc.id,
      startLocation: {
        planet: npc.location?.planet || null,
        area: npc.location?.area || null
      },
      estimatedTime: this.estimateTime(questData.objectives),
      difficulty: this.determineDifficulty(context, moralAlignment),
      isActive: true,
      miniQuestData: {
        needType: context.urgentNeed?.type || null,
        motivationType: npc.motivations?.primaryGoal?.type || null,
        urgency: context.urgentNeed?.urgency || 0.5,
        generatedFrom: npc.id,
        expiresAt: this.calculateExpiration(context.urgentNeed?.urgency || 0.5),
        relationshipBonus: questData.relationshipBonus,
        moralAlignment: moralAlignment,
        consequences: questData.consequences,
        itemLocations: {} // Will be populated by dependency service
      }
    });
    
    // Ensure all quest dependencies exist (items, NPCs, locations)
    const questDependencyService = require('./questDependencyService');
    try {
      const generatedDependencies = await questDependencyService.ensureQuestDependencies(quest, npc);
      console.log(`[Mini-Quest] Generated dependencies:`, {
        items: generatedDependencies.items.length,
        npcs: generatedDependencies.npcs.length,
        locations: generatedDependencies.locations.length
      });
    } catch (error) {
      console.error(`[Mini-Quest] Error ensuring quest dependencies:`, error);
      // Don't fail quest creation if dependency generation fails - quest can still be attempted
    }
    
    return quest;
  }

  /**
   * Determine moral alignment based on NPC personality and motivation
   */
  determineMoralAlignment(npc, context) {
    const personality = npc.personalityProfile || {};
    const motivation = npc.motivations?.primaryGoal || {};
    const faction = npc.factionId;
    const urgentNeed = context.urgentNeed;
    
    // Base alignment from personality traits
    let alignmentScore = 0;
    
    // Agreeableness influences alignment (high = good, low = evil)
    if (personality.agreeableness > 70) {
      alignmentScore += 2;
    } else if (personality.agreeableness < 30) {
      alignmentScore -= 2;
    }
    
    // Conscientiousness influences alignment
    if (personality.conscientiousness > 70) {
      alignmentScore += 1;
    } else if (personality.conscientiousness < 30) {
      alignmentScore -= 1;
    }
    
    // Neuroticism can push toward desperate actions
    if (personality.neuroticism > 70) {
      alignmentScore -= 1;
    }
    
    // Motivation type influences alignment
    const motivationAlignment = {
      survival: 0,      // Neutral
      wealth: -1,       // Slightly negative (greed)
      knowledge: 1,     // Positive (curiosity)
      revenge: -3,      // Very negative
      duty: 1,          // Positive (responsibility)
      freedom: 0,       // Neutral
      power: -2,        // Negative (ambition)
      honor: 1          // Positive
    };
    
    alignmentScore += motivationAlignment[motivation.type] || 0;
    
    // Faction alignment modifiers
    const factionAlignment = {
      'iron_dominion': -1,
      'ascendancy': -1,
      'hollow': -2,
      'vorr': -2,
      'vorr_cartel': -2,
      'free_worlds': 1,
      'uprising': 1,
      'keeper_order': 2,
      'concord': 1
    };
    
    alignmentScore += factionAlignment[faction] || 0;
    
    // Urgency can push toward desperate actions
    if (urgentNeed && urgentNeed.urgency > 0.8) {
      alignmentScore -= 1; // Desperate times = desperate measures
    }
    
    // Random variation (±1)
    alignmentScore += Math.floor(Math.random() * 3) - 1;
    
    // Determine alignment category
    if (alignmentScore >= 3) {
      return 'altruistic';
    } else if (alignmentScore >= 1) {
      return 'neutral';
    } else if (alignmentScore >= -1) {
      return 'deceptive';
    } else {
      return 'criminal';
    }
  }

  /**
   * Generate quest data based on moral alignment
   */
  async generateQuestData(npc, character, context, moralAlignment) {
    const urgentNeed = context.urgentNeed;
    const motivation = npc.motivations?.primaryGoal;
    
    switch(moralAlignment) {
      case 'altruistic':
        return this.generateAltruisticQuest(npc, character, urgentNeed);
      case 'neutral':
        return this.generateNeutralQuest(npc, character, urgentNeed, motivation);
      case 'deceptive':
        return await this.generateDeceptiveQuest(npc, character, urgentNeed, motivation);
      case 'criminal':
        return await this.generateCriminalQuest(npc, character, urgentNeed, motivation);
      default:
        return this.generateNeutralQuest(npc, character, urgentNeed, motivation);
    }
  }

  /**
   * Generate altruistic quest
   */
  generateAltruisticQuest(npc, character, urgentNeed) {
    const needType = urgentNeed?.type || 'supplies';
    
    const questTypes = {
      food: {
        title: `Help ${npc.name} Find Food`,
        description: `${npc.name} is struggling to find enough food. They need your help gathering supplies.`,
        shortDescription: `Help ${npc.name} gather food supplies.`,
        objectives: [
          {
            id: 'collect_food',
            type: 'collect',
            description: `Collect ${this.getFoodAmount(urgentNeed?.urgency || 0.5)} food items`,
            target: this.getItemForQuest('food_item'),
            count: this.getFoodAmount(urgentNeed?.urgency || 0.5),
            location: this.getLocationHint(npc)
          },
          {
            id: 'deliver_food',
            type: 'deliver',
            description: `Deliver the food to ${npc.name}`,
            target: npc.id
          }
        ],
        rewards: {
          xp: 75,
          credits: 30,
          reputation: npc.factionId ? { [npc.factionId]: 10 } : {},
          items: [],
          unlocks: []
        },
        relationshipBonus: 15,
        consequences: {
          reputationChanges: npc.factionId ? { [npc.factionId]: 5 } : {},
          factionChanges: {}
        }
      },
      safety: {
        title: `Escort ${npc.name} to Safety`,
        description: `${npc.name} feels unsafe in their current location and needs an escort to a safer area.`,
        shortDescription: `Escort ${npc.name} to a safe location.`,
        objectives: [
          {
            id: 'escort_npc',
            type: 'escort',
            description: `Escort ${npc.name} to a safe location`,
            location: this.findSafeLocation(npc.location),
            npcId: npc.id,
            destination: this.generateEscortDestination(npc.location),
            isEscort: true,
            planet: npc.location?.planet,
            area: npc.location?.area || 'surface'
          }
        ],
        rewards: {
          xp: 100,
          credits: 40,
          reputation: npc.factionId ? { [npc.factionId]: 12 } : {},
          items: [],
          unlocks: []
        },
        relationshipBonus: 20,
        consequences: {
          reputationChanges: npc.factionId ? { [npc.factionId]: 8 } : {},
          factionChanges: {}
        }
      },
      medical: {
        title: `Medical Aid for ${npc.name}`,
        description: `${npc.name} needs medical supplies urgently. Can you help gather them?`,
        shortDescription: `Gather medical supplies for ${npc.name}.`,
        objectives: [
          {
            id: 'collect_medical',
            type: 'collect',
            description: `Collect medical supplies`,
            target: this.getItemForQuest('medical_supply'),
            count: 3,
            location: this.getLocationHint(npc)
          },
          {
            id: 'deliver_medical',
            type: 'deliver',
            description: `Deliver medical supplies to ${npc.name}`,
            target: npc.id
          }
        ],
        rewards: {
          xp: 90,
          credits: 35,
          reputation: npc.factionId ? { [npc.factionId]: 11 } : {},
          items: [],
          unlocks: []
        },
        relationshipBonus: 18,
        consequences: {
          reputationChanges: npc.factionId ? { [npc.factionId]: 6 } : {},
          factionChanges: {}
        }
      },
      supplies: {
        title: `Supplies for ${npc.name}`,
        description: `${npc.name} needs essential supplies for survival. Can you help gather them?`,
        shortDescription: `Gather essential supplies for ${npc.name}.`,
        objectives: [
          {
            id: 'collect_supplies',
            type: 'collect',
            description: `Collect essential supplies`,
            target: this.getItemForQuest('supply_item'),
            count: 5,
            location: this.getLocationHint(npc)
          },
          {
            id: 'deliver_supplies',
            type: 'deliver',
            description: `Deliver supplies to ${npc.name}`,
            target: npc.id
          }
        ],
        rewards: {
          xp: 80,
          credits: 32,
          reputation: npc.factionId ? { [npc.factionId]: 10 } : {},
          items: [],
          unlocks: []
        },
        relationshipBonus: 16,
        consequences: {
          reputationChanges: npc.factionId ? { [npc.factionId]: 5 } : {},
          factionChanges: {}
        }
      }
    };
    
    return questTypes[needType] || questTypes.supplies;
  }

  /**
   * Generate neutral quest
   */
  generateNeutralQuest(npc, character, urgentNeed, motivation) {
    const questTypes = [
      {
        title: `Information for ${npc.name}`,
        description: `${npc.name} needs information about the area. Can you gather it for them?`,
        shortDescription: `Gather information for ${npc.name}.`,
        objectives: [
          {
            id: 'gather_info',
            type: 'discover',
            description: `Gather information about ${urgentNeed?.description || 'the area'}`,
            location: this.getLocationHint(npc)
          },
          {
            id: 'report_info',
            type: 'interact',
            description: `Report the information to ${npc.name}`,
            target: npc.id
          }
        ],
        rewards: {
          xp: 60,
          credits: 25,
          reputation: npc.factionId ? { [npc.factionId]: 5 } : {},
          items: [],
          unlocks: []
        },
        relationshipBonus: 10,
        consequences: {
          reputationChanges: {},
          factionChanges: {}
        }
      },
      {
        title: `Delivery for ${npc.name}`,
        description: `${npc.name} needs a message delivered to another NPC.`,
        shortDescription: `Deliver a message for ${npc.name}.`,
        objectives: [
          {
            id: 'deliver_message',
            type: 'interact',
            description: `Deliver message to target NPC`,
            target: this.findTargetNPCId(npc.location),
            message: this.generateMessage(npc)
          }
        ],
        rewards: {
          xp: 50,
          credits: 20,
          reputation: npc.factionId ? { [npc.factionId]: 3 } : {},
          items: [],
          unlocks: []
        },
        relationshipBonus: 8,
        consequences: {
          reputationChanges: {},
          factionChanges: {}
        }
      }
    ];
    
    return questTypes[Math.floor(Math.random() * questTypes.length)];
  }

  /**
   * Generate deceptive quest
   */
  async generateDeceptiveQuest(npc, character, urgentNeed, motivation) {
    const targetNPC = await this.findTargetNPC(npc.location, npc.id);
    
    const questTypes = [
      {
        title: `Misinformation for ${npc.name}`,
        description: `${npc.name} needs you to spread false information about ${targetNPC?.name || 'a rival'}.`,
        shortDescription: `Spread false information for ${npc.name}.`,
        objectives: [
          {
            id: 'spread_lies',
            type: 'interact',
            description: `Tell ${targetNPC?.name || 'target NPC'} false information`,
            target: targetNPC?.id || 'unknown_npc',
            deceptionType: 'misinformation'
          }
        ],
        rewards: {
          xp: 80,
          credits: 50,
          reputation: npc.factionId ? { [npc.factionId]: 8 } : {},
          items: [],
          unlocks: []
        },
        relationshipBonus: 12,
        consequences: {
          reputationChanges: {
            ...(npc.factionId ? { [npc.factionId]: 5 } : {}),
            ...(targetNPC?.factionId ? { [targetNPC.factionId]: -5 } : {})
          },
          factionChanges: {}
        }
      },
      {
        title: `Deception Mission for ${npc.name}`,
        description: `${npc.name} needs you to lie to ${targetNPC?.name || 'someone'} about their location.`,
        shortDescription: `Lie to ${targetNPC?.name || 'target'} for ${npc.name}.`,
        objectives: [
          {
            id: 'deceive_npc',
            type: 'interact',
            description: `Lie to ${targetNPC?.name || 'target NPC'} about ${npc.name}'s location`,
            target: targetNPC?.id || 'unknown_npc',
            deceptionType: 'location_lie'
          }
        ],
        rewards: {
          xp: 75,
          credits: 45,
          reputation: npc.factionId ? { [npc.factionId]: 7 } : {},
          items: [],
          unlocks: []
        },
        relationshipBonus: 10,
        consequences: {
          reputationChanges: {
            ...(npc.factionId ? { [npc.factionId]: 4 } : {}),
            ...(targetNPC?.factionId ? { [targetNPC.factionId]: -4 } : {})
          },
          factionChanges: {}
        }
      },
      {
        title: `Manipulation for ${npc.name}`,
        description: `${npc.name} wants you to manipulate ${targetNPC?.name || 'someone'} into making a decision.`,
        shortDescription: `Manipulate ${targetNPC?.name || 'target'} for ${npc.name}.`,
        objectives: [
          {
            id: 'manipulate_npc',
            type: 'interact',
            description: `Manipulate ${targetNPC?.name || 'target NPC'} into making a decision`,
            target: targetNPC?.id || 'unknown_npc',
            deceptionType: 'manipulation'
          }
        ],
        rewards: {
          xp: 85,
          credits: 55,
          reputation: npc.factionId ? { [npc.factionId]: 9 } : {},
          items: [],
          unlocks: []
        },
        relationshipBonus: 14,
        consequences: {
          reputationChanges: {
            ...(npc.factionId ? { [npc.factionId]: 6 } : {}),
            ...(targetNPC?.factionId ? { [targetNPC.factionId]: -6 } : {})
          },
          factionChanges: {}
        }
      }
    ];
    
    return questTypes[Math.floor(Math.random() * questTypes.length)];
  }

  /**
   * Generate criminal quest
   */
  async generateCriminalQuest(npc, character, urgentNeed, motivation) {
    const personality = npc.personalityProfile || {};
    const targetNPC = await this.findTargetNPC(npc.location, npc.id);
    const targetLocation = this.findTargetLocation(npc.location);
    
    const questTypes = [
      {
        title: `Theft for ${npc.name}`,
        description: `${npc.name} needs you to steal ${this.getTargetItem()} from ${targetLocation?.name || 'a location'}.`,
        shortDescription: `Steal ${this.getTargetItem()} for ${npc.name}.`,
        objectives: [
          {
            id: 'steal_item',
            type: 'collect',
            description: `Steal ${this.getTargetItem()} from ${targetLocation?.name || 'target location'}`,
            target: this.getTargetItem(),
            count: 1,
            location: targetLocation?.id,
            illegal: true
          },
          {
            id: 'deliver_stolen',
            type: 'deliver',
            description: `Deliver stolen item to ${npc.name}`,
            target: npc.id
          }
        ],
        rewards: {
          xp: 100,
          credits: 75,
          reputation: npc.factionId ? { [npc.factionId]: 10 } : {},
          items: [],
          unlocks: []
        },
        relationshipBonus: 15,
        consequences: {
          reputationChanges: {
            ...(npc.factionId ? { [npc.factionId]: 8 } : {}),
            ...(targetLocation?.factionId ? { [targetLocation.factionId]: -10 } : {})
          },
          factionChanges: {}
        }
      },
      {
        title: `Sabotage for ${npc.name}`,
        description: `${npc.name} wants you to sabotage equipment at ${targetLocation?.name || 'a location'}.`,
        shortDescription: `Sabotage equipment for ${npc.name}.`,
        objectives: [
          {
            id: 'sabotage_equipment',
            type: 'interact',
            description: `Sabotage equipment at ${targetLocation?.name || 'target location'}`,
            target: targetLocation?.id || 'unknown_location',
            sabotageType: 'equipment',
            illegal: true
          }
        ],
        rewards: {
          xp: 120,
          credits: 90,
          reputation: npc.factionId ? { [npc.factionId]: 12 } : {},
          items: [],
          unlocks: []
        },
        relationshipBonus: 18,
        consequences: {
          reputationChanges: {
            ...(npc.factionId ? { [npc.factionId]: 10 } : {}),
            ...(targetLocation?.factionId ? { [targetLocation.factionId]: -15 } : {})
          },
          factionChanges: {}
        }
      },
      {
        title: `Attack ${targetNPC?.name || 'Target'} for ${npc.name}`,
        description: `${npc.name} wants you to attack ${targetNPC?.name || 'a rival'}.`,
        shortDescription: `Attack ${targetNPC?.name || 'target'} for ${npc.name}.`,
        objectives: [
          {
            id: 'attack_npc',
            type: 'defeat',
            description: `Attack and defeat ${targetNPC?.name || 'target NPC'}`,
            target: targetNPC?.id || 'unknown_npc',
            count: 1,
            illegal: true
          }
        ],
        rewards: {
          xp: 150,
          credits: 100,
          reputation: npc.factionId ? { [npc.factionId]: 15 } : {},
          items: [],
          unlocks: []
        },
        relationshipBonus: 20,
        consequences: {
          reputationChanges: {
            ...(npc.factionId ? { [npc.factionId]: 12 } : {}),
            ...(targetNPC?.factionId ? { [targetNPC.factionId]: -20 } : {})
          },
          factionChanges: {}
        }
      },
      {
        title: `Eliminate ${targetNPC?.name || 'Target'} for ${npc.name}`,
        description: `${npc.name} wants you to eliminate ${targetNPC?.name || 'a target'}. This is a serious request.`,
        shortDescription: `Eliminate ${targetNPC?.name || 'target'} for ${npc.name}.`,
        objectives: [
          {
            id: 'eliminate_npc',
            type: 'defeat',
            description: `Eliminate ${targetNPC?.name || 'target NPC'}`,
            target: targetNPC?.id || 'unknown_npc',
            count: 1,
            kill: true,
            illegal: true
          }
        ],
        rewards: {
          xp: 200,
          credits: 150,
          reputation: npc.factionId ? { [npc.factionId]: 20 } : {},
          items: [],
          unlocks: []
        },
        relationshipBonus: 25,
        consequences: {
          reputationChanges: {
            ...(npc.factionId ? { [npc.factionId]: 15 } : {}),
            ...(targetNPC?.factionId ? { [targetNPC.factionId]: -30 } : {})
          },
          factionChanges: {}
        }
      }
    ];
    
    // Filter based on NPC personality (very evil NPCs more likely to request kill quests)
    let availableTypes = questTypes;
    if (personality.agreeableness < 20 && personality.neuroticism > 70) {
      // Very evil, desperate NPC - all quest types available
    } else if (personality.agreeableness < 40) {
      // Evil NPC - exclude kill quests unless very urgent
      if (urgentNeed?.urgency < 0.9) {
        availableTypes = questTypes.filter(q => !q.objectives.some(o => o.kill));
      }
    } else {
      // Less evil - only theft and sabotage
      availableTypes = questTypes.filter(q => 
        q.objectives.some(o => o.type === 'collect' && o.illegal) || 
        q.objectives.some(o => o.type === 'interact' && o.sabotageType)
      );
    }
    
    return availableTypes[Math.floor(Math.random() * availableTypes.length)];
  }

  /**
   * Helper methods
   */
  getFoodAmount(urgency) {
    return Math.floor(3 + (urgency * 5)); // 3-8 items
  }

  getLocationHint(npc) {
    return npc.location?.area || 'nearby area';
  }

  findSafeLocation(location) {
    const safeAreas = ['cantina', 'residential', 'spaceport', 'market'];
    return safeAreas[Math.floor(Math.random() * safeAreas.length)] || 'safe_location';
  }

  /**
   * Generate escort destination with coordinates
   */
  generateEscortDestination(npcLocation) {
    const planetId = npcLocation?.planet;
    const area = npcLocation?.area || 'surface';
    
    // Generate destination coordinates (different from NPC's current location)
    // For now, place destination at a different part of the map
    const destinationX = 30 + Math.random() * 40; // 30-70% across map
    const destinationY = 30 + Math.random() * 40; // 30-70% down map
    
    // Find a safe location type
    const safeLocationTypes = ['cantina', 'residential', 'spaceport', 'market', 'medical_center'];
    const destinationType = safeLocationTypes[Math.floor(Math.random() * safeLocationTypes.length)];
    
    return {
      planet: planetId,
      area: area,
      x: destinationX,
      y: destinationY,
      type: destinationType,
      name: this.getLocationName(destinationType)
    };
  }

  /**
   * Get location name for destination
   */
  getLocationName(locationType) {
    const names = {
      'cantina': 'Cantina',
      'residential': 'Residential District',
      'spaceport': 'Spaceport',
      'market': 'Market',
      'medical_center': 'Medical Center',
      'safe_location': 'Safe Location'
    };
    return names[locationType] || 'Safe Location';
  }

  async findTargetNPC(location, excludeNPCId) {
    try {
      const { Op } = require('sequelize');
      const planetId = location?.planet;
      const area = location?.area;
      
      // Try to find existing NPCs in the same location
      // Note: Sequelize JSONB queries need special handling
      const npcs = await NPC.findAll({
        where: {
          isAvailable: true,
          id: { [Op.ne]: excludeNPCId }
        },
        limit: 20
      });
      
      // Filter by location manually (since JSONB queries are complex)
      const locationFiltered = npcs.filter(npc => {
        const npcLoc = npc.location || {};
        if (planetId && npcLoc.planet !== planetId) return false;
        if (area && npcLoc.area !== area) return false;
        return true;
      });
      
      if (locationFiltered.length > 0) {
        return locationFiltered[Math.floor(Math.random() * locationFiltered.length)];
      }
      
      // If no NPCs in exact location, return any available NPC
      if (npcs.length > 0) {
        return npcs[Math.floor(Math.random() * npcs.length)];
      }
    } catch (error) {
      console.error('[Mini-Quest] Error finding target NPC:', error);
    }
    
    // Return null - dependency service will generate one if needed
    return null;
  }

  findTargetNPCId(location) {
    // Return a placeholder - will be resolved when quest is accepted
    return 'target_npc';
  }

  findTargetLocation(npcLocation) {
    return {
      id: `location_${npcLocation?.area || 'unknown'}`,
      name: npcLocation?.area || 'Unknown Location',
      factionId: null
    };
  }

  getTargetItem() {
    // Use actual item IDs from item definitions
    const { getAllItemDefinitions } = require('../data/items');
    const allItems = getAllItemDefinitions();
    
    // Filter to common items suitable for theft
    const suitableItems = Object.values(allItems).filter(item => 
      item.type === 'consumable' || 
      item.type === 'resource' || 
      (item.type === 'weapon' && item.rarity === 'common')
    );
    
    if (suitableItems.length > 0) {
      return suitableItems[Math.floor(Math.random() * suitableItems.length)].id;
    }
    
    // Fallback to common items
    return 'medpac_01';
  }

  /**
   * Get valid item ID for quest objective
   */
  getItemForQuest(itemType) {
    const { getAllItemDefinitions } = require('../data/items');
    const allItems = getAllItemDefinitions();
    
    // Map quest item types to actual item IDs
    const itemMappings = {
      'food_item': ['food_ration_01', 'food_ration_02'],
      'medical_supply': ['medpac_01', 'medpac_02', 'medpac_advanced'],
      'supply_item': ['food_ration_01', 'medpac_01', 'power_cell_01']
    };
    
    const candidates = itemMappings[itemType] || [];
    if (candidates.length > 0) {
      // Verify items exist
      const validItems = candidates.filter(id => allItems[id]);
      if (validItems.length > 0) {
        return validItems[Math.floor(Math.random() * validItems.length)];
      }
    }
    
    // Fallback to first available consumable
    const consumables = Object.values(allItems).filter(item => item.type === 'consumable');
    if (consumables.length > 0) {
      return consumables[0].id;
    }
    
    return 'medpac_01'; // Ultimate fallback
  }

  generateMessage(npc) {
    return `Message from ${npc.name}`;
  }

  estimateTime(objectives) {
    // Base time: 5 minutes per objective
    return Math.min(15, objectives.length * 5);
  }

  determineDifficulty(context, moralAlignment) {
    if (moralAlignment === 'criminal') {
      return 'medium';
    }
    return 'easy';
  }

  calculateExpiration(urgency) {
    // Higher urgency = shorter expiration
    const hours = 24 - (urgency * 12); // 12-24 hours
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + hours);
    return expiration.toISOString();
  }

  generateQuestId(npc, context, moralAlignment) {
    const timestamp = Date.now();
    const needType = context.urgentNeed?.type || 'general';
    return `mini_${npc.id}_${moralAlignment}_${needType}_${timestamp}`;
  }

  /**
   * Check if NPC already has active mini-quest
   */
  async hasActiveMiniQuest(npcId, characterId) {
    const { QuestProgress } = require('../models');
    try {
      const activeQuests = await QuestProgress.findAll({
        where: {
          characterId,
          status: 'active'
        }
      });
      
      if (activeQuests.length === 0) return false;
      
      const questIds = activeQuests.map(qp => qp.questId);
      const miniQuests = await Quest.findAll({
        where: {
          id: { [require('sequelize').Op.in]: questIds },
          questType: 'mini',
          questGiverId: npcId
        }
      });
      
      return miniQuests.length > 0;
    } catch (error) {
      console.error('[Mini-Quest] Error checking active mini-quest:', error);
      return false;
    }
  }

  /**
   * Clean up expired mini-quests
   */
  async cleanupExpiredMiniQuests() {
    const now = new Date();
    try {
      const expired = await Quest.findAll({
        where: {
          questType: 'mini',
          isActive: true
        }
      });
      
      for (const quest of expired) {
        const expiresAt = quest.miniQuestData?.expiresAt;
        if (expiresAt && new Date(expiresAt) < now) {
          await quest.update({ isActive: false });
        }
      }
      
      return expired.length;
    } catch (error) {
      console.error('[Mini-Quest] Error cleaning up expired quests:', error);
      return 0;
    }
  }
}

module.exports = new MiniQuestService();

