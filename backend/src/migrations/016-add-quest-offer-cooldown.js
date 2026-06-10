'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('Running migration: Add Quest Offer Cooldown');
    
    // Check if column already exists
    const tableInfo = await queryInterface.describeTable('npc_relationships');
    const columnExists = tableInfo.last_quest_offer !== undefined;
    
    if (!columnExists) {
      await queryInterface.addColumn('npc_relationships', 'last_quest_offer', {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'last_quest_offer',
        comment: 'Timestamp of last quest offer from this NPC to prevent spam'
      });
      console.log('✓ Added last_quest_offer column to npc_relationships table');
    } else {
      console.log('✓ Column last_quest_offer already exists, skipping');
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('Rolling back migration: Add Quest Offer Cooldown');
    
    const tableInfo = await queryInterface.describeTable('npc_relationships');
    const columnExists = tableInfo.last_quest_offer !== undefined;
    
    if (columnExists) {
      await queryInterface.removeColumn('npc_relationships', 'last_quest_offer');
      console.log('✓ Removed last_quest_offer column from npc_relationships table');
    }
  }
};




