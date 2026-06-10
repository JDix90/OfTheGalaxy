/**
 * Migration: Create Combat Tables
 * Creates tables for combat encounters and combat actions
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create combat_encounters table
    await queryInterface.createTable('combat_encounters', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      characterId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'character_id',
        references: {
          model: 'player_characters',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      encounterType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        field: 'encounter_type',
        comment: 'random, quest, scripted, bounty, poi'
      },
      combatants: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Array of combatant objects with stats'
      },
      turnOrder: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
        field: 'turn_order',
        comment: 'Array of combatant IDs in initiative order'
      },
      currentTurn: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'current_turn',
        comment: 'Index into turnOrder array'
      },
      status: {
        type: Sequelize.STRING(50),
        defaultValue: 'active',
        validate: {
          isIn: [['active', 'won', 'lost', 'fled']]
        },
        comment: 'Combat encounter status'
      },
      startedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'started_at'
      },
      endedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'ended_at'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'updated_at'
      }
    });

    // Create indexes
    await queryInterface.addIndex('combat_encounters', ['character_id'], {
      name: 'idx_combat_encounters_character_id'
    });
    await queryInterface.addIndex('combat_encounters', ['status'], {
      name: 'idx_combat_encounters_status'
    });
    await queryInterface.addIndex('combat_encounters', ['encounter_type'], {
      name: 'idx_combat_encounters_type'
    });

    // Create combat_actions table (optional, for history/debugging)
    await queryInterface.createTable('combat_actions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      encounterId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'encounter_id',
        references: {
          model: 'combat_encounters',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      combatantId: {
        type: Sequelize.STRING(100),
        allowNull: false,
        field: 'combatant_id',
        comment: 'ID of the combatant performing the action'
      },
      actionType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        field: 'action_type',
        comment: 'attack, defend, use_item, ability, flee'
      },
      targetId: {
        type: Sequelize.STRING(100),
        allowNull: true,
        field: 'target_id',
        comment: 'ID of the target (if applicable)'
      },
      actionData: {
        type: Sequelize.JSONB,
        defaultValue: {},
        field: 'action_data',
        comment: 'Additional action data (damage, effects, etc.)'
      },
      turnNumber: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'turn_number',
        comment: 'Turn number when action was performed'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'created_at'
      }
    });

    // Create indexes for combat_actions
    await queryInterface.addIndex('combat_actions', ['encounter_id'], {
      name: 'idx_combat_actions_encounter_id'
    });
    await queryInterface.addIndex('combat_actions', ['combatant_id'], {
      name: 'idx_combat_actions_combatant_id'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('combat_actions');
    await queryInterface.dropTable('combat_encounters');
  }
};


