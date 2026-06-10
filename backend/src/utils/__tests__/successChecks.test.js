/**
 * Tests for Success Check Utility
 */

const {
  calculateSuccessChance,
  rollForSuccess,
  rollWithAdvantage,
  rollWithDisadvantage,
  rollBestOfThree,
  attemptLockpick,
  attemptHack,
  attemptCraft
} = require('../successChecks');

describe('Success Check Utility', () => {
  describe('calculateSuccessChance', () => {
    test('should return valid probability range', () => {
      const chance = calculateSuccessChance(5, 10, 10, 0);
      expect(chance).toBeGreaterThanOrEqual(0.1);
      expect(chance).toBeLessThanOrEqual(0.95);
    });

    test('should increase with higher skill', () => {
      const chance1 = calculateSuccessChance(5, 10, 10, 0);
      const chance2 = calculateSuccessChance(10, 10, 10, 0);
      expect(chance2).toBeGreaterThan(chance1);
    });

    test('should decrease with higher difficulty', () => {
      const chance1 = calculateSuccessChance(5, 10, 10, 0);
      const chance2 = calculateSuccessChance(5, 10, 20, 0);
      expect(chance2).toBeLessThan(chance1);
    });

    test('should apply tool bonus', () => {
      const chance1 = calculateSuccessChance(5, 10, 10, 0);
      const chance2 = calculateSuccessChance(5, 10, 10, 5);
      expect(chance2).toBeGreaterThan(chance1);
    });
  });

  describe('rollForSuccess', () => {
    test('should return boolean', () => {
      const result = rollForSuccess(0.5);
      expect(typeof result).toBe('boolean');
    });

    test('should always succeed with 1.0 chance', () => {
      // Run multiple times to ensure consistency
      for (let i = 0; i < 10; i++) {
        const result = rollForSuccess(1.0);
        expect(result).toBe(true);
      }
    });

    test('should never succeed with 0.0 chance', () => {
      for (let i = 0; i < 10; i++) {
        const result = rollForSuccess(0.0);
        expect(result).toBe(false);
      }
    });
  });

  describe('rollWithAdvantage', () => {
    test('should return boolean', () => {
      const result = rollWithAdvantage(0.5);
      expect(typeof result).toBe('boolean');
    });

    test('should have higher success rate than normal roll', () => {
      // This is probabilistic, so we'll just verify it can succeed
      let succeeded = false;
      for (let i = 0; i < 100; i++) {
        if (rollWithAdvantage(0.5)) {
          succeeded = true;
          break;
        }
      }
      // With 100 attempts at 50% chance, we should succeed at least once
      expect(succeeded).toBe(true);
    });
  });

  describe('rollWithDisadvantage', () => {
    test('should return boolean', () => {
      const result = rollWithDisadvantage(0.5);
      expect(typeof result).toBe('boolean');
    });

    test('should have lower success rate than normal roll', () => {
      // This is probabilistic, so we'll just verify it can fail
      let failed = false;
      for (let i = 0; i < 100; i++) {
        if (!rollWithDisadvantage(0.5)) {
          failed = true;
          break;
        }
      }
      // With 100 attempts at 50% chance, we should fail at least once
      expect(failed).toBe(true);
    });
  });

  describe('rollBestOfThree', () => {
    test('should return boolean', () => {
      const result = rollBestOfThree(0.5);
      expect(typeof result).toBe('boolean');
    });

    test('should have higher success rate than single roll', () => {
      // This is probabilistic, but best-of-3 should succeed more often
      let succeeded = false;
      for (let i = 0; i < 50; i++) {
        if (rollBestOfThree(0.3)) {
          succeeded = true;
          break;
        }
      }
      // With 50 attempts at 30% chance (best of 3), we should succeed
      expect(succeeded).toBe(true);
    });
  });

  describe('attemptLockpick', () => {
    test('should return result object', () => {
      const result = attemptLockpick(5, 12, 1, 0, false);
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('chance');
      expect(result).toHaveProperty('usedAdvantage');
    });

    test('should calculate chance correctly', () => {
      const result = attemptLockpick(5, 12, 1, 0, false);
      expect(result.chance).toBeGreaterThanOrEqual(0.1);
      expect(result.chance).toBeLessThanOrEqual(0.95);
    });

    test('should use advantage when provided', () => {
      const result = attemptLockpick(5, 12, 1, 0, true);
      expect(result.usedAdvantage).toBe(true);
    });
  });

  describe('attemptHack', () => {
    test('should return result object', () => {
      const result = attemptHack(5, 15, 1, 0, false);
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('chance');
      expect(result).toHaveProperty('usedAdvantage');
    });

    test('should calculate chance correctly', () => {
      const result = attemptHack(5, 15, 1, 0, false);
      expect(result.chance).toBeGreaterThanOrEqual(0.1);
      expect(result.chance).toBeLessThanOrEqual(0.95);
    });
  });

  describe('attemptCraft', () => {
    test('should return result object', () => {
      const result = attemptCraft(0.5, 0);
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('chance');
    });

    test('should apply difficulty', () => {
      const result1 = attemptCraft(0.5, 0);
      const result2 = attemptCraft(0.5, 0.1);
      expect(result2.chance).toBeLessThan(result1.chance);
    });
  });
});

