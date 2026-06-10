/**
 * StarSystem Model
 * Represents a star system in the galaxy
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StarSystem = sequelize.define('StarSystem', {
    id: {
      type: DataTypes.STRING(100),
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    region: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    coordinates: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: { x: 0, y: 0 },
      validate: {
        isValidCoordinates(value) {
          if (value === null || value === undefined) {
            throw new Error('Coordinates must be provided');
          }
          if (typeof value.x !== 'number' || typeof value.y !== 'number') {
            throw new Error('Coordinates must have numeric x and y values');
          }
        }
      }
    },
    description: {
      type: DataTypes.TEXT
    },
    factionControl: {
      type: DataTypes.STRING(100),
      field: 'faction_control'
    },
    dangerLevel: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: 'danger_level',
      validate: {
        min: 1,
        max: 10
      }
    },
    economyType: {
      type: DataTypes.STRING(50),
      field: 'economy_type'
    },
    population: {
      type: DataTypes.STRING(50)
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'star_systems',
    timestamps: true,
    underscored: true
  });

  StarSystem.associate = (models) => {
    // A star system has many planets
    StarSystem.hasMany(models.Planet, {
      foreignKey: 'systemId',
      as: 'planets'
    });

    // A star system has many outgoing travel routes
    StarSystem.hasMany(models.TravelRoute, {
      foreignKey: 'fromSystemId',
      as: 'outgoingRoutes'
    });

    // A star system has many incoming travel routes
    StarSystem.hasMany(models.TravelRoute, {
      foreignKey: 'toSystemId',
      as: 'incomingRoutes'
    });
  };

  return StarSystem;
};

