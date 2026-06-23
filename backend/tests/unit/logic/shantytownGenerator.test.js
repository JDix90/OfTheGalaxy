/**
 * Shantytown submap generator — pure layout, no DB.
 *
 * The slum district packs many small solid "shack" buildings on an irregular grid while keeping the
 * entrance + main dirt lane clear so the player can always get in and through.
 */

const { generateShantytownMap, getSeed } = require('../../../src/services/subMapGenerator');

const make = (variant = 'medium') =>
  generateShantytownMap({ id: 'gravenmoor', name: 'Gravenmoor' }, 'the_dust_warren', variant, getSeed('gravenmoor_the_dust_warren_shantytown'));

describe('generateShantytownMap', () => {
  test('produces a dense cluster of solid shacks (no enterable interiors)', () => {
    const layout = make();
    const shacks = layout.buildings.filter((b) => b.type === 'shack');
    expect(shacks.length).toBeGreaterThanOrEqual(12); // dense, not a handful of houses
    expect(shacks.every((b) => b.collision.doors.length === 0)).toBe(true); // solid props, no interiors
  });

  test('keeps the entrance + main lane walkable (no shack blocks them)', () => {
    const layout = make();
    const midY = Math.floor(layout.height / 2);
    const laneRows = new Set([midY - 1, midY, midY + 1]);
    const blocking = layout.buildings.filter((b) => laneRows.has(b.position.y) || b.position.x <= 1);
    expect(blocking).toHaveLength(0);
    expect(layout.entryPoints[0].position).toEqual({ x: 1, y: midY });
    expect(layout.exitPoints[0].toParent.locationId).toBe('the_dust_warren');
  });

  test('has the expected scaffolding (zones, a landmark POI, resident spawns)', () => {
    const layout = make();
    expect(layout.zones.map((z) => z.id)).toEqual(expect.arrayContaining(['entrance', 'main_lane', 'shacks']));
    expect(layout.pointsOfInterest.length).toBeGreaterThan(0);
    expect(layout.npcSpawnPoints.length).toBeGreaterThan(0);
  });

  test('deterministic for a given seed', () => {
    expect(make()).toEqual(make());
  });

  test('large variant is denser than medium', () => {
    const med = make('medium').buildings.filter((b) => b.type === 'shack').length;
    const lg = make('large').buildings.filter((b) => b.type === 'shack').length;
    expect(lg).toBeGreaterThanOrEqual(med);
  });
});
