/**
 * Realtime combat lifecycle — Phase 0–1 migration fixes (DB-backed; runs in CI).
 *
 * Covers the CombatManager record/finalize/respawn paths that the migration plan's Phase 0–1
 * touch: the cross-engine guard, dungeon encounterType/subMapId stamping, coherent dungeon
 * respawn, and the level-up combatant refresh. Uses a minimal fake `world` (the real WS layer
 * isn't needed) + real models/services so the encounter records and character mutations are real.
 */

const { CombatManager } = require('../../../src/realtime/combat');
const { PlanetWorld } = require('../../../src/realtime/PlanetWorld');
const { setRealtimeManager } = require('../../../src/realtime/registry');
const combatService = require('../../../src/services/combatService');
const inventoryService = require('../../../src/services/inventoryService');
const { generateRandomEnemy } = require('../../../src/data/enemyTemplates');
const { CombatEncounter, PlayerCharacter } = require('../../../src/models');
const { createTestUser, createTestCharacter } = require('../../setup/testHelpers');

const mkWorld = (zone) => ({
  planetId: 'solenne',
  subMapId: (zone && zone.subMapId) || null,
  zone: zone || { type: 'surface' },
  sim: { surfaceToWorld: (x, y) => ({ x, z: y }) },
  spawnFor: () => ({ x: 7, z: 9, facing: Math.PI }),
  players: new Map(),
  fx: [],
  pushFx(ev) { this.fx.push(ev); },
});
const deadEnemy = () => { const c = combatService.buildEnemyCombatant(generateRandomEnemy(5)); c.stats.health = 0; return c; };
const liveEnemy = () => combatService.buildEnemyCombatant(generateRandomEnemy(5));

async function mkPlayer(character) {
  const sent = []; // captures WS messages the server pushes to this player
  return {
    characterId: character.id,
    combatant: await combatService.buildPlayerCombatant(character),
    engagedEnemies: new Map(),
    encounterId: null, _engaging: false, _finalizing: false, _fleePushed: false,
    abilities: [], abilityCdUntil: {}, x: 0, z: 0, facing: 0, dead: false, maxHp: character.maxHealth,
    ws: { readyState: 1, OPEN: 1, send: (s) => sent.push(JSON.parse(s)) },
    _sent: sent,
  };
}

const DUNGEON_ZONE = { type: 'dungeon', subMapId: 'sub_test_1', parentLocationId: 'poi_den', entrance: { x: 3, y: 5 }, dims: { w: 20, h: 20 } };

describe('Realtime combat lifecycle (Phase 0–1)', () => {
  let mgr, user, character;

  beforeEach(async () => {
    mgr = new CombatManager();
    user = await createTestUser();
    character = await createTestCharacter(user.id, { currentPlanet: 'solenne', credits: 5000, level: 3 });
  });

  afterEach(async () => {
    await CombatEncounter.destroy({ where: { characterId: character.id } });
  });

  test('dungeon engagement stamps encounterType=dungeon + subMapId + respawn point', async () => {
    const p = await mkPlayer(character);
    p.engagedEnemies.set('e0', deadEnemy());
    await mgr.ensureEncounter(mkWorld(DUNGEON_ZONE), p);

    expect(p.encounterId).toBeTruthy();
    const enc = await CombatEncounter.findByPk(p.encounterId);
    expect(enc.encounterType).toBe('dungeon');
    expect(enc.metadata.subMapId).toBe('sub_test_1');
    expect(enc.metadata.parentLocationId).toBe('poi_den');
    expect(enc.metadata.realtime).toBe(true);
    expect(enc.metadata.respawn.x).toBeCloseTo(17.5, 3); // ((3+0.5)/20)*100
  });

  test('surface engagement stamps encounterType=random (no subMapId)', async () => {
    const p = await mkPlayer(character);
    p.engagedEnemies.set('e0', deadEnemy());
    await mgr.ensureEncounter(mkWorld(), p);
    const enc = await CombatEncounter.findByPk(p.encounterId);
    expect(enc.encounterType).toBe('random');
    expect(enc.metadata.subMapId).toBeUndefined();
  });

  test('cross-engine guard: a FRESH turn-based encounter is NOT clobbered (realtime suppressed)', async () => {
    const tb = await CombatEncounter.create({
      characterId: character.id, encounterType: 'quest', combatants: [], turnOrder: [], currentTurn: 0, status: 'active', metadata: {},
    });
    const p = await mkPlayer(character);
    p.engagedEnemies.set('e0', deadEnemy());
    await mgr.ensureEncounter(mkWorld(), p);

    expect(p.encounterId).toBeNull(); // suppressed
    expect(p._suppressedUntil).toBeGreaterThan(Date.now()); // backoff set (no re-query per hit)
    const tbAfter = await CombatEncounter.findByPk(tb.id);
    expect(tbAfter.status).toBe('active'); // turn-based fight preserved
  });

  test('a STALE turn-based orphan is abandoned and a realtime record is created', async () => {
    const stale = await CombatEncounter.create({
      characterId: character.id, encounterType: 'quest', combatants: [], turnOrder: [], currentTurn: 0, status: 'active', metadata: {},
    });
    // Age it past the FRESH window.
    await CombatEncounter.update({ createdAt: new Date(Date.now() - 5 * 60 * 1000) }, { where: { id: stale.id }, silent: true });

    const p = await mkPlayer(character);
    p.engagedEnemies.set('e0', deadEnemy());
    await mgr.ensureEncounter(mkWorld(), p);

    const staleAfter = await CombatEncounter.findByPk(stale.id);
    expect(staleAfter.status).toBe('fled');
    expect(p.encounterId).toBeTruthy();
    expect(p.encounterId).not.toBe(stale.id);
  });

  test('dungeon death respawns coherently (preserves subMapId, in-world via spawnFor, ~40% HP)', async () => {
    const world = mkWorld(DUNGEON_ZONE);
    const p = await mkPlayer(character);
    p.engagedEnemies.set('e0', liveEnemy());
    await mgr.ensureEncounter(world, p);
    p.combatant.stats.health = 0; // player dies
    await mgr.finalize(world, p, 'lost');

    const after = await PlayerCharacter.findByPk(character.id);
    expect(after.currentLocation.subMapId).toBe('sub_test_1');
    expect(after.currentLocation.area).toBe('submap');
    expect(after.currentHealth).toBeGreaterThan(0);
    expect(after.currentHealth).toBeLessThanOrEqual(after.maxHealth);
    // In-world position comes from the dungeon world's own spawn logic, not a surface coord.
    expect(p.x).toBe(7);
    expect(p.z).toBe(9);
    expect(p.dead).toBe(false);
  });

  test('level-up refresh re-derives the in-world combatant maxHealth from the DB', async () => {
    const p = await mkPlayer(character);
    await character.update({ maxHealth: 250 });
    await mgr._refreshCombatant(p);
    expect(p.maxHp).toBe(250);
    expect(p.combatant.stats.maxHealth).toBe(250);
    // also pushes the refreshed hotbar to the client
    expect(p._sent.some((m) => m.t === 'hotbar')).toBe(true);
  });

  // --- Phase 2: non-blocking victory/death feedback ---

  test('a win pushes a reward toast (xp / credits / loot)', async () => {
    const p = await mkPlayer(character);
    p.engagedEnemies.set('e0', deadEnemy());
    await mgr.ensureEncounter(mkWorld(), p);
    await mgr.finalize(mkWorld(), p, 'won');

    const reward = p._sent.find((m) => m.t === 'reward');
    expect(reward).toBeTruthy();
    expect(typeof reward.xp).toBe('number');
    expect(typeof reward.credits).toBe('number');
    expect(Array.isArray(reward.loot)).toBe(true);
    expect(Array.isArray(reward.leveledUp)).toBe(true);
  });

  test('a death pushes a respawn toast with location + medical fee', async () => {
    // Use the dungeon path: respawn resolves to the dungeon ENTRANCE (deterministic, no planet
    // mapData lookup), so the assertion doesn't depend on seed data being present in the test DB.
    const world = mkWorld(DUNGEON_ZONE);
    const p = await mkPlayer(character);
    p.engagedEnemies.set('e0', liveEnemy());
    await mgr.ensureEncounter(world, p);
    p.combatant.stats.health = 0;
    await mgr.finalize(world, p, 'lost');

    const respawn = p._sent.find((m) => m.t === 'respawn');
    expect(respawn).toBeTruthy();
    expect(respawn.area).toBe('Dungeon Entrance'); // safe-location name from the dungeon branch
    expect(respawn.fee).toBe(100 + 3 * 50);        // medical fee = base + level*50 (level 3)
  });

  // --- Phase 3: consumables + out-of-combat regen ---

  test('useItem heals the in-world combatant, decrements inventory, pushes a heal fx', async () => {
    await inventoryService.addItem(character.id, 'medpac_01', 2); // healthRestore 50
    const world = mkWorld();
    const p = await mkPlayer(character);
    p.combatant.stats.health = p.combatant.stats.maxHealth - 40;

    const r = await mgr.useItem(world, p, 'medpac_01');

    expect(p.combatant.stats.health).toBe(p.combatant.stats.maxHealth); // +50 caps at max (was -40)
    expect(r.healthRestored).toBe(40);
    expect(world.fx.some((f) => f.type === 'heal')).toBe(true);
    const inv = await inventoryService.getInventory(character.id);
    expect((inv.items.find((i) => i.itemId === 'medpac_01') || {}).quantity).toBe(1);
  });

  test('useItem throws for a consumable the player does not have (no effect)', async () => {
    const world = mkWorld();
    const p = await mkPlayer(character);
    p.combatant.stats.health = 10;
    await expect(mgr.useItem(world, p, 'medpac_01')).rejects.toThrow();
    expect(p.combatant.stats.health).toBe(10); // unchanged
  });

  test('HTTP useItem routes to the in-world combatant (no currentHealth write) when live', async () => {
    await inventoryService.addItem(character.id, 'medpac_01', 1);
    const world = mkWorld();
    const p = await mkPlayer(character);
    p.combatant.stats.health = p.combatant.stats.maxHealth - 30;
    await character.update({ currentHealth: 7 }); // sentinel: must NOT be written by the delegated path
    setRealtimeManager({
      hasLivePlayer: (cid) => String(cid) === String(character.id),
      useItemForCharacter: async (cid, iid) => mgr.useItem(world, p, iid),
    });
    try {
      const r = await inventoryService.useItem(character.id, 'medpac_01');
      expect(r.healthRestored).toBe(30);
      expect(p.combatant.stats.health).toBe(p.combatant.stats.maxHealth);
      const fresh = await PlayerCharacter.findByPk(character.id);
      expect(fresh.currentHealth).toBe(7); // delegated path left currentHealth untouched
    } finally {
      setRealtimeManager(null);
    }
  });

  test('out-of-combat health regen ticks up (and is gated during an encounter)', async () => {
    const stubSim = {
      isWalkableSurface: () => true, isWalkableWorld: () => true,
      surfaceToWorld: (x, y) => ({ x, z: y }), worldToSurface: (x, z) => ({ x, y: z }),
      integrate: (pos) => ({ ...pos, moving: false, speed: 0 }), scale: 0.8,
    };
    const world = new PlanetWorld('solenne', stubSim, {}, { dangerLevel: 1 });
    world.enemies.clear(); // deterministic: no ambient enemies to update lastCombatAt
    const combatant = await combatService.buildPlayerCombatant(character);
    const p = world.addPlayer({ id: String(character.id), character, ws: { readyState: 1, OPEN: 1, send: () => {} }, combatant, abilities: [] });
    const now = Date.now();

    // OOC (no encounter, combat lapsed) → regen
    p.encounterId = null; p.lastCombatAt = 0; p.combatant.stats.health = 50;
    for (let i = 0; i < 10; i++) world.step(1, now);
    expect(p.combatant.stats.health).toBeGreaterThan(50);

    // In an encounter → no regen
    p.encounterId = 'enc'; p.lastCombatAt = 0; p.combatant.stats.health = 50;
    for (let i = 0; i < 5; i++) world.step(1, now);
    expect(p.combatant.stats.health).toBe(50);
  });
});
