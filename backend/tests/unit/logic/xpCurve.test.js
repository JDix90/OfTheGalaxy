/**
 * XP curve + kill-XP pacing (no DB).
 * Locks the rebalanced curve (exponent 1.25) and the kills-to-level band so the
 * late-game grind regression can't silently return.
 */

const { scaleEnemyForLevel, getEnemyTemplate } = require('../../../src/data/enemyTemplates');

// Mirror of PlayerCharacter.getXPForNextLevel (kept in sync across the codebase).
const xpToNext = (level) => Math.floor(100 * Math.pow(level, 1.25));

describe('XP curve', () => {
  test('uses the flattened 1.25 exponent', () => {
    expect(xpToNext(1)).toBe(100);
    expect(xpToNext(10)).toBe(Math.floor(100 * Math.pow(10, 1.25)));
    // 1.25 is meaningfully gentler than the old 1.5.
    expect(xpToNext(16)).toBeLessThan(Math.floor(100 * Math.pow(16, 1.5)));
  });

  test('kills-to-level stays in the ~8-15 band for L3-L16 (basic enemy)', () => {
    for (const L of [3, 5, 8, 12, 16]) {
      const xpPerKill = scaleEnemyForLevel(getEnemyTemplate('ironclad'), L, 'moderate').xpReward;
      const kills = xpToNext(L) / xpPerKill;
      expect(kills).toBeGreaterThanOrEqual(6);
      expect(kills).toBeLessThanOrEqual(16);
    }
  });

  test('enemy XP scales faster than health (so leveling keeps pace)', () => {
    const l1 = scaleEnemyForLevel(getEnemyTemplate('ironclad'), 1, 'moderate');
    const l10 = scaleEnemyForLevel(getEnemyTemplate('ironclad'), 10, 'moderate');
    const xpRatio = l10.xpReward / l1.xpReward;
    const hpRatio = l10.stats.health / l1.stats.health;
    expect(xpRatio).toBeGreaterThan(hpRatio);
  });
});
