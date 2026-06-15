/**
 * submapData — pure helpers that turn a submap's `layoutData` into the sim + the
 * world-positioned arrays the 3D interior scene renders. The submap analogue of
 * surfaceData.js: a submap is a small "surface" with a collisionMap (walkability) +
 * buildings + NPCs + entry/exit points.
 *
 * Coordinate model: submap layout positions are in GRID units (0..width/height); the
 * player position persists as 0–100 percent. We normalize everything to 0–100 percent,
 * then the sim maps 0–100 → world units (smaller scale than a planet — interiors are
 * compact). NPCs may arrive in grid OR percent (mixed), detected by the `> dim` test.
 */

import { createSurfaceSim, normalizeSurfaceCoord } from '../../../../shared/sim/surface.mjs';
import { getPoiStructure } from '../../data/modelManifest';

export const SUBMAP_SCALE = 0.8; // world units per percent → 0–100 maps to an 80u interior

const layoutOf = (subMap) => (subMap && (subMap.layoutData || subMap.layout)) || {};
const dimsOf = (d) => ({ w: d.width || (d.size && d.size.width) || 12, h: d.height || (d.size && d.size.height) || 12 });

/** A grid-or-percent coord pair → 0–100 percent (grid cells use cell-center). */
export function toPct(x, y, w, h) {
  const px = x > w ? (x > 100 ? x / 10 : x) : ((x + 0.5) / w) * 100;
  const py = y > h ? (y > 100 ? y / 10 : y) : ((y + 0.5) / h) * 100;
  return { x: px, y: py };
}

/** Build a surface sim from a submap: collisionMap → tileMap walkability, else open. */
export function createSubmapSim(subMap) {
  const d = layoutOf(subMap);
  const cm = d.collisionMap;
  let mapData = {};
  if (cm && Array.isArray(cm.cells) && cm.cells.length) {
    const res = cm.resolution || cm.cells.length;
    // collision cells: 0=walkable, 1=wall, 2=door (walkable), 3=locked door, 4=restricted.
    const tiles = cm.cells.map((row) => row.map((c) => ({
      walkable: c === 0 || c === 2,
      type: c === 1 ? 'building' : 'floor', // 'building' is an OBSTACLE_TILE_TYPE
    })));
    mapData = { tileMap: { gridSize: res, tileSize: 100 / res, tiles } };
  }
  return createSurfaceSim(mapData, { scale: SUBMAP_SCALE });
}

/** Resolve the player's spawn (0–100 surface coords) for this submap. */
export function submapSpawn(subMap, character) {
  const d = layoutOf(subMap);
  const { w, h } = dimsOf(d);
  const loc = character && character.currentLocation;
  // Resume saved position only if it's THIS submap.
  if (loc && loc.subMapId === subMap.id && Number.isFinite(loc.x) && Number.isFinite(loc.y)) {
    return normalizeSurfaceCoord(loc.x, loc.y);
  }
  // Else spawn just inside the entry point (offset toward map center to avoid auto-exit).
  const entry = (d.entryPoints && d.entryPoints[0]) || (d.exitPoints && d.exitPoints[0]);
  if (entry && entry.position) {
    const p = toPct(entry.position.x, entry.position.y, w, h);
    return { x: p.x + (p.x < 50 ? 6 : -6), y: p.y + (p.y < 50 ? 6 : -6) };
  }
  return { x: 50, y: 50 };
}

/** Buildings (+ POIs) as world-positioned, enterable POI structures. */
export function buildSubmapPois(subMap, sim) {
  if (!sim) return [];
  const d = layoutOf(subMap);
  const { w, h } = dimsOf(d);
  const out = [];
  const seen = new Set();
  const raw = [...(d.buildings || []), ...(d.pointsOfInterest || [])];
  for (const b of raw) {
    const pos = b.position || b;
    if (!pos || !Number.isFinite(pos.x)) continue;
    const id = String(b.id || b.name || `${b.type}_${pos.x}_${pos.y}`);
    if (seen.has(id)) continue;
    seen.add(id);
    const p = toPct(pos.x, pos.y, w, h);
    const wpos = sim.surfaceToWorld(p.x, p.y);
    out.push({
      id, name: b.name || b.type, type: b.type, kind: 'building',
      sx: p.x, sy: p.y, wx: wpos.x, wz: wpos.z,
      enterable: !!b.opensTo || b.type === 'crafting_bench' || b.type === 'vendor_stall' || b.type === 'commercial',
      structure: getPoiStructure(b.type),
      raw: b,
    });
  }
  return out;
}

/** Exit points as world-positioned exit markers (walk near → leave the submap). */
export function buildSubmapExits(subMap, sim) {
  if (!sim) return [];
  const d = layoutOf(subMap);
  const { w, h } = dimsOf(d);
  return (d.exitPoints || []).map((e, i) => {
    const p = toPct(e.position.x, e.position.y, w, h);
    const wpos = sim.surfaceToWorld(p.x, p.y);
    return { id: e.id || `exit_${i}`, label: e.label || 'Exit', sx: p.x, sy: p.y, wx: wpos.x, wz: wpos.z, raw: e };
  });
}

/** Quest objectives located in THIS submap → world-positioned waypoint beacons. */
export function buildSubmapWaypoints(activeQuests, subMap, sim) {
  if (!sim || !Array.isArray(activeQuests)) return [];
  const d = layoutOf(subMap);
  const { w, h } = dimsOf(d);
  const out = [];
  for (const entry of activeQuests) {
    const quest = entry?.quest;
    const progress = entry?.progress;
    if (!quest?.objectives) continue;
    for (const obj of quest.objectives) {
      if (progress?.objectivesCompleted?.[obj.id]) continue;
      const loc = obj.location;
      if (!loc || loc.subMapId !== subMap.id || !Number.isFinite(loc.x) || !Number.isFinite(loc.y)) continue;
      const p = toPct(loc.x, loc.y, w, h);
      const wp = sim.surfaceToWorld(p.x, p.y);
      const t = (loc.type || obj.type || '').toLowerCase();
      out.push({ id: `${quest.id}:${obj.id}`, wx: wp.x, wz: wp.z, combat: /combat|kill|defeat/.test(t), label: obj.description || quest.title || 'Objective' });
    }
  }
  return out;
}

/** Submap NPCs → world-positioned actors (coords normalized grid|percent → world). */
export function buildSubmapNpcs(npcs, subMap, sim) {
  if (!sim) return [];
  const d = layoutOf(subMap);
  const { w, h } = dimsOf(d);
  return (npcs || [])
    .map((n) => {
      const loc = n.location || {};
      if (!Number.isFinite(loc.x) || !Number.isFinite(loc.y)) return null;
      const p = toPct(loc.x, loc.y, w, h);
      const wpos = sim.surfaceToWorld(p.x, p.y);
      return {
        id: n.id,
        name: n.name,
        npcType: n.npcType || (n.vendorInventory ? 'vendor' : 'generic'),
        level: n.level,
        sx: p.x, sy: p.y, wx: wpos.x, wz: wpos.z,
        raw: n,
      };
    })
    .filter((n) => n && Number.isFinite(n.wx));
}
