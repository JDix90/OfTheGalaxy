/**
 * Quest Service
 * Business logic for quest management and progression
 */

const { Quest, QuestProgress, PlayerCharacter, NPC, FactionReputation } = require('../models');
const characterService = require('./characterService');
const trustService = require('./trustService');
const emotionalStateService = require('./emotionalStateService');

class QuestService {
  /**
   * Get all available quests for a character
   */
  async getAvailableQuests(characterId) {
    const character = await PlayerCharacter.findByPk(characterId);
    
    if (!character) {
      throw new Error('Character not found');
    }
    
    // Get all active quests
    const allQuests = await Quest.findAll({
      where: { isActive: true }
    });
    
    // Get character's quest progress
    const questProgress = await QuestProgress.findAll({
      where: { characterId }
    });
    
    const completedQuestIds = questProgress
      .filter(qp => qp.status === 'completed')
      .map(qp => qp.questId);
    
    const activeQuestIds = questProgress
      .filter(qp => qp.status === 'active')
      .map(qp => qp.questId);

    const reputationMap = await this.getReputationMap(characterId);

    // Filter quests based on prerequisites
    const availableQuests = allQuests.filter(quest => {
      // Skip if already active or completed
      if (activeQuestIds.includes(quest.id) || completedQuestIds.includes(quest.id)) {
        return false;
      }

      // Check prerequisites
      return this.checkPrerequisites(quest, character, completedQuestIds, reputationMap);
    });

    return availableQuests;
  }

  /**
   * Get available mini-quests for character
   */
  async getAvailableMiniQuests(characterId, moralAlignment = null) {
    const allQuests = await this.getAvailableQuests(characterId);
    let miniQuests = allQuests.filter(q => q.questType === 'mini');
    
    if (moralAlignment) {
      miniQuests = miniQuests.filter(q => 
        q.moralAlignment === moralAlignment || 
        q.miniQuestData?.moralAlignment === moralAlignment
      );
    }
    
    return miniQuests;
  }

  /**
   * Get active mini-quests for character
   */
  async getActiveMiniQuests(characterId, moralAlignment = null) {
    const questProgress = await QuestProgress.findAll({
      where: { characterId, status: 'active' }
    });
    
    if (questProgress.length === 0) return [];
    
    const questIds = questProgress.map(qp => qp.questId);
    let miniQuests = await Quest.findAll({
      where: {
        id: { [require('sequelize').Op.in]: questIds },
        questType: 'mini'
      }
    });
    
    if (moralAlignment) {
      miniQuests = miniQuests.filter(q => 
        q.moralAlignment === moralAlignment || 
        q.miniQuestData?.moralAlignment === moralAlignment
      );
    }
    
    return miniQuests;
  }

  /**
   * Get available quests from a specific NPC quest giver
   */
  async getQuestsByNPC(npcId, characterId) {
    const character = await PlayerCharacter.findByPk(characterId);
    
    if (!character) {
      throw new Error('Character not found');
    }
    
    // Get all quests from this NPC
    const npcQuests = await Quest.findAll({
      where: { 
        questGiverId: npcId,
        isActive: true
      }
    });
    
    console.log(`[Quest Service] Found ${npcQuests.length} quests for NPC ${npcId}`);
    if (npcQuests.length === 0) {
      // Check if any quests exist with this questGiverId (even if inactive)
      const allQuestsForNPC = await Quest.findAll({
        where: { questGiverId: npcId }
      });
      if (allQuestsForNPC.length > 0) {
        console.log(`[Quest Service] Found ${allQuestsForNPC.length} quests for NPC ${npcId}, but ${allQuestsForNPC.filter(q => !q.isActive).length} are inactive`);
      } else {
        console.log(`[Quest Service] No quests found for NPC ${npcId}. This NPC may not be a quest giver from content files, or quests haven't been seeded yet.`);
      }
      return [];
    }
    
    // Get character's quest progress
    const questProgress = await QuestProgress.findAll({
      where: { characterId }
    });
    
    const completedQuestIds = questProgress
      .filter(qp => qp.status === 'completed')
      .map(qp => qp.questId);
    
    const activeQuestIds = questProgress
      .filter(qp => qp.status === 'active')
      .map(qp => qp.questId);

    const npcReputationMap = await this.getReputationMap(characterId);

    // Filter quests based on prerequisites and status
    const availableQuests = npcQuests.filter(quest => {
      // Skip if already active or completed
      if (activeQuestIds.includes(quest.id)) {
        console.log(`[Quest Service] Quest ${quest.id} is already active`);
        return false;
      }
      if (completedQuestIds.includes(quest.id)) {
        console.log(`[Quest Service] Quest ${quest.id} is already completed`);
        return false;
      }
      
      // Check prerequisites
      const meetsPrereqs = this.checkPrerequisites(quest, character, completedQuestIds, npcReputationMap);
      if (!meetsPrereqs) {
        console.log(`[Quest Service] Quest ${quest.id} prerequisites not met. Character level: ${character.level}, Required: ${quest.prerequisites?.level || 1}`);
        if (quest.prerequisites?.completedQuests?.length > 0) {
          console.log(`[Quest Service] Required quests: ${quest.prerequisites.completedQuests.join(', ')}`);
        }
        if (quest.prerequisites?.reputation && Object.keys(quest.prerequisites.reputation).length > 0) {
          console.log(`[Quest Service] Required reputation:`, quest.prerequisites.reputation);
        }
      }
      return meetsPrereqs;
    });
    
    console.log(`[Quest Service] ${availableQuests.length} quests available for NPC ${npcId} after filtering`);
    return availableQuests;
  }

  /**
   * Check if character meets quest prerequisites
   */
  /**
   * Build a { factionId: reputation } map for a character. Factions with no row
   * default to 0 (neutral). Pass the result into checkPrerequisites so the
   * synchronous prerequisite check can gate on faction standing.
   */
  async getReputationMap(characterId) {
    const rows = await FactionReputation.findAll({ where: { characterId } });
    const map = {};
    for (const row of rows) {
      map[row.factionId] = row.reputation;
    }
    return map;
  }

  checkPrerequisites(quest, character, completedQuestIds, reputationMap = {}) {
    const prereqs = quest.prerequisites || {};

    // Check level
    if (prereqs.level && character.level < prereqs.level) {
      return false;
    }

    // Check completed quests
    if (prereqs.completedQuests && prereqs.completedQuests.length > 0) {
      for (const requiredQuest of prereqs.completedQuests) {
        if (!completedQuestIds.includes(requiredQuest)) {
          return false;
        }
      }
    }

    // Check faction reputation: prereqs.reputation is { factionId: minReputation }.
    // An empty object means no requirement. A character's standing defaults to 0.
    if (prereqs.reputation && typeof prereqs.reputation === 'object') {
      for (const [factionId, minReputation] of Object.entries(prereqs.reputation)) {
        const current = reputationMap[factionId] || 0;
        if (current < minReputation) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Start a quest
   */
  async startQuest(characterId, questId) {
    const character = await PlayerCharacter.findByPk(characterId);
    const quest = await Quest.findByPk(questId);
    
    if (!character) {
      throw new Error('Character not found');
    }
    
    if (!quest) {
      throw new Error('Quest not found');
    }
    
    // Check if quest is already active or completed
    const existing = await QuestProgress.findOne({
      where: { characterId, questId }
    });
    
    if (existing) {
      if (existing.status === 'active') {
        // Quest is already active - return existing progress instead of error
        console.log(`[Quest Service] Quest ${questId} already active for character ${characterId}, returning existing progress`);
        
        // If this is the tutorial quest, ensure tutorial state is quest_accepted
        if (questId === 'tutorial_001_dockside_initiation' || quest.questType === 'tutorial') {
          const tutorialService = require('./tutorialService');
          try {
            const { TutorialProgress } = require('../models');
            const tutorialProgress = await TutorialProgress.findOne({
              where: { characterId }
            });
            if (tutorialProgress && tutorialProgress.state !== 'quest_accepted' && 
                tutorialProgress.state !== 'combat_intro' && tutorialProgress.state !== 'combat_started') {
              await tutorialService.updateTutorialState(characterId, {
                state: 'quest_accepted'
              });
              console.log(`[Quest Service] Updated tutorial state to quest_accepted for already-active quest`);
            }
          } catch (tutorialError) {
            console.warn(`[Quest Service] Failed to update tutorial state (non-fatal):`, tutorialError.message);
          }
        }
        
        return {
          quest,
          progress: existing,
          alreadyActive: true
        };
      }
      
      if (existing.status === 'completed') {
        throw new Error('Quest already completed');
      }
      
      // If status is 'failed' or 'abandoned', allow restarting
      // Update existing record to active
      existing.status = 'active';
      existing.startedAt = new Date();
      existing.completedAt = null;
      existing.objectivesCompleted = {};
      existing.objectiveProgress = {};
      await existing.save();
      
      return {
        quest,
        progress: existing,
        restarted: true
      };
    }
    
    // Check prerequisites
    const completedQuests = await QuestProgress.findAll({
      where: { characterId, status: 'completed' }
    });
    const completedQuestIds = completedQuests.map(qp => qp.questId);
    const reputationMap = await this.getReputationMap(characterId);

    if (!this.checkPrerequisites(quest, character, completedQuestIds, reputationMap)) {
      throw new Error('Prerequisites not met');
    }
    
      // Create quest progress
    try {
      // findOrCreate closes the check-then-create race natively: if a concurrent
      // request created this progress between our earlier findOne and now, we get
      // that row back (created=false) instead of inserting a duplicate.
      const [progress, created] = await QuestProgress.findOrCreate({
        where: { characterId, questId },
        defaults: {
          characterId,
          questId,
          status: 'active',
          objectivesCompleted: {},
          objectiveProgress: {}
        }
      });

      // If it already existed in a non-active state (race lost), reactivate it.
      if (!created && progress.status !== 'active') {
        progress.status = 'active';
        progress.startedAt = new Date();
        progress.completedAt = null;
        progress.objectivesCompleted = {};
        progress.objectiveProgress = {};
        await progress.save();
      }

      // Phase 3: Track quest accepted event in conversation history
      if (quest.questGiverId || quest.giverId || quest.npcId) {
        const npcId = quest.questGiverId || quest.giverId || quest.npcId;
        try {
          const conversationHistoryService = require('./conversationHistoryService');
          await conversationHistoryService.saveConversationMessage(npcId, characterId, {
            sender: 'system',
            text: `Quest "${quest.title}" has been accepted.`,
            questId: quest.id,
            questContext: {
              questId: quest.id,
              action: 'accepted',
              timestamp: new Date()
            },
            topics: ['quest'],
            metadata: {
              messageType: 'quest_accepted',
              questTitle: quest.title
            }
          });
          console.log(`[Quest Service] ✓ Tracked quest accepted event in conversation history for NPC ${npcId}`);
        } catch (historyError) {
          console.warn(`[Quest Service] Failed to track quest accepted in conversation history (non-fatal):`, historyError.message);
        }
      }
      
      // If this is the tutorial quest, update tutorial state to quest_accepted
      if (questId === 'tutorial_001_dockside_initiation' || quest.questType === 'tutorial') {
        const tutorialService = require('./tutorialService');
        try {
          await tutorialService.updateTutorialState(characterId, {
            state: 'quest_accepted'
          });
          console.log(`[Quest Service] Updated tutorial state to quest_accepted for character ${characterId}`);
        } catch (tutorialError) {
          console.warn(`[Quest Service] Failed to update tutorial state (non-fatal):`, tutorialError.message);
        }
      }
      
      // Ensure quest POIs are created (in case they weren't created during quest generation)
      // Only create POIs if they don't already exist (check objective metadata)
      try {
        const questGiver = await NPC.findByPk(quest.questGiverId);
        if (questGiver) {
          // Reload quest to get fresh objectives
          await quest.reload();
          const objectives = quest.objectives || [];
          
          // Check if any objectives need POIs (don't have poiId in metadata)
          const objectivesNeedingPOIs = objectives.filter(obj => {
            // Only create POIs for collect, discover, and travel objectives
            if (!['collect', 'discover', 'travel'].includes(obj.type)) {
              return false;
            }
            // Check if POI already exists in metadata
            return !obj.metadata?.poiId;
          });
          
          if (objectivesNeedingPOIs.length > 0) {
            const planetId = questGiver.location?.planet || quest.startLocation?.planet || character.currentPlanet;
            if (planetId) {
              const { Planet } = require('../models');
              const planet = await Planet.findByPk(planetId);
              if (planet) {
                const questDependencyService = require('./questDependencyService');
                
                // Re-run dependency service to ensure POIs are created
                await questDependencyService.ensureQuestDependencies(quest, questGiver);
                console.log(`[Quest Service] Ensured quest dependencies for quest ${questId} (${objectivesNeedingPOIs.length} objectives needed POIs)`);
              }
            }
          } else {
            console.log(`[Quest Service] All objectives already have POIs for quest ${questId}`);
          }
        }
      } catch (poiError) {
        console.warn(`[Quest Service] Failed to ensure quest POIs (non-fatal):`, poiError.message);
        console.error(poiError.stack);
        // Don't fail quest acceptance if POI creation fails
      }
      
      return {
        quest,
        progress
      };
    } catch (error) {
      // Handle unique constraint violation (race condition)
      if (error.name === 'SequelizeUniqueConstraintError') {
        console.log(`[Quest Service] Unique constraint violation for quest ${questId}, fetching existing progress`);
        const existingProgress = await QuestProgress.findOne({
          where: { characterId, questId }
        });
        if (existingProgress && existingProgress.status === 'active') {
          return {
            quest,
            progress: existingProgress,
            alreadyActive: true
          };
        }
      }
      throw error;
    }
  }

  /**
   * Update quest objective
   */
  async updateObjective(characterId, questId, objectiveId, completed = true, progress = null, options = {}) {
    const { transaction } = options;
    // When inside a transaction, lock the row so concurrent objective updates
    // (e.g. two enemy kills resolving at once) serialize instead of clobbering
    // each other's JSONB progress (read-modify-write lost-update bug).
    const questProgress = await QuestProgress.findOne({
      where: { characterId, questId, status: 'active' },
      transaction,
      ...(transaction ? { lock: transaction.LOCK.UPDATE } : {})
    });

    if (!questProgress) {
      throw new Error('Quest not active');
    }

    questProgress.updateObjective(objectiveId, completed, progress);
    await questProgress.save({ transaction });

    // Check if all objectives are complete
    const quest = await Quest.findByPk(questId, { transaction });
    
    // Phase 3: Track objective completed event in conversation history
    if (completed && quest && (quest.questGiverId || quest.giverId || quest.npcId)) {
      const npcId = quest.questGiverId || quest.giverId || quest.npcId;
      const objective = quest.objectives?.find(obj => obj.id === objectiveId);
      
      if (objective) {
        try {
          const conversationHistoryService = require('./conversationHistoryService');
          await conversationHistoryService.saveConversationMessage(npcId, characterId, {
            sender: 'system',
            text: `Quest objective completed: ${objective.description || objectiveId}`,
            questId: quest.id,
            questContext: {
              questId: quest.id,
              objectiveId: objectiveId,
              action: 'objective_completed',
              timestamp: new Date()
            },
            topics: ['quest'],
            metadata: {
              messageType: 'quest_objective_completed',
              questTitle: quest.title,
              objectiveDescription: objective.description
            }
          });
          console.log(`[Quest Service] ✓ Tracked objective completed event in conversation history for NPC ${npcId}`);
        } catch (historyError) {
          console.warn(`[Quest Service] Failed to track objective completed in conversation history (non-fatal):`, historyError.message);
        }
      }
    }
    
    if (questProgress.areAllObjectivesComplete(quest)) {
      return await this.completeQuest(characterId, questId);
    }
    
    return {
      questProgress,
      quest
    };
  }

  /**
   * Complete a quest
   */
  async completeQuest(characterId, questId) {
    const questProgress = await QuestProgress.findOne({
      where: { characterId, questId, status: 'active' }
    });
    
    if (!questProgress) {
      throw new Error('Quest not active');
    }
    
    const quest = await Quest.findByPk(questId);
    
    if (!quest) {
      throw new Error('Quest not found');
    }
    
    // Mark quest as completed
    await questProgress.complete();
    
    // Award rewards
    const rewards = await this.awardRewards(characterId, quest.rewards);
    
    // Phase 2: Update NPC trust and emotional state if quest has NPC giver
    // Phase 3: Track quest completed event in conversation history
    if (quest.questGiverId || quest.giverId || quest.npcId) {
      const npcId = quest.questGiverId || quest.giverId || quest.npcId;
      try {
        const npc = await NPC.findByPk(npcId);
        if (npc) {
          // Update trust (quest completed)
          await trustService.updateTrust(npc, characterId, {
            type: 'quest_completed',
            questId: questId
          });
          
          // Update emotional state (positive event)
          await emotionalStateService.updateEmotionalState(npc, {
            type: 'quest_completed',
            questId: questId,
            characterId: characterId
          });
          
          // Phase 3: Track quest completed event in conversation history
          const conversationHistoryService = require('./conversationHistoryService');
          await conversationHistoryService.saveConversationMessage(npcId, characterId, {
            sender: 'system',
            text: `Quest "${quest.title}" has been completed.`,
            questId: quest.id,
            questContext: {
              questId: quest.id,
              action: 'completed',
              timestamp: new Date(),
              rewards: rewards
            },
            topics: ['quest'],
            metadata: {
              messageType: 'quest_completed',
              questTitle: quest.title
            }
          });
          console.log(`[Quest Service] ✓ Tracked quest completed event in conversation history for NPC ${npcId}`);
          
          // Phase 2.5: Mini-quest specific handling
          if (quest.questType === 'mini' && quest.miniQuestData) {
            const { NPCRelationship } = require('../models');
            const relationship = await NPCRelationship.findOne({
              where: { characterId, npcId }
            });
            
            if (relationship) {
              // Apply relationship bonus
              const bonus = quest.miniQuestData.relationshipBonus || 10;
              relationship.increaseRelationship(bonus);
              await relationship.save();
            }
            
            // Apply reputation consequences
            const consequences = quest.miniQuestData.consequences || {};
            if (consequences.reputationChanges) {
              const factionService = require('./factionService');
              for (const [factionId, change] of Object.entries(consequences.reputationChanges)) {
                if (change !== 0 && factionId) {
                  try {
                    await factionService.updateReputation(characterId, factionId, change);
                    console.log(`[Mini-Quest] Updated reputation for ${factionId}: ${change > 0 ? '+' : ''}${change}`);
                  } catch (error) {
                    console.error(`[Mini-Quest] Error updating reputation for ${factionId}:`, error);
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`[Quest Service] Error updating NPC trust/emotion for quest ${questId}:`, error);
        // Don't fail quest completion if NPC update fails
      }
    }
    
    // Unlock next quest in chain if this quest is part of a chain
    let nextQuest = null;
    if (quest.chainId) {
      nextQuest = await this.unlockNextInChain(characterId, questId);
    }
    
    return {
      questProgress,
      quest,
      rewards,
      nextQuest: nextQuest ? {
        id: nextQuest.id,
        title: nextQuest.title,
        chainOrder: nextQuest.chainOrder
      } : null
    };
  }

  /**
   * Award quest rewards
   */
  async awardRewards(characterId, rewards) {
    const awarded = {
      xp: 0,
      credits: 0,
      items: [],
      reputation: {},
      unlocks: []
    };
    
    const character = await PlayerCharacter.findByPk(characterId);
    
    // Award XP
    if (rewards.xp) {
      const xpResult = await characterService.addXP(characterId, rewards.xp, 'quest');
      awarded.xp = rewards.xp;
      awarded.leveledUp = xpResult.leveledUp;
    }
    
    // Award credits
    if (rewards.credits) {
      character.credits += rewards.credits;
      await character.save();
      awarded.credits = rewards.credits;
    }
    
    // Award items
    if (rewards.items && rewards.items.length > 0) {
      const { PlayerInventory } = require('../models');
      for (const itemId of rewards.items) {
        await PlayerInventory.addItem(characterId, itemId, 1, 'quest_reward');
        awarded.items.push(itemId);
      }
    }
    
    // Award faction reputation (would integrate with faction system)
    if (rewards.reputation) {
      awarded.reputation = rewards.reputation;
      // TODO: Integrate with faction system
    }
    
    // Process unlocks
    if (rewards.unlocks && rewards.unlocks.length > 0) {
      awarded.unlocks = rewards.unlocks;
      // TODO: Process unlocks (new quests, NPCs, areas, etc.)
    }
    
    return awarded;
  }

  /**
   * Abandon a quest
   */
  async abandonQuest(characterId, questId) {
    const questProgress = await QuestProgress.findOne({
      where: { characterId, questId, status: 'active' }
    });
    
    if (!questProgress) {
      throw new Error('Quest not active');
    }
    
    const quest = await Quest.findByPk(questId);
    
    await questProgress.abandon();
    
    // Phase 3: Track quest abandoned event in conversation history
    if (quest && (quest.questGiverId || quest.giverId || quest.npcId)) {
      const npcId = quest.questGiverId || quest.giverId || quest.npcId;
      try {
        const conversationHistoryService = require('./conversationHistoryService');
        await conversationHistoryService.saveConversationMessage(npcId, characterId, {
          sender: 'system',
          text: `Quest "${quest.title}" has been abandoned.`,
          questId: quest.id,
          questContext: {
            questId: quest.id,
            action: 'abandoned',
            timestamp: new Date()
          },
          topics: ['quest'],
          metadata: {
            messageType: 'quest_abandoned',
            questTitle: quest.title
          }
        });
        console.log(`[Quest Service] ✓ Tracked quest abandoned event in conversation history for NPC ${npcId}`);
      } catch (historyError) {
        console.warn(`[Quest Service] Failed to track quest abandoned in conversation history (non-fatal):`, historyError.message);
      }
    }
    
    // Clean up procedurally generated quest dependencies (POIs, NPCs, items)
    try {
      const questGiver = quest ? await NPC.findByPk(quest.questGiverId) : null;
      const planetId = questGiver?.location?.planet || quest?.startLocation?.planet;
      
      if (planetId) {
        const questPOIService = require('./questPOIService');
        // Remove POIs when quest is abandoned (remove = true)
        await questPOIService.cleanupQuestPOIs(questId, planetId, true);
        console.log(`[Quest Service] Cleaned up POIs for abandoned quest ${questId} on planet ${planetId}`);
      }
      
      // Clean up procedurally generated NPCs for this quest
      // Quest NPCs have IDs like: quest_combat_{questGiverId}_{timestamp}_{random}
      if (questGiver) {
        const { NPC } = require('../models');
        const questNPCs = await NPC.findAll({
          where: {
            id: {
              [require('sequelize').Op.like]: `quest_%_${questGiver.id}_%`
            },
            isAvailable: true
          }
        });
        
        // Also check objectives for NPC targets
        if (quest && quest.objectives) {
          for (const objective of quest.objectives) {
            if (objective.target && objective.target.startsWith('quest_')) {
              const targetNPC = await NPC.findByPk(objective.target);
              if (targetNPC && targetNPC.id.startsWith('quest_')) {
                questNPCs.push(targetNPC);
              }
            }
          }
        }
        
        // Mark quest NPCs as unavailable (soft delete)
        for (const npc of questNPCs) {
          npc.isAvailable = false;
          await npc.save();
          console.log(`[Quest Service] Marked quest NPC ${npc.id} (${npc.name}) as unavailable after quest abandonment`);
        }
        
        if (questNPCs.length > 0) {
          console.log(`[Quest Service] Cleaned up ${questNPCs.length} quest NPCs for abandoned quest ${questId}`);
        }
      }
    } catch (error) {
      console.error(`[Quest Service] Error cleaning up quest dependencies for abandoned quest ${questId}:`, error);
      // Don't fail quest abandonment if cleanup fails
    }
    
    // Phase 2: Update NPC trust if quest has NPC giver
    if (quest && (quest.giverId || quest.npcId || quest.questGiverId)) {
      const npcId = quest.giverId || quest.npcId || quest.questGiverId;
      try {
        const npc = await NPC.findByPk(npcId);
        if (npc) {
          // Update trust (quest abandoned)
          await trustService.updateTrust(npc, characterId, {
            type: 'quest_abandoned',
            questId: questId
          });
        }
      } catch (error) {
        console.error(`[Quest Service] Error updating NPC trust for abandoned quest ${questId}:`, error);
        // Don't fail quest abandonment if NPC update fails
      }
    }
    
    // Enhancement: Decrease relationship when quest is abandoned
    // Scale penalty based on quest importance
    if (quest && (quest.questGiverId || quest.giverId || quest.npcId)) {
      const npcId = quest.questGiverId || quest.giverId || quest.npcId;
      try {
        const { NPCRelationship } = require('../models');
        const relationship = await NPCRelationship.findOne({
          where: { characterId, npcId }
        });
        
        if (relationship) {
          // Calculate penalty based on quest type
          let penalty = -5; // Default for mini quests
          if (quest.questType === 'main' || quest.questType === 'story') {
            penalty = -10; // Main/story quests are more important
          } else if (quest.questType === 'tutorial') {
            penalty = -2; // Tutorial quests are less harsh (learning experience)
          } else if (quest.questType === 'mini') {
            penalty = -5; // Mini quests are moderate
          }
          
          const oldLevel = relationship.relationshipLevel;
          relationship.decreaseRelationship(Math.abs(penalty));
          await relationship.save();
          
          console.log(`[Quest Service] Relationship decreased for quest abandonment: ${oldLevel} → ${relationship.relationshipLevel} (penalty: ${penalty})`);
        }
      } catch (error) {
        console.error(`[Quest Service] Error updating relationship for abandoned quest ${questId}:`, error);
        // Don't fail quest abandonment if relationship update fails
      }
    }
    
    return { success: true };
  }

  /**
   * Get active quests for character
   */
  async getActiveQuests(characterId) {
    // Verify character exists
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    const questProgress = await QuestProgress.findAll({
      where: {
        characterId,
        status: 'active'
      },
      order: [['started_at', 'DESC']]
    });
    
    const quests = await Promise.all(
      questProgress.map(async (progress) => {
        const quest = await Quest.findByPk(progress.questId);
        if (!quest) {
          return null; // Skip if quest not found
        }
        return {
          quest,
          progress
        };
      })
    );
    
    // Filter out null values
    return quests.filter(q => q !== null);
  }

  /**
   * Get completed quests for character
   */
  async getCompletedQuests(characterId) {
    // Verify character exists
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    const questProgress = await QuestProgress.findAll({
      where: {
        characterId,
        status: 'completed'
      },
      order: [['completed_at', 'DESC']]
    });
    
    const quests = await Promise.all(
      questProgress.map(async (progress) => {
        const quest = await Quest.findByPk(progress.questId);
        if (!quest) {
          return null; // Skip if quest not found
        }
        return {
          quest,
          progress
        };
      })
    );
    
    // Filter out null values
    return quests.filter(q => q !== null);
  }

  /**
   * Get quest by ID
   */
  async getQuest(questId, characterId = null) {
    const quest = await Quest.findByPk(questId);
    
    if (!quest) {
      throw new Error('Quest not found');
    }
    
    let questData = quest.toJSON();
    
    // For tutorial quests, customize objectives based on character's background
    if (quest.questType === 'tutorial' && characterId && quest.id === 'tutorial_001_dockside_initiation') {
      const character = await PlayerCharacter.findByPk(characterId);
      if (character && character.background) {
        const tutorialService = require('./tutorialService');
        const tutorialConfig = tutorialService.getTutorialConfigForBackground(character.background);
        
        // Update objectives with character-specific NPC name
        if (questData.objectives && Array.isArray(questData.objectives)) {
          questData.objectives = questData.objectives.map(obj => {
            if (obj.id === 'tutorial_move') {
              return {
                ...obj,
                description: `Move to ${tutorialConfig.npcName}`,
                target: tutorialConfig.npcLocation
              };
            } else if (obj.id === 'tutorial_talk') {
              return {
                ...obj,
                description: `Talk to ${tutorialConfig.npcName}`,
                target: tutorialConfig.npcId
              };
            } else if (obj.id === 'tutorial_return') {
              return {
                ...obj,
                description: `Return to ${tutorialConfig.npcName}`,
                target: tutorialConfig.npcId
              };
            }
            return obj;
          });
        }
        
        // Update quest giver ID
        questData.questGiverId = tutorialConfig.npcId;
      }
    }
    
    // Get quest giver NPC if exists
    if (questData.questGiverId) {
      const questGiver = await NPC.findByPk(questData.questGiverId);
      questData.questGiver = questGiver;
    }
    
    return questData;
  }

  /**
   * Get quests by faction
   */
  async getQuestsByFaction(factionId) {
    return await Quest.findByFaction(factionId);
  }

  /**
   * Get all quests in a quest chain
   * @param {string} chainId - Chain identifier
   * @returns {Promise<Array>} Array of quests in chain order
   */
  async getQuestChain(chainId) {
    const quests = await Quest.findAll({
      where: { chainId, isActive: true },
      order: [['chainOrder', 'ASC']]
    });
    return quests;
  }

  /**
   * Get the next available quest in a chain for a character
   * @param {string} characterId - Character ID
   * @param {string} chainId - Chain identifier
   * @returns {Promise<Quest|null>} Next quest or null if chain complete or unavailable
   */
  async getNextQuestInChain(characterId, chainId) {
    const chain = await this.getQuestChain(chainId);
    if (chain.length === 0) {
      return null;
    }

    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    // Get character's completed quests
    const questProgress = await QuestProgress.findAll({
      where: { characterId }
    });
    const completedQuestIds = questProgress
      .filter(qp => qp.status === 'completed')
      .map(qp => qp.questId);

    const reputationMap = await this.getReputationMap(characterId);

    // Find first quest in chain that isn't completed and can be started
    for (const quest of chain) {
      if (!completedQuestIds.includes(quest.id)) {
        const canStart = this.checkPrerequisites(quest, character, completedQuestIds, reputationMap);
        if (canStart) {
          return quest;
        }
        // Can't start this quest yet, so chain is blocked
        return null;
      }
    }

    // All quests in chain are completed
    return null;
  }

  /**
   * Unlock the next quest in a chain after completing a quest
   * @param {string} characterId - Character ID
   * @param {string} completedQuestId - ID of quest that was just completed
   * @returns {Promise<Quest|null>} Next unlocked quest or null
   */
  async unlockNextInChain(characterId, completedQuestId) {
    const completedQuest = await Quest.findByPk(completedQuestId);
    if (!completedQuest || !completedQuest.chainId) {
      return null; // Not part of a chain
    }

    const nextQuest = await this.getNextQuestInChain(characterId, completedQuest.chainId);
    
    // The next quest is now available (prerequisites are checked dynamically)
    // We could emit an event or notification here if needed
    return nextQuest;
  }

  /**
   * Validate a quest chain structure
   * @param {string} chainId - Chain identifier
   * @returns {Promise<Object>} Validation result with errors array
   */
  async validateQuestChain(chainId) {
    const chain = await this.getQuestChain(chainId);
    const errors = [];

    if (chain.length === 0) {
      errors.push(`No quests found for chain: ${chainId}`);
      return { valid: false, errors };
    }

    // Check for gaps in chainOrder
    const orders = chain.map(q => q.chainOrder).sort((a, b) => a - b);
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i + 1) {
        errors.push(`Gap in chain order at position ${i + 1}. Expected ${i + 1}, found ${orders[i]}`);
      }
    }

    // Check prerequisites chain correctly
    for (let i = 1; i < chain.length; i++) {
      const prevQuest = chain[i - 1];
      const currentQuest = chain[i];
      
      const prereqs = currentQuest.prerequisites || {};
      const completedQuests = prereqs.completedQuests || [];
      
      if (!completedQuests.includes(prevQuest.id)) {
        errors.push(`Quest ${currentQuest.id} (order ${currentQuest.chainOrder}) does not require previous quest ${prevQuest.id} (order ${prevQuest.chainOrder}) in prerequisites`);
      }
    }

    // Check that unlocks chain correctly
    for (let i = 0; i < chain.length - 1; i++) {
      const currentQuest = chain[i];
      const nextQuest = chain[i + 1];
      
      const rewards = currentQuest.rewards || {};
      const unlocks = rewards.unlocks || [];
      
      if (!unlocks.includes(nextQuest.id)) {
        errors.push(`Quest ${currentQuest.id} (order ${currentQuest.chainOrder}) does not unlock next quest ${nextQuest.id} (order ${nextQuest.chainOrder}) in rewards.unlocks`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      chainLength: chain.length
    };
  }

  /**
   * Get character's progress in a quest chain
   * @param {string} characterId - Character ID
   * @param {string} chainId - Chain identifier
   * @returns {Promise<Object>} Chain progress information
   */
  async getChainProgress(characterId, chainId) {
    const chain = await this.getQuestChain(chainId);
    if (chain.length === 0) {
      return { chainId, totalQuests: 0, completedQuests: 0, currentQuest: null, progress: 0 };
    }

    const questProgress = await QuestProgress.findAll({
      where: { characterId }
    });
    const completedQuestIds = questProgress
      .filter(qp => qp.status === 'completed')
      .map(qp => qp.questId);

    const completedCount = chain.filter(q => completedQuestIds.includes(q.id)).length;
    const currentQuest = await this.getNextQuestInChain(characterId, chainId);
    
    return {
      chainId,
      totalQuests: chain.length,
      completedQuests: completedCount,
      currentQuest: currentQuest ? {
        id: currentQuest.id,
        title: currentQuest.title,
        chainOrder: currentQuest.chainOrder
      } : null,
      progress: chain.length > 0 ? (completedCount / chain.length) * 100 : 0,
      isComplete: completedCount === chain.length
    };
  }
}

module.exports = new QuestService();
