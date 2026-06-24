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
  shantytown: 'shantytown', slum: 'shantytown',
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
//
// `props` (Phase 2) drives SubmapProps / buildSubmapProps — how a submap is furnished:
//   map:     furniture/decoration `type` → a themed prop key (else it stays a plain box).
//   zone:    building `type` → a themed prop (or list) placed at that building — this is what
//            furnishes the otherwise-empty clinic/market that emit no furniture[] of their own.
//   scatter: prop keys sprinkled at a few walkable edge cells (industrial pipes, ruin rubble).
// Prop keys are resolved in SubmapProps to a composed-primitive builder or a glTF kit model.
const EMPTY_PROPS = { map: {}, zone: {}, scatter: [] };
const T = (key, palette, lighting, props) => ({ key, palette, lighting, props: props || EMPTY_PROPS });

export const SUBMAP_THEMES = {
  // Surgical, sterile, bright cool-white. (Preserves the old enclosed clinic look.)
  clinic: T('clinic',
    { floor: '#808a9e', wall: '#c2cbdb', ceiling: '#dde4ef', accent: '#a9ead2', emissive: '#46d6a0', trim: '#7fd6ff' },
    { mode: 'enclosed', ambient: '#e3ecf8', ambientInt: 0.9, hemiSky: '#eef4ff', hemiGround: '#aeb8cc', hemiInt: 1.4, fill: '#f3f8ff', fillInt: 1.6, strip: '#f3f8ff', stripInt: 2.4, fog: '#9aa6bc' },
    { map: { bed: 'biobed', display: 'medConsole', cabinet: 'medConsole', terminal: 'terminal', plant: 'planter', bench: 'bench', chair: 'bench' },
      zone: { treatment_room: 'biobed', patient_room: 'biobed', surgery_room: 'biobed', reception: 'terminal', waiting_room: 'bench' }, scatter: [] }),

  // Civic/temple: enclosed, warm marble + soft gold.
  civic: T('civic',
    { floor: '#8a8576', wall: '#d8d2c0', ceiling: '#e8e2d0', accent: '#ffe9a8', emissive: '#ffcf5c', trim: '#ffd98a' },
    { mode: 'enclosed', ambient: '#f0ead8', ambientInt: 0.82, hemiSky: '#f4eede', hemiGround: '#b6a888', hemiInt: 1.25, fill: '#fff0d0', fillInt: 1.4, strip: '#fff0d0', stripInt: 2.1, fog: '#b8b09c' },
    { map: { desk: 'terminal', terminal: 'terminal', plant: 'planter', bench: 'bench', chair: 'bench' },
      zone: { reception: 'terminal', office: 'terminal' }, scatter: [] }),

  // Spaceport concourse: open, cold tech-blue with a warm fill (preserves the current look).
  spaceport: T('spaceport',
    { floor: '#39405a', wall: '#4a5575', ceiling: '#1a2238', accent: '#bfe3ff', emissive: '#3aa0ff', trim: '#6cf0c2' },
    { mode: 'open', hemiSky: '#cfe0fb', hemiGround: '#26304a', hemiInt: 0.6, fill: '#ffe7c4', fillInt: 0.55 },
    { map: { bench: 'bench', plant: 'planter', crate: 'crate', container: 'container', terminal: 'terminal', sign: 'terminal', kiosk: 'terminal', barrel: 'barrel', storage: 'container' },
      zone: {}, scatter: [] }),

  // Market bazaar: open, warm gold, bright and bustling.
  market: T('market',
    { floor: '#7a6450', wall: '#6e5a44', ceiling: '#2a2018', accent: '#ffd98a', emissive: '#ff9a3c', trim: '#ffb45a' },
    { mode: 'open', hemiSky: '#ffe7c4', hemiGround: '#5a4632', hemiInt: 0.7, fill: '#ffdca0', fillInt: 0.5 },
    { map: { vendor: 'counterCanopy', stall: 'counterCanopy', display: 'counterCanopy', crate: 'crate', barrel: 'barrel', storage: 'crate', plant: 'planter' },
      zone: { vendor_stall: ['counterCanopy', 'crate'], stall: ['counterCanopy', 'crate'] }, scatter: [] }),

  // Town district: open, neutral daylight.
  settlement: T('settlement',
    { floor: '#454c66', wall: '#39405a', ceiling: '#161b2a', accent: '#9fd0e0', emissive: '#39c0d6', trim: '#6cf0c2' },
    { mode: 'open', hemiSky: '#bcd4ff', hemiGround: '#3a3a4a', hemiInt: 0.5, fill: '#dfeaff', fillInt: 0.3 },
    { map: { crate: 'crate', barrel: 'barrel', plant: 'planter', bench: 'bench', terminal: 'terminal' }, zone: {}, scatter: [] }),

  // Mine/factory: open but dim, amber/sodium, hazy.
  industrial: T('industrial',
    { floor: '#46413a', wall: '#5a5048', ceiling: '#241f1a', accent: '#ffb070', emissive: '#ff7a3c', trim: '#ff9a4d' },
    { mode: 'open', hemiSky: '#6a5a44', hemiGround: '#241e18', hemiInt: 0.5, fill: '#ff9a4d', fillInt: 0.42, fog: '#3a322a' },
    { map: { barrel: 'barrel', storage: 'container', crate: 'crate', terminal: 'terminal' },
      zone: { storage: 'container' }, scatter: ['pipe', 'barrel'] }),

  // Ruins/lair: open, ominous cold-blue with a red emissive accent, darker.
  danger: T('danger',
    { floor: '#2a2330', wall: '#3a2230', ceiling: '#161018', accent: '#ff6b6b', emissive: '#ff3b46', trim: '#ff3b46' },
    { mode: 'open', hemiSky: '#3a4258', hemiGround: '#140e18', hemiInt: 0.36, fill: '#7a3040', fillInt: 0.3, fog: '#241a22' },
    { map: { crate: 'crate', barrel: 'barrel' }, zone: {}, scatter: ['rock', 'crystal'] }),

  // Shantytown / slum: open-air, arid + dusty. Earth-tone dirt ground and weathered shacks under a
  // thick brown haze + warm-muted light. Reads as a sprawling informal settlement (corrugated-roof
  // shacks come from the 'shack' building shape; brown dust from the 'shantyDust' particle preset).
  shantytown: T('shantytown',
    { floor: '#6b5a44', wall: '#7a6a52', ceiling: '#3a2e1f', accent: '#d9a84a', emissive: '#c8883c', trim: '#a98a5a' },
    { mode: 'open', hemiSky: '#a9967a', hemiGround: '#352a1c', hemiInt: 0.5, fill: '#d8b878', fillInt: 0.32, fog: '#9a8a6a' },
    // lines:'laundry' strings cloth between adjacent shacks; debris/cookfire add lived-in clutter.
    { map: { crate: 'crate', barrel: 'barrel' }, zone: {}, scatter: ['rock', 'crate', 'barrel', 'debris', 'debris', 'cookfire'], lines: 'laundry' }),

  // Building interior (home): warm, cozy. Keeps its own InteriorWalls shell + plain box furniture.
  residential: T('residential',
    { floor: '#5a4a3a', wall: '#6a5444', ceiling: '#2a2018', accent: '#e0b890', emissive: '#ffb060', trim: '#ffb060' },
    { mode: 'open', hemiSky: '#ffe0c0', hemiGround: '#3a2e22', hemiInt: 0.55, fill: '#ffd9a8', fillInt: 0.4 },
    { map: { plant: 'planter' }, zone: {}, scatter: [] }),

  default: T('default',
    { floor: '#2a3145', wall: '#39405a', ceiling: '#161b2a', accent: '#aebbd6', emissive: '#7db8ff', trim: '#6cf0c2' },
    { mode: 'open', hemiSky: '#bcd4ff', hemiGround: '#2a3145', hemiInt: 0.5, fill: '#dfeaff', fillInt: 0.32 },
    EMPTY_PROPS),
};

// Interior particle field per theme (submap-liveliness Phase 3) — see Weather.jsx PRESETS. Attached
// here (not inline in T) so the rest of the table stays scannable. Themes not listed get no field.
const PARTICLE = {
  clinic: { preset: 'sterile' },
  civic: { preset: 'motes' },
  market: { preset: 'motes' },
  industrial: { preset: 'steam' },
  danger: { preset: 'embers' },
  spaceport: { preset: 'sterile' },
  shantytown: { preset: 'shantyDust' },
};
for (const k of Object.keys(SUBMAP_THEMES)) SUBMAP_THEMES[k].particle = PARTICLE[k] || null;

// Ambient wandering crowd per theme (submap-liveliness Phase 4) — see SubmapCrowd.jsx.
//   flavor: label only; 'none' = no crowd. density: target walker count (capped at 24). tints:
//   civilian colour buckets. The realtime spaceport uses the SERVER crowd, so its offline flavor
//   here ('travelers') only shows in the unauth /submap-test harness, never doubling up in-game.
const CROWD = {
  clinic: { flavor: 'patients', density: 6, tints: ['#dfe8f2', '#cbd6e6', '#b9c4d8', '#c6d0c0'] },
  market: { flavor: 'shoppers', density: 14, tints: ['#d8c6a6', '#c6a9be', '#a9c6b0', '#cdd6e6', '#d6b89a'] },
  civic: { flavor: 'civilians', density: 8, tints: ['#d8d2c0', '#c6d0e6', '#cdd6e6', '#c0b8a0'] },
  settlement: { flavor: 'civilians', density: 10, tints: ['#cdd6e6', '#b9c4d8', '#d8c6a6', '#a9c6b0', '#c6a9be'] },
  industrial: { flavor: 'workers', density: 5, tints: ['#b0a890', '#c0a070', '#9aa6b8', '#a89878'] },
  spaceport: { flavor: 'travelers', density: 12, tints: ['#cdd6e6', '#b9c4d8', '#9fb3d1', '#d8c6a6', '#c6a9be'] },
  shantytown: { flavor: 'residents', density: 16, tints: ['#a89878', '#9a8868', '#b0a088', '#8a7860', '#7e6c54', '#9c8a70'] },
};
for (const k of Object.keys(SUBMAP_THEMES)) SUBMAP_THEMES[k].crowd = CROWD[k] || { flavor: 'none' };

/** Resolve the full theme object for a submap (palette + lighting + props + particle). */
export function getSubmapTheme(subMap) {
  return SUBMAP_THEMES[resolveThemeKey(subMap)] || SUBMAP_THEMES.default;
}
