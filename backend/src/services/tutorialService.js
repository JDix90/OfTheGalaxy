/**
 * Tutorial Service
 * Business logic for tutorial system management
 */

const { TutorialProgress, PlayerCharacter, Quest, QuestProgress } = require('../models');
const questService = require('./questService');

class TutorialService {
  /**
   * Initialize tutorial for a new character
   */
  async initializeTutorial(characterId) {
    const character = await PlayerCharacter.findByPk(characterId);
    
    if (!character) {
      throw new Error('Character not found');
    }
    
    // Check if tutorial progress already exists
    let progress = await TutorialProgress.findOne({
      where: {
        characterId,
        tutorialId: 'tutorial_001_dockside_initiation'
      }
    });
    
    if (!progress) {
      // Create new tutorial progress
      progress = await TutorialProgress.create({
        characterId,
        tutorialId: 'tutorial_001_dockside_initiation',
        state: 'not_started',
        completedStates: [],
        milestones: {},
        skipped: false,
        version: 1
      });
      
      console.log(`[Tutorial] Initialized tutorial for character ${characterId}`);
    }
    
    return progress;
  }
  
  /**
   * Get tutorial state for a character
   */
  async getTutorialState(characterId) {
    let progress = await TutorialProgress.findOne({
      where: {
        characterId,
        tutorialId: 'tutorial_001_dockside_initiation'
      }
    });
    
    if (!progress) {
      // Initialize if doesn't exist
      progress = await this.initializeTutorial(characterId);
    }
    
    return progress;
  }
  
  /**
   * Update tutorial state
   */
  async updateTutorialState(characterId, updates) {
    const progress = await this.getTutorialState(characterId);
    
    const updateData = {
      updatedAt: new Date()
    };
    
    if (updates.state !== undefined) {
      updateData.state = updates.state;
    }
    
    if (updates.completedStates !== undefined) {
      updateData.completedStates = updates.completedStates;
    }
    
    if (updates.milestones !== undefined) {
      updateData.milestones = { ...progress.milestones, ...updates.milestones };
    }
    
    await progress.update(updateData);
    
    // Reload progress to get the updated state
    await progress.reload();
    
    console.log(`[Tutorial] Updated tutorial state for character ${characterId}: ${updates.state || progress.state}`);
    
    return progress;
  }
  
  /**
   * Complete a tutorial step
   */
  async completeStep(characterId, stepId, stepData = {}) {
    const progress = await this.getTutorialState(characterId);
    
    const completedStates = [...(progress.completedStates || [])];
    if (!completedStates.includes(stepId)) {
      completedStates.push(stepId);
    }
    
    const milestones = {
      ...progress.milestones,
      [stepId]: {
        completedAt: new Date().toISOString(),
        ...stepData
      }
    };
    
    await progress.update({
      completedStates,
      milestones,
      updatedAt: new Date()
    });
    
    console.log(`[Tutorial] Completed step ${stepId} for character ${characterId}`);
    
    return progress;
  }
  
  /**
   * Complete the entire tutorial
   */
  async completeTutorial(characterId) {
    const progress = await this.getTutorialState(characterId);
    
    await progress.update({
      state: 'tutorial_complete',
      completedAt: new Date(),
      updatedAt: new Date()
    });
    
    // Mark character as tutorial completed
    await PlayerCharacter.update(
      { tutorialCompleted: true },
      { where: { id: characterId } }
    );
    
    console.log(`[Tutorial] Completed tutorial for character ${characterId}`);
    
    return progress;
  }
  
  /**
   * Skip the tutorial
   */
  async skipTutorial(characterId) {
    const progress = await this.getTutorialState(characterId);
    
    await progress.update({
      state: 'tutorial_skipped',
      skipped: true,
      updatedAt: new Date()
    });
    
    console.log(`[Tutorial] Skipped tutorial for character ${characterId}`);
    
    return progress;
  }
  
  /**
   * Assign tutorial quest to character
   */
  async assignTutorialQuest(characterId) {
    const character = await PlayerCharacter.findByPk(characterId);
    
    if (!character) {
      throw new Error('Character not found');
    }
    
    // Check if tutorial quest already assigned
    if (character.tutorialQuestId) {
      const existingProgress = await QuestProgress.findOne({
        where: {
          characterId,
          questId: character.tutorialQuestId,
          status: 'active'
        }
      });
      
      if (existingProgress) {
        console.log(`[Tutorial] Tutorial quest already assigned to character ${characterId}`);
        return existingProgress;
      }
    }
    
    // Find or create tutorial quest
    let tutorialQuest = await Quest.findOne({
      where: {
        id: 'tutorial_001_dockside_initiation'
      }
    });
    
    if (!tutorialQuest) {
      // Create tutorial quest if it doesn't exist
      try {
        tutorialQuest = await this.createTutorialQuest(character);
      } catch (error) {
        // If quest creation fails (e.g., already exists from another process), try to find it again
        if (error.name === 'SequelizeUniqueConstraintError' || error.message.includes('already exists')) {
          tutorialQuest = await Quest.findOne({
            where: {
              id: 'tutorial_001_dockside_initiation'
            }
          });
        }
        
        if (!tutorialQuest) {
          throw error;
        }
      }
    }
    
    // Ensure quest is active
    if (!tutorialQuest.isActive) {
      await tutorialQuest.update({ isActive: true });
    }
    
    // Note: Quest objectives are customized per-character when the quest is retrieved
    // See questService.getQuest() for character-specific objective customization
    
    // Assign quest using quest service
    try {
      const result = await questService.startQuest(characterId, tutorialQuest.id);
      const questProgress = result.progress;
      
      // Mark "Move to NPC" and "Talk to NPC" objectives as completed
      // since the player has already done these to get to this point
      if (questProgress) {
        const objectivesCompleted = questProgress.objectivesCompleted || {};
        objectivesCompleted['tutorial_move'] = true;
        objectivesCompleted['tutorial_talk'] = true;
        
        await questProgress.update({
          objectivesCompleted: objectivesCompleted
        });
        
        console.log(`[Tutorial] Marked tutorial_move and tutorial_talk as completed for character ${characterId}`);
      }
      
      // Update character with tutorial quest ID
      await character.update({
        tutorialQuestId: tutorialQuest.id
      });
      
      console.log(`[Tutorial] Assigned tutorial quest ${tutorialQuest.id} to character ${characterId}`);
      
      return questProgress;
    } catch (error) {
      console.error(`[Tutorial] Failed to assign tutorial quest:`, error);
      throw error;
    }
  }
  
  /**
   * Create tutorial quest definition
   */
  async createTutorialQuest(character) {
    // Determine tutorial NPC and combat scenario based on background
    const tutorialConfig = this.getTutorialConfigForBackground(character.background);
    
    // Use findOrCreate to avoid duplicate key errors
    const [tutorialQuest, created] = await Quest.findOrCreate({
      where: {
        id: 'tutorial_001_dockside_initiation'
      },
      defaults: {
      id: 'tutorial_001_dockside_initiation',
      title: 'Dockside Initiation',
      description: 'Learn the basics of survival in the galaxy',
      questType: 'tutorial',
      questGiverId: tutorialConfig.npcId,
      objectives: [
        {
          id: 'tutorial_move',
          type: 'move',
          description: 'Move to your dockside contact',
          target: tutorialConfig.npcLocation,
          radius: 2
        },
        {
          id: 'tutorial_talk',
          type: 'interact',
          description: 'Talk to your dockside contact',
          target: tutorialConfig.npcId
        },
        {
          id: 'tutorial_combat',
          type: 'combat',
          description: 'Defeat the training opponent',
          target: tutorialConfig.combatEnemyId,
          scripted: true
        },
        {
          id: 'tutorial_loot',
          type: 'collect',
          description: 'Collect the loot from the defeated enemy',
          target: 'droid_parts' // Matches the actual item ID dropped by droid_security
        },
        {
          id: 'tutorial_heal',
          type: 'use_item',
          description: 'Use a medpac to heal',
          target: 'medpac_01',
          alternative: 'wait_for_regen' // Can wait for health regen instead
        },
        {
          id: 'tutorial_vendor',
          type: 'interact',
          description: 'Sell an item to a vendor',
          target: tutorialConfig.vendorId || 'any_vendor'
        },
        {
          id: 'tutorial_travel',
          type: 'travel',
          description: 'Open the galaxy map and select a destination',
          target: 'any_planet'
        },
        {
          id: 'tutorial_return',
          type: 'interact',
          description: 'Return to your dockside contact',
          target: tutorialConfig.npcId
        }
      ],
      rewards: {
        credits: 500,
        xp: 100,
        items: ['medpac_01'],
        title: 'Dockside Initiate',
        reputation: {
          [tutorialConfig.factionId]: 1
        },
        discovery: 'first_steps'
      },
      isTutorial: true,
      isActive: true,
        prerequisites: {
          level: 1
        }
      }
    });
    
    // If quest already existed, ensure it's active AND correct any step text that
    // may have been baked in from a different character's background. The tutorial
    // quest is a single shared record, so its step text must stay background-neutral
    // (the in-world tutorial overlay names the specific guide NPC). This repairs
    // pre-existing records that hardcoded one background's NPC name.
    if (!created) {
      const NEUTRAL = {
        tutorial_move: 'Move to your dockside contact',
        tutorial_talk: 'Talk to your dockside contact',
        tutorial_return: 'Return to your dockside contact'
      };
      const neutralized = (tutorialQuest.objectives || []).map(o =>
        NEUTRAL[o.id] ? { ...o, description: NEUTRAL[o.id] } : o
      );
      await tutorialQuest.update({
        isActive: true,
        questType: 'tutorial',
        objectives: neutralized
      });
    }

    return tutorialQuest;
  }
  
  /**
   * Get tutorial configuration based on character background
   */
  getTutorialConfigForBackground(background) {
    // #16: the onboarding guide is unified to Dockmaster Jax for every
    // background. Background still flavors starting planet/credits/skills
    // elsewhere; the guide, vendor, and training encounter are shared so the
    // authored golden path stays a single, memorable experience.
    return {
      npcId: 'npc_tutorial_dockmaster_jax',
      npcName: 'Dockmaster Jax',
      npcLocation: { x: 52, y: 48 },
      combatEnemyId: 'enemy_tutorial_customs_drone',
      vendorId: 'npc_tutorial_vendor_jax',
      factionId: 'drift_alliance'
    };
  }
  
  /**
   * Check if tutorial is active for character
   */
  async isTutorialActive(characterId) {
    const progress = await this.getTutorialState(characterId);
    return progress && 
           !progress.skipped && 
           progress.state !== 'tutorial_complete' &&
           progress.state !== 'tutorial_skipped';
  }
  
  /**
   * Get tutorial NPC for character (based on background)
   */
  async getTutorialNPC(characterId, subMapId = null) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }
    
    const config = this.getTutorialConfigForBackground(character.background);
    
    // Convert percentage coordinates (0-100) to grid coordinates (0-15) for submaps
    let npcX = config.npcLocation.x;
    let npcY = config.npcLocation.y;
    
    if (subMapId) {
      // Get submap to determine grid size
      const SubMap = require('../models').SubMap;
      const subMap = await SubMap.findByPk(subMapId);
      
      if (subMap) {
        const layout = subMap.layoutData || subMap.layout || {};
        const mapWidth = layout.width || 15;
        const mapHeight = layout.height || 15;
        
        // Convert percentage (0-100) to grid coordinates (0-mapWidth/Height)
        // Tutorial config uses percentages, but submap renderer expects grid coordinates
        npcX = Math.round((config.npcLocation.x / 100) * mapWidth);
        npcY = Math.round((config.npcLocation.y / 100) * mapHeight);
        
        // Clamp to valid grid range
        npcX = Math.max(0, Math.min(mapWidth - 1, npcX));
        npcY = Math.max(0, Math.min(mapHeight - 1, npcY));
        
        console.log(`[Tutorial] Converted NPC coordinates: ${config.npcLocation.x},${config.npcLocation.y} (percentage) -> ${npcX},${npcY} (grid) for ${mapWidth}x${mapHeight} submap`);
      }
      
      // First, check if NPC already exists on THIS submap
      const NPC = require('../models').NPC;
      const subMapNPCs = await NPC.findBySubMap(subMapId);
      const existingNPCOnSubmap = subMapNPCs.find(n => n.id === config.npcId);
      
      if (existingNPCOnSubmap) {
        console.log(`[Tutorial] Tutorial NPC ${config.npcId} already exists on submap ${subMapId}, returning existing NPC`);
        return existingNPCOnSubmap;
      }
    }
    
    // Find tutorial NPC globally (by ID)
    let npc = await require('../models').NPC.findOne({
      where: { id: config.npcId }
    });
    
    if (!npc) {
      // Create tutorial NPC if it doesn't exist
      console.log(`[Tutorial] Creating tutorial NPC ${config.npcId} for character ${characterId}${subMapId ? ` on submap ${subMapId}` : ''}`);
      npc = await this.createTutorialNPC(config, character, subMapId, npcX, npcY);
      console.log(`[Tutorial] Created tutorial NPC:`, {
        id: npc.id,
        name: npc.name,
        location: npc.location,
        subMapId: npc.location?.subMapId
      });
    } else if (subMapId && (!npc.location?.subMapId || npc.location.subMapId !== subMapId)) {
      // If NPC exists but is not on the submap, update it
      console.log(`[Tutorial] Moving tutorial NPC ${config.npcId} to submap ${subMapId}`);
      console.log(`[Tutorial] Current location:`, npc.location);
      const newLocation = {
        planet: character.currentPlanet,
        area: 'submap',
        subMapId: subMapId,
        x: npcX,
        y: npcY
      };
      console.log(`[Tutorial] New location:`, newLocation);
      await npc.update({
        location: newLocation
      });
      npc = await require('../models').NPC.findByPk(config.npcId);
      console.log(`[Tutorial] Updated NPC location:`, npc.location);
    } else {
      console.log(`[Tutorial] Tutorial NPC ${config.npcId} already exists with correct location:`, npc.location);
    }
    
    return npc;
  }
  
  /**
   * Ensure tutorial NPC exists on a submap
   * Called when a new character enters a spaceport submap
   */
  async ensureTutorialNPCOnSubmap(characterId, subMapId) {
    try {
      const npc = await this.getTutorialNPC(characterId, subMapId);
      console.log(`[Tutorial] Ensured tutorial NPC ${npc.id} exists on submap ${subMapId}`);
      console.log(`[Tutorial] NPC location details:`, {
        id: npc.id,
        name: npc.name,
        location: npc.location,
        subMapId: npc.location?.subMapId,
        expectedSubMapId: subMapId,
        matches: npc.location?.subMapId === subMapId
      });
      
      // Verify the NPC can be found by findBySubMap
      const NPC = require('../models').NPC;
      const foundNPCs = await NPC.findBySubMap(subMapId);
      const tutorialNPCFound = foundNPCs.some(n => n.id === npc.id);
      console.log(`[Tutorial] Verification: Tutorial NPC found in findBySubMap query: ${tutorialNPCFound} (total NPCs found: ${foundNPCs.length})`);
      
      return npc;
    } catch (error) {
      console.error(`[Tutorial] Failed to ensure tutorial NPC on submap:`, error);
      throw error;
    }
  }

  /**
   * Create tutorial NPC
   * @param {Object} config - Tutorial configuration
   * @param {Object} character - Player character
   * @param {string} subMapId - Optional submap ID to place NPC on submap
   */
  async createTutorialNPC(config, character, subMapId = null, gridX = null, gridY = null) {
    const NPC = require('../models').NPC;
    const npcGenerator = require('./npcGenerator');
    
    // Use provided grid coordinates if available, otherwise use config coordinates (for planet surface)
    const npcX = gridX !== null ? gridX : config.npcLocation.x;
    const npcY = gridY !== null ? gridY : config.npcLocation.y;
    
    // Generate tutorial NPC with specific properties
    const npcData = {
      id: config.npcId,
      name: config.npcName,
      species: character.species, // Match player species for familiarity
      npcType: 'quest_giver',
      level: 1,
      planetId: character.currentPlanet,
      location: subMapId ? {
        planet: character.currentPlanet,
        area: 'submap',
        subMapId: subMapId,
        x: npcX,
        y: npcY
      } : {
        x: npcX,
        y: npcY,
        area: 'spaceport'
      },
      dialogue: {
        greeting: this.getTutorialGreeting(character.background, character.species),
        questRelated: {
          tutorial_001_dockside_initiation: {
            offer: this.getTutorialQuestOffer(character.background),
            accept: this.getTutorialQuestAccept(character.background),
            complete: this.getTutorialQuestComplete(character.background)
          }
        }
      },
      isVendor: true, // Tutorial NPC can also be a vendor
      vendorInventory: {
        items: [
          { itemId: 'medpac_01', quantity: 10, price: 50 }, // Basic medpac for healing
          { itemId: 'stimpack_01', quantity: 5, price: 75 } // Basic stimpack for stamina
        ],
        currency: 'credits'
      },
      factionId: config.factionId
    };
    
    // Use findOrCreate to prevent duplicate key errors
    const [npc, created] = await NPC.findOrCreate({
      where: { id: config.npcId },
      defaults: npcData
    });
    
    if (created) {
      console.log(`[Tutorial] Created tutorial NPC ${config.npcId} for character ${character.id}${subMapId ? ` on submap ${subMapId}` : ''}`);
    } else {
      console.log(`[Tutorial] Tutorial NPC ${config.npcId} already exists, using existing NPC`);
      
      // Update location if subMapId is provided and different
      const locationNeedsUpdate = subMapId && (!npc.location?.subMapId || npc.location.subMapId !== subMapId);
      
      // Ensure vendor inventory is set (for tutorial NPCs that act as vendors)
      const needsVendorInventory = !npc.vendorInventory || !npc.vendorInventory.items || npc.vendorInventory.items.length === 0;
      
      if (locationNeedsUpdate || needsVendorInventory) {
        const updates = {};
        if (locationNeedsUpdate) {
          updates.location = {
            planet: character.currentPlanet,
            area: 'submap',
            subMapId: subMapId,
            x: npcX,
            y: npcY
          };
        }
        if (needsVendorInventory) {
          updates.vendorInventory = npcData.vendorInventory;
          updates.isVendor = true;
        }
        await npc.update(updates);
        await npc.reload();
        if (locationNeedsUpdate) {
          console.log(`[Tutorial] Updated existing NPC location to submap ${subMapId}`);
        }
        if (needsVendorInventory) {
          console.log(`[Tutorial] Updated existing NPC with vendor inventory`);
        }
      }
    }
    
    return npc;
  }
  
  /**
   * Get tutorial greeting based on background and species
   */
  getTutorialGreeting(background, species) {
    // Unified to Dockmaster Jax. The live conversation runs through
    // tutorialDialogueService's authored Jax tree; this is the baked fallback.
    return "Welcome to Solenne. Dockmaster Jax — I run these landing bays. New face, empty pockets, that look like the galaxy already owes you. I know the type. Stick with me and I'll make sure your first week isn't your last.";
  }

  /**
   * Get tutorial quest offer dialogue (unified: Dockmaster Jax)
   */
  getTutorialQuestOffer(background) {
    return "Call it 'Dockside Initiation' — nothing glamorous, but it'll teach you the four things that keep a drifter alive: how to move, how to fight, how to patch yourself up, and how to drive a bargain. There's a training drone warmed up and waiting. You in?";
  }

  /**
   * Get tutorial quest accept dialogue (unified: Dockmaster Jax)
   */
  getTutorialQuestAccept(background) {
    return "Good. It's on your slate — check the quest log up in your HUD if you lose the thread. Find your footing first, then let's see how you handle that drone.";
  }

  /**
   * Get tutorial quest complete dialogue (unified: Dockmaster Jax)
   */
  getTutorialQuestComplete(background) {
    return "There it is — you've got the basics down, and you're still breathing. That puts you ahead of most who pass through here. Take your reward, and keep your eyes open out there. The Reach is wider and stranger than it looks.";
  }
}

module.exports = new TutorialService();

