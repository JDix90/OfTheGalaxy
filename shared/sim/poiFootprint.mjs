/**
 * POI collision footprints (world-unit radii), shared by the surface sim so the
 * player, enemies, the ambient crowd's pathfinding, and the cosmetic vehicles all
 * treat a POI's 3D building as SOLID — you walk up to it and stop, you don't walk
 * (or drive) through it.
 *
 * The rendered structures live in `frontend/src/data/modelManifest.js`
 * (POI_STRUCTURES[*].fit = the building's bounding diameter in world units). This
 * is the backend-safe mirror of that — type → category → radius. The radius is a
 * touch INSIDE the visible base (~0.44 * fit) so a player can still close to the
 * wall and trigger the enter prompt, but can't pass through the structure.
 *
 * Keep CATEGORY in sync with modelManifest's TYPE_TO_CATEGORY. If a planet ships a
 * POI type not listed here it falls back to the (small) default footprint.
 */

// POI/location type string → structure category (mirror of modelManifest).
const CATEGORY = {
  spaceport: 'spaceport', landing_zone: 'spaceport', landing_pad: 'spaceport',
  market: 'market', black_market: 'market', trade: 'market', commercial: 'market',
  weapons: 'market', technology: 'market', ship_parts: 'market', specialty: 'market',
  general: 'market', street: 'market', cantina: 'market', tavern: 'market', bar: 'market',
  city: 'settlement', capital: 'settlement', settlement: 'settlement', village: 'settlement',
  town: 'settlement', province: 'settlement', residential: 'settlement', homestead: 'settlement',
  outpost: 'settlement', wilderness: 'settlement', landscape: 'settlement',
  government: 'civic', palace: 'civic', temple: 'civic', medical_center: 'civic',
  hospital: 'civic', arena: 'civic', entertainment: 'civic',
  industrial: 'industrial', mine: 'industrial', factory: 'industrial', facility: 'industrial',
  base: 'industrial', garrison: 'industrial', rebel_base: 'industrial',
  danger: 'danger', ruins: 'danger', cave: 'danger', underworld: 'danger',
  fortress: 'danger', wreckage: 'danger', crash_site: 'danger', lair: 'danger',
  den: 'danger', hideout: 'danger', criminal: 'danger',
};

// Collision radius (world units) per category ≈ 0.44 * the structure's `fit` diameter.
const RADIUS = {
  spaceport: 5.3,
  market: 3.6,
  settlement: 3.8,
  civic: 4.4,
  industrial: 3.6,
  danger: 3.1,
  default: 2.9,
};

/** Collision footprint radius (world units) for a POI of the given `type`. */
export function poiFootprintRadius(type) {
  if (!type) return RADIUS.default;
  const cat = CATEGORY[String(type).toLowerCase()] || 'default';
  return RADIUS[cat] ?? RADIUS.default;
}
