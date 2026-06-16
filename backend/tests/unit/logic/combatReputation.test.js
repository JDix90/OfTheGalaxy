/**
 * Combat → faction reputation + boss-detection pure logic (Phase 8.1 / 8.3, DB-free).
 * Covers the tier-scaled kill deltas + feature flag (combatReputation), the boss predicate
 * (achievementService.isBossEnemy), and that every enemy template is tagged with a canonical
 * faction id that resolves to a real (non-Neutral) faction profile.
 * Run: npm run test:logic
 */

const { repDeltaForKill, repOnKillEnabled, REP_DELTA_BY_TIER } = require('../../../src/config/combatReputation');
const achievementService = require('../../../src/services/achievementService');
const { enemyTemplates } = require('../../../src/data/enemyTemplates');
const { getFactionProfile } = require('../../../src/config/factionProfiles');

const isBossEnemy = achievementService.isBossEnemy;

afterEach(() => { delete process.env.FACTION_REP_ON_KILL; });

describe('repDeltaForKill — tier-scaled negative deltas', () => {
  test('scales by tier (normal > veteran > elite > boss in magnitude)', () => {
    expect(repDeltaForKill({ faction: 'smugglers', tier: 'normal' })).toBe(-2);
    expect(repDeltaForKill({ faction: 'smugglers', tier: 'veteran' })).toBe(-4);
    expect(repDeltaForKill({ faction: 'the_tally', tier: 'elite' })).toBe(-8);
    expect(repDeltaForKill({ faction: 'iron_dominion', tier: 'boss' })).toBe(-12);
  });

  test('deltas are non-positive (killing only ever lowers standing)', () => {
    for (const v of Object.values(REP_DELTA_BY_TIER)) expect(v).toBeLessThanOrEqual(0);
  });

  test('untagged enemies (no faction) grant no rep change', () => {
    expect(repDeltaForKill({ faction: null, tier: 'elite' })).toBe(0);
    expect(repDeltaForKill({ tier: 'veteran' })).toBe(0);
  });

  test('unknown tier on a tagged enemy falls back to the normal magnitude (not NaN/undefined)', () => {
    expect(repDeltaForKill({ faction: 'smugglers', tier: 'wat' })).toBe(-2);
    expect(repDeltaForKill({ faction: 'smugglers' })).toBe(-2); // missing tier
  });

  test('null/garbage combatant is a safe no-op', () => {
    expect(repDeltaForKill(null)).toBe(0);
    expect(repDeltaForKill(undefined)).toBe(0);
    expect(repDeltaForKill({})).toBe(0);
  });

  test('summing the same faction across kills accumulates (documents funnel behaviour)', () => {
    const kills = [
      { faction: 'smugglers', tier: 'veteran' },
      { faction: 'smugglers', tier: 'normal' },
    ];
    const total = kills.reduce((s, k) => s + repDeltaForKill(k), 0);
    expect(total).toBe(-6);
  });
});

describe('FACTION_REP_ON_KILL feature flag', () => {
  test('defaults ON when unset', () => {
    expect(repOnKillEnabled()).toBe(true);
    expect(repDeltaForKill({ faction: 'smugglers', tier: 'elite' })).toBe(-8);
  });

  test('"false" disables the feature (every kill → 0)', () => {
    process.env.FACTION_REP_ON_KILL = 'false';
    expect(repOnKillEnabled()).toBe(false);
    expect(repDeltaForKill({ faction: 'smugglers', tier: 'elite' })).toBe(0);
  });

  test('read live (a later env change takes effect without reload)', () => {
    expect(repOnKillEnabled()).toBe(true);
    process.env.FACTION_REP_ON_KILL = 'FALSE'; // case-insensitive
    expect(repOnKillEnabled()).toBe(false);
  });
});

describe('isBossEnemy — defeat_boss predicate (Phase 8.3)', () => {
  test('explicit isBoss, tier:boss, and elite all count', () => {
    expect(isBossEnemy({ isBoss: true, tier: 'normal' })).toBe(true);
    expect(isBossEnemy({ tier: 'boss' })).toBe(true);
    expect(isBossEnemy({ tier: 'elite' })).toBe(true);
  });

  test('normal/veteran/null do not count', () => {
    expect(isBossEnemy({ tier: 'veteran' })).toBe(false);
    expect(isBossEnemy({ tier: 'normal' })).toBe(false);
    expect(isBossEnemy({})).toBe(false);
    expect(isBossEnemy(null)).toBe(false);
  });
});

describe('enemy templates carry canonical, resolvable factions', () => {
  const expected = {
    ironclad: 'iron_dominion',
    ironclad_sergeant: 'iron_dominion',
    pirate: 'smugglers',
    pirate_captain: 'smugglers',
    syndicate_thug: 'vorr',
    bounty_hunter: 'the_tally',
    droid_security: null,
    wild_animal: null,
  };

  test('each template has the expected faction tag', () => {
    for (const [key, faction] of Object.entries(expected)) {
      expect(enemyTemplates[key].faction).toBe(faction);
    }
  });

  test('no template uses the legacy non-canonical "empire" id', () => {
    for (const t of Object.values(enemyTemplates)) expect(t.faction).not.toBe('empire');
  });

  test('every tagged faction resolves to a real (non-Neutral) profile', () => {
    for (const t of Object.values(enemyTemplates)) {
      if (!t.faction) continue;
      const profile = getFactionProfile(t.faction);
      expect(profile).toBeTruthy();
      expect(profile.name).toBeTruthy();
      expect(profile.name).not.toBe('Neutral'); // would mean we fell through to the default
    }
  });
});
