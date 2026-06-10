/**
 * NPC Model
 * Defines non-player characters including quest givers, vendors, and companions
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NPC = sequelize.define('NPC', {
    id: {
      type: DataTypes.STRING(100),
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    species: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    occupation: {
      type: DataTypes.STRING(100)
    },
    factionId: {
      type: DataTypes.STRING(100),
      field: 'faction_id'
    },
    // NPC location
    location: {
      type: DataTypes.JSONB,
      defaultValue: {
        planet: null,
        area: null,
        subMapId: null,
        parentLocationId: null,
        buildingId: null,
        x: 0,
        y: 0
      }
    },
    // NPC type
    npcType: {
      type: DataTypes.STRING(50),
      field: 'npc_type',
      validate: {
        isIn: [['quest_giver', 'vendor', 'companion', 'random_encounter', 'faction_leader', 'generic']]
      }
    },
    // Is this NPC a recruitable companion?
    isCompanion: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_companion'
    },
    // Dialogue data
    dialogue: {
      type: DataTypes.JSONB,
      defaultValue: {
        greeting: {
          stranger: '',
          acquaintance: '',
          friend: '',
          confidant: ''
        },
        questRelated: {},
        general: []
      }
    },
    // Quests this NPC gives
    quests: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    // Vendor inventory (if NPC is a vendor)
    vendorInventory: {
      type: DataTypes.JSONB,
      field: 'vendor_inventory',
      defaultValue: null
    },
    // Companion abilities (if NPC is a companion)
    companionAbilities: {
      type: DataTypes.JSONB,
      field: 'companion_abilities',
      defaultValue: null
    },
    // Companion stats (if NPC is a companion)
    companionStats: {
      type: DataTypes.JSONB,
      field: 'companion_stats',
      defaultValue: null
    },
    // Appearance data
    appearance: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    // Biography/backstory
    biography: {
      type: DataTypes.TEXT
    },
    // Is NPC currently available/alive
    isAvailable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_available'
    },
    // AI personality traits for dynamic dialogue (legacy - kept for backward compatibility)
    personalityTraits: {
      type: DataTypes.JSONB,
      field: 'personality_traits',
      defaultValue: {
        empathy: 50,
        formality: 50,
        humor: 50,
        trust: 50
      }
    },
    // Enhanced personality profile (Phase 1)
    personalityProfile: {
      type: DataTypes.JSONB,
      field: 'personality_profile',
      defaultValue: {
        openness: 50,
        extraversion: 50,
        agreeableness: 50,
        conscientiousness: 50,
        neuroticism: 50,
        forceAlignment: 50,
        authorityRespect: 50,
        riskTolerance: 50,
        directness: 50,
        currentMood: 50,
        stressLevel: 30,
        fatigueLevel: 20
      }
    },
    // Emotional state (Phase 1)
    emotionalState: {
      type: DataTypes.JSONB,
      field: 'emotional_state',
      defaultValue: {
        primaryEmotion: 'neutral',
        emotionIntensity: 0.3,
        lastUpdated: null,
        decayRate: 0.1,
        positiveTriggers: ['quest_completed', 'player_helped'],
        negativeTriggers: ['player_betrayed', 'faction_attacked'],
        recentEvents: []
      }
    },
    // Memory system (Phase 1)
    memory: {
      type: DataTypes.JSONB,
      defaultValue: {
        episodes: [],
        playerKnowledge: {
          traits: [],
          knownFacts: []
        },
        conversationStyle: 'direct'
      }
    },
    // Trust system (Phase 2 - adding now for structure)
    trustSystem: {
      type: DataTypes.JSONB,
      field: 'trust_system',
      defaultValue: {
        trustLevel: 50,
        trustFactors: {
          questsCompleted: 0,
          questsFailed: 0,
          helpProvided: 0,
          harmCaused: 0
        },
        thresholds: {
          shareSecret: 60,
          requestFavor: 50,
          revealWeakness: 70
        },
        lastInteraction: null
      }
    },
    // Contextual awareness (Phase 3 - adding now for structure)
    contextualAwareness: {
      type: DataTypes.JSONB,
      field: 'contextual_awareness',
      defaultValue: {
        timeContext: {
          timeOfDay: 'afternoon',
          dayOfWeek: 1
        },
        locationContext: {
          currentLocation: 'unknown',
          locationSafety: 0.5,
          locationType: 'generic'
        },
        factionContext: {
          localFactionControl: null,
          factionTension: 0.5
        },
        lastUpdated: null
      }
    },
    // Motivations (Phase 2 - adding now for structure)
    motivations: {
      type: DataTypes.JSONB,
      defaultValue: {
        primaryGoal: {
          type: 'survival',
          description: '',
          urgency: 0.5
        },
        immediateNeeds: [],
        fears: [],
        values: []
      }
    }
  }, {
    tableName: 'npcs',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['faction_id']
      },
      {
        fields: ['npc_type']
      },
      {
        fields: ['is_companion']
      }
    ]
  });

  // Class methods
  NPC.findByFaction = function(factionId) {
    return this.findAll({
      where: { factionId, isAvailable: true }
    });
  };

  NPC.findCompanions = function() {
    return this.findAll({
      where: { isCompanion: true, isAvailable: true }
    });
  };

  NPC.findVendors = function() {
    return this.findAll({
      where: { npcType: 'vendor', isAvailable: true }
    });
  };

  NPC.findByLocation = function(planet, area = null, subMapId = null) {
    const Sequelize = require('sequelize');
    const { Op } = Sequelize;
    
    const where = {
      isAvailable: true
    };
    
    // Use Sequelize JSONB operators for proper querying
    const locationConditions = [
      Sequelize.where(
        Sequelize.fn('jsonb_extract_path_text', Sequelize.col('location'), 'planet'),
        planet
      )
    ];
    
    if (area) {
      locationConditions.push(
        Sequelize.where(
          Sequelize.fn('jsonb_extract_path_text', Sequelize.col('location'), 'area'),
          area
        )
      );
    }
    
    if (subMapId) {
      locationConditions.push(
        Sequelize.where(
          Sequelize.fn('jsonb_extract_path_text', Sequelize.col('location'), 'subMapId'),
          subMapId
        )
      );
    }
    
    where[Op.and] = locationConditions;
    
    return this.findAll({ where });
  };

  NPC.findBySubMap = function(subMapId) {
    const Sequelize = require('sequelize');
    
    return this.findAll({
      where: {
        isAvailable: true,
        [Sequelize.Op.and]: [
          Sequelize.where(
            Sequelize.fn('jsonb_extract_path_text', Sequelize.col('location'), 'subMapId'),
            subMapId
          )
        ]
      }
    });
  };

  // Instance methods for personality profile (Phase 1)
  NPC.prototype.getPersonalityTrait = function(traitName) {
    const profile = this.personalityProfile || {};
    // Fallback to legacy personalityTraits for backward compatibility
    if (profile[traitName] !== undefined) {
      return profile[traitName];
    }
    const legacy = this.personalityTraits || {};
    if (legacy[traitName] !== undefined) {
      return legacy[traitName];
    }
    return 50; // Default
  };

  NPC.prototype.hasPersonalityTrait = function(traitName, threshold = 70) {
    return this.getPersonalityTrait(traitName) >= threshold;
  };

  NPC.prototype.getPersonalitySummary = function() {
    const p = this.personalityProfile || {};
    const traits = [];
    if (p.openness > 70) traits.push('curious');
    if (p.extraversion > 70) traits.push('outgoing');
    if (p.agreeableness > 70) traits.push('warm');
    if (p.neuroticism > 70) traits.push('anxious');
    return traits.join(', ') || 'balanced';
  };

  // Instance methods for emotional state (Phase 1)
  NPC.prototype.getEmotion = function() {
    const emotionalState = this.emotionalState || {};
    return {
      emotion: emotionalState.primaryEmotion || 'neutral',
      intensity: emotionalState.emotionIntensity || 0.3
    };
  };

  NPC.prototype.isEmotional = function() {
    return (this.emotionalState?.emotionIntensity || 0) > 0.6;
  };

  // Instance methods for memory (Phase 1)
  NPC.prototype.getSignificantMemories = function(characterId, limit = 3) {
    const episodes = this.memory?.episodes || [];
    return episodes
      .filter(e => e.participants?.includes(characterId))
      .sort((a, b) => (b.significance || 0) - (a.significance || 0))
      .slice(0, limit);
  };

  // Instance methods for trust (Phase 2)
  NPC.prototype.getTrustLevel = function() {
    return this.trustSystem?.trustLevel || 50;
  };

  NPC.prototype.hasTrustThreshold = function(thresholdName) {
    const trust = this.trustSystem || {};
    const threshold = trust.thresholds?.[thresholdName] || 50;
    return this.getTrustLevel() >= threshold;
  };

  NPC.prototype.getTrustTier = function() {
    const trustLevel = this.getTrustLevel();
    if (trustLevel < 20) return 'distrustful';
    if (trustLevel < 40) return 'cautious';
    if (trustLevel < 60) return 'neutral';
    if (trustLevel < 80) return 'trusting';
    return 'very_trusting';
  };

  // Instance methods for motivations (Phase 2)
  NPC.prototype.getPrimaryGoal = function() {
    return this.motivations?.primaryGoal || null;
  };

  NPC.prototype.hasUrgentNeed = function() {
    const needs = this.motivations?.immediateNeeds || [];
    return needs.some(need => need.urgency > 0.8);
  };

  NPC.prototype.getUrgentNeeds = function() {
    const needs = this.motivations?.immediateNeeds || [];
    return needs.filter(need => need.urgency > 0.6).sort((a, b) => (b.urgency || 0) - (a.urgency || 0));
  };

  NPC.prototype.getFears = function() {
    return this.motivations?.fears || [];
  };

  NPC.prototype.getValues = function() {
    return this.motivations?.values || [];
  };

  NPC.prototype.getGoalUrgency = function() {
    return this.motivations?.primaryGoal?.urgency || 0.5;
  };

  return NPC;
};
