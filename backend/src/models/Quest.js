/**
 * Quest Model
 * Defines quest structure including objectives, prerequisites, and rewards
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Quest = sequelize.define('Quest', {
    id: {
      type: DataTypes.STRING(100),
      primaryKey: true
    },
    factionId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'faction_id'
    },
    questType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'quest_type',
      validate: {
        isIn: [['main', 'side', 'dynamic', 'companion', 'repeatable', 'mini', 'tutorial']]
      }
    },
    // Moral alignment for mini-quests
    moralAlignment: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'moral_alignment',
      validate: {
        isIn: [['altruistic', 'neutral', 'deceptive', 'criminal', null]]
      }
    },
    // Mini-quest specific metadata
    miniQuestData: {
      type: DataTypes.JSONB,
      field: 'mini_quest_data',
      allowNull: true,
      defaultValue: {
        needType: null,
        motivationType: null,
        urgency: 0.5,
        generatedFrom: null,
        expiresAt: null,
        relationshipBonus: 0,
        moralAlignment: null,
        consequences: {
          reputationChanges: {},
          factionChanges: {}
        }
      }
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    shortDescription: {
      type: DataTypes.STRING(500),
      field: 'short_description'
    },
    // Prerequisites to unlock quest
    prerequisites: {
      type: DataTypes.JSONB,
      defaultValue: {
        level: 1,
        reputation: {},
        completedQuests: [],
        items: []
      }
    },
    // Quest objectives
    objectives: {
      type: DataTypes.JSONB,
      defaultValue: [],
      validate: {
        isValidObjectives(value) {
          if (!Array.isArray(value)) {
            throw new Error('Objectives must be an array');
          }
          for (const obj of value) {
            if (!obj.id || !obj.type || !obj.description) {
              throw new Error('Each objective must have id, type, and description');
            }
          }
        }
      }
    },
    // Quest rewards
    rewards: {
      type: DataTypes.JSONB,
      defaultValue: {
        xp: 0,
        credits: 0,
        reputation: {},
        items: [],
        unlocks: []
      }
    },
    // Quest giver NPC
    questGiverId: {
      type: DataTypes.STRING(100),
      field: 'quest_giver_id'
    },
    // Starting location
    startLocation: {
      type: DataTypes.JSONB,
      field: 'start_location',
      defaultValue: {
        planet: null,
        area: null
      }
    },
    // Estimated completion time (in minutes)
    estimatedTime: {
      type: DataTypes.INTEGER,
      field: 'estimated_time',
      defaultValue: 30
    },
    // Quest difficulty
    difficulty: {
      type: DataTypes.STRING(20),
      validate: {
        isIn: [['easy', 'medium', 'hard', 'very_hard']]
      }
    },
    // Is quest currently active/available
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    // Quest chain information
    chainId: {
      type: DataTypes.STRING(100),
      field: 'chain_id'
    },
    chainOrder: {
      type: DataTypes.INTEGER,
      field: 'chain_order'
    }
  }, {
    tableName: 'quests',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['faction_id']
      },
      {
        fields: ['quest_type']
      },
      {
        fields: ['chain_id', 'chain_order']
      }
    ]
  });

  // Class methods
  Quest.findByFaction = function(factionId) {
    return this.findAll({
      where: { factionId, isActive: true },
      order: [['chainOrder', 'ASC']]
    });
  };

  Quest.findByType = function(questType) {
    return this.findAll({
      where: { questType, isActive: true }
    });
  };

  // Instance methods
  Quest.prototype.isMiniQuest = function() {
    return this.questType === 'mini';
  };

  Quest.prototype.getMoralAlignment = function() {
    return this.moralAlignment || this.miniQuestData?.moralAlignment || 'neutral';
  };

  return Quest;
};
