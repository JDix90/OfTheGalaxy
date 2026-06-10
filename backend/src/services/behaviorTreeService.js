/**
 * Behavior Tree Service
 * Handles NPC conversation decision-making using behavior trees
 * Phase 2: Simple Behavior Trees
 */

/**
 * Behavior Node Types:
 * - 'sequence': All children must succeed
 * - 'selector': First child to succeed wins
 * - 'condition': Check condition, return success/failure
 * - 'action': Execute action, return success/failure
 */
class BehaviorNode {
  constructor(type, config) {
    this.type = type;
    this.config = config;
    this.children = [];
  }
  
  addChild(node) {
    this.children.push(node);
    return this;
  }
  
  async execute(context) {
    switch(this.type) {
      case 'sequence':
        return await this.executeSequence(context);
      case 'selector':
        return await this.executeSelector(context);
      case 'condition':
        return await this.executeCondition(context);
      case 'action':
        return await this.executeAction(context);
      default:
        return 'failure';
    }
  }
  
  async executeSequence(context) {
    // All children must succeed
    for (const child of this.children) {
      const result = await child.execute(context);
      if (result !== 'success') return result;
    }
    return 'success';
  }
  
  async executeSelector(context) {
    // First child to succeed wins
    for (const child of this.children) {
      const result = await child.execute(context);
      if (result === 'success') return 'success';
    }
    return 'failure';
  }
  
  async executeCondition(context) {
    const result = await this.config.check(context);
    return result ? 'success' : 'failure';
  }
  
  async executeAction(context) {
    try {
      await this.config.execute(context);
      return 'success';
    } catch (error) {
      console.error('[Behavior Tree] Action failed:', error);
      return 'failure';
    }
  }
}

class BehaviorTreeService {
  /**
   * Build conversation behavior tree for NPC
   * @param {Object} npc - NPC instance
   * @param {Object} relationship - Relationship with player
   * @param {Object} character - Player character
   * @returns {BehaviorNode} Root node
   */
  buildConversationBehaviorTree(npc, relationship, character) {
    const root = new BehaviorNode('selector', {});
    
    // Branch 1: Player offering help when NPC has urgent need (highest priority)
    const acceptHelpBranch = new BehaviorNode('sequence', {});
    acceptHelpBranch.addChild(new BehaviorNode('condition', {
      check: (ctx) => {
        const motivationService = require('./motivationService');
        if (!motivationService.hasUrgentNeed(npc)) return false;
        
        // Check if player is OFFERING help (not just asking if they need help)
        const message = (ctx.playerMessage || '').toLowerCase();
        const offerKeywords = [
          'can help', 'will help', 'can assist', 'will assist', 'i can help', 'i will help',
          'i can assist', 'i will assist', 'let me help', 'let me assist', 'i\'ll help',
          'i\'ll assist', 'perhaps i can', 'maybe i can help', 'i could help', 'i could assist',
          'yes', 'sure', 'of course', 'absolutely', 'i\'d be happy to help'
        ];
        
        const isOfferingHelp = offerKeywords.some(keyword => message.includes(keyword));
        return isOfferingHelp;
      }
    }));
    acceptHelpBranch.addChild(new BehaviorNode('action', {
      execute: async (ctx) => {
        const motivationService = require('./motivationService');
        const miniQuestService = require('./miniQuestService');
        const urgentNeeds = motivationService.getUrgentNeeds(npc);
        const mostUrgent = urgentNeeds[0];
        
        if (mostUrgent) {
          // Check if NPC already has active mini-quest
          const hasActive = await miniQuestService.hasActiveMiniQuest(npc.id, ctx.character.id);
          if (hasActive) {
            ctx.response = `I already have something I need help with. Let's focus on that first.`;
            ctx.behaviorOverride = true;
            return;
          }
          
          // Generate mini-quest (moral alignment determined by NPC)
          const miniQuest = await miniQuestService.generateMiniQuest(
            npc,
            ctx.character,
            { urgentNeed: mostUrgent }
          );
          
          const moralAlignment = miniQuest.moralAlignment || 'neutral';
          const needType = mostUrgent.type;
          
          const responseTemplates = {
            altruistic: `*relief washes over their face* Thank you! ${mostUrgent.description}. This would mean a lot to me.`,
            neutral: `I appreciate it. ${mostUrgent.description}. Can you help me with this?`,
            deceptive: `*looks around nervously* I need you to ${mostUrgent.description.toLowerCase()}. Can you do this for me?`,
            criminal: `*eyes narrow* I need you to ${mostUrgent.description.toLowerCase()}. This is important, and I'll make it worth your while.`
          };
          
          ctx.response = responseTemplates[moralAlignment] || responseTemplates.neutral;
          ctx.offerQuest = true;
          ctx.questId = miniQuest.id;
          ctx.questType = 'mini';
          ctx.moralAlignment = moralAlignment;
          ctx.priority = 'high';
          ctx.acceptHelp = true;
          ctx.behaviorOverride = true;
          
          // Check if this is an escort quest
          if (mostUrgent.type === 'safety' || mostUrgent.type === 'transport') {
            ctx.isEscortQuest = true;
            ctx.escortNPCId = npc.id;
          }
        }
      }
    }));
    root.addChild(acceptHelpBranch);
    
    // Branch 1a: Player asking for more details about a recently offered quest
    const questFollowUpBranch = new BehaviorNode('sequence', {});
    questFollowUpBranch.addChild(new BehaviorNode('condition', {
      check: (ctx) => {
        // Check if player is asking for more information about a quest
        const message = (ctx.playerMessage || '').toLowerCase();
        const followUpKeywords = [
          'tell me more', 'more details', 'more information', 'i\'m interested', 'interested',
          'please tell me more', 'can you tell me more', 'what is it', 'what\'s that',
          'explain', 'elaborate', 'go on', 'continue', 'what about', 'how does'
        ];
        
        const isFollowUp = followUpKeywords.some(keyword => message.includes(keyword));
        if (!isFollowUp) return false;
        
        // Check conversation history for recent quest offer
        const conversationHistory = relationship?.conversationHistory || [];
        if (conversationHistory.length < 2) return false;
        
        // Look at the last 2-3 messages for quest-related content
        const recentMessages = conversationHistory.slice(-3);
        for (const msg of recentMessages) {
          if (msg.sender === 'npc') {
            const npcText = (msg.text || '').toLowerCase();
            // Check if NPC mentioned job, quest, work, help, shipment, delivery, etc.
            const questIndicators = [
              'job', 'work', 'quest', 'help', 'shipment', 'delivery', 'task', 'mission',
              'need you to', 'can you', 'would you', 'if you can', 'handle that'
            ];
            if (questIndicators.some(indicator => npcText.includes(indicator))) {
              return true;
            }
          }
        }
        
        return false;
      }
    }));
    questFollowUpBranch.addChild(new BehaviorNode('action', {
      execute: async (ctx) => {
        // Check for active mini-quest from this NPC
        const miniQuestService = require('./miniQuestService');
        const { Quest, QuestProgress } = require('../models');
        
        // Check if there's an active mini-quest from this NPC
        const activeQuestProgress = await QuestProgress.findOne({
          where: {
            characterId: ctx.character.id,
            status: 'active'
          },
          include: [{
            model: Quest,
            where: {
              questGiverId: npc.id,
              questType: 'mini'
            }
          }]
        });
        
        if (activeQuestProgress && activeQuestProgress.quest) {
          const quest = activeQuestProgress.quest;
          // Provide quest details
          const objectives = quest.objectives || [];
          const firstObjective = objectives[0];
          
          let response = `*nods* Right. ${quest.description} `;
          
          if (firstObjective) {
            response += `Specifically, you'll need to ${firstObjective.description.toLowerCase()}. `;
          }
          
          if (quest.rewards) {
            const rewardParts = [];
            if (quest.rewards.xp) rewardParts.push(`${quest.rewards.xp} XP`);
            if (quest.rewards.credits) rewardParts.push(`${quest.rewards.credits} credits`);
            if (rewardParts.length > 0) {
              response += `I'll make it worth your while - ${rewardParts.join(' and ')}.`;
            }
          }
          
          ctx.response = response;
          ctx.offerQuest = true;
          ctx.questId = quest.id;
          ctx.questType = 'mini';
          ctx.moralAlignment = quest.moralAlignment;
          ctx.behaviorOverride = true;
        } else {
          // No active quest found, but NPC mentioned something - provide generic follow-up
          ctx.response = `*leans in* I need someone reliable for this. Are you up for it?`;
          ctx.hintQuest = true;
          // Don't override - let normal dialogue handle it
        }
      }
    }));
    root.addChild(questFollowUpBranch);
    
    // Branch 1b: Urgent need - initial mention (only on first message or when player asks about help)
    const urgentBranch = new BehaviorNode('sequence', {});
    urgentBranch.addChild(new BehaviorNode('condition', {
      check: (ctx) => {
        const motivationService = require('./motivationService');
        if (!motivationService.hasUrgentNeed(npc)) return false;
        
        // Only trigger if:
        // 1. This is the first conversation (no previous messages)
        // 2. Player is asking if they need help (not offering)
        const message = (ctx.playerMessage || '').toLowerCase();
        const askKeywords = ['do you need', 'what do you need', 'need help', 'need assistance', 'what can i do'];
        
        // Check if this is first message - check relationship conversation count
        let isFirstMessage = false;
        if (relationship) {
          const convCount = relationship.conversationHistory?.length || 0;
          isFirstMessage = convCount === 0;
        } else {
          isFirstMessage = true;
        }
        
        const isAskingAboutNeed = askKeywords.some(keyword => message.includes(keyword));
        
        return isFirstMessage || isAskingAboutNeed;
      }
    }));
    urgentBranch.addChild(new BehaviorNode('action', {
      execute: async (ctx) => {
        const motivationService = require('./motivationService');
        const miniQuestService = require('./miniQuestService');
        const urgentNeeds = motivationService.getUrgentNeeds(npc);
        const mostUrgent = urgentNeeds[0];
        
        if (mostUrgent) {
          // Check if NPC already has active mini-quest
          const hasActive = await miniQuestService.hasActiveMiniQuest(npc.id, ctx.character.id);
          if (hasActive) {
            ctx.response = `I already have something I need help with. Let's focus on that first.`;
            ctx.behaviorOverride = true;
            return;
          }
          
          // Generate mini-quest when NPC first mentions the need
          const miniQuest = await miniQuestService.generateMiniQuest(
            npc,
            ctx.character,
            { urgentNeed: mostUrgent }
          );
          
          const moralAlignment = miniQuest.moralAlignment || 'neutral';
          
          ctx.response = `*looks distressed* I need help. ${mostUrgent.description}. Can you assist me?`;
          ctx.offerQuest = true;
          ctx.questId = miniQuest.id; // Include quest ID so modal can show
          ctx.questType = 'mini';
          ctx.moralAlignment = moralAlignment;
          ctx.priority = 'high';
          ctx.behaviorOverride = true;
        }
      }
    }));
    root.addChild(urgentBranch);
    
    // Branch 2: High stress (second priority)
    const stressBranch = new BehaviorNode('sequence', {});
    stressBranch.addChild(new BehaviorNode('condition', {
      check: (ctx) => {
        const stress = npc.personalityProfile?.stressLevel || 30;
        return stress > 70;
      }
    }));
    stressBranch.addChild(new BehaviorNode('action', {
      execute: async (ctx) => {
        ctx.response = "Look, I'm under a lot of pressure right now. Can we make this quick?";
        ctx.mood = 'stressed';
        ctx.responseLength = 'short';
        ctx.behaviorOverride = true;
      }
    }));
    root.addChild(stressBranch);
    
    // Branch 3: Low trust (block sensitive information only)
    const lowTrustBranch = new BehaviorNode('sequence', {});
    lowTrustBranch.addChild(new BehaviorNode('condition', {
      check: (ctx) => {
        const trustService = require('./trustService');
        const trustLevel = trustService.getTrustLevel(npc);
        const relationshipLevel = relationship?.relationshipLevel || 0;
        
        // Only block if trust is very low AND player is asking for sensitive info
        if (trustLevel >= 30 && relationshipLevel >= 20) return false;
        
        const message = (ctx.playerMessage || '').toLowerCase();
        const sensitiveKeywords = ['secret', 'confidential', 'private', 'personal', 'weakness', 'fear', 'vulnerability'];
        const isAskingSensitive = sensitiveKeywords.some(keyword => message.includes(keyword));
        
        // Only block sensitive requests, not general conversation
        return isAskingSensitive;
      }
    }));
    lowTrustBranch.addChild(new BehaviorNode('action', {
      execute: async (ctx) => {
        const trustService = require('./trustService');
        const trustLevel = trustService.getTrustLevel(npc);
        
        if (trustLevel < 20) {
          ctx.response = "I don't know you. I'm not comfortable discussing that.";
        } else {
          ctx.response = "I don't know you well enough to discuss that. Maybe after we've worked together more.";
        }
        ctx.trustGated = true;
        ctx.shareInformation = false;
        ctx.behaviorOverride = true;
      }
    }));
    root.addChild(lowTrustBranch);
    
    // Branch 4: Faction conflict (if player is enemy)
    const factionConflictBranch = new BehaviorNode('sequence', {});
    factionConflictBranch.addChild(new BehaviorNode('condition', {
      check: async (ctx) => {
        if (!npc.factionId) return false;
        
        try {
          const { FactionReputation } = require('../models');
          const factionService = require('./factionService');
          const faction = factionService.getFactionProfile(npc.factionId);
          
          if (!faction) return false;
          
          // Check if player is allied with enemy faction
          for (const [enemyFaction, modifier] of Object.entries(faction.relationshipModifiers || {})) {
            if (modifier < -0.7) {
              const enemyRep = await FactionReputation.findOne({
                where: { characterId: character.id, factionId: enemyFaction }
              });
              if (enemyRep && enemyRep.reputation > 60) {
                ctx.enemyFaction = enemyFaction;
                return true;
              }
            }
          }
        } catch (error) {
          console.error('[Behavior Tree] Error checking faction conflict:', error);
        }
        return false;
      }
    }));
    factionConflictBranch.addChild(new BehaviorNode('action', {
      execute: async (ctx) => {
        const factionService = require('./factionService');
        const enemyName = factionService.getFactionDisplayName(ctx.enemyFaction);
        ctx.response = `*eyes narrow* I know you're allied with the ${enemyName}. We have nothing to discuss.`;
        ctx.hostile = true;
        ctx.endConversation = true;
        ctx.behaviorOverride = true;
      }
    }));
    root.addChild(factionConflictBranch);
    
    // Branch 5: Player asking about work/jobs - generate quest if NPC has needs
    const workRequestBranch = new BehaviorNode('sequence', {});
    workRequestBranch.addChild(new BehaviorNode('condition', {
      check: (ctx) => {
        const message = (ctx.playerMessage || '').toLowerCase();
        const workKeywords = [
          'work', 'job', 'task', 'mission', 'quest', 'do you have any work',
          'any work', 'need help', 'can help', 'looking for work', 'something to do'
        ];
        return workKeywords.some(keyword => message.includes(keyword));
      }
    }));
    workRequestBranch.addChild(new BehaviorNode('action', {
      execute: async (ctx) => {
        const motivationService = require('./motivationService');
        const miniQuestService = require('./miniQuestService');
        
        // Check if NPC has any urgent needs
        if (motivationService.hasUrgentNeed(npc)) {
          const hasActive = await miniQuestService.hasActiveMiniQuest(npc.id, ctx.character.id);
          if (hasActive) {
            ctx.response = `I already have something I need help with. Let's focus on that first.`;
            ctx.behaviorOverride = true;
            return;
          }
          
          const urgentNeeds = motivationService.getUrgentNeeds(npc);
          const mostUrgent = urgentNeeds[0];
          
          if (mostUrgent) {
            try {
              const miniQuest = await miniQuestService.generateMiniQuest(
                npc,
                ctx.character,
                { urgentNeed: mostUrgent }
              );
              
              const moralAlignment = miniQuest.moralAlignment || 'neutral';
              const responseTemplates = {
                altruistic: `Yes! I could really use your help. ${mostUrgent.description}. Would you be willing to assist me?`,
                neutral: `Actually, yes. ${mostUrgent.description}. Can you help me with this?`,
                deceptive: `*looks around* I might have something. ${mostUrgent.description.toLowerCase()}. Interested?`,
                criminal: `*eyes narrow* I have a job that needs doing. ${mostUrgent.description.toLowerCase()}. You in?`
              };
              
              ctx.response = responseTemplates[moralAlignment] || responseTemplates.neutral;
              ctx.offerQuest = true;
              ctx.questId = miniQuest.id;
              ctx.questType = 'mini';
              ctx.moralAlignment = moralAlignment;
              ctx.behaviorOverride = true;
            } catch (error) {
              console.error('[Behavior Tree] Failed to generate quest for work request:', error);
              // Fall through to normal dialogue
            }
          }
        } else {
          // No urgent needs, but player asked about work - generate a generic quest based on primary goal
          const goal = npc.motivations?.primaryGoal;
          if (goal) {
            try {
              const miniQuest = await miniQuestService.generateMiniQuest(
                npc,
                ctx.character,
                { urgentNeed: {
                  type: goal.type || 'generic',
                  description: goal.description,
                  urgency: goal.urgency || 0.5
                }}
              );
              
              const moralAlignment = miniQuest.moralAlignment || 'neutral';
              const responseTemplates = {
                altruistic: `I could use some help with ${goal.description.toLowerCase()}. Would you be interested?`,
                neutral: `I have something I'm working on: ${goal.description}. Could you help?`,
                deceptive: `*looks around* I might have something for you. ${goal.description.toLowerCase()}. Interested?`,
                criminal: `*eyes narrow* I have a job. ${goal.description.toLowerCase()}. You in?`
              };
              
              ctx.response = responseTemplates[moralAlignment] || responseTemplates.neutral;
              ctx.offerQuest = true;
              ctx.questId = miniQuest.id;
              ctx.questType = 'mini';
              ctx.moralAlignment = moralAlignment;
              ctx.behaviorOverride = true;
              
              console.log(`[Behavior Tree] Generated generic quest for work request (no urgent needs):`, {
                questId: miniQuest.id,
                moralAlignment
              });
            } catch (error) {
              console.error('[Behavior Tree] Failed to generate generic quest for work request:', error);
              // Fall through to normal dialogue
              ctx.proceedNormal = true;
            }
          } else {
            // No goal either - let normal dialogue handle it
            ctx.proceedNormal = true;
          }
        }
      }
    }));
    root.addChild(workRequestBranch);
    
    // Branch 5b: High urgency goal (hint at quest) - only when player asks about work/goals
    const urgentGoalBranch = new BehaviorNode('sequence', {});
    urgentGoalBranch.addChild(new BehaviorNode('condition', {
      check: (ctx) => {
        const goal = npc.motivations?.primaryGoal;
        if (!goal || goal.urgency <= 0.7) return false;
        
        // Only hint if player asks about work, goals, or quests (but workRequestBranch already caught "work")
        const message = (ctx.playerMessage || '').toLowerCase();
        const goalKeywords = ['goal', 'quest', 'mission', 'task', 'project', 'what are you doing', 'what do you do'];
        return goalKeywords.some(keyword => message.includes(keyword));
      }
    }));
    urgentGoalBranch.addChild(new BehaviorNode('action', {
      execute: async (ctx) => {
        const goal = npc.motivations.primaryGoal;
        const trustService = require('./trustService');
        const trustLevel = trustService.getTrustLevel(npc);
        const miniQuestService = require('./miniQuestService');
        
        // Check if NPC already has active mini-quest
        const hasActive = await miniQuestService.hasActiveMiniQuest(npc.id, ctx.character.id);
        if (hasActive) {
          ctx.response = `I already have something I need help with. Let's focus on that first.`;
          ctx.behaviorOverride = true;
          return;
        }
        
        if (trustLevel >= 50) {
          // Generate mini-quest based on urgent goal
          const urgentNeeds = require('./motivationService').getUrgentNeeds(npc);
          const mostUrgent = urgentNeeds[0] || {
            type: goal.type || 'generic',
            description: goal.description,
            urgency: goal.urgency
          };
          
          try {
            const miniQuest = await miniQuestService.generateMiniQuest(
              npc,
              ctx.character,
              { urgentNeed: mostUrgent }
            );
            
            ctx.response = `I'm working on something important: ${goal.description}. I could use help with this. Are you interested?`;
            ctx.offerQuest = true;
            ctx.questId = miniQuest.id;
            ctx.questType = 'mini';
            ctx.moralAlignment = miniQuest.moralAlignment || 'neutral';
            ctx.behaviorOverride = true;
          } catch (error) {
            console.error('[Behavior Tree] Failed to generate quest for urgent goal:', error);
            ctx.response = `I'm working on something important: ${goal.description}. I could use help, if you're interested.`;
            ctx.hintQuest = true;
            ctx.behaviorOverride = true;
          }
        } else {
          // Lower trust, just mention the goal
          ctx.response = `I have something important I'm working on, but I'm not sure I can trust you with it yet.`;
          ctx.behaviorOverride = true;
        }
      }
    }));
    root.addChild(urgentGoalBranch);
    
    // Branch 6: Normal conversation (default)
    const normalBranch = new BehaviorNode('action', {
      execute: async (ctx) => {
        ctx.proceedNormal = true;
      }
    });
    root.addChild(normalBranch);
    
    return root;
  }

  /**
   * Execute behavior tree
   * @param {BehaviorNode} tree - Behavior tree root
   * @param {Object} context - Execution context
   * @returns {Promise<string>} Result status
   */
  async executeTree(tree, context) {
    return await tree.execute(context);
  }

  /**
   * Check if behavior tree should override normal dialogue
   * @param {Object} context - Behavior context
   * @returns {boolean} True if override
   */
  shouldOverrideDialogue(context) {
    return context.behaviorOverride === true;
  }
}

module.exports = new BehaviorTreeService();

