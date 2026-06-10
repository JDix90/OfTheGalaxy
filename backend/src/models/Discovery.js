/**
 * Discovery Model
 * Tracks player discoveries of locations, POIs, and hidden areas
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Discovery = sequelize.define('Discovery', {
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
    locationType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'location_type',
      validate: {
        isIn: [['poi', 'city', 'landmark', 'hidden_location', 'scannable_object', 'fast_travel_point', 'sub_map']]
      }
    },
    locationId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'location_id'
    },
    locationName: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: 'location_name'
    },
    discoveredAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'discovered_at'
    },
    firstDiscovery: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'first_discovery'
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional discovery data (coordinates, description, rewards, etc.)'
    }
  }, {
    tableName: 'discoveries',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['character_id', 'planet_id', 'location_id'],
        name: 'idx_discoveries_unique'
      },
      {
        fields: ['character_id']
      },
      {
        fields: ['planet_id']
      },
      {
        fields: ['location_type']
      }
    ]
  });

  Discovery.associate = (models) => {
    Discovery.belongsTo(models.PlayerCharacter, { foreignKey: 'characterId', as: 'character' });
  };

  return Discovery;
};


