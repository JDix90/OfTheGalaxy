/**
 * Emotional State Service
 * Handles NPC emotional states, decay, and event triggers
 * Phase 1: Basic Emotional State
 */

class EmotionalStateService {
  /**
   * Initialize emotional state for an NPC
   * @param {Object} npc - NPC instance
   * @param {Function} randomFn - Optional random function for variation
   * @returns {Object} Initialized emotional state
   */
  initializeEmotionalState(npc, randomFn = null) {
    const rnd = randomFn || (() => Math.random());
    
    // Randomize initial emotional state for variety
    const possibleEmotions = ['neutral', 'happy', 'satisfied', 'content', 'curious', 'cautious'];
    const randomEmotion = possibleEmotions[Math.floor(rnd() * possibleEmotions.length)];
    
    // Randomize intensity (0.2 to 0.5 for initial state)
    const randomIntensity = 0.2 + (rnd() * 0.3);
    
    // Randomize decay rate (0.05 to 0.15)
    const randomDecayRate = 0.05 + (rnd() * 0.1);
    
    return {
      primaryEmotion: randomEmotion,
      emotionIntensity: randomIntensity,
      lastUpdated: new Date().toISOString(),
      decayRate: randomDecayRate,
      positiveTriggers: ['quest_completed', 'player_helped', 'faction_success'],
      negativeTriggers: ['player_betrayed', 'faction_attacked', 'loss'],
      recentEvents: []
    };
  }

  /**
   * Update emotional state based on an event
   * @param {Object} npc - NPC instance
   * @param {string} eventType - Type of event
   * @param {number} intensity - Intensity of emotional response (0-1)
   * @param {Object} context - Additional context
   */
  triggerEmotion(npc, eventType, intensity = 0.5, context = {}) {
    if (!npc.emotionalState) {
      npc.emotionalState = this.initializeEmotionalState(npc);
    }

    const state = npc.emotionalState;
    const now = new Date().toISOString();

    // Determine emotion based on event type
    let newEmotion = state.primaryEmotion;
    let emotionChange = 0;

    // Positive events
    if (state.positiveTriggers.includes(eventType)) {
      newEmotion = this.getPositiveEmotion(eventType, context);
      emotionChange = intensity;
    }
    // Negative events
    else if (state.negativeTriggers.includes(eventType)) {
      newEmotion = this.getNegativeEmotion(eventType, context);
      emotionChange = -intensity;
    }
    // Neutral or unknown events
    else {
      // Slight shift based on intensity
      if (intensity > 0.7) {
        newEmotion = 'surprised';
        emotionChange = intensity * 0.5;
      }
    }

    // Update emotional state
    state.primaryEmotion = newEmotion;
    state.emotionIntensity = this.clamp(0, 1, state.emotionIntensity + emotionChange);
    state.lastUpdated = now;

    // Record event
    state.recentEvents.push({
      type: eventType,
      emotion: newEmotion,
      intensity: emotionChange,
      timestamp: now,
      context
    });

    // Keep only last 10 events
    if (state.recentEvents.length > 10) {
      state.recentEvents = state.recentEvents.slice(-10);
    }

    return state;
  }

  /**
   * Get positive emotion based on event type
   * @param {string} eventType - Event type
   * @param {Object} context - Event context
   * @returns {string} Emotion name
   */
  getPositiveEmotion(eventType, context) {
    const emotions = {
      quest_completed: 'satisfied',
      player_helped: 'grateful',
      faction_success: 'proud',
      player_gift: 'appreciative',
      player_respect: 'honored'
    };
    return emotions[eventType] || 'happy';
  }

  /**
   * Get negative emotion based on event type
   * @param {string} eventType - Event type
   * @param {Object} context - Event context
   * @returns {string} Emotion name
   */
  getNegativeEmotion(eventType, context) {
    const emotions = {
      player_betrayed: 'betrayed',
      faction_attacked: 'angry',
      loss: 'sad',
      player_insult: 'offended',
      player_threat: 'fearful'
    };
    return emotions[eventType] || 'upset';
  }

  /**
   * Apply emotional decay over time
   * @param {Object} npc - NPC instance
   * @param {number} hoursPassed - Hours since last update
   */
  applyDecay(npc, hoursPassed = 0) {
    if (!npc.emotionalState) {
      return;
    }

    const state = npc.emotionalState;
    const decayAmount = state.decayRate * hoursPassed;

    // Decay intensity toward neutral
    if (state.primaryEmotion !== 'neutral') {
      state.emotionIntensity = Math.max(0, state.emotionIntensity - decayAmount);
      
      // If intensity is very low, return to neutral
      if (state.emotionIntensity < 0.2) {
        state.primaryEmotion = 'neutral';
        state.emotionIntensity = 0.3;
      }
    }

    state.lastUpdated = new Date().toISOString();
  }

  /**
   * Get current emotional state description for dialogue
   * @param {Object} npc - NPC instance
   * @returns {string} Emotional state description
   */
  getEmotionalDescription(npc) {
    if (!npc.emotionalState) {
      return '';
    }

    const state = npc.emotionalState;
    const emotion = state.primaryEmotion;
    const intensity = state.emotionIntensity;

    if (emotion === 'neutral' || intensity < 0.3) {
      return '';
    }

    const descriptions = {
      happy: intensity > 0.7 ? 'very happy' : 'pleased',
      satisfied: intensity > 0.7 ? 'very satisfied' : 'content',
      grateful: intensity > 0.7 ? 'deeply grateful' : 'appreciative',
      proud: intensity > 0.7 ? 'very proud' : 'satisfied',
      angry: intensity > 0.7 ? 'very angry' : 'upset',
      betrayed: intensity > 0.7 ? 'deeply betrayed' : 'hurt',
      sad: intensity > 0.7 ? 'very sad' : 'down',
      fearful: intensity > 0.7 ? 'very fearful' : 'worried',
      surprised: intensity > 0.7 ? 'very surprised' : 'taken aback',
      offended: intensity > 0.7 ? 'deeply offended' : 'slightly offended'
    };

    return descriptions[emotion] || emotion;
  }

  /**
   * Get emotional cues for dialogue prompts
   * @param {Object} npc - NPC instance
   * @returns {string} Emotional cues string
   */
  getEmotionalCues(npc) {
    const description = this.getEmotionalDescription(npc);
    if (!description) {
      return '';
    }

    const state = npc.emotionalState;
    const emotion = state.primaryEmotion;
    const intensity = state.emotionIntensity;

    let cues = `You are currently feeling ${description}. `;

    // Add behavioral cues
    if (emotion === 'angry' && intensity > 0.6) {
      cues += 'You may be short-tempered and direct. ';
    } else if (emotion === 'grateful' && intensity > 0.6) {
      cues += 'You are more helpful and friendly than usual. ';
    } else if (emotion === 'betrayed' && intensity > 0.6) {
      cues += 'You are cautious and may be less trusting. ';
    } else if (emotion === 'happy' && intensity > 0.6) {
      cues += 'You are in a good mood and more talkative. ';
    } else if (emotion === 'fearful' && intensity > 0.6) {
      cues += 'You are nervous and may be less direct. ';
    }

    return cues.trim();
  }

  /**
   * Check if NPC is in an emotional state
   * @param {Object} npc - NPC instance
   * @returns {boolean} True if emotional
   */
  isEmotional(npc) {
    if (!npc.emotionalState) {
      return false;
    }
    return npc.emotionalState.emotionIntensity > 0.5 && 
           npc.emotionalState.primaryEmotion !== 'neutral';
  }

  /**
   * Get emotion intensity level
   * @param {Object} npc - NPC instance
   * @returns {string} Intensity level (low, medium, high)
   */
  getIntensityLevel(npc) {
    if (!npc.emotionalState) {
      return 'low';
    }
    const intensity = npc.emotionalState.emotionIntensity;
    if (intensity > 0.7) return 'high';
    if (intensity > 0.4) return 'medium';
    return 'low';
  }

  /**
   * Clamp value between min and max
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {number} value - Value to clamp
   * @returns {number} Clamped value
   */
  clamp(min, max, value) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Process common game events and trigger emotions
   * @param {Object} npc - NPC instance
   * @param {string} eventType - Event type
   * @param {Object} eventData - Event data
   */
  processEvent(npc, eventType, eventData = {}) {
    // Map common game events to emotional triggers
    const eventMap = {
      'quest.completed': 'quest_completed',
      'quest.failed': 'loss',
      'player.helped': 'player_helped',
      'player.betrayed': 'player_betrayed',
      'faction.attacked': 'faction_attacked',
      'faction.success': 'faction_success',
      'player.gift': 'player_gift',
      'player.insult': 'player_insult',
      'player.threat': 'player_threat'
    };

    const triggerType = eventMap[eventType] || eventType;
    const intensity = eventData.intensity || 0.5;

    return this.triggerEmotion(npc, triggerType, intensity, eventData);
  }
}

module.exports = new EmotionalStateService();

