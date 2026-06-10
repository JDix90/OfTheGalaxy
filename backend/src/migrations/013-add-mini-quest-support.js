'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('Running migration: Add Mini-Quest Support');
    
    // Check if columns already exist
    const tableDescription = await queryInterface.describeTable('quests');
    
    // Add moral_alignment column
    if (!tableDescription.moral_alignment) {
      await queryInterface.addColumn('quests', 'moral_alignment', {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Moral alignment: altruistic, neutral, deceptive, criminal'
      });
      console.log('  ✓ Added moral_alignment column to quests table');
    } else {
      console.log('  ⚠ Column moral_alignment already exists in quests table, skipping...');
    }

    // Add mini_quest_data column
    if (!tableDescription.mini_quest_data) {
      await queryInterface.addColumn('quests', 'mini_quest_data', {
        type: Sequelize.JSONB,
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
        },
        comment: 'Mini-quest specific metadata'
      });
      console.log('  ✓ Added mini_quest_data column to quests table');
    } else {
      console.log('  ⚠ Column mini_quest_data already exists in quests table, skipping...');
    }

    // Add indexes
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_quests_mini_quest_data 
        ON quests USING GIN (mini_quest_data);
      `);
      console.log('  ✓ Added GIN index on mini_quest_data');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('  ⚠ Index idx_quests_mini_quest_data already exists, skipping...');
      } else {
        throw error;
      }
    }
    
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_quests_type_mini 
        ON quests (quest_type) 
        WHERE quest_type = 'mini';
      `);
      console.log('  ✓ Added partial index on quest_type for mini quests');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('  ⚠ Index idx_quests_type_mini already exists, skipping...');
      } else {
        throw error;
      }
    }
    
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_quests_moral_alignment 
        ON quests (moral_alignment) 
        WHERE quest_type = 'mini';
      `);
      console.log('  ✓ Added partial index on moral_alignment for mini quests');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('  ⚠ Index idx_quests_moral_alignment already exists, skipping...');
      } else {
        throw error;
      }
    }
    
    console.log('Migration completed: Add Mini-Quest Support');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('Rolling back migration: Add Mini-Quest Support');
    
    await queryInterface.removeColumn('quests', 'moral_alignment');
    await queryInterface.removeColumn('quests', 'mini_quest_data');
    
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_quests_mini_quest_data;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_quests_type_mini;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_quests_moral_alignment;');
    
    console.log('Rollback completed: Add Mini-Quest Support');
  }
};








