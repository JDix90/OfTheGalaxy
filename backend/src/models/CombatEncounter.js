/**
 * CombatEncounter Model
 * Stores active and completed combat encounters
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CombatEncounter = sequelize.define('CombatEncounter', {
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
    encounterType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'encounter_type',
      validate: {
        isIn: [['random', 'quest', 'scripted', 'bounty', 'poi', 'dungeon']]
      }
    },
    combatants: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Array of combatant objects with stats'
    },
    turnOrder: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: 'turn_order',
      comment: 'Array of combatant IDs in initiative order'
    },
    currentTurn: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'current_turn',
      comment: 'Index into turnOrder array'
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'won', 'lost', 'fled']]
      }
    },
    startedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'started_at'
    },
    endedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'ended_at'
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional encounter metadata (subMapId for dungeons, etc.)'
    }
  }, {
    tableName: 'combat_encounters',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['character_id'] },
      { fields: ['status'] },
      { fields: ['encounter_type'] }
    ]
  });

  CombatEncounter.associate = (models) => {
    CombatEncounter.belongsTo(models.PlayerCharacter, {
      foreignKey: 'characterId',
      as: 'character'
    });
  };

  return CombatEncounter;
};


