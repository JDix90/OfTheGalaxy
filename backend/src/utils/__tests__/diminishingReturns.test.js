/**
 * Tests for Diminishing Returns Utility
 */

const { 
  applyDR, 
  calculateCritChance, 
  calculateDodgeChance, 
  calculateCooldownReduction,
  getDRCurvePreview 
} = require('../diminishingReturns');

describe('Diminishing Returns Utility', () => {
  describe('applyDR', () => {
    test('should return 0 for negative or zero raw values', () => {
      expect(applyDR(0, 0.5, 0.15, 1.5)).toBe(0);
      expect(applyDR(-5, 0.5, 0.15, 1.5)).toBe(0);
    });

    test('should cap at maximum value', () => {
      const result = applyDR(100, 0.5, 0.15, 1.5);
      expect(result).toBeLessThanOrEqual(0.5);
    });

    test('should apply diminishing returns correctly', () => {
      const lowValue = applyDR(0.1, 0.5, 0.15, 1.5);
      const highValue = applyDR(0.5, 0.5, 0.15, 1.5);
      
      // High value should be less than raw value due to DR
      expect(highValue).toBeLessThan(0.5);
      // But should still be higher than low value
      expect(highValue).toBeGreaterThan(lowValue);
    });

    test('should handle very high values', () => {
      const result = applyDR(10, 0.5, 0.15, 1.5);
      expect(result).toBeLessThanOrEqual(0.5);
    });
  });

  describe('calculateCritChance', () => {
    test('should calculate base crit chance correctly', () => {
      const crit = calculateCritChance(10, 0, 0);
      expect(crit).toBeGreaterThan(0.04); // Should be around 5%
      expect(crit).toBeLessThan(0.06);
    });

    test('should add perception bonus', () => {
      const crit12 = calculateCritChance(12, 0, 0);
      const crit10 = calculateCritChance(10, 0, 0);
      expect(crit12).toBeGreaterThan(crit10);
    });

    test('should cap at 50%', () => {
      const crit = calculateCritChance(100, 100, 100); // Very high values
      expect(crit).toBeLessThanOrEqual(0.50);
    });

    test('should apply DR correctly', () => {
      const critLow = calculateCritChance(15, 0, 0);
      const critHigh = calculateCritChance(30, 10, 5);
      
      // High crit should be less than raw calculation would suggest
      expect(critHigh).toBeLessThan(0.50); // Should be DR'd
      expect(critHigh).toBeGreaterThan(critLow);
    });

    test('should handle skill and item bonuses', () => {
      const critNoBonus = calculateCritChance(15, 0, 0);
      const critWithBonus = calculateCritChance(15, 5, 3); // 5% skill, 3% item
      expect(critWithBonus).toBeGreaterThan(critNoBonus);
    });
  });

  describe('calculateDodgeChance', () => {
    test('should return 0 for base agility', () => {
      const dodge = calculateDodgeChance(10, 0, 0);
      expect(dodge).toBe(0);
    });

    test('should add agility bonus', () => {
      const dodge12 = calculateDodgeChance(12, 0, 0);
      const dodge10 = calculateDodgeChance(10, 0, 0);
      expect(dodge12).toBeGreaterThan(dodge10);
    });

    test('should cap at 60%', () => {
      const dodge = calculateDodgeChance(200, 100, 100); // Very high values
      expect(dodge).toBeLessThanOrEqual(0.60);
    });

    test('should apply DR correctly', () => {
      const dodgeLow = calculateDodgeChance(15, 0, 0);
      const dodgeHigh = calculateDodgeChance(30, 10, 5);
      
      // High dodge should be less than raw calculation would suggest
      expect(dodgeHigh).toBeLessThan(0.60); // Should be DR'd
      expect(dodgeHigh).toBeGreaterThan(dodgeLow);
    });
  });

  describe('calculateCooldownReduction', () => {
    test('should return 0 for 0% CDR', () => {
      const cdr = calculateCooldownReduction(0);
      expect(cdr).toBe(0);
    });

    test('should cap at 40%', () => {
      const cdr = calculateCooldownReduction(100); // 100% raw CDR
      expect(cdr).toBeLessThanOrEqual(0.40);
    });

    test('should apply DR correctly', () => {
      const cdrLow = calculateCooldownReduction(10);
      const cdrHigh = calculateCooldownReduction(50);
      
      // High CDR should be less than raw value
      expect(cdrHigh).toBeLessThan(0.50); // Should be DR'd
      expect(cdrHigh).toBeGreaterThan(cdrLow);
    });
  });

  describe('getDRCurvePreview', () => {
    test('should generate preview array', () => {
      const preview = getDRCurvePreview(0.50, 0.15, 1.5, 100);
      expect(preview).toBeInstanceOf(Array);
      expect(preview.length).toBeGreaterThan(0);
    });

    test('should have correct structure', () => {
      const preview = getDRCurvePreview(0.50, 0.15, 1.5, 50);
      expect(preview[0]).toHaveProperty('raw');
      expect(preview[0]).toHaveProperty('effective');
      expect(preview[0]).toHaveProperty('percentage');
    });

    test('should show diminishing returns', () => {
      const preview = getDRCurvePreview(0.50, 0.15, 1.5, 100);
      const first = preview[0];
      const last = preview[preview.length - 1];
      
      // Last should be higher than first
      expect(last.effective).toBeGreaterThan(first.effective);
      // But the increase should diminish
      const midPoint = Math.floor(preview.length / 2);
      const earlyIncrease = preview[10].effective - preview[5].effective;
      const lateIncrease = preview[preview.length - 1].effective - preview[preview.length - 6].effective;
      expect(lateIncrease).toBeLessThan(earlyIncrease); // Diminishing returns
    });
  });
});

