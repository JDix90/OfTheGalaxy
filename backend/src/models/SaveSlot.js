/**
 * SaveSlot Model
 * Tracks game save slots
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SaveSlot = sequelize.define('SaveSlot', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
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
    slotNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'slot_number',
      validate: {
        min: 1,
        max: 5
      }
    },
    saveName: {
      type: DataTypes.STRING(100),
      field: 'save_name',
      allowNull: true
    },
    saveData: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: 'save_data'
    },
    playtime: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'save_slots',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'slot_number'],
        name: 'idx_save_slots_user_slot'
      },
      {
        fields: ['character_id']
      },
      {
        fields: ['user_id']
      }
    ]
  });

  return SaveSlot;
};


