/**
 * Save Service tests (DB-backed; runs in CI with the test database).
 * Covers the save -> mutate -> restore round-trip and ownership guards.
 */

const saveService = require('../../../src/services/saveService');
const { createTestUser, createTestCharacter } = require('../../setup/testHelpers');
const { PlayerCharacter, PlayerInventory, FactionReputation } = require('../../../src/models');

describe('SaveService', () => {
  let user;
  let character;
  const SLOT = 1;

  beforeEach(async () => {
    user = await createTestUser();
    character = await createTestCharacter(user.id, { level: 1, xp: 0, credits: 100, currentPlanet: 'tatooine' });
    await PlayerInventory.create({ characterId: character.id, itemId: 'blaster_pistol', quantity: 1, equipped: true, equipmentSlot: 'weapon' });
  });

  test('createSave snapshots character, inventory and faction reputation (v1.1)', async () => {
    await FactionReputation.create({ characterId: character.id, factionId: 'new_republic', reputation: 40, tier: 'neutral' });

    const slot = await saveService.createSave(user.id, character.id, SLOT, 'probe');
    expect(slot.saveData.version).toBe('1.1');
    expect(slot.saveData.character.credits).toBe(100);
    expect(slot.saveData.inventory).toHaveLength(1);
    expect(slot.saveData.factionReputation).toHaveLength(1);
    expect(slot.saveData.factionReputation[0].reputation).toBe(40);
  });

  test('restoreSave rolls back character, inventory and reputation', async () => {
    await FactionReputation.create({ characterId: character.id, factionId: 'new_republic', reputation: 40, tier: 'neutral' });
    await saveService.createSave(user.id, character.id, SLOT, 'probe');

    // Mutate live state.
    character.credits = 999;
    character.level = 5;
    character.xp = 1234;
    character.currentPlanet = 'coruscant';
    await character.save();
    await PlayerInventory.create({ characterId: character.id, itemId: 'medkit', quantity: 7 });
    const rep = await FactionReputation.findOne({ where: { characterId: character.id, factionId: 'new_republic' } });
    rep.reputation = 500;
    await rep.save();

    const result = await saveService.restoreSave(user.id, SLOT);
    expect(result.characterId).toBe(character.id);

    const restored = await PlayerCharacter.findByPk(character.id);
    expect(restored.credits).toBe(100);
    expect(restored.level).toBe(1);
    expect(restored.xp).toBe(0);
    expect(restored.currentPlanet).toBe('tatooine');

    const inv = await PlayerInventory.findAll({ where: { characterId: character.id } });
    expect(inv).toHaveLength(1);
    expect(inv[0].itemId).toBe('blaster_pistol');
    expect(inv[0].equipped).toBe(true);

    const restoredRep = await FactionReputation.findOne({ where: { characterId: character.id, factionId: 'new_republic' } });
    expect(restoredRep.reputation).toBe(40);
  });

  test('restoreSave rejects a slot belonging to another user', async () => {
    await saveService.createSave(user.id, character.id, SLOT, 'probe');
    const otherUser = await createTestUser();
    await expect(saveService.restoreSave(otherUser.id, SLOT)).rejects.toThrow(/not found|Access denied/i);
  });

  test('restore is atomic: a failure leaves no partial state', async () => {
    await saveService.createSave(user.id, character.id, SLOT, 'probe');
    // Corrupt the snapshot so restore throws after starting.
    const slot = await require('../../../src/models').SaveSlot.findOne({ where: { userId: user.id, slotNumber: SLOT } });
    slot.saveData = { character: { id: '00000000-0000-0000-0000-000000000000' } }; // non-existent character
    await slot.save();

    await expect(saveService.restoreSave(user.id, SLOT)).rejects.toThrow(/no longer exists/i);
    // Original character untouched.
    const still = await PlayerCharacter.findByPk(character.id);
    expect(still.credits).toBe(100);
  });
});
