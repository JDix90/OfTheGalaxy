/**
 * Character API Integration Tests
 * Tests for character API endpoints
 */

const request = require('supertest');
const app = require('../../../src/server');
const { createTestUser, createTestCharacter, createAuthHeaders } = require('../../setup/testHelpers');
const { User, PlayerCharacter } = require('../../../src/models');

describe('Character API', () => {
  let user;
  let authHeaders;

  beforeEach(async () => {
    user = await createTestUser();
    authHeaders = createAuthHeaders(user.id);
  });

  describe('POST /api/characters', () => {
    test.skip('should create a new character', async () => {
      const characterData = {
        name: 'API Test Character',
        species: 'human',
        background: 'soldier',
        stats: {
          strength: 12,
          agility: 10,
          intelligence: 10,
          charisma: 10,
          perception: 10,
          endurance: 10
        }
      };

      const response = await request(app)
        .post('/api/characters')
        .set(authHeaders)
        .send(characterData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe(characterData.name);
      expect(response.body.data.species).toBe(characterData.species);
      expect(response.body.data.background).toBe(characterData.background);
      expect(response.body.data.userId).toBe(user.id);
    });

    test('should reject invalid character data', async () => {
      const invalidData = {
        name: 'A', // Too short
        species: 'invalid', // Invalid species
      };

      const response = await request(app)
        .post('/api/characters')
        .set(authHeaders)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/characters')
        .send({ name: 'Test' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/characters/:id', () => {
    let character;

    beforeEach(async () => {
      character = await createTestCharacter(user.id);
    });

    test.skip('should get character by ID', async () => {
      const response = await request(app)
        .get(`/api/characters/${character.id}`)
        .set(authHeaders)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(character.id);
      expect(response.body.data.name).toBe(character.name);
    });

    test.skip('should return 404 for non-existent character', async () => {
      const response = await request(app)
        .get('/api/characters/invalid-id')
        .set(authHeaders)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should require authentication', async () => {
      await request(app)
        .get(`/api/characters/${character.id}`)
        .expect(401);
    });
  });

  describe('GET /api/characters', () => {
    beforeEach(async () => {
      await createTestCharacter(user.id, { name: 'Character 1' });
      await createTestCharacter(user.id, { name: 'Character 2' });
    });

    test.skip('should get all characters for user', async () => {
      const response = await request(app)
        .get('/api/characters')
        .set(authHeaders)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    test.skip('should only return characters for authenticated user', async () => {
      const otherUser = await createTestUser();
      await createTestCharacter(otherUser.id, { name: 'Other User Character' });

      const response = await request(app)
        .get('/api/characters')
        .set(authHeaders)
        .expect(200);

      const otherUserCharacter = response.body.data.find(
        c => c.name === 'Other User Character'
      );
      expect(otherUserCharacter).toBeUndefined();
    });
  });

  describe('POST /api/characters/:id/xp', () => {
    let character;

    beforeEach(async () => {
      character = await createTestCharacter(user.id, {
        level: 1,
        xp: 0
      });
    });

    test.skip('should add XP to character', async () => {
      const response = await request(app)
        .post(`/api/characters/${character.id}/xp`)
        .set(authHeaders)
        .send({ xp: 100 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.xpGained).toBe(100);

      await character.reload();
      expect(character.xp).toBe(100);
    });

    test.skip('should level up when XP threshold reached', async () => {
      const response = await request(app)
        .post(`/api/characters/${character.id}/xp`)
        .set(authHeaders)
        .send({ xp: 100 })
        .expect(200);

      await character.reload();
      expect(character.level).toBe(2);
      expect(response.body.data.leveledUp).toBe(true);
    });

    test.skip('should reject invalid XP amount', async () => {
      const response = await request(app)
        .post(`/api/characters/${character.id}/xp`)
        .set(authHeaders)
        .send({ xp: -10 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/characters/:id/allocate-skill', () => {
    let character;

    beforeEach(async () => {
      character = await createTestCharacter(user.id, {
        skillPoints: 5,
        skills: {
          combat: {},
          stealth: {},
          diplomacy: {},
          technical: {},
          survival: {}
        }
      });
    });

    test.skip('should allocate skill point', async () => {
      const response = await request(app)
        .post(`/api/characters/${character.id}/allocate-skill`)
        .set(authHeaders)
        .send({
          tree: 'combat',
          skillId: 'basic_combat'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.skillLevel).toBe(1);

      await character.reload();
      expect(character.skillPoints).toBe(4);
    });

    test.skip('should reject if no skill points available', async () => {
      character.skillPoints = 0;
      await character.save();

      const response = await request(app)
        .post(`/api/characters/${character.id}/allocate-skill`)
        .set(authHeaders)
        .send({
          tree: 'combat',
          skillId: 'basic_combat'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/characters/:id/allocate-attribute', () => {
    let character;

    beforeEach(async () => {
      character = await createTestCharacter(user.id, {
        attributePoints: 1,
        stats: {
          strength: 10,
          agility: 10,
          intelligence: 10,
          charisma: 10,
          perception: 10,
          endurance: 10
        }
      });
    });

    test.skip('should allocate attribute point', async () => {
      const response = await request(app)
        .post(`/api/characters/${character.id}/allocate-attribute`)
        .set(authHeaders)
        .send({ attribute: 'strength' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.newValue).toBeGreaterThan(10);

      await character.reload();
      expect(character.attributePoints).toBe(0);
      expect(character.stats.strength).toBeGreaterThan(10);
    });

    test.skip('should reject if no attribute points available', async () => {
      character.attributePoints = 0;
      await character.save();

      const response = await request(app)
        .post(`/api/characters/${character.id}/allocate-attribute`)
        .set(authHeaders)
        .send({ attribute: 'strength' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});

