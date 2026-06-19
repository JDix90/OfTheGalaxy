/**
 * Ranged enemies (PR C) — pure logic, no DB.
 *
 * buildEnemyCombatant derives weapon range/class from the equipped weapon's item def, and
 * enemyTryAttack gates on that range (a rifle-armed enemy hits from distance; a melee enemy only at
 * ~2.8) and tags the hit fx with the enemy origin + ranged flag for the client tracer.
 */

const combatService = require('../../../src/services/combatService');
const { getEnemyTemplate } = require('../../../src/data/enemyTemplates');
const { enemyTryAttack } = require('../../../src/realtime/combat');

describe('buildEnemyCombatant weapon range/class', () => {
  test('a rifle-armed template becomes a ranged combatant', () => {
    const c = combatService.buildEnemyCombatant(getEnemyTemplate('ironclad')); // pulser_rifle_01, range 50
    expect(c.equipment.weapon.class).toBe('ranged');
    expect(c.equipment.weapon.range).toBe(50);
  });
});

// --- enemyTryAttack range gating (fake actors + world) ---

function mkEnemyActor(weapon, x) {
  return {
    id: 'e1', dead: false, x, z: 0, attackCdUntil: 0,
    combatant: {
      id: 'ec', type: 'enemy',
      stats: { health: 100, maxHealth: 100, attack: 20, defense: 5, accuracy: 100, critChance: 0, dodgeChance: 0 },
      equipment: { weapon: weapon || null }, temporaryEffects: [],
    },
  };
}
function mkTarget() {
  return {
    id: 'p1', dead: false, x: 0, z: 0, iFrameUntil: 0, lastCombatAt: 0, engagedEnemies: new Map(),
    combatant: { id: 'pc', type: 'player', stats: { health: 100, maxHealth: 100, defense: 5, dodgeChance: 0 }, temporaryEffects: [] },
  };
}
function mkWorld() {
  return { fx: [], intents: [], pushFx(e) { this.fx.push(e); }, pushIntent(i) { this.intents.push(i); } };
}
const hitFx = (w) => w.fx.find((f) => f.type === 'hit');

const RIFLE = { itemId: 'rifle', damage: 30, range: 50, class: 'ranged' }; // world range ~11.15
const BLADE = { itemId: 'blade', damage: 20, range: 2, class: 'melee' };   // world range 2.8

describe('enemyTryAttack range gate', () => {
  const now = 5000;

  test('a ranged enemy hits a player from beyond melee (dist 8)', () => {
    const world = mkWorld();
    enemyTryAttack(world, mkEnemyActor(RIFLE, 8), mkTarget(), now);
    const fx = hitFx(world);
    expect(fx).toBeTruthy();
    expect(fx.ranged).toBe(true);
    expect(fx.sx).toBe(8); // enemy origin → client draws the enemy→player tracer
  });

  test('a ranged enemy is out of range past its weapon reach (dist 13)', () => {
    const world = mkWorld();
    enemyTryAttack(world, mkEnemyActor(RIFLE, 13), mkTarget(), now);
    expect(hitFx(world)).toBeFalsy();
  });

  test('a melee enemy still requires ~2.8 (hit at 2, miss-range at 8)', () => {
    const close = mkWorld();
    enemyTryAttack(close, mkEnemyActor(BLADE, 2), mkTarget(), now);
    const fx = hitFx(close);
    expect(fx).toBeTruthy();
    expect(fx.ranged).toBe(false);

    const far = mkWorld();
    enemyTryAttack(far, mkEnemyActor(BLADE, 8), mkTarget(), now);
    expect(hitFx(far)).toBeFalsy();
  });
});
