/**
 * Memory Service
 * Handles NPC episodic and semantic memory systems
 * Phase 1: Simplified Memory System
 * Phase 3: Advanced Memory - Consolidation and improved significance
 */

class MemoryService {
  /**
   * Initialize memory structure for an NPC
   * @param {Object} npc - NPC instance
   * @returns {Object} Initialized memory structure
   */
  initializeMemory(npc) {
    return {
      episodes: [],
      playerKnowledge: {
        traits: [],
        knownFacts: []
      },
      conversationStyle: 'direct'
    };
  }

  /**
   * Add an episodic memory (event memory)
   * @param {Object} npc - NPC instance
   * @param {string} characterId - Player character ID
   * @param {string} eventType - Type of event
   * @param {Object} eventData - Event data
   * @param {number} significance - Significance level (0-1)
   */
  addEpisodicMemory(npc, characterId, eventType, eventData = {}, significance = 0.5) {
    if (!npc.memory) {
      npc.memory = this.initializeMemory(npc);
    }

    const memory = npc.memory;
    const now = new Date().toISOString();

    const episode = {
      id: `${npc.id}_episode_${Date.now()}`,
      characterId,
      eventType,
      eventData,
      significance,
      timestamp: now,
      participants: [characterId, npc.id],
      location: npc.location || null
    };

    memory.episodes.push(episode);

    // Phase 3: Consolidate memories (remove low-significance old memories)
    this.consolidateMemories(memory);

    return episode;
  }

  /**
   * Consolidate memories - remove low-significance old memories
   * Phase 3: Advanced Memory
   * @param {Object} memory - Memory object
   */
  consolidateMemories(memory) {
    if (!memory.episodes || memory.episodes.length === 0) {
      return;
    }

    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    const minSignificance = 0.3; // Minimum significance to keep old memories

    // Filter and sort memories
    memory.episodes = memory.episodes
      .filter(episode => {
        const age = now - new Date(episode.timestamp).getTime();
        const significance = episode.significance || 0.5;
        
        // Keep if recent (less than 30 days) OR if high significance
        return age < maxAge || significance >= minSignificance;
      })
      .sort((a, b) => {
        // Sort by significance first, then by recency
        const sigDiff = (b.significance || 0) - (a.significance || 0);
        if (Math.abs(sigDiff) > 0.1) {
          return sigDiff;
        }
        return new Date(b.timestamp) - new Date(a.timestamp);
      })
      .slice(0, 15); // Keep top 15 memories (increased from 10)
  }

  /**
   * Get significant memories for a character
   * Phase 3: Enhanced with better retrieval algorithm
   * @param {Object} npc - NPC instance
   * @param {string} characterId - Player character ID
   * @param {number} limit - Maximum number of memories to return
   * @returns {Array} Array of significant memories
   */
  getSignificantMemories(npc, characterId, limit = 3) {
    if (!npc.memory || !npc.memory.episodes) {
      return [];
    }

    // Phase 3: Consolidate before retrieval
    this.consolidateMemories(npc.memory);

    // Phase 3: Improved retrieval - consider recency and significance
    const now = Date.now();
    return npc.memory.episodes
      .filter(episode => episode.participants?.includes(characterId))
      .map(episode => {
        const age = now - new Date(episode.timestamp).getTime();
        const ageInDays = age / (24 * 60 * 60 * 1000);
        const significance = episode.significance || 0.5;
        
        // Calculate relevance score: significance weighted by recency
        // Recent memories (0-7 days) get full weight, older memories decay
        const recencyWeight = ageInDays < 7 ? 1.0 : Math.max(0.3, 1.0 - (ageInDays - 7) / 30);
        const relevanceScore = significance * recencyWeight;
        
        return {
          ...episode,
          relevanceScore
        };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit)
      .map(({ relevanceScore, ...episode }) => episode); // Remove relevanceScore before returning
  }

  /**
   * Get memory summary for dialogue prompts
   * @param {Object} npc - NPC instance
   * @param {string} characterId - Player character ID
   * @returns {string} Memory summary string
   */
  getMemorySummary(npc, characterId) {
    const memories = this.getSignificantMemories(npc, characterId, 3);
    
    if (memories.length === 0) {
      return '';
    }

    const summaries = memories.map(memory => {
      return this.formatMemoryForDialogue(memory);
    });

    return `You remember these interactions with the player: ${summaries.join('; ')}. `;
  }

  /**
   * Format a memory for dialogue prompts
   * @param {Object} memory - Memory episode
   * @returns {string} Formatted memory string
   */
  formatMemoryForDialogue(memory) {
    const eventType = memory.eventType;
    const significance = memory.significance || 0.5;
    const eventData = memory.eventData || {};

    const descriptions = {
      quest_completed: `they helped you complete a quest${eventData.questTitle ? `: "${eventData.questTitle}"` : ''}`,
      quest_accepted: `they accepted a quest from you${eventData.questTitle ? `: "${eventData.questTitle}"` : ''}`,
      quest_abandoned: `they abandoned a quest you gave them${eventData.questTitle ? `: "${eventData.questTitle}"` : ''}`,
      quest_progress: `they made progress on a quest${eventData.questTitle ? `: "${eventData.questTitle}"` : ''}`,
      quest_failed: 'they failed a quest you gave them',
      player_helped: 'they helped you in a time of need',
      player_betrayed: 'they betrayed your trust',
      player_gift: 'they gave you a gift',
      player_respect: 'they showed you respect',
      player_insult: 'they insulted you',
      relationship_milestone: `you reached a relationship milestone${eventData.milestone ? `: ${eventData.milestone}` : ''}`,
      conversation_positive: 'you had a positive conversation',
      conversation_negative: 'you had a negative conversation',
      conversation: 'you had a conversation',
      trade_completed: 'you completed a trade',
      trade_failed: 'a trade with them failed'
    };

    const description = descriptions[eventType] || `you interacted with them (${eventType})`;
    
    // Add timestamp context if available
    let timeContext = '';
    if (memory.timestamp) {
      const memoryDate = new Date(memory.timestamp);
      const now = new Date();
      const daysAgo = Math.floor((now - memoryDate) / (1000 * 60 * 60 * 24));
      
      if (daysAgo === 0) {
        timeContext = ' earlier today';
      } else if (daysAgo === 1) {
        timeContext = ' yesterday';
      } else if (daysAgo < 7) {
        timeContext = ` ${daysAgo} days ago`;
      } else if (daysAgo < 30) {
        timeContext = ` about ${Math.floor(daysAgo / 7)} weeks ago`;
      } else {
        timeContext = ` about ${Math.floor(daysAgo / 30)} months ago`;
      }
    }
    
    if (significance > 0.7) {
      return `${description}${timeContext} (this was very significant to you)`;
    } else if (significance > 0.4) {
      return `${description}${timeContext}`;
    } else {
      return `${description}${timeContext} (minor interaction)`;
    }
  }

  /**
   * Add semantic memory (factual knowledge about player)
   * @param {Object} npc - NPC instance
   * @param {string} characterId - Player character ID
   * @param {string} knowledgeType - Type of knowledge (trait, fact, etc.)
   * @param {string} knowledge - Knowledge content
   */
  addSemanticMemory(npc, characterId, knowledgeType, knowledge) {
    if (!npc.memory) {
      npc.memory = this.initializeMemory(npc);
    }

    const memory = npc.memory;

    if (knowledgeType === 'trait') {
      if (!memory.playerKnowledge.traits.includes(knowledge)) {
        memory.playerKnowledge.traits.push(knowledge);
        // Keep only last 10 traits
        if (memory.playerKnowledge.traits.length > 10) {
          memory.playerKnowledge.traits = memory.playerKnowledge.traits.slice(-10);
        }
      }
    } else if (knowledgeType === 'fact') {
      if (!memory.playerKnowledge.knownFacts.includes(knowledge)) {
        memory.playerKnowledge.knownFacts.push(knowledge);
        // Keep only last 10 facts
        if (memory.playerKnowledge.knownFacts.length > 10) {
          memory.playerKnowledge.knownFacts = memory.playerKnowledge.knownFacts.slice(-10);
        }
      }
    }
  }

  /**
   * Get player knowledge summary
   * @param {Object} npc - NPC instance
   * @param {string} characterId - Player character ID
   * @returns {string} Knowledge summary
   */
  getPlayerKnowledgeSummary(npc, characterId) {
    if (!npc.memory || !npc.memory.playerKnowledge) {
      return '';
    }

    const knowledge = npc.memory.playerKnowledge;
    const parts = [];

    if (knowledge.traits && knowledge.traits.length > 0) {
      parts.push(`You know the player is ${knowledge.traits.slice(0, 3).join(', ')}`);
    }

    if (knowledge.knownFacts && knowledge.knownFacts.length > 0) {
      parts.push(`You know: ${knowledge.knownFacts.slice(0, 2).join('; ')}`);
    }

    return parts.length > 0 ? parts.join('. ') + '. ' : '';
  }

  /**
   * Process conversation to extract and store knowledge
   * @param {Object} npc - NPC instance
   * @param {string} characterId - Player character ID
   * @param {string} playerMessage - Player's message
   * @param {string} npcResponse - NPC's response
   */
  processConversation(npc, characterId, playerMessage, npcResponse) {
    // Extract traits from conversation (simple keyword matching)
    const traitKeywords = {
      'brave': ['brave', 'courageous', 'bold', 'fearless'],
      'cowardly': ['afraid', 'scared', 'coward', 'fearful'],
      'honest': ['honest', 'truthful', 'sincere'],
      'dishonest': ['lie', 'deceive', 'cheat', 'dishonest'],
      'generous': ['give', 'share', 'generous', 'help'],
      'selfish': ['selfish', 'greedy', 'hoard', 'keep']
    };

    const lowerMessage = playerMessage.toLowerCase();
    for (const [trait, keywords] of Object.entries(traitKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        this.addSemanticMemory(npc, characterId, 'trait', trait);
      }
    }

    // Store conversation as episodic memory if significant
    // Phase 3: Pass NPC for improved significance calculation
    const significance = this.calculateConversationSignificance(playerMessage, npcResponse, npc);
    if (significance > 0.3) {
      this.addEpisodicMemory(
        npc,
        characterId,
        'conversation',
        { message: playerMessage.substring(0, 100), response: npcResponse.substring(0, 100) },
        significance
      );
    }
  }

  /**
   * Calculate significance of a conversation
   * Phase 3: Improved significance calculation
   * @param {string} playerMessage - Player's message
   * @param {string} npcResponse - NPC's response
   * @param {Object} npc - NPC instance (optional, for context)
   * @returns {number} Significance (0-1)
   */
  calculateConversationSignificance(playerMessage, npcResponse, npc = null) {
    let significance = 0.1; // Base significance

    // Longer conversations are more significant
    if (playerMessage.length > 50) significance += 0.1;
    if (npcResponse.length > 100) significance += 0.1;

    // Keywords that indicate significance (weighted by importance)
    const highSignificanceKeywords = {
      'quest': 0.3,
      'mission': 0.3,
      'betray': 0.4,
      'trust': 0.25,
      'secret': 0.3,
      'help': 0.2,
      'danger': 0.25,
      'important': 0.2
    };

    const mediumSignificanceKeywords = {
      'friend': 0.15,
      'enemy': 0.2,
      'faction': 0.15,
      'war': 0.2,
      'gift': 0.15,
      'favor': 0.15
    };

    const combined = (playerMessage + ' ' + npcResponse).toLowerCase();
    
    // Check high significance keywords
    for (const [keyword, weight] of Object.entries(highSignificanceKeywords)) {
      if (combined.includes(keyword)) {
        significance += weight;
      }
    }
    
    // Check medium significance keywords (only if not already high)
    if (significance < 0.5) {
      for (const [keyword, weight] of Object.entries(mediumSignificanceKeywords)) {
        if (combined.includes(keyword)) {
          significance += weight;
        }
      }
    }

    // Phase 3: Boost significance based on NPC emotional state
    if (npc && npc.emotionalState) {
      const intensity = npc.emotionalState.emotionIntensity || 0;
      if (intensity > 0.7) {
        significance += 0.2; // High emotional intensity = more memorable
      } else if (intensity > 0.5) {
        significance += 0.1;
      }
    }

    // Phase 3: Boost significance for quest-related conversations
    if (combined.includes('quest') || combined.includes('mission') || combined.includes('work')) {
      significance += 0.15;
    }

    return Math.min(1.0, significance);
  }

  /**
   * Get all relevant memories for dialogue generation
   * @param {Object} npc - NPC instance
   * @param {string} characterId - Player character ID
   * @returns {string} Combined memory context
   */
  getMemoryContext(npc, characterId) {
    const episodic = this.getMemorySummary(npc, characterId);
    const semantic = this.getPlayerKnowledgeSummary(npc, characterId);

    const parts = [];
    if (episodic) parts.push(episodic);
    if (semantic) parts.push(semantic);

    return parts.join(' ');
  }
  
  /**
   * Phase 4: Get relevant memories based on current conversation context
   * @param {Object} npc - NPC instance
   * @param {string} characterId - Player character ID
   * @param {Object} context - Current conversation context (topics, quest context, etc.)
   * @returns {Array} Array of relevant memory episodes
   */
  getRelevantMemories(npc, characterId, context = {}) {
    if (!npc.memory || !npc.memory.episodes) {
      return [];
    }
    
    // Get significant memories
    let memories = this.getSignificantMemories(npc, characterId, 5); // Get more for filtering
    
    // Filter by context relevance
    if (context && Object.keys(context).length > 0) {
      memories = memories.filter(memory => {
        // Check if memory is relevant to current topics
        if (context.currentTopics && context.currentTopics.length > 0) {
          const memoryTopics = memory.eventData?.topics || [];
          const hasMatchingTopic = context.currentTopics.some(topic => 
            memoryTopics.includes(topic)
          );
          if (hasMatchingTopic) {
            return true; // Relevant to current topics
          }
        }
        
        // Check if memory is relevant to current quest
        if (context.questContext && context.questContext.questId) {
          const memoryQuestId = memory.eventData?.questId;
          if (memoryQuestId === context.questContext.questId) {
            return true; // Relevant to current quest
          }
        }
        
        // Check if memory event type matches context
        if (context.questState === 'completed' && memory.eventType === 'quest_completed') {
          return true;
        }
        if (context.questState === 'abandoned' && memory.eventType === 'quest_abandoned') {
          return true;
        }
        
        // Default: include if high significance
        return (memory.significance || 0) > 0.6;
      });
    }
    
    // Return top 3 most relevant
    return memories.slice(0, 3);
  }

  /**
   * Clear old memories (keep only recent)
   * @param {Object} npc - NPC instance
   * @param {number} daysToKeep - Number of days of memories to keep
   */
  clearOldMemories(npc, daysToKeep = 30) {
    if (!npc.memory || !npc.memory.episodes) {
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    npc.memory.episodes = npc.memory.episodes.filter(episode => {
      const episodeDate = new Date(episode.timestamp);
      return episodeDate > cutoffDate;
    });
  }
}

module.exports = new MemoryService();

