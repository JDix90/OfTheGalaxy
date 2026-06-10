/**
 * Migration: Create Discoveries Table
 * Tracks player discoveries of locations, POIs, and hidden areas
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('discoveries', {
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
      planetId: {
        type: Sequelize.STRING(100),
        allowNull: false,
        field: 'planet_id'
      },
      locationType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        field: 'location_type',
        comment: 'poi, city, landmark, hidden_location, scannable_object, fast_travel_point'
      },
      locationId: {
        type: Sequelize.STRING(100),
        allowNull: false,
        field: 'location_id',
        comment: 'Unique identifier for the discovered location'
      },
      locationName: {
        type: Sequelize.STRING(200),
        allowNull: true,
        field: 'location_name',
        comment: 'Display name of the location'
      },
      discoveredAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'discovered_at'
      },
      firstDiscovery: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'first_discovery',
        comment: 'True if this character was the first to discover this location'
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
        comment: 'Additional discovery data (coordinates, description, rewards, etc.)'
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

    // Create unique index to prevent duplicate discoveries
    const indexes = await queryInterface.showIndex('discoveries');
    const hasUniqueIndex = indexes.some(idx => idx.name === 'idx_discoveries_unique');
    if (!hasUniqueIndex) {
      await queryInterface.addIndex('discoveries', ['character_id', 'planet_id', 'location_id'], {
        unique: true,
        name: 'idx_discoveries_unique'
      });
    } else {
      console.warn('  ⚠ Index idx_discoveries_unique already exists, skipping...');
    }

    // Index for querying discoveries by character
    const hasCharacterIdIndex = indexes.some(idx => idx.name === 'discoveries_character_id');
    if (!hasCharacterIdIndex) {
      await queryInterface.addIndex('discoveries', ['character_id']);
    } else {
      console.warn('  ⚠ Index on character_id already exists, skipping...');
    }

    // Index for querying discoveries by planet
    const hasPlanetIdIndex = indexes.some(idx => idx.name === 'discoveries_planet_id');
    if (!hasPlanetIdIndex) {
      await queryInterface.addIndex('discoveries', ['planet_id']);
    } else {
      console.warn('  ⚠ Index on planet_id already exists, skipping...');
    }

    // Index for querying by location type
    const hasLocationTypeIndex = indexes.some(idx => idx.name === 'discoveries_location_type');
    if (!hasLocationTypeIndex) {
      await queryInterface.addIndex('discoveries', ['location_type']);
    } else {
      console.warn('  ⚠ Index on location_type already exists, skipping...');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('discoveries');
  }
};


