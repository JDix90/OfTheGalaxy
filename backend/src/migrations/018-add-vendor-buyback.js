'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('Running migration: Add Vendor Buyback Ledger');

    const tableInfo = await queryInterface.describeTable('npc_relationships');
    const columnExists = tableInfo.buyback_items !== undefined;

    if (!columnExists) {
      await queryInterface.addColumn('npc_relationships', 'buyback_items', {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
        field: 'buyback_items',
        comment: 'Per-vendor buyback ledger: items the player sold to this NPC, repurchasable at the sold price. [{ itemId, quantity, unitPrice, soldAt }]'
      });
      console.log('✓ Added buyback_items column to npc_relationships table');
    } else {
      console.log('✓ Column buyback_items already exists, skipping');
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('Rolling back migration: Add Vendor Buyback Ledger');

    const tableInfo = await queryInterface.describeTable('npc_relationships');
    const columnExists = tableInfo.buyback_items !== undefined;

    if (columnExists) {
      await queryInterface.removeColumn('npc_relationships', 'buyback_items');
      console.log('✓ Removed buyback_items column from npc_relationships table');
    }
  }
};
