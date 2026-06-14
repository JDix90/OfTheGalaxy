/**
 * AI Dialogue Service
 * Handles AI-powered dialogue generation using OpenAI API
 * Phase 1: Enhanced with personality, faction, emotion, and memory systems
 * 
 * SETUP INSTRUCTIONS:
 * 1. Add your OpenAI API key to backend/.env:
 *    OPENAI_API_KEY=your_api_key_here
 * 2. Install OpenAI package: npm install openai
 * 3. The service will automatically use AI when API key is configured
 */

const personalityService = require('./personalityService');
const factionService = require('./factionService');
const emotionalStateService = require('./emotionalStateService');
const memoryService = require('./memoryService');
const motivationService = require('./motivationService');
const trustService = require('./trustService');

class AIDialogueService {
  constructor() {
    this.openai = null;
    this.isConfigured = false;
    this.initialize();
  }

  /**
   * Initialize OpenAI client if API key is available
   */
  initialize() {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey && apiKey.trim() !== '' && apiKey !== 'your_openai_api_key_here') {
        // Dynamically import OpenAI (will be installed by user)
        const { OpenAI } = require('openai');
        this.openai = new OpenAI({
          apiKey: apiKey
        });
        this.isConfigured = true;
        console.log('[AI Dialogue] ✅ OpenAI service initialized successfully');
      } else {
        if (apiKey === 'your_openai_api_key_here') {
          console.log('[AI Dialogue] ⚠️  OpenAI API key is still set to placeholder. Please add your real API key to backend/.env');
        } else {
          console.log('[AI Dialogue] ⚠️  OpenAI API key not found. AI fallback disabled.');
        }
        this.isConfigured = false;
      }
    } catch (error) {
      console.warn('[AI Dialogue] ❌ OpenAI package not installed or API key invalid:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Sanitize untrusted player input before it is placed in an LLM prompt.
   * Defends against prompt injection (instruction smuggling via newlines / role
   * markers) and runaway token cost (length cap). Returns '' for unusable input.
   * @param {*} message - raw player-supplied text
   * @returns {string}
   */
  sanitizePlayerMessage(message) {
    if (typeof message !== 'string') return '';
    let clean = message
      .replace(/[\x00-\x1F\x7F]/g, ' ') // strip control chars (incl. newlines/tabs)
      .replace(/\s+/g, ' ')                     // collapse whitespace -> single space
      .trim();
    // Hard length cap to bound prompt size / cost.
    if (clean.length > AIDialogueService.MAX_PLAYER_MESSAGE_LENGTH) {
      clean = clean.slice(0, AIDialogueService.MAX_PLAYER_MESSAGE_LENGTH);
    }
    return clean;
  }

  /**
   * Generate AI response for custom questions
   * @param {Object} npc - NPC model instance
   * @param {Object} relationship - NPCRelationship instance
   * @param {Object} character - PlayerCharacter instance
   * @param {string} playerMessage - Player's message
   * @param {Object} context - Additional context (planet, conversation history, etc.)
   * @returns {Promise<string|null>} AI-generated response or null if not available
   */
  async generateResponse(npc, relationship, character, playerMessage, context = {}) {
    // Only use AI if configured and for custom questions
    if (!this.isConfigured) {
      console.log(`[AI Dialogue] Service not configured, returning null`);
      return null;
    }

    // Sanitize untrusted player input before it can reach the model.
    playerMessage = this.sanitizePlayerMessage(playerMessage);
    if (!playerMessage) {
      return null; // nothing usable to respond to
    }

    // Rate limiting: Check if we should use AI (max 10 calls per conversation)
    // Increased limit since AI is now primary method
    const conversationId = `${npc.id}_${character.id}`;
    const callCount = this.getAICallCount(conversationId);
    if (callCount >= 10) {
      console.log(`[AI Dialogue] ⚠️  Rate limit reached for conversation ${conversationId} (${callCount} calls)`);
      return null;
    }

    console.log(`[AI Dialogue] Generating response for NPC ${npc.name} (${npc.id}), call #${callCount + 1}`);
    try {
      // Build conversation history
      const conversationHistory = context.conversationHistory || [];
      
      // Check for active quest from this NPC to include in context
      const { Quest, QuestProgress } = require('../models');
      try {
        const activeQuestProgress = await QuestProgress.findOne({
          where: {
            characterId: character.id,
            status: 'active'
          },
          include: [{
            model: Quest,
            where: {
              questGiverId: npc.id,
              questType: 'mini'
            },
            required: false
          }]
        });
        
        if (activeQuestProgress && activeQuestProgress.quest) {
          context.activeQuest = activeQuestProgress.quest;
        }
      } catch (error) {
        // Ignore quest lookup errors - not critical
        console.log(`[AI Dialogue] Could not check for active quest: ${error.message}`);
      }
      
      const messages = this.buildConversationMessages(
        npc,
        relationship,
        character,
        playerMessage,
        conversationHistory,
        context
      );

      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Using mini for cost efficiency
        messages: messages,
        max_tokens: 150, // Keep responses concise
        temperature: 0.7, // Balance creativity and consistency
        presence_penalty: 0.3, // Encourage variety
      });

      const aiResponse = completion.choices[0]?.message?.content?.trim();
      
      if (aiResponse) {
        // Track AI call
        this.incrementAICallCount(conversationId);
        
        // Cache common responses (include NPC ID to prevent cross-NPC sharing)
        this.cacheResponse(npc.id, playerMessage.toLowerCase(), aiResponse);
        
        return aiResponse;
      }

      return null;
    } catch (error) {
      console.error('[AI Dialogue] Error generating AI response:', error);
      // Don't throw - gracefully fall back to templates
      return null;
    }
  }

  /**
   * Build conversation messages for OpenAI API
   */
  buildConversationMessages(npc, relationship, character, playerMessage, conversationHistory, context) {
    const messages = [];

    // System prompt
    const systemPrompt = this.buildSystemPrompt(npc, relationship, character, context);
    messages.push({
      role: 'system',
      content: systemPrompt
    });

    // Add recent conversation history (last 5 messages)
    const recentHistory = conversationHistory.slice(-5);
    for (const msg of recentHistory) {
      if (msg.sender === 'player') {
        messages.push({
          role: 'user',
          content: msg.text
        });
      } else if (msg.sender === 'npc') {
        messages.push({
          role: 'assistant',
          content: msg.text
        });
      }
    }

    // Add current player message (defensively sanitized in case this is called
    // from a path other than generateResponse).
    messages.push({
      role: 'user',
      content: this.sanitizePlayerMessage(playerMessage)
    });

    return messages;
  }

  /**
   * Build system prompt for OpenAI
   * Phase 1: Enhanced with personality, faction, emotion, and memory
   */
  buildSystemPrompt(npc, relationship, character, context) {
    const relationshipTier = relationship.getRelationshipTier();
    const relationshipLevel = relationship.relationshipLevel || 0;
    const planet = context.planet;
    const factionName = this.getFactionDisplayName(npc.factionId);

    let prompt = `You are ${npc.name}, a ${npc.species} ${npc.occupation || 'citizen'}`;
    
    if (planet) {
      prompt += ` on ${planet.name}`;
    }
    
    if (npc.factionId) {
      prompt += `, affiliated with the ${factionName}`;
    }
    
    prompt += `.\n\n`;

    // Phase 1: Enhanced Personality Profile
    personalityService.migrateLegacyTraits(npc);
    const personalityDesc = personalityService.getPersonalityDescription(npc);
    const speakingStyle = personalityService.getSpeakingStyle(npc);
    if (personalityDesc) {
      prompt += `${personalityDesc} `;
    }
    if (speakingStyle) {
      prompt += `${speakingStyle} `;
    }

    // Phase 1: Faction-Driven Dialogue
    if (npc.factionId) {
      const factionContext = factionService.getDialogueContext(npc.factionId, relationshipTier);
      if (factionContext) {
        prompt += `\n${factionContext}\n`;
      }
    }

    // Phase 1: Emotional State
    const emotionalCues = emotionalStateService.getEmotionalCues(npc);
    if (emotionalCues) {
      prompt += `\n${emotionalCues}\n`;
    }

    // Phase 1: Memory System
    // Phase 4: Enhanced Memory Integration
    // Extract conversation context (passed as { context: conversationContext })
    const conversationContext = context.context || context;
    
    // Get relevant memories based on conversation context
    let relevantMemories = [];
    if (conversationContext?.relevantMemories && conversationContext.relevantMemories.length > 0) {
      relevantMemories = conversationContext.relevantMemories;
    } else {
      // Fallback: Get significant memories if context memories not available
      relevantMemories = memoryService.getRelevantMemories(npc, character.id, conversationContext) ||
                        memoryService.getSignificantMemories(npc, character.id, 3) || [];
    }
    
    // Format memories for prompt
    if (relevantMemories.length > 0) {
      const memoryDescriptions = relevantMemories.map(memory => {
        return memoryService.formatMemoryForDialogue(memory);
      });
      
      prompt += `\n\nMEMORY CONTEXT:\n`;
      prompt += `You remember these important moments with the player:\n`;
      memoryDescriptions.forEach((desc, index) => {
        prompt += `${index + 1}. ${desc}\n`;
      });
      prompt += `\nReference these memories naturally when relevant to the conversation. `;
      prompt += `If the player asks about something you remember, acknowledge it. `;
      prompt += `Use these memories to make the conversation feel personal and connected to your past interactions.\n`;
    } else {
      // Fallback to general memory context if no relevant memories
      const memoryContext = memoryService.getMemoryContext(npc, character.id);
      if (memoryContext) {
        prompt += `\n${memoryContext}\n`;
      }
    }
    
    // Phase 4: Player Knowledge Summary
    const playerKnowledge = memoryService.getPlayerKnowledgeSummary(npc, character.id);
    if (playerKnowledge) {
      prompt += `\n${playerKnowledge}\n`;
    }

    // Phase 2: Motivation System
    const motivationPrompt = motivationService.buildMotivationPrompt(npc);
    if (motivationPrompt) {
      prompt += motivationPrompt;
    }
    
    // Phase 2: Help offer acceptance instructions
    const urgentNeeds = motivationService.getUrgentNeeds(npc);
    if (urgentNeeds.length > 0) {
      prompt += `\n\nIMPORTANT: You have urgent needs. If the player offers to help (says "I can help", "I'll help", "let me help", "perhaps I can assist", etc.), you MUST accept their help gratefully and provide them with a way to help you. Do NOT reject help offers when you have urgent needs.`;
    }
    
    // Phase 2: Topic Continuation System
    // Use conversationContext already declared above
    if (conversationContext && conversationContext.topicContinuation && conversationContext.topicContinuation.canContinue) {
      const topicCont = conversationContext.topicContinuation;
      prompt += `\n\nTOPIC CONTINUATION: The player is continuing a previous conversation about "${topicCont.topic}". `;
      prompt += `You previously discussed this topic ${topicCont.mentionCount} time(s). `;
      if (topicCont.lastMessage && topicCont.lastMessage.text) {
        const lastMsgText = topicCont.lastMessage.text.substring(0, 100);
        prompt += `In your last message about this topic, you said: "${lastMsgText}". `;
      }
      prompt += `Continue the conversation naturally, referencing what was discussed before. Build upon previous information rather than repeating it.`;
    }
    
    // Phase 2: Active Topics Context
    if (conversationContext && conversationContext.activeTopics && conversationContext.activeTopics.length > 0) {
      const recentTopics = conversationContext.activeTopics.slice(0, 3).map(t => t.topic).join(', ');
      prompt += `\n\nRECENT TOPICS: You've recently discussed: ${recentTopics}. The player may reference these topics.`;
    }

    // Phase 2: Trust System
    const trustPrompt = trustService.buildTrustPrompt(npc);
    if (trustPrompt) {
      prompt += trustPrompt;
    }

    // Phase 3: Contextual Awareness
    if (context.context) {
      const contextService = require('./contextService');
      const contextPrompt = contextService.buildContextPrompt(context.context);
      if (contextPrompt) {
        prompt += `\n${contextPrompt}`;
      }
    }

    // Phase 3: Comprehensive Quest Context Integration
    const questContext = conversationContext?.questContext;
    const questState = conversationContext?.questState || 'none';
    
    if (questContext && questState !== 'none') {
      const quest = questContext;
      
      // Quest State: Active
      if (questState === 'active' && quest.state === 'active') {
        prompt += `\n\nACTIVE QUEST CONTEXT:\n`;
        prompt += `- The player has an active quest from you: "${quest.questTitle}"\n`;
        if (quest.questDescription) {
          prompt += `- Description: ${quest.questDescription}\n`;
        }
        
        // Quest Progress Information
        if (quest.progressPercent !== undefined) {
          prompt += `- Progress: ${quest.progressPercent}% complete (${quest.completedObjectives || 0}/${quest.totalObjectives || 0} objectives)\n`;
        }
        
        // Objective Details
        if (quest.objectives && quest.objectives.length > 0) {
          const incompleteObjectives = quest.objectives.filter(obj => !quest.progress?.[obj.id]);
          const completedObjectives = quest.objectives.filter(obj => quest.progress?.[obj.id] === true);
          
          if (completedObjectives.length > 0) {
            prompt += `- Completed objectives: ${completedObjectives.map(o => o.description || o.id).join(', ')}\n`;
          }
          
          if (incompleteObjectives.length > 0) {
            prompt += `- Remaining objectives: ${incompleteObjectives.map(o => o.description || o.id).join(', ')}\n`;
          }
        }
        
        // Dialogue Guidance Based on Progress
        if (quest.progressPercent === 0) {
          prompt += `- The player just accepted this quest. Be encouraging and offer any helpful hints if they ask.\n`;
        } else if (quest.progressPercent < 50) {
          prompt += `- The player is making progress on this quest. Acknowledge their progress and offer encouragement or hints if appropriate.\n`;
        } else if (quest.progressPercent < 100) {
          prompt += `- The player is well into this quest. They're close to completion. Offer encouragement and be ready to help them finish.\n`;
        } else {
          prompt += `- The player has completed all objectives! They should return to you to turn in the quest. Remind them if they ask about the quest.\n`;
        }
        
        // Recent Quest Actions
        if (quest.recentActions && quest.recentActions.length > 0) {
          const lastAction = quest.recentActions[quest.recentActions.length - 1];
          if (lastAction.action === 'objective_completed') {
            prompt += `- The player recently completed an objective. Acknowledge their progress and encourage them to continue.\n`;
          }
        }
        
        prompt += `- When the player asks about the quest, their progress, or needs help, provide relevant information naturally.\n`;
        prompt += `- If the player asks "how is the quest going?" or similar, reference their actual progress.\n`;
      }
      
      // Quest State: Completed
      else if (questState === 'completed' && quest.wasCompleted) {
        prompt += `\n\nQUEST COMPLETION CONTEXT:\n`;
        prompt += `- The player recently completed your quest: "${quest.questTitle}"\n`;
        if (quest.completedAt) {
          const completedDate = new Date(quest.completedAt);
          const hoursAgo = Math.floor((Date.now() - completedDate.getTime()) / (1000 * 60 * 60));
          if (hoursAgo < 1) {
            prompt += `- They completed it very recently (within the last hour). Thank them warmly and express genuine appreciation.\n`;
          } else if (hoursAgo < 24) {
            prompt += `- They completed it earlier today. Thank them and acknowledge their help.\n`;
          }
        }
        prompt += `- Be grateful and positive. You may offer them another quest if appropriate, but don't be pushy.\n`;
        prompt += `- If they ask about rewards or what's next, provide helpful information.\n`;
      }
      
      // Quest State: Abandoned
      else if (questState === 'abandoned' && quest.wasAbandoned) {
        prompt += `\n\nQUEST ABANDONMENT CONTEXT:\n`;
        prompt += `- The player recently abandoned your quest: "${quest.questTitle}"\n`;
        prompt += `- Your reaction should depend on your relationship level:\n`;
        prompt += `  * If relationship is high (60+): Be understanding but slightly disappointed. "I understand, but I was counting on you."\n`;
        prompt += `  * If relationship is medium (30-59): Express disappointment. "That's unfortunate. I really needed that help."\n`;
        prompt += `  * If relationship is low (0-29): Be more direct. "I see. Well, that's disappointing."\n`;
        prompt += `- Don't be overly harsh, but show that their abandonment mattered to you.\n`;
        prompt += `- You may offer the quest again if they seem interested, but don't be pushy.\n`;
      }
      
      // Quest State: Offered (not yet accepted)
      else if (questState === 'offered' || (quest.state === 'offered')) {
        prompt += `\n\nQUEST OFFER CONTEXT:\n`;
        prompt += `- You recently offered the player a quest: "${quest.questTitle}"\n`;
        if (quest.questDescription) {
          prompt += `- Description: ${quest.questDescription}\n`;
        }
        if (quest.objectives && quest.objectives.length > 0) {
          prompt += `- Objectives: ${quest.objectives.map(o => o.description || o.id).join(', ')}\n`;
        }
        prompt += `- The player hasn't accepted it yet. If they show interest or ask about it, provide more details.\n`;
        prompt += `- If they ask "tell me more" or express interest, explain the quest objectives and what you need.\n`;
        prompt += `- Don't be pushy, but be clear about what help you need.\n`;
      }
    }
    
    // Fallback: Check conversation history for recent quest mentions (if no structured quest context)
    if (!questContext || questState === 'none') {
      const conversationHistory = context.conversationHistory || [];
      const recentMessages = conversationHistory.slice(-3);
      for (const msg of recentMessages) {
        if (msg.sender === 'npc') {
          const npcText = (msg.text || '').toLowerCase();
          const questKeywords = ['job', 'work', 'quest', 'shipment', 'delivery', 'task', 'mission', 'need you to', 'can you handle'];
          if (questKeywords.some(keyword => npcText.includes(keyword))) {
            prompt += `\n\nIMPORTANT: In your last message, you mentioned a job, work, or quest opportunity. If the player asks for more information, shows interest, or says "tell me more", you MUST continue discussing that specific opportunity. Do NOT change the topic to general planet information.\n`;
            break;
          }
        }
      }
    }

    // Relationship context (enhanced with faction modifiers)
    prompt += `\nYour relationship with the player is: ${relationshipTier} (${relationshipLevel}/100). `;
    if (npc.factionId) {
      const modifiers = factionService.getRelationshipModifiers(npc.factionId, relationshipTier);
      if (modifiers.trustBonus > 10) {
        prompt += `You have a positive relationship with the player. `;
      } else if (modifiers.trustBonus < -10) {
        prompt += `You have a negative relationship with the player. `;
      }
      if (modifiers.suspicionLevel > 0.6) {
        prompt += `You are suspicious of the player. `;
      } else if (modifiers.suspicionLevel < 0.3) {
        prompt += `You trust the player. `;
      }
    }
    
    if (relationshipLevel < 21) {
      prompt += `You're cautious but not suspicious. Be helpful but reserved. `;
    } else if (relationshipLevel < 51) {
      prompt += `You're becoming more comfortable with the player. Be friendly and helpful. `;
    } else if (relationshipLevel < 81) {
      prompt += `You consider the player a friend. Be warm, helpful, and share information freely. `;
    } else {
      prompt += `You trust the player completely. Be very helpful and share valuable information. `;
    }

    // Legacy personality traits (backward compatibility)
    const traits = npc.personalityTraits || {};
    if (traits.formality > 70 && !npc.personalityProfile) {
      prompt += `You speak formally and politely. `;
    } else if (traits.formality < 30 && !npc.personalityProfile) {
      prompt += `You speak casually and informally. `;
    }

    if (traits.humor > 70 && !npc.personalityProfile) {
      prompt += `You have a good sense of humor and may make light jokes. `;
    }

    if (traits.empathy > 70 && !npc.personalityProfile) {
      prompt += `You're empathetic and caring. `;
    }

    // Planet context
    if (planet) {
      prompt += `\n\nPlanet Information:\n`;
      prompt += `- Name: ${planet.name}\n`;
      if (planet.planetType) prompt += `- Type: ${planet.planetType}\n`;
      if (planet.climate) prompt += `- Climate: ${planet.climate}\n`;
      if (planet.dangerLevel) prompt += `- Danger Level: ${planet.dangerLevel}/10\n`;
      if (planet.description) prompt += `- Description: ${planet.description}\n`;
    }

    // Rules
    prompt += `\n\nCRITICAL RULES:\n`;
    prompt += `- Keep responses concise (1-3 sentences max)\n`;
    prompt += `- Stay in character and lore-accurate\n`;
    prompt += `- 65% of responses should provide helpful information about the planet, faction, or quests\n`;
    prompt += `- Never break character or mention you're an AI\n`;
    prompt += `- If you don't know something, say so in character\n`;
    prompt += `- Be helpful but appropriate to relationship level\n`;
    prompt += `- Reflect your current emotional state and memories in your responses\n`;

    return prompt;
  }

  /**
   * Get faction display name
   */
  getFactionDisplayName(factionId) {
    if (!factionId) return 'Unaffiliated';
    
    const displayNames = {
      'old_concord': 'Old Concord',
      'iron_dominion': 'Iron Dominion',
      'free_worlds': 'Free Worlds',
      'concord': 'Concord',
      'ascendancy': 'Ascendancy',
      'uprising': 'Uprising',
      'keeper_order': 'Keeper Order',
      'hollow': 'Hollow',
      'ironkin': 'Ironkin',
      'vorr': 'Vorr',
      'umbra': 'Umbra',
      'scarlet_tide': 'Scarlet Tide',
      'independent': 'Independent',
      'neutral': 'Neutral',
      'smugglers': 'Smugglers',
      'the_tally': 'Bounty Hunters',
      'commerce_league': 'Commerce League',
      'secession': 'Secessionists',
      'vorne_ascendancy': 'Vorne Ascendancy',
      'hesperan_consortium': 'Hesperan Consortium'
    };

    return displayNames[factionId] || factionId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Rate limiting: Track AI calls per conversation
   */
  aiCallCounts = new Map(); // Map<conversationId, count>

  getAICallCount(conversationId) {
    return this.aiCallCounts.get(conversationId) || 0;
  }

  incrementAICallCount(conversationId) {
    const current = this.getAICallCount(conversationId);
    this.aiCallCounts.set(conversationId, current + 1);
  }

  /**
   * Response caching for common questions
   */
  responseCache = new Map(); // Map<npcId_message, response>

  cacheResponse(npcId, message, response) {
    // Cache for 1 hour (in a production system, use Redis or similar)
    // Include NPC ID in cache key to prevent cross-NPC response sharing
    const cacheKey = `${npcId}_${message.toLowerCase()}`;
    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
  }

  getCachedResponse(npcId, message) {
    // Include NPC ID in cache key to prevent cross-NPC response sharing
    const cacheKey = `${npcId}_${message.toLowerCase()}`;
    const cached = this.responseCache.get(cacheKey);
    if (cached) {
      // Check if cache is still valid (1 hour)
      const age = Date.now() - cached.timestamp;
      if (age < 3600000) { // 1 hour in milliseconds
        return cached.response;
      } else {
        this.responseCache.delete(cacheKey);
      }
    }
    return null;
  }

  /**
   * Check if AI service is available
   */
  isAvailable() {
    return this.isConfigured;
  }
}

// Max characters of player-supplied text allowed into an LLM prompt (cost / injection guard).
AIDialogueService.MAX_PLAYER_MESSAGE_LENGTH = 500;

module.exports = new AIDialogueService();

