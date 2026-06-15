/**
 * Combat-migration Phase 0–1 pure-logic tests (no DB).
 * Covers buildEncounterMeta (surface vs dungeon + entrance grid→% math) and the
 * COMBAT_3D_ONLY feature flag. Run: npm run test:logic
 */

const { buildEncounterMeta } = require('../../../src/realtime/combat');
const { isCombat3DOnly, logCombatOutcome } = require('../../../src/config/combat');

describe('buildEncounterMeta', () => {
  test('surface world → random encounter, realtime metadata, no subMapId', () => {
    const { encounterType, metadata } = buildEncounterMeta({ planetId: 'gravenmoor', zone: { type: 'surface' } });
    expect(encounterType).toBe('random');
    expect(metadata.realtime).toBe(true);
    expect(metadata.planetId).toBe('gravenmoor');
    expect(metadata.subMapId).toBeUndefined();
  });

  test('missing zone defaults to surface', () => {
    const { encounterType, metadata } = buildEncounterMeta({ planetId: 'p' });
    expect(encounterType).toBe('random');
    expect(metadata.realtime).toBe(true);
  });

  test('dungeon world → dungeon encounter with subMapId + parentLocationId', () => {
    const { encounterType, metadata } = buildEncounterMeta({
      planetId: 'sinkport',
      zone: { type: 'dungeon', subMapId: 'sub_1', parentLocationId: 'poi_den', entrance: { x: 3, y: 5 }, dims: { w: 20, h: 20 } },
    });
    expect(encounterType).toBe('dungeon');
    expect(metadata.subMapId).toBe('sub_1');
    expect(metadata.parentLocationId).toBe('poi_den');
    // grid→% (cell-center): ((3+0.5)/20)*100 = 17.5, ((5+0.5)/20)*100 = 27.5
    expect(metadata.respawn.x).toBeCloseTo(17.5, 5);
    expect(metadata.respawn.y).toBeCloseTo(27.5, 5);
  });

  test('dungeon entrance already in percent (v > dim) is kept as-is', () => {
    const { metadata } = buildEncounterMeta({
      planetId: 'p', zone: { type: 'dungeon', subMapId: 's', entrance: { x: 50, y: 60 }, dims: { w: 20, h: 20 } },
    });
    expect(metadata.respawn.x).toBe(50);
    expect(metadata.respawn.y).toBe(60);
  });

  test('dungeon with no entrance → no respawn point (graceful)', () => {
    const { encounterType, metadata } = buildEncounterMeta({
      planetId: 'p', zone: { type: 'dungeon', subMapId: 's' },
    });
    expect(encounterType).toBe('dungeon');
    expect(metadata.respawn).toBeUndefined();
  });

  test('falls back to world.subMapId when zone.subMapId is absent', () => {
    const { metadata } = buildEncounterMeta({ planetId: 'p', subMapId: 'fallback_sub', zone: { type: 'dungeon' } });
    expect(metadata.subMapId).toBe('fallback_sub');
  });
});

describe('isCombat3DOnly', () => {
  const prev = process.env.COMBAT_3D_ONLY;
  afterEach(() => { if (prev === undefined) delete process.env.COMBAT_3D_ONLY; else process.env.COMBAT_3D_ONLY = prev; });

  test('default (unset) is false', () => { delete process.env.COMBAT_3D_ONLY; expect(isCombat3DOnly()).toBe(false); });
  test("'true' is true (case-insensitive)", () => { process.env.COMBAT_3D_ONLY = 'TRUE'; expect(isCombat3DOnly()).toBe(true); });
  test("'false'/'1' are false (only the literal 'true' enables)", () => {
    process.env.COMBAT_3D_ONLY = 'false'; expect(isCombat3DOnly()).toBe(false);
    process.env.COMBAT_3D_ONLY = '1'; expect(isCombat3DOnly()).toBe(false);
  });
});

describe('logCombatOutcome', () => {
  test('never throws (telemetry is best-effort)', () => {
    expect(() => logCombatOutcome({ encounterId: 'x', status: 'won', engine: 'realtime' })).not.toThrow();
    expect(() => logCombatOutcome()).not.toThrow();
  });
});
