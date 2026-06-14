/**
 * modelManifest.js — the SWAPPABLE 3D model manifest (Phase 1).
 *
 * Mirrors the existing `*SpriteMap` pattern (poiSpriteMap/npcSpriteMap): maps semantic
 * keys to a renderable descriptor, so the whole CC0 → Synty (or commissioned-art)
 * upgrade is a manifest edit, not a code change.
 *
 * Two descriptor kinds:
 *   - { kind: 'gltf', url, scale, clips, tint }  — a rigged/animated glTF (characters).
 *   - { kind: 'primitive', ...structure }        — a composed-primitive building (POIs).
 *     Phase 1 ships clean primitive "structures" per POI category; dropping in a Synty
 *     building later means adding `gltf: '/models/buildings/foo.glb'` to that category.
 *
 * Coordinates/scale are handled by the surface sim + scene; this file is pure data
 * plus small pure resolvers (no three.js import).
 */

// ---- Characters (CC0 Quaternius "RobotExpressive", tinted per role for now) ----
const CHARACTER_BASE = {
  kind: 'gltf',
  url: '/models/characters/RobotExpressive.glb',
  scale: 0.42,
  // facingOffset: the model's modelled forward is -Z; rotate +π so +Z = forward.
  facingOffset: Math.PI,
  clips: { idle: 'Idle', walk: 'Walking', run: 'Running' },
  // locomotion thresholds in WORLD units/s (match the surface sim's speeds).
  walkRef: 6.5,
  runRef: 12.0,
  runThreshold: 8.0,
};

export const CHARACTER_MODELS = {
  'char.player':        { ...CHARACTER_BASE, tint: '#ffcf5c' },
  'npc.generic':        { ...CHARACTER_BASE, tint: '#9fb3d1' },
  'npc.quest_giver':    { ...CHARACTER_BASE, tint: '#ffd24a' },
  'npc.vendor':         { ...CHARACTER_BASE, tint: '#6cf0c2' },
  'npc.companion':      { ...CHARACTER_BASE, tint: '#7db8ff' },
  'npc.faction_leader': { ...CHARACTER_BASE, tint: '#d18cff' },
  'npc.random_encounter': { ...CHARACTER_BASE, tint: '#ff8d6c' },
};

/** Resolve a character model descriptor by npcType (or 'char.player'). */
export function getCharacterModel(key) {
  return CHARACTER_MODELS[key] || CHARACTER_MODELS['npc.generic'];
}

// ---- POI structures (primitive buildings, keyed by category) ------------------
// shape ∈ 'pad' | 'cluster' | 'habitat' | 'dome' | 'industrial' | 'spire' | 'monument'
export const POI_STRUCTURES = {
  spaceport:  { shape: 'pad',        color: '#9fc4e8', accent: '#bfe3ff', emissive: '#3aa0ff', height: 5.5, footprint: 7.0, glow: 1.1 },
  market:     { shape: 'cluster',    color: '#c79a4b', accent: '#ffd98a', emissive: '#ff9a3c', height: 3.0, footprint: 6.0, glow: 0.5 },
  settlement: { shape: 'habitat',    color: '#5f7a8c', accent: '#9fd0e0', emissive: '#39c0d6', height: 7.0, footprint: 5.5, glow: 0.4 },
  civic:      { shape: 'dome',       color: '#cdd6e8', accent: '#ffe9a8', emissive: '#ffcf5c', height: 5.0, footprint: 6.0, glow: 0.6 },
  industrial: { shape: 'industrial', color: '#6b6f7a', accent: '#b98a5a', emissive: '#ff7a3c', height: 5.5, footprint: 6.0, glow: 0.35 },
  danger:     { shape: 'spire',      color: '#3a2230', accent: '#7a2030', emissive: '#ff3b46', height: 6.5, footprint: 5.0, glow: 0.9 },
  default:    { shape: 'monument',   color: '#7e8aa6', accent: '#aebbd6', emissive: '#7db8ff', height: 4.0, footprint: 4.5, glow: 0.4 },
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

/** Resolve a POI structure descriptor from a POI `type`. */
export function getPoiStructure(type) {
  return POI_STRUCTURES[getPoiCategory(type)] || POI_STRUCTURES.default;
}

// The single character glTF currently in use — for useGLTF.preload().
export const CHARACTER_GLTF_URLS = [CHARACTER_BASE.url];
