/**
 * Phase 6 — tutorial → real-time 3D combat (DB-free logic). Covers the spaceport-as-real-time
 * pieces the tutorial fight rides on: hub-submap encounter metadata (coherent respawn), the
 * instanced + passive training drone, the tutorial HP floor, and owner-scoped engagement.
 * Run: npm run test:logic
 */

const { PlanetWorld } = require('../../../src/realtime/PlanetWorld');
const { WorldManager } = require('../../../src/realtime/WorldManager');
const { buildEncounterMeta, enemyTryAttack, resolveCast, buildEnemyActorCombatant } = require('../../../src/realtime/combat');
const { enemyTemplates } = require('../../../src/data/enemyTemplates');

const stub = {
  isWalkableSurface: () => true, isWalkableWorld: () => true,
  surfaceToWorld: (x, y) => ({ x, z: y }), worldToSurface: (x, z) => ({ x, y: z }),
  integrate: (p) => ({ ...p, moving: false, speed: 0 }), scale: 0.8,
};
// A real, calculateDamage-compatible combatant (same builder the engine uses for enemies).
const combatant = (over = {}) => {
  const c = buildEnemyActorCombatant(enemyTemplates.pirate);
  Object.assign(c.stats, over);
  return c;
};
const player = (over = {}) => ({
  id: 'p1', x: 0, z: 0, facing: 0, level: 1, escort: false, dead: false,
  combatant: combatant(), abilities: [], abilityCdUntil: {}, engagedEnemies: new Map(),
  encounterId: null, input: {}, ...over,
});

describe('buildEncounterMeta — hub-submap deaths stay coherent', () => {
  test('pure surface → random, no submap context', () => {
    const m = buildEncounterMeta({ planetId: 'solenne', zone: { type: 'surface' } });
    expect(m.encounterType).toBe('random');
    expect(m.metadata.subMapId).toBeUndefined();
    expect(m.metadata.respawn).toBeUndefined();
  });

  test('dungeon submap → dungeon encounter + subMapId + entrance respawn', () => {
    const m = buildEncounterMeta({ planetId: 'solenne', zone: { type: 'dungeon', subMapId: 'd1', parentLocationId: 'cave', entrance: { x: 2, y: 2 }, dims: { w: 12, h: 12 } } });
    expect(m.encounterType).toBe('dungeon');
    expect(m.metadata.subMapId).toBe('d1');
    expect(m.metadata.respawn.x).toBeGreaterThan(0);
  });

  test('hub submap (spaceport) → random, but KEEPS subMapId + entrance respawn (no surface kick)', () => {
    const m = buildEncounterMeta({ planetId: 'solenne', zone: { type: 'spaceport', subMapId: 'sp', parentLocationId: 'docks', entrance: { x: 2, y: 2 }, dims: { w: 12, h: 12 } } });
    expect(m.encounterType).toBe('random');       // not a dungeon → no clear_dungeon / 0.5× penalty
    expect(m.metadata.subMapId).toBe('sp');        // ...but coherent submap respawn metadata
    expect(m.metadata.respawn.x).toBeGreaterThan(0);
  });
});

describe('tutorial training drone — instanced, passive, tagged', () => {
  test('tutorial spec sets ownerId + passive (aggressive=false) + tutorial tags', () => {
    const w = new PlanetWorld('sp', stub, {}, { ambient: false });
    w.players.set('p1', player());
    const id = w.spawnScriptedEnemy({ templateId: 'droid_security', name: 'Training Drone', ownerId: 'p1', tutorial: true, passive: true, near: { x: 0, z: 0 } });
    const e = w.enemies.get(id);
    expect(e.ownerId).toBe('p1');
    expect(e.tutorial).toBe(true);
    expect(e.aggressive).toBe(false);
    expect(e.combatant.tutorial).toBe(true);
  });

  test('a normal scripted enemy is aggressive + unowned + untagged', () => {
    const w = new PlanetWorld('p', stub, {}, { dangerLevel: 4 });
    w.players.set('p1', player());
    const e = w.enemies.get(w.spawnScriptedEnemy({ name: 'Thug' }));
    expect(e.aggressive).toBe(true);
    expect(e.ownerId).toBeNull();
    expect(e.combatant.tutorial).toBeUndefined();
  });
});

describe('passive + owner-scoped enemy AI', () => {
  test('a passive drone does NOT chase its owner until struck', () => {
    const w = new PlanetWorld('sp', stub, {}, { ambient: false });
    w.players.set('p1', player({ x: 0, z: 0 }));
    const e = w.enemies.get(w.spawnScriptedEnemy({ templateId: 'droid_security', ownerId: 'p1', tutorial: true, passive: true, near: { x: 2, z: 0 } }));
    const now = Date.now();
    w.stepEnemies(1, now);
    expect(e.state).toBe('patrol');     // passive → never enters chase
    e.aggressive = true;                // struck → wakes (afterPlayerHit sets this in-engine)
    w.stepEnemies(1, now);
    expect(e.state).toBe('chase');
  });

  test('an instanced drone ignores a non-owner bystander', () => {
    const w = new PlanetWorld('sp', stub, {}, { ambient: false });
    w.players.set('p2', player({ id: 'p2', x: 1, z: 0 })); // adjacent bystander, NOT the owner
    const e = w.enemies.get(w.spawnScriptedEnemy({ templateId: 'droid_security', ownerId: 'p1', tutorial: true, passive: false, near: { x: 2, z: 0 } }));
    w.stepEnemies(1, Date.now());
    expect(e.state).toBe('patrol');     // owner absent → no valid target → patrol
    expect(e.targetId).toBeNull();
  });

  test('a non-owner cannot damage an instanced (tutorial) enemy', () => {
    const w = new PlanetWorld('sp', stub, {}, { ambient: false });
    w.players.set('p1', player());
    const other = player({ id: 'p2' });
    w.players.set('p2', other);
    const e = w.enemies.get(w.spawnScriptedEnemy({ templateId: 'droid_security', ownerId: 'p1', tutorial: true, near: { x: 0, z: 0 } }));
    e.x = 0; e.z = 0;
    const before = e.combatant.stats.health;
    resolveCast(w, other, { ability: 'basic_attack', targetId: e.id }, Date.now());
    expect(e.combatant.stats.health).toBe(before); // rejected by the owner guard — no damage
  });
});

describe('spawnFromRequest — tutorial floor lifecycle (no leak, no drone-stacking)', () => {
  const manager = () => new WorldManager({ DEFAULTS: { tickHz: 20 } }, {});

  test('a tutorial spawn sets the HP floor and is idempotent (never stacks a 2nd drone)', async () => {
    const m = manager();
    const w = new PlanetWorld('sp', stub, {}, { ambient: false });
    const p = player({ id: 'p1' });
    w.players.set('p1', p);
    await m.spawnFromRequest(w, p, { kind: 'tutorial' });
    expect(w.enemies.size).toBe(1);
    expect(p._hpFloor).toBeGreaterThan(0);
    await m.spawnFromRequest(w, p, { kind: 'tutorial' }); // repeated trigger
    expect(w.enemies.size).toBe(1);                        // no second drone
  });

  test('a NON-tutorial spawn lifts a leftover tutorial floor (no immortality in later fights)', async () => {
    const m = manager();
    const w = new PlanetWorld('sp', stub, {}, { ambient: false });
    const p = player({ id: 'p1' });
    p._hpFloor = 50;                                       // floor left over from an abandoned drone
    w.players.set('p1', p);
    await m.spawnFromRequest(w, p, { kind: 'noop' });      // any non-tutorial spawn request
    expect(p._hpFloor).toBe(0);
  });
});

describe('tutorial HP floor — a first-timer cannot die', () => {
  test('enemyTryAttack never drops an _hpFloor player below the floor (and never kills them)', () => {
    const w = new PlanetWorld('sp', stub, {}, { ambient: false });
    const p = player({ combatant: combatant({ health: 30, maxHealth: 100 }) });
    p._hpFloor = 25;
    w.players.set('p1', p);
    const e = w.enemies.get(w.spawnScriptedEnemy({ templateId: 'droid_security', ownerId: 'p1', tutorial: true, near: { x: 0, z: 0 } }));
    e.x = 0; e.z = 0;
    for (let i = 0; i < 12; i++) { e.attackCdUntil = 0; enemyTryAttack(w, e, p, Date.now()); }
    expect(p.combatant.stats.health).toBeGreaterThanOrEqual(25);
    expect(p.dead).toBeFalsy();
  });
});
