/**
 * Sub-Map Model
 * Represents a sub-map for a location (city, building interior, etc.)
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SubMap = sequelize.define('SubMap', {
    id: {
      type: DataTypes.STRING(100),
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['city', 'spaceport', 'market', 'cantina', 'palace', 'temple', 'government', 'base', 'arena', 'mine', 'landscape', 'wilderness', 'danger', 'medical_center', 'hospital', 'settlement', 'province', 'dungeon', 'building_interior']]
      }
    },
    template: {
      type: DataTypes.STRING(50),
      comment: 'Template variant'
    },
    parentLocationId: {
      type: DataTypes.STRING(200),
      field: 'parent_location_id',
      comment: 'ID of parent location'
    },
    parentLocationType: {
      type: DataTypes.STRING(50),
      field: 'parent_location_type',
      comment: 'Type of parent location'
    },
    planetId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'planet_id',
      references: {
        model: 'planets',
        key: 'id'
      }
    },
    layoutData: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      field: 'layout_data'
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'sub_maps',
    timestamps: true,
    underscored: true
  });

  SubMap.associate = (models) => {
    // A sub-map belongs to a planet
    SubMap.belongsTo(models.Planet, {
      foreignKey: 'planetId',
      as: 'planet'
    });
  };

  return SubMap;
};

