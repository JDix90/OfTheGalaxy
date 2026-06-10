/**
 * Conversation History Service
 * Manages conversation history storage, retrieval, and topic tracking
 * Phase 5: Enhanced with caching, improved summarization, and search
 */

const { NPCRelationship, ConversationTopics, ConversationContext } = require('../models');
const { v4: uuidv4 } = require('uuid');

// Phase 5: Simple in-memory cache for conversation history
// Cache structure: { key: `${npcId}_${characterId}`, data: { messages, topics, timestamp } }
const historyCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100; // Maximum number of cached relationships

// Phase 5: Cache management
function getCacheKey(npcId, characterId) {
  return `${npcId}_${characterId}`;
}

function getCachedHistory(npcId, characterId) {
  const key = getCacheKey(npcId, characterId);
  const cached = historyCache.get(key);
  if (!cached) return null;
  
  const age = Date.now() - cached.timestamp;
  if (age > CACHE_TTL) {
    historyCache.delete(key);
    return null;
  }
  
  return cached.data;
}

function setCachedHistory(npcId, characterId, data) {
  const key = getCacheKey(npcId, characterId);
  
  // Evict oldest entries if cache is full
  if (historyCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = Array.from(historyCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
    historyCache.delete(oldestKey);
  }
  
  historyCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

function invalidateCache(npcId, characterId) {
  const key = getCacheKey(npcId, characterId);
  historyCache.delete(key);
}

class ConversationHistoryService {
  /**
   * Load conversation history for NPC-Character relationship
   * @param {string} npcId - NPC ID
   * @param {string} characterId - Character ID
   * @param {object} options - Query options (limit, offset, topic, questId)
   * @returns {Promise<object>} Conversation history with pagination info
   */
  async loadConversationHistory(npcId, characterId, options = {}) {
    const { limit = 100, offset = 0, topic = null, questId = null, searchQuery = null, useCache = true } = options;
    
    // Phase 5: Check cache first (if no filters applied and cache enabled)
    if (useCache && !topic && !questId && !searchQuery && offset === 0) {
      const cached = getCachedHistory(npcId, characterId);
      if (cached) {
        // Return cached data with pagination
        const paginated = cached.messages.slice(0, limit);
        return {
          messages: paginated,
          total: cached.total,
          hasMore: cached.messages.length > limit,
          cached: true
        };
      }
    }
    
    const relationship = await NPCRelationship.findOne({
      where: { npcId, characterId }
    });
    
    if (!relationship) {
      return { messages: [], total: 0, hasMore: false };
    }
    
    let messages = relationship.conversationHistory || [];
    
    // Phase 5: Search functionality
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      messages = messages.filter(msg => {
        const text = (msg.text || '').toLowerCase();
        const sender = (msg.sender || '').toLowerCase();
        return text.includes(query) || sender.includes(query);
      });
    }
    
    // Filter by topic if specified
    if (topic) {
      messages = messages.filter(msg => 
        msg.topics && Array.isArray(msg.topics) && msg.topics.includes(topic)
      );
    }
    
    // Filter by quest if specified
    if (questId) {
      messages = messages.filter(msg => 
        msg.questId === questId || 
        (msg.questContext && msg.questContext.questId === questId)
      );
    }
    
    // Sort by timestamp (newest first for pagination, then reverse for display)
    messages.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0);
      const timeB = new Date(b.timestamp || 0);
      return timeB - timeA;
    });
    
    const total = messages.length;
    const paginated = messages.slice(offset, offset + limit);
    
    // Reverse for display (oldest first)
    paginated.reverse();
    
    const result = {
      messages: paginated,
      total,
      hasMore: offset + limit < total
    };
    
    // Phase 5: Cache the full result (only if no filters and first page)
    if (useCache && !topic && !questId && !searchQuery && offset === 0) {
      setCachedHistory(npcId, characterId, {
        messages: messages.reverse(), // Store in display order (oldest first)
        total,
        topics: [] // Will be loaded separately
      });
    }
    
    return result;
  }
  
  /**
   * Save a conversation message
   * @param {string} npcId - NPC ID
   * @param {string} characterId - Character ID
   * @param {object} message - Message object with sender, text, topics, etc.
   * @returns {Promise<object>} Saved message with ID
   */
  async saveConversationMessage(npcId, characterId, message) {
    const relationship = await NPCRelationship.findOne({
      where: { npcId, characterId }
    });
    
    if (!relationship) {
      // Create relationship if it doesn't exist
      relationship = await NPCRelationship.create({
        npcId,
        characterId,
        relationshipLevel: 0,
        conversationHistory: []
      });
    }
    
    // Ensure message has required fields
    const enhancedMessage = {
      id: message.id || uuidv4(),
      timestamp: message.timestamp || new Date(),
      sender: message.sender, // 'player' or 'npc'
      text: message.text || '',
      topics: message.topics || [],
      questId: message.questId || null,
      questContext: message.questContext || null,
      emotionalContext: message.emotionalContext || null,
      metadata: message.metadata || {}
    };
    
    // Add to conversation history
    // IMPORTANT: Create new array reference for Sequelize to detect changes
    const history = relationship.conversationHistory ? [...relationship.conversationHistory] : [];
    history.push(enhancedMessage);
    
    // Update relationship
    relationship.set('conversationHistory', history);
    relationship.lastInteraction = new Date();
    relationship.interactionCount = (relationship.interactionCount || 0) + 1;
    
    // Update last conversation topic if provided
    if (message.topics && message.topics.length > 0) {
      relationship.lastConversationTopic = message.topics[0];
    }
    
    await relationship.save();
    
    // Phase 5: Invalidate cache when new message is saved
    invalidateCache(npcId, characterId);
    
    // Update conversation topics
    if (message.topics && message.topics.length > 0) {
      await this.updateConversationTopics(relationship.id, enhancedMessage);
    }
    
    // Update conversation context
    await this.updateConversationContext(relationship.id, enhancedMessage);
    
    // Phase 4: Memory Integration - Detect and store important conversations
    await this.processImportantConversation(npcId, characterId, enhancedMessage);
    
    return enhancedMessage;
  }
  
  /**
   * Phase 4: Process important conversations for memory storage
   * @param {string} npcId - NPC ID
   * @param {string} characterId - Character ID
   * @param {object} message - Message object with quest context, emotional context, etc.
   */
  async processImportantConversation(npcId, characterId, message) {
    try {
      // Check if this is an important conversation
      if (!this.isImportantConversation(message)) {
        return; // Not important, skip memory storage
      }
      
      // Get NPC and relationship
      const { NPC } = require('../models');
      const npc = await NPC.findByPk(npcId);
      if (!npc) {
        return;
      }
      
      const memoryService = require('./memoryService');
      
      // Determine event type and significance based on message context
      const { eventType, significance, eventData } = this.determineMemoryEvent(message);
      
      if (eventType && significance > 0.3) {
        // Store in NPC memory
        memoryService.addEpisodicMemory(
          npc,
          characterId,
          eventType,
          eventData,
          significance
        );
        
        // Save NPC to persist memory
        await npc.save();
        
        console.log(`[Conversation History] ✓ Stored important conversation in memory: ${eventType} (significance: ${significance.toFixed(2)})`);
      }
    } catch (error) {
      // Don't fail conversation save if memory processing fails
      console.error('[Conversation History] Error processing important conversation for memory:', error);
    }
  }
  
  /**
   * Phase 4: Determine if a conversation is important enough to store in memory
   * @param {object} message - Message object with context
   * @returns {boolean} True if conversation is important
   */
  isImportantConversation(message) {
    // Quest acceptance/completion
    if (message.questContext?.action === 'accepted' || 
        message.questContext?.action === 'completed' ||
        message.questContext?.action === 'abandoned') {
      return true;
    }
    
    // Quest objective completed
    if (message.questContext?.action === 'objective_completed') {
      return true;
    }
    
    // Relationship milestone (check metadata or emotional context)
    if (message.metadata?.relationshipMilestone || 
        message.emotionalContext?.relationshipMilestone) {
      return true;
    }
    
    // Significant emotional event
    if (message.emotionalContext?.significantEmotion) {
      return true;
    }
    
    // Player shares important information
    if (message.metadata?.messageType === 'significant_revelation' ||
        message.metadata?.messageType === 'quest_accepted' ||
        message.metadata?.messageType === 'quest_completed' ||
        message.metadata?.messageType === 'quest_abandoned') {
      return true;
    }
    
    // High significance conversations (from metadata)
    if (message.metadata?.significance && message.metadata.significance > 0.7) {
      return true;
    }
    
    // Check message text for high-significance keywords
    const text = (message.text || '').toLowerCase();
    const highSignificanceKeywords = [
      'betray', 'trust', 'secret', 'important', 'danger', 
      'help me', 'save', 'rescue', 'gift', 'favor'
    ];
    
    if (highSignificanceKeywords.some(keyword => text.includes(keyword))) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Phase 4: Determine memory event type and significance from message
   * @param {object} message - Message object with context
   * @returns {object} { eventType, significance, eventData }
   */
  determineMemoryEvent(message) {
    let eventType = 'conversation';
    let significance = 0.5;
    const eventData = {
      messageText: message.text?.substring(0, 200) || '',
      timestamp: message.timestamp || new Date(),
      topics: message.topics || []
    };
    
    // Quest-related events
    if (message.questContext) {
      const action = message.questContext.action;
      if (action === 'accepted') {
        eventType = 'quest_accepted';
        significance = 0.7;
        eventData.questId = message.questContext.questId;
        eventData.questTitle = message.metadata?.questTitle;
      } else if (action === 'completed') {
        eventType = 'quest_completed';
        significance = 0.9;
        eventData.questId = message.questContext.questId;
        eventData.questTitle = message.metadata?.questTitle;
        eventData.rewards = message.questContext.rewards;
      } else if (action === 'abandoned') {
        eventType = 'quest_abandoned';
        significance = 0.6;
        eventData.questId = message.questContext.questId;
        eventData.questTitle = message.metadata?.questTitle;
      } else if (action === 'objective_completed') {
        eventType = 'quest_progress';
        significance = 0.5;
        eventData.questId = message.questContext.questId;
        eventData.objectiveId = message.questContext.objectiveId;
      }
    }
    
    // Relationship milestones
    if (message.metadata?.relationshipMilestone || message.emotionalContext?.relationshipMilestone) {
      eventType = 'relationship_milestone';
      significance = 0.8;
      eventData.milestone = message.metadata?.relationshipMilestone || message.emotionalContext?.relationshipMilestone;
      eventData.relationshipLevel = message.emotionalContext?.relationshipLevel;
    }
    
    // Significant emotional events
    if (message.emotionalContext?.significantEmotion) {
      const emotion = message.emotionalContext.npcEmotion;
      if (['angry', 'betrayed', 'hostile'].includes(emotion)) {
        eventType = 'player_betrayed';
        significance = 0.8;
      } else if (['grateful', 'happy', 'trusting'].includes(emotion)) {
        eventType = 'player_helped';
        significance = 0.7;
      } else if (['insulted', 'offended'].includes(emotion)) {
        eventType = 'player_insult';
        significance = 0.6;
      }
      eventData.emotion = emotion;
    }
    
    // High-significance keywords in message
    const text = (message.text || '').toLowerCase();
    if (text.includes('betray') || text.includes('betrayed')) {
      eventType = 'player_betrayed';
      significance = Math.max(significance, 0.9);
    } else if (text.includes('gift') || text.includes('gave you')) {
      eventType = 'player_gift';
      significance = Math.max(significance, 0.6);
    } else if (text.includes('help') && text.includes('you')) {
      eventType = 'player_helped';
      significance = Math.max(significance, 0.7);
    } else if (text.includes('respect') || text.includes('honor')) {
      eventType = 'player_respect';
      significance = Math.max(significance, 0.6);
    } else if (text.includes('insult') || text.includes('disrespect')) {
      eventType = 'player_insult';
      significance = Math.max(significance, 0.7);
    }
    
    // Override significance from metadata if present
    if (message.metadata?.significance) {
      significance = message.metadata.significance;
    }
    
    return { eventType, significance, eventData };
  }
  
  /**
   * Extract and update conversation topics
   * @param {string} relationshipId - Relationship ID
   * @param {object} message - Message object with topics
   */
  async updateConversationTopics(relationshipId, message) {
    if (!message.topics || message.topics.length === 0) return;
    
    for (const topic of message.topics) {
      const [topicRecord, created] = await ConversationTopics.findOrCreate({
        where: {
          relationshipId,
          topic
        },
        defaults: {
          relationshipId,
          topic,
          firstMentioned: message.timestamp,
          lastMentioned: message.timestamp,
          mentionCount: 1,
          context: {}
        }
      });
      
      if (!created) {
        topicRecord.incrementMention();
        await topicRecord.save();
      }
    }
  }
  
  /**
   * Get conversation topics for relationship
   * @param {string} npcId - NPC ID
   * @param {string} characterId - Character ID
   * @returns {Promise<Array>} Array of topic objects
   */
  async getConversationTopics(npcId, characterId) {
    const relationship = await NPCRelationship.findOne({
      where: { npcId, characterId }
    });
    
    if (!relationship) {
      return [];
    }
    
    const topics = await ConversationTopics.findAll({
      where: { relationshipId: relationship.id },
      order: [['last_mentioned', 'DESC']]
    });
    
    return topics.map(t => ({
      topic: t.topic,
      firstMentioned: t.firstMentioned,
      lastMentioned: t.lastMentioned,
      mentionCount: t.mentionCount,
      context: t.context || {}
    }));
  }
  
  /**
   * Get conversation context for dialogue generation
   * @param {string} npcId - NPC ID
   * @param {string} characterId - Character ID
   * @returns {Promise<object>} Conversation context object
   */
  async getConversationContext(npcId, characterId) {
    const relationship = await NPCRelationship.findOne({
      where: { npcId, characterId }
    });
    
    if (!relationship) {
      return { 
        recentMessages: [], 
        topics: [], 
        questContext: null,
        lastTopic: null,
        relationshipLevel: 0
      };
    }
    
    const history = relationship.conversationHistory || [];
    // Get last 10 messages for context
    const recentMessages = history.slice(-10);
    
    const topics = await this.getConversationTopics(npcId, characterId);
    
    // Phase 3: Enhanced Quest Context Tracking
    const { QuestProgress, Quest } = require('../models');
    const Sequelize = require('sequelize');
    
    // Get active quests from this NPC
    const activeQuests = await QuestProgress.findAll({
      where: {
        characterId,
        status: 'active'
      },
      include: [{
        model: Quest,
        as: 'quest',
        where: { 
          [Sequelize.Op.or]: [
            { questGiverId: npcId },
            { giverId: npcId },
            { npcId: npcId }
          ]
        },
        required: false
      }]
    });
    
    // Get recently completed quests from this NPC (within last 24 hours)
    const recentlyCompletedQuests = await QuestProgress.findAll({
      where: {
        characterId,
        status: 'completed',
        completedAt: {
          [Sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      include: [{
        model: Quest,
        as: 'quest',
        where: { 
          [Sequelize.Op.or]: [
            { questGiverId: npcId },
            { giverId: npcId },
            { npcId: npcId }
          ]
        },
        required: false
      }],
      order: [['completed_at', 'DESC']],
      limit: 3 // Last 3 completed quests
    });
    
    // Get recently abandoned quests from this NPC (within last 24 hours)
    const recentlyAbandonedQuests = await QuestProgress.findAll({
      where: {
        characterId,
        status: 'abandoned',
        completedAt: {
          [Sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      include: [{
        model: Quest,
        as: 'quest',
        where: { 
          [Sequelize.Op.or]: [
            { questGiverId: npcId },
            { giverId: npcId },
            { npcId: npcId }
          ]
        },
        required: false
      }],
      order: [['completed_at', 'DESC']],
      limit: 1 // Most recent abandoned quest
    });
    
    // Build comprehensive quest context
    let questContext = null;
    let questState = 'none'; // 'none', 'offered', 'active', 'completed', 'abandoned'
    
    if (activeQuests.length > 0 && activeQuests[0].quest) {
      const activeQuest = activeQuests[0];
      const quest = activeQuest.quest;
      
      // Calculate quest progress
      const totalObjectives = quest.objectives?.length || 0;
      const completedObjectives = Object.keys(activeQuest.objectivesCompleted || {})
        .filter(id => activeQuest.objectivesCompleted[id] === true).length;
      const progressPercent = totalObjectives > 0 
        ? Math.round((completedObjectives / totalObjectives) * 100) 
        : 0;
      
      // Find recent quest-related messages in conversation history
      const questRelatedMessages = history
        .filter(msg => 
          (msg.questId === quest.id || 
           (msg.questContext && msg.questContext.questId === quest.id)) &&
          msg.questContext?.action
        )
        .slice(-5) // Last 5 quest-related messages
        .reverse(); // Oldest first
      
      // Determine quest state from recent messages
      const lastQuestAction = questRelatedMessages.length > 0 
        ? questRelatedMessages[questRelatedMessages.length - 1]?.questContext?.action
        : 'active';
      
      questState = lastQuestAction === 'accepted' ? 'active' : 
                   lastQuestAction === 'offered' ? 'offered' : 
                   'active';
      
      questContext = {
        questId: quest.id,
        questTitle: quest.title,
        questDescription: quest.description,
        questType: quest.questType || 'mini',
        objectives: quest.objectives || [],
        progress: activeQuest.objectivesCompleted || {},
        objectiveProgress: activeQuest.objectiveProgress || {},
        progressPercent,
        completedObjectives,
        totalObjectives,
        startedAt: activeQuest.startedAt,
        state: questState,
        recentActions: questRelatedMessages.map(msg => ({
          action: msg.questContext?.action || 'discussed',
          timestamp: msg.timestamp,
          message: msg.text?.substring(0, 100) // First 100 chars
        }))
      };
    } else if (recentlyCompletedQuests.length > 0 && recentlyCompletedQuests[0].quest) {
      // Most recently completed quest
      const completedQuest = recentlyCompletedQuests[0];
      const quest = completedQuest.quest;
      
      questState = 'completed';
      questContext = {
        questId: quest.id,
        questTitle: quest.title,
        questDescription: quest.description,
        questType: quest.questType || 'mini',
        state: 'completed',
        completedAt: completedQuest.completedAt,
        wasCompleted: true
      };
    } else if (recentlyAbandonedQuests.length > 0 && recentlyAbandonedQuests[0].quest) {
      // Most recently abandoned quest
      const abandonedQuest = recentlyAbandonedQuests[0];
      const quest = abandonedQuest.quest;
      
      questState = 'abandoned';
      questContext = {
        questId: quest.id,
        questTitle: quest.title,
        questDescription: quest.description,
        questType: quest.questType || 'mini',
        state: 'abandoned',
        abandonedAt: abandonedQuest.completedAt,
        wasAbandoned: true
      };
    }
    
    return {
      recentMessages,
      topics: topics.slice(0, 5), // Top 5 most recent topics
      questContext,
      questState, // Phase 3: Quest state for dialogue generation
      lastTopic: relationship.lastConversationTopic,
      relationshipLevel: relationship.relationshipLevel || 0
    };
  }
  
  /**
   * Generate conversation summary
   * @param {string} npcId - NPC ID
   * @param {string} characterId - Character ID
   * @returns {Promise<object>} Conversation summary
   */
  async generateSummary(npcId, characterId) {
    const relationship = await NPCRelationship.findOne({
      where: { npcId, characterId }
    });
    
    if (!relationship) {
      return null;
    }
    
    const history = relationship.conversationHistory || [];
    if (history.length === 0) {
      return null;
    }
    
    // Extract key information
    const topics = new Set();
    const quests = new Set();
    
    history.forEach(msg => {
      if (msg.topics && Array.isArray(msg.topics)) {
        msg.topics.forEach(t => topics.add(t));
      }
      if (msg.questId) {
        quests.add(msg.questId);
      }
      if (msg.questContext && msg.questContext.questId) {
        quests.add(msg.questContext.questId);
      }
    });
    
    const summary = {
      messageCount: history.length,
      topics: Array.from(topics),
      quests: Array.from(quests),
      timeSpan: {
        first: history[0]?.timestamp,
        last: history[history.length - 1]?.timestamp
      }
    };
    
    // Update relationship with summary
    relationship.conversationSummary = summary;
    await relationship.save();
    
    return summary;
  }
}

module.exports = new ConversationHistoryService();

