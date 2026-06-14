/**
 * Enemy threat tiers + cliff retune (no DB).
 */

const { getAllEnemyTemplates, getEnemyTemplate } = require('../../../src/data/enemyTemplates');
const combat = require('../../../src/services/combatService'); // singleton; buildEnemyCombatant is a pure transform

const VALID_TIERS = ['normal', 'veteran', 'elite', 'boss'];

describe('enemy threat tiers', () => {
  test('every template declares a valid tier', () => {
    const templates = getAllEnemyTemplates();
    for (const [id, t] of Object.entries(templates)) {
      expect(VALID_TIERS).toContain(t.tier);
    }
  });

  test('basics are normal, captains/hunters are elite', () => {
    expect(getEnemyTemplate('ironclad').tier).toBe('normal');
    expect(getEnemyTemplate('wild_animal').tier).toBe('normal');
    expect(getEnemyTemplate('pirate_captain').tier).toBe('elite');
    expect(getEnemyTemplate('bounty_hunter').tier).toBe('elite');
  });

  test('the difficulty-cliff outliers were retuned down', () => {
    // Pirate Captain was 200hp/25atk; Bounty Hunter 180hp/22atk.
    expect(getEnemyTemplate('pirate_captain').stats.health).toBeLessThanOrEqual(180);
    expect(getEnemyTemplate('bounty_hunter').stats.health).toBeLessThanOrEqual(170);
  });

  test('buildEnemyCombatant carries the tier and a dodge stat onto the combatant', () => {
    const c = combat.buildEnemyCombatant(getEnemyTemplate('pirate_captain'));
    expect(c.tier).toBe('elite');
    expect(typeof c.stats.dodgeChance).toBe('number');
    expect(c.stats.dodgeChance).toBeGreaterThanOrEqual(0);
    expect(c.stats.dodgeChance).toBeLessThanOrEqual(0.15);
    // A normal-tier template still gets a tier label.
    expect(combat.buildEnemyCombatant(getEnemyTemplate('ironclad')).tier).toBe('normal');
  });
});
