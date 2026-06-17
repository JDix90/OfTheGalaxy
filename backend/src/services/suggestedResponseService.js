/**
 * Suggested Response Service
 * Generates context-aware suggested responses for players
 */

const { Planet } = require('../models');
const { deriveSuggestionTone } = require('./suggestionTone');

class SuggestedResponseService {
  /**
   * Generate suggested responses for a conversation
   * @param {Object} npc - NPC model instance
   * @param {Object} relationship - NPCRelationship instance
   * @param {Object} character - PlayerCharacter instance
   * @param {Array} conversationHistory - Previous messages in conversation
   * @returns {Promise<Array>} Array of suggested responses
   */
  async generateSuggestedResponses(npc, relationship, character, conversationHistory = []) {
    // Check if this is a tutorial NPC - use tutorial dialogue service
    const tutorialDialogueService = require('./tutorialDialogueService');
    if (tutorialDialogueService.isTutorialNPC(npc.id)) {
      const { TutorialProgress } = require('../models');
      const tutorialProgress = await TutorialProgress.findOne({
        where: { characterId: character.id }
      });
      const tutorialState = tutorialProgress?.state || 'dialogue_started';
      const tutorialSuggestions = tutorialDialogueService.getSuggestedResponses(tutorialState, character.background);
      
      // Convert to expected format. Spread the original first so `action`
      // (accept_quest / open_vendor / ready_for_combat) survives to the client —
      // ConversationView.handleChoose routes on it. Only category/intent/icon
      // are normalized; tone is derived from the original suggestion.
      return tutorialSuggestions.map(s => ({
        ...s,
        category: s.action || 'tutorial',
        intent: s.action || 'tutorial',
        icon: s.icon || '💬',
        tone: deriveSuggestionTone(s) // backend-authored intent label
      }));
    }
    
    const suggestions = [];
    const askedIntents = this.extractAskedIntents(conversationHistory);
    
    // Load planet data if available
    let planet = null;
    if (npc.location?.planet) {
      try {
        planet = await Planet.findByPk(npc.location.planet);
      } catch (error) {
        console.error(`[Suggested Responses] Failed to load planet:`, error);
      }
    }

    // Always include basic greetings (if not already asked)
    if (!askedIntents.has('greeting')) {
      suggestions.push({
        text: "Hello, how are you?",
        category: "greeting",
        intent: "greeting",
        icon: "👋"
      });
    }

    // Planet-related suggestions
    if (planet && !askedIntents.has('planet_info')) {
      suggestions.push({
        text: `Tell me about ${planet.name}`,
        category: "planet",
        intent: "planet_info",
        icon: "🌍"
      });

      if (planet.pointsOfInterest && planet.pointsOfInterest.length > 0 && !askedIntents.has('planet_locations')) {
        suggestions.push({
          text: "What interesting locations are here?",
          category: "planet",
          intent: "planet_locations",
          icon: "📍"
        });
      }

      if (planet.resources && planet.resources.length > 0 && !askedIntents.has('resources')) {
        suggestions.push({
          text: "What resources can be found here?",
          category: "planet",
          intent: "resources",
          icon: "💎"
        });
      }
    }

    // Faction-related suggestions
    if (npc.factionId && !askedIntents.has('faction_info')) {
      const factionName = this.getFactionDisplayName(npc.factionId);
      suggestions.push({
        text: `Tell me about the ${factionName}`,
        category: "faction",
        intent: "faction_info",
        icon: "⚔️"
      });

      if (relationship.relationshipLevel >= 20) {
        suggestions.push({
          text: "How can I improve my reputation with your faction?",
          category: "faction",
          intent: "faction_reputation",
          icon: "⭐"
        });
      }
    }

    // Quest-related suggestions
    if (npc.npcType === 'quest_giver' && !askedIntents.has('quest')) {
      suggestions.push({
        text: "Do you have any work for me?",
        category: "quest",
        intent: "quest",
        icon: "📜"
      });

      suggestions.push({
        text: "Are there any quests available?",
        category: "quest",
        intent: "quest",
        icon: "📋"
      });
    }

    // NPC-related suggestions
    if (!askedIntents.has('npc_info')) {
      suggestions.push({
        text: "Tell me about yourself",
        category: "npc",
        intent: "npc_info",
        icon: "👤"
      });

      if (npc.occupation) {
        suggestions.push({
          text: `What does a ${(npc.occupation || '').replace(/_/g, ' ')} do here?`,
          category: "npc",
          intent: "npc_occupation",
          icon: "💼"
        });
      }
    }

    // Casual conversation suggestions
    if (relationship.relationshipLevel >= 20 && !askedIntents.has('casual')) {
      suggestions.push({
        text: "How's your day going?",
        category: "casual",
        intent: "casual",
        icon: "💬"
      });
    }

    if (planet && relationship.relationshipLevel >= 30) {
      suggestions.push({
        text: `What's it like living on ${planet.name}?`,
        category: "casual",
        intent: "casual_planet",
        icon: "🏠"
      });
    }

    // Limit to 6 suggestions, tagging each with a backend-authored tone label.
    return suggestions.slice(0, 6).map(s => ({ ...s, tone: s.tone || deriveSuggestionTone(s) }));
  }

  /**
   * Extract asked intents from conversation history
   */
  extractAskedIntents(conversationHistory) {
    const intents = new Set();
    
    for (const message of conversationHistory) {
      if (message.sender === 'player') {
        const text = message.text?.toLowerCase() || '';
        
        // Detect intents from player messages
        if (text.match(/\b(hello|hi|hey|greetings)\b/)) {
          intents.add('greeting');
        }
        if (text.match(/\b(planet|world|location|place|here|this planet|explore)\b/)) {
          intents.add('planet_info');
        }
        if (text.match(/\b(where|location|place|poi|point of interest)\b/)) {
          intents.add('planet_locations');
        }
        if (text.match(/\b(resource|material|ore|spice|crystal)\b/)) {
          intents.add('resources');
        }
        if (text.match(/\b(faction|reputation|standing|alliance)\b/)) {
          intents.add('faction_info');
        }
        if (text.match(/\b(reputation|standing|improve)\b/)) {
          intents.add('faction_reputation');
        }
        if (text.match(/\b(quest|mission|work|job|task)\b/)) {
          intents.add('quest');
        }
        if (text.match(/\b(who|you|yourself|about you|tell me about)\b/)) {
          intents.add('npc_info');
        }
        if (text.match(/\b(occupation|job|work|do)\b/)) {
          intents.add('npc_occupation');
        }
        if (text.match(/\b(how|day|going|life|living)\b/)) {
          intents.add('casual');
        }
      }
    }
    
    return intents;
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
}

module.exports = new SuggestedResponseService();



