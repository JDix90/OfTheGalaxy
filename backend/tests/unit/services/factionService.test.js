/**
 * FactionService reputation clamping — DB-backed.
 *
 * Regression for the create-path clamp bug: the UPDATE path clamped to the model's
 * [-1000, 10000] bounds, but the findOrCreate `defaults` wrote the raw amount, so the
 * FIRST out-of-range write to a fresh faction tripped the model's min/max validators
 * and threw instead of settling at the floor/ceiling. Both paths must now clamp.
 */

const factionService = require('../../../src/services/factionService');
const { createTestUser, createTestCharacter } = require('../../setup/testHelpers');

describe('FactionService.applyReputationChange — clamping', () => {
  let character;
  beforeEach(async () => {
    const user = await createTestUser();
    character = await createTestCharacter(user.id);
  });

  test('first write below the floor clamps to -1000 (no validation throw)', async () => {
    const result = await factionService.applyReputationChange(character.id, 'smugglers', -1500);

    expect(result.newTier).toBe('hated');
    expect((await factionService.getReputation(character.id, 'smugglers')).reputation).toBe(-1000);
  });

  test('first write above the ceiling clamps to 10000 (no validation throw)', async () => {
    const result = await factionService.applyReputationChange(character.id, 'iron_dominion', 20000);

    expect(result.newTier).toBe('exalted');
    expect((await factionService.getReputation(character.id, 'iron_dominion')).reputation).toBe(10000);
  });

  test('an in-range first write is stored verbatim', async () => {
    await factionService.applyReputationChange(character.id, 'vorr', -250);
    expect((await factionService.getReputation(character.id, 'vorr')).reputation).toBe(-250);
  });

  test('the update path still clamps once a row exists', async () => {
    await factionService.applyReputationChange(character.id, 'the_tally', -900); // in-range create
    await factionService.applyReputationChange(character.id, 'the_tally', -400); // would underflow → clamp
    expect((await factionService.getReputation(character.id, 'the_tally')).reputation).toBe(-1000);

    await factionService.applyReputationChange(character.id, 'concord', 9800);  // in-range create
    await factionService.applyReputationChange(character.id, 'concord', 1000);  // would overflow → clamp
    expect((await factionService.getReputation(character.id, 'concord')).reputation).toBe(10000);
  });
});
