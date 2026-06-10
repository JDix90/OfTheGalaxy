/**
 * Conversation Context Service
 * Builds conversation context for dialogue generation
 */

const conversationHistoryService = require('./conversationHistoryService');

class ConversationContextService {
  /**
   * Build comprehensive conversation context for dialogue generation
   * @param {string} npcId - NPC ID
   * @param {string} characterId - Character ID
   * @param {string} playerMessage - Current player message (optional)
   * @returns {Promise<object>} Conversation context object
   */
  async buildContext(npcId, characterId, playerMessage = '') {
    const context = await conversationHistoryService.getConversationContext(npcId, characterId);
    
    // Extract topics from player message
    const messageTopics = playerMessage ? this.extractTopics(playerMessage) : [];
    
    // Check for topic continuation
    const topicContinuation = this.findTopicContinuation(
      context.topics,
      messageTopics,
      context.recentMessages
    );
    
    // Phase 4: Get relevant memories for dialogue generation
    const { NPC } = require('../models');
    const npc = await NPC.findByPk(npcId);
    let relevantMemories = [];
    if (npc) {
      const memoryService = require('./memoryService');
      // Build context object for memory retrieval
      const memoryContext = {
        currentTopics: messageTopics,
        questContext: context.questContext,
        questState: context.questState || 'none',
        relationshipLevel: context.relationshipLevel
      };
      relevantMemories = memoryService.getRelevantMemories(npc, characterId, memoryContext) || 
                        memoryService.getSignificantMemories(npc, characterId, 3) || [];
    }
    
    // Phase 3: Build enhanced context object with quest state
    // Phase 4: Include relevant memories
    return {
      recentMessages: context.recentMessages,
      activeTopics: context.topics,
      currentTopics: messageTopics,
      topicContinuation,
      questContext: context.questContext,
      questState: context.questState || 'none', // Phase 3: Quest state for dialogue generation
      lastTopic: context.lastTopic,
      relationshipLevel: context.relationshipLevel,
      conversationSummary: await conversationHistoryService.generateSummary(npcId, characterId),
      relevantMemories // Phase 4: Relevant memories for dialogue
    };
  }
  
  /**
   * Extract topics from message text
   * @param {string} message - Message text
   * @returns {Array<string>} Array of topic strings
   */
  extractTopics(message) {
    if (!message || typeof message !== 'string') {
      return [];
    }
    
    const topicKeywords = {
      planet: ['planet', 'world', 'location', 'place', 'here', 'surface', 'moon', 'system', 'galaxy', 'star', 'asteroid'],
      quest: ['quest', 'mission', 'job', 'work', 'task', 'assignment', 'objective', 'goal', 'errand'],
      faction: ['faction', 'organization', 'group', 'alliance', 'cartel', 'syndicate', 'guild', 'clan', 'empire', 'republic', 'alliance'],
      npc: ['you', 'yourself', 'your', 'tell me about yourself', 'who are you', 'what are you', 'your name'],
      resources: ['resource', 'material', 'item', 'credits', 'money', 'trade', 'buy', 'sell', 'purchase', 'cost', 'price', 'wealth'],
      danger: ['danger', 'safe', 'threat', 'enemy', 'hostile', 'security', 'dangerous', 'risky', 'unsafe', 'attack', 'combat'],
      location: ['where', 'location', 'place', 'area', 'district', 'building', 'find', 'directions', 'map', 'coordinates'],
      help: ['help', 'assist', 'aid', 'support', 'need', 'can you', 'could you', 'please'],
      combat: ['fight', 'battle', 'combat', 'attack', 'weapon', 'defend', 'enemy', 'kill', 'defeat'],
      information: ['tell me', 'what is', 'who is', 'explain', 'describe', 'information', 'know', 'learn'],
      relationship: ['friend', 'ally', 'enemy', 'trust', 'relationship', 'like', 'dislike', 'respect'],
      history: ['past', 'history', 'remember', 'before', 'ago', 'previous', 'earlier', 'once'],
      future: ['future', 'plan', 'next', 'will', 'going to', 'intend', 'goal', 'aspiration']
    };
    
    const topics = [];
    const lowerMessage = message.toLowerCase().trim();
    
    // Use word boundaries for better matching (avoid partial matches)
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      // Check for exact word matches or phrase matches
      const hasTopic = keywords.some(keyword => {
        // For multi-word keywords, check as phrase
        if (keyword.includes(' ')) {
          return lowerMessage.includes(keyword);
        }
        // For single words, use word boundary regex
        const wordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
        return wordRegex.test(lowerMessage);
      });
      
      if (hasTopic && !topics.includes(topic)) {
        topics.push(topic);
      }
    }
    
    return topics;
  }
  
  /**
   * Find if message continues a previous topic
   * @param {Array} topics - Array of topic records
   * @param {Array} messageTopics - Topics extracted from current message
   * @param {Array} recentMessages - Recent conversation messages
   * @returns {object|null} Topic continuation info or null
   */
  findTopicContinuation(topics, messageTopics, recentMessages) {
    if (!messageTopics || messageTopics.length === 0) {
      return null;
    }
    
    // Check if any message topics match recent conversation topics
    for (const topic of messageTopics) {
      const topicRecord = topics.find(t => t.topic === topic);
      if (topicRecord) {
        // Find last message about this topic (search in reverse order)
        const messagesReversed = [...recentMessages].reverse();
        const lastTopicMessage = messagesReversed.find(msg => 
          msg.topics && Array.isArray(msg.topics) && msg.topics.includes(topic)
        );
        
        if (lastTopicMessage) {
          return {
            topic,
            lastMessage: lastTopicMessage,
            canContinue: true,
            mentionCount: topicRecord.mentionCount,
            lastMentioned: topicRecord.lastMentioned
          };
        }
      }
    }
    
    return null;
  }
  
  /**
   * Detect message type
   * @param {string} message - Message text
   * @returns {string} Message type
   */
  detectMessageType(message) {
    const lowerMessage = message.toLowerCase().trim();
    
    // Greeting patterns
    if (/^(hi|hello|hey|greetings|good (morning|afternoon|evening))/i.test(lowerMessage)) {
      return 'greeting';
    }
    
    // Question patterns
    if (lowerMessage.includes('?') || 
        /^(what|where|when|who|why|how|tell me|can you|do you)/i.test(lowerMessage)) {
      return 'question';
    }
    
    // Quest-related
    if (/quest|mission|job|work|task/i.test(lowerMessage)) {
      return 'quest';
    }
    
    // Response/acknowledgment
    if (/^(yes|no|ok|okay|sure|thanks|thank you|got it)/i.test(lowerMessage)) {
      return 'response';
    }
    
    return 'general';
  }
  
  /**
   * Get conversation thread ID
   * @param {object} context - Conversation context
   * @returns {string|null} Thread ID or null
   */
  getConversationThread(context) {
    // If there's an active topic continuation, use that topic as thread
    if (context.topicContinuation && context.topicContinuation.canContinue) {
      return `thread_${context.topicContinuation.topic}`;
    }
    
    // If there's a quest context, use quest as thread
    if (context.questContext && context.questContext.questId) {
      return `thread_quest_${context.questContext.questId}`;
    }
    
    // Default to general thread
    return 'thread_general';
  }
}

module.exports = new ConversationContextService();

