/**
 * QuestProgress Model
 * Tracks individual player progress on quests
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const QuestProgress = sequelize.define('QuestProgress', {
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
    questId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'quest_id',
      references: {
        model: 'quests',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'completed', 'failed', 'abandoned']]
      }
    },
    // Track which objectives are completed
    objectivesCompleted: {
      type: DataTypes.JSONB,
      defaultValue: {},
      field: 'objectives_completed'
    },
    // Track objective progress (e.g., "collect 5 items" -> {item_count: 3})
    objectiveProgress: {
      type: DataTypes.JSONB,
      defaultValue: {},
      field: 'objective_progress'
    },
    // When quest was started
    startedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'started_at'
    },
    // When quest was completed/failed
    completedAt: {
      type: DataTypes.DATE,
      field: 'completed_at'
    },
    // Player choices made during quest
    choices: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    // Notes or journal entries
    notes: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'quest_progress',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['character_id']
      },
      {
        fields: ['quest_id']
      },
      {
        fields: ['status']
      },
      {
        unique: true,
        fields: ['character_id', 'quest_id']
      }
    ]
  });

  // Instance methods
  QuestProgress.prototype.updateObjective = function(objectiveId, completed = true, progress = null) {
    this.objectivesCompleted[objectiveId] = completed;
    
    if (progress !== null) {
      this.objectiveProgress[objectiveId] = progress;
    }
    
    this.changed('objectivesCompleted', true);
    this.changed('objectiveProgress', true);
  };

  QuestProgress.prototype.isObjectiveComplete = function(objectiveId) {
    return this.objectivesCompleted[objectiveId] === true;
  };

  QuestProgress.prototype.areAllObjectivesComplete = function(quest) {
    if (!quest || !quest.objectives) return false;
    
    for (const objective of quest.objectives) {
      if (!this.isObjectiveComplete(objective.id)) {
        return false;
      }
    }
    return true;
  };

  QuestProgress.prototype.complete = async function() {
    this.status = 'completed';
    this.completedAt = new Date();
    await this.save();
  };

  QuestProgress.prototype.fail = async function() {
    this.status = 'failed';
    this.completedAt = new Date();
    await this.save();
  };

  QuestProgress.prototype.abandon = async function() {
    this.status = 'abandoned';
    this.completedAt = new Date();
    await this.save();
  };

  // Class methods
  QuestProgress.findActiveForCharacter = function(characterId) {
    return this.findAll({
      where: {
        characterId,
        status: 'active'
      },
      order: [['started_at', 'DESC']]
    });
  };

  QuestProgress.findCompletedForCharacter = function(characterId) {
    return this.findAll({
      where: {
        characterId,
        status: 'completed'
      },
      order: [['completed_at', 'DESC']]
    });
  };

  return QuestProgress;
};
