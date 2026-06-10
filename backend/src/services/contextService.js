/**
 * Context Service
 * Handles contextual awareness for NPCs: time, location, and faction context
 * Phase 3: Contextual Awareness
 */

const { Planet } = require('../models');
const factionService = require('./factionService');

class ContextService {
  /**
   * Gather contextual awareness for NPC
   * @param {Object} npc - NPC instance
   * @returns {Object} Context data
   */
  gatherContext(npc) {
    return {
      timeContext: {
        timeOfDay: this.getTimeOfDay(),
        dayOfWeek: new Date().getDay(),
        hour: new Date().getHours()
      },
      locationContext: {
        currentLocation: npc.location?.area || 'unknown',
        locationSafety: this.getLocationSafety(npc.location),
        locationType: this.getLocationType(npc.location),
        planet: npc.location?.planet || null
      },
      factionContext: {
        localFactionControl: this.getLocalFaction(npc.location),
        factionTension: this.getFactionTension(npc.location, npc.factionId)
      }
    };
  }

  /**
   * Get time of day
   * @returns {string} Time of day (morning, afternoon, evening, night)
   */
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Get location safety level
   * @param {Object} location - Location data
   * @returns {number} Safety level (0.0-1.0)
   */
  getLocationSafety(location) {
    if (!location) return 0.5;
    
    const safeAreas = ['residential', 'market', 'spaceport', 'cantina', 'government', 'medical_center'];
    const dangerousAreas = ['wilderness', 'lower_levels', 'outskirts', 'ruins', 'abandoned', 'industrial'];
    
    if (safeAreas.includes(location.area)) return 0.8;
    if (dangerousAreas.includes(location.area)) return 0.3;
    
    // Check planet danger level if available
    // This would require loading planet data, but for now use area-based heuristic
    return 0.5; // Default neutral
  }

  /**
   * Get location type
   * @param {Object} location - Location data
   * @returns {string} Location type
   */
  getLocationType(location) {
    if (!location) return 'generic';
    
    const types = {
      'market': 'commercial',
      'cantina': 'social',
      'residential': 'residential',
      'spaceport': 'transport',
      'government': 'official',
      'medical_center': 'medical',
      'wilderness': 'dangerous',
      'lower_levels': 'dangerous',
      'outskirts': 'dangerous',
      'ruins': 'dangerous',
      'abandoned': 'dangerous',
      'industrial': 'industrial'
    };
    
    return types[location.area] || 'generic';
  }

  /**
   * Get local faction control
   * @param {Object} location - Location data
   * @returns {string|null} Faction ID controlling the area
   */
  getLocalFaction(location) {
    // TODO: Integrate with world state system when available
    // For now, return null (unknown)
    // In future, this could check planet faction control, area ownership, etc.
    return null;
  }

  /**
   * Get faction tension level
   * @param {Object} location - Location data
   * @param {string} npcFactionId - NPC's faction
   * @returns {number} Tension level (0.0-1.0)
   */
  getFactionTension(location, npcFactionId) {
    // TODO: Integrate with world state system when available
    // For now, return default based on area type
    if (!location || !npcFactionId) return 0.5;
    
    // Higher tension in certain areas
    const highTensionAreas = ['government', 'outskirts', 'lower_levels'];
    if (highTensionAreas.includes(location.area)) {
      return 0.7; // Moderate-high tension
    }
    
    return 0.5; // Default neutral
  }

  /**
   * Build context prompt for AI (concise, only relevant context)
   * @param {Object} context - Context data
   * @returns {string} Context prompt
   */
  buildContextPrompt(context) {
    let prompt = '';
    
    // Time context (only if significant)
    if (context.timeContext.timeOfDay === 'night') {
      prompt += "- It's night. You're tired, keep responses brief.\n";
    } else if (context.timeContext.timeOfDay === 'morning') {
      prompt += "- It's morning. You're fresh and more willing to talk.\n";
    } else if (context.timeContext.timeOfDay === 'evening') {
      prompt += "- It's evening. You're winding down but still available.\n";
    }
    
    // Location context (only if unsafe or significant)
    if (context.locationContext.locationSafety < 0.5) {
      prompt += `- Location: ${context.locationContext.currentLocation} (unsafe). Be cautious.\n`;
    } else if (context.locationContext.locationType === 'dangerous') {
      prompt += `- Location: ${context.locationContext.currentLocation} (dangerous area). Stay alert.\n`;
    }
    
    // Faction context (only if tense)
    if (context.factionContext.factionTension > 0.7) {
      prompt += "- Faction tensions are HIGH. Be cautious about politics.\n";
    } else if (context.factionContext.factionTension < 0.3) {
      prompt += "- Faction tensions are LOW. It's relatively safe here.\n";
    }
    
    return prompt;
  }

  /**
   * Update NPC contextual awareness
   * @param {Object} npc - NPC instance
   * @returns {Promise<Object>} Updated context
   */
  async updateContextualAwareness(npc) {
    const context = this.gatherContext(npc);
    npc.contextualAwareness = {
      ...context,
      lastUpdated: new Date().toISOString()
    };
    await npc.save();
    return context;
  }

  /**
   * Get cached context or gather new context
   * @param {Object} npc - NPC instance
   * @param {number} cacheMaxAge - Maximum age in milliseconds (default: 5 minutes)
   * @returns {Object} Context data
   */
  getContext(npc, cacheMaxAge = 5 * 60 * 1000) {
    // Check if we have cached context that's still valid
    if (npc.contextualAwareness?.lastUpdated) {
      const lastUpdated = new Date(npc.contextualAwareness.lastUpdated);
      const age = Date.now() - lastUpdated.getTime();
      
      if (age < cacheMaxAge) {
        // Return cached context
        return {
          timeContext: npc.contextualAwareness.timeContext,
          locationContext: npc.contextualAwareness.locationContext,
          factionContext: npc.contextualAwareness.factionContext
        };
      }
    }
    
    // Gather fresh context
    return this.gatherContext(npc);
  }

  /**
   * Check if context should influence dialogue
   * @param {Object} context - Context data
   * @returns {boolean} True if context is significant enough to affect dialogue
   */
  isContextSignificant(context) {
    // Time is significant if night or morning
    if (context.timeContext.timeOfDay === 'night' || context.timeContext.timeOfDay === 'morning') {
      return true;
    }
    
    // Location is significant if unsafe
    if (context.locationContext.locationSafety < 0.5) {
      return true;
    }
    
    // Faction tension is significant if high
    if (context.factionContext.factionTension > 0.7) {
      return true;
    }
    
    return false;
  }
}

module.exports = new ContextService();








