/**
 * POIInteraction Model
 * Tracks player interactions with Points of Interest (POIs)
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const POIInteraction = sequelize.define('POIInteraction', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    characterId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'character_id',
      references: {
        model: 'player_characters',
        key: 'id'
      }
    },
    planetId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'planet_id'
    },
    poiId: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'poi_id',
      comment: 'Unique identifier for the POI (name or generated ID)'
    },
    poiName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'poi_name'
    },
    poiType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'poi_type',
      comment: 'Type of POI (combat, loot, quest, discovery, fast_travel, etc.)'
    },
    interactionType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'interaction_type',
      validate: {
        isIn: [['combat', 'loot', 'quest', 'discovery', 'fast_travel', 'enter', 'investigate', 'medical', 'harvest']]
      }
    },
    state: {
      type: DataTypes.STRING(50),
      defaultValue: 'undiscovered',
      validate: {
        isIn: [['undiscovered', 'discovered', 'searched', 'completed', 'failed']]
      }
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional interaction data (loot found, quest triggered, etc.)'
    },
    firstInteractionAt: {
      type: DataTypes.DATE,
      field: 'first_interaction_at'
    },
    lastInteractionAt: {
      type: DataTypes.DATE,
      field: 'last_interaction_at'
    },
    interactionCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'interaction_count'
    }
  }, {
    tableName: 'poi_interactions',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['character_id', 'planet_id'] },
      { fields: ['planet_id', 'poi_id'] },
      { fields: ['state'] },
      {
        unique: true,
        fields: ['character_id', 'planet_id', 'poi_id'],
        name: 'idx_poi_interactions_unique'
      }
    ]
  });

  POIInteraction.associate = (models) => {
    POIInteraction.belongsTo(models.PlayerCharacter, {
      foreignKey: 'characterId',
      as: 'character'
    });
  };

  return POIInteraction;
};

