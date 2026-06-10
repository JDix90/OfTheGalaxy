/**
 * Planet Model
 * Represents a planet within a star system
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Planet = sequelize.define('Planet', {
    id: {
      type: DataTypes.STRING(100),
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    systemId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'system_id',
      references: {
        model: 'star_systems',
        key: 'id'
      }
    },
    planetType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'planet_type',
      validate: {
        isIn: [['terrestrial', 'gas_giant', 'ice', 'desert', 'ocean', 'jungle', 'volcanic', 'barren', 'urban']]
      }
    },
    climate: {
      type: DataTypes.STRING(50),
      validate: {
        isIn: [['temperate', 'arid', 'tropical', 'frozen', 'toxic', 'variable', null]]
      }
    },
    terrain: {
      type: DataTypes.TEXT
    },
    atmosphere: {
      type: DataTypes.STRING(50),
      validate: {
        isIn: [['breathable', 'toxic', 'thin', 'none', 'dense', null]]
      }
    },
    gravity: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 1.0,
      validate: {
        min: 0.1,
        max: 5.0
      }
    },
    dayLength: {
      type: DataTypes.INTEGER,
      field: 'day_length',
      comment: 'Hours in a day'
    },
    yearLength: {
      type: DataTypes.INTEGER,
      field: 'year_length',
      comment: 'Days in a year'
    },
    population: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    majorCities: {
      type: DataTypes.JSONB,
      defaultValue: [],
      field: 'major_cities'
    },
    pointsOfInterest: {
      type: DataTypes.JSONB,
      defaultValue: [],
      field: 'points_of_interest',
      validate: {
        isValidPOI(value) {
          if (!Array.isArray(value)) {
            throw new Error('Points of interest must be an array');
          }
        }
      }
    },
    resources: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    tileMap: {
      type: DataTypes.JSONB,
      field: 'tile_map',
      comment: 'Cached tile map data for navigation'
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
    landingZones: {
      type: DataTypes.JSONB,
      defaultValue: [],
      field: 'landing_zones',
      validate: {
        isValidLandingZones(value) {
          if (!Array.isArray(value)) {
            throw new Error('Landing zones must be an array');
          }
        }
      }
    },
    description: {
      type: DataTypes.TEXT
    },
    lore: {
      type: DataTypes.TEXT
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'planets',
    timestamps: true,
    underscored: true
  });

  Planet.associate = (models) => {
    // A planet belongs to a star system
    Planet.belongsTo(models.StarSystem, {
      foreignKey: 'systemId',
      as: 'system'
    });
    
    // A planet has many sub-maps
    Planet.hasMany(models.SubMap, {
      foreignKey: 'planetId',
      as: 'subMaps'
    });
  };

  return Planet;
};

