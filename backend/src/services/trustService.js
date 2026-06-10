/**
 * Trust Service
 * Handles NPC trust system separate from relationship level
 * Phase 2: Trust System
 */

class TrustService {
  /**
   * Initialize trust system for new NPC
   * @param {Object} npc - NPC instance
   * @param {Object} relationship - Initial relationship (if exists)
   * @param {Function} randomFn - Optional random function for variation
   * @returns {Object} Trust system
   */
  initializeTrust(npc, relationship = null, randomFn = null) {
    const rnd = randomFn || (() => Math.random());
    
    // Base trust from relationship, but with significant variation
    let baseTrust = 50;
    if (relationship && relationship.relationshipLevel) {
      baseTrust = Math.min(50, relationship.relationshipLevel);
    }
    
    // Add significant randomization (20-80 range for new NPCs)
    // This creates diverse trust levels: suspicious (20-40), neutral (40-60), trusting (60-80)
    const trustLevel = this.clamp(0, 100, baseTrust + (rnd() - 0.5) * 60);
    
    // Randomize trust thresholds for each NPC
    // Share secret: 50-75 (some NPCs are more secretive)
    const shareSecretThreshold = 50 + Math.floor(rnd() * 26);
    
    // Request favor: 30-60 (some NPCs are more willing to ask for help)
    const requestFavorThreshold = 30 + Math.floor(rnd() * 31);
    
    // Reveal weakness: 60-85 (most NPCs are guarded about weaknesses)
    const revealWeaknessThreshold = 60 + Math.floor(rnd() * 26);
    
    const trust = {
      trustLevel: trustLevel,
      trustFactors: {
        questsCompleted: 0,
        questsFailed: 0,
        helpProvided: 0,
        harmCaused: 0
      },
      thresholds: {
        shareSecret: shareSecretThreshold,
        requestFavor: requestFavorThreshold,
        revealWeakness: revealWeaknessThreshold
      },
      lastInteraction: new Date().toISOString()
    };
    
    npc.trustSystem = trust;
    return trust;
  }

  /**
   * Update trust based on event
   * @param {Object} npc - NPC instance
   * @param {string} characterId - Player character ID
   * @param {Object} event - Event data
   * @returns {Promise<Object>} Updated trust system
   */
  async updateTrust(npc, characterId, event) {
    if (!npc.trustSystem) {
      this.initializeTrust(npc);
    }
    
    const trust = npc.trustSystem;
    
    // Apply decay first
    this.applyDecay(trust);
    
    // Update based on event type
    switch(event.type) {
      case 'quest_completed':
        trust.trustLevel = Math.min(100, trust.trustLevel + 5);
        trust.trustFactors.questsCompleted++;
        break;
        
      case 'quest_failed':
      case 'quest_abandoned':
        trust.trustLevel = Math.max(0, trust.trustLevel - 10);
        trust.trustFactors.questsFailed++;
        break;
        
      case 'player_helped':
        trust.trustLevel = Math.min(100, trust.trustLevel + 3);
        trust.trustFactors.helpProvided++;
        break;
        
      case 'player_harmed':
      case 'player_attacked':
        trust.trustLevel = Math.max(0, trust.trustLevel - 15);
        trust.trustFactors.harmCaused++;
        break;
        
      case 'player_betrayed':
        trust.trustLevel = Math.max(0, trust.trustLevel - 25);
        trust.trustFactors.harmCaused += 2;
        break;
        
      case 'secret_shared':
        // NPC shared a secret, trust increases slightly
        trust.trustLevel = Math.min(100, trust.trustLevel + 2);
        break;
        
      case 'secret_betrayed':
        // Player revealed NPC's secret
        trust.trustLevel = Math.max(0, trust.trustLevel - 20);
        trust.trustFactors.harmCaused++;
        break;
        
      case 'gift_given':
        // Player gave NPC a gift
        trust.trustLevel = Math.min(100, trust.trustLevel + 1);
        break;
        
      case 'insult':
        // Player insulted NPC
        trust.trustLevel = Math.max(0, trust.trustLevel - 5);
        break;
        
      case 'positive_conversation':
        // Long positive conversation
        trust.trustLevel = Math.min(100, trust.trustLevel + 1);
        break;
    }
    
    // Update timestamp
    trust.lastInteraction = new Date().toISOString();
    
    npc.trustSystem = trust;
    await npc.save();
    
    return trust;
  }

  /**
   * Apply trust decay over time
   * @param {Object} trust - Trust system object
   */
  applyDecay(trust) {
    if (!trust.lastInteraction) {
      trust.lastInteraction = new Date().toISOString();
      return;
    }
    
    const daysSinceInteraction = (Date.now() - new Date(trust.lastInteraction)) / (1000 * 60 * 60 * 24);
    
    // Trust decays 1 point per week of no interaction
    if (daysSinceInteraction > 7) {
      const weeks = Math.floor(daysSinceInteraction / 7);
      trust.trustLevel = Math.max(0, trust.trustLevel - weeks);
    }
  }

  /**
   * Check if trust level meets threshold
   * @param {Object} npc - NPC instance
   * @param {string} thresholdName - Threshold name
   * @returns {boolean} True if threshold met
   */
  meetsThreshold(npc, thresholdName) {
    // If trust system doesn't exist, initialize it with randomization
    if (!npc.trustSystem) {
      npc.trustSystem = this.initializeTrust(npc, null, () => Math.random());
    }
    const trust = npc.trustSystem;
    const threshold = trust.thresholds?.[thresholdName] || 50;
    return trust.trustLevel >= threshold;
  }

  /**
   * Get trust level
   * @param {Object} npc - NPC instance
   * @returns {number} Trust level (0-100)
   */
  getTrustLevel(npc) {
    return npc.trustSystem?.trustLevel || 50;
  }

  /**
   * Get trust tier description
   * @param {Object} npc - NPC instance
   * @returns {string} Trust tier
   */
  getTrustTier(npc) {
    const trustLevel = this.getTrustLevel(npc);
    
    if (trustLevel < 20) return 'distrustful';
    if (trustLevel < 40) return 'cautious';
    if (trustLevel < 60) return 'neutral';
    if (trustLevel < 80) return 'trusting';
    return 'very_trusting';
  }

  /**
   * Build trust prompt for AI
   * @param {Object} npc - NPC instance
   * @returns {string} Trust prompt
   */
  buildTrustPrompt(npc) {
    // If trust system doesn't exist, initialize it with randomization
    if (!npc.trustSystem) {
      npc.trustSystem = this.initializeTrust(npc, null, () => Math.random());
    }
    const trust = npc.trustSystem;
    const trustLevel = trust.trustLevel;
    
    let prompt = `\n\nTRUST LEVEL: ${Math.round(trustLevel)}/100\n`;
    
    if (trustLevel < 20) {
      prompt += "- You DON'T trust them at all. Be guarded and reveal nothing important.\n";
      prompt += "- Refuse to help unless forced or there's clear benefit to you.\n";
      prompt += "- Be suspicious of their motives.\n";
    } else if (trustLevel < 40) {
      prompt += "- You're CAUTIOUS. Share basic information but nothing sensitive.\n";
      prompt += "- Don't share secrets or ask for significant favors.\n";
      prompt += "- Keep conversations brief and professional.\n";
    } else if (trustLevel < 60) {
      prompt += "- You trust them SOMEWHAT. Share useful information but keep some secrets.\n";
      prompt += "- You might ask for small favors.\n";
      prompt += "- Be friendly but not overly open.\n";
    } else if (trustLevel < 80) {
      prompt += "- You trust them SIGNIFICANTLY. Share secrets and ask for help.\n";
      prompt += "- You're comfortable discussing personal matters.\n";
      prompt += "- You would help them if they asked.\n";
    } else {
      prompt += "- You trust them COMPLETELY. Share everything, including vulnerabilities.\n";
      prompt += "- You would ask them for major favors.\n";
      prompt += "- You consider them a true friend.\n";
    }
    
    // Add trust-gated information hints
    if (this.meetsThreshold(npc, 'shareSecret')) {
      const goal = npc.motivations?.primaryGoal;
      if (goal) {
        prompt += `\n- You trust them enough to share secrets about: ${goal.description}\n`;
      }
    }
    
    if (this.meetsThreshold(npc, 'requestFavor')) {
      prompt += `\n- You trust them enough to ask for favors if needed.\n`;
    }
    
    if (this.meetsThreshold(npc, 'revealWeakness')) {
      const fears = npc.motivations?.fears || [];
      if (fears.length > 0) {
        prompt += `\n- You trust them enough to discuss your fears: ${fears[0].replace(/_/g, ' ')}\n`;
      }
    }
    
    return prompt;
  }

  /**
   * Get trust summary for dialogue
   * @param {Object} npc - NPC instance
   * @returns {string} Trust summary
   */
  getTrustSummary(npc) {
    const trustLevel = this.getTrustLevel(npc);
    const tier = this.getTrustTier(npc);
    return `${tier} (${Math.round(trustLevel)}/100)`;
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
   * Get default trust system
   * @returns {Object} Default trust
   */
  getDefaultTrust(randomFn = null) {
    const rnd = randomFn || (() => Math.random());
    
    // Randomize trust level (20-80 range for diversity)
    const trustLevel = 20 + Math.floor(rnd() * 61);
    
    // Randomize trust thresholds for each NPC
    // Share secret: 50-75 (some NPCs are more secretive)
    const shareSecretThreshold = 50 + Math.floor(rnd() * 26);
    
    // Request favor: 30-60 (some NPCs are more willing to ask for help)
    const requestFavorThreshold = 30 + Math.floor(rnd() * 31);
    
    // Reveal weakness: 60-85 (most NPCs are guarded about weaknesses)
    const revealWeaknessThreshold = 60 + Math.floor(rnd() * 26);
    
    return {
      trustLevel: trustLevel,
      trustFactors: {
        questsCompleted: 0,
        questsFailed: 0,
        helpProvided: 0,
        harmCaused: 0
      },
      thresholds: {
        shareSecret: shareSecretThreshold,
        requestFavor: requestFavorThreshold,
        revealWeakness: revealWeaknessThreshold
      },
      lastInteraction: new Date().toISOString()
    };
  }
}

module.exports = new TrustService();

