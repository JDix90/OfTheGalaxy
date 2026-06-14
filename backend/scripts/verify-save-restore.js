/**
 * Self-cleaning end-to-end check for save -> mutate -> restore.
 *
 * Creates a throwaway user + character, saves, mutates the live state, restores
 * from the save, and asserts the snapshot was rolled back. Cleans up all rows it
 * created in a finally block, so it never touches existing data.
 *
 * Run from backend/:  node scripts/verify-save-restore.js
 */

require('dotenv').config();
const { sequelize, User, PlayerCharacter, PlayerInventory, QuestProgress, SaveSlot } = require('../src/models');
const saveService = require('../src/services/saveService');

const SLOT = 9;
let user, character;

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg);
  console.log('  ✓ ' + msg);
}

(async () => {
  try {
    await sequelize.authenticate();

    // --- setup: throwaway user + character ---
    user = await User.create({
      email: `save-test-${Date.now()}@example.invalid`,
      passwordHash: 'x'.repeat(60)
    });
    character = await PlayerCharacter.create({
      userId: user.id,
      name: 'Restore Probe',
      species: 'human',
      background: 'soldier',
      stats: { strength: 10, agility: 10, intelligence: 10, charisma: 10, perception: 10, endurance: 10 },
      currentPlanet: 'gravenmoor',
      credits: 100,
      level: 1,
      xp: 0
    });
    await PlayerInventory.create({ characterId: character.id, itemId: 'pulser_pistol', quantity: 1, equipped: true, equipmentSlot: 'weapon' });

    // --- save the pristine state ---
    await saveService.createSave(user.id, character.id, SLOT, 'probe');
    console.log('Saved slot', SLOT, 'at credits=100 level=1, 1 item');

    // --- mutate the live state ---
    character.credits = 999;
    character.level = 5;
    character.xp = 1234;
    character.currentPlanet = 'centralis';
    await character.save();
    await PlayerInventory.create({ characterId: character.id, itemId: 'medkit', quantity: 7 });
    console.log('Mutated: credits=999 level=5 planet=centralis, added 7x medkit');

    // --- restore ---
    const result = await saveService.restoreSave(user.id, SLOT);
    assert(result.characterId === character.id, 'restore returned the correct characterId');

    // --- verify rollback ---
    const restored = await PlayerCharacter.findByPk(character.id);
    assert(restored.credits === 100, `credits rolled back to 100 (got ${restored.credits})`);
    assert(restored.level === 1, `level rolled back to 1 (got ${restored.level})`);
    assert(restored.xp === 0, `xp rolled back to 0 (got ${restored.xp})`);
    assert(restored.currentPlanet === 'gravenmoor', `planet rolled back to gravenmoor (got ${restored.currentPlanet})`);

    const inv = await PlayerInventory.findAll({ where: { characterId: character.id } });
    assert(inv.length === 1, `inventory restored to 1 item (got ${inv.length})`);
    assert(inv[0].itemId === 'pulser_pistol', `the restored item is pulser_pistol (got ${inv[0].itemId})`);
    assert(inv[0].equipped === true, 'restored item kept its equipped flag');

    console.log('\n✅ Save/restore round-trip PASSED');
  } catch (err) {
    console.error('\n❌ Save/restore round-trip FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    // --- cleanup (FK cascade removes inventory/quests; remove save slot + user) ---
    try {
      if (user) await SaveSlot.destroy({ where: { userId: user.id } });
      if (character) await PlayerInventory.destroy({ where: { characterId: character.id } });
      if (character) await QuestProgress.destroy({ where: { characterId: character.id } });
      if (character) await PlayerCharacter.destroy({ where: { id: character.id } });
      if (user) await User.destroy({ where: { id: user.id } });
      console.log('🧹 Cleaned up throwaway rows');
    } catch (cleanupErr) {
      console.error('⚠️  Cleanup error (manual removal may be needed):', cleanupErr.message);
    }
    await sequelize.close();
  }
})();
