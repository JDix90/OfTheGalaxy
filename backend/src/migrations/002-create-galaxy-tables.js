/**
 * Migration: Create Galaxy Map Tables
 * Creates tables for star systems, planets, and travel routes
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create star_systems table
    await queryInterface.createTable('star_systems', {
      id: {
        type: Sequelize.STRING(100),
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      region: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      coordinates: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: { x: 0, y: 0 }
      },
      description: {
        type: Sequelize.TEXT
      },
      faction_control: {
        type: Sequelize.STRING(100),
        comment: 'Primary faction controlling this system'
      },
      danger_level: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        validate: {
          min: 1,
          max: 10
        },
        comment: '1 = Safe, 10 = Extremely Dangerous'
      },
      economy_type: {
        type: Sequelize.STRING(50),
        comment: 'agricultural, industrial, trade, mining, research, etc.'
      },
      population: {
        type: Sequelize.STRING(50),
        comment: 'sparse, moderate, dense, urban, etc.'
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
        comment: 'Additional system-specific data'
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

    // Create planets table
    await queryInterface.createTable('planets', {
      id: {
        type: Sequelize.STRING(100),
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      system_id: {
        type: Sequelize.STRING(100),
        allowNull: false,
        references: {
          model: 'star_systems',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      planet_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'terrestrial, gas_giant, ice, desert, ocean, etc.'
      },
      climate: {
        type: Sequelize.STRING(50),
        comment: 'temperate, arid, tropical, frozen, etc.'
      },
      terrain: {
        type: Sequelize.TEXT,
        comment: 'Description of planet terrain'
      },
      atmosphere: {
        type: Sequelize.STRING(50),
        comment: 'breathable, toxic, thin, none, etc.'
      },
      gravity: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 1.0,
        comment: 'Relative to standard gravity'
      },
      day_length: {
        type: Sequelize.INTEGER,
        comment: 'Hours in a day'
      },
      year_length: {
        type: Sequelize.INTEGER,
        comment: 'Days in a year'
      },
      population: {
        type: Sequelize.BIGINT,
        defaultValue: 0
      },
      major_cities: {
        type: Sequelize.JSONB,
        defaultValue: [],
        comment: 'Array of major city names'
      },
      points_of_interest: {
        type: Sequelize.JSONB,
        defaultValue: [],
        comment: 'Array of POI objects with name, type, description'
      },
      resources: {
        type: Sequelize.JSONB,
        defaultValue: [],
        comment: 'Available resources on this planet'
      },
      faction_control: {
        type: Sequelize.STRING(100),
        comment: 'Primary faction controlling this planet'
      },
      danger_level: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        validate: {
          min: 1,
          max: 10
        }
      },
      landing_zones: {
        type: Sequelize.JSONB,
        defaultValue: [],
        comment: 'Available landing zones with coordinates'
      },
      description: {
        type: Sequelize.TEXT
      },
      lore: {
        type: Sequelize.TEXT,
        comment: 'Extended lore and history'
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
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

    // Create travel_routes table (hyperlanes/connections between systems)
    await queryInterface.createTable('travel_routes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      from_system_id: {
        type: Sequelize.STRING(100),
        allowNull: false,
        references: {
          model: 'star_systems',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      to_system_id: {
        type: Sequelize.STRING(100),
        allowNull: false,
        references: {
          model: 'star_systems',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      route_type: {
        type: Sequelize.STRING(50),
        defaultValue: 'hyperlane',
        comment: 'hyperlane, trade_route, secret_route, etc.'
      },
      travel_time: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        comment: 'Travel time in hours'
      },
      cost: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Cost in credits to travel this route'
      },
      requirements: {
        type: Sequelize.JSONB,
        defaultValue: {},
        comment: 'Requirements to use this route (level, faction rep, etc.)'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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

    // Create indexes for better query performance (check if they exist first)
    const checkIndexExists = async (indexName) => {
      const [results] = await queryInterface.sequelize.query(
        `SELECT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE indexname = '${indexName}'
        ) as exists;`
      );
      return results[0].exists;
    };

    // Create indexes only if they don't exist
    if (!(await checkIndexExists('idx_planets_system_id'))) {
      await queryInterface.addIndex('planets', ['system_id'], {
        name: 'idx_planets_system_id'
      });
    }

    if (!(await checkIndexExists('idx_planets_faction_control'))) {
      await queryInterface.addIndex('planets', ['faction_control'], {
        name: 'idx_planets_faction_control'
      });
    }

    if (!(await checkIndexExists('idx_travel_routes_from'))) {
      await queryInterface.addIndex('travel_routes', ['from_system_id'], {
        name: 'idx_travel_routes_from'
      });
    }

    if (!(await checkIndexExists('idx_travel_routes_to'))) {
      await queryInterface.addIndex('travel_routes', ['to_system_id'], {
        name: 'idx_travel_routes_to'
      });
    }

    // Add unique constraint for travel routes (prevent duplicate routes)
    if (!(await checkIndexExists('idx_travel_routes_unique'))) {
      await queryInterface.addIndex('travel_routes', ['from_system_id', 'to_system_id'], {
        unique: true,
        name: 'idx_travel_routes_unique'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('travel_routes');
    await queryInterface.dropTable('planets');
    await queryInterface.dropTable('star_systems');
  }
};

