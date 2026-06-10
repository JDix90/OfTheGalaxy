/**
 * Conversation Tree Service
 * Handles branching conversation trees for quest negotiations and complex dialogues
 * Phase 3: Conversation Trees
 */

const trustService = require('./trustService');
const motivationService = require('./motivationService');

/**
 * Conversation Tree Node
 * Represents a node in a conversation tree
 */
class ConversationTreeNode {
  constructor(id, type, data) {
    this.id = id;
    this.type = type; // 'prompt', 'choice', 'condition', 'action'
    this.data = data;
    this.children = [];
    this.parent = null;
  }

  addChild(node) {
    node.parent = this;
    this.children.push(node);
    return this;
  }
}

/**
 * Conversation Tree Service
 */
class ConversationTreeService {
  /**
   * Build a conversation tree for quest negotiation
   * @param {Object} npc - NPC instance
   * @param {Object} quest - Quest instance
   * @param {Object} relationship - Relationship instance
   * @param {Object} character - Player character
   * @returns {ConversationTreeNode} Root node of conversation tree
   */
  buildQuestNegotiationTree(npc, quest, relationship, character) {
    const root = new ConversationTreeNode('root', 'prompt', {
      text: this.getInitialQuestPrompt(npc, quest, relationship)
    });

    // Branch 1: Player accepts quest
    const acceptBranch = new ConversationTreeNode('accept', 'choice', {
      keywords: ['yes', 'accept', 'i will', 'i can', 'i\'ll do it', 'sure', 'okay', 'agreed'],
      response: this.getAcceptResponse(npc, quest, relationship)
    });
    acceptBranch.addChild(new ConversationTreeNode('accept_action', 'action', {
      execute: async (ctx) => {
        // Quest acceptance logic handled by quest service
        ctx.questAccepted = true;
        ctx.relationshipChange = 5;
        ctx.trustChange = 3;
      }
    }));
    root.addChild(acceptBranch);

    // Branch 2: Player declines quest
    const declineBranch = new ConversationTreeNode('decline', 'choice', {
      keywords: ['no', 'decline', 'can\'t', 'won\'t', 'not interested', 'sorry'],
      response: this.getDeclineResponse(npc, quest, relationship)
    });
    declineBranch.addChild(new ConversationTreeNode('decline_action', 'action', {
      execute: async (ctx) => {
        ctx.questDeclined = true;
        ctx.relationshipChange = -2;
        ctx.trustChange = -1;
      }
    }));
    root.addChild(declineBranch);

    // Branch 3: Player asks for more information
    const infoBranch = new ConversationTreeNode('info', 'choice', {
      keywords: ['tell me more', 'more info', 'details', 'what is it', 'explain', 'how'],
      response: this.getInfoResponse(npc, quest, relationship)
    });
    infoBranch.addChild(new ConversationTreeNode('info_prompt', 'prompt', {
      text: this.getDetailedQuestInfo(npc, quest)
    }));
    // After info, loop back to accept/decline
    infoBranch.addChild(acceptBranch);
    infoBranch.addChild(declineBranch);
    root.addChild(infoBranch);

    // Branch 4: Player negotiates rewards
    const negotiateBranch = new ConversationTreeNode('negotiate', 'choice', {
      keywords: ['reward', 'payment', 'credits', 'more', 'better', 'negotiate'],
      response: this.getNegotiateResponse(npc, quest, relationship, character)
    });
    negotiateBranch.addChild(new ConversationTreeNode('negotiate_condition', 'condition', {
      check: (ctx) => {
        const trustLevel = trustService.getTrustLevel(npc);
        const relationshipLevel = relationship.relationshipLevel || 0;
        // Only allow negotiation if trust/relationship is high enough
        return trustLevel >= 50 && relationshipLevel >= 40;
      }
    }));
    negotiateBranch.addChild(new ConversationTreeNode('negotiate_success', 'action', {
      execute: async (ctx) => {
        ctx.negotiationSuccess = true;
        ctx.rewardBonus = 0.1; // 10% reward bonus
        ctx.relationshipChange = 2;
      }
    }));
    negotiateBranch.addChild(new ConversationTreeNode('negotiate_failure', 'prompt', {
      text: "I'm sorry, but the rewards are fixed. Take it or leave it."
    }));
    root.addChild(negotiateBranch);

    return root;
  }

  /**
   * Execute a conversation tree
   * @param {ConversationTreeNode} tree - Root node of conversation tree
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Result with response and effects
   */
  async executeTree(tree, context) {
    const result = {
      response: null,
      questAccepted: false,
      questDeclined: false,
      relationshipChange: 0,
      trustChange: 0,
      rewardBonus: 0,
      nextNode: null
    };

    const playerMessage = (context.playerMessage || '').toLowerCase();

    // Start from root (should be a prompt)
    if (tree.type === 'prompt') {
      result.response = tree.data.text;
      
      // Find matching choice based on player message
      const matchingChoice = this.findMatchingChild(tree, playerMessage);
      
      if (matchingChoice && matchingChoice.type === 'choice') {
        // Use the choice's response
        result.response = matchingChoice.data.response;
        
        // Execute action children
        for (const child of matchingChoice.children) {
          if (child.type === 'action') {
            await child.data.execute({ ...context, result });
          } else if (child.type === 'condition') {
            const conditionMet = await child.data.check({ ...context, result });
            if (conditionMet) {
              // Find action child after condition
              const actionChild = matchingChoice.children.find(c => 
                c.type === 'action' && c !== child
              );
              if (actionChild) {
                await actionChild.data.execute({ ...context, result });
              }
            } else {
              // Find failure/alternative child
              const failureChild = matchingChoice.children.find(c => 
                c.type === 'prompt' && c.data.text
              );
              if (failureChild) {
                result.response = failureChild.data.text;
              }
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Find matching child node based on player message
   * @param {ConversationTreeNode} node - Parent node
   * @param {string} playerMessage - Player's message
   * @returns {ConversationTreeNode|null} Matching child node
   */
  findMatchingChild(node, playerMessage) {
    for (const child of node.children) {
      if (child.type === 'choice' && child.data.keywords) {
        const keywords = child.data.keywords;
        if (keywords.some(keyword => playerMessage.includes(keyword))) {
          return child;
        }
      }
    }
    return null;
  }

  /**
   * Get initial quest prompt
   * @param {Object} npc - NPC instance
   * @param {Object} quest - Quest instance
   * @param {Object} relationship - Relationship instance
   * @returns {string} Initial prompt text
   */
  getInitialQuestPrompt(npc, quest, relationship) {
    const relationshipTier = relationship.getRelationshipTier();
    const trustLevel = trustService.getTrustLevel(npc);

    if (relationshipTier === 'confidant' || trustLevel >= 70) {
      return `My trusted friend, I have an important quest for you: "${quest.title}". ${quest.description}. The rewards are substantial. Will you help me?`;
    } else if (relationshipTier === 'friend' || trustLevel >= 50) {
      return `Friend, I have a quest that needs doing: "${quest.title}". ${quest.shortDescription || quest.description}. Interested?`;
    } else {
      return `I have a job for you: "${quest.title}". ${quest.shortDescription || quest.description}. Are you interested?`;
    }
  }

  /**
   * Get accept response
   * @param {Object} npc - NPC instance
   * @param {Object} quest - Quest instance
   * @param {Object} relationship - Relationship instance
   * @returns {string} Accept response
   */
  getAcceptResponse(npc, quest, relationship) {
    const relationshipTier = relationship.getRelationshipTier();
    
    if (relationshipTier === 'confidant') {
      return `Thank you, my friend! I knew I could count on you. Here are the details...`;
    } else if (relationshipTier === 'friend') {
      return `Thank you, friend! I appreciate your help. Let me explain what needs to be done...`;
    } else {
      return `Good. Here's what I need you to do...`;
    }
  }

  /**
   * Get decline response
   * @param {Object} npc - NPC instance
   * @param {Object} quest - Quest instance
   * @param {Object} relationship - Relationship instance
   * @returns {string} Decline response
   */
  getDeclineResponse(npc, quest, relationship) {
    const relationshipTier = relationship.getRelationshipTier();
    const trustLevel = trustService.getTrustLevel(npc);

    if (relationshipTier === 'confidant') {
      return `I understand, my friend. Perhaps another time. Let me know if you change your mind.`;
    } else if (relationshipTier === 'friend') {
      return `That's disappointing, but I understand. If you change your mind, let me know.`;
    } else if (trustLevel < 30) {
      return `Fine. I'll find someone else.`;
    } else {
      return `Alright. If you change your mind, come back.`;
    }
  }

  /**
   * Get info response
   * @param {Object} npc - NPC instance
   * @param {Object} quest - Quest instance
   * @param {Object} relationship - Relationship instance
   * @returns {string} Info response
   */
  getInfoResponse(npc, quest, relationship) {
    return `Of course. Let me give you more details about the quest...`;
  }

  /**
   * Get detailed quest information
   * @param {Object} npc - NPC instance
   * @param {Object} quest - Quest instance
   * @returns {string} Detailed info
   */
  getDetailedQuestInfo(npc, quest) {
    let info = `"${quest.title}" involves: ${quest.description}\n\n`;
    
    if (quest.objectives && quest.objectives.length > 0) {
      info += `Objectives:\n`;
      quest.objectives.forEach((obj, idx) => {
        info += `${idx + 1}. ${obj.description}\n`;
      });
    }

    if (quest.rewards) {
      info += `\nRewards: `;
      const rewardParts = [];
      if (quest.rewards.xp) rewardParts.push(`${quest.rewards.xp} XP`);
      if (quest.rewards.credits) rewardParts.push(`${quest.rewards.credits} credits`);
      if (quest.rewards.items && quest.rewards.items.length > 0) {
        rewardParts.push(`${quest.rewards.items.length} item(s)`);
      }
      info += rewardParts.join(', ');
    }

    return info;
  }

  /**
   * Get negotiate response
   * @param {Object} npc - NPC instance
   * @param {Object} quest - Quest instance
   * @param {Object} relationship - Relationship instance
   * @param {Object} character - Player character
   * @returns {string} Negotiate response
   */
  getNegotiateResponse(npc, quest, relationship, character) {
    const relationshipTier = relationship.getRelationshipTier();
    const trustLevel = trustService.getTrustLevel(npc);
    const charisma = character.stats?.charisma || 10;

    if (relationshipTier === 'confidant' && trustLevel >= 70) {
      return `My friend, I can see you're skilled. I might be able to offer a bit more...`;
    } else if (relationshipTier === 'friend' && trustLevel >= 50 && charisma >= 15) {
      return `Friend, you drive a hard bargain. Let me see what I can do...`;
    } else {
      return `The rewards are fixed. I can't negotiate on this.`;
    }
  }

  /**
   * Detect player choice from message
   * @param {string} playerMessage - Player's message
   * @returns {string|null} Detected choice type
   */
  detectChoice(playerMessage) {
    const message = playerMessage.toLowerCase().trim();

    // Only detect quest-related choices if the message is actually quest-related
    // This prevents false matches like "how are you" being interpreted as quest info requests
    const isQuestRelated = /quest|mission|job|work|task|help.*you|assist|offer|proposal|deal|agreement/i.test(message);
    
    // If message is clearly a greeting or casual conversation, don't treat as quest choice
    const isGreeting = /^(hi|hello|hey|greetings|good (morning|afternoon|evening)|how are you|what's up|how's it going)/i.test(message);
    if (isGreeting && !isQuestRelated) {
      return null; // Don't treat greetings as quest choices
    }

    const acceptKeywords = ['yes', 'accept', 'i will', 'i can', 'i\'ll do it', 'sure', 'okay', 'agreed', 'deal'];
    const declineKeywords = ['no', 'decline', 'can\'t', 'won\'t', 'not interested', 'sorry', 'pass'];
    // Make info keywords more specific - require quest context
    const infoKeywords = ['tell me more', 'more info', 'more details', 'what is it', 'explain.*quest', 'explain.*mission', 'explain.*job', 'explain.*work', 'how.*quest', 'how.*mission', 'how.*job', 'how.*work', 'information.*quest'];
    const negotiateKeywords = ['reward', 'payment', 'credits', 'more.*reward', 'better.*reward', 'negotiate', 'bargain'];

    // Accept/decline can be standalone (yes/no responses)
    if (acceptKeywords.some(kw => message.includes(kw))) {
      return 'accept';
    }
    if (declineKeywords.some(kw => message.includes(kw))) {
      return 'decline';
    }
    
    // Info and negotiate require quest context
    if (isQuestRelated) {
      if (infoKeywords.some(kw => {
        const regex = new RegExp(kw.replace(/\*/g, '.*'), 'i');
        return regex.test(message);
      })) {
        return 'info';
      }
      if (negotiateKeywords.some(kw => {
        const regex = new RegExp(kw.replace(/\*/g, '.*'), 'i');
        return regex.test(message);
      })) {
        return 'negotiate';
      }
    }

    return null;
  }
}

module.exports = new ConversationTreeService();

