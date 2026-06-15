/**
 * surfaceData — pure helpers that turn a planet's `mapData` + NPC list into the
 * world-positioned POI/NPC arrays the 3D scene renders. Shared by PlanetSurface3D
 * (live backend data) and the SurfaceTest harness (synthetic data) so both exercise
 * the exact same build path.
 *
 * Enterability + submap typing mirror PlanetSurface.jsx so the 3D entry flow lands on
 * the same /game/location/... routes.
 */

import { normalizeSurfaceCoord } from '../../../../shared/sim/surface.mjs';
import { getPoiStructure, getPoiCategory, getPoiBuilding, getPoiProps } from '../../data/modelManifest';

const ENTERABLE_TYPES = new Set([
  'spaceport', 'market', 'cantina', 'palace', 'temple', 'medical_center', 'hospital',
  'city', 'capital', 'settlement', 'province', 'wilderness', 'entertainment',
  'government', 'base', 'arena',
]);
const DUNGEON_TYPES = new Set(['danger', 'mine', 'underworld', 'cave', 'ruins', 'fortress']);

export function isDungeon(loc) {
  const t = (loc.type || '').toLowerCase();
  return DUNGEON_TYPES.has(t) || loc?.metadata?.isDungeon === true || (loc.dangerLevel || 0) >= 6;
}
export function isEnterable(loc) {
  const t = (loc.type || '').toLowerCase();
  return isDungeon(loc) || ENTERABLE_TYPES.has(t);
}
export function deriveSubMapType(loc) {
  const t = (loc.type || '').toLowerCase();
  if (isDungeon(loc)) return 'dungeon';
  if (t === 'medical_center' || t === 'hospital') return 'medical_center';
  if (t === 'spaceport') return 'spaceport';
  if (t === 'market') return 'market';
  if (t === 'city' || t === 'capital') return 'city';
  if (t === 'settlement' || t === 'province' || t === 'wilderness') return 'settlement';
  return 'city';
}

/** Gather every placeable location/POI from mapData into one normalized world list. */
export function buildPois(planet, sim) {
  if (!planet || !sim) return [];
  const md = planet.mapData || {};
  const layout = md.mapLayout || {};
  const raw = [
    ...(md.pointsOfInterest || []),
    ...(planet.pointsOfInterest || []),
    ...(layout.districts || []),
    ...(layout.locations || []),
    ...(md.markets || []).map((m) => ({ ...m, type: m.type || 'market' })),
    ...(md.medicalCenters || []),
  ];
  if (md.spaceport && Number.isFinite(md.spaceport.x)) {
    raw.push({ id: 'spaceport', name: 'Spaceport', type: 'spaceport', x: md.spaceport.x, y: md.spaceport.y });
  }

  const out = [];
  const seen = new Set();
  for (const loc of raw) {
    const sxsy = normalizeSurfaceCoord(loc.x ?? loc.location?.x, loc.y ?? loc.location?.y);
    if (!Number.isFinite(sxsy.x) || !Number.isFinite(sxsy.y)) continue;
    const id = String(loc.id || loc.name || `${loc.type}_${sxsy.x}_${sxsy.y}`);
    if (seen.has(id)) continue;
    seen.add(id);
    const w = sim.surfaceToWorld(sxsy.x, sxsy.y);
    out.push({
      id,
      name: loc.name || loc.type,
      type: loc.type,
      sx: sxsy.x, sy: sxsy.y,
      wx: w.x, wz: w.z,
      enterable: isEnterable(loc),
      category: getPoiCategory(loc.type),
      structure: getPoiStructure(loc.type),
      building: getPoiBuilding(loc.type, id),
      props: getPoiProps(loc.type, id),
      raw: loc,
    });
  }
  return out;
}

/** Map a surface-level NPC list to world-positioned actors. */
export function buildNpcs(npcs, sim) {
  if (!sim) return [];
  return (npcs || [])
    .filter((n) => n.location && !n.location.subMapId)
    .map((n) => {
      const s = normalizeSurfaceCoord(n.location.x || 0, n.location.y || 0);
      const w = sim.surfaceToWorld(s.x, s.y);
      return {
        id: n.id,
        name: n.name,
        npcType: n.npcType || (n.vendorInventory ? 'vendor' : 'generic'),
        wx: w.x, wz: w.z,
        raw: n,
      };
    })
    .filter((n) => Number.isFinite(n.wx));
}
