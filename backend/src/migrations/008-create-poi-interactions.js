'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('poi_interactions', {
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
      poiId: {
        type: Sequelize.STRING(200),
        allowNull: false,
        field: 'poi_id',
        comment: 'Unique identifier for the POI (name or generated ID)'
      },
      poiName: {
        type: Sequelize.STRING(200),
        allowNull: false,
        field: 'poi_name'
      },
      poiType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        field: 'poi_type',
        comment: 'Type of POI (combat, loot, quest, discovery, fast_travel, etc.)'
      },
      interactionType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        field: 'interaction_type',
        validate: {
          isIn: [['combat', 'loot', 'quest', 'discovery', 'fast_travel', 'enter', 'investigate']]
        }
      },
      state: {
        type: Sequelize.STRING(50),
        defaultValue: 'undiscovered',
        validate: {
          isIn: [['undiscovered', 'discovered', 'searched', 'completed', 'failed']]
        }
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
        comment: 'Additional interaction data (loot found, quest triggered, etc.)'
      },
      firstInteractionAt: {
        type: Sequelize.DATE,
        field: 'first_interaction_at'
      },
      lastInteractionAt: {
        type: Sequelize.DATE,
        field: 'last_interaction_at'
      },
      interactionCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'interaction_count'
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
    const indexes = [
      {
        name: 'idx_poi_interactions_character_planet',
        fields: ['character_id', 'planet_id']
      },
      {
        name: 'idx_poi_interactions_poi',
        fields: ['planet_id', 'poi_id']
      },
      {
        name: 'idx_poi_interactions_state',
        fields: ['state']
      },
      {
        unique: true,
        name: 'idx_poi_interactions_unique',
        fields: ['character_id', 'planet_id', 'poi_id']
      }
    ];

    for (const index of indexes) {
      try {
        await queryInterface.addIndex('poi_interactions', index.fields, {
          unique: index.unique || false,
          name: index.name
        });
      } catch (error) {
        if (error.message && error.message.includes('already exists')) {
          console.warn(`Index ${index.name} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('poi_interactions');
  }
};


