/**
 * NPCRelationship Model
 * Tracks player relationships with NPCs (replaces trust system)
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NPCRelationship = sequelize.define('NPCRelationship', {
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
    npcId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'npc_id',
      references: {
        model: 'npcs',
        key: 'id'
      }
    },
    // Relationship level (0-100, replaces trust)
    relationshipLevel: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'relationship_level',
      validate: {
        min: 0,
        max: 100
      }
    },
    // Conversation history
    conversationHistory: {
      type: DataTypes.JSONB,
      defaultValue: [],
      field: 'conversation_history'
    },
    // Last interaction timestamp
    lastInteraction: {
      type: DataTypes.DATE,
      field: 'last_interaction'
    },
    // Total interactions count
    interactionCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'interaction_count'
    },
    // Is this NPC recruited as a companion?
    isRecruited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_recruited'
    },
    // Player notes about this NPC
    notes: {
      type: DataTypes.TEXT
    },
    // Discovered information about NPC
    discoveredInfo: {
      type: DataTypes.JSONB,
      defaultValue: [],
      field: 'discovered_info'
    },
    // Last conversation topic discussed
    lastConversationTopic: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'last_conversation_topic'
    },
    // Active conversation threads
    activeConversationThreads: {
      type: DataTypes.JSONB,
      defaultValue: [],
      field: 'active_conversation_threads'
    },
    // Conversation summary
    conversationSummary: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'conversation_summary'
    },
    // Enhancement: Last quest offer timestamp for cooldown
    lastQuestOffer: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_quest_offer'
    }
  }, {
    tableName: 'npc_relationships',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['character_id']
      },
      {
        fields: ['npc_id']
      },
      {
        unique: true,
        fields: ['character_id', 'npc_id']
      }
    ]
  });

  // Instance methods
  NPCRelationship.prototype.getRelationshipTier = function() {
    // Enhancement: Lowered tier thresholds for faster progression feel
    // Changed from (21, 51, 81) to (15, 40, 70)
    if (this.relationshipLevel < 15) return 'stranger';
    if (this.relationshipLevel < 40) return 'acquaintance';
    if (this.relationshipLevel < 70) return 'friend';
    return 'confidant';
  };

  NPCRelationship.prototype.addConversation = function(playerMessage, npcResponse) {
    this.conversationHistory.push({
      timestamp: new Date(),
      player: playerMessage,
      npc: npcResponse
    });
    
    this.lastInteraction = new Date();
    this.interactionCount += 1;
    
    this.changed('conversationHistory', true);
  };

  NPCRelationship.prototype.increaseRelationship = function(amount) {
    this.relationshipLevel = Math.min(100, this.relationshipLevel + amount);
  };

  NPCRelationship.prototype.decreaseRelationship = function(amount) {
    this.relationshipLevel = Math.max(0, this.relationshipLevel - amount);
  };

  NPCRelationship.prototype.recruit = async function() {
    this.isRecruited = true;
    await this.save();
  };

  NPCRelationship.prototype.dismiss = async function() {
    this.isRecruited = false;
    await this.save();
  };

  // Class methods
  NPCRelationship.findForCharacter = function(characterId) {
    return this.findAll({
      where: { characterId },
      order: [['relationship_level', 'DESC']]
    });
  };

  NPCRelationship.findRecruitedCompanions = function(characterId) {
    return this.findAll({
      where: {
        characterId,
        isRecruited: true
      }
    });
  };

  return NPCRelationship;
};
