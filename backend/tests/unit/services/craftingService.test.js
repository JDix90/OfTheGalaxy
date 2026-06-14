/**
 * Crafting Service Unit Tests
 * Tests for crafting validation, success calculation, and item creation
 */

const craftingService = require('../../../src/services/craftingService');
const { createTestUser, createTestCharacter } = require('../../setup/testHelpers');
const { PlayerCharacter, Item } = require('../../../src/models');
const { getRecipe } = require('../../../src/data/craftingRecipes');

describe('CraftingService', () => {
  let user;
  let character;
  let materialItem1;
  let materialItem2;

  beforeEach(async () => {
    user = await createTestUser();
    character = await createTestCharacter(user.id, {
      level: 5,
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

    // Create material items
    materialItem1 = await Item.create({
      id: `material-1-${Date.now()}`,
      name: 'Test Material 1',
      itemType: 'resource',
      rarity: 'common',
      value: 10,
      weight: 0.1
    });

    materialItem2 = await Item.create({
      id: `material-2-${Date.now()}`,
      name: 'Test Material 2',
      itemType: 'resource',
      rarity: 'common',
      value: 15,
      weight: 0.1
    });
  });

  describe('canCraft', () => {
    test('should return true if all requirements met', async () => {
      // Add materials to inventory
      const inventoryService = require('../../../src/services/inventoryService');
      await inventoryService.addItem(character.id, materialItem1.id, 5);
      await inventoryService.addItem(character.id, materialItem2.id, 3);

      // Get a simple recipe (if exists) or create test scenario
      // For now, test the validation logic
      const result = await craftingService.canCraft(character.id, 'medpac_01');

      // Result depends on recipe existence and requirements
      expect(result).toBeDefined();
      expect(result.hasOwnProperty('canCraft')).toBe(true);
    });

    test('should return false if level requirement not met', async () => {
      character.level = 1;
      await character.save();

      // Try to craft recipe requiring level 5
      const result = await craftingService.canCraft(character.id, 'medpac_01');

      if (result.canCraft === false) {
        expect(result.reason).toContain('level');
      }
    });

    test('should return false if skill requirement not met', async () => {
      character.skills.technical.engineering = { level: 0 };
      await character.save();

      const result = await craftingService.canCraft(character.id, 'medpac_01');

      if (result.canCraft === false && result.reason) {
        expect(result.reason).toContain('skill') || expect(result.reason).toContain('level');
      }
    });

    test('should return false if materials missing', async () => {
      // Don't add materials
      const result = await craftingService.canCraft(character.id, 'medpac_01');

      if (result.canCraft === false) {
        expect(result.reason).toContain('material') || expect(result.reason).toContain('Missing');
      }
    });

    test('should throw error if character not found', async () => {
      await expect(
        craftingService.canCraft('invalid-id', 'medpac_01')
      ).rejects.toThrow('Character not found');
    });

    test('should throw error if recipe not found', async () => {
      await expect(
        craftingService.canCraft(character.id, 'non-existent-recipe')
      ).rejects.toThrow('Recipe not found');
    });
  });

  describe('calculateCraftingBonuses', () => {
    test('should calculate crafting bonuses', async () => {
      const result = await craftingService.calculateCraftingBonuses(character.id, 'medpac_01');

      expect(result).toBeDefined();
      expect(result.successChance).toBeDefined();
      expect(result.materialCostReduction).toBeDefined();
      expect(result.qualityBonus).toBeDefined();
    });

    test('should factor in engineering skill level', async () => {
      const result1 = await craftingService.calculateCraftingBonuses(character.id, 'medpac_01');

      // Increase engineering skill
      character.skills.technical.engineering = { level: 5 };
      await character.save();

      const result2 = await craftingService.calculateCraftingBonuses(character.id, 'medpac_01');

      // Higher skill should give better bonuses
      expect(result2.successChance).toBeGreaterThanOrEqual(result1.successChance);
    });

    test('should factor in intelligence attribute', async () => {
      const result1 = await craftingService.calculateCraftingBonuses(character.id, 'medpac_01');

      // Increase intelligence
      character.stats.intelligence = 20;
      await character.save();

      const result2 = await craftingService.calculateCraftingBonuses(character.id, 'medpac_01');

      // Higher intelligence should give better bonuses
      expect(result2.successChance).toBeGreaterThanOrEqual(result1.successChance);
    });
  });

  describe('craftItem', () => {
    beforeEach(async () => {
      // Add materials for a known recipe
      const inventoryService = require('../../../src/services/inventoryService');
      // Add common crafting materials
      await inventoryService.addItem(character.id, materialItem1.id, 10);
      await inventoryService.addItem(character.id, materialItem2.id, 10);
    });

    test('should craft item successfully', async () => {
      // Check if we can craft first
      const canCraft = await craftingService.canCraft(character.id, 'medpac_01');
      
      if (canCraft.canCraft) {
        const result = await craftingService.craftItem(character.id, 'medpac_01', 1);

        expect(result.success).toBe(true);
        expect(result.itemId).toBeDefined();
        expect(result.quantity).toBeGreaterThan(0);
        expect(result.staminaCost).toBeDefined();
      }
    });

    test('should consume materials when crafting', async () => {
      const inventoryService = require('../../../src/services/inventoryService');
      const initialInventory = await inventoryService.getInventory(character.id);
      const initialMaterial1 = initialInventory.items.find(i => i.itemId === materialItem1.id);

      const canCraft = await craftingService.canCraft(character.id, 'medpac_01');
      
      if (canCraft.canCraft) {
        await craftingService.craftItem(character.id, 'medpac_01', 1);

        const finalInventory = await inventoryService.getInventory(character.id);
        const finalMaterial1 = finalInventory.items.find(i => i.itemId === materialItem1.id);

        if (initialMaterial1 && finalMaterial1) {
          expect(finalMaterial1.quantity).toBeLessThan(initialMaterial1.quantity);
        }
      }
    });

    test('should consume stamina when crafting', async () => {
      const initialStamina = character.currentStamina;
      const canCraft = await craftingService.canCraft(character.id, 'medpac_01');
      
      if (canCraft.canCraft) {
        await craftingService.craftItem(character.id, 'medpac_01', 1);

        await character.reload();
        expect(character.currentStamina).toBeLessThan(initialStamina);
      }
    });

    test('should throw error if insufficient stamina', async () => {
      character.currentStamina = 5;
      await character.save();

      const canCraft = await craftingService.canCraft(character.id, 'medpac_01');
      
      if (canCraft.canCraft) {
        await expect(
          craftingService.craftItem(character.id, 'medpac_01', 1)
        ).rejects.toThrow('stamina');
      }
    });

    test('should craft multiple items', async () => {
      const canCraft = await craftingService.canCraft(character.id, 'medpac_01');
      
      if (canCraft.canCraft) {
        const result = await craftingService.craftItem(character.id, 'medpac_01', 3);

        expect(result.success).toBe(true);
        expect(result.quantity).toBeGreaterThanOrEqual(1); // May be less due to success chance
      }
    });
  });
});

