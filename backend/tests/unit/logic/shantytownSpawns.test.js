/**
 * Shantytown ambient spawns — reputation-throttled hostile density (no DB).
 *
 * Shantytowns spawn ambient street toughs (ambient:true + a danger floor + a criminal enemyPool).
 * The count is scaled down per-player by standing with the controlling faction: the more ingratiated,
 * the fewer come at you (PlanetWorld._repSpawnScale → _targetCount).
 */

const { PlanetWorld } = require('../../../src/realtime/PlanetWorld');

const stubSim = {
  isWalkableSurface: () => true, isWalkableWorld: () => true,
  surfaceToWorld: (x, y) => ({ x, z: y }), worldToSurface: (x, z) => ({ x, y: z }),
  integrate: (p) => ({ ...p, moving: false, speed: 0 }), scale: 0.8, worldHalf: 50,
};
const mkWorld = (opts) => new PlanetWorld('w', stubSim, {}, { ambient: false, ...opts }); // ambient:false → no constructor spawn

describe('shantytown reputation-scaled ambient target', () => {
  test('reputation thins the ambient population (ingratiated = fewer)', () => {
    const w = mkWorld({ dangerLevel: 6 }); // base = min(8, 2 + floor(6/2)) = 5
    const withRep = (s) => { w.players.clear(); w.players.set('p', { repSpawnScale: s }); return w._targetCount(); };
    expect(w._targetCount()).toBe(5);        // no players → baseline
    expect(withRep(1)).toBe(5);              // neutral standing → full danger
    expect(withRep(0.7)).toBe(4);            // friendly → ~30% fewer (round 3.5)
    expect(withRep(0.35)).toBe(2);           // honored → sparse (round 1.75)
    expect(withRep(0)).toBe(0);              // exalted → the area leaves you alone
  });

  test('the calmest present player sets the vibe (min across players)', () => {
    const w = mkWorld({ dangerLevel: 6 });
    w.players.set('a', { repSpawnScale: 1 });
    w.players.set('b', { repSpawnScale: 0 }); // a faction-friend in the group calms the street
    expect(w._targetCount()).toBe(0);
  });

  test('a shantytown world populates from the criminal pool only', () => {
    const w = mkWorld({ dangerLevel: 5, ambient: true, enemyPool: ['syndicate_thug', 'pirate', 'bounty_hunter'] });
    expect(w.enemies.size).toBeGreaterThan(0); // ambient:true → spawned in the constructor
    const names = [...w.enemies.values()].map((e) => e.combatant.enemyTemplate);
    expect(names.every((n) => ['Syndicate Thug', 'Pirate', 'Bounty Hunter'].includes(n))).toBe(true);
  });
});
