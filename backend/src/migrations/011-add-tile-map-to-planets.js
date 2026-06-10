'use strict';

/**
 * Migration: Add tile_map field to planets table
 * This field caches generated tile maps for navigation
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if column already exists
    const tableDescription = await queryInterface.describeTable('planets');
    
    if (!tableDescription.tile_map) {
      await queryInterface.addColumn('planets', 'tile_map', {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Cached tile map data for navigation'
      });
      console.log('  ✓ Added tile_map column to planets table');
    } else {
      console.log('  ⚠ Column tile_map already exists in planets table, skipping...');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('planets');
    
    if (tableDescription.tile_map) {
      await queryInterface.removeColumn('planets', 'tile_map');
    }
  }
};

