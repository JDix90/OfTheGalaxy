'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('Running migration: Add Conversation History System');
    
    // Check if tables already exist
    const tableExists = async (tableName) => {
      const [results] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
        );
      `);
      return results[0].exists;
    };
    
    // Create conversation_topics table (if it doesn't exist)
    const topicsTableExists = await tableExists('conversation_topics');
    if (!topicsTableExists) {
      await queryInterface.createTable('conversation_topics', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      relationship_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'npc_relationships',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      topic: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      first_mentioned: {
        type: Sequelize.DATE,
        allowNull: false
      },
      last_mentioned: {
        type: Sequelize.DATE,
        allowNull: false
      },
      mention_count: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      context: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
      console.log('  ✓ Created conversation_topics table');
    } else {
      console.log('  ⚠ Table conversation_topics already exists, skipping creation');
    }

    // Create unique constraint on relationship_id + topic (if it doesn't exist)
    try {
      await queryInterface.addConstraint('conversation_topics', {
        fields: ['relationship_id', 'topic'],
        type: 'unique',
        name: 'unique_relationship_topic'
      });
      console.log('  ✓ Added unique constraint on conversation_topics');
    } catch (error) {
      if (error.message && error.message.includes('already exists')) {
        console.log('  ⚠ Constraint unique_relationship_topic already exists, skipping');
      } else {
        throw error;
      }
    }

    // Create indexes for conversation_topics (with error handling)
    const addIndexIfNotExists = async (table, fields, indexName) => {
      try {
        await queryInterface.addIndex(table, {
          fields,
          name: indexName
        });
      } catch (error) {
        if (error.message && error.message.includes('already exists')) {
          console.log(`  ⚠ Index ${indexName} already exists, skipping`);
        } else {
          throw error;
        }
      }
    };

    await addIndexIfNotExists('conversation_topics', ['relationship_id'], 'idx_conversation_topics_relationship');
    await addIndexIfNotExists('conversation_topics', ['topic'], 'idx_conversation_topics_topic');
    await addIndexIfNotExists('conversation_topics', ['last_mentioned'], 'idx_conversation_topics_last_mentioned');

    // Create conversation_context table (if it doesn't exist)
    const contextTableExists = await tableExists('conversation_context');
    if (!contextTableExists) {
      await queryInterface.createTable('conversation_context', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      relationship_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'npc_relationships',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      context_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      context_key: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      context_data: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
      console.log('  ✓ Created conversation_context table');
    } else {
      console.log('  ⚠ Table conversation_context already exists, skipping creation');
    }

    // Create unique constraint on relationship_id + context_type + context_key (if it doesn't exist)
    try {
      await queryInterface.addConstraint('conversation_context', {
        fields: ['relationship_id', 'context_type', 'context_key'],
        type: 'unique',
        name: 'unique_relationship_context'
      });
      console.log('  ✓ Added unique constraint on conversation_context');
    } catch (error) {
      if (error.message && error.message.includes('already exists')) {
        console.log('  ⚠ Constraint unique_relationship_context already exists, skipping');
      } else {
        throw error;
      }
    }

    // Create indexes for conversation_context (with error handling)
    await addIndexIfNotExists('conversation_context', ['relationship_id'], 'idx_conversation_context_relationship');
    await addIndexIfNotExists('conversation_context', ['context_type'], 'idx_conversation_context_type');
    await addIndexIfNotExists('conversation_context', ['relationship_id', 'context_type'], 'idx_conversation_context_relationship_type');

    // Add new fields to npc_relationships table (check if they exist first)
    const tableDescription = await queryInterface.describeTable('npc_relationships');
    
    if (!tableDescription.last_conversation_topic) {
      await queryInterface.addColumn('npc_relationships', 'last_conversation_topic', {
        type: Sequelize.STRING(100),
        allowNull: true
      });
      console.log('  ✓ Added last_conversation_topic column to npc_relationships');
    } else {
      console.log('  ⚠ Column last_conversation_topic already exists, skipping');
    }

    if (!tableDescription.active_conversation_threads) {
      await queryInterface.addColumn('npc_relationships', 'active_conversation_threads', {
        type: Sequelize.JSONB,
        defaultValue: [],
        allowNull: true
      });
      console.log('  ✓ Added active_conversation_threads column to npc_relationships');
    } else {
      console.log('  ⚠ Column active_conversation_threads already exists, skipping');
    }

    if (!tableDescription.conversation_summary) {
      await queryInterface.addColumn('npc_relationships', 'conversation_summary', {
        type: Sequelize.JSONB,
        allowNull: true
      });
      console.log('  ✓ Added conversation_summary column to npc_relationships');
    } else {
      console.log('  ⚠ Column conversation_summary already exists, skipping');
    }

    // Create GIN index on conversation_history for faster queries
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_npc_relationships_conversation_history 
        ON npc_relationships USING GIN (conversation_history);
      `);
      console.log('  ✓ Created GIN index on conversation_history');
    } catch (error) {
      if (error.message && error.message.includes('already exists')) {
        console.log('  ⚠ Index idx_npc_relationships_conversation_history already exists, skipping');
      } else {
        throw error;
      }
    }

    console.log('✓ Conversation history system migration completed');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('Rolling back: Conversation History System');
    
    // Drop indexes
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_npc_relationships_conversation_history;
    `);

    // Remove columns from npc_relationships
    await queryInterface.removeColumn('npc_relationships', 'conversation_summary');
    await queryInterface.removeColumn('npc_relationships', 'active_conversation_threads');
    await queryInterface.removeColumn('npc_relationships', 'last_conversation_topic');

    // Drop tables
    await queryInterface.dropTable('conversation_context');
    await queryInterface.dropTable('conversation_topics');

    console.log('✓ Conversation history system rollback completed');
  }
};

