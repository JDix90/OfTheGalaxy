/**
 * Equipment → combat stat wiring (PR B) — DB-backed.
 *
 * Before this change, an accessory's advertised stats (perception, forcePower, intelligence, …) were
 * shown in the UI but never reached the combat pipeline. These tests equip real accessories and
 * assert the displayed benefit actually moves crit / accuracy / forcePower, and that a +skill
 * accessory raises the effective skill used in a check.
 */

const combatService = require('../../../src/services/combatService');
const lockpickingService = require('../../../src/services/lockpickingService');
const inventoryService = require('../../../src/services/inventoryService');
const { PlayerInventory } = require('../../../src/models');
const { createTestUser, createTestCharacter } = require('../../setup/testHelpers');

describe('Equipment stat wiring (PR B)', () => {
  let user, character;

  beforeEach(async () => {
    user = await createTestUser();
    character = await createTestCharacter(user.id, {
      level: 5, currentHealth: 100, maxHealth: 100, currentStamina: 50, maxStamina: 50,
      stats: { strength: 12, agility: 12, endurance: 12, perception: 10, intelligence: 10, charisma: 10, forcePower: 0 },
    });
  });

  afterEach(async () => {
    await PlayerInventory.destroy({ where: { characterId: character.id } });
  });

  const equip = async (itemId, slot) => { await inventoryService.addItem(character.id, itemId, 1); await inventoryService.equipItem(character.id, itemId, slot); };

  test('a +perception accessory (scanner) raises perception, crit and accuracy', async () => {
    const before = await combatService.buildPlayerCombatant(character);
    await equip('scanner', 'accessory'); // perception: 5
    const after = await combatService.buildPlayerCombatant(character);

    expect(after.stats.perception).toBe(before.stats.perception + 5);
    expect(after.stats.critChance).toBeGreaterThan(before.stats.critChance);
    expect(after.stats.accuracy).toBeGreaterThan(before.stats.accuracy); // no weapon → accuracy tracks perception
  });

  test('a +forcePower accessory (ancient_artifact) reaches the combatant stats', async () => {
    const before = await combatService.buildPlayerCombatant(character);
    expect(before.stats.forcePower).toBe(0);
    await equip('ancient_artifact', 'accessory'); // forcePower: 15 (+ int/cha/per 10)
    const after = await combatService.buildPlayerCombatant(character);

    expect(after.stats.forcePower).toBeGreaterThanOrEqual(15);
    // +10 from the artifact's own intelligence (set/effect bonuses may add more on top).
    expect(after.stats.intelligence).toBeGreaterThanOrEqual(before.stats.intelligence + 10);
  });

  test('a +lockpicking accessory raises the effective lockpicking skill in a check', async () => {
    const baseChance = await lockpickingService.getLockpickChance(character.id, 2);
    await equip('security_keycard', 'accessory'); // lockpicking: 15 (accessory slot, not a tool)
    const boosted = await lockpickingService.getLockpickChance(character.id, 2);

    expect(boosted.lockpickingLevel).toBe(baseChance.lockpickingLevel + 15);
    expect(boosted.chance).toBeGreaterThan(baseChance.chance);
  });
});
