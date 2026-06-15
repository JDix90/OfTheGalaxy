/**
 * NPC generation logic (DB-free): submap template resolution, occupation domains, and the
 * seeded-RNG decorrelation that stops a whole submap's NPCs collapsing into one type.
 */

const templates = require('../../../src/data/npcTemplates');
const npcGenerator = require('../../../src/services/npcGenerator');

describe('getSubMapTemplate', () => {
  test('normalizes facility/variant types to a real template', () => {
    expect(templates.getSubMapTemplate('medical_center')).toBe(templates.subMapTemplates.medical_center);
    expect(templates.getSubMapTemplate('hospital')).toBe(templates.subMapTemplates.medical_center);
    expect(templates.getSubMapTemplate('civic')).toBe(templates.subMapTemplates.civic);
    expect(templates.getSubMapTemplate('government_district')).toBe(templates.subMapTemplates.civic);
    expect(templates.getSubMapTemplate('city_district')).toBe(templates.subMapTemplates.city);
    expect(templates.getSubMapTemplate('residence')).toBe(templates.subMapTemplates.residential);
    expect(templates.getSubMapTemplate('market')).toBe(templates.subMapTemplates.market);
  });

  test('unknown types fall back to city', () => {
    expect(templates.getSubMapTemplate('building_interior')).toBe(templates.subMapTemplates.city);
    expect(templates.getSubMapTemplate(undefined)).toBe(templates.subMapTemplates.city);
  });

  test('medical_center is staff-dominant (mostly generic medics)', () => {
    const t = templates.subMapTemplates.medical_center;
    const gi = t.npcTypes.indexOf('generic');
    expect(gi).toBeGreaterThanOrEqual(0);
    expect(t.npcTypeWeights[gi]).toBeGreaterThan(0.5);
  });
});

describe('getOccupationForSubMap', () => {
  const rndMid = () => 0.5;

  test('clinics produce medical staff and supply vendors', () => {
    const medics = ['medic', 'nurse', 'doctor', 'orderly', 'paramedic', 'caretaker', 'patient'];
    const supply = ['pharmacist', 'apothecary', 'medical_supplier', 'quartermaster'];
    for (let i = 0; i < 12; i++) {
      const r = templates.seededRandom(templates.getSeed(`clinic_${i}`));
      expect(medics).toContain(npcGenerator.getOccupationForSubMap('medical_center', 'generic', r));
      expect(supply).toContain(npcGenerator.getOccupationForSubMap('medical_center', 'vendor', r));
    }
  });

  test('residences produce residents, not shopkeepers', () => {
    const residents = ['resident', 'homeowner', 'tenant', 'neighbor', 'caretaker'];
    for (let i = 0; i < 12; i++) {
      const r = templates.seededRandom(templates.getSeed(`home_${i}`));
      expect(residents).toContain(npcGenerator.getOccupationForSubMap('residential', 'generic', r));
    }
  });

  test('security role resolves to guard/enforcer occupations', () => {
    const r = () => 0.5;
    expect(npcGenerator.getOccupationForSubMap('civic', 'security', r)).toMatch(/guard|sentinel|enforcer/);
    expect(npcGenerator.getOccupationForSubMap('spaceport', 'security', r)).toMatch(/security|customs|enforcer/);
    expect(npcGenerator.getOccupationForSubMap('city', 'security', r)).toMatch(/guard|patrol|enforcer/);
  });

  test('unknown domain falls back to city occupations (never throws)', () => {
    expect(typeof npcGenerator.getOccupationForSubMap('nowhere', 'generic', rndMid)).toBe('string');
  });
});

describe('seededRandom decorrelation', () => {
  // Regression: consecutive submap NPC seeds (`..._npc_0`, `_npc_1`, ...) used to yield first
  // draws ~0.04 apart, so weightedRandom collapsed a whole clinic into "vendor". The warmed
  // LCG must spread consecutive seeds across the weight bands.
  test('a clinic-sized batch of consecutive seeds is NOT all the same npc type', () => {
    const types = ['generic', 'vendor', 'quest_giver'];
    const weights = [0.7, 0.2, 0.1];
    const base = 'sinkport_sinkport_city_medical_center_medical_center';
    const picks = [];
    for (let i = 0; i < 6; i++) {
      const r = templates.seededRandom(templates.getSeed(`${base}_npc_${i}`));
      picks.push(templates.weightedRandom(types, weights, r));
    }
    expect(new Set(picks).size).toBeGreaterThan(1);
    // 'generic' (70% weight) should be the most common across the batch.
    const generic = picks.filter((p) => p === 'generic').length;
    expect(generic).toBeGreaterThanOrEqual(picks.length / 2);
  });

  test('overall distribution stays ~uniform to the weights', () => {
    const types = ['a', 'b', 'c'];
    const weights = [0.7, 0.2, 0.1];
    const counts = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 3000; i++) {
      const r = templates.seededRandom(templates.getSeed(`dist_${i}_x_${i % 7}`));
      counts[templates.weightedRandom(types, weights, r)]++;
    }
    expect(counts.a / 3000).toBeGreaterThan(0.6); // ~0.7
    expect(counts.a / 3000).toBeLessThan(0.8);
    expect(counts.c / 3000).toBeLessThan(0.2); // ~0.1
  });
});
