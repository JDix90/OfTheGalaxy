/**
 * Inventory Service Unit Tests
 * Tests for inventory management, equipment, and item operations
 */

const inventoryService = require('../../../src/services/inventoryService');
const { createTestUser, createTestCharacter } = require('../../setup/testHelpers');
const { PlayerInventory, Item } = require('../../../src/models');

describe('InventoryService', () => {
  let user;
  let character;
  let testItem;

  beforeEach(async () => {
    user = await createTestUser();
    character = await createTestCharacter(user.id);

    // Create test item in database
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

  describe('getInventory', () => {
    test('should return inventory for character', async () => {
      const inventory = await inventoryService.getInventory(character.id);

      expect(inventory).toBeDefined();
      expect(inventory.items).toBeDefined();
      expect(Array.isArray(inventory.items)).toBe(true);
      expect(inventory.equipped).toBeDefined();
      expect(Array.isArray(inventory.equipped)).toBe(true);
    });

    test('should return empty inventory for new character', async () => {
      const inventory = await inventoryService.getInventory(character.id);
      expect(inventory.items.length).toBe(0);
      expect(inventory.equipped.length).toBe(0);
    });
  });

  describe('addItem', () => {
    test('should add item to inventory', async () => {
      const result = await inventoryService.addItem(character.id, testItem.id, 1);

      expect(result).toBeDefined();
      expect(result.itemId).toBe(testItem.id);
      expect(result.quantity).toBe(1);

      const inventory = await inventoryService.getInventory(character.id);
      const addedItem = inventory.items.find(item => item.itemId === testItem.id);
      expect(addedItem).toBeDefined();
      expect(addedItem.quantity).toBe(1);
    });

    test('should stack items of same type', async () => {
      await inventoryService.addItem(character.id, testItem.id, 1);
      await inventoryService.addItem(character.id, testItem.id, 2);

      const inventory = await inventoryService.getInventory(character.id);
      const item = inventory.items.find(i => i.itemId === testItem.id);
      expect(item.quantity).toBe(3);
    });

    test('should throw error if character not found', async () => {
      await expect(
        inventoryService.addItem('invalid-id', testItem.id, 1)
      ).rejects.toThrow('Character not found');
    });
  });

  describe('removeItem', () => {
    beforeEach(async () => {
      await inventoryService.addItem(character.id, testItem.id, 5);
    });

    test('should remove item from inventory', async () => {
      const result = await inventoryService.removeItem(character.id, testItem.id, 2);

      expect(result).toBeDefined();
      
      const inventory = await inventoryService.getInventory(character.id);
      const item = inventory.items.find(i => i.itemId === testItem.id);
      expect(item.quantity).toBe(3);
    });

    test('should remove item completely when quantity reaches 0', async () => {
      await inventoryService.removeItem(character.id, testItem.id, 5);

      const inventory = await inventoryService.getInventory(character.id);
      const item = inventory.items.find(i => i.itemId === testItem.id);
      expect(item).toBeUndefined();
    });

    test('should throw error if trying to remove more than available', async () => {
      await expect(
        inventoryService.removeItem(character.id, testItem.id, 10)
      ).rejects.toThrow();
    });
  });

  describe('equipItem', () => {
    beforeEach(async () => {
      await inventoryService.addItem(character.id, testItem.id, 1);
    });

    test('should equip item', async () => {
      const result = await inventoryService.equipItem(character.id, testItem.id, 'weapon');

      expect(result).toBeDefined();
      expect(result.equipped).toBe(true);
      expect(result.equipmentSlot).toBe('weapon');

      const inventory = await inventoryService.getInventory(character.id);
      const equipped = inventory.equipped.find(item => item.itemId === testItem.id);
      expect(equipped).toBeDefined();
    });

    test('should unequip existing item in slot', async () => {
      // Equip first item
      await inventoryService.equipItem(character.id, testItem.id, 'weapon');

      // Create and add second weapon
      const secondItem = await Item.create({
        id: `test-item-2-${Date.now()}`,
        name: 'Second Weapon',
        itemType: 'weapon',
        rarity: 'common',
        stats: { damage: 15 },
        value: 150,
        weight: 1,
        equipmentSlot: 'weapon'
      });
      await inventoryService.addItem(character.id, secondItem.id, 1);

      // Equip second item (should unequip first)
      await inventoryService.equipItem(character.id, secondItem.id, 'weapon');

      const inventory = await inventoryService.getInventory(character.id);
      const equipped = inventory.equipped.filter(item => item.equipmentSlot === 'weapon');
      expect(equipped.length).toBe(1);
      expect(equipped[0].itemId).toBe(secondItem.id);
    });

    test('should throw error if item not in inventory', async () => {
      await expect(
        inventoryService.equipItem(character.id, 'non-existent-item', 'weapon')
      ).rejects.toThrow('Item not found in inventory');
    });

    test('should throw error if invalid slot', async () => {
      await expect(
        inventoryService.equipItem(character.id, testItem.id, 'invalid-slot')
      ).rejects.toThrow('Invalid equipment slot');
    });
  });

  describe('unequipItem', () => {
    beforeEach(async () => {
      await inventoryService.addItem(character.id, testItem.id, 1);
      await inventoryService.equipItem(character.id, testItem.id, 'weapon');
    });

    test('should unequip item', async () => {
      const result = await inventoryService.unequipItem(character.id, testItem.id);

      expect(result).toBeDefined();
      expect(result.equipped).toBe(false);
      expect(result.equipmentSlot).toBeNull();

      const inventory = await inventoryService.getInventory(character.id);
      const equipped = inventory.equipped.find(item => item.itemId === testItem.id);
      expect(equipped).toBeUndefined();
    });

    test('should throw error if item not equipped', async () => {
      await inventoryService.unequipItem(character.id, testItem.id);

      await expect(
        inventoryService.unequipItem(character.id, testItem.id)
      ).rejects.toThrow('Item not found or not equipped');
    });
  });

  describe('getEquipped', () => {
    test('should return equipped items', async () => {
      await inventoryService.addItem(character.id, testItem.id, 1);
      await inventoryService.equipItem(character.id, testItem.id, 'weapon');

      const equipped = await inventoryService.getEquipped(character.id);

      expect(Array.isArray(equipped)).toBe(true);
      expect(equipped.length).toBe(1);
      expect(equipped[0].itemId).toBe(testItem.id);
    });

    test('should return empty array if nothing equipped', async () => {
      const equipped = await inventoryService.getEquipped(character.id);
      expect(equipped).toEqual([]);
    });
  });

  describe('getItemData', () => {
    test('should return item data from database', async () => {
      const itemData = await inventoryService.getItemData(testItem.id);

      expect(itemData).toBeDefined();
      expect(itemData.id).toBe(testItem.id);
      expect(itemData.name).toBe(testItem.name);
    });

    test('should throw error if item not found', async () => {
      await expect(
        inventoryService.getItemData('non-existent-item')
      ).rejects.toThrow('Item not found');
    });
  });

  describe('canEquipItem', () => {
    test('should return true if no faction requirement', async () => {
      const result = await inventoryService.canEquipItem(character.id, testItem.id);
      expect(result.canEquip).toBe(true);
    });

    test('should check faction reputation requirement', async () => {
      // Create item with faction requirement
      const factionItem = await Item.create({
        id: `faction-item-${Date.now()}`,
        name: 'Faction Item',
        itemType: 'weapon',
        rarity: 'rare',
        factionId: 'independent_investigators',
        minReputationTier: 'trusted',
        stats: { damage: 20 },
        value: 500,
        weight: 1,
        equipmentSlot: 'weapon'
      });

      const result = await inventoryService.canEquipItem(character.id, factionItem.id);
      expect(result.canEquip).toBe(false);
      expect(result.reason).toContain('Requires');
    });
  });
});

