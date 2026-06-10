/**
 * Faction Service
 * Handles faction reputation tracking and management
 * Phase 1: Enhanced with faction personality profiles
 */

const { FactionReputation, PlayerCharacter } = require('../models');
const { 
  getFactionProfile, 
  getFactionPersonalityModifiers,
  getFactionRhetoric,
  getFactionDialogueStyle,
  getRelationshipModifiers
} = require('../config/factionProfiles');

class FactionService {
  /**
   * Update reputation for a character with a faction
   * @param {string} characterId - Character UUID
   * @param {string} factionId - Faction ID
   * @param {number} amount - Reputation change (can be positive or negative)
   * @returns {Promise<Object>} Updated reputation record
   */
  async updateReputation(characterId, factionId, amount) {
    // Validate character exists
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    // Find or create reputation record
    const [reputation, created] = await FactionReputation.findOrCreate({
      where: { characterId, factionId },
      defaults: {
        characterId,
        factionId,
        reputation: amount,
        tier: this.calculateTier(amount)
      }
    });

    if (!created) {
      // Update existing reputation
      reputation.reputation = Math.max(-1000, Math.min(10000, reputation.reputation + amount));
      reputation.tier = this.calculateTier(reputation.reputation);
      await reputation.save();
    }

    return reputation;
  }

  /**
   * Calculate reputation tier based on reputation value
   * @param {number} reputation - Reputation value
   * @returns {string} Tier name
   */
  calculateTier(reputation) {
    if (reputation >= 1000) return 'exalted';
    if (reputation >= 500) return 'honored';
    if (reputation >= 100) return 'friendly';
    if (reputation >= 0) return 'neutral';
    if (reputation >= -100) return 'unfriendly';
    if (reputation >= -500) return 'hostile';
    return 'hated';
  }

  /**
   * Get reputation for a specific character and faction
   * @param {string} characterId - Character UUID
   * @param {string} factionId - Faction ID
   * @returns {Promise<Object>} Reputation record or default
   */
  async getReputation(characterId, factionId) {
    const rep = await FactionReputation.findOne({
      where: { characterId, factionId }
    });
    
    if (!rep) {
      return {
        reputation: 0,
        tier: 'neutral',
        factionId
      };
    }
    
    return rep;
  }

  /**
   * Get all reputations for a character
   * @param {string} characterId - Character UUID
   * @returns {Promise<Array>} Array of reputation records
   */
  async getAllReputations(characterId) {
    const reputations = await FactionReputation.findAll({
      where: { characterId },
      order: [['reputation', 'DESC']]
    });
    
    return reputations;
  }

  /**
   * Get reputation tier information
   * @param {string} tier - Tier name
   * @returns {Object} Tier information
   */
  getTierInfo(tier) {
    const tierInfo = {
      hated: { min: -1000, max: -500, color: '#8b0000', label: 'Hated' },
      hostile: { min: -500, max: -100, color: '#dc2626', label: 'Hostile' },
      unfriendly: { min: -100, max: 0, color: '#f97316', label: 'Unfriendly' },
      neutral: { min: 0, max: 100, color: '#6b7280', label: 'Neutral' },
      friendly: { min: 100, max: 500, color: '#3b82f6', label: 'Friendly' },
      honored: { min: 500, max: 1000, color: '#8b5cf6', label: 'Honored' },
      exalted: { min: 1000, max: 10000, color: '#fbbf24', label: 'Exalted' }
    };
    
    return tierInfo[tier] || tierInfo.neutral;
  }

  /**
   * Get faction profile (Phase 1)
   * @param {string} factionId - Faction identifier
   * @returns {Object} Faction profile
   */
  getFactionProfile(factionId) {
    return getFactionProfile(factionId);
  }

  /**
   * Get personality modifiers for a faction (Phase 1)
   * @param {string} factionId - Faction identifier
   * @returns {Object} Personality modifiers
   */
  getPersonalityModifiers(factionId) {
    return getFactionPersonalityModifiers(factionId);
  }

  /**
   * Get faction rhetoric for dialogue (Phase 1)
   * @param {string} factionId - Faction identifier
   * @returns {Object} Rhetoric information
   */
  getRhetoric(factionId) {
    return getFactionRhetoric(factionId);
  }

  /**
   * Get faction dialogue style (Phase 1)
   * @param {string} factionId - Faction identifier
   * @returns {Object} Dialogue style
   */
  getDialogueStyle(factionId) {
    return getFactionDialogueStyle(factionId);
  }

  /**
   * Get relationship modifiers based on faction and reputation (Phase 1)
   * @param {string} factionId - Faction identifier
   * @param {string} tier - Reputation tier
   * @returns {Object} Modifiers (trustBonus, suspicionLevel)
   */
  getRelationshipModifiers(factionId, tier) {
    return getRelationshipModifiers(factionId, tier);
  }

  /**
   * Get faction dialogue context for AI prompts (Phase 1)
   * @param {string} factionId - Faction identifier
   * @param {string} reputationTier - Player's reputation tier with faction
   * @returns {string} Dialogue context string
   */
  getDialogueContext(factionId, reputationTier = 'neutral') {
    const profile = getFactionProfile(factionId);
    if (!profile) return '';

    const modifiers = getRelationshipModifiers(factionId, reputationTier);
    const rhetoric = getFactionRhetoric(factionId);
    const style = getFactionDialogueStyle(factionId);

    let context = `You are affiliated with the ${profile.name}. `;
    
    if (style.tone) {
      context += `Your dialogue tone is ${style.tone}. `;
    }
    
    if (rhetoric.emphasizeUnity) {
      context += 'Emphasize unity and cooperation. ';
    }
    if (rhetoric.emphasizeStrength) {
      context += 'Emphasize strength and order. ';
    }
    if (rhetoric.emphasizeFreedom) {
      context += 'Emphasize freedom and resistance. ';
    }
    if (rhetoric.emphasizeHonor) {
      context += 'Emphasize honor and tradition. ';
    }
    if (rhetoric.emphasizeProfit) {
      context += 'Emphasize profit and business. ';
    }
    if (rhetoric.emphasizePragmatism) {
      context += 'Be pragmatic and practical. ';
    }
    if (rhetoric.emphasizeNeutrality) {
      context += 'Maintain neutrality and avoid taking sides. ';
    }

    if (modifiers.suspicionLevel > 0.5) {
      context += 'You are suspicious of the player. ';
    } else if (modifiers.suspicionLevel < 0.3) {
      context += 'You trust the player. ';
    }

    if (modifiers.trustBonus > 10) {
      context += 'You have a positive relationship with the player. ';
    } else if (modifiers.trustBonus < -10) {
      context += 'You have a negative relationship with the player. ';
    }

    return context.trim();
  }
}

module.exports = new FactionService();


