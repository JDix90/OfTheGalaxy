/**
 * Dialogue Template Service
 * Handles template selection, variable filling, and response generation
 */

const { getMatchingTemplates } = require('../data/dialogueTemplates');
const { Planet } = require('../models');
const emotionalStateService = require('./emotionalStateService');
const personalityService = require('./personalityService');
const memoryService = require('./memoryService');
const motivationService = require('./motivationService');
const trustService = require('./trustService');

class DialogueTemplateService {
  constructor() {
    // Track recent template usage per conversation to avoid repetition
    this.recentTemplates = new Map(); // Map<conversationId, Set<templateIds>>
  }

  /**
   * Generate response using template system
   * @param {Object} npc - NPC model instance
   * @param {Object} relationship - NPCRelationship instance
   * @param {Object} character - PlayerCharacter instance
   * @param {string} playerMessage - Player's message
   * @param {Object} options - Additional context
   * @returns {Promise<string>} Generated response
   */
  async generateResponse(npc, relationship, character, playerMessage, options = {}) {
    const relationshipTier = relationship.getRelationshipTier();
    const conversationId = `${npc.id}_${character.id}`;
    
    // Load planet data if available
    let planet = null;
    if (npc.location?.planet) {
      try {
        planet = await Planet.findByPk(npc.location.planet);
      } catch (error) {
        console.error(`[Dialogue] Failed to load planet ${npc.location.planet}:`, error);
      }
    }

    // Phase 3: Get contextual awareness
    const contextService = require('./contextService');
    const contextualAwareness = options.context || contextService.getContext(npc);
    
    // Determine context (legacy + Phase 3)
    const context = {
      hasPlanet: !!planet,
      hasFaction: !!npc.factionId,
      hasPOI: !!(planet && planet.pointsOfInterest && planet.pointsOfInterest.length > 0),
      hasResources: !!(planet && planet.resources && planet.resources.length > 0),
      // Phase 3: Add contextual awareness
      contextualAwareness: contextualAwareness
    };

    // Detect intent from player message (simple keyword matching)
    const intent = this.detectIntent(playerMessage);
    console.log(`[Dialogue Template] Detected intent: ${intent.type} (priority: ${intent.priority}) for message: "${playerMessage}"`);
    
    // Determine if we should prioritize helpful responses (65% requirement)
    const requireHelpful = this.shouldProvideHelpfulResponse(conversationId);

    // Get matching templates
    const criteria = {
      relationshipTier,
      npcType: npc.npcType || 'generic',
      requireHelpful,
      context
    };

    let matchingTemplates = getMatchingTemplates(criteria);
    console.log(`[Dialogue Template] Found ${matchingTemplates.length} matching templates`);

    // Phase 1: Filter and score templates by intent, personality, and emotion
    if (intent) {
      // Score templates based on how well they match the intent
      const scoredTemplates = matchingTemplates.map(template => {
        let score = 0;
        
        // Base score from intent priority
        score += intent.priority || 5;
        
        // Topic matching (weighted more heavily for specific intents)
        const topicMatches = template.topics.filter(topic => intent.topics.includes(topic)).length;
        const topicWeight = (intent.type === 'resources' || intent.type === 'quest') ? 5 : 3;
        score += topicMatches * topicWeight;

        // Phase 1: Emotional state matching
        if (npc.emotionalState && emotionalStateService.isEmotional(npc)) {
          const emotion = npc.emotionalState.primaryEmotion;
          const intensity = npc.emotionalState.emotionIntensity;
          
          // Prefer templates that match emotional state (support both emotionalTags and emotionalState)
          const templateEmotions = template.emotionalTags || template.emotionalState || [];
          if (Array.isArray(templateEmotions) && templateEmotions.includes(emotion)) {
            score += intensity * 10; // Higher intensity = higher score
          }
          
          // Avoid templates that conflict with emotion
          if (templateEmotions.length > 0) {
            const conflictingEmotions = {
              'happy': ['angry', 'sad', 'fearful'],
              'angry': ['happy', 'grateful'],
              'sad': ['happy', 'proud'],
              'fearful': ['happy', 'proud']
            };
            if (conflictingEmotions[emotion]?.some(e => templateEmotions.includes(e))) {
              score -= 5;
            }
          }
        }

        // Phase 1: Personality matching
        if (npc.personalityProfile) {
          const profile = npc.personalityProfile;
          
          // Directness preference
          if (template.directness === 'high' && profile.directness > 70) {
            score += 3;
          } else if (template.directness === 'low' && profile.directness < 30) {
            score += 3;
          }
          
          // Extraversion preference
          if (template.verbosity === 'high' && profile.extraversion > 70) {
            score += 2;
          } else if (template.verbosity === 'low' && profile.extraversion < 30) {
            score += 2;
          }
          
          // Formality preference
          if (template.formality === 'high' && profile.authorityRespect > 70) {
            score += 2;
          } else if (template.formality === 'low' && profile.authorityRespect < 30) {
            score += 2;
          }
          
          // Personality requirements (new field support)
          if (template.personalityRequirements) {
            let matchesRequirements = true;
            for (const [trait, requirement] of Object.entries(template.personalityRequirements)) {
              const value = profile[trait] || 50;
              if (requirement.min !== undefined && value < requirement.min) {
                matchesRequirements = false;
                break;
              }
              if (requirement.max !== undefined && value > requirement.max) {
                matchesRequirements = false;
                break;
              }
            }
            if (matchesRequirements) {
              score += 5; // Boost for matching personality requirements
            } else {
              score = -100; // Exclude if doesn't match requirements
            }
          }
        }

        // Phase 2: Motivation matching
        if (npc.motivations) {
          const goal = npc.motivations.primaryGoal;
          const urgentNeeds = motivationService.getUrgentNeeds(npc);
          
          // Boost templates that hint at quests if NPC has urgent needs
          if (urgentNeeds.length > 0 && template.topics?.includes('quest')) {
            score += 5; // Strong boost for quest-related templates
          }
          
          // Boost templates that match goal type
          if (goal && template.goalTypes && template.goalTypes.includes(goal.type)) {
            score += 3;
          }
          
          // Boost templates that offer help if urgency is high
          if (goal && goal.urgency > 0.7 && template.topics?.includes('help')) {
            score += 4;
          }
        }

        // Phase 2: Trust-based filtering
        const trustLevel = trustService.getTrustLevel(npc);
        
        // Filter out trust-gated templates if trust is low
        if (template.requiresTrust && trustLevel < template.requiresTrust) {
          score = -100; // Effectively exclude this template
        }
        
        // Boost templates that match trust level
        if (template.trustLevel) {
          if (template.trustLevel === 'low' && trustLevel < 40) {
            score += 2;
          } else if (template.trustLevel === 'medium' && trustLevel >= 40 && trustLevel < 70) {
            score += 2;
          } else if (template.trustLevel === 'high' && trustLevel >= 70) {
            score += 2;
          }
        }
        
        // Block sensitive information if trust is low
        if (trustLevel < 30 && template.sensitive) {
          score = -100; // Exclude sensitive templates
        }
        
        // Block secret-sharing templates if trust threshold not met
        if (template.requiresSecretThreshold && !trustService.meetsThreshold(npc, 'shareSecret')) {
          score = -100;
        }

        // Phase 3: Contextual awareness filtering
        if (contextualAwareness && template.contextRequirements) {
          const req = template.contextRequirements;
          
          // Time of day matching
          if (req.timeOfDay && contextualAwareness.timeContext) {
            const timeOfDay = contextualAwareness.timeContext.timeOfDay;
            if (Array.isArray(req.timeOfDay) && req.timeOfDay.includes(timeOfDay)) {
              score += 3; // Boost for time match
            } else if (req.timeOfDay === timeOfDay) {
              score += 3;
            }
          }
          
          // Location safety matching
          if (req.locationSafety && contextualAwareness.locationContext) {
            const safety = contextualAwareness.locationContext.locationSafety;
            if (req.locationSafety.min !== undefined && safety >= req.locationSafety.min) {
              score += 2;
            }
            if (req.locationSafety.max !== undefined && safety <= req.locationSafety.max) {
              score += 2;
            }
          }
          
          // Faction tension matching
          if (req.factionTension && contextualAwareness.factionContext) {
            const tension = contextualAwareness.factionContext.factionTension;
            if (req.factionTension.min !== undefined && tension >= req.factionTension.min) {
              score += 2;
            }
            if (req.factionTension.max !== undefined && tension <= req.factionTension.max) {
              score += 2;
            }
          }
        }
        
        // Category matching
        if (intent.type === 'planet_overview' && template.category === 'planet_info' && template.topics.includes('overview')) {
          score += 8;
        }
        if (intent.type === 'location_list' && template.category === 'planet_info' && template.topics.includes('locations')) {
          score += 15; // Very high priority for location list questions
          if (template.id.includes('list')) {
            score += 5; // Extra points if template ID includes 'list'
          }
        }
        if (intent.type === 'faction_specific' && template.category === 'faction_info') {
          score += 12; // High priority for faction questions
          // Extra points if template mentions the specific faction
          if (intent.factionId && template.topics.includes(intent.factionId.split('_').pop().toLowerCase())) {
            score += 8;
          }
          // Extra points for neutral faction
          if (intent.factionId === 'neutral' && template.topics.includes('neutral')) {
            score += 10;
          }
          // Extra points if template ID includes the faction name
          if (intent.factionId && template.id.toLowerCase().includes(intent.factionId.split('_').pop())) {
            score += 5;
          }
        }
        if (intent.type === 'jedi_info' && (template.category === 'faction_info' || template.topics.includes('jedi'))) {
          score += 10; // High priority for Jedi questions
        }
        if (intent.type === 'sith_info' && (template.category === 'faction_info' || template.topics.includes('sith'))) {
          score += 10;
        }
        if (intent.type === 'resources' && template.topics.includes('resources')) {
          score += 15; // Very high priority for resource questions
        }
        if (intent.type === 'resources' && template.category === 'planet_info' && template.topics.includes('resources')) {
          score += 10; // Extra points for planet resource templates
        }
        if (intent.type === 'quest' && template.topics.includes('quest')) {
          score += 15; // Very high priority for quest questions
        }
        if (intent.type === 'quest' && template.category === 'quest_hint') {
          score += 12; // Extra points for quest hint templates
        }
        if (intent.type === 'greeting' && template.category === 'casual' && template.topics.includes('greeting')) {
          score += 10; // High priority for greeting templates
        }
        
        // Keyword matching in template ID or category
        if (intent.keywords) {
          const templateText = `${template.id} ${template.category}`.toLowerCase();
          const keywordMatches = intent.keywords.filter(kw => templateText.includes(kw.toLowerCase())).length;
          score += keywordMatches * 2;
        }
        
        return { template, score };
      });
      
      // Sort by score (highest first) and filter out low-scoring templates
      scoredTemplates.sort((a, b) => b.score - a.score);
      
      // Only use templates with meaningful scores
      // Lower threshold for specific intents to ensure they match
      let minScore = 8; // Default
      if (intent.type === 'resources' || intent.type === 'quest' || intent.type === 'location_list') {
        minScore = 6; // Lower threshold for specific intents
      }
      if (intent.type === 'faction_specific') {
        minScore = 5; // Even lower for faction questions since they're important
      }
      const highScoreTemplates = scoredTemplates.filter(st => st.score >= minScore);
      
      if (highScoreTemplates.length > 0) {
        // Use top-scoring templates (top 3-5)
        const topCount = Math.min(5, Math.max(1, highScoreTemplates.length));
        matchingTemplates = highScoreTemplates.slice(0, topCount).map(st => st.template);
      } else {
        // If no high-scoring templates, try topic matching
        const intentTemplates = matchingTemplates.filter(t => 
          t.topics.some(topic => intent.topics.includes(topic))
        );
        if (intentTemplates.length > 0) {
          matchingTemplates = intentTemplates;
        } else {
          // Last resort: return empty to trigger fallback
          console.log(`[Dialogue] No matching templates for intent: ${intent.type}`);
          matchingTemplates = [];
        }
      }
    }
    
    // If no matching templates found, return null to trigger fallback
    if (matchingTemplates.length === 0) {
      console.log(`[Dialogue Template] ⚠️  No matching templates found for message: "${playerMessage}"`);
      return null;
    }

    // Filter out recently used templates (but be less aggressive)
    const recentTemplateIds = this.recentTemplates.get(conversationId) || new Set();
    const unusedTemplates = matchingTemplates.filter(t => !recentTemplateIds.has(t.id));
    
    // Only filter if we have enough unused templates
    if (unusedTemplates.length >= 2) {
      matchingTemplates = unusedTemplates;
    }
    // Otherwise, allow reuse to avoid empty responses

    // Weight templates and select one
    const selectedTemplate = this.selectWeightedTemplate(matchingTemplates);
    console.log(`[Dialogue Template] Selected template: ${selectedTemplate.id} (category: ${selectedTemplate.category})`);

    // Track usage
    if (!this.recentTemplates.has(conversationId)) {
      this.recentTemplates.set(conversationId, new Set());
    }
    this.recentTemplates.get(conversationId).add(selectedTemplate.id);
    
    // Limit recent template history to last 10
    if (this.recentTemplates.get(conversationId).size > 10) {
      const oldest = Array.from(this.recentTemplates.get(conversationId))[0];
      this.recentTemplates.get(conversationId).delete(oldest);
    }

    // Fill template variables
    const response = await this.fillTemplateVariables(
      selectedTemplate,
      relationshipTier,
      npc,
      character,
      planet,
      { ...options, intent }
    );

    return response;
  }

  /**
   * Detect intent from player message - Enhanced with better matching
   */
  detectIntent(playerMessage) {
    const message = playerMessage.toLowerCase().trim();
    
    // Greeting (check FIRST - very common)
    if (message.match(/\b(hello|hi|hey|greetings|good day|how are you|how's it going)\b/)) {
      return { 
        type: 'greeting', 
        topics: ['greeting', 'casual'],
        priority: 5
      };
    }
    
    // Specific entity questions (check next for precision)
    // Jedi-related
    if (message.match(/\b(jedi|jedi order|force|lightsaber|temple)\b/)) {
      return { 
        type: 'jedi_info', 
        topics: ['jedi', 'faction', 'lore'],
        keywords: ['jedi', 'jedi order', 'force', 'lightsaber', 'temple'],
        priority: 10
      };
    }
    
    // Sith-related
    if (message.match(/\b(sith|dark side|sith lord)\b/)) {
      return { 
        type: 'sith_info', 
        topics: ['sith', 'faction', 'lore'],
        keywords: ['sith', 'dark side'],
        priority: 10
      };
    }
    
    // Specific faction mentions
    const factionKeywords = {
      'galactic_republic': ['republic', 'galactic republic'],
      'galactic_empire': ['empire', 'galactic empire', 'imperial'],
      'rebel_alliance': ['rebel', 'alliance', 'rebellion'],
      'new_republic': ['new republic'],
      'first_order': ['first order'],
      'resistance': ['resistance'],
      'mandalorians': ['mandalorian', 'mandalore'],
      'hutts': ['hutt', 'hutts'],
      'black_sun': ['black sun'],
      'crimson_dawn': ['crimson dawn'],
      'neutral': ['neutral', 'unaffiliated']
    };
    
    for (const [factionId, keywords] of Object.entries(factionKeywords)) {
      if (keywords.some(keyword => message.includes(keyword))) {
        return { 
          type: 'faction_specific', 
          topics: ['faction', 'faction_info'],
          factionId: factionId,
          keywords: keywords,
          priority: 10
        };
      }
    }
    
    // Location/POI questions (check for "what interesting locations" or "where")
    // Must check BEFORE general planet questions to avoid false matches
    if (message.match(/(what.*interesting.*location|interesting.*location|what.*location.*here|where.*interesting|interesting.*place)/i)) {
      return { 
        type: 'location_list', 
        topics: ['planet', 'locations', 'poi'],
        keywords: ['location', 'place', 'interesting'],
        priority: 9
      };
    }
    
    // Planet overview questions
    if (message.match(/\b(tell me about|what about|what is|describe|tell me)\b.*\b(planet|world|coruscant|tatooine|ryloth|dantooine|naboo)\b/i)) {
      return { 
        type: 'planet_overview', 
        topics: ['planet', 'overview', 'general'],
        keywords: ['planet', 'world', 'tell me about'],
        priority: 9
      };
    }
    
    // General planet questions
    if (message.match(/\b(planet|world|location|place|here|this planet|explore|exploration)\b/)) {
      return { 
        type: 'planet_info', 
        topics: ['planet', 'location', 'exploration'],
        priority: 7
      };
    }
    
    // Faction-related (general)
    if (message.match(/\b(faction|reputation|standing|alliance|empire|republic|rebel)\b/)) {
      return { 
        type: 'faction_info', 
        topics: ['faction', 'reputation'],
        priority: 8
      };
    }
    
    // Quest-related
    if (message.match(/\b(quest|mission|work|job|task|help|assist)\b/)) {
      return { 
        type: 'quest', 
        topics: ['quest', 'mission', 'work'],
        priority: 7
      };
    }
    
    // Resource-related
    if (message.match(/\b(resource|material|ore|spice|crystal|harvest|gather|mine)\b/)) {
      return { 
        type: 'resources', 
        topics: ['planet', 'resources'],
        priority: 7
      };
    }
    
    // Location/POI-related
    if (message.match(/\b(where|location|place|poi|point of interest|building|market|spaceport)\b/)) {
      return { 
        type: 'location', 
        topics: ['planet', 'locations', 'poi'],
        priority: 7
      };
    }
    
    // NPC-related (but not greetings)
    if (message.match(/\b(tell me about you|about yourself|who are you|what do you do|your occupation)\b/)) {
      return { 
        type: 'npc_info', 
        topics: ['npc', 'occupation', 'casual'],
        priority: 7
      };
    }
    
    // Greeting
    if (message.match(/\b(hello|hi|hey|greetings|good day|how are you)\b/)) {
      return { 
        type: 'greeting', 
        topics: ['greeting', 'casual'],
        priority: 5
      };
    }
    
    return null;
  }

  /**
   * Determine if response should be helpful (for 65% requirement)
   * Uses a simple tracking mechanism
   */
  shouldProvideHelpfulResponse(conversationId) {
    // Simple approach: 65% chance to require helpful
    // In a more sophisticated system, we'd track actual helpful percentage
    return Math.random() < 0.65;
  }

  /**
   * Select a template using weighted random selection
   */
  selectWeightedTemplate(templates) {
    if (templates.length === 0) {
      throw new Error('No matching templates found');
    }

    // Calculate total weight
    const totalWeight = templates.reduce((sum, t) => sum + (t.weight || 1.0), 0);
    
    // Random selection
    let random = Math.random() * totalWeight;
    
    for (const template of templates) {
      random -= (template.weight || 1.0);
      if (random <= 0) {
        return template;
      }
    }
    
    // Fallback to first template
    return templates[0];
  }

  /**
   * Fill template variables with actual data
   * Phase 1: Enhanced with emotional and personality context
   */
  async fillTemplateVariables(template, relationshipTier, npc, character, planet, options = {}) {
    // Phase 1: Select response variant based on emotional state
    let response = template.responses[relationshipTier] || template.responses.stranger;
    
    // Phase 1: Apply emotional layering if NPC is emotional
    if (npc.emotionalState && emotionalStateService.isEmotional(npc)) {
      const emotion = npc.emotionalState.primaryEmotion;
      const intensity = npc.emotionalState.emotionIntensity;
      
      // Check for emotional variants in template
      if (template.emotionalVariants && template.emotionalVariants[emotion]) {
        // Use emotional variant if intensity is high enough
        if (intensity > 0.6) {
          const emotionalResponse = template.emotionalVariants[emotion][relationshipTier] || 
                                   template.emotionalVariants[emotion].stranger;
          if (emotionalResponse) {
            response = emotionalResponse;
          }
        }
      }
    }
    
    // Get faction name (handle special cases)
    let factionName = this.getFactionDisplayName(npc.factionId);
    // If asking about a specific faction, use that instead
    if (options.intent?.factionId) {
      factionName = this.getFactionDisplayName(options.intent.factionId);
    }
    
    // Phase 1: Get memory context for variables
    const significantMemory = memoryService.getSignificantMemories(npc, character.id, 1)[0];
    const memoryText = significantMemory ? memoryService.formatMemoryForDialogue(significantMemory) : '';
    
    // Replace variables
    const variables = {
      '{npcName}': npc.name,
      '{occupation}': npc.occupation || 'citizen',
      '{species}': npc.species || 'unknown',
      '{planetName}': planet?.name || npc.location?.planet || 'this planet',
      '{planetType}': planet?.planetType || 'unknown',
      '{climate}': planet?.climate || 'variable',
      '{terrain}': planet?.terrain || 'varied',
      '{description}': planet?.description || 'an interesting place',
      '{factionName}': factionName,
      '{dangerLevel}': planet?.dangerLevel || 5,
      '{dangerousArea}': this.getRandomDangerousArea(planet),
      // Phase 1: New variables
      '{emotion}': npc.emotionalState?.primaryEmotion || 'neutral',
      '{memory}': memoryText || '',
      // Phase 2: Motivation variables
      '{primaryGoal}': npc.motivations?.primaryGoal?.description || 'my goals',
      '{urgentNeed}': npc.motivations?.immediateNeeds?.find(n => n.urgency > 0.6)?.description || '',
    };

    // Replace basic variables
    for (const [key, value] of Object.entries(variables)) {
      response = response.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    // Handle POI variables (single POI)
    if (response.includes('{poiName}') && !response.includes('{poiName2}')) {
      const poi = this.getRandomPOI(planet);
      if (poi) {
        response = response.replace(/{poiName}/g, poi.name || poi.id || 'a location');
        response = response.replace(/{poiType}/g, poi.type || 'location');
        response = response.replace(/{poiDescription}/g, poi.description || 'an interesting place');
      } else {
        // Fallback if no POI available
        response = response.replace(/{poiName}/g, 'the spaceport');
        response = response.replace(/{poiType}/g, 'location');
        response = response.replace(/{poiDescription}/g, 'a common destination');
      }
    }
    
    // Handle multiple POI variables (for location list templates)
    if (response.includes('{poiName2}')) {
      const pois = this.getMultiplePOIs(planet, 2);
      if (pois.length >= 2) {
        response = response.replace(/{poiName}/g, pois[0].name || pois[0].id || 'a location');
        response = response.replace(/{poiType}/g, pois[0].type || 'location');
        response = response.replace(/{poiName2}/g, pois[1].name || pois[1].id || 'another location');
      } else if (pois.length === 1) {
        response = response.replace(/{poiName}/g, pois[0].name || pois[0].id || 'a location');
        response = response.replace(/{poiType}/g, pois[0].type || 'location');
        response = response.replace(/{poiName2}/g, 'the spaceport');
      } else {
        response = response.replace(/{poiName}/g, 'the spaceport');
        response = response.replace(/{poiType}/g, 'location');
        response = response.replace(/{poiName2}/g, 'the market');
      }
    }

    // Handle resource variables
    if (response.includes('{resourceName}') || response.includes('{resourceLocation}')) {
      const resource = this.getRandomResource(planet);
      if (resource) {
        response = response.replace(/{resourceName}/g, resource.name || resource.id);
        const location = resource.locations?.[0] || 'various locations';
        response = response.replace(/{resourceLocation}/g, location);
      } else {
        response = response.replace(/{resourceName}/g, 'valuable resources');
        response = response.replace(/{resourceLocation}/g, 'various locations');
      }
    }

    // Handle quest location
    if (response.includes('{questLocation}')) {
      const questLocation = this.getRandomQuestLocation(planet);
      response = response.replace(/{questLocation}/g, questLocation);
    }

    return response;
  }

  /**
   * Get random POI from planet
   */
  getRandomPOI(planet) {
    if (!planet || !planet.pointsOfInterest || planet.pointsOfInterest.length === 0) {
      return null;
    }
    const pois = planet.pointsOfInterest;
    return pois[Math.floor(Math.random() * pois.length)];
  }

  /**
   * Get multiple unique POIs from planet
   */
  getMultiplePOIs(planet, count) {
    if (!planet || !planet.pointsOfInterest || planet.pointsOfInterest.length === 0) {
      return [];
    }
    const pois = [...planet.pointsOfInterest];
    const selected = [];
    const maxCount = Math.min(count, pois.length);
    
    for (let i = 0; i < maxCount; i++) {
      const randomIndex = Math.floor(Math.random() * pois.length);
      selected.push(pois.splice(randomIndex, 1)[0]);
    }
    
    return selected;
  }

  /**
   * Get random resource from planet
   */
  getRandomResource(planet) {
    if (!planet || !planet.resources || planet.resources.length === 0) {
      return null;
    }
    const resources = planet.resources;
    return resources[Math.floor(Math.random() * resources.length)];
  }

  /**
   * Get random dangerous area name
   */
  getRandomDangerousArea(planet) {
    const areas = [
      'wilderness',
      'outskirts',
      'lower levels',
      'remote regions',
      'unexplored areas',
      'danger zones'
    ];
    return areas[Math.floor(Math.random() * areas.length)];
  }

  /**
   * Get random quest location
   */
  getRandomQuestLocation(planet) {
    if (planet && planet.pointsOfInterest && planet.pointsOfInterest.length > 0) {
      const poi = this.getRandomPOI(planet);
      return poi?.name || 'the spaceport';
    }
    return 'the spaceport';
  }

  /**
   * Get faction display name
   */
  getFactionDisplayName(factionId) {
    if (!factionId) return 'Unaffiliated';
    
    const displayNames = {
      'galactic_republic': 'Galactic Republic',
      'galactic_empire': 'Galactic Empire',
      'rebel_alliance': 'Rebel Alliance',
      'new_republic': 'New Republic',
      'first_order': 'First Order',
      'resistance': 'Resistance',
      'jedi_order': 'Jedi Order',
      'sith': 'Sith',
      'mandalorians': 'Mandalorians',
      'hutts': 'Hutts',
      'black_sun': 'Black Sun',
      'crimson_dawn': 'Crimson Dawn',
      'independent': 'Independent',
      'neutral': 'Neutral',
      'smugglers': 'Smugglers',
      'bounty_hunters': 'Bounty Hunters',
      'trade_federation': 'Trade Federation',
      'separatists': 'Separatists',
      'chiss_ascendancy': 'Chiss Ascendancy',
      'hapes_consortium': 'Hapes Consortium'
    };

    return displayNames[factionId] || factionId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Clear conversation history (for testing or cleanup)
   */
  clearConversationHistory(conversationId) {
    this.recentTemplates.delete(conversationId);
  }

  /**
   * Clear all conversation history
   */
  clearAllHistory() {
    this.recentTemplates.clear();
  }
}

module.exports = new DialogueTemplateService();

