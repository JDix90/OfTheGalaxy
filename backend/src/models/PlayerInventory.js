/**
 * PlayerInventory Model
 * Tracks items in player inventory and equipped items
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PlayerInventory = sequelize.define('PlayerInventory', {
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
    itemId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'item_id'
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      validate: {
        min: 0
      }
    },
    // Is this item currently equipped?
    equipped: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    // Equipment slot (if equipped)
    equipmentSlot: {
      type: DataTypes.STRING(50),
      field: 'equipment_slot',
      validate: {
        isIn: [['weapon', 'armor', 'accessory', 'tool', null]]
      }
    },
    // When item was acquired
    acquiredAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'acquired_at'
    },
    // How item was acquired
    acquiredFrom: {
      type: DataTypes.STRING(200),
      field: 'acquired_from'
    }
  }, {
    tableName: 'player_inventory',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['character_id']
      },
      {
        fields: ['item_id']
      },
      {
        fields: ['equipped']
      }
    ]
  });

  // Instance methods
  PlayerInventory.prototype.equip = async function(slot) {
    // Unequip any item in this slot first
    await PlayerInventory.update(
      { equipped: false, equipmentSlot: null },
      {
        where: {
          characterId: this.characterId,
          equipmentSlot: slot,
          equipped: true
        }
      }
    );
    
    this.equipped = true;
    this.equipmentSlot = slot;
    await this.save();
  };

  PlayerInventory.prototype.unequip = async function() {
    this.equipped = false;
    this.equipmentSlot = null;
    await this.save();
  };

  // Class methods
  PlayerInventory.findForCharacter = function(characterId) {
    return this.findAll({
      where: { characterId },
      order: [['acquired_at', 'DESC']]
    });
  };

  PlayerInventory.findEquipped = function(characterId) {
    return this.findAll({
      where: {
        characterId,
        equipped: true
      }
    });
  };

  PlayerInventory.addItem = async function(characterId, itemId, quantity = 1, acquiredFrom = null, options = {}) {
    const { transaction } = options;
    // Check if item already exists
    const existing = await this.findOne({
      where: {
        characterId,
        itemId,
        equipped: false
      },
      transaction
    });

    if (existing) {
      existing.quantity += quantity;
      await existing.save({ transaction });
      return existing;
    } else {
      return await this.create({
        characterId,
        itemId,
        quantity,
        acquiredFrom
      }, { transaction });
    }
  };

  PlayerInventory.removeItem = async function(characterId, itemId, quantity = 1) {
    const item = await this.findOne({
      where: {
        characterId,
        itemId
      }
    });
    
    if (!item) {
      throw new Error('Item not found in inventory');
    }
    
    if (item.quantity < quantity) {
      throw new Error('Insufficient quantity');
    }
    
    item.quantity -= quantity;
    
    if (item.quantity === 0) {
      await item.destroy();
    } else {
      await item.save();
    }
    
    return item;
  };

  return PlayerInventory;
};
