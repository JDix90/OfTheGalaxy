/**
 * Migration: Create Sub-Map Tables
 * Creates table for location sub-maps (cities, buildings, interiors, etc.)
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create sub_maps table
    await queryInterface.createTable('sub_maps', {
      id: {
        type: Sequelize.STRING(100),
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'city, spaceport, market, cantina, palace, temple, government, base, etc.'
      },
      template: {
        type: Sequelize.STRING(50),
        comment: 'Template variant (e.g., large_city, small_spaceport)'
      },
      parent_location_id: {
        type: Sequelize.STRING(200),
        comment: 'ID of parent location (city name, POI name, etc.)'
      },
      parent_location_type: {
        type: Sequelize.STRING(50),
        comment: 'Type of parent (city, poi, market, building)'
      },
      planet_id: {
        type: Sequelize.STRING(100),
        allowNull: false,
        references: {
          model: 'planets',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      layout_data: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
        comment: 'Complete layout structure (zones, buildings, entry/exit points, etc.)'
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
        comment: 'Additional metadata (description, lore, faction, restrictions, etc.)'
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

    // Create indexes for efficient queries
    await queryInterface.addIndex('sub_maps', ['planet_id'], {
      name: 'idx_sub_maps_planet_id'
    });

    await queryInterface.addIndex('sub_maps', ['parent_location_id', 'parent_location_type'], {
      name: 'idx_sub_maps_parent_location'
    });

    await queryInterface.addIndex('sub_maps', ['type'], {
      name: 'idx_sub_maps_type'
    });

    // Composite index for common queries
    await queryInterface.addIndex('sub_maps', ['planet_id', 'parent_location_id', 'type'], {
      name: 'idx_sub_maps_planet_parent_type'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('sub_maps');
  }
};


