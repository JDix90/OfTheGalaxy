/**
 * Migration: Add Item Rarity System
 * Adds rarity, faction requirements, and enhanced stats to items
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, create items table if it doesn't exist
    const tableExists = await queryInterface.sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'items'
      );`
    );

    const exists = tableExists[0][0].exists;

    if (!exists) {
      // Create items table
      await queryInterface.createTable('items', {
        id: {
          type: Sequelize.STRING(100),
          primaryKey: true
        },
        name: {
          type: Sequelize.STRING(200),
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT
        },
        itemType: {
          type: Sequelize.STRING(50),
          allowNull: false,
          field: 'item_type'
        },
        rarity: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'common',
          validate: {
            isIn: [['common', 'uncommon', 'rare', 'epic', 'legendary']]
          }
        },
        factionId: {
          type: Sequelize.STRING(100),
          allowNull: true,
          field: 'faction_id'
        },
        minReputationTier: {
          type: Sequelize.STRING(50),
          allowNull: true,
          field: 'min_reputation_tier'
        },
        stats: {
          type: Sequelize.JSONB,
          defaultValue: {}
        },
        baseValue: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          field: 'base_value'
        },
        weight: {
          type: Sequelize.DECIMAL(5, 2),
          defaultValue: 0,
          validate: {
            min: 0
          }
        },
        stackSize: {
          type: Sequelize.INTEGER,
          defaultValue: 1,
          field: 'stack_size',
          validate: {
            min: 1
          }
        },
        equipmentSlot: {
          type: Sequelize.STRING(50),
          allowNull: true,
          field: 'equipment_slot'
        },
        icon: {
          type: Sequelize.STRING(200),
          allowNull: true
        },
        metadata: {
          type: Sequelize.JSONB,
          defaultValue: {}
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

      // Add indexes
      await queryInterface.addIndex('items', ['item_type']);
      await queryInterface.addIndex('items', ['rarity']);
      await queryInterface.addIndex('items', ['faction_id']);
    } else {
      // Table exists, just add new columns
      // Check if rarity column exists
      const rarityExists = await queryInterface.sequelize.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'items' 
          AND column_name = 'rarity'
        );`
      );

      if (!rarityExists[0][0].exists) {
        // Add rarity column
        await queryInterface.addColumn('items', 'rarity', {
          type: Sequelize.STRING(20),
          allowNull: true,
          defaultValue: 'common'
        });

        // Add faction columns
        await queryInterface.addColumn('items', 'faction_id', {
          type: Sequelize.STRING(100),
          allowNull: true
        });

        await queryInterface.addColumn('items', 'min_reputation_tier', {
          type: Sequelize.STRING(50),
          allowNull: true
        });

        // Update existing items to have rarity
        await queryInterface.sequelize.query(`
          UPDATE items 
          SET rarity = 'common' 
          WHERE rarity IS NULL
        `);

        // Add indexes
        await queryInterface.addIndex('items', ['rarity']);
        await queryInterface.addIndex('items', ['faction_id']);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove columns if they exist
    const rarityExists = await queryInterface.sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'items' 
        AND column_name = 'rarity'
      );`
    );

    if (rarityExists[0][0].exists) {
      // Remove indexes first
      try {
        await queryInterface.removeIndex('items', ['rarity']);
      } catch (e) {
        // Index might not exist
      }
      try {
        await queryInterface.removeIndex('items', ['faction_id']);
      } catch (e) {
        // Index might not exist
      }

      // Remove columns
      await queryInterface.removeColumn('items', 'rarity');
      await queryInterface.removeColumn('items', 'faction_id');
      await queryInterface.removeColumn('items', 'min_reputation_tier');
    }
  }
};



