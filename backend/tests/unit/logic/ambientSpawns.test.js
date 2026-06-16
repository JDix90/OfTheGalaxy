/**
 * Ambient 3D-surface enemy spawns — Phase 4 (DB-free). Verifies the PlanetWorld population
 * model that replaces the old movement-driven random-encounter roll: faction/planet enemy
 * pools, danger + player-level scaling, escort escalation, and the respawn trickle.
 * Run: npm run test:logic
 */

const { PlanetWorld } = require('../../../src/realtime/PlanetWorld');
const encounterService = require('../../../src/services/encounterService');
const { enemyTemplates } = require('../../../src/data/enemyTemplates');

const stub = {
  isWalkableSurface: () => true, isWalkableWorld: () => true,
  surfaceToWorld: (x, y) => ({ x, z: y }), worldToSurface: (x, z) => ({ x, y: z }),
  integrate: (p) => ({ ...p, moving: false, speed: 0 }), scale: 0.8,
};
const fakePlayer = (over = {}) => ({ id: 'p1', x: 0, z: 0, facing: 0, level: 1, escort: false, dead: false, combatant: null, encounterId: null, input: {}, ...over });

describe('getPlanetEnemyTypes (salvaged faction/planet pools)', () => {
  test('vorr_cartel-controlled planet → cartel pool', () => {
    expect(encounterService.getPlanetEnemyTypes({ factionControl: 'vorr_cartel' })).toContain('pirate');
  });
  test('empire-controlled planet → ironclad pool', () => {
    expect(encounterService.getPlanetEnemyTypes({ factionControl: 'empire' })).toContain('ironclad');
  });
  test('unknown planet → non-empty default pool', () => {
    expect(encounterService.getPlanetEnemyTypes({}).length).toBeGreaterThan(0);
  });
});

describe('PlanetWorld ambient spawns', () => {
  test('spawns only from the provided enemy pool', () => {
    const w = new PlanetWorld('p', stub, {}, { dangerLevel: 6, enemyPool: ['pirate'] });
    expect(w.enemies.size).toBeGreaterThan(0);
    expect([...w.enemies.values()].every((e) => e.name === enemyTemplates.pirate.name)).toBe(true);
  });

  test('initial population matches the danger-scaled target (danger 6 → 5)', () => {
    const w = new PlanetWorld('p', stub, {}, { dangerLevel: 6 });
    expect(w._targetCount()).toBe(5);
    expect(w.enemies.size).toBe(5);
  });

  test('effLevel blends danger floor with average player level', () => {
    const w = new PlanetWorld('p', stub, {}, { dangerLevel: 6 });
    w.players.set('p1', fakePlayer({ level: 8 }));
    expect(w._effLevel()).toBe(8);          // player above danger
    w.players.get('p1').level = 3;
    expect(w._effLevel()).toBe(6);          // danger is the floor
  });

  test('escort escalation raises the target population (+2)', () => {
    const w = new PlanetWorld('p', stub, {}, { dangerLevel: 6 });
    expect(w._targetCount()).toBe(5);
    w.players.set('p1', fakePlayer({ escort: true }));
    expect(w._anyEscort()).toBe(true);
    expect(w._targetCount()).toBe(7);
  });

  test('ambient respawn refills toward the target over time (one per interval)', () => {
    const w = new PlanetWorld('p', stub, {}, { dangerLevel: 6 });
    w.players.set('p1', fakePlayer());
    w.enemies.clear();
    const now = Date.now();
    w.step(8, now);                          // one RESPAWN_INTERVAL
    expect(w.enemies.size).toBe(1);
    w.step(8, now);
    expect(w.enemies.size).toBe(2);
  });

  test('respawn does not exceed the target', () => {
    const w = new PlanetWorld('p', stub, {}, { dangerLevel: 2 }); // target = 3
    w.players.set('p1', fakePlayer());
    const now = Date.now();
    for (let i = 0; i < 10; i++) w.step(8, now);
    expect(w.enemies.size).toBe(w._targetCount());
    expect(w.enemies.size).toBe(3);
  });
});

describe('spawnScriptedEnemy (Phase 5)', () => {
  test('tags the combatant (enemyType / questId / objectiveId) and spawns near the point', () => {
    const w = new PlanetWorld('p', stub, {}, { dangerLevel: 6, enemyPool: ['pirate'] });
    w.players.set('p1', fakePlayer({ x: 10, z: 10 }));
    const id = w.spawnScriptedEnemy({ name: 'Palace Guardian', enemyType: 'palace_guardian', questId: 'q', objectiveId: 'o', near: { x: 10, z: 10 } });
    const e = w.enemies.get(id);
    expect(e).toBeTruthy();
    expect(e.name).toBe('Palace Guardian');
    expect(e.scripted).toBe(true);
    expect(e.combatant.enemyType).toBe('palace_guardian');
    expect(e.combatant.questId).toBe('q');
    expect(e.combatant.objectiveId).toBe('o');
    expect(Math.hypot(e.x - 10, e.z - 10)).toBeLessThan(20); // spawned near the requested point
  });

  test('untagged scripted spawn carries no quest tags', () => {
    const w = new PlanetWorld('p', stub, {}, { dangerLevel: 6 });
    w.players.set('p1', fakePlayer());
    const id = w.spawnScriptedEnemy({ name: 'Thug' });
    const e = w.enemies.get(id);
    expect(e.combatant.questId).toBeUndefined();
    expect(e.combatant.objectiveId).toBeUndefined();
  });
});
