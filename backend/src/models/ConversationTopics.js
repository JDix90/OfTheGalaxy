/**
 * ConversationTopics Model
 * Tracks conversation topics discussed between players and NPCs
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ConversationTopics = sequelize.define('ConversationTopics', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    relationshipId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'relationship_id',
      references: {
        model: 'npc_relationships',
        key: 'id'
      }
    },
    topic: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    firstMentioned: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'first_mentioned'
    },
    lastMentioned: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'last_mentioned'
    },
    mentionCount: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: 'mention_count'
    },
    context: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'conversation_topics',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['relationship_id']
      },
      {
        fields: ['topic']
      },
      {
        fields: ['last_mentioned']
      },
      {
        unique: true,
        fields: ['relationship_id', 'topic']
      }
    ]
  });

  // Instance methods
  ConversationTopics.prototype.incrementMention = function() {
    this.mentionCount += 1;
    this.lastMentioned = new Date();
  };

  // Class methods
  ConversationTopics.findByRelationship = function(relationshipId) {
    return this.findAll({
      where: { relationshipId },
      order: [['last_mentioned', 'DESC']]
    });
  };

  ConversationTopics.findByTopic = function(topic) {
    return this.findAll({
      where: { topic },
      order: [['last_mentioned', 'DESC']]
    });
  };

  return ConversationTopics;
};




