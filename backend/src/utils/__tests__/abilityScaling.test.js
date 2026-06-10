/**
 * Tests for Ability Scaling Utility
 */

const {
  calculateAttributeMultiplier,
  calculateHealing,
  calculateDamage,
  calculateCraftingSuccess,
  calculateMaterialCostReduction,
  calculateQualityBonus
} = require('../abilityScaling');

describe('Ability Scaling Utility', () => {
  describe('calculateAttributeMultiplier', () => {
    test('should return 1.0 for base attribute', () => {
      const tiers = [{ max: 10, multiplier: 0.03 }];
      const multiplier = calculateAttributeMultiplier(10, 10, tiers);
      expect(multiplier).toBe(1.0);
    });

    test('should apply first tier correctly', () => {
      const tiers = [{ max: 10, multiplier: 0.03 }];
      const multiplier = calculateAttributeMultiplier(15, 10, tiers);
      // 5 points * 0.03 = 0.15, so 1.0 + 0.15 = 1.15
      expect(multiplier).toBeCloseTo(1.15, 2);
    });

    test('should apply multiple tiers correctly', () => {
      const tiers = [
        { max: 10, multiplier: 0.03 },
        { max: Infinity, multiplier: 0.015 }
      ];
      const multiplier = calculateAttributeMultiplier(20, 10, tiers);
      // First 10 points: 10 * 0.03 = 0.30
      // Next 10 points: 10 * 0.015 = 0.15
      // Total: 1.0 + 0.30 + 0.15 = 1.45
      expect(multiplier).toBeCloseTo(1.45, 2);
    });
  });

  describe('calculateHealing', () => {
    test('should calculate base healing correctly', () => {
      const healing = calculateHealing(50, 10, 0);
      expect(healing).toBe(50); // Base * 1.0 * 1.0
    });

    test('should apply intelligence scaling', () => {
      const healing = calculateHealing(50, 15, 0);
      // 5 points above base: 5 * 0.03 = 0.15, so 1.15 multiplier
      // 50 * 1.15 * 1.0 = 57.5, floored = 57
      expect(healing).toBe(57);
    });

    test('should apply skill multiplier', () => {
      const healing = calculateHealing(50, 10, 5);
      // Base: 50
      // Intelligence: 1.0 (no bonus)
      // Skill: 1 + (5 * 0.05) = 1.25
      // 50 * 1.0 * 1.25 = 62.5, floored = 62
      expect(healing).toBe(62);
    });

    test('should combine intelligence and skill', () => {
      const healing = calculateHealing(50, 15, 3);
      // Intelligence: 1.15 (5 points * 0.03)
      // Skill: 1.15 (3 * 0.05)
      // 50 * 1.15 * 1.15 = 66.125, floored = 66
      expect(healing).toBe(66);
    });
  });

  describe('calculateDamage', () => {
    test('should calculate base damage correctly', () => {
      const damage = calculateDamage(20, 10, 0, 0);
      expect(damage).toBe(20);
    });

    test('should apply strength scaling', () => {
      const damage = calculateDamage(20, 15, 0, 0);
      // 5 points above base: 5 * 0.02 = 0.10, so 1.10 multiplier
      // 20 * 1.10 * 1.0 = 22
      expect(damage).toBe(22);
    });

    test('should apply skill bonus', () => {
      const damage = calculateDamage(20, 10, 0, 10); // 10% skill bonus
      // 20 * 1.0 * 1.10 = 22
      expect(damage).toBe(22);
    });
  });

  describe('calculateCraftingSuccess', () => {
    test('should calculate base success correctly', () => {
      const success = calculateCraftingSuccess(0.50, 10, 0, 0);
      expect(success).toBe(0.50);
    });

    test('should apply intelligence scaling', () => {
      const success = calculateCraftingSuccess(0.50, 15, 0, 0);
      // 5 points above base: 5 * 0.02 = 0.10, so 1.10 multiplier
      // 0.50 * 1.10 * 1.0 = 0.55
      expect(success).toBeCloseTo(0.55, 2);
    });

    test('should apply difficulty penalty', () => {
      const success = calculateCraftingSuccess(0.50, 10, 0, 0.1);
      // 0.50 * 1.0 * 1.0 - 0.1 = 0.40
      expect(success).toBe(0.40);
    });

    test('should clamp to valid range', () => {
      const success = calculateCraftingSuccess(0.50, 10, 0, 0.6); // Very high difficulty
      expect(success).toBeGreaterThanOrEqual(0.1);
      expect(success).toBeLessThanOrEqual(0.95);
    });
  });

  describe('calculateMaterialCostReduction', () => {
    test('should return 1.0 for no bonuses', () => {
      const multiplier = calculateMaterialCostReduction(0, 10);
      expect(multiplier).toBe(1.0);
    });

    test('should apply engineering reduction', () => {
      const multiplier = calculateMaterialCostReduction(5, 10);
      // 5 * 0.05 = 0.25 reduction, so 1.0 - 0.25 = 0.75
      expect(multiplier).toBe(0.75);
    });

    test('should apply intelligence reduction', () => {
      const multiplier = calculateMaterialCostReduction(0, 15);
      // 5 points above base: 5 * 0.01 = 0.05 reduction, so 0.95
      expect(multiplier).toBe(0.95);
    });

    test('should cap at 50% reduction', () => {
      const multiplier = calculateMaterialCostReduction(20, 30);
      // Very high bonuses, but capped at 0.5
      expect(multiplier).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('calculateQualityBonus', () => {
    test('should return 1.0 for no bonuses', () => {
      const multiplier = calculateQualityBonus(0, 10);
      expect(multiplier).toBe(1.0);
    });

    test('should apply engineering bonus', () => {
      const multiplier = calculateQualityBonus(5, 10);
      // 5 * 0.02 = 0.10, so 1.10
      expect(multiplier).toBe(1.10);
    });

    test('should apply intelligence bonus', () => {
      const multiplier = calculateQualityBonus(0, 15);
      // 5 points above base: 5 * 0.005 = 0.025, so 1.025
      expect(multiplier).toBeCloseTo(1.025, 3);
    });
  });
});

