/**
 * Personality Service
 * Handles personality profile generation, analysis, and dialogue influence
 * Phase 1: Enhanced Personality System
 */

class PersonalityService {
  /**
   * Generate a personality profile for an NPC
   * @param {Object} npc - NPC instance or NPC data
   * @param {Function} randomFn - Optional seeded random function
   * @returns {Object} Personality profile
   */
  generatePersonalityProfile(npc = {}, randomFn = null) {
    const rnd = randomFn || (() => Math.random());
    
    // Base personality influenced by NPC type and occupation
    const baseProfile = this.getBaseProfileForType(npc.npcType, npc.occupation);
    
    // Add significant variation (±40 points for more diversity)
    const profile = {
      openness: this.clamp(0, 100, baseProfile.openness + (rnd() - 0.5) * 80),
      extraversion: this.clamp(0, 100, baseProfile.extraversion + (rnd() - 0.5) * 80),
      agreeableness: this.clamp(0, 100, baseProfile.agreeableness + (rnd() - 0.5) * 80),
      conscientiousness: this.clamp(0, 100, baseProfile.conscientiousness + (rnd() - 0.5) * 80),
      neuroticism: this.clamp(0, 100, baseProfile.neuroticism + (rnd() - 0.5) * 80),
      // Star Wars specific traits
      forceAlignment: this.clamp(0, 100, baseProfile.forceAlignment + (rnd() - 0.5) * 60),
      authorityRespect: this.clamp(0, 100, baseProfile.authorityRespect + (rnd() - 0.5) * 80),
      riskTolerance: this.clamp(0, 100, baseProfile.riskTolerance + (rnd() - 0.5) * 80),
      directness: this.clamp(0, 100, baseProfile.directness + (rnd() - 0.5) * 80),
      // Dynamic states (randomized)
      currentMood: this.clamp(0, 100, 50 + (rnd() - 0.5) * 40),
      stressLevel: this.clamp(0, 100, 30 + rnd() * 30),
      fatigueLevel: this.clamp(0, 100, 20 + rnd() * 30)
    };

    return profile;
  }

  /**
   * Get base personality profile for NPC type
   * @param {string} npcType - Type of NPC
   * @param {string} occupation - NPC occupation
   * @returns {Object} Base profile
   */
  getBaseProfileForType(npcType, occupation = '') {
    const typeProfiles = {
      quest_giver: {
        openness: 60,
        extraversion: 55,
        agreeableness: 65,
        conscientiousness: 70,
        neuroticism: 40,
        forceAlignment: 50,
        authorityRespect: 60,
        riskTolerance: 45,
        directness: 60
      },
      vendor: {
        openness: 50,
        extraversion: 70,
        agreeableness: 60,
        conscientiousness: 75,
        neuroticism: 35,
        forceAlignment: 50,
        authorityRespect: 55,
        riskTolerance: 50,
        directness: 70
      },
      companion: {
        openness: 65,
        extraversion: 60,
        agreeableness: 70,
        conscientiousness: 65,
        neuroticism: 45,
        forceAlignment: 55,
        authorityRespect: 50,
        riskTolerance: 60,
        directness: 65
      },
      faction_leader: {
        openness: 45,
        extraversion: 75,
        agreeableness: 40,
        conscientiousness: 80,
        neuroticism: 30,
        forceAlignment: 60,
        authorityRespect: 85,
        riskTolerance: 70,
        directness: 75
      },
      generic: {
        openness: 50,
        extraversion: 50,
        agreeableness: 50,
        conscientiousness: 50,
        neuroticism: 50,
        forceAlignment: 50,
        authorityRespect: 50,
        riskTolerance: 50,
        directness: 50
      }
    };

    const base = typeProfiles[npcType] || typeProfiles.generic;

    // Adjust based on occupation
    if (occupation) {
      const occupationModifiers = this.getOccupationModifiers(occupation);
      Object.keys(base).forEach(key => {
        if (occupationModifiers[key]) {
          base[key] = this.clamp(0, 100, base[key] + occupationModifiers[key]);
        }
      });
    }

    return base;
  }

  /**
   * Get personality modifiers based on occupation
   * @param {string} occupation - NPC occupation
   * @returns {Object} Modifiers
   */
  getOccupationModifiers(occupation) {
    const lowerOcc = occupation.toLowerCase();
    const modifiers = {};

    // Examples
    if (lowerOcc.includes('guard') || lowerOcc.includes('soldier')) {
      modifiers.authorityRespect = 15;
      modifiers.riskTolerance = 10;
      modifiers.conscientiousness = 10;
    } else if (lowerOcc.includes('merchant') || lowerOcc.includes('trader')) {
      modifiers.extraversion = 15;
      modifiers.riskTolerance = 10;
      modifiers.directness = 10;
    } else if (lowerOcc.includes('scholar') || lowerOcc.includes('researcher')) {
      modifiers.openness = 20;
      modifiers.conscientiousness = 10;
      modifiers.riskTolerance = -10;
    } else if (lowerOcc.includes('smuggler') || lowerOcc.includes('pirate')) {
      modifiers.riskTolerance = 20;
      modifiers.authorityRespect = -20;
      modifiers.directness = 15;
    }

    return modifiers;
  }

  /**
   * Get personality description for dialogue prompts
   * @param {Object} npc - NPC instance
   * @returns {string} Personality description
   */
  getPersonalityDescription(npc) {
    const profile = npc.personalityProfile || {};
    const traits = [];

    // Big Five traits
    if (profile.openness > 70) traits.push('curious and open to new experiences');
    if (profile.openness < 30) traits.push('traditional and resistant to change');
    
    if (profile.extraversion > 70) traits.push('outgoing and sociable');
    if (profile.extraversion < 30) traits.push('reserved and introverted');
    
    if (profile.agreeableness > 70) traits.push('warm and cooperative');
    if (profile.agreeableness < 30) traits.push('competitive and skeptical');
    
    if (profile.conscientiousness > 70) traits.push('organized and reliable');
    if (profile.conscientiousness < 30) traits.push('spontaneous and flexible');
    
    if (profile.neuroticism > 70) traits.push('anxious and emotionally reactive');
    if (profile.neuroticism < 30) traits.push('calm and emotionally stable');

    // Star Wars specific
    if (profile.forceAlignment > 70) traits.push('strongly aligned with the Force');
    if (profile.forceAlignment < 30) traits.push('distant from the Force');
    
    if (profile.authorityRespect > 70) traits.push('respectful of authority');
    if (profile.authorityRespect < 30) traits.push('rebellious and anti-authority');
    
    if (profile.riskTolerance > 70) traits.push('bold and risk-taking');
    if (profile.riskTolerance < 30) traits.push('cautious and risk-averse');
    
    if (profile.directness > 70) traits.push('direct and straightforward');
    if (profile.directness < 30) traits.push('subtle and indirect');

    // Dynamic states
    if (profile.stressLevel > 70) traits.push('currently stressed');
    if (profile.fatigueLevel > 70) traits.push('tired and weary');

    return traits.length > 0 
      ? `You are ${traits.slice(0, 3).join(', ')}.`
      : 'You have a balanced personality.';
  }

  /**
   * Get speaking style based on personality
   * @param {Object} npc - NPC instance
   * @returns {string} Speaking style description
   */
  getSpeakingStyle(npc) {
    const profile = npc.personalityProfile || {};
    const styles = [];

    if (profile.formality > 70 || (npc.personalityTraits?.formality > 70)) {
      styles.push('formal');
    } else if (profile.formality < 30 || (npc.personalityTraits?.formality < 30)) {
      styles.push('casual');
    }

    if (profile.directness > 70) {
      styles.push('direct');
    } else if (profile.directness < 30) {
      styles.push('circumspect');
    }

    if (profile.extraversion > 70) {
      styles.push('talkative');
    } else if (profile.extraversion < 30) {
      styles.push('brief');
    }

    if (profile.humor > 70 || (npc.personalityTraits?.humor > 70)) {
      styles.push('humorous');
    }

    return styles.length > 0 
      ? `Speak in a ${styles.join(', ')} manner.`
      : 'Speak naturally.';
  }

  /**
   * Update personality profile based on events
   * @param {Object} npc - NPC instance
   * @param {string} eventType - Type of event
   * @param {number} intensity - Intensity of change (0-1)
   */
  updatePersonalityFromEvent(npc, eventType, intensity = 0.1) {
    if (!npc.personalityProfile) {
      npc.personalityProfile = this.generatePersonalityProfile(npc);
    }

    const profile = npc.personalityProfile;
    const change = intensity * 10; // Max 10 point change

    // Event-based personality shifts
    switch (eventType) {
      case 'trauma':
        profile.neuroticism = this.clamp(0, 100, profile.neuroticism + change);
        profile.stressLevel = this.clamp(0, 100, profile.stressLevel + change * 2);
        break;
      case 'success':
        profile.neuroticism = this.clamp(0, 100, profile.neuroticism - change);
        profile.currentMood = this.clamp(0, 100, profile.currentMood + change);
        break;
      case 'betrayal':
        profile.agreeableness = this.clamp(0, 100, profile.agreeableness - change);
        profile.trust = this.clamp(0, 100, (profile.trust || 50) - change);
        break;
      case 'trust_built':
        profile.agreeableness = this.clamp(0, 100, profile.agreeableness + change);
        profile.trust = this.clamp(0, 100, (profile.trust || 50) + change);
        break;
    }
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
   * Migrate legacy personalityTraits to new personalityProfile
   * @param {Object} npc - NPC instance
   */
  migrateLegacyTraits(npc) {
    if (!npc.personalityProfile && npc.personalityTraits) {
      const legacy = npc.personalityTraits;
      npc.personalityProfile = {
        openness: 50,
        extraversion: legacy.humor > 50 ? 60 : 40,
        agreeableness: legacy.empathy || 50,
        conscientiousness: 50,
        neuroticism: 50,
        forceAlignment: 50,
        authorityRespect: legacy.formality > 50 ? 60 : 40,
        riskTolerance: 50,
        directness: legacy.formality > 50 ? 60 : 40,
        currentMood: 50,
        stressLevel: 30,
        fatigueLevel: 20
      };
    }
  }
}

module.exports = new PersonalityService();

