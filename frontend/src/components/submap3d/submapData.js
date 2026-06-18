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

// Curated glTF building meshes for concourse storefronts, so shops read as real sci-fi
// buildings (Kenney Space Kit) instead of untextured primitive boxes — the hangars already
// look right because they use glTF; this extends that to the storefronts.
// `structure_detailed` is an OPEN girder frame (reads as scaffolding, not a shop), so use the
// solid `structure_closed` paneled block for every storefront. Variety comes from the per-type
// beacon/accent color + facing, not the mesh (the kit has no dedicated shop models).
const STOREFRONT_GLTF = {
  stall: 'structure_closed', market: 'structure_closed', stand: 'structure_closed',
  shop: 'structure_closed', store: 'structure_closed', commercial: 'structure_closed',
  cantina: 'structure_closed', bar: 'structure_closed',
  reception: 'structure_closed', desk: 'structure_closed', kiosk: 'structure_closed',
};
// Yaw correction for the modeled "front" axis of the building glTFs (radians). 0 = the mesh's
// +Z is its front; flip to Math.PI if buildings end up facing away from the walkway once seen.
const BUILDING_FRONT_OFFSET = 0;
const hashish = (s) => { let h = 0; for (let i = 0; i < String(s).length; i++) h = (h * 31 + String(s).charCodeAt(i)) | 0; return Math.abs(h); };
function storefrontBuilding(type, id) {
  const model = STOREFRONT_GLTF[String(type || '').toLowerCase()];
  if (!model) return null;
  const h = hashish(id);
  return { url: `/models/buildings/${model}.glb`, fit: 5, yaw: (h % 4) * (Math.PI / 2) };
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
    // Hangars/landing bays render as the grand glTF hangar + docked-ship props; storefronts get
    // a curated glTF building mesh; anything else falls back to its tuned primitive shape.
    const isHangar = /hangar|landing|spaceport|dock|pad/.test(String(b.type || '').toLowerCase());
    const storefront = isHangar ? null : storefrontBuilding(b.type, id);
    // Face the building toward the district CENTER (world origin = the concourse walkway), so
    // storefronts/hangars present their front to the walkway instead of a random seeded yaw.
    // BUILDING_FRONT_OFFSET corrects for the glTF's modeled front axis (tune once seen).
    const faceYaw = Math.atan2(-wpos.x, -wpos.z) + BUILDING_FRONT_OFFSET;
    let building = null;
    if (isHangar) building = { ...getPoiBuilding(b.type, id), yaw: faceYaw };
    else if (storefront) building = { ...storefront, yaw: faceYaw };
    out.push({
      id, name: b.name || b.type, type: b.type, kind: 'building',
      sx: p.x, sy: p.y, wx: wpos.x, wz: wpos.z,
      enterable: !!b.opensTo || b.type === 'crafting_bench' || b.type === 'vendor_stall' || b.type === 'commercial',
      structure: submapStructure(b, w, sim),
      ...(building ? { building, ...(isHangar ? { props: getPoiProps(b.type, id) } : {}) } : {}),
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
// `max` caps the world-space footprint so a prop can't balloon to grid-cell size on a coarse
// district grid (the spaceport's 12-cell grid makes one cell ~7u — a chair must not be 7u wide).
const FURN = {
  counter: { ht: 1.0, color: '#7a5a3a', max: 2.0 }, table: { ht: 1.0, color: '#7a5a3a', max: 1.8 }, desk: { ht: 1.0, color: '#6a4a2a', max: 2.0 },
  shelf: { ht: 2.2, color: '#5a4a3a', max: 1.6 }, display: { ht: 1.6, color: '#3a5a7a', max: 1.6 }, cabinet: { ht: 2.0, color: '#5a4a3a', max: 1.6 },
  bed: { ht: 0.8, color: '#7a4a5a', max: 2.2 }, chair: { ht: 1.0, color: '#5a4a3a', max: 0.9 }, stool: { ht: 0.8, color: '#5a4a3a', max: 0.8 },
  bench: { ht: 0.7, color: '#6a5a4a', max: 2.4 },
  crate: { ht: 1.0, color: '#6a5a3a', max: 1.1 }, barrel: { ht: 1.1, color: '#6a4a2a', max: 1.0 }, storage: { ht: 1.4, color: '#5a5a5a', max: 1.4 },
  chest: { ht: 0.9, color: '#7a6a3a', max: 1.0 }, sign: { ht: 2.4, color: '#3a4a6a', emissive: '#7db8ff', max: 1.1 }, plant: { ht: 1.4, color: '#3a6a3a', max: 1.1 },
  vendor: { ht: 1.1, color: '#caa24b', emissive: '#ffcf5c', max: 1.4 }, terminal: { ht: 1.3, color: '#2a4a6a', emissive: '#3aa0ff', max: 1.2 },
  default: { ht: 1.1, color: '#5a5a6a', max: 1.3 },
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
    // World footprint = grid span, but CAPPED to the prop's real size so a coarse district grid
    // doesn't inflate small props into giant slabs. min() never enlarges fine-grid interiors.
    const cap = def.max || 1.3;
    out.push({
      id: f.id || `furn_${i}`, type: f.type,
      wx: wpos.x, wz: wpos.z,
      wlen: Math.max(0.5, Math.min(sw * cellPct * sim.scale * 0.9, cap)),
      dlen: Math.max(0.5, Math.min(sh * cellPct * sim.scale * 0.9, cap)),
      ht: def.ht, color: def.color, emissive: def.emissive || null,
      rot: (f.rotation || 0) * Math.PI / 180,
    });
  });
  return out;
}

// glTF-kit prop keys (rendered instanced by SubmapProps); everything else is a composed-primitive
// builder. Kept here so buildSubmapProps stays a pure data function (no three/JSX import).
const GLB_PROP_KEYS = new Set(['crate', 'barrel', 'container', 'pipe', 'rock', 'crystal']);
const EMPTY_PROP_RULES = { map: {}, zone: {}, scatter: [] };

/**
 * Themed furniture/props for a submap (Phase 2) — the lively replacement for the bare boxes.
 * Pure: returns `{ themed, boxes }` (no rendering), so it's unit-testable.
 *   - `themed`: { id, semantic, wx, wz, rot } — a themed prop (composed builder or glTF kit).
 *   - `boxes`:  the old typed-box items, for any furniture a theme doesn't map (e.g. a home's bed).
 * Sources (all via `theme.props`):
 *   1. existing furniture/decorations/interactiveElements → themed if `map[type]`, else a box.
 *   2. zone/building-derived: a themed prop per matching building `type` (`zone[type]`) — this is
 *      what furnishes the otherwise-empty clinic/market that emit no furniture[] of their own.
 *   3. `scatter`: a few props on walkable EDGE cells (industrial pipes, ruin rubble).
 */
export function buildSubmapProps(subMap, sim, theme) {
  if (!sim) return { themed: [], boxes: [] };
  const d = layoutOf(subMap);
  const { w, h } = submapCoordDims(subMap);
  const rules = (theme && theme.props) || EMPTY_PROP_RULES;
  const map = rules.map || {}, zone = rules.zone || {}, scatter = rules.scatter || [];
  const cellPct = 100 / w;
  const themed = [], boxes = [];

  // 1. furniture / decorations / interactive elements
  const items = [...(d.furniture || []), ...(d.decorations || []), ...(d.interactiveElements || [])];
  items.forEach((f, i) => {
    const pos = f.position;
    if (!pos || !Number.isFinite(pos.x)) return;
    const sw = (f.size && f.size.width) || 1, sh = (f.size && f.size.height) || 1;
    const cx = ((pos.x + sw / 2) / w) * 100, cy = ((pos.y + sh / 2) / h) * 100;
    const wpos = sim.surfaceToWorld(cx, cy);
    const rot = (f.rotation || 0) * Math.PI / 180;
    const semantic = map[String(f.type || '').toLowerCase()];
    if (semantic) {
      themed.push({ id: f.id || `fp_${i}`, semantic, wx: wpos.x, wz: wpos.z, rot });
    } else {
      const def = FURN[f.type] || FURN.default;
      const cap = def.max || 1.3;
      boxes.push({
        id: f.id || `fb_${i}`, type: f.type, wx: wpos.x, wz: wpos.z,
        wlen: Math.max(0.5, Math.min(sw * cellPct * sim.scale * 0.9, cap)),
        dlen: Math.max(0.5, Math.min(sh * cellPct * sim.scale * 0.9, cap)),
        ht: def.ht, color: def.color, emissive: def.emissive || null, rot,
      });
    }
  });

  // 2. zone/building-derived themed props (furnish bare clinics/markets, additive to the structure)
  for (const b of (d.buildings || [])) {
    const pos = b.position || b;
    if (!pos || !Number.isFinite(pos.x)) continue;
    const rule = zone[String(b.type || '').toLowerCase()];
    if (!rule) continue;
    const sw = (b.size && b.size.width) || 1, sh = (b.size && b.size.height) || 1;
    const cx = ((pos.x + sw / 2) / w) * 100, cy = ((pos.y + sh / 2) / h) * 100;
    const wpos = sim.surfaceToWorld(cx, cy);
    const list = Array.isArray(rule) ? rule : [rule];
    list.forEach((sem, k) => {
      // first prop centred in the room; extras ringed around it so they don't z-fight.
      const ang = k * 2.2, off = k === 0 ? 0 : 1.0;
      themed.push({ id: `${b.id || b.type}_zp_${k}`, semantic: sem, wx: wpos.x + Math.cos(ang) * off, wz: wpos.z + Math.sin(ang) * off, rot: ang });
    });
  }

  // 3. scatter props on a few walkable EDGE cells (kept off the central walkways/spawn)
  if (scatter.length) {
    let placed = 0;
    for (let gy = 2; gy < h - 1 && placed < 8; gy += 2) {
      for (let gx = 2; gx < w - 1 && placed < 8; gx += 2) {
        const cx = ((gx + 0.5) / w) * 100, cy = ((gy + 0.5) / h) * 100;
        if (Math.abs(cx - 50) < 18 && Math.abs(cy - 50) < 18) continue; // leave the centre clear
        if (!sim.isWalkableSurface(cx, cy)) continue;
        const sem = scatter[(gx * 7 + gy) % scatter.length];
        const wpos = sim.surfaceToWorld(cx, cy);
        themed.push({ id: `sc_${gx}_${gy}`, semantic: sem, wx: wpos.x, wz: wpos.z, rot: ((gx + gy) % 4) * Math.PI / 2 });
        placed++;
      }
    }
  }

  return { themed, boxes };
}

/** Which prop keys render as instanced glTF kit models (vs composed primitives). */
export const isGlbProp = (semantic) => GLB_PROP_KEYS.has(semantic);

/**
 * Diegetic wayfinding signs (submap-liveliness Phase 5) from the layout's NAMED ZONES — the areas
 * ("Reception Area", "Treatment Wing", "Hangar Bay", "Market Floor") that today have no in-world
 * label at all (buildings/POIs already float their own names; zones don't). Returns world-positioned
 * sign anchors; SubmapSign renders the physical panel + text. Pure + testable.
 *
 * Placed at the zone centre, raised by the sign mesh. Skips unnamed zones, dedupes by name, skips
 * map-spanning zones (>55% area — those are "the whole floor", not a wayfinding sub-area), caps at 12.
 */
export function buildSubmapSignage(subMap, sim, theme) { // theme reserved for future per-type styling
  if (!sim) return [];
  const d = layoutOf(subMap);
  const { w, h } = submapCoordDims(subMap);
  const area = Math.max(1, w * h);
  const out = [];
  const seen = new Set();
  for (const z of (d.zones || [])) {
    const name = z && z.name;
    const b = z && z.bounds;
    if (!name || !b || !Number.isFinite(b.x)) continue;
    const key = String(name).toLowerCase();
    if (seen.has(key)) continue;
    if (((b.width || 1) * (b.height || 1)) / area > 0.55) continue; // skip whole-floor zones
    seen.add(key);
    const cx = ((b.x + (b.width || 1) / 2) / w) * 100;
    const cy = ((b.y + (b.height || 1) / 2) / h) * 100;
    const wpos = sim.surfaceToWorld(cx, cy);
    out.push({ id: z.id || `sign_${out.length}`, label: name, wx: wpos.x, wz: wpos.z });
    if (out.length >= 12) break;
  }
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
