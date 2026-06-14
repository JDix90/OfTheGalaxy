/**
 * Test Helpers
 * Utility functions and data factories for tests
 */

const { User, PlayerCharacter, Item, Quest, NPC } = require('../../src/models');
const jwt = require('jsonwebtoken');

/**
 * Create a test user
 */
async function createTestUser(overrides = {}) {
  // Create users the way the app does: the User model stores `passwordHash`
  // (no `password` virtual), so hash up front. Random suffix avoids same-ms
  // email collisions when a test creates several users in quick succession.
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const passwordHash = await User.hashPassword('TestPassword123!');
  return await User.create({
    email: `test-${unique}@test.com`,
    passwordHash,
    ...overrides
  });
}

/**
 * Create a test character
 */
async function createTestCharacter(userId, overrides = {}) {
  const defaultStats = {
    strength: 10,
    agility: 10,
    intelligence: 10,
    charisma: 10,
    perception: 10,
    endurance: 10
  };

  return await PlayerCharacter.create({
    userId,
    name: `Test Character ${Date.now()}`,
    species: 'human',
    background: 'soldier',
    level: 1,
    xp: 0,
    skillPoints: 0,
    attributePoints: 0,
    specializationPoints: 0,
    stats: defaultStats,
    skills: {
      combat: {},
      stealth: {},
      diplomacy: {},
      technical: {},
      survival: {}
    },
    abilities: [],
    currentHealth: 100,
    maxHealth: 100,
    currentStamina: 50,
    maxStamina: 50,
    credits: 1000,
    currentPlanet: 'solenne',
    ...overrides
  });
}

/**
 * Create a test item
 */
async function createTestItem(overrides = {}) {
  return await Item.create({
    id: `test-item-${Date.now()}`,
    name: 'Test Item',
    description: 'A test item',
    itemType: 'weapon',
    rarity: 'common',
    stats: { damage: 10 },
    value: 100,
    weight: 1,
    ...overrides
  });
}

/**
 * Create a test quest
 */
async function createTestQuest(overrides = {}) {
  return await Quest.create({
    id: `test-quest-${Date.now()}`,
    name: 'Test Quest',
    description: 'A test quest',
    questType: 'main',
    objectives: [
      {
        id: 'obj1',
        type: 'interact',
        target: 'test-npc',
        description: 'Talk to NPC'
      }
    ],
    rewards: {
      xp: 100,
      credits: 500,
      items: []
    },
    isActive: true,
    ...overrides
  });
}

/**
 * Create a test NPC
 */
async function createTestNPC(overrides = {}) {
  return await NPC.create({
    id: `test-npc-${Date.now()}`,
    name: 'Test NPC',
    npcType: 'quest_giver',
    factionId: 'independent_investigators',
    planetId: 'solenne',
    location: { x: 50, y: 50, area: 'surface' },
    ...overrides
  });
}

/**
 * Create authentication headers for API requests
 */
function createAuthHeaders(userId) {
  const token = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn: '1h' }
  );

  return {
    'Authorization': `Bearer ${token}`
  };
}

/**
 * Wait for a condition to be true
 */
function waitFor(condition, timeout = 5000, interval = 100) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'));
      } else {
        setTimeout(check, interval);
      }
    };
    
    check();
  });
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  const { 
    CombatEncounter, 
    QuestProgress, 
    PlayerInventory, 
    NPCRelationship,
    FactionReputation,
    Discovery,
    POIInteraction,
    Achievement,
    SaveSlot
  } = require('../../src/models');

  try {
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
    console.warn('Error cleaning up test data:', error.message);
  }
}

module.exports = {
  createTestUser,
  createTestCharacter,
  createTestItem,
  createTestQuest,
  createTestNPC,
  createAuthHeaders,
  waitFor,
  cleanupTestData
};
