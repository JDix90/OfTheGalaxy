/**
 * Faction Reputation Model
 * Tracks player reputation with various factions
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FactionReputation = sequelize.define('FactionReputation', {
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
    factionId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'faction_id'
    },
    reputation: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: -1000,
        max: 10000
      }
    },
    tier: {
      type: DataTypes.STRING(50),
      defaultValue: 'neutral',
      validate: {
        isIn: [['hated', 'hostile', 'unfriendly', 'neutral', 'friendly', 'honored', 'exalted']]
      }
    }
  }, {
    tableName: 'faction_reputation',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['character_id', 'faction_id'],
        name: 'idx_faction_rep_character_faction'
      },
      {
        fields: ['character_id']
      },
      {
        fields: ['faction_id']
      }
    ]
  });

  return FactionReputation;
};


