/**
 * Character Service
 * Business logic for player character management
 */

const { PlayerCharacter, QuestProgress, NPCRelationship, PlayerInventory } = require('../models');

class CharacterService {
  /**
   * Create a new player character
   */
  async createCharacter(userId, characterData) {
    const { name, species, background, appearance, stats } = characterData;
    
    // Apply species bonuses
    const speciesBonuses = this.getSpeciesBonuses(species);
    const finalStats = { ...stats };
    
    Object.keys(speciesBonuses).forEach(stat => {
      finalStats[stat] = (finalStats[stat] || 10) + speciesBonuses[stat];
    });
    
    // Apply background bonuses
    const backgroundBonuses = this.getBackgroundBonuses(background);
    
    Object.keys(backgroundBonuses.stats).forEach(stat => {
      finalStats[stat] = (finalStats[stat] || 10) + backgroundBonuses.stats[stat];
    });
    
    const character = await PlayerCharacter.create({
      userId,
      name,
      species,
      background,
      appearance,
      stats: finalStats,
      currentPlanet: backgroundBonuses.startingPlanet,
      credits: backgroundBonuses.startingCredits
    });
    
    // Add starting items and auto-equip weapon and armor
    const inventoryService = require('./inventoryService');
    for (const itemId of backgroundBonuses.startingItems) {
      const item = await inventoryService.addItem(character.id, itemId, 1, 'character_creation');
      
      // Auto-equip weapon and armor if they have equipment slots
      if (item) {
        try {
          const itemData = await inventoryService.getItemData(itemId);
          if (itemData.equipmentSlot && (itemData.equipmentSlot === 'weapon' || itemData.equipmentSlot === 'armor')) {
            await inventoryService.equipItem(character.id, itemId, itemData.equipmentSlot);
            console.log(`[Character Creation] Auto-equipped ${itemId} to ${itemData.equipmentSlot} slot`);
          }
        } catch (error) {
          // If item data not found, skip auto-equip (item might not exist yet)
          console.warn(`[Character Creation] Could not auto-equip ${itemId}:`, error.message);
        }
      }
    }
    
    // Initialize tutorial (but don't assign quest yet - that happens when tutorial starts)
    try {
      const tutorialService = require('./tutorialService');
      await tutorialService.initializeTutorial(character.id);
      console.log(`[Character Creation] Tutorial initialized for character ${character.id} (quest will be assigned when tutorial starts)`);
    } catch (error) {
      // Don't fail character creation if tutorial setup fails
      console.warn(`[Character Creation] Failed to initialize tutorial:`, error.message);
    }
    
    return character;
  }

  /**
   * Get species attribute bonuses
   */
  getSpeciesBonuses(species) {
    const speciesBonuses = {
      human: { strength: 1, intelligence: 1, charisma: 1 },
      wookiee: { strength: 3, endurance: 2, intelligence: -1, charisma: -1 },
      twilek: { charisma: 2, agility: 2, strength: -1 },
      rodian: { perception: 2, agility: 2, endurance: -1 },
      zabrak: { endurance: 2, strength: 2, charisma: -1 },
      togruta: { perception: 2, intelligence: 2, strength: -1 },
      mirialan: { agility: 2, perception: 2, endurance: -1 },
      chiss: { intelligence: 2, perception: 2, strength: -1 }
    };
    
    return speciesBonuses[species] || {};
  }

  /**
   * Get background bonuses and starting conditions
   */
  getBackgroundBonuses(background) {
    const backgrounds = {
      smuggler: {
        stats: { agility: 2, charisma: 1 },
        startingPlanet: 'nar_shaddaa',
        startingCredits: 2000,
        startingItems: ['blaster_pistol_01', 'armor_light_01', 'medpac_01']
      },
      scholar: {
        stats: { intelligence: 3 },
        startingPlanet: 'coruscant',
        startingCredits: 1500,
        startingItems: ['datapad_01', 'armor_light_01', 'medpac_01']
      },
      soldier: {
        stats: { strength: 2, endurance: 1 },
        startingPlanet: 'chandrila',
        startingCredits: 1000,
        startingItems: ['blaster_rifle_01', 'armor_medium_01', 'medpac_01', 'stimpack_01']
      },
      medic: {
        stats: { intelligence: 1, charisma: 2 },
        startingPlanet: 'chandrila',
        startingCredits: 1200,
        startingItems: ['blaster_pistol_01', 'armor_light_01', 'medpac_01', 'medpac_01']
      },
      engineer: {
        stats: { intelligence: 2, perception: 1 },
        startingPlanet: 'corellia',
        startingCredits: 1300,
        startingItems: ['blaster_pistol_01', 'armor_light_01', 'medpac_01']
      },
      diplomat: {
        stats: { charisma: 3 },
        startingPlanet: 'naboo',
        startingCredits: 2500,
        startingItems: ['blaster_pistol_01', 'armor_light_01', 'comlink_01', 'medpac_01']
      },
      pilot: {
        stats: { agility: 2, perception: 1 },
        startingPlanet: 'corellia',
        startingCredits: 1800,
        startingItems: ['blaster_pistol_01', 'armor_light_01', 'medpac_01']
      }
    };
    
    return backgrounds[background] || backgrounds.smuggler;
  }

  /**
   * Get character by ID with all related data
   */
  async getCharacter(characterId) {
    const character = await PlayerCharacter.findByPk(characterId, {
      include: [
        {
          model: QuestProgress,
          as: 'questProgress',
          where: { status: 'active' },
          required: false
        },
        {
          model: NPCRelationship,
          as: 'npcRelationships',
          required: false
        },
        {
          model: PlayerInventory,
          as: 'inventory',
          required: false
        }
      ]
    });
    
    if (!character) {
      throw new Error('Character not found');
    }
    
    return character;
  }

  /**
   * Get all characters for a user
   */
  async getCharactersForUser(userId) {
    return await PlayerCharacter.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Add XP to character and handle level-ups
   */
  async addXP(characterId, amount, source = null, options = {}) {
    const character = await PlayerCharacter.findByPk(characterId, { transaction: options.transaction });

    if (!character) {
      throw new Error('Character not found');
    }

    const leveledUp = await character.addXP(amount, { transaction: options.transaction });
    
    return {
      character,
      leveledUp,
      newLevel: character.level,
      xp: character.xp,
      xpForNextLevel: character.getXPForNextLevel()
    };
  }

  /**
   * Allocate skill points
   */
  async allocateSkillPoint(characterId, tree, skillId) {
    const character = await PlayerCharacter.findByPk(characterId);
    
    if (!character) {
      throw new Error('Character not found');
    }
    
    if (character.skillPoints <= 0) {
      throw new Error('No skill points available');
    }
    
    // Initialize skill tree if not exists
    if (!character.skills[tree]) {
      character.skills[tree] = {};
    }
    
    // Initialize skill if not exists
    if (!character.skills[tree][skillId]) {
      character.skills[tree][skillId] = { level: 0 };
    }
    
    // Increase skill level
    character.skills[tree][skillId].level += 1;
    character.skillPoints -= 1;
    
    character.changed('skills', true);
    await character.save();
    
    return character;
  }

  /**
   * Allocate attribute points
   */
  async allocateAttributePoint(characterId, attribute) {
    const { canIncreaseAttribute, getAttributeGain } = require('../utils/attributeScaling');
    
    const character = await PlayerCharacter.findByPk(characterId);
    
    if (!character) {
      throw new Error('Character not found');
    }
    
    const validAttributes = ['strength', 'agility', 'intelligence', 'charisma', 'perception', 'endurance'];
    if (!validAttributes.includes(attribute)) {
      throw new Error('Invalid attribute');
    }
    
    // Check if can increase with cost scaling
    const current = character.stats[attribute] || 10;
    const available = character.attributePoints || 0;
    const check = canIncreaseAttribute(current, available);
    
    if (!check.canIncrease) {
      throw new Error(check.reason);
    }
    
    // Calculate gain (with flattening past soft cap)
    const gain = getAttributeGain(current);
    const newValue = current + gain;
    
    // Deduct cost
    character.attributePoints -= check.cost;
    character.stats[attribute] = Math.min(100, Math.floor(newValue * 10) / 10); // Cap at 100, preserve decimals
    
    // If Endurance was increased, recalculate max stamina
    if (attribute === 'endurance') {
      character.recalculateMaxStamina();
    }
    
    character.changed('stats', true);
    await character.save();
    
    return {
      character,
      newValue: character.stats[attribute],
      cost: check.cost,
      gain: gain,
      remainingPoints: character.attributePoints,
      maxStamina: character.maxStamina // Include in response
    };
  }

  /**
   * Update character location
   */
  async updateLocation(characterId, planet, location) {
    const character = await PlayerCharacter.findByPk(characterId);
    
    if (!character) {
      throw new Error('Character not found');
    }
    
    // Validate location values
    if (location) {
      if (typeof location.x !== 'number' || isNaN(location.x) || location.x < 0 || location.x > 100) {
        throw new Error(`Invalid location x value: ${location.x}. Must be a number between 0 and 100.`);
      }
      if (typeof location.y !== 'number' || isNaN(location.y) || location.y < 0 || location.y > 100) {
        throw new Error(`Invalid location y value: ${location.y}. Must be a number between 0 and 100.`);
      }
    }
    
    character.currentPlanet = planet;
    character.currentLocation = location;
    
    await character.save();
    
    // Update escort NPC position if player has active escort quest
    try {
      const escortService = require('./escortService');
      await escortService.updateEscortNPCPosition(characterId, {
        ...location,
        planet: planet
      });
      
      // Check if destination reached
      const destinationReached = await escortService.checkDestinationReached(characterId, {
        ...location,
        planet: planet
      });
      
      if (destinationReached) {
        // Complete escort objective
        const escortQuest = await escortService.getActiveEscortQuest(characterId);
        if (escortQuest) {
          const questService = require('./questService');
          const escortObjective = escortQuest.objective;
          if (escortObjective) {
            await questService.updateObjective(
              characterId,
              escortQuest.quest.id,
              escortObjective.id,
              true
            );
            console.log(`[Escort] Destination reached, escort objective completed`);
          }
        }
      }
    } catch (error) {
      // Don't fail location update if escort update fails
      console.error('[Character Service] Error updating escort NPC position:', error);
    }
    
    return character;
  }

  /**
   * Update character health/stamina
   */
  async updateVitals(characterId, health = null, stamina = null) {
    const character = await PlayerCharacter.findByPk(characterId);
    
    if (!character) {
      throw new Error('Character not found');
    }
    
    if (health !== null) {
      character.currentHealth = Math.max(0, Math.min(character.maxHealth, health));
    }
    
    if (stamina !== null) {
      character.currentStamina = Math.max(0, Math.min(character.maxStamina, stamina));
    }
    
    await character.save();
    
    return character;
  }

  /**
   * Rest (restore health and stamina)
   */
  async rest(characterId) {
    const character = await PlayerCharacter.findByPk(characterId);
    
    if (!character) {
      throw new Error('Character not found');
    }
    
    character.currentHealth = character.maxHealth;
    character.currentStamina = character.maxStamina;
    
    await character.save();
    
    return character;
  }

  /**
   * Delete character
   */
  async deleteCharacter(characterId, userId) {
    const character = await PlayerCharacter.findOne({
      where: { id: characterId, userId }
    });
    
    if (!character) {
      throw new Error('Character not found or unauthorized');
    }
    
    await character.destroy();
    
    return { success: true };
  }
}

module.exports = new CharacterService();
