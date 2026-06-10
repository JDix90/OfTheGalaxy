/**
 * Test Database Setup
 * Configures test database for Jest tests
 */

const { sequelize } = require('../../src/models');

// Set test environment
process.env.NODE_ENV = 'test';

beforeAll(async () => {
  try {
    // Authenticate with test database
    await sequelize.authenticate();
    console.log('✅ Test database connected');
    
    // Run migrations
    const { runMigrations } = require('../../src/migrations/run');
    await runMigrations();
    console.log('✅ Test migrations completed');
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  }
});

afterAll(async () => {
  try {
    // Close database connection
    await sequelize.close();
    console.log('✅ Test database connection closed');
  } catch (error) {
    console.error('❌ Error closing test database:', error);
  }
});

beforeEach(async () => {
  // Clean tables before each test
  // Note: This is a simple approach. For production, consider transaction rollback
  try {
    const { 
      PlayerCharacter, 
      User, 
      Quest, 
      QuestProgress, 
      NPC, 
      PlayerInventory, 
      CombatEncounter,
      NPCRelationship,
      FactionReputation,
      Discovery,
      POIInteraction,
      Achievement,
      SaveSlot
    } = require('../../src/models');
    
    // Delete in order to respect foreign key constraints
    await CombatEncounter.destroy({ where: {}, force: true });
    await QuestProgress.destroy({ where: {}, force: true });
    await PlayerInventory.destroy({ where: {}, force: true });
    await NPCRelationship.destroy({ where: {}, force: true });
    await FactionReputation.destroy({ where: {}, force: true });
    await Discovery.destroy({ where: {}, force: true });
    await POIInteraction.destroy({ where: {}, force: true });
    await Achievement.destroy({ where: {}, force: true });
    await SaveSlot.destroy({ where: {}, force: true });
    await PlayerCharacter.destroy({ where: {}, force: true });
    await NPC.destroy({ where: {}, force: true });
    await Quest.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  } catch (error) {
    console.warn('⚠️ Error cleaning test database:', error.message);
    // Continue - some tables may not exist yet
  }
});

