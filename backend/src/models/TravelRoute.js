/**
 * TravelRoute Model
 * Represents travel routes (hyperlanes) between star systems
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TravelRoute = sequelize.define('TravelRoute', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    fromSystemId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'from_system_id',
      references: {
        model: 'star_systems',
        key: 'id'
      }
    },
    toSystemId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'to_system_id',
      references: {
        model: 'star_systems',
        key: 'id'
      }
    },
    routeType: {
      type: DataTypes.STRING(50),
      defaultValue: 'hyperlane',
      field: 'route_type',
      validate: {
        isIn: [['hyperlane', 'trade_route', 'secret_route', 'military_route']]
      }
    },
    travelTime: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: 'travel_time',
      validate: {
        min: 1
      },
      comment: 'Travel time in hours'
    },
    cost: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Cost in credits'
    },
    requirements: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Requirements to use this route'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  }, {
    tableName: 'travel_routes',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['from_system_id', 'to_system_id'],
        name: 'idx_travel_routes_unique'
      }
    ]
  });

  TravelRoute.associate = (models) => {
    // A route goes from one system
    TravelRoute.belongsTo(models.StarSystem, {
      foreignKey: 'fromSystemId',
      as: 'fromSystem'
    });

    // A route goes to another system
    TravelRoute.belongsTo(models.StarSystem, {
      foreignKey: 'toSystemId',
      as: 'toSystem'
    });
  };

  return TravelRoute;
};


