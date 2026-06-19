/**
 * Equipment bonus aggregation + skill-level wiring (PR B) — pure logic, no DB.
 *
 * Verifies the disjoint aggregation rules (tool-slot skills excluded; weapon.damage / armor.defense
 * excluded from the attribute/combat sums) and that ProgressionSystem folds a gear skill bonus into
 * the trained level.
 */

const { aggregateEquipmentStats } = require('../../../src/data/items');
const { ProgressionSystem } = require('../../../src/utils/progressionSystem');

describe('aggregateEquipmentStats', () => {
  test('sums attributes from all slots, skills from non-tool slots, combat from accessories', () => {
    const agg = aggregateEquipmentStats([
      { slot: 'accessory', stats: { perception: 5, lockpicking: 15, intelligence: 2, defense: 3 } },
      { slot: 'tool', stats: { hacking: 10, repair: 5 } },              // skills owned by toolService → excluded
      { slot: 'armor', stats: { defense: 20, mobility: 5, forcePower: 8 } }, // defense/mobility excluded; forcePower summed
      { slot: 'weapon', stats: { damage: 50, forcePower: 15 } },        // damage excluded; forcePower summed
    ]);
    expect(agg.attributes).toEqual({ intelligence: 2, perception: 5, forcePower: 23 });
    expect(agg.skills).toEqual({ lockpicking: 15 }); // tool-slot hacking/repair excluded
    expect(agg.combat).toEqual({ defense: 3 });      // only the accessory's flat combat field
  });

  test('empty / missing input is safe', () => {
    expect(aggregateEquipmentStats([])).toEqual({ attributes: {}, skills: {}, combat: {} });
    expect(aggregateEquipmentStats(null)).toEqual({ attributes: {}, skills: {}, combat: {} });
  });
});

describe('ProgressionSystem.getSkillLevel with equipment bonuses', () => {
  const character = { skills: { stealth: { lockpicking: { level: 3 } }, technical: { hacking: { level: 2 } } } };

  test('adds the gear bonus on top of the trained level', () => {
    const ps = new ProgressionSystem(character, { lockpicking: 15 });
    expect(ps.getSkillLevel('stealth', 'lockpicking')).toBe(18); // 3 trained + 15 gear
    expect(ps.getSkillLevel('technical', 'hacking')).toBe(2);    // no gear bonus for hacking
  });

  test('no gear map → trained level only (back-compat)', () => {
    const ps = new ProgressionSystem(character);
    expect(ps.getSkillLevel('stealth', 'lockpicking')).toBe(3);
    expect(ps.getSkillLevel('stealth', 'untrained')).toBe(0);
  });
});
