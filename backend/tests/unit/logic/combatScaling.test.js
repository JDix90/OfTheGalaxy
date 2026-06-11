/**
 * Per-level combat power, crit scaling, and dodge (no DB).
 * Verifies the level term reaches attack + crit, and that dodge is now rolled.
 */

const { calculateCombatStats } = require('../../../src/utils/derivedStats');
const combat = require('../../../src/services/combatService'); // singleton; calculateDamage is pure

const stats = { strength: 13, agility: 11, endurance: 13, perception: 12, intelligence: 10, charisma: 10 };
const cs = (level) => calculateCombatStats({ character: { level, stats, skills: {} }, equipment: { weaponBase: 25, armorBase: 10 } });

describe('per-level combat power', () => {
  test('attack rating increases with level', () => {
    expect(cs(20).attackRating.value).toBeGreaterThan(cs(1).attackRating.value);
  });

  test('crit chance increases with level (was frozen ~9%)', () => {
    const c1 = cs(1).critChance.value;
    const c20 = cs(20).critChance.value;
    expect(c20).toBeGreaterThan(c1 + 0.03); // at least +3 points by L20
    expect(c20).toBeLessThanOrEqual(0.50);  // DR cap respected
  });
});

describe('dodge is applied in combat', () => {
  const attacker = { name: 'A', type: 'enemy', statusEffects: [], stats: { attack: 50, accuracy: 100, critChance: 0 } };
  const defender = (dodge) => ({ name: 'D', type: 'player', statusEffects: [], stats: { defense: 0, dodgeChance: dodge, health: 100, maxHealth: 100 } });

  test('a defender with 100% dodge always evades (damage 0, dodged true)', () => {
    for (let i = 0; i < 50; i++) {
      const r = combat.calculateDamage(attacker, defender(1));
      expect(r.dodged).toBe(true);
      expect(r.damage).toBe(0);
      expect(r.hit).toBe(false);
    }
  });

  test('a defender with 0% dodge is never recorded as dodging', () => {
    for (let i = 0; i < 50; i++) {
      const r = combat.calculateDamage(attacker, defender(0));
      expect(r.dodged).toBeFalsy();
    }
  });

  test('partial dodge reduces total damage taken over many swings', () => {
    let dmgNoDodge = 0, dmgWithDodge = 0;
    for (let i = 0; i < 2000; i++) {
      dmgNoDodge += combat.calculateDamage(attacker, defender(0)).damage;
      dmgWithDodge += combat.calculateDamage(attacker, defender(0.5)).damage;
    }
    expect(dmgWithDodge).toBeLessThan(dmgNoDodge);
  });
});
