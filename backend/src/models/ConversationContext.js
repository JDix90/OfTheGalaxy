/**
 * ConversationContext Model
 * Stores contextual information about conversations (quests, topics, relationships, memories)
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ConversationContext = sequelize.define('ConversationContext', {
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
    contextType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'context_type',
      validate: {
        isIn: [['quest', 'topic', 'relationship', 'memory', 'emotion', 'faction']]
      }
    },
    contextKey: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'context_key'
    },
    contextData: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: 'context_data'
    }
  }, {
    tableName: 'conversation_context',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['relationship_id']
      },
      {
        fields: ['context_type']
      },
      {
        fields: ['relationship_id', 'context_type']
      },
      {
        unique: true,
        fields: ['relationship_id', 'context_type', 'context_key']
      }
    ]
  });

  // Instance methods
  ConversationContext.prototype.updateContextData = function(newData) {
    this.contextData = { ...this.contextData, ...newData };
    this.changed('contextData', true);
  };

  // Class methods
  ConversationContext.findByRelationship = function(relationshipId, contextType = null) {
    const where = { relationshipId };
    if (contextType) {
      where.contextType = contextType;
    }
    return this.findAll({
      where,
      order: [['updated_at', 'DESC']]
    });
  };

  ConversationContext.findByType = function(contextType) {
    return this.findAll({
      where: { contextType },
      order: [['updated_at', 'DESC']]
    });
  };

  return ConversationContext;
};




