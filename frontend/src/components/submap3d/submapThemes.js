/**
 * submapThemes — the per-POI-type look of a submap interior. The submap analogue of the
 * surface's biome system (MedinaBuildings' BIOME_BASE/GLOW/FILL): one data table keyed by a
 * theme category, resolved from the submap's type / parent POI type, that every visual layer
 * (enclosure palette + lighting now; props, particles, crowd, signage in later phases) reads
 * from. Pure data + resolver — no `three` import, safe to unit-test.
 *
 * A clinic should read surgical and cool, a market warm and golden, a hangar concourse cold and
 * industrial, a ruin ominous and red — instead of the old two hard-coded palettes (enclosed
 * clinical / open dark-blue).
 *
 * `lighting.mode` is the source of truth for enclosed (roofed, sun-off, lit by ceiling strips)
 * vs open (open-air district under the global day-night sky). Keep the category words aligned
 * with shared/sim/poiFootprint.mjs + modelManifest's TYPE_TO_CATEGORY so theming and collision
 * agree.
 */

import { getPoiCategory } from '../../data/modelManifest';

// Submap-type → theme key. Catches the cases where the raw POI category would be too coarse:
// medical_center maps to 'civic' in TYPE_TO_CATEGORY, but a clinic wants its own surgical mood,
// distinct from a government hall.
const TYPE_OVERRIDE = {
  medical_center: 'clinic', hospital: 'clinic', clinic: 'clinic',
  spaceport: 'spaceport',
  market: 'market',
  city: 'settlement', settlement: 'settlement', province: 'settlement',
  civic: 'civic', government: 'civic', temple: 'civic', palace: 'civic',
  dungeon: 'danger',
};

// POI structure category → theme key (the fallback when no direct submap-type override applies).
const CATEGORY_TO_THEME = {
  spaceport: 'spaceport', market: 'market', settlement: 'settlement',
  civic: 'civic', industrial: 'industrial', danger: 'danger', default: 'default',
};

/**
 * Resolve the theme KEY for a submap. Precedence:
 *  1. building_interior borrows an industrial/danger mood from its PARENT POI, else cozy residential.
 *  2. direct submap-type override (clinic/spaceport/market/settlement/civic/...).
 *  3. POI category of the submap type.
 *  4. POI category of the parent location type (tiebreak for generic types).
 *  5. 'default'.
 */
export function resolveThemeKey(subMap) {
  const type = String(subMap?.type || '').toLowerCase();
  const parent = String(subMap?.parentLocationType || '').toLowerCase();
  if (type === 'building_interior') {
    const pc = getPoiCategory(parent);
    return (pc === 'industrial' || pc === 'danger') ? CATEGORY_TO_THEME[pc] : 'residential';
  }
  if (TYPE_OVERRIDE[type]) return TYPE_OVERRIDE[type];
  const byType = CATEGORY_TO_THEME[getPoiCategory(type)];
  if (byType && byType !== 'default') return byType;
  const byParent = CATEGORY_TO_THEME[getPoiCategory(parent)];
  if (byParent && byParent !== 'default') return byParent;
  return 'default';
}

// Lighting schema per theme:
//   mode 'enclosed' → roofed room, sun off; lit by `ambient` + `hemi*` + overhead `fill` point +
//     ceiling `strip`s. mode 'open' → open-air district under the day-night sun; the theme adds a
//     tinted `hemi*` + a soft overhead `fill` point for mood (no ceiling/strips/ambient).
//   `fog` (optional) lets SubmapScene tint/tighten the interior fog for dim/ominous themes.
const T = (key, palette, lighting) => ({ key, palette, lighting });

export const SUBMAP_THEMES = {
  // Surgical, sterile, bright cool-white. (Preserves the old enclosed clinic look.)
  clinic: T('clinic',
    { floor: '#808a9e', wall: '#c2cbdb', ceiling: '#dde4ef', accent: '#a9ead2', emissive: '#46d6a0', trim: '#7fd6ff' },
    { mode: 'enclosed', ambient: '#e3ecf8', ambientInt: 0.9, hemiSky: '#eef4ff', hemiGround: '#aeb8cc', hemiInt: 1.4, fill: '#f3f8ff', fillInt: 1.6, strip: '#f3f8ff', stripInt: 2.4, fog: '#9aa6bc' }),

  // Civic/temple: enclosed, warm marble + soft gold.
  civic: T('civic',
    { floor: '#8a8576', wall: '#d8d2c0', ceiling: '#e8e2d0', accent: '#ffe9a8', emissive: '#ffcf5c', trim: '#ffd98a' },
    { mode: 'enclosed', ambient: '#f0ead8', ambientInt: 0.82, hemiSky: '#f4eede', hemiGround: '#b6a888', hemiInt: 1.25, fill: '#fff0d0', fillInt: 1.4, strip: '#fff0d0', stripInt: 2.1, fog: '#b8b09c' }),

  // Spaceport concourse: open, cold tech-blue with a warm fill (preserves the current look).
  spaceport: T('spaceport',
    { floor: '#39405a', wall: '#4a5575', ceiling: '#1a2238', accent: '#bfe3ff', emissive: '#3aa0ff', trim: '#6cf0c2' },
    { mode: 'open', hemiSky: '#cfe0fb', hemiGround: '#26304a', hemiInt: 0.6, fill: '#ffe7c4', fillInt: 0.55 }),

  // Market bazaar: open, warm gold, bright and bustling.
  market: T('market',
    { floor: '#7a6450', wall: '#6e5a44', ceiling: '#2a2018', accent: '#ffd98a', emissive: '#ff9a3c', trim: '#ffb45a' },
    { mode: 'open', hemiSky: '#ffe7c4', hemiGround: '#5a4632', hemiInt: 0.7, fill: '#ffdca0', fillInt: 0.5 }),

  // Town district: open, neutral daylight.
  settlement: T('settlement',
    { floor: '#454c66', wall: '#39405a', ceiling: '#161b2a', accent: '#9fd0e0', emissive: '#39c0d6', trim: '#6cf0c2' },
    { mode: 'open', hemiSky: '#bcd4ff', hemiGround: '#3a3a4a', hemiInt: 0.5, fill: '#dfeaff', fillInt: 0.3 }),

  // Mine/factory: open but dim, amber/sodium, hazy.
  industrial: T('industrial',
    { floor: '#46413a', wall: '#5a5048', ceiling: '#241f1a', accent: '#ffb070', emissive: '#ff7a3c', trim: '#ff9a4d' },
    { mode: 'open', hemiSky: '#6a5a44', hemiGround: '#241e18', hemiInt: 0.5, fill: '#ff9a4d', fillInt: 0.42, fog: '#3a322a' }),

  // Ruins/lair: open, ominous cold-blue with a red emissive accent, darker.
  danger: T('danger',
    { floor: '#2a2330', wall: '#3a2230', ceiling: '#161018', accent: '#ff6b6b', emissive: '#ff3b46', trim: '#ff3b46' },
    { mode: 'open', hemiSky: '#3a4258', hemiGround: '#140e18', hemiInt: 0.36, fill: '#7a3040', fillInt: 0.3, fog: '#241a22' }),

  // Building interior (home): warm, cozy. Keeps its own InteriorWalls shell (no enclosure).
  residential: T('residential',
    { floor: '#5a4a3a', wall: '#6a5444', ceiling: '#2a2018', accent: '#e0b890', emissive: '#ffb060', trim: '#ffb060' },
    { mode: 'open', hemiSky: '#ffe0c0', hemiGround: '#3a2e22', hemiInt: 0.55, fill: '#ffd9a8', fillInt: 0.4 }),

  default: T('default',
    { floor: '#2a3145', wall: '#39405a', ceiling: '#161b2a', accent: '#aebbd6', emissive: '#7db8ff', trim: '#6cf0c2' },
    { mode: 'open', hemiSky: '#bcd4ff', hemiGround: '#2a3145', hemiInt: 0.5, fill: '#dfeaff', fillInt: 0.32 }),
};

/** Resolve the full theme object for a submap (palette + lighting). */
export function getSubmapTheme(subMap) {
  return SUBMAP_THEMES[resolveThemeKey(subMap)] || SUBMAP_THEMES.default;
}
