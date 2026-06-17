/**
 * refurnish-spaceports.js — force-upgrade EVERY persisted spaceport submap to the current
 * furnished layout (concourse storefronts + open hangar bays + props), in place.
 *
 * Why: spaceport submaps are persisted + shared across characters, and a port generated before
 * the furnishing work keeps its old empty-plaza layout. The app re-furnishes lazily on load
 * (subMapService.refurnishSpaceportIfStale), but this script lets you fix the DATA immediately
 * and PROVE it, independent of whether the running server has been redeployed.
 *
 * It is idempotent and deterministic (same seed → same layout). Safe to run repeatedly.
 *
 *   node scripts/refurnish-spaceports.js            # all planets
 *   node scripts/refurnish-spaceports.js sinkport   # one planet
 *   node scripts/refurnish-spaceports.js --force     # rebuild even if already current version
 */

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const { sequelize, SubMap, Planet } = require('../src/models');
const subMapGenerator = require('../src/services/subMapGenerator');
const collisionMapService = require('../src/services/collisionMapService');

const count = (a) => (Array.isArray(a) ? a.length : 0);

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const planetId = args.find((a) => !a.startsWith('--')) || null;

  const where = { type: 'spaceport' };
  if (planetId) where.planetId = planetId;
  const spaceports = await SubMap.findAll({ where });

  console.log(`\n=== Re-furnish spaceports ${planetId ? `for ${planetId}` : '(all planets)'} ===`);
  console.log(`Target version: v${subMapGenerator.SPACEPORT_LAYOUT_VERSION}${force ? ' (FORCE)' : ''}`);
  console.log(`Found ${spaceports.length} spaceport submap(s).\n`);

  let upgraded = 0;
  for (const sm of spaceports) {
    const layout = sm.layoutData || sm.layout || {};
    const cur = layout.spaceportVersion || 0;
    const before = `v${cur} · buildings=${count(layout.buildings)} furniture=${count(layout.furniture)}`;

    if (cur >= subMapGenerator.SPACEPORT_LAYOUT_VERSION && !force) {
      console.log(`• ${sm.id}  [${before}]  → already current, skipped`);
      continue;
    }

    const planet = await Planet.findByPk(sm.planetId) || { id: sm.planetId };
    const w = layout.width || 12;
    const variant = w >= 18 ? 'military' : w >= 15 ? 'large' : w <= 10 ? 'small' : 'medium';
    const seed = subMapGenerator.getSeed(`${sm.planetId}_${sm.parentLocationId}_spaceport`);
    const newLayout = subMapGenerator.generateSpaceportMap(planet, sm.parentLocationId, variant, seed);
    newLayout.collisionMap = collisionMapService.generateCollisionMap({ id: sm.id, type: 'spaceport', layoutData: newLayout, layout: newLayout });

    // Explicitly flag the JSON column dirty so Sequelize persists the new object.
    sm.set('layoutData', newLayout);
    sm.changed('layoutData', true);
    await sm.save();

    const after = `v${newLayout.spaceportVersion} · buildings=${count(newLayout.buildings)} furniture=${count(newLayout.furniture)}`;
    console.log(`• ${sm.id}  [${before}]  →  [${after}]  ✓`);
    upgraded += 1;
  }

  console.log(`\nDone. Upgraded ${upgraded}/${spaceports.length} spaceport(s).`);
  console.log('Next: restart the backend, then HARD-refresh the browser (Cmd/Ctrl+Shift+R) and re-enter the port.\n');
}

main()
  .then(async () => { await sequelize.close(); process.exit(0); })
  .catch(async (e) => { console.error('refurnish-spaceports failed:', e); try { await sequelize.close(); } catch (_) {} process.exit(1); });
