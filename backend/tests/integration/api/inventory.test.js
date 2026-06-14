/**
 * Inventory API Integration Tests
 * Tests for inventory API endpoints
 */

const request = require('supertest');
const app = require('../../../src/server');
const { createTestUser, createTestCharacter, createAuthHeaders } = require('../../setup/testHelpers');
const { Item, PlayerInventory } = require('../../../src/models');

describe('Inventory API', () => {
  let user;
  let character;
  let testItem;
  let authHeaders;

  beforeEach(async () => {
    user = await createTestUser();
    character = await createTestCharacter(user.id);
    authHeaders = createAuthHeaders(user.id);

    // Create test item
    testItem = await Item.create({
      id: `test-item-${Date.now()}`,
      name: 'Test Item',
      description: 'A test item',
      itemType: 'weapon',
      rarity: 'common',
      stats: { damage: 10 },
      value: 100,
      weight: 1,
      equipmentSlot: 'weapon'
    });
  });

  describe('GET /api/inventory/:characterId', () => {
    test.skip('should get inventory for character', async () => {
      const response = await request(app)
        .get(`/api/inventory/${character.id}`)
        .set(authHeaders)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.items).toBeDefined();
      expect(response.body.data.equipped).toBeDefined();
    });

    test('should require authentication', async () => {
      await request(app)
        .get(`/api/inventory/${character.id}`)
        .expect(401);
    });
  });

  describe('POST /api/inventory/:characterId/items', () => {
    test.skip('should add item to inventory', async () => {
      const response = await request(app)
        .post(`/api/inventory/${character.id}/items`)
        .set(authHeaders)
        .send({
          itemId: testItem.id,
          quantity: 1
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test.skip('should stack items of same type', async () => {
      await request(app)
        .post(`/api/inventory/${character.id}/items`)
        .set(authHeaders)
        .send({
          itemId: testItem.id,
          quantity: 1
        });

      const response = await request(app)
        .post(`/api/inventory/${character.id}/items`)
        .set(authHeaders)
        .send({
          itemId: testItem.id,
          quantity: 2
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/inventory/:characterId/equip/:itemId', () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/inventory/${character.id}/items`)
        .set(authHeaders)
        .send({
          itemId: testItem.id,
          quantity: 1
        });
    });

    test.skip('should equip item', async () => {
      const response = await request(app)
        .put(`/api/inventory/${character.id}/equip/${testItem.id}`)
        .set(authHeaders)
        .send({
          slot: 'weapon'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.equipped).toBe(true);
    });

    test('should require authentication', async () => {
      await request(app)
        .put(`/api/inventory/${character.id}/equip/${testItem.id}`)
        .send({ slot: 'weapon' })
        .expect(401);
    });
  });

  describe('PUT /api/inventory/:characterId/unequip/:itemId', () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/inventory/${character.id}/items`)
        .set(authHeaders)
        .send({
          itemId: testItem.id,
          quantity: 1
        });

      await request(app)
        .put(`/api/inventory/${character.id}/equip/${testItem.id}`)
        .set(authHeaders)
        .send({ slot: 'weapon' });
    });

    test.skip('should unequip item', async () => {
      const response = await request(app)
        .put(`/api/inventory/${character.id}/unequip/${testItem.id}`)
        .set(authHeaders)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.equipped).toBe(false);
    });
  });

  describe('DELETE /api/inventory/:characterId/items/:itemId', () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/inventory/${character.id}/items`)
        .set(authHeaders)
        .send({
          itemId: testItem.id,
          quantity: 5
        });
    });

    test.skip('should remove item from inventory', async () => {
      const response = await request(app)
        .delete(`/api/inventory/${character.id}/items/${testItem.id}`)
        .set(authHeaders)
        .send({ quantity: 2 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});

