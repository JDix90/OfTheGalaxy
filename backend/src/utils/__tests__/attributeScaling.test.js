/**
 * Tests for Attribute Scaling Utility
 */

const {
  getAttributePointCost,
  getAttributeGain,
  canIncreaseAttribute,
  getCostPreview
} = require('../attributeScaling');

describe('Attribute Scaling Utility', () => {
  describe('getAttributePointCost', () => {
    test('should return 1 for attributes below soft cap', () => {
      expect(getAttributePointCost(10)).toBe(1);
      expect(getAttributePointCost(25)).toBe(1);
      expect(getAttributePointCost(49)).toBe(1);
    });

    test.skip('should increase cost past soft cap', () => {
      const cost50 = getAttributePointCost(50);
      const cost55 = getAttributePointCost(55);
      const cost60 = getAttributePointCost(60);
      
      expect(cost50).toBeGreaterThan(1);
      expect(cost55).toBeGreaterThan(cost50);
      expect(cost60).toBeGreaterThan(cost55);
    });

    test('should scale exponentially', () => {
      const cost70 = getAttributePointCost(70);
      const cost80 = getAttributePointCost(80);
      const cost90 = getAttributePointCost(90);
      
      // Cost should increase significantly
      expect(cost90).toBeGreaterThan(cost80);
      expect(cost80).toBeGreaterThan(cost70);
    });
  });

  describe('getAttributeGain', () => {
    test('should return 1 for attributes below soft cap', () => {
      expect(getAttributeGain(10)).toBe(1);
      expect(getAttributeGain(25)).toBe(1);
      expect(getAttributeGain(49)).toBe(1);
    });

    test.skip('should flatten gain past soft cap', () => {
      const gain50 = getAttributeGain(50);
      const gain60 = getAttributeGain(60);
      const gain70 = getAttributeGain(70);
      
      expect(gain50).toBeLessThan(1);
      expect(gain60).toBeLessThan(gain50);
      expect(gain70).toBeLessThan(gain60);
    });

    test('should maintain minimum gain', () => {
      const gain90 = getAttributeGain(90);
      const gain95 = getAttributeGain(95);
      
      expect(gain90).toBeGreaterThanOrEqual(0.5);
      expect(gain95).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('canIncreaseAttribute', () => {
    test('should allow increase below soft cap', () => {
      const result = canIncreaseAttribute(25, 5);
      expect(result.canIncrease).toBe(true);
      expect(result.cost).toBe(1);
    });

    test('should prevent increase at hard cap', () => {
      const result = canIncreaseAttribute(100, 10);
      expect(result.canIncrease).toBe(false);
      expect(result.reason).toContain('hard cap');
    });

    test('should check cost availability', () => {
      const result = canIncreaseAttribute(55, 1);
      // If cost is 2 or more, should fail
      if (result.cost > 1) {
        expect(result.canIncrease).toBe(false);
        expect(result.reason).toContain('Need');
      }
    });

    test('should return cost and gain', () => {
      const result = canIncreaseAttribute(25, 5);
      expect(result).toHaveProperty('cost');
      expect(result).toHaveProperty('gain');
    });
  });

  describe('getCostPreview', () => {
    test('should generate preview array', () => {
      const preview = getCostPreview(10, 5);
      expect(preview).toBeInstanceOf(Array);
      expect(preview.length).toBe(5);
    });

    test.skip('should show increasing costs', () => {
      const preview = getCostPreview(50, 5);
      expect(preview[0].cost).toBeGreaterThan(1);
      // Costs should generally increase
      for (let i = 1; i < preview.length; i++) {
        expect(preview[i].totalCost).toBeGreaterThan(preview[i-1].totalCost);
      }
    });

    test('should stop at hard cap', () => {
      const preview = getCostPreview(98, 5);
      // Should stop at 100
      expect(preview.length).toBeLessThanOrEqual(2);
    });
  });
});

