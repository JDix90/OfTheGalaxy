'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('achievements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      characterId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'character_id',
        references: {
          model: 'player_characters',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      achievementType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        field: 'achievement_type',
        comment: 'Type of achievement (discovery, combat, exploration, etc.)'
      },
      achievementId: {
        type: Sequelize.STRING(100),
        allowNull: false,
        field: 'achievement_id',
        comment: 'Unique identifier for the achievement'
      },
      achievementName: {
        type: Sequelize.STRING(200),
        allowNull: false,
        field: 'achievement_name'
      },
      progress: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Current progress toward achievement'
      },
      target: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Target value to complete achievement'
      },
      completed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      completedAt: {
        type: Sequelize.DATE,
        field: 'completed_at'
      },
      rewards: {
        type: Sequelize.JSONB,
        defaultValue: {},
        comment: 'Rewards for completing achievement (XP, credits, items)'
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
        comment: 'Additional achievement data'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'updated_at'
      }
    });

    // Create indexes
    const indexes = [
      {
        name: 'idx_achievements_character',
        fields: ['character_id']
      },
      {
        name: 'idx_achievements_type',
        fields: ['achievement_type']
      },
      {
        name: 'idx_achievements_completed',
        fields: ['completed']
      },
      {
        unique: true,
        name: 'idx_achievements_unique',
        fields: ['character_id', 'achievement_id']
      }
    ];

    for (const index of indexes) {
      try {
        await queryInterface.addIndex('achievements', index.fields, {
          unique: index.unique || false,
          name: index.name
        });
      } catch (error) {
        if (error.message && error.message.includes('already exists')) {
          console.warn(`Index ${index.name} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('achievements');
  }
};


