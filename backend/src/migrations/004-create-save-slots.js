/**
 * Migration: Create Save Slots Table
 * Creates table for game save slots
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('save_slots', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'user_id',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
      slotNumber: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'slot_number',
        validate: {
          min: 1,
          max: 5
        }
      },
      saveName: {
        type: Sequelize.STRING(100),
        field: 'save_name',
        allowNull: true
      },
      saveData: {
        type: Sequelize.JSONB,
        allowNull: false,
        field: 'save_data',
        comment: 'Complete game state snapshot'
      },
      playtime: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Total playtime in seconds'
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

    // Unique constraint: one save per user per slot
    // Check if index exists before creating
    try {
      await queryInterface.addIndex('save_slots', ['user_id', 'slot_number'], {
        unique: true,
        name: 'idx_save_slots_user_slot'
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('  ⚠ Index idx_save_slots_user_slot already exists, skipping...');
      } else {
        throw error;
      }
    }

    // Index for quick lookups
    try {
      await queryInterface.addIndex('save_slots', ['character_id']);
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('  ⚠ Index on character_id already exists, skipping...');
      } else {
        throw error;
      }
    }

    try {
      await queryInterface.addIndex('save_slots', ['user_id']);
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('  ⚠ Index on user_id already exists, skipping...');
      } else {
        throw error;
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('save_slots');
  }
};

