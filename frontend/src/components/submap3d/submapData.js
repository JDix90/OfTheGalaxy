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
import { createSubmapSimWith, submapToPct, submapLayout, submapCoordDims } from '../../../../shared/sim/submap.mjs';
import { getPoiStructure, getPoiBuilding, getPoiProps } from '../../data/modelManifest';

const layoutOf = (subMap) => submapLayout(subMap);

/** A grid-or-percent coord pair → 0–100 percent (grid cells use cell-center). */
export const toPct = submapToPct;

/** Build a surface sim from a submap — shared with the authoritative server (identical collision). */
export function createSubmapSim(subMap) {
  return createSubmapSimWith(subMap, createSurfaceSim);
}

/** Resolve the player's spawn (0–100 surface coords) for this submap. `sim` (optional) is
 *  used to validate walkability and scan for a fallback so the player never spawns in a wall. */
export function submapSpawn(subMap, character, sim) {
  const d = layoutOf(subMap);
  const { w, h } = submapCoordDims(subMap);
  const walkable = (x, y) => !sim || sim.isWalkableSurface(x, y);
  const loc = character && character.currentLocation;
  // Resume saved position only if it's THIS submap.
  if (loc && loc.subMapId === subMap.id && Number.isFinite(loc.x) && Number.isFinite(loc.y)) {
    const s = normalizeSurfaceCoord(loc.x, loc.y);
    if (walkable(s.x, s.y)) return s;
  }
  // Else spawn just inside the entry point (offset toward map center to avoid auto-exit).
  let spawn = { x: 50, y: 50 };
  const entry = (d.entryPoints && d.entryPoints[0]) || (d.exitPoints && d.exitPoints[0]);
  if (entry && entry.position) {
    const p = toPct(entry.position.x, entry.position.y, w, h);
    spawn = { x: p.x + (p.x < 50 ? 6 : -6), y: p.y + (p.y < 50 ? 6 : -6) };
  }
  if (walkable(spawn.x, spawn.y)) return spawn;
  // Fallback: scan for any walkable cell (mirrors the server's _scanWalkable).
  for (let sy = 4; sy < 100; sy += 3) {
    for (let sx = 4; sx < 100; sx += 3) {
      if (walkable(sx, sy)) return { x: sx, y: sy };
    }
  }
  return spawn;
}

// Type-appropriate, low-profile structures for submap buildings/rooms. Submap "buildings"
// are small floor-plan cells (clinic wards, market stalls, houses, reception desks), so the
// surface's tall monument/habitat primitives read as out-of-place obelisks. These map a
// submap building type → a low room/stall/desk shape sized to its floor footprint.
const SUBMAP_PALETTE = {
  medical: { color: '#dfe8f2', accent: '#a9ead2', emissive: '#46d6a0' },
  vendor: { color: '#b88a42', accent: '#ffd98a', emissive: '#ff9a3c' },
  civic: { color: '#c6d0e6', accent: '#ffe9a8', emissive: '#ffcf5c' },
  home: { color: '#7e6450', accent: '#e0b890', emissive: '#ffb060' },
  tech: { color: '#33506e', accent: '#bfe3ff', emissive: '#3aa0ff' },
};

function submapStructure(b, w, sim) {
  const t = String(b.type || '').toLowerCase();
  const cellW = (100 / Math.max(1, w)) * (sim.scale || 0.85);
  const cells = Math.max((b.size && b.size.width) || 1, (b.size && b.size.height) || 1);
  // Footprint is capped: PoiStructure scales its accent point-light by footprint, and a roomful
  // of large footprints floods the enclosed floor with the accent color. Keep it modest so each
  // room casts a soft colored glow, not a wash. Low glow for the same reason.
  const fp = Math.max(2.2, Math.min(cells * cellW * 0.8, 6));
  const mk = (shape, palKey, h) => ({ shape, ...SUBMAP_PALETTE[palKey], height: h, footprint: fp, glow: 0.28 });
  // Hangars / landing pads read as GRAND open-bay structures (glTF hangar + docked ship from the
  // surface 'spaceport' kit), so they keep the surface footprint rather than the compact room cap.
  if (/hangar|landing|spaceport|dock|pad/.test(t)) {
    const s = getPoiStructure(b.type);
    return { ...s, height: Math.min(s.height, 6), footprint: Math.min(s.footprint, 9), glow: 0.5 };
  }
  if (/vendor|stall|stand|market/.test(t)) return mk('stall', 'vendor', Math.min(2.6, cellW));
  if (/crafting|reception|desk|terminal|counter|kiosk|info/.test(t)) return mk('desk', 'tech', Math.min(1.9, cellW * 0.9));
  if (/treatment|surgery|patient|ward|exam|medical|clinic/.test(t)) return mk('room', 'medical', Math.min(3.4, Math.max(2.4, cellW * 0.7)));
  if (/residential|residence|home|quarters|apartment/.test(t)) return mk('room', 'home', Math.min(3.8, Math.max(2.8, cellW * 0.8)));
  if (/commercial|shop|store|cantina|bar/.test(t)) return mk('room', 'vendor', Math.min(3.6, Math.max(2.6, cellW * 0.75)));
  if (/office|court|chamber|hall|civic|gov|temple|palace/.test(t)) return mk('room', 'civic', Math.min(3.6, Math.max(2.6, cellW * 0.75)));
  // Fallback: surface category, capped so it doesn't tower over a compact submap.
  const s = getPoiStructure(b.type);
  return { ...s, height: Math.min(s.height, 3.6), footprint: Math.min(s.footprint, Math.max(fp, 3.0)) };
}

/** Buildings (+ POIs) as world-positioned, enterable POI structures. */
export function buildSubmapPois(subMap, sim) {
  if (!sim) return [];
  const d = layoutOf(subMap);
  const { w, h } = submapCoordDims(subMap);
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
    // Hangars/landing bays render as the grand glTF hangar + docked-ship props (the surface
    // 'spaceport' kit); compact storefronts (stall/desk/room) stay as their tuned primitives.
    const isHangar = /hangar|landing|spaceport|dock|pad/.test(String(b.type || '').toLowerCase());
    out.push({
      id, name: b.name || b.type, type: b.type, kind: 'building',
      sx: p.x, sy: p.y, wx: wpos.x, wz: wpos.z,
      enterable: !!b.opensTo || b.type === 'crafting_bench' || b.type === 'vendor_stall' || b.type === 'commercial',
      structure: submapStructure(b, w, sim),
      ...(isHangar ? { building: getPoiBuilding(b.type, id), props: getPoiProps(b.type, id) } : {}),
      raw: b,
    });
  }
  return out;
}

/** Exit points as world-positioned exit markers (walk near → leave the submap). */
export function buildSubmapExits(subMap, sim) {
  if (!sim) return [];
  const d = layoutOf(subMap);
  const { w, h } = submapCoordDims(subMap);
  // Building interiors put their exit in entryPoints with type:'exit' (exitPoints is empty).
  const raw = [...(d.exitPoints || []), ...((d.entryPoints || []).filter((e) => e.type === 'exit'))];
  const seen = new Set();
  const out = [];
  raw.forEach((e, i) => {
    if (!e || !e.position) return;
    const key = String(e.id || `exit_${i}`);
    if (seen.has(key)) return;
    seen.add(key);
    const p = toPct(e.position.x, e.position.y, w, h);
    const wpos = sim.surfaceToWorld(p.x, p.y);
    out.push({ id: key, label: e.label || 'Exit', sx: p.x, sy: p.y, wx: wpos.x, wz: wpos.z, exitsTo: e.exitsTo || null, raw: e });
  });
  return out;
}

// Furniture / decoration / interactive presentation (typed boxes; emissive accents glow).
const FURN = {
  counter: { ht: 1.0, color: '#7a5a3a' }, table: { ht: 1.0, color: '#7a5a3a' }, desk: { ht: 1.0, color: '#6a4a2a' },
  shelf: { ht: 2.2, color: '#5a4a3a' }, display: { ht: 1.6, color: '#3a5a7a' }, cabinet: { ht: 2.0, color: '#5a4a3a' },
  bed: { ht: 0.8, color: '#7a4a5a' }, chair: { ht: 1.0, color: '#5a4a3a' }, stool: { ht: 0.8, color: '#5a4a3a' },
  crate: { ht: 1.0, color: '#6a5a3a' }, barrel: { ht: 1.1, color: '#6a4a2a' }, storage: { ht: 1.4, color: '#5a5a5a' },
  chest: { ht: 0.9, color: '#7a6a3a' }, sign: { ht: 2.4, color: '#3a4a6a', emissive: '#7db8ff' }, plant: { ht: 1.4, color: '#3a6a3a' },
  vendor: { ht: 1.1, color: '#caa24b', emissive: '#ffcf5c' }, terminal: { ht: 1.3, color: '#2a4a6a', emissive: '#3aa0ff' },
  default: { ht: 1.1, color: '#5a5a6a' },
};

/** Furniture + decorations + interactive elements → world-positioned 3D props. */
export function buildSubmapFurniture(subMap, sim) {
  if (!sim) return [];
  const d = layoutOf(subMap);
  const { w, h } = submapCoordDims(subMap);
  const cellPct = 100 / w; // percent per grid cell
  const items = [...(d.furniture || []), ...(d.decorations || []), ...(d.interactiveElements || [])];
  const out = [];
  items.forEach((f, i) => {
    const pos = f.position;
    if (!pos || !Number.isFinite(pos.x)) return;
    const sw = (f.size && f.size.width) || 1;
    const sh = (f.size && f.size.height) || 1;
    const cx = ((pos.x + sw / 2) / w) * 100;
    const cy = ((pos.y + sh / 2) / h) * 100;
    const wpos = sim.surfaceToWorld(cx, cy);
    const def = FURN[f.type] || FURN.default;
    out.push({
      id: f.id || `furn_${i}`, type: f.type,
      wx: wpos.x, wz: wpos.z,
      wlen: Math.max(0.6, sw * cellPct * sim.scale * 0.9),
      dlen: Math.max(0.6, sh * cellPct * sim.scale * 0.9),
      ht: def.ht, color: def.color, emissive: def.emissive || null,
      rot: (f.rotation || 0) * Math.PI / 180,
    });
  });
  return out;
}

/** Quest objectives located in THIS submap → world-positioned waypoint beacons. */
export function buildSubmapWaypoints(activeQuests, subMap, sim) {
  if (!sim || !Array.isArray(activeQuests)) return [];
  const { w, h } = submapCoordDims(subMap);
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
  const { w, h } = submapCoordDims(subMap);
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
