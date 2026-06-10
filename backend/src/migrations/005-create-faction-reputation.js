/**
 * Migration: Create Faction Reputation Table
 * Tracks player reputation with various factions
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('faction_reputation', {
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
      factionId: {
        type: Sequelize.STRING(100),
        allowNull: false,
        field: 'faction_id'
      },
      reputation: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        validate: {
          min: -1000,
          max: 10000
        }
      },
      tier: {
        type: Sequelize.STRING(50),
        defaultValue: 'neutral',
        validate: {
          isIn: [['hated', 'hostile', 'unfriendly', 'neutral', 'friendly', 'honored', 'exalted']]
        }
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

    // Unique constraint: one reputation record per character per faction
    try {
      await queryInterface.addIndex('faction_reputation', ['character_id', 'faction_id'], {
        unique: true,
        name: 'idx_faction_rep_character_faction'
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('  ⚠ Index idx_faction_rep_character_faction already exists, skipping...');
      } else {
        throw error;
      }
    }

    // Index for quick lookups
    try {
      await queryInterface.addIndex('faction_reputation', ['character_id']);
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('  ⚠ Index on character_id already exists, skipping...');
      } else {
        throw error;
      }
    }

    try {
      await queryInterface.addIndex('faction_reputation', ['faction_id']);
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('  ⚠ Index on faction_id already exists, skipping...');
      } else {
        throw error;
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('faction_reputation');
  }
};

