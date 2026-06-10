/**
 * Migration: Create RPG Core Tables
 * Creates all new tables for the RPG system
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create player_characters table
    await queryInterface.createTable('player_characters', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      species: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      background: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      level: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      xp: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      skill_points: {
        type: Sequelize.INTEGER,
        defaultValue: 5
      },
      attribute_points: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      stats: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      skills: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      current_planet: {
        type: Sequelize.STRING(100),
        defaultValue: 'chandrila'
      },
      current_location: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      appearance: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      credits: {
        type: Sequelize.INTEGER,
        defaultValue: 1000
      },
      current_health: {
        type: Sequelize.INTEGER,
        defaultValue: 100
      },
      max_health: {
        type: Sequelize.INTEGER,
        defaultValue: 100
      },
      current_stamina: {
        type: Sequelize.INTEGER,
        defaultValue: 100
      },
      max_stamina: {
        type: Sequelize.INTEGER,
        defaultValue: 100
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create quests table
    await queryInterface.createTable('quests', {
      id: {
        type: Sequelize.STRING(100),
        primaryKey: true
      },
      faction_id: {
        type: Sequelize.STRING(100)
      },
      quest_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      short_description: {
        type: Sequelize.STRING(500)
      },
      prerequisites: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      objectives: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      rewards: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      quest_giver_id: {
        type: Sequelize.STRING(100)
      },
      start_location: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      estimated_time: {
        type: Sequelize.INTEGER,
        defaultValue: 30
      },
      difficulty: {
        type: Sequelize.STRING(20)
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      chain_id: {
        type: Sequelize.STRING(100)
      },
      chain_order: {
        type: Sequelize.INTEGER
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create quest_progress table
    await queryInterface.createTable('quest_progress', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      character_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'player_characters',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      quest_id: {
        type: Sequelize.STRING(100),
        allowNull: false,
        references: {
          model: 'quests',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'active'
      },
      objectives_completed: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      objective_progress: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      started_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      completed_at: {
        type: Sequelize.DATE
      },
      choices: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      notes: {
        type: Sequelize.TEXT
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create npcs table
    await queryInterface.createTable('npcs', {
      id: {
        type: Sequelize.STRING(100),
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      species: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      occupation: {
        type: Sequelize.STRING(100)
      },
      faction_id: {
        type: Sequelize.STRING(100)
      },
      location: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      npc_type: {
        type: Sequelize.STRING(50)
      },
      is_companion: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      dialogue: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      quests: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      vendor_inventory: {
        type: Sequelize.JSONB
      },
      companion_abilities: {
        type: Sequelize.JSONB
      },
      companion_stats: {
        type: Sequelize.JSONB
      },
      appearance: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      biography: {
        type: Sequelize.TEXT
      },
      is_available: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      personality_traits: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create npc_relationships table
    await queryInterface.createTable('npc_relationships', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      character_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'player_characters',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      npc_id: {
        type: Sequelize.STRING(100),
        allowNull: false,
        references: {
          model: 'npcs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      relationship_level: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      conversation_history: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      last_interaction: {
        type: Sequelize.DATE
      },
      interaction_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      is_recruited: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      notes: {
        type: Sequelize.TEXT
      },
      discovered_info: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create player_inventory table
    await queryInterface.createTable('player_inventory', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      character_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'player_characters',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      item_id: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      quantity: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      equipped: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      equipment_slot: {
        type: Sequelize.STRING(50)
      },
      acquired_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      acquired_from: {
        type: Sequelize.STRING(200)
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add indexes (with error handling for existing indexes)
    const addIndexIfNotExists = async (tableName, fields, options = {}) => {
      try {
        await queryInterface.addIndex(tableName, fields, options);
      } catch (error) {
        // Index already exists, skip
        if (error.message && error.message.includes('already exists')) {
          console.log(`  ⚠ Index on ${tableName}(${fields.join(', ')}) already exists, skipping...`);
        } else {
          throw error;
        }
      }
    };

    await addIndexIfNotExists('player_characters', ['user_id']);
    await addIndexIfNotExists('player_characters', ['level']);
    
    await addIndexIfNotExists('quests', ['faction_id']);
    await addIndexIfNotExists('quests', ['quest_type']);
    await addIndexIfNotExists('quests', ['chain_id', 'chain_order']);
    
    await addIndexIfNotExists('quest_progress', ['character_id']);
    await addIndexIfNotExists('quest_progress', ['quest_id']);
    await addIndexIfNotExists('quest_progress', ['status']);
    await addIndexIfNotExists('quest_progress', ['character_id', 'quest_id'], { unique: true });
    
    await addIndexIfNotExists('npcs', ['faction_id']);
    await addIndexIfNotExists('npcs', ['npc_type']);
    await addIndexIfNotExists('npcs', ['is_companion']);
    
    await addIndexIfNotExists('npc_relationships', ['character_id']);
    await addIndexIfNotExists('npc_relationships', ['npc_id']);
    await addIndexIfNotExists('npc_relationships', ['character_id', 'npc_id'], { unique: true });
    
    await addIndexIfNotExists('player_inventory', ['character_id']);
    await addIndexIfNotExists('player_inventory', ['item_id']);
    await addIndexIfNotExists('player_inventory', ['equipped']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('player_inventory');
    await queryInterface.dropTable('npc_relationships');
    await queryInterface.dropTable('npcs');
    await queryInterface.dropTable('quest_progress');
    await queryInterface.dropTable('quests');
    await queryInterface.dropTable('player_characters');
  }
};
