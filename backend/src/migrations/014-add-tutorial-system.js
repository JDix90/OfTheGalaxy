'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('Running migration: Add Tutorial System');
    
    // Create tutorial_progress table
    await queryInterface.createTable('tutorial_progress', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      character_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'player_characters',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      tutorial_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        defaultValue: 'tutorial_001_dockside_initiation'
      },
      state: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: 'not_started'
      },
      completed_states: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: []
      },
      milestones: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      skipped: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    
    console.log('  ✓ Created tutorial_progress table');
    
    // Add unique constraint
    await queryInterface.addConstraint('tutorial_progress', {
      fields: ['character_id', 'tutorial_id'],
      type: 'unique',
      name: 'unique_character_tutorial'
    });
    
    console.log('  ✓ Added unique constraint on character_id + tutorial_id');
    
    // Add indexes
    await queryInterface.addIndex('tutorial_progress', ['character_id'], {
      name: 'idx_tutorial_progress_character_id'
    });
    
    await queryInterface.addIndex('tutorial_progress', ['tutorial_id'], {
      name: 'idx_tutorial_progress_tutorial_id'
    });
    
    await queryInterface.addIndex('tutorial_progress', ['state'], {
      name: 'idx_tutorial_progress_state'
    });
    
    console.log('  ✓ Added indexes to tutorial_progress table');
    
    // Add tutorial columns to player_characters table
    const tableDescription = await queryInterface.describeTable('player_characters');
    
    if (!tableDescription.tutorial_completed) {
      await queryInterface.addColumn('player_characters', 'tutorial_completed', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the player has completed the tutorial'
      });
      console.log('  ✓ Added tutorial_completed column to player_characters table');
    } else {
      console.log('  ⚠ Column tutorial_completed already exists in player_characters table, skipping...');
    }
    
    if (!tableDescription.tutorial_quest_id) {
      await queryInterface.addColumn('player_characters', 'tutorial_quest_id', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'ID of the tutorial quest assigned to this character'
      });
      console.log('  ✓ Added tutorial_quest_id column to player_characters table');
    } else {
      console.log('  ⚠ Column tutorial_quest_id already exists in player_characters table, skipping...');
    }
    
    console.log('Migration completed: Add Tutorial System');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('Rolling back migration: Add Tutorial System');
    
    // Drop tutorial_progress table
    await queryInterface.dropTable('tutorial_progress');
    console.log('  ✓ Dropped tutorial_progress table');
    
    // Remove columns from player_characters
    const tableDescription = await queryInterface.describeTable('player_characters');
    
    if (tableDescription.tutorial_completed) {
      await queryInterface.removeColumn('player_characters', 'tutorial_completed');
      console.log('  ✓ Removed tutorial_completed column from player_characters table');
    }
    
    if (tableDescription.tutorial_quest_id) {
      await queryInterface.removeColumn('player_characters', 'tutorial_quest_id');
      console.log('  ✓ Removed tutorial_quest_id column from player_characters table');
    }
    
    console.log('Rollback completed: Add Tutorial System');
  }
};








