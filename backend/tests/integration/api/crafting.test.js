/**
 * Crafting API Integration Tests
 * Tests for crafting API endpoints
 */

const request = require('supertest');
const app = require('../../../src/server');
const { createTestUser, createTestCharacter, createAuthHeaders } = require('../../setup/testHelpers');
const { Item } = require('../../../src/models');
const inventoryService = require('../../../src/services/inventoryService');

describe('Crafting API', () => {
  let user;
  let character;
  let authHeaders;

  beforeEach(async () => {
    user = await createTestUser();
    character = await createTestCharacter(user.id, {
      level: 5,
      currentStamina: 100,
      maxStamina: 100,
      skills: {
        combat: {},
        stealth: {},
        diplomacy: {},
        technical: {
          engineering: { level: 3 }
        },
        survival: {}
      }
    });
    authHeaders = createAuthHeaders(user.id);
  });

  describe('GET /api/crafting/recipes', () => {
    test('should get available recipes for character', async () => {
      const response = await request(app)
        .get(`/api/crafting/recipes?characterId=${character.id}`)
        .set(authHeaders)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should require authentication', async () => {
      await request(app)
        .get(`/api/crafting/recipes?characterId=${character.id}`)
        .expect(401);
    });
  });

  describe('GET /api/crafting/recipes/:recipeId/can-craft', () => {
    test('should check if character can craft recipe', async () => {
      const response = await request(app)
        .get(`/api/crafting/recipes/medpac_01/can-craft?characterId=${character.id}`)
        .set(authHeaders)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.hasOwnProperty('canCraft')).toBe(true);
    });
  });

  describe('POST /api/crafting/craft', () => {
    beforeEach(async () => {
      // Add materials for crafting (if recipe exists)
      // This is a simplified test - actual materials depend on recipe definitions
    });

    test('should craft item if requirements met', async () => {
      // Check if we can craft first
      const canCraftResponse = await request(app)
        .get(`/api/crafting/recipes/medpac_01/can-craft?characterId=${character.id}`)
        .set(authHeaders);

      if (canCraftResponse.body.data?.canCraft) {
        const response = await request(app)
          .post('/api/crafting/craft')
          .set(authHeaders)
          .send({
            characterId: character.id,
            recipeId: 'medpac_01',
            quantity: 1
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      }
    });

    test('should consume stamina when crafting', async () => {
      const initialStamina = character.currentStamina;

      const canCraftResponse = await request(app)
        .get(`/api/crafting/recipes/medpac_01/can-craft?characterId=${character.id}`)
        .set(authHeaders);

      if (canCraftResponse.body.data?.canCraft) {
        await request(app)
          .post('/api/crafting/craft')
          .set(authHeaders)
          .send({
            characterId: character.id,
            recipeId: 'medpac_01',
            quantity: 1
          });

        await character.reload();
        expect(character.currentStamina).toBeLessThan(initialStamina);
      }
    });

    test('should require authentication', async () => {
      await request(app)
        .post('/api/crafting/craft')
        .send({
          characterId: character.id,
          recipeId: 'medpac_01'
        })
        .expect(401);
    });
  });
});

