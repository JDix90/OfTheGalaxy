/**
 * Weapon-driven attack range (PR A) — pure logic, no DB.
 *
 * Covers the items.weaponWorldRange/weaponClass mapping and the realtime resolveCast range gate:
 * a melee weapon connects only at melee reach, a ranged weapon connects at its mapped world range
 * (and is rejected beyond it), unarmed defaults to melee, and a ranged hit fx carries the attacker
 * origin + ranged flag for the client tracer. Damage abilities honour the equipped weapon's reach.
 */

const { weaponWorldRange, weaponClass, MELEE_WORLD_RANGE, RANGED_WORLD_MAX } = require('../../../src/data/items');
const { resolveCast } = require('../../../src/realtime/combat');

describe('items weapon-range helpers', () => {
  test('weaponClass: blades melee, pistols/rifles ranged, unarmed melee', () => {
    expect(weaponClass({ range: 1 })).toBe('melee');   // shock-blade
    expect(weaponClass({ range: 2 })).toBe('melee');   // arcblade
    expect(weaponClass({ range: 30 })).toBe('ranged'); // pistol
    expect(weaponClass({ range: 50 })).toBe('ranged'); // rifle
    expect(weaponClass(null)).toBe('melee');           // unarmed
    expect(weaponClass({ stats: { range: 100 } })).toBe('ranged'); // full item def shape
  });

  test('weaponWorldRange: melee fixed, ranged scales and caps within stream radius', () => {
    expect(weaponWorldRange({ range: 2 })).toBe(MELEE_WORLD_RANGE);
    expect(weaponWorldRange(null)).toBe(MELEE_WORLD_RANGE);
    const pistol = weaponWorldRange({ range: 30 });
    const rifle = weaponWorldRange({ range: 50 });
    const sniper = weaponWorldRange({ range: 100 });
    expect(pistol).toBeGreaterThan(MELEE_WORLD_RANGE);
    expect(pistol).toBeLessThan(rifle);
    expect(rifle).toBeLessThan(sniper);
    expect(weaponWorldRange({ range: 150 })).toBe(RANGED_WORLD_MAX); // capped
    expect(sniper).toBeLessThanOrEqual(RANGED_WORLD_MAX);
  });
});

// --- resolveCast range gating (fake actors + world; calculateDamage runs for real) ---

const RANGED_WEAPON = { itemId: 'rifle', damage: 30, range: 50, class: 'ranged' }; // world range ~11.15
const MELEE_WEAPON = { itemId: 'blade', damage: 20, range: 2, class: 'melee' };     // world range 2.8

function mkPlayerCombatant(weapon) {
  return {
    id: 'pc', type: 'player',
    stats: { health: 100, maxHealth: 100, stamina: 50, maxStamina: 50, attack: 25, defense: 5, accuracy: 100, critChance: 0, dodgeChance: 0 },
    equipment: { weapon: weapon || null },
    temporaryEffects: [],
  };
}
function mkEnemyActor(x) {
  return {
    id: 'e1', dead: false, x, z: 0, aggressive: false,
    combatant: { id: 'ec', type: 'enemy', stats: { health: 100, maxHealth: 100, defense: 5, dodgeChance: 0 }, temporaryEffects: [] },
  };
}
function mkPlayer(combatant, abilities = []) {
  return { id: 'p1', dead: false, combatant, abilities, abilityCdUntil: {}, engagedEnemies: new Map(), x: 0, z: 0, lastCombatAt: 0 };
}
function mkWorld(enemy) {
  return { enemies: new Map([[enemy.id, enemy]]), fx: [], intents: [], pushFx(e) { this.fx.push(e); }, pushIntent(i) { this.intents.push(i); } };
}
const hitFx = (w) => w.fx.find((f) => f.type === 'hit');

describe('resolveCast basic-attack range gate', () => {
  const now = 1000;
  const cast = (player, world) => resolveCast(world, player, { ability: 'basic_attack', targetId: 'e1' }, now);

  test('ranged weapon connects at its mapped range (enemy at 10)', () => {
    const enemy = mkEnemyActor(10);
    const world = mkWorld(enemy);
    cast(mkPlayer(mkPlayerCombatant(RANGED_WEAPON)), world);
    const fx = hitFx(world);
    expect(fx).toBeTruthy();
    expect(fx.ranged).toBe(true);
    expect(fx.sx).toBe(0); // attacker origin for the tracer
    expect(fx.sz).toBe(0);
  });

  test('ranged weapon is rejected beyond its range (enemy at 13)', () => {
    const enemy = mkEnemyActor(13); // past ~11.15
    const world = mkWorld(enemy);
    cast(mkPlayer(mkPlayerCombatant(RANGED_WEAPON)), world);
    expect(hitFx(world)).toBeFalsy();
  });

  test('melee weapon connects only in melee reach (hit at 2, miss-range at 6)', () => {
    const close = mkWorld(mkEnemyActor(2));
    cast(mkPlayer(mkPlayerCombatant(MELEE_WEAPON)), close);
    const fx = hitFx(close);
    expect(fx).toBeTruthy();
    expect(fx.ranged).toBe(false); // melee → no tracer

    const far = mkWorld(mkEnemyActor(6));
    cast(mkPlayer(mkPlayerCombatant(MELEE_WEAPON)), far);
    expect(hitFx(far)).toBeFalsy();
  });

  test('unarmed defaults to melee reach (miss at 5)', () => {
    const far = mkWorld(mkEnemyActor(5));
    cast(mkPlayer(mkPlayerCombatant(null)), far);
    expect(hitFx(far)).toBeFalsy();
    const close = mkWorld(mkEnemyActor(2));
    cast(mkPlayer(mkPlayerCombatant(null)), close);
    expect(hitFx(close)).toBeTruthy();
  });
});

describe('resolveCast damage-ability range honours the weapon', () => {
  const now = 1000;
  // weapon_mastery: enemy-targeted damage ability (stam 25, cd 3). A ranged weapon extends a damage
  // ability past the base ranged reach (13) up to the weapon's world range cap (15).
  test('a ranged weapon lets a damage ability reach to ~14 (base ranged cap is 13)', () => {
    const enemy = mkEnemyActor(14);
    const world = mkWorld(enemy);
    const player = mkPlayer(mkPlayerCombatant({ itemId: 'sniper', damage: 60, range: 150, class: 'ranged' }), ['weapon_mastery']);
    resolveCast(world, player, { ability: 'weapon_mastery', targetId: 'e1' }, now);
    expect(hitFx(world)).toBeTruthy();
  });

  test('a melee weapon does NOT extend a damage ability past the base ranged reach (miss at 14)', () => {
    const enemy = mkEnemyActor(14);
    const world = mkWorld(enemy);
    const player = mkPlayer(mkPlayerCombatant(MELEE_WEAPON), ['weapon_mastery']);
    resolveCast(world, player, { ability: 'weapon_mastery', targetId: 'e1' }, now);
    expect(hitFx(world)).toBeFalsy(); // 14 > ABILITY_RANGE_RANGED(13) and weapon range is melee
  });
});
