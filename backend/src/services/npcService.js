/**
 * NPC Service
 * Business logic for NPC interactions and dialogue
 */

const { NPC, NPCRelationship, PlayerCharacter } = require('../models');
const factionService = require('./factionService');
const dialogueTemplateService = require('./dialogueTemplateService');
const aiDialogueService = require('./aiDialogueService');
const questService = require('./questService');
const memoryService = require('./memoryService');
const emotionalStateService = require('./emotionalStateService');
const personalityService = require('./personalityService');
const motivationService = require('./motivationService');
const trustService = require('./trustService');
const behaviorTreeService = require('./behaviorTreeService');
const conversationHistoryService = require('./conversationHistoryService');
const conversationContextService = require('./conversationContextService');

class NPCService {
  /**
   * Get NPC by ID
   */
  async getNPC(npcId) {
    const npc = await NPC.findByPk(npcId);
    
    if (!npc) {
      throw new Error('NPC not found');
    }
    
    return npc;
  }

  /**
   * Get NPC with relationship data for character
   */
  async getNPCWithRelationship(npcId, characterId) {
    // Explicitly load NPC with all fields including factionId
    const npc = await NPC.findByPk(npcId);
    
    if (!npc) {
      throw new Error('NPC not found');
    }
    
    // Debug: Log factionId to verify it's loaded
    if (process.env.NODE_ENV === 'development') {
      console.log(`[NPC] Loaded NPC ${npc.id} (${npc.name}): factionId = ${npc.factionId || 'null/undefined'}`);
    }
    
    let relationship = await NPCRelationship.findOne({
      where: { npcId, characterId }
    });
    
    // Create relationship if doesn't exist
    if (!relationship) {
      relationship = await NPCRelationship.create({
        npcId,
        characterId,
        relationshipLevel: 0
      });
    }
    
    return {
      npc,
      relationship
    };
  }

  /**
   * Get greeting based on relationship level
   */
  getGreeting(npc, relationshipLevel) {
    const tier = this.getRelationshipTier(relationshipLevel);
    
    if (npc.dialogue && npc.dialogue.greeting && npc.dialogue.greeting[tier]) {
      return npc.dialogue.greeting[tier];
    }
    
    // Default greetings
    const defaults = {
      stranger: `Hello. I don't believe we've met.`,
      acquaintance: `Oh, hello again.`,
      friend: `Good to see you, friend.`,
      confidant: `My dear friend, welcome.`
    };
    
    return defaults[tier];
  }

  /**
   * Get relationship tier
   */
  getRelationshipTier(level) {
    if (level < 21) return 'stranger';
    if (level < 51) return 'acquaintance';
    if (level < 81) return 'friend';
    return 'confidant';
  }

  /**
   * Helper method to save conversation messages with enhanced structure
   * @private
   */
  async _saveConversationMessages(npcId, characterId, playerMessage, npcResponse, options = {}) {
    try {
      // Build conversation context
      const context = await conversationContextService.buildContext(npcId, characterId, playerMessage);
      
      // Determine quest context
      const questContext = options.questContext || (context.questContext ? {
        questId: context.questContext.questId,
        action: options.questAction || 'discussed'
      } : null);
      
      // Get emotional context
      const { npc } = await this.getNPCWithRelationship(npcId, characterId);
      const emotionalContext = {
        npcEmotion: emotionalStateService.getCurrentEmotion(npc) || 'neutral',
        relationshipLevel: context.relationshipLevel
      };
      
      // Save player message
      await conversationHistoryService.saveConversationMessage(npcId, characterId, {
        sender: 'player',
        text: playerMessage || '',
        topics: context.currentTopics || [],
        questId: questContext?.questId || null,
        questContext: questContext,
        emotionalContext,
        metadata: {
          messageType: conversationContextService.detectMessageType(playerMessage || ''),
          conversationThread: conversationContextService.getConversationThread(context),
          ...options.metadata
        }
      });
      
      // Save NPC response
      await conversationHistoryService.saveConversationMessage(npcId, characterId, {
        sender: 'npc',
        text: npcResponse || '',
        topics: context.currentTopics || [],
        questId: questContext?.questId || null,
        questContext: questContext,
        emotionalContext,
        metadata: {
          messageType: 'response',
          conversationThread: conversationContextService.getConversationThread(context),
          ...options.metadata
        }
      });
    } catch (error) {
      // Log error but don't fail dialogue if history save fails
      console.error('[NPC Service] Error saving conversation history:', error);
      // Fallback to old method
      const { relationship } = await this.getNPCWithRelationship(npcId, characterId);
      relationship.addConversation(playerMessage || '', npcResponse || '');
      await relationship.save();
    }
  }

  /**
   * Process dialogue interaction
   */
  async processDialogue(npcId, characterId, playerMessage) {
    const { npc, relationship } = await this.getNPCWithRelationship(npcId, characterId);
    
    // Check if this is a tutorial NPC - use tutorial dialogue tree instead of AI
    const tutorialDialogueService = require('./tutorialDialogueService');
    if (tutorialDialogueService.isTutorialNPC(npcId)) {
      const character = await require('../models').PlayerCharacter.findByPk(characterId);
      
      if (!character) {
        throw new Error('Character not found');
      }
      
      const { TutorialProgress } = require('../models');
      const tutorialProgress = await TutorialProgress.findOne({
        where: { characterId }
      });
      let tutorialState = tutorialProgress?.state || 'dialogue_started';
      
      // Handle post-combat and post-vendor states - pass them directly to dialogue service
      // These states need special handling for tutorial progression dialogue
      if (tutorialState === 'combat_complete' || tutorialState === 'vendor_intro' || 
          tutorialState === 'item_sold' || tutorialState === 'loot_received' || 
          tutorialState === 'inventory_opened' || tutorialState === 'spaceport_exit_explained') {
        console.log(`[NPC Service] Tutorial state is ${tutorialState}, passing directly to dialogue service for tutorial progression dialogue`);
        // Keep the state as-is for dialogue processing
      } else if (tutorialState !== 'quest_accepted' && tutorialState !== 'quest_objective_tracking' && tutorialState !== 'combat_intro' && tutorialState !== 'combat_started') {
        // Check if quest is already accepted - if so, update state to quest_accepted
        // This handles the case where quest was accepted but tutorial state wasn't updated yet
        const { QuestProgress } = require('../models');
        const questProgress = await QuestProgress.findOne({
          where: {
            characterId,
            questId: 'tutorial_001_dockside_initiation',
            status: 'active'
          }
        });
        
        if (questProgress) {
          // Quest is active, so we should be in quest_accepted state for dialogue purposes
          tutorialState = 'quest_accepted';
          console.log(`[NPC Service] Tutorial quest is active, updating dialogue state to quest_accepted`);
        }
      } else if (tutorialState === 'quest_objective_tracking' || tutorialState === 'combat_intro') {
        // If we're in quest_objective_tracking or combat_intro, treat it as quest_accepted for dialogue purposes
        // This allows the player to still trigger combat intro dialogue or proceed with combat
        console.log(`[NPC Service] Tutorial state is ${tutorialState}, treating as quest_accepted for dialogue`);
        tutorialState = 'quest_accepted'; // Use quest_accepted for dialogue processing
      }
      
      console.log(`[NPC Service] Processing tutorial dialogue with state: ${tutorialState}`);
      
      try {
        const tutorialDialogue = await tutorialDialogueService.processTutorialDialogue(
          npcId,
          characterId,
          playerMessage,
          tutorialState,
          character
        );
        
        if (!tutorialDialogue || !tutorialDialogue.response) {
          console.error(`[NPC Service] Tutorial dialogue service returned invalid response:`, tutorialDialogue);
          throw new Error('Invalid dialogue response from tutorial service');
        }
        
        // Add to conversation history using enhanced service
        await this._saveConversationMessages(
          npcId,
          characterId,
          playerMessage,
          tutorialDialogue.response,
          {
            questContext: tutorialDialogue.offerQuest ? {
              questId: 'tutorial_001_dockside_initiation',
              action: 'offered'
            } : null,
            metadata: {
              isTutorial: true,
              messageType: 'tutorial'
            }
          }
        );
        
        const responseData = {
          response: tutorialDialogue.response,
          relationshipLevel: relationship.relationshipLevel,
          relationshipTier: relationship.getRelationshipTier(),
          offerQuest: tutorialDialogue.offerQuest || false,
          questId: tutorialDialogue.offerQuest ? 'tutorial_001_dockside_initiation' : null,
          questType: 'tutorial',
          suggestedResponses: tutorialDialogue.suggestedResponses || [],
          isTutorial: true,
          nextState: tutorialDialogue.nextState,
          // Golden-path closing fork (faction lean + onward destination)
          closingChoice: tutorialDialogue.closingChoice || null,
          reputationChanges: tutorialDialogue.reputationChanges || []
        };
        
        console.log(`[NPC Service] Returning tutorial dialogue response with nextState:`, responseData.nextState);
        
        return responseData;
      } catch (error) {
        console.error(`[NPC Service] Error processing tutorial dialogue:`, error);
        console.error(`[NPC Service] Error stack:`, error.stack);
        throw error;
      }
    }
    const character = await PlayerCharacter.findByPk(characterId);
    
    if (!character) {
      throw new Error('Character not found');
    }
    
    // Update quest objectives BEFORE checking for quest dialogue
    // This ensures objectives are tracked even if the dialogue doesn't match quest keywords
    const { QuestProgress, Quest } = require('../models');
    const activeQuests = await QuestProgress.findAll({
      where: {
        characterId: character.id,
        status: 'active'
      },
      include: [{
        model: Quest,
        as: 'quest'
      }]
    });

    // Check for quest objectives that target this NPC
    for (const questProgress of activeQuests) {
      const quest = questProgress.quest || await Quest.findByPk(questProgress.questId);
      if (!quest || !quest.objectives) continue;

      for (const objective of quest.objectives) {
        // Skip if already completed
        if (questProgress.objectivesCompleted?.[objective.id]) {
          continue;
        }
        
        // Check for "interact" type objectives
        // Only complete if this is NOT the quest giver OR if all previous objectives are complete
        if (objective.type === 'interact' && objective.target === npc.id) {
          // Check if this NPC is the quest giver
          const isQuestGiver = quest.questGiverId === npc.id;
          
          // If this is the quest giver, only complete if all other objectives are done
          // (This prevents auto-completing "report back" objectives when accepting quests)
          if (isQuestGiver) {
            const allOtherObjectivesComplete = quest.objectives
              .filter(obj => obj.id !== objective.id)
              .every(obj => questProgress.objectivesCompleted?.[obj.id] === true);
            
            if (!allOtherObjectivesComplete) {
              console.log(`[Quest] Skipping interact objective ${objective.id} - quest giver interaction, but other objectives not complete`);
              continue;
            }
          }
          
          // Mark this objective as complete
          console.log(`[Quest] Marking objective ${objective.id} as complete (interacted with ${npc.name})`);
          try {
            await questService.updateObjective(
              character.id,
              quest.id,
              objective.id,
              true
            );
            console.log(`[Quest] ✓ Objective ${objective.id} updated successfully`);
          } catch (error) {
            console.error(`[Quest] Failed to update objective:`, error);
          }
        }
        // Check for "deliver" type objectives
        else if (objective.type === 'deliver' && objective.target === npc.id) {
          // Check if prerequisite collect objectives are complete first
          // Find all "collect" type objectives in this quest
          const collectObjectives = quest.objectives.filter(obj => obj.type === 'collect');
          const allCollectObjectivesComplete = collectObjectives.length === 0 || 
            collectObjectives.every(obj => questProgress.objectivesCompleted?.[obj.id] === true);
          
          if (!allCollectObjectivesComplete) {
            console.log(`[Quest] Skipping deliver objective ${objective.id} - prerequisite collect objectives not complete`);
            continue;
          }
          
          // Check if player has required items in inventory
          const requiredItem = objective.itemId || objective.targetItem;
          if (requiredItem) {
            const { PlayerInventory } = require('../models');
            const inventoryItem = await PlayerInventory.findOne({
              where: {
                characterId: character.id,
                itemId: requiredItem,
                equipped: false
              }
            });
            
            if (inventoryItem && inventoryItem.quantity >= (objective.count || 1)) {
              // Remove items from inventory
              const removeQuantity = objective.count || 1;
              if (inventoryItem.quantity > removeQuantity) {
                inventoryItem.quantity -= removeQuantity;
                await inventoryItem.save();
              } else {
                await inventoryItem.destroy();
              }
              
              // Mark objective as complete
              console.log(`[Quest] Delivering ${removeQuantity}x ${requiredItem} to ${npc.name}`);
              try {
                await questService.updateObjective(
                  character.id,
                  quest.id,
                  objective.id,
                  true,
                  { deliveredItem: requiredItem, deliveredCount: removeQuantity, deliveredAt: new Date().toISOString() }
                );
                console.log(`[Quest] ✓ Deliver objective ${objective.id} completed`);
              } catch (error) {
                console.error(`[Quest] Failed to update deliver objective:`, error);
              }
            } else {
              console.log(`[Quest] Player does not have required item ${requiredItem} for deliver objective ${objective.id}`);
            }
          } else {
            // No specific item required, but we still need to check if collect objectives are done
            // If there are collect objectives, try to find the item from the collect objective
            if (collectObjectives.length > 0) {
              // Find the item from the first collect objective
              const collectItem = collectObjectives[0].target;
              const { PlayerInventory } = require('../models');
              const inventoryItem = await PlayerInventory.findOne({
                where: {
                  characterId: character.id,
                  itemId: collectItem,
                  equipped: false
                }
              });
              
              if (inventoryItem && inventoryItem.quantity >= (collectObjectives[0].count || 1)) {
                // Remove items from inventory (use count from collect objective)
                const removeQuantity = collectObjectives[0].count || 1;
                if (inventoryItem.quantity > removeQuantity) {
                  inventoryItem.quantity -= removeQuantity;
                  await inventoryItem.save();
                } else {
                  await inventoryItem.destroy();
                }
                
                // Mark objective as complete
                console.log(`[Quest] Delivering ${removeQuantity}x ${collectItem} to ${npc.name} (from collect objective)`);
                try {
                  await questService.updateObjective(
                    character.id,
                    quest.id,
                    objective.id,
                    true,
                    { deliveredItem: collectItem, deliveredCount: removeQuantity, deliveredAt: new Date().toISOString() }
                  );
                  console.log(`[Quest] ✓ Deliver objective ${objective.id} completed`);
                } catch (error) {
                  console.error(`[Quest] Failed to update deliver objective:`, error);
                }
              } else {
                console.log(`[Quest] Player does not have required items from collect objective for deliver objective ${objective.id}`);
              }
            } else {
              // No collect objectives and no specific item required - just delivering to NPC completes it
              // (This is for quests that don't require collecting items first)
              await questService.updateObjective(
                character.id,
                quest.id,
                objective.id,
                true,
                { deliveredTo: npc.id, deliveredAt: new Date().toISOString() }
              );
              console.log(`[Quest] ✓ Deliver objective ${objective.id} completed (no item required, no collect objectives)`);
            }
          }
        }
      }
    }

    // Check if a quest was just accepted (within last 30 seconds) - do this BEFORE quest dialogue check
    // This ensures thank you messages are shown even if NPC doesn't have quest-related dialogue
    const now = new Date();
    const recentlyAcceptedQuests = await QuestProgress.findAll({
      where: {
        characterId: character.id,
        status: 'active'
      }
    });
    
    const recentlyAcceptedQuest = recentlyAcceptedQuests.find(qp => {
      if (!qp.startedAt) return false;
      const startedAt = new Date(qp.startedAt);
      const secondsSinceAcceptance = (now - startedAt) / 1000;
      // Check if quest was accepted within last 30 seconds
      return secondsSinceAcceptance < 30 && secondsSinceAcceptance >= 0;
    });
    
    if (recentlyAcceptedQuest) {
      const quest = await Quest.findByPk(recentlyAcceptedQuest.questId);
      // Only show thank you if this NPC is the quest giver
      if (quest && quest.questGiverId === npc.id) {
        // Check if player message is empty or a greeting (indicating dialogue just opened)
        const isGreeting = !playerMessage || 
          playerMessage.trim() === '' || 
          /^(hi|hello|hey|greetings|what do you want|how are you)/i.test(playerMessage.trim());
        
        if (isGreeting) {
          // Check for quest-specific thank you dialogue in NPC's quest-related dialogue
          let thankYouMessage = null;
          if (npc.dialogue && npc.dialogue.questRelated) {
            const thankYouKey = `${recentlyAcceptedQuest.questId}_accepted`;
            thankYouMessage = npc.dialogue.questRelated[thankYouKey];
          }
          
          // Fallback: Generate a generic thank you message
          if (!thankYouMessage) {
            const questTitle = quest.title || 'this quest';
            thankYouMessage = `Thank you for accepting ${questTitle}! I really appreciate your help. ${quest.objectives && quest.objectives.length > 0 ? 'Check your quest log for details on what needs to be done.' : ''}`;
          }
          
          console.log(`[NPC Service] ✓ Showing quest accepted thank you for quest: ${recentlyAcceptedQuest.questId}`);
          
          // Add to conversation history using enhanced service
          await this._saveConversationMessages(
            npc.id,
            character.id,
            playerMessage || '',
            thankYouMessage,
            {
              questContext: {
                questId: recentlyAcceptedQuest.questId,
                action: 'accepted'
              },
              metadata: {
                messageType: 'quest_accepted'
              }
            }
          );
          memoryService.processConversation(npc, character.id, playerMessage || '', thankYouMessage);
          
          return {
            response: thankYouMessage,
            relationshipLevel: relationship.relationshipLevel,
            relationshipTier: relationship.getRelationshipTier()
          };
        }
      }
    }
    
    // Check for quest-related dialogue
    const questResponse = await this.checkQuestDialogue(npc, playerMessage, character);
    if (questResponse) {
      // Add to conversation history using enhanced service
      await this._saveConversationMessages(
        npc.id,
        character.id,
        playerMessage,
        questResponse,
        {
          questContext: {
            questId: quest.id,
            action: 'discussed'
          },
          metadata: {
            messageType: 'quest'
          }
        }
      );
      
      // Small faction reputation gain for quest interactions
      const questReputationChanges = [];
      if (npc.factionId) {
        try {
          const change = await factionService.applyReputationChange(
            characterId, npc.factionId, 2, { reason: 'quest-dialogue' }
          );
          questReputationChanges.push({
            factionId: change.factionId,
            factionName: factionService.getFactionProfile(npc.factionId)?.name || npc.factionId,
            delta: change.delta,
            oldTier: change.oldTier,
            newTier: change.newTier,
            tierChanged: change.tierChanged,
            total: change.total
          });
          console.log(`[Faction] quest-dialogue ${npc.factionId} ${change.oldTier}->${change.newTier} (+${change.delta})`);
        } catch (error) {
          console.error(`[Faction] Failed to update faction reputation for ${npc.factionId}:`, error.message);
          console.error(error.stack);
        }
      }

      return {
        response: questResponse,
        relationshipLevel: relationship.relationshipLevel,
        relationshipTier: relationship.getRelationshipTier(),
        reputationChanges: questReputationChanges
      };
    }
    
    // Phase 1: Ensure NPC has personality profile
    if (!npc.personalityProfile) {
      personalityService.migrateLegacyTraits(npc);
      if (!npc.personalityProfile) {
        npc.personalityProfile = personalityService.generatePersonalityProfile(npc);
      }
    }

    // Phase 1: Initialize memory if needed
    if (!npc.memory) {
      npc.memory = memoryService.initializeMemory(npc);
    }

    // Phase 2: Initialize motivations if needed
    if (!npc.motivations || !npc.motivations.primaryGoal?.description) {
      // Use NPC ID as seed for consistent randomization per NPC
      let seedValue = npc.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const seededRandom = () => {
        seedValue = (seedValue * 9301 + 49297) % 233280;
        return seedValue / 233280;
      };
      npc.motivations = motivationService.generateMotivations(
        {
          species: npc.species,
          occupation: npc.occupation,
          factionId: npc.factionId,
          location: npc.location,
          npcType: npc.npcType
        },
        seededRandom
      );
    }

    // Phase 2: Initialize trust system if needed
    if (!npc.trustSystem) {
      trustService.initializeTrust(npc, relationship);
    } else {
      // Apply decay to existing trust
      trustService.applyDecay(npc.trustSystem);
    }

    // Phase 1: Initialize emotional state if needed (with randomization)
    if (!npc.emotionalState) {
      // Use NPC ID as seed for consistent randomization per NPC
      let seedValue = npc.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const seededRandom = () => {
        seedValue = (seedValue * 9301 + 49297) % 233280;
        return seedValue / 233280;
      };
      npc.emotionalState = emotionalStateService.initializeEmotionalState(npc, seededRandom);
    }

    // Phase 3: Gather contextual awareness
    const contextService = require('./contextService');
    const context = contextService.getContext(npc);
    
    // Update NPC contextual awareness (async, don't wait)
    contextService.updateContextualAwareness(npc).catch(err => {
      console.error('[NPC Service] Failed to update contextual awareness:', err);
    });

    // Phase 2: Execute behavior tree before normal dialogue generation
    const behaviorTree = behaviorTreeService.buildConversationBehaviorTree(npc, relationship, character);
    const behaviorContext = {
      npc,
      relationship,
      character,
      playerMessage,
      response: null,
      proceedNormal: false,
      offerQuest: false,
      hintQuest: false,
      trustGated: false,
      endConversation: false,
      behaviorOverride: false,
      context: context // Phase 3: Include context in behavior context
    };
    
    await behaviorTreeService.executeTree(behaviorTree, behaviorContext);
    
    // Check if behavior tree determined special response
    if (behaviorContext.endConversation) {
      // Add to conversation history using enhanced service
      await this._saveConversationMessages(
        npc.id,
        character.id,
        playerMessage,
        behaviorContext.response,
        {
          metadata: {
            messageType: 'end_conversation'
          }
        }
      );
      
      return {
        response: behaviorContext.response,
        relationshipLevel: relationship.relationshipLevel,
        relationshipTier: relationship.getRelationshipTier(),
        endConversation: true
      };
    }
    
    // Phase 3: Check for quest negotiation conversation tree
    // Only use conversation tree if:
    // 1. A quest is being offered (offerQuest && questId)
    // 2. The player message is actually quest-related (not a greeting or casual conversation)
    if (behaviorContext.offerQuest && behaviorContext.questId) {
      const conversationTreeService = require('./conversationTreeService');
      const { Quest } = require('../models');
      const quest = await Quest.findByPk(behaviorContext.questId);
      
      if (quest) {
        // Check if player message is quest-related before using conversation tree
        const message = (playerMessage || '').toLowerCase().trim();
        const isQuestRelated = /quest|mission|job|work|task|help.*you|assist|offer|proposal|deal|agreement|yes|no|accept|decline|tell me more|more info|details|explain|negotiate|reward|payment/i.test(message);
        const isGreeting = /^(hi|hello|hey|greetings|good (morning|afternoon|evening)|how are you|what's up|how's it going)/i.test(message);
        
        // Only use conversation tree for quest-related messages (not greetings)
        if (isQuestRelated && !isGreeting) {
          const choice = conversationTreeService.detectChoice(playerMessage);
          if (choice) {
            // Build conversation tree for quest negotiation
            const questTree = conversationTreeService.buildQuestNegotiationTree(
              npc,
              quest,
              relationship,
              character
            );
            
            const treeResult = await conversationTreeService.executeTree(questTree, {
              npc,
              relationship,
              character,
              playerMessage,
              quest
            });
            
            if (treeResult.response) {
              // Apply relationship and trust changes
              if (treeResult.relationshipChange !== 0) {
                relationship.increaseRelationship(treeResult.relationshipChange);
                // Save relationship with updated level
                await relationship.save();
                // Reload to ensure we have the latest value
                await relationship.reload();
                console.log(`[NPC Service] Relationship updated via conversation tree: level=${relationship.relationshipLevel}, change=${treeResult.relationshipChange}`);
              }
              if (treeResult.trustChange !== 0) {
                await trustService.updateTrust(npc, character.id, {
                  type: treeResult.questAccepted ? 'player_helped' : 'quest_negotiation',
                  amount: treeResult.trustChange
                });
              }
              
              await this._saveConversationMessages(
                npc.id,
                character.id,
                playerMessage,
                treeResult.response,
                {
                  questContext: behaviorContext.questId ? {
                    questId: behaviorContext.questId,
                    action: treeResult.questAccepted ? 'accepted' : 'discussed'
                  } : null,
                  metadata: {
                    messageType: 'dialogue_tree'
                  }
                }
              );
              memoryService.processConversation(npc, character.id, playerMessage, treeResult.response);
              
              return {
                response: treeResult.response,
                relationshipLevel: relationship.relationshipLevel,
                relationshipTier: relationship.getRelationshipTier(),
                offerQuest: treeResult.questAccepted ? false : behaviorContext.offerQuest, // Clear offer if accepted
                questId: treeResult.questAccepted ? behaviorContext.questId : null, // Keep quest ID if accepted
                questType: behaviorContext.questType || 'mini',
                moralAlignment: behaviorContext.moralAlignment,
                questAccepted: treeResult.questAccepted,
                questDeclined: treeResult.questDeclined
              };
            }
          }
        }
        // If quest is offered but message is not quest-related (e.g., greeting),
        // fall through to normal AI dialogue generation
        // The quest offer will still be included in the response
      }
    }

    // Use behavior override for hard blocks AND help acceptance
    if (behaviorContext.behaviorOverride && behaviorContext.response) {
      const isHardOverride = behaviorContext.trustGated || behaviorContext.hostile || behaviorContext.acceptHelp;
      
      if (isHardOverride) {
        // Hard override: use behavior tree response (trust blocking, faction conflict, help acceptance)
        const response = behaviorContext.response;
        await this._saveConversationMessages(
          npc.id,
          character.id,
          playerMessage,
          response,
          {
            metadata: {
              messageType: 'behavior_override'
            }
          }
        );
        memoryService.processConversation(npc, character.id, playerMessage, response);
        
        // Update trust when player offers help
        if (behaviorContext.acceptHelp) {
          await trustService.updateTrust(npc, character.id, {
            type: 'player_helped'
          });
        }
        
        // Debug logging for quest offers
        if (behaviorContext.offerQuest) {
          console.log(`[NPC Service] Quest offer detected:`, {
            offerQuest: behaviorContext.offerQuest,
            questId: behaviorContext.questId,
            questType: behaviorContext.questType,
            moralAlignment: behaviorContext.moralAlignment
          });
        }
        
        // Use questOfferData if behavior tree didn't provide one
        const finalQuestOffer = behaviorContext.offerQuest ? {
          offerQuest: behaviorContext.offerQuest,
          questId: behaviorContext.questId,
          questType: behaviorContext.questType || 'mini',
          moralAlignment: behaviorContext.moralAlignment || null
        } : null;
        
        return {
          response: response,
          relationshipLevel: relationship.relationshipLevel,
          relationshipTier: relationship.getRelationshipTier(),
          offerQuest: finalQuestOffer?.offerQuest || false,
          questId: finalQuestOffer?.questId || null,
          questType: finalQuestOffer?.questType || 'mini',
          moralAlignment: finalQuestOffer?.moralAlignment || null,
          hintQuest: behaviorContext.hintQuest || false
        };
      }
      // For soft overrides (hints), fall through to normal dialogue
      // The normal dialogue system will naturally incorporate these through personality/motivation prompts
    }

    // Generate dynamic response (normal dialogue generation)
    // Phase 3: Pass context to dialogue generation
    const response = await this.generateResponse(npc, relationship, character, playerMessage, { context });
    
    // Check if AI response mentions quest/work and NPC has urgent needs
    // If so, generate a quest offer even if behavior tree didn't catch it
    let questOfferData = null;
    
    // Also check if behavior tree set offerQuest but didn't set questId (shouldn't happen, but defensive)
    // Enhancement: Validate quest offer before setting it
    if (behaviorContext.offerQuest && behaviorContext.questId) {
      // Validate quest exists before offering
      const { Quest } = require('../models');
      const quest = await Quest.findByPk(behaviorContext.questId);
      if (quest) {
        // Enhancement: Check quest offer cooldown (5 minutes)
        const cooldownPeriod = 5 * 60 * 1000; // 5 minutes in milliseconds
        const lastOffer = relationship.lastQuestOffer;
        const now = new Date();
        const timeSinceLastOffer = lastOffer ? (now - new Date(lastOffer)) : Infinity;
        
        if (timeSinceLastOffer < cooldownPeriod) {
          const remainingSeconds = Math.ceil((cooldownPeriod - timeSinceLastOffer) / 1000);
          console.log(`[NPC Service] Quest offer on cooldown for NPC ${npc.id}, ${remainingSeconds} seconds remaining`);
          // Clear quest offer if on cooldown
          behaviorContext.offerQuest = false;
          behaviorContext.questId = null;
        } else {
          questOfferData = {
            offerQuest: true,
            questId: behaviorContext.questId,
            questType: behaviorContext.questType || 'mini',
            moralAlignment: behaviorContext.moralAlignment || null
          };
          
          // Enhancement: Update last quest offer timestamp
          relationship.lastQuestOffer = new Date();
          await relationship.save();
          
          console.log(`[NPC Service] Using quest offer from behavior tree:`, questOfferData);
        }
      } else {
        console.warn(`[NPC Service] Behavior tree set offerQuest=true but quest ${behaviorContext.questId} not found, clearing offer`);
        behaviorContext.offerQuest = false;
        behaviorContext.questId = null;
      }
    } else if (behaviorContext.offerQuest && !behaviorContext.questId) {
      // Invalid state: offerQuest is true but no questId
      console.warn(`[NPC Service] Invalid quest offer state: offerQuest=true but questId is null/undefined, clearing offer`);
      behaviorContext.offerQuest = false;
    } else if (response && !behaviorContext.offerQuest) {
      // Check if player has active quest from this NPC
      const { QuestProgress, Quest } = require('../models');
      const activeQuests = await QuestProgress.findAll({
        where: {
          characterId: character.id,
          status: 'active'
        },
        include: [{
          model: Quest,
          as: 'quest'
        }]
      });
      
      const activeQuestFromNPC = activeQuests.find(qp => 
        qp.quest && qp.quest.questGiverId === npc.id
      );
      
      // If player has active quest from this NPC, don't offer new quests
      if (activeQuestFromNPC) {
        console.log(`[NPC Service] Player has active quest ${activeQuestFromNPC.questId} from NPC ${npc.id}, not offering new quest`);
        // Don't modify response - let it flow naturally
      } else {
        const responseLower = response.toLowerCase();
        const questKeywords = [
          'work', 'job', 'task', 'mission', 'quest', 'help', 'assist', 'need you to',
          'could use', 'looking for', 'willing to help', 'reward', 'intel', 'gather',
          'deliver', 'transport', 'escort', 'find', 'collect', 'retrieve', 'errand',
          'something to do', 'ways to help', 'work together'
        ];
        
        const mentionsQuest = questKeywords.some(keyword => responseLower.includes(keyword));
      
      if (mentionsQuest) {
        const motivationService = require('./motivationService');
        
        // Check if NPC has urgent needs OR if player explicitly asked about work
        const playerMessageLower = (playerMessage || '').toLowerCase();
        const playerAskedForWork = ['work', 'job', 'task', 'mission', 'quest', 'something to do'].some(
          keyword => playerMessageLower.includes(keyword)
        );
        
        // Generate quest if NPC has urgent needs OR if player asked for work (even without urgent needs)
        if (motivationService.hasUrgentNeed(npc) || playerAskedForWork) {
          // Enhancement: Check quest offer cooldown (5 minutes)
          const cooldownPeriod = 5 * 60 * 1000; // 5 minutes in milliseconds
          const lastOffer = relationship.lastQuestOffer;
          const now = new Date();
          const timeSinceLastOffer = lastOffer ? (now - new Date(lastOffer)) : Infinity;
          
          if (timeSinceLastOffer < cooldownPeriod) {
            const remainingSeconds = Math.ceil((cooldownPeriod - timeSinceLastOffer) / 1000);
            console.log(`[NPC Service] Quest offer on cooldown for NPC ${npc.id}, ${remainingSeconds} seconds remaining`);
            // Don't offer quest, but continue with normal dialogue
          } else {
            const miniQuestService = require('./miniQuestService');
            
            // Check if NPC already has active mini-quest
            const hasActive = await miniQuestService.hasActiveMiniQuest(npc.id, character.id);
            if (!hasActive) {
              const urgentNeeds = motivationService.getUrgentNeeds(npc);
              const mostUrgent = urgentNeeds[0];
              
              // If no urgent needs but player asked for work, create a generic quest
              if (!mostUrgent && playerAskedForWork) {
                try {
                  // Generate a generic mini-quest based on NPC's primary goal
                  const goal = npc.motivations?.primaryGoal;
                  if (goal) {
                    const miniQuest = await miniQuestService.generateMiniQuest(
                      npc,
                      character,
                      { urgentNeed: {
                        type: goal.type || 'generic',
                        description: goal.description,
                        urgency: goal.urgency || 0.5
                      }}
                    );
                    
                    // Validate quest exists before offering
                    if (miniQuest && miniQuest.id) {
                      questOfferData = {
                        offerQuest: true,
                        questId: miniQuest.id,
                        questType: 'mini',
                        moralAlignment: miniQuest.moralAlignment || 'neutral'
                      };
                      
                      // Enhancement: Update last quest offer timestamp
                      relationship.lastQuestOffer = new Date();
                      await relationship.save();
                      
                      console.log(`[NPC Service] Generated generic quest for work request:`, questOfferData);
                    } else {
                      console.warn(`[NPC Service] Failed to generate valid quest for work request, quest data invalid`);
                    }
                  }
                } catch (error) {
                  console.error(`[NPC Service] Failed to generate generic quest:`, error);
                }
              } else if (mostUrgent) {
                try {
                  // Generate mini-quest
                  const miniQuest = await miniQuestService.generateMiniQuest(
                    npc,
                    character,
                    { urgentNeed: mostUrgent }
                  );
                  
                  // Validate quest exists before offering
                  if (miniQuest && miniQuest.id) {
                    questOfferData = {
                      offerQuest: true,
                      questId: miniQuest.id,
                      questType: 'mini',
                      moralAlignment: miniQuest.moralAlignment || 'neutral'
                    };
                    
                    // Enhancement: Update last quest offer timestamp
                    relationship.lastQuestOffer = new Date();
                    await relationship.save();
                    
                    console.log(`[NPC Service] Detected quest mention in AI response, generated quest offer:`, questOfferData);
                  } else {
                    console.warn(`[NPC Service] Failed to generate valid quest after detecting mention, quest data invalid`);
                  }
                } catch (error) {
                  console.error(`[NPC Service] Failed to generate quest after detecting mention:`, error);
                }
              }
            }
          }
        }
      }
    }
    }
    
    // Phase 1: Process conversation for memory
    memoryService.processConversation(npc, character.id, playerMessage, response);
    
    // Phase 1: Update emotional state based on interaction
    // Enhancement: Pass context for relationship calculation
    const isQuestRelated = context.questState && context.questState !== 'none';
    const hasRecentInteraction = relationship.lastInteraction && 
      (new Date() - new Date(relationship.lastInteraction)) < 300000; // 5 minutes
    
    const relationshipIncrease = this.calculateRelationshipIncrease(
      playerMessage,
      response,
      character.stats.charisma,
      {
        isQuestRelated,
        hasRecentInteraction
      }
    );
    
    // Trigger emotional response based on relationship change
    if (relationshipIncrease > 5) {
      emotionalStateService.triggerEmotion(npc, 'player_helped', 0.3);
    } else if (relationshipIncrease < -5) {
      emotionalStateService.triggerEmotion(npc, 'player_insult', 0.4);
    }

    relationship.increaseRelationship(relationshipIncrease);
    
    // Save relationship with updated level BEFORE saving conversation history
    // This ensures the relationship level is persisted
    await relationship.save();
    
    // Reload relationship to ensure we have the latest value from database
    await relationship.reload();
    
    // Add to conversation history using enhanced service
    await this._saveConversationMessages(
      npc.id,
      character.id,
      playerMessage,
      response,
      {
        metadata: {
          messageType: 'general'
        }
      }
    );
    
    // Save NPC with updated memory and emotional state
    await npc.save();
    
    // Update faction reputation if NPC has a faction
    // Small reputation gain (1-2 points) for positive interactions.
    // Routed through the central applyReputationChange so the client can surface
    // a rep toast / tier-up moment (returned in reputationChanges below).
    const reputationChanges = [];
    if (npc.factionId && relationshipIncrease > 0) {
      try {
        // Convert relationship increase to faction reputation (scaled down)
        // 1 relationship point = 0.5 faction reputation points
        const factionRepIncrease = Math.max(1, Math.floor(relationshipIncrease * 0.5));
        const change = await factionService.applyReputationChange(
          characterId, npc.factionId, factionRepIncrease, { reason: 'dialogue' }
        );
        reputationChanges.push({
          factionId: change.factionId,
          factionName: factionService.getFactionProfile(npc.factionId)?.name || npc.factionId,
          delta: change.delta,
          oldTier: change.oldTier,
          newTier: change.newTier,
          tierChanged: change.tierChanged,
          total: change.total
        });
        console.log(`[Faction] ${npc.factionId} ${change.oldTier}->${change.newTier} (+${change.delta})`);
      } catch (error) {
        // Log but don't fail the dialogue if faction update fails
        console.error(`[Faction] Failed to update faction reputation for ${npc.factionId}:`, error.message);
        console.error(error.stack);
      }
    } else {
      if (!npc.factionId) {
        console.log(`[Faction] NPC ${npc.id} (${npc.name}) has no factionId`);
      }
      if (relationshipIncrease <= 0) {
        console.log(`[Faction] No relationship increase (${relationshipIncrease}), skipping faction update`);
      }
    }
    
    // Enhancement: Only set offerQuest to true if we have a valid questId
    // This prevents frontend from trying to show a quest modal without a quest
    // Additional validation: Ensure quest actually exists in database
    let hasValidQuestOffer = false;
    if (questOfferData && questOfferData.questId) {
      const questId = questOfferData.questId;
      if (questId !== null && questId !== undefined && questId !== '') {
        // Verify quest exists in database
        try {
          const { Quest } = require('../models');
          const quest = await Quest.findByPk(questId);
          if (quest) {
            hasValidQuestOffer = true;
          } else {
            console.warn(`[NPC Service] Quest offer has questId ${questId} but quest not found in database, clearing offer`);
            questOfferData = null;
          }
        } catch (error) {
          console.error(`[NPC Service] Error validating quest ${questId}:`, error);
          questOfferData = null;
        }
      }
    }
    
    if (questOfferData && !hasValidQuestOffer) {
      console.warn(`[NPC Service] Quest offer data exists but validation failed:`, questOfferData);
      questOfferData = null;
    }
    
    console.log(`[NPC Service] Relationship updated: level=${relationship.relationshipLevel}, tier=${relationship.getRelationshipTier()}, increase=${relationshipIncrease}`);
    
    return {
      response,
      relationshipLevel: relationship.relationshipLevel,
      relationshipTier: relationship.getRelationshipTier(),
      relationshipIncrease,
      // Faction standing changes from this interaction (for rep toast / tier-up UI)
      reputationChanges,
      // Include quest offer data if detected from AI response
      // Only set offerQuest to true if we have a valid questId
      offerQuest: hasValidQuestOffer ? true : false,
      questId: hasValidQuestOffer && questOfferData ? questOfferData.questId : null,
      questType: hasValidQuestOffer && questOfferData ? (questOfferData.questType || 'mini') : null,
      moralAlignment: hasValidQuestOffer && questOfferData ? questOfferData.moralAlignment : null
    };
  }

  /**
   * Check for quest-related dialogue
   */
  async checkQuestDialogue(npc, playerMessage, character) {
    if (!npc.dialogue || !npc.dialogue.questRelated) {
      console.log(`[Quest Dialogue] NPC ${npc.id} has no quest-related dialogue`);
      return null;
    }
    
    const message = playerMessage.toLowerCase();
    const questDialogue = npc.dialogue.questRelated;
    
    // Check if player has active quests involving this NPC (as quest giver OR as objective target)
    const { QuestProgress, Quest } = require('../models');
    
    // Get all active quests for the character
    const allActiveQuests = await QuestProgress.findAll({
      where: {
        characterId: character.id,
        status: 'active'
      }
    });
    
    // Find quests where this NPC is involved (quest giver OR objective target)
    const activeQuests = [];
    for (const questProgress of allActiveQuests) {
      const quest = await Quest.findByPk(questProgress.questId);
      if (!quest) continue;
      
      // Check if NPC is quest giver
      if (quest.questGiverId === npc.id) {
        activeQuests.push(questProgress);
        continue;
      }
      
      // Check if NPC is involved in any interact/deliver objectives
      if (quest.objectives) {
        for (const objective of quest.objectives) {
          if ((objective.type === 'interact' || objective.type === 'deliver') && 
              objective.target === npc.id) {
            activeQuests.push(questProgress);
            break; // Found one, no need to check more objectives
          }
        }
      }
    }
    
    console.log(`[Quest Dialogue] Checking dialogue for NPC ${npc.id} (${npc.name}), message: "${playerMessage}"`);
    console.log(`[Quest Dialogue] Active quests involving this NPC:`, activeQuests.map(qp => qp.questId));
    console.log(`[Quest Dialogue] Available dialogue keys:`, Object.keys(questDialogue));
    
    // First, find all active quest IDs involving this NPC
    const activeQuestIds = activeQuests.map(qp => qp.questId);
    
    if (activeQuestIds.length === 0) {
      console.log(`[Quest Dialogue] No active quests involving this NPC`);
      return null;
    }
    
    // Check if a quest was just accepted (within last 30 seconds)
    // If so, and this is the quest giver, show a thank you message
    const now = new Date();
    const recentlyAcceptedQuest = activeQuests.find(qp => {
      if (!qp.startedAt) return false;
      const startedAt = new Date(qp.startedAt);
      const secondsSinceAcceptance = (now - startedAt) / 1000;
      // Check if quest was accepted within last 30 seconds
      return secondsSinceAcceptance < 30 && secondsSinceAcceptance >= 0;
    });
    
    if (recentlyAcceptedQuest) {
      const quest = await Quest.findByPk(recentlyAcceptedQuest.questId);
      // Only show thank you if this NPC is the quest giver
      if (quest && quest.questGiverId === npc.id) {
        // Check if player message is empty or a greeting (indicating dialogue just opened)
        const isGreeting = !playerMessage || 
          playerMessage.trim() === '' || 
          /^(hi|hello|hey|greetings|what do you want|how are you)/i.test(playerMessage.trim());
        
        if (isGreeting) {
          // Check for quest-specific thank you dialogue
          const thankYouKey = `${recentlyAcceptedQuest.questId}_accepted`;
          if (questDialogue[thankYouKey]) {
            console.log(`[Quest Dialogue] ✓ Returning quest accepted thank you dialogue: ${thankYouKey}`);
            return questDialogue[thankYouKey];
          }
          
          // Fallback: Generate a generic thank you message
          const questTitle = quest.title || 'this quest';
          console.log(`[Quest Dialogue] ✓ Returning generic quest accepted thank you for quest: ${recentlyAcceptedQuest.questId}`);
          return `Thank you for accepting ${questTitle}! I really appreciate your help. ${quest.objectives && quest.objectives.length > 0 ? 'Check your quest log for details on what needs to be done.' : ''}`;
        }
      }
    }
    
    // Check for specific quest-related keywords
    for (const [dialogueKey, response] of Object.entries(questDialogue)) {
      // Check if this dialogue key matches an active quest
      // Dialogue keys can be: questId, questId_thugs, questId_location, etc.
      const matchingQuestId = activeQuestIds.find(qId => 
        dialogueKey === qId || 
        dialogueKey.startsWith(`${qId}_`)
      );
      
      if (!matchingQuestId) {
        console.log(`[Quest Dialogue] Dialogue key "${dialogueKey}" does not match any active quest`);
        continue;
      }
      
      console.log(`[Quest Dialogue] Found matching quest: ${matchingQuestId} for dialogue key: ${dialogueKey}`);
      
      const isActiveQuest = true; // We already verified it matches
      
      // Check for location/where questions FIRST (most specific and highest priority)
      if (message.includes('where') || message.includes('location') || message.includes('map') || message.includes('show me') || message.includes('on my map')) {
        console.log(`[Quest Dialogue] Detected location/where question`);
        const locationKey = `${matchingQuestId}_location`;
        if (questDialogue[locationKey]) {
          console.log(`[Quest Dialogue] ✓ Returning location dialogue: ${locationKey}`);
          return questDialogue[locationKey];
        }
        // Fallback to thugs dialogue if location not found
        const specificKey = `${matchingQuestId}_thugs`;
        if (questDialogue[specificKey]) {
          console.log(`[Quest Dialogue] ✓ Returning thugs dialogue (fallback): ${specificKey}`);
          return questDialogue[specificKey];
        }
      }
      
      // Check for thug/syndicate/enemy keywords
      if (message.includes('thug') || message.includes('syndicate') || message.includes('enemy') || message.includes('oppress')) {
        console.log(`[Quest Dialogue] Detected thug/syndicate/enemy question`);
        const specificKey = `${matchingQuestId}_thugs`;
        if (questDialogue[specificKey]) {
          console.log(`[Quest Dialogue] ✓ Returning thugs dialogue: ${specificKey}`);
          return questDialogue[specificKey];
        }
        const locationKey = `${matchingQuestId}_location`;
        if (questDialogue[locationKey]) {
          console.log(`[Quest Dialogue] ✓ Returning location dialogue (fallback): ${locationKey}`);
          return questDialogue[locationKey];
        }
      }
      
      // General quest keywords
      if (message.includes('quest') || message.includes('help') || message.includes('mission')) {
        // If asking about thugs/enemies/location and quest is active, use specific dialogue
        if (isActiveQuest && (message.includes('thug') || message.includes('enemy') || message.includes('where') || message.includes('location') || message.includes('map'))) {
          const locationKey = `${matchingQuestId}_location`;
          if (questDialogue[locationKey]) {
            console.log(`[Quest Dialogue] ✓ Returning location dialogue (general quest + location): ${locationKey}`);
            return questDialogue[locationKey];
          }
          const specificKey = `${matchingQuestId}_thugs`;
          if (questDialogue[specificKey]) {
            console.log(`[Quest Dialogue] ✓ Returning thugs dialogue (general quest + thugs): ${specificKey}`);
            return questDialogue[specificKey];
          }
        }
        // Return general quest dialogue if no specific match
        if (dialogueKey === matchingQuestId) {
          console.log(`[Quest Dialogue] ✓ Returning general quest dialogue: ${dialogueKey}`);
          return response;
        }
      }
      
      // If player says "yes" or "can help" and quest is active, give location info
      if ((message.includes('yes') || message.includes('can help') || message.includes('will help') || message.includes('accept')) && 
          (message.includes('where') || message.includes('tell me') || message.includes('location'))) {
        const locationKey = `${matchingQuestId}_location`;
        if (questDialogue[locationKey]) {
          console.log(`[Quest Dialogue] ✓ Returning location dialogue (accept + location): ${locationKey}`);
          return questDialogue[locationKey];
        }
        const specificKey = `${matchingQuestId}_thugs`;
        if (questDialogue[specificKey]) {
          console.log(`[Quest Dialogue] ✓ Returning thugs dialogue (accept + thugs): ${specificKey}`);
          return questDialogue[specificKey];
        }
      }
    }
    
    console.log(`[Quest Dialogue] ✗ No matching quest dialogue found`);
    return null;
  }

  /**
   * Generate NPC response using AI-first approach (with template fallback)
   */
  async generateResponse(npc, relationship, character, playerMessage, options = {}) {
    try {
      // Phase 3: Extract context from options
      const context = options.context || {};
      
      // Try AI first if available (handles context much better)
      const isCustom = this.isCustomQuestion(playerMessage);
      const aiAvailable = aiDialogueService.isAvailable();
      const shouldTryAI = isCustom && aiAvailable;
      
      console.log(`[NPC Service] Message: "${playerMessage}" | Custom: ${isCustom} | AI Available: ${aiAvailable} | Will try AI: ${shouldTryAI}`);
      
      if (shouldTryAI) {
        // Check cache first (include NPC ID to prevent cross-NPC response sharing)
        const cachedResponse = aiDialogueService.getCachedResponse(npc.id, playerMessage);
        if (cachedResponse) {
          console.log(`[NPC Service] Using cached AI response for NPC ${npc.id} (${npc.name})`);
          return cachedResponse;
        }

        // Try AI generation
        const { Planet } = require('../models');
        let planet = null;
        if (npc.location?.planet) {
          try {
            planet = await Planet.findByPk(npc.location.planet);
          } catch (error) {
            // Ignore planet load errors
          }
        }

        const conversationHistory = relationship.conversationHistory || [];
        console.log(`[NPC Service] Calling AI service for response...`);
        const aiResponse = await aiDialogueService.generateResponse(
          npc,
          relationship,
          character,
          playerMessage,
          {
            planet,
            conversationHistory: conversationHistory.slice(-10), // Last 10 messages
            context: context // Phase 3: Pass context to AI
          }
        );

        if (aiResponse) {
          console.log(`[NPC Service] AI response received: "${aiResponse.substring(0, 50)}..."`);
          return aiResponse;
        } else {
          console.log(`[NPC Service] AI returned null, falling back to templates`);
        }
        // Fall through to template system if AI fails or rate limited
      } else {
        console.log(`[NPC Service] Using template system (AI not available or simple greeting)`);
      }

      // Use template system as fallback or for simple greetings
      const response = await dialogueTemplateService.generateResponse(
        npc,
        relationship,
        character,
        playerMessage,
        {
          context: context // Phase 3: Pass context to template service
        }
      );
      
      // If template system returns null, use fallback
      if (!response) {
        const tier = relationship.getRelationshipTier();
        return this.getFallbackResponse(tier);
      }
      
      // Apply personality traits for flavor (optional)
      const traits = npc.personalityTraits || {};
      let finalResponse = response;
      
      // Add personality-based prefixes occasionally (20% chance)
      if (Math.random() < 0.2) {
        if (traits.formality > 70) {
          finalResponse = `I appreciate your inquiry. ${response}`;
        } else if (traits.humor > 70 && relationship.relationshipLevel > 20) {
          finalResponse = `Ha! ${response}`;
        }
      }
      
      return finalResponse;
    } catch (error) {
      console.error('[NPC Service] Error generating response:', error);
      // Fallback to simple response
      const tier = relationship.getRelationshipTier();
      return this.getFallbackResponse(tier);
    }
  }

  /**
   * Determine if a message should use AI (more permissive now)
   * AI will handle most questions, templates are fallback
   */
  isCustomQuestion(message) {
    const lowerMessage = message.toLowerCase().trim();
    
    // Very simple greetings can use templates
    const simpleGreetings = ['hello', 'hi', 'hey', 'greetings', 'how are you'];
    if (simpleGreetings.some(g => lowerMessage === g || lowerMessage.startsWith(g + ' '))) {
      return false; // Use template for simple greetings
    }
    
    // Everything else should try AI first
    // AI is better at understanding context and providing relevant responses
    return true;
  }

  /**
   * Get fallback response if template system fails
   */
  getFallbackResponse(tier) {
    const responses = {
      stranger: "I'm not sure I should be sharing that with someone I just met.",
      acquaintance: "I suppose I can tell you a bit more about that.",
      friend: "Since we're friends, I'll be honest with you.",
      confidant: "I trust you completely. Let me tell you everything."
    };
    
    return responses[tier] || responses.stranger;
  }

  /**
   * Calculate relationship increase based on interaction
   */
  calculateRelationshipIncrease(playerMessage, npcResponse, charisma, context = {}) {
    // Enhancement: Increased base relationship gain from +1 to +2
    let increase = 2;
    
    // Bonus for longer, more thoughtful messages
    if (playerMessage.length > 50) {
      increase += 1;
    }
    
    // Enhanced: Bonus for very long conversations (>100 chars)
    if (playerMessage.length > 100) {
      increase += 1;
    }
    
    // Charisma bonus
    increase += Math.floor(charisma / 20);
    
    // Enhancement: Bonus for quest-related conversations
    if (context.isQuestRelated) {
      increase += 2;
      console.log(`[NPC Service] Quest-related conversation bonus: +2`);
    }
    
    // Enhancement: Bonus for multiple interactions in short time
    // This is tracked via relationship.interactionCount and lastInteraction
    // If context indicates recent interaction, add bonus
    if (context.hasRecentInteraction) {
      increase += 1;
      console.log(`[NPC Service] Recent interaction bonus: +1`);
    }
    
    return increase;
  }

  /**
   * Recruit NPC as companion
   */
  async recruitCompanion(npcId, characterId) {
    const { npc, relationship } = await this.getNPCWithRelationship(npcId, characterId);
    
    if (!npc.isCompanion) {
      throw new Error('This NPC cannot be recruited');
    }
    
    if (relationship.relationshipLevel < 50) {
      throw new Error('Relationship level too low to recruit');
    }
    
    await relationship.recruit();
    
    return {
      npc,
      relationship
    };
  }

  /**
   * Dismiss companion
   */
  async dismissCompanion(npcId, characterId) {
    const relationship = await NPCRelationship.findOne({
      where: { npcId, characterId }
    });
    
    if (!relationship || !relationship.isRecruited) {
      throw new Error('NPC is not recruited');
    }
    
    await relationship.dismiss();
    
    return { success: true };
  }

  /**
   * Get recruited companions for character
   */
  async getRecruitedCompanions(characterId) {
    const relationships = await NPCRelationship.findRecruitedCompanions(characterId);
    
    const companions = await Promise.all(
      relationships.map(async (rel) => {
        const npc = await NPC.findByPk(rel.npcId);
        return {
          npc,
          relationship: rel
        };
      })
    );
    
    return companions;
  }

  /**
   * Get NPCs by location
   */
  async getNPCsByLocation(planet, area = null) {
    // Lazily ensure medina market-stall vendors exist on urban surfaces (idempotent + a cheap
    // no-op once created). Non-fatal — stall vendors are a nicety, never block the NPC list.
    if (!area || area === 'surface') {
      try { await require('./npcGenerator').ensureSurfaceStallVendors(planet); }
      catch (e) { console.warn('[NPC Service] stall-vendor ensure failed:', e.message); }
    }
    return await NPC.findByLocation(planet, area);
  }

  /**
   * Get NPCs by faction
   */
  async getNPCsByFaction(factionId) {
    return await NPC.findByFaction(factionId);
  }

  /**
   * Get all companions
   */
  async getAllCompanions() {
    return await NPC.findCompanions();
  }

  /**
   * Get all vendors
   */
  async getAllVendors() {
    return await NPC.findVendors();
  }

  /**
   * Get all NPCs (with optional pagination and filtering)
   */
  async getAllNPCs(options = {}) {
    const { limit, offset, npcType, factionId, planetId, systemId } = options;
    const Sequelize = require('sequelize');
    const { Op } = Sequelize;
    const { Planet } = require('../models');
    
    const where = {
      isAvailable: true
    };

    if (npcType) {
      where.npcType = npcType;
    }

    if (factionId) {
      where.factionId = factionId;
    }

    // Filter by planet
    if (planetId) {
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push(
        Sequelize.where(
          Sequelize.fn('jsonb_extract_path_text', Sequelize.col('location'), 'planet'),
          planetId
        )
      );
    }

    // Filter by system (get all planets in system, then filter NPCs by those planets)
    if (systemId && !planetId) {
      const planetsInSystem = await Planet.findAll({
        where: { systemId },
        attributes: ['id']
      });
      
      const planetIds = planetsInSystem.map(p => p.id);
      
      if (planetIds.length > 0) {
        where[Op.and] = where[Op.and] || [];
        // Use Op.or with multiple conditions for each planet
        const planetConditions = planetIds.map(pid => 
          Sequelize.where(
            Sequelize.fn('jsonb_extract_path_text', Sequelize.col('location'), 'planet'),
            pid
          )
        );
        where[Op.and].push({ [Op.or]: planetConditions });
      } else {
        // No planets in system, return empty
        return [];
      }
    }

    const queryOptions = {
      where,
      order: [['name', 'ASC']]
    };

    if (limit) {
      queryOptions.limit = limit;
    }

    if (offset) {
      queryOptions.offset = offset;
    }

    return await NPC.findAll(queryOptions);
  }
}

module.exports = new NPCService();
