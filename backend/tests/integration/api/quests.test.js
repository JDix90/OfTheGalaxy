/**
 * Quest API Integration Tests
 * Tests for quest API endpoints
 */

const request = require('supertest');
const app = require('../../../src/server');
const { createTestUser, createTestCharacter, createAuthHeaders } = require('../../setup/testHelpers');
const { Quest, QuestProgress, NPC } = require('../../../src/models');

describe('Quest API', () => {
  let user;
  let character;
  let npc;
  let quest;
  let authHeaders;

  beforeEach(async () => {
    user = await createTestUser();
    character = await createTestCharacter(user.id, { level: 5 });
    authHeaders = createAuthHeaders(user.id);

    // Create test NPC
    npc = await NPC.create({
      id: `test-npc-${Date.now()}`,
      name: 'Test Quest Giver',
      npcType: 'quest_giver',
      species: 'human',      factionId: 'independent_investigators',
      planetId: 'solenne',
      location: { x: 50, y: 50, area: 'surface' }
    });

    // Create test quest
    quest = await Quest.create({
      id: `test-quest-${Date.now()}`,
      title: 'Test Quest',
      description: 'A test quest',
      questGiverId: npc.id,
      factionId: 'independent_investigators',
      questType: 'main',
      objectives: [
        {
          id: 'obj1',
          type: 'interact',
          target: npc.id,
          description: 'Talk to NPC'
        }
      ],
      rewards: {
        xp: 100,
        credits: 500,
        items: []
      },
      isActive: true
    });
  });

  describe('GET /api/quests/available', () => {
    test.skip('should get available quests for character', async () => {
      const response = await request(app)
        .get(`/api/quests/available?characterId=${character.id}`)
        .set(authHeaders)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should require authentication', async () => {
      await request(app)
        .get(`/api/quests/available?characterId=${character.id}`)
        .expect(401);
    });
  });

  describe('GET /api/quests/npc/:npcId', () => {
    test.skip('should get quests from specific NPC', async () => {
      const response = await request(app)
        .get(`/api/quests/npc/${npc.id}?characterId=${character.id}`)
        .set(authHeaders)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test.skip('should return empty array if NPC has no quests', async () => {
      const emptyNPC = await NPC.create({
        id: `empty-npc-${Date.now()}`,
        name: 'Empty NPC',
        npcType: 'vendor',
        species: 'human',        factionId: 'independent_investigators',
        planetId: 'solenne',
        location: { x: 50, y: 50, area: 'surface' }
      });

      const response = await request(app)
        .get(`/api/quests/npc/${emptyNPC.id}?characterId=${character.id}`)
        .set(authHeaders)
        .expect(200);

      expect(response.body.data).toEqual([]);
    });
  });

  describe('POST /api/quests/:questId/start', () => {
    test.skip('should start a quest for character', async () => {
      const response = await request(app)
        .post(`/api/quests/${quest.id}/start`)
        .set(authHeaders)
        .send({ characterId: character.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.status).toBe('active');
    });

    test.skip('should throw error if quest already active', async () => {
      // Start quest first time
      await request(app)
        .post(`/api/quests/${quest.id}/start`)
        .set(authHeaders)
        .send({ characterId: character.id })
        .expect(200);

      // Try to start again
      const response = await request(app)
        .post(`/api/quests/${quest.id}/start`)
        .set(authHeaders)
        .send({ characterId: character.id })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/quests/active', () => {
    test.skip('should get active quests for character', async () => {
      // Start a quest first
      await request(app)
        .post(`/api/quests/${quest.id}/start`)
        .set(authHeaders)
        .send({ characterId: character.id });

      const response = await request(app)
        .get(`/api/quests/active?characterId=${character.id}`)
        .set(authHeaders)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/quests/:questId/complete', () => {
    beforeEach(async () => {
      // Start quest first
      await request(app)
        .post(`/api/quests/${quest.id}/start`)
        .set(authHeaders)
        .send({ characterId: character.id });

      // Complete all objectives
      const questService = require('../../../src/services/questService');
      for (const objective of quest.objectives) {
        await questService.updateObjective(
          character.id,
          quest.id,
          objective.id,
          true,
          {}
        );
      }
    });

    test.skip('should complete quest and award rewards', async () => {
      const initialXP = character.xp;
      const initialCredits = character.credits;

      const response = await request(app)
        .post(`/api/quests/${quest.id}/complete`)
        .set(authHeaders)
        .send({ characterId: character.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.rewards).toBeDefined();

      await character.reload();
      expect(character.xp).toBe(initialXP + quest.rewards.xp);
      expect(character.credits).toBe(initialCredits + quest.rewards.credits);
    });
  });
});

