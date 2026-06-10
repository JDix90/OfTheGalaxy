/**
 * Tests for Derived Stats Utility
 */

const { calculateCombatStats, calculateDerivedStat, applyDR } = require('../derivedStats');

// Mock character data
const mockCharacter = {
  id: 'test-character',
  level: 5,
  stats: {
    strength: 14,
    agility: 12,
    endurance: 13,
    perception: 15,
    intelligence: 11,
    charisma: 10
  },
  skills: {
    combat: {
      basic_combat: { level: 3 },
      advanced_weapons: { level: 2 },
      tactical_awareness: { level: 1 }
    }
  }
};

describe('Derived Stats Utility', () => {
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
  });

  describe('calculateCombatStats', () => {
    test('should calculate attack rating', () => {
      const equipment = {
        weaponBase: 25,
        armorBase: 15
      };
      
      const stats = calculateCombatStats({
        character: mockCharacter,
        equipment
      });
      
      expect(stats.attackRating).toBeDefined();
      expect(stats.attackRating.value).toBeGreaterThan(0);
      expect(stats.attackRating.breakdown).toBeDefined();
    });

    test('should calculate defense rating', () => {
      const equipment = {
        weaponBase: 25,
        armorBase: 15
      };
      
      const stats = calculateCombatStats({
        character: mockCharacter,
        equipment
      });
      
      expect(stats.defenseRating).toBeDefined();
      expect(stats.defenseRating.value).toBeGreaterThan(0);
      expect(stats.defenseRating.breakdown).toBeDefined();
    });

    test('should calculate crit chance with DR', () => {
      const equipment = {
        weaponBase: 25,
        armorBase: 15
      };
      
      const stats = calculateCombatStats({
        character: mockCharacter,
        equipment
      });
      
      expect(stats.critChance).toBeDefined();
      expect(stats.critChance.value).toBeGreaterThan(0);
      expect(stats.critChance.value).toBeLessThanOrEqual(0.5); // Should be capped at 50%
      expect(stats.critChance.breakdown).toBeDefined();
    });

    test('should calculate dodge chance with DR', () => {
      const equipment = {
        weaponBase: 25,
        armorBase: 15
      };
      
      const stats = calculateCombatStats({
        character: mockCharacter,
        equipment
      });
      
      expect(stats.dodgeChance).toBeDefined();
      expect(stats.dodgeChance.value).toBeGreaterThanOrEqual(0);
      expect(stats.dodgeChance.value).toBeLessThanOrEqual(0.6); // Should be capped at 60%
    });
  });

  describe('calculateDerivedStat', () => {
    test('should throw error for invalid stat', () => {
      expect(() => {
        calculateDerivedStat('invalid', 'stat', { character: mockCharacter });
      }).toThrow();
    });

    test('should calculate stealth power', () => {
      const result = calculateDerivedStat('stealth', 'stealthPower', {
        character: mockCharacter,
        skills: {
          basicStealth: 3
        }
      });
      
      expect(result.value).toBeGreaterThan(0);
      expect(result.breakdown).toBeDefined();
    });
  });
});

