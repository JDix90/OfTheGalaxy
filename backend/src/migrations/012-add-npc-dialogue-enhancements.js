'use strict';

/**
 * Migration: Add NPC Dialogue Enhancement Fields
 * Adds personality_profile, emotional_state, memory, trust_system, and contextual_awareness columns
 * Part of Phase 1: Foundation & Quick Wins
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('npcs');
    
    // Add personality_profile column
    if (!tableDescription.personality_profile) {
      await queryInterface.addColumn('npcs', 'personality_profile', {
        type: Sequelize.JSONB,
        allowNull: true,
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
        },
        comment: 'Enhanced personality profile with Big Five traits and Star Wars context'
      });
      console.log('  ✓ Added personality_profile column to npcs table');
    }

    // Add emotional_state column
    if (!tableDescription.emotional_state) {
      await queryInterface.addColumn('npcs', 'emotional_state', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {
          primaryEmotion: 'neutral',
          emotionIntensity: 0.3,
          lastUpdated: null,
          decayRate: 0.1,
          positiveTriggers: ['quest_completed', 'player_helped'],
          negativeTriggers: ['player_betrayed', 'faction_attacked'],
          recentEvents: []
        },
        comment: 'Dynamic emotional state with decay and event tracking'
      });
      console.log('  ✓ Added emotional_state column to npcs table');
    }

    // Add memory column
    if (!tableDescription.memory) {
      await queryInterface.addColumn('npcs', 'memory', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {
          episodes: [],
          playerKnowledge: {
            traits: [],
            knownFacts: []
          },
          conversationStyle: 'direct'
        },
        comment: 'NPC memory system for episodic and semantic memory'
      });
      console.log('  ✓ Added memory column to npcs table');
    }

    // Add trust_system column
    if (!tableDescription.trust_system) {
      await queryInterface.addColumn('npcs', 'trust_system', {
        type: Sequelize.JSONB,
        allowNull: true,
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
        },
        comment: 'Trust system separate from relationship level'
      });
      console.log('  ✓ Added trust_system column to npcs table');
    }

    // Add contextual_awareness column
    if (!tableDescription.contextual_awareness) {
      await queryInterface.addColumn('npcs', 'contextual_awareness', {
        type: Sequelize.JSONB,
        allowNull: true,
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
        },
        comment: 'Contextual awareness for time, location, and faction state'
      });
      console.log('  ✓ Added contextual_awareness column to npcs table');
    }

    // Add motivations column (for Phase 2, but adding now for completeness)
    if (!tableDescription.motivations) {
      await queryInterface.addColumn('npcs', 'motivations', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {
          primaryGoal: {
            type: 'survival',
            description: '',
            urgency: 0.5
          },
          immediateNeeds: [],
          fears: [],
          values: []
        },
        comment: 'NPC motivations and goals (Phase 2)'
      });
      console.log('  ✓ Added motivations column to npcs table');
    }

    // Create GIN indexes for JSONB columns for better query performance
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_npcs_personality_profile 
        ON npcs USING GIN (personality_profile);
      `);
      console.log('  ✓ Created index on personality_profile');

      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_npcs_emotional_state 
        ON npcs USING GIN (emotional_state);
      `);
      console.log('  ✓ Created index on emotional_state');

      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_npcs_memory 
        ON npcs USING GIN (memory);
      `);
      console.log('  ✓ Created index on memory');
    } catch (error) {
      // Indexes might already exist, that's okay
      console.log('  ⚠ Index creation skipped (may already exist)');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('npcs');
    
    // Remove indexes first
    try {
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS idx_npcs_personality_profile;
      `);
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS idx_npcs_emotional_state;
      `);
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS idx_npcs_memory;
      `);
    } catch (error) {
      // Ignore errors
    }

    // Remove columns
    if (tableDescription.personality_profile) {
      await queryInterface.removeColumn('npcs', 'personality_profile');
    }
    if (tableDescription.emotional_state) {
      await queryInterface.removeColumn('npcs', 'emotional_state');
    }
    if (tableDescription.memory) {
      await queryInterface.removeColumn('npcs', 'memory');
    }
    if (tableDescription.trust_system) {
      await queryInterface.removeColumn('npcs', 'trust_system');
    }
    if (tableDescription.contextual_awareness) {
      await queryInterface.removeColumn('npcs', 'contextual_awareness');
    }
    if (tableDescription.motivations) {
      await queryInterface.removeColumn('npcs', 'motivations');
    }
  }
};








