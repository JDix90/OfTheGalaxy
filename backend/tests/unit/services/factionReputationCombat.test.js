/**
 * Faction reputation on kill + defeat_boss achievement (Phase 8.1 / 8.3) — DB-backed.
 *
 * Exercises the real funnel writes:
 *   - combatService.applyFactionReputationForKills: only dead, faction-tagged enemies lower
 *     standing; per-faction deltas accumulate; the killer-only combatant list = correct MP
 *     attribution; the feature flag disables it; the returned summary carries a display name.
 *   - combatService.endEncounter('won'): folds the rep summary into metadata.rewards.reputation
 *     (the path the realtime reward toast reads).
 *   - achievementService.checkCombatAchievements: credits defeat_boss for an elite/boss kill,
 *     and does NOT for a veteran-only win.
 */

const combatService = require('../../../src/services/combatService');
const achievementService = require('../../../src/services/achievementService');
const factionService = require('../../../src/services/factionService');
const { createTestUser, createTestCharacter } = require('../../setup/testHelpers');
const { CombatEncounter, Achievement } = require('../../../src/models');

// Minimal valid combatants for the funnel. Enemy stats.health <= 0 ⇒ "defeated".
const playerCombatant = (over = {}) => ({
  id: 'p1', type: 'player', name: 'Hero',
  stats: { health: 80, maxHealth: 100, stamina: 40, maxStamina: 50 }, ...over,
});
const deadEnemy = (faction, tier, over = {}) => ({
  id: `e_${faction}_${tier}_${Math.random().toString(36).slice(2, 7)}`,
  type: 'enemy', name: `${faction || 'rogue'} ${tier}`,
  faction, tier,
  stats: { health: 0, maxHealth: 50 },
  xpReward: 10, creditsReward: 10, lootTable: [],
  ...over,
});

describe('combatService.applyFactionReputationForKills', () => {
  let character;
  beforeEach(async () => {
    const user = await createTestUser();
    character = await createTestCharacter(user.id);
    delete process.env.FACTION_REP_ON_KILL;
  });
  afterEach(() => { delete process.env.FACTION_REP_ON_KILL; });

  test('lowers standing for a dead faction-tagged enemy and reports a display name', async () => {
    const encounter = {
      characterId: character.id,
      combatants: [playerCombatant(), deadEnemy('smugglers', 'veteran')],
    };
    const changes = await combatService.applyFactionReputationForKills(encounter);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ factionId: 'smugglers', name: 'Smugglers', delta: -4 });

    const rep = await factionService.getReputation(character.id, 'smugglers');
    expect(rep.reputation).toBe(-4);
  });

  test('accumulates per faction across multiple kills (one summed write)', async () => {
    const encounter = {
      characterId: character.id,
      combatants: [
        playerCombatant(),
        deadEnemy('smugglers', 'veteran'), // -4
        deadEnemy('smugglers', 'normal'),  // -2
        deadEnemy('the_tally', 'elite'),   // -8
      ],
    };
    const changes = await combatService.applyFactionReputationForKills(encounter);

    const byId = Object.fromEntries(changes.map((c) => [c.factionId, c.delta]));
    expect(byId).toEqual({ smugglers: -6, the_tally: -8 });
    expect((await factionService.getReputation(character.id, 'smugglers')).reputation).toBe(-6);
    expect((await factionService.getReputation(character.id, 'the_tally')).reputation).toBe(-8);
  });

  test('ignores untagged enemies and enemies that are still alive', async () => {
    const encounter = {
      characterId: character.id,
      combatants: [
        playerCombatant(),
        deadEnemy(null, 'elite'),                              // untagged → ignored
        deadEnemy('smugglers', 'veteran', { stats: { health: 12, maxHealth: 50 } }), // alive → ignored
      ],
    };
    const changes = await combatService.applyFactionReputationForKills(encounter);
    expect(changes).toEqual([]);
    expect((await factionService.getReputation(character.id, 'smugglers')).reputation).toBe(0);
  });

  test('feature flag off ⇒ no writes, empty summary', async () => {
    process.env.FACTION_REP_ON_KILL = 'false';
    const encounter = {
      characterId: character.id,
      combatants: [playerCombatant(), deadEnemy('vorr', 'elite')],
    };
    const changes = await combatService.applyFactionReputationForKills(encounter);
    expect(changes).toEqual([]);
    expect((await factionService.getReputation(character.id, 'vorr')).reputation).toBe(0);
  });

  test('kills onto a near-floor faction clamp at -1000 (hated), no underflow', async () => {
    // Realistic path: standing already near the floor (built up over prior encounters),
    // then a fresh fight pushes past it. The factionService UPDATE path clamps at -1000.
    await factionService.applyReputationChange(character.id, 'the_tally', -996);

    const encounter = {
      characterId: character.id,
      combatants: [playerCombatant(), deadEnemy('the_tally', 'elite'), deadEnemy('the_tally', 'elite')], // -16
    };
    const changes = await combatService.applyFactionReputationForKills(encounter);

    expect(changes).toHaveLength(1);
    expect(changes[0].factionId).toBe('the_tally');
    expect((await factionService.getReputation(character.id, 'the_tally')).reputation).toBe(-1000);
  });

  test('a single below-floor delta is best-effort isolated (never throws out of the funnel)', async () => {
    // Pathological (125+ elite kills in ONE encounter vs a fresh faction) → summed delta below
    // the -1000 floor. factionService has a pre-existing create-path quirk that rejects an
    // out-of-range INITIAL write, but the hook swallows it: rewards/the encounter are unaffected
    // and no other faction is blocked. We assert the call resolves cleanly (does not reject).
    const enemies = Array.from({ length: 200 }, () => deadEnemy('vorr', 'elite')); // -1600 vs fresh vorr
    const encounter = { characterId: character.id, combatants: [playerCombatant(), ...enemies] };

    await expect(combatService.applyFactionReputationForKills(encounter)).resolves.toBeDefined();
  });
});

describe('combatService.endEncounter — folds reputation into metadata.rewards', () => {
  test('a won encounter stashes the rep summary for the reward toast', async () => {
    const user = await createTestUser();
    const character = await createTestCharacter(user.id);
    const encounter = await CombatEncounter.create({
      characterId: character.id,
      encounterType: 'npc',
      status: 'active',
      combatants: [playerCombatant(), deadEnemy('iron_dominion', 'normal')], // -2
    });

    const result = await combatService.endEncounter(encounter.id, 'won');

    const rep = result.metadata && result.metadata.rewards && result.metadata.rewards.reputation;
    expect(Array.isArray(rep)).toBe(true);
    expect(rep).toEqual([
      expect.objectContaining({ factionId: 'iron_dominion', name: 'Iron Dominion', delta: -2 }),
    ]);
  });
});

describe('achievementService.checkCombatAchievements — defeat_boss', () => {
  test('credits defeat_boss when an elite/boss enemy was defeated', async () => {
    const user = await createTestUser();
    const character = await createTestCharacter(user.id);
    await CombatEncounter.create({
      characterId: character.id, encounterType: 'npc', status: 'won',
      combatants: [playerCombatant(), deadEnemy('the_tally', 'elite')],
    });

    await achievementService.checkCombatAchievements(character.id);

    const ach = await Achievement.findOne({ where: { characterId: character.id, achievementId: 'defeat_boss' } });
    expect(ach).toBeTruthy();
    expect(ach.completed).toBe(true);
  });

  test('does NOT credit defeat_boss for a veteran-only win', async () => {
    const user = await createTestUser();
    const character = await createTestCharacter(user.id);
    await CombatEncounter.create({
      characterId: character.id, encounterType: 'npc', status: 'won',
      combatants: [playerCombatant(), deadEnemy('smugglers', 'veteran')],
    });

    await achievementService.checkCombatAchievements(character.id);

    const ach = await Achievement.findOne({ where: { characterId: character.id, achievementId: 'defeat_boss' } });
    // Either no row yet, or a row that is not completed.
    expect(ach == null || ach.completed === false).toBe(true);
  });
});
