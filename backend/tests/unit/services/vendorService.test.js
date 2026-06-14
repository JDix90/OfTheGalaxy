/**
 * Vendor Service Unit Tests
 * Tests for vendor trading and inventory management
 */

const vendorService = require('../../../src/services/vendorService');
const { createTestUser, createTestCharacter } = require('../../setup/testHelpers');
const { NPC, Item } = require('../../../src/models');

describe('VendorService', () => {
  let user;
  let character;
  let vendor;
  let item;

  beforeEach(async () => {
    user = await createTestUser();
    character = await createTestCharacter(user.id, {
      credits: 1000
    });

    // Create vendor NPC
    vendor = await NPC.create({
      id: `vendor-${Date.now()}`,
      name: 'Test Vendor',
      npcType: 'vendor',
      species: 'human',      factionId: 'independent_investigators',
      planetId: 'solenne',
      location: { x: 50, y: 50, area: 'surface' },
      vendorInventory: [
        {
          itemId: 'test-item',
          quantity: 10,
          price: 100
        }
      ]
    });

    // Create item
    item = await Item.create({
      id: 'test-item',
      name: 'Test Item',
      itemType: 'weapon',
      rarity: 'common',
      value: 100,
      weight: 1
    });
  });

  describe('getVendorInventory', () => {
    test('should get vendor inventory', async () => {
      const inventory = await vendorService.getVendorInventory(vendor.id);

      expect(inventory).toBeDefined();
      expect(Array.isArray(inventory)).toBe(true);
    });

    test('should return empty array if vendor has no inventory', async () => {
      const emptyVendor = await NPC.create({
        id: `empty-vendor-${Date.now()}`,
        name: 'Empty Vendor',
        npcType: 'vendor',
        species: 'human',        factionId: 'independent_investigators',
        planetId: 'solenne',
        location: { x: 50, y: 50, area: 'surface' }
      });

      const inventory = await vendorService.getVendorInventory(emptyVendor.id);
      expect(inventory).toEqual([]);
    });
  });

  describe('buyItem', () => {
    test('should buy item from vendor', async () => {
      const result = await vendorService.buyItem(character.id, vendor.id, 'test-item', 1);

      expect(result.success).toBe(true);
      expect(result.itemId).toBe('test-item');

      await character.reload();
      expect(character.credits).toBeLessThan(1000);
    });

    test('should throw error if insufficient credits', async () => {
      character.credits = 50;
      await character.save();

      await expect(
        vendorService.buyItem(character.id, vendor.id, 'test-item', 1)
      ).rejects.toThrow();
    });

    test('should throw error if item not in vendor inventory', async () => {
      await expect(
        vendorService.buyItem(character.id, vendor.id, 'non-existent-item', 1)
      ).rejects.toThrow();
    });
  });

  describe('sellItem', () => {
    beforeEach(async () => {
      // Add item to character inventory
      const inventoryService = require('../../../src/services/inventoryService');
      await inventoryService.addItem(character.id, 'test-item', 1);
    });

    test('should sell item to vendor', async () => {
      const initialCredits = character.credits;

      const result = await vendorService.sellItem(character.id, vendor.id, 'test-item', 1);

      expect(result.success).toBe(true);

      await character.reload();
      expect(character.credits).toBeGreaterThan(initialCredits);
    });

    test('should throw error if item not in inventory', async () => {
      await expect(
        vendorService.sellItem(character.id, vendor.id, 'non-existent-item', 1)
      ).rejects.toThrow();
    });
  });
});

