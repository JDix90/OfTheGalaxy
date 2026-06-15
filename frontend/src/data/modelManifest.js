/**
 * modelManifest.js — the SWAPPABLE 3D model manifest.
 *
 * Mirrors the existing `*SpriteMap` pattern: maps semantic keys to renderable
 * descriptors, so the whole CC0 → Synty (or commissioned-art) upgrade is a manifest
 * edit, not a code change.
 *
 * Phase 3 wires in a real CC0 glTF kit (Kenney Space Kit buildings/props +
 * Quaternius Ultimate Space Kit characters — all CC0, see public/models/ATTRIBUTION.md):
 *   - Characters: each role maps to an ARRAY of glTF descriptors; an NPC's id picks a
 *     deterministic variant, so a crowd has visual variety (astronauts / mechs / robots
 *     for friendlies, alien creatures for hostiles).
 *   - POI structures: each category keeps its composed-primitive descriptor (the Phase-1
 *     fallback) AND now an array of glTF `buildings` + a `props` scatter pool. PoiStructure
 *     renders the glTF building when present and falls back to the primitive otherwise.
 *
 * Descriptor kinds:
 *   - { kind: 'gltf', url, scale|fitHeight, clips, tint?, facingOffset, yOffset? } — a
 *     rigged/animated character. `fitHeight` normalizes mixed-rig sizes to one height;
 *     `tint` only applies to a material literally named 'Main' (the CC0 robot) so the
 *     atlas-textured Quaternius models keep their own art.
 *   - POI categories: primitive `shape`/colors + `buildings[]` (glb urls) + `fit` (target
 *     footprint in world units) + `props[]` ({ url, fit }).
 *
 * This file is pure data + small pure resolvers (no three.js import).
 */

// ---- deterministic variant picking (so a given NPC/POI always looks the same) -------
function hashStr(s) {
  s = String(s);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function pickBySeed(arr, seed) {
  if (!arr || arr.length === 0) return undefined;
  if (seed == null) return arr[0];
  return arr[hashStr(seed) % arr.length];
}

// ============================ CHARACTERS =============================================

// CC0 Quaternius "RobotExpressive" — neutral animated robot (material 'Main' is tintable).
const ROBOT_BASE = {
  kind: 'gltf',
  url: '/models/characters/RobotExpressive.glb',
  scale: 0.42,
  facingOffset: Math.PI, // modelled forward is -Z; rotate +π so +Z = forward
  clips: { idle: 'Idle', walk: 'Walking', run: 'Running' },
  walkRef: 6.5, runRef: 12.0, runThreshold: 8.0,
};
const robot = (tint) => ({ ...ROBOT_BASE, tint });

// CC0 Quaternius "Ultimate Space Kit" characters — self-contained .gltf, atlas-textured
// (so NO tint), rigged Idle/Walk/Run. Normalized to a common height via fitHeight.
const Q_CLIPS = { idle: 'Idle', walk: 'Walk', run: 'Run' };
const Q_FLY_CLIPS = { idle: 'Flying_Idle', walk: 'Fast_Flying', run: 'Fast_Flying' };
const qChar = (file, extra = {}) => ({
  kind: 'gltf',
  url: `/models/characters/${file}.gltf`,
  fitHeight: 1.7,
  facingOffset: Math.PI, // Quaternius models face -Z; rotate so +Z = forward
  clips: Q_CLIPS,
  walkRef: 2.2, runRef: 4.5, runThreshold: 3.2,
  ...extra,
});

const ASTRONAUTS = [
  qChar('Astronaut_RaeTheRedPanda'),
  qChar('Astronaut_FinnTheFrog'),
  qChar('Astronaut_BarbaraTheBee'),
];
const MECHS = [
  qChar('Mech_RaeTheRedPanda', { fitHeight: 1.85 }),
  qChar('Mech_FernandoTheFlamingo', { fitHeight: 1.85 }),
];
const ENEMIES = [
  qChar('Enemy_Large', { fitHeight: 2.0 }),
  qChar('Enemy_Small', { fitHeight: 1.15 }),
  qChar('Enemy_Flying', { clips: Q_FLY_CLIPS, fitHeight: 1.1, yOffset: 1.2 }),
];

// Each role → an array of model variants; an NPC's id deterministically picks one.
export const CHARACTER_MODELS = {
  'char.player':          [robot('#ffcf5c')],                 // the protagonist (gold robot)
  'npc.generic':          [...ASTRONAUTS, robot('#9fb3d1'), ...MECHS],
  'npc.quest_giver':      [...ASTRONAUTS, robot('#ffd24a')],  // friendlies (the ! marker tags them)
  'npc.vendor':           [...ASTRONAUTS, robot('#6cf0c2')],
  'npc.companion':        [robot('#7db8ff'), ...ASTRONAUTS],
  'npc.faction_leader':   [...MECHS, robot('#d18cff')],       // imposing / robotic
  'npc.random_encounter': ENEMIES,                            // hostile creatures
};

/**
 * Resolve a character model descriptor by role key ('char.player' or `npc.<type>`).
 * Pass a stable `seed` (e.g. the NPC id) to pick a deterministic variant; omit it
 * (player) to get the canonical first variant.
 */
export function getCharacterModel(key, seed) {
  const arr = CHARACTER_MODELS[key] || CHARACTER_MODELS['npc.generic'];
  return pickBySeed(arr, seed);
}

// Per-role accent color — drives instanced proxy capsules + nameplate accents.
// Kept here (not on the textured glTF models) so the whole role palette lives in one place.
export const ROLE_COLORS = {
  generic: '#9fb3d1',
  quest_giver: '#ffd24a',
  vendor: '#6cf0c2',
  companion: '#7db8ff',
  faction_leader: '#d18cff',
  random_encounter: '#ff6a5a',
};
export function getRoleColor(npcType) {
  return ROLE_COLORS[npcType] || ROLE_COLORS.generic;
}

// ============================ POI STRUCTURES ========================================
// Primitive descriptor (Phase-1 fallback) + glTF `buildings` (Kenney Space Kit) +
// `props` scatter pool. `fit` = target footprint diameter in world units for the glTF.
const B = (f) => `/models/buildings/${f}.glb`;
const P = (f, fit = 1.5) => ({ url: `/models/props/${f}.glb`, fit });

const PROP_BARRELS = [P('barrel', 1.0), P('barrels', 1.6), P('container', 1.8)];
const PROP_PIPES = [P('pipe_straight', 2.0), P('pipe_ring', 1.8)];
const PROP_ROCKS = [P('rock_largeA', 2.2), P('rock_crystalsLargeA', 2.0), P('meteor', 1.8)];

export const POI_STRUCTURES = {
  spaceport:  { shape: 'pad',        color: '#9fc4e8', accent: '#bfe3ff', emissive: '#3aa0ff', height: 5.5, footprint: 7.0, glow: 1.1,
                buildings: [B('hangar_largeB'), B('hangar_roundA')], fit: 12, props: [P('craft_speederA', 3.0), ...PROP_BARRELS] },
  market:     { shape: 'cluster',    color: '#c79a4b', accent: '#ffd98a', emissive: '#ff9a3c', height: 3.0, footprint: 6.0, glow: 0.5,
                buildings: [B('hangar_smallB'), B('structure_closed')], fit: 8, props: PROP_BARRELS },
  settlement: { shape: 'habitat',    color: '#5f7a8c', accent: '#9fd0e0', emissive: '#39c0d6', height: 7.0, footprint: 5.5, glow: 0.4,
                buildings: [B('hangar_roundA'), B('hangar_smallB'), B('structure_closed')], fit: 8.5, props: [...PROP_BARRELS, ...PROP_PIPES] },
  civic:      { shape: 'dome',       color: '#cdd6e8', accent: '#ffe9a8', emissive: '#ffcf5c', height: 5.0, footprint: 6.0, glow: 0.6,
                buildings: [B('hangar_roundGlass')], fit: 10, props: [P('satelliteDish', 2.2)] },
  industrial: { shape: 'industrial', color: '#6b6f7a', accent: '#b98a5a', emissive: '#ff7a3c', height: 5.5, footprint: 6.0, glow: 0.35,
                buildings: [B('machine_generatorLarge'), B('structure_detailed')], fit: 8, props: [...PROP_PIPES, ...PROP_BARRELS] },
  danger:     { shape: 'spire',      color: '#3a2230', accent: '#7a2030', emissive: '#ff3b46', height: 6.5, footprint: 5.0, glow: 0.9,
                buildings: [B('turret_double'), B('structure_detailed')], fit: 7, props: PROP_ROCKS },
  default:    { shape: 'monument',   color: '#7e8aa6', accent: '#aebbd6', emissive: '#7db8ff', height: 4.0, footprint: 4.5, glow: 0.4,
                buildings: [B('satelliteDish_large'), B('structure_detailed')], fit: 6.5, props: [P('rock_largeA', 2.0)] },
};

// POI/location type string → structure category.
const TYPE_TO_CATEGORY = {
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

/** Map a POI/location `type` string to a structure category key. */
export function getPoiCategory(type) {
  if (!type) return 'default';
  return TYPE_TO_CATEGORY[String(type).toLowerCase()] || 'default';
}

/** Resolve a POI structure descriptor (primitive + glTF building/prop data) from a POI `type`. */
export function getPoiStructure(type) {
  return POI_STRUCTURES[getPoiCategory(type)] || POI_STRUCTURES.default;
}

/**
 * Resolve the glTF building for a POI, or null to fall back to the primitive.
 * `seed` (POI id) picks a deterministic variant so same-category POIs vary.
 */
export function getPoiBuilding(type, seed) {
  const s = getPoiStructure(type);
  if (!s.buildings || s.buildings.length === 0) return null;
  return { url: pickBySeed(s.buildings, seed ?? getPoiCategory(type)), fit: s.fit || s.footprint * 1.6 };
}

/** Deterministic scatter of N props around a POI (each { url, fit, angle, radius }). */
export function getPoiProps(type, seed, n = 3) {
  const s = getPoiStructure(type);
  const pool = s.props || [];
  if (pool.length === 0) return [];
  const h = hashStr(seed ?? getPoiCategory(type));
  const count = Math.min(n, pool.length + 1);
  const ring = (s.fit || s.footprint * 1.6) * 0.62 + 1.4;
  const out = [];
  for (let i = 0; i < count; i++) {
    const p = pool[(h + i * 7) % pool.length];
    const angle = ((h >> (i * 3)) % 360) * (Math.PI / 180) + i * 2.39996; // golden-ish spread
    const radius = ring + ((h >> (i * 2)) % 100) / 100 * 1.6;
    out.push({ ...p, angle, radius, yaw: ((h >> i) % 360) * (Math.PI / 180) });
  }
  return out;
}

// Preloaded eagerly so the player appears instantly; NPC/building/prop glTFs load on demand.
export const CHARACTER_GLTF_URLS = [ROBOT_BASE.url];
