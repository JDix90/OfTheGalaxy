/**
 * Item Model
 * Represents an item in the game
 * Items can be stored in database or loaded from data files
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Item = sequelize.define('Item', {
    id: {
      type: DataTypes.STRING(100),
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    itemType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'item_type',
      validate: {
        isIn: [['weapon', 'armor', 'equipment', 'consumable', 'resource', 'quest_item', 'junk']]
      }
    },
    rarity: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'common',
      validate: {
        isIn: [['common', 'uncommon', 'rare', 'epic', 'legendary']]
      }
    },
    factionId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'faction_id'
    },
    minReputationTier: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'min_reputation_tier',
      validate: {
        isIn: [['neutral', 'friendly', 'trusted', 'allied', 'revered', null]]
      }
    },
    stats: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    baseValue: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'base_value',
      validate: {
        min: 0
      }
    },
    weight: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    stackSize: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: 'stack_size',
      validate: {
        min: 1
      }
    },
    equipmentSlot: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'equipment_slot',
      validate: {
        isIn: [['weapon', 'armor', 'accessory', 'tool', null]]
      }
    },
    icon: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'items',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['item_type']
      },
      {
        fields: ['rarity']
      },
      {
        fields: ['faction_id']
      }
    ]
  });

  // Class methods
  Item.findByRarity = function(rarity) {
    return this.findAll({
      where: { rarity }
    });
  };

  Item.findByFaction = function(factionId) {
    return this.findAll({
      where: { factionId }
    });
  };

  return Item;
};



