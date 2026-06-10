/**
 * Achievement Model
 * Tracks player achievements and milestones
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Achievement = sequelize.define('Achievement', {
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
    achievementType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'achievement_type',
      comment: 'Type of achievement (discovery, combat, exploration, etc.)'
    },
    achievementId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'achievement_id',
      comment: 'Unique identifier for the achievement'
    },
    achievementName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'achievement_name'
    },
    progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Current progress toward achievement'
    },
    target: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Target value to complete achievement'
    },
    completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    completedAt: {
      type: DataTypes.DATE,
      field: 'completed_at'
    },
    rewards: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Rewards for completing achievement (XP, credits, items)'
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional achievement data'
    }
  }, {
    tableName: 'achievements',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['character_id'] },
      { fields: ['achievement_type'] },
      { fields: ['completed'] },
      {
        unique: true,
        fields: ['character_id', 'achievement_id'],
        name: 'idx_achievements_unique'
      }
    ]
  });

  Achievement.associate = (models) => {
    Achievement.belongsTo(models.PlayerCharacter, {
      foreignKey: 'characterId',
      as: 'character'
    });
  };

  return Achievement;
};


