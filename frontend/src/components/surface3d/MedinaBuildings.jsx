/**
 * MedinaBuildings — draws the dense, maze-like medina that the urban tile-map generator lays out.
 *
 * Urban planets fill `mapData.tileMap` with `building` tiles (the impassable maze walls) carved by
 * narrow alleys, plus `stall` tiles in the souk plazas. Each building tile carries a `height`
 * (storeys) and `style`, written by generateUrbanTileMap, so here we draw one box per building tile
 * — adjacent same-height tiles read as a single flat-roofed building, and the height steps between
 * blocks give the crowded, varied-rooftop silhouette of a Fez/Tangier medina.
 *
 * Everything is instanced (a couple of draw calls for the whole city). Only tiles tagged with a
 * `height` are drawn, so natural planets (whose few POI `building` tiles have no height) are left to
 * their POI structures — this component simply renders nothing there.
 */

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { STORY } from '../../../../shared/sim/surface.mjs'; // world units per storey (shared w/ the sim's roof Y)
import { useAtmosphere } from './atmosphere/AtmosphereContext';

// Sandy / sun-baked medina palette, indexed by tile.style (0..4). (Fallback when a tile has no use.)
const PALETTE = ['#cdbb9a', '#c7a079', '#b9a98c', '#d8c6a8', '#a98c6f'].map((c) => new THREE.Color(c));
const STALL_AWNINGS = ['#b5483b', '#3b6db5', '#37915a', '#c79a3a'].map((c) => new THREE.Color(c));
const STAIR_COLOR = new THREE.Color('#b9b2a2'); // pale stone stairwell, distinct from buildings

// Per building-use looks: a base wall colour, a night-glow hue, and (for storefronts) an awning
// fabric — so the city reads as varied apartments / shops / markets / bars / etc.
const CAT_WALL = {
  apartment: '#cdbb9a', shop: '#c79a63', market: '#cbb083', bar: '#6f6486',
  restaurant: '#bd8f6e', civic: '#b7bcc4', warehouse: '#9a9488',
};
const CAT_GLOW = {
  apartment: '#ffcf9e', shop: '#ffd27a', market: '#9dffd0', bar: '#6af0ff',
  restaurant: '#ff9e6a', civic: '#bfe0ff', warehouse: '#7fc0b0',
};
const CAT_AWNING = { shop: '#c0563f', market: '#3f7bb5', restaurant: '#37915a', bar: '#8a3fb5' };
const COMMERCIAL = new Set(['shop', 'market', 'restaurant', 'bar']);
const toColorMap = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, new THREE.Color(v)]));
const CAT_WALL_C = toColorMap(CAT_WALL), CAT_GLOW_C = toColorMap(CAT_GLOW), CAT_AWNING_C = toColorMap(CAT_AWNING);
const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Urban (medina) is a CYBERPUNK city: grey concrete/steel/gunmetal by day, vivid neon signage by
// night. Its own per-use palette (not the warm sandy one) keeps building-type variety in cool tones.
const CYBER_WALL = {
  apartment: '#474b54', shop: '#595d66', market: '#54585f', bar: '#3c3947',
  restaurant: '#52505b', civic: '#6b7079', warehouse: '#44474d',
};
const CYBER_GLOW = {
  apartment: '#7fd4ff', shop: '#ff5ee0', market: '#4dffe6', bar: '#ff3d96',
  restaurant: '#ff9a4d', civic: '#ab9cff', warehouse: '#4dffd8',
};
const CYBER_WALL_C = toColorMap(CYBER_WALL), CYBER_GLOW_C = toColorMap(CYBER_GLOW);

// Walkable "paving" so the navigable ground is obvious in EVERY biome — fixes the ocean case where
// the navy water-coloured ground read as water. A thin coloured deck/road on each street/plaza tile,
// clearly distinct from impassable terrain (water/rock) and from the buildings.
const BIOME_PAVING = { medina: '#26282d', outpost: '#c2a878', hamlet: '#6a5236', docks: '#6b6960', dome_colony: '#b9c6d2', mining_camp: '#3e3833', scrap_town: '#6f6354' };
const PAVING_MAT = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 });

// Per-biome look, keyed on tileMap.style (set by the settlement generators). The per-use wall/glow
// colours are blended toward the biome's base so each world reads distinctly — sandstone outpost,
// timber hamlet, weathered docks, frosted ice colony, basalt+ember mining camp, rusty scrap town.
// (medina has its own cyberpunk palette above, applied directly.)
const BIOME_BASE = { medina: '#c7ab86', outpost: '#d3ba8a', hamlet: '#6e5a3e', docks: '#6e8088', dome_colony: '#e2ebf2', mining_camp: '#3c352f', scrap_town: '#7a6a52' };
const BIOME_GLOW = { medina: '#ffcf9e', outpost: '#ffd9a0', hamlet: '#ffd09a', docks: '#7fe6ff', dome_colony: '#bfe8ff', mining_camp: '#ff6a2e', scrap_town: '#ffc066' };
const BIOME_FILL = { medina: ['#6ad0ff', '#c07aff'], outpost: ['#bcd2ff', '#ffcf9e'], hamlet: ['#9fc0e0', '#caa46e'], docks: ['#8fd0ff', '#6fb0c0'], dome_colony: ['#cfe6ff', '#9fc4e8'], mining_camp: ['#ff8a5a', '#ff5a2e'], scrap_town: ['#bdb0d0', '#caa46e'] };
const BIOME_STRENGTH = 0.62; // how strongly the biome base overrides the per-use wall colour

// Unit box with its base at y=0 (so an instance's Y scale grows upward from the ground).
const BOX = new THREE.BoxGeometry(1, 1, 1); BOX.translate(0, 0.5, 0);
const BLDG_MAT = new THREE.MeshStandardMaterial({ roughness: 0.96, metalness: 0 });
const STALL_MAT = new THREE.MeshStandardMaterial({ color: '#6b4a2f', roughness: 0.9 });
const AWNING_MAT = new THREE.MeshStandardMaterial({ roughness: 0.7 });
const SHOP_AWNING_MAT = new THREE.MeshStandardMaterial({ roughness: 0.65 }); // storefront awnings (per-instance colour)
// Bright marker capping each stairwell — signals a climbable rooftop access point.
const STAIR_CAP_MAT = new THREE.MeshStandardMaterial({ color: '#1a3a36', emissive: '#39e0c8', emissiveIntensity: 0.9, roughness: 0.5 });

// Per-biome ROOF geometry (one per building block) so the skyline silhouette differs by world:
// ice = frosted domes, forest = pitched timber roofs, cyber-medina = rooftop tech units, mining =
// smokestacks. Other biomes keep flat box-tops. Geometries have their base at y=0 (scaled per block).
const DOME_GEO = new THREE.SphereGeometry(0.5, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2); // top hemisphere
const PITCH_GEO = new THREE.ConeGeometry(0.66, 1, 4); PITCH_GEO.rotateY(Math.PI / 4); PITCH_GEO.translate(0, 0.5, 0); // square pyramid
const STACK_GEO = new THREE.CylinderGeometry(0.5, 0.6, 1, 8); STACK_GEO.translate(0, 0.5, 0); // smokestack
const DOME_MAT = new THREE.MeshStandardMaterial({ color: '#e2edf6', roughness: 0.35, metalness: 0.1 });
const PITCH_MAT = new THREE.MeshStandardMaterial({ color: '#7c4536', roughness: 0.85 }); // terracotta/timber
const STACK_MAT = new THREE.MeshStandardMaterial({ color: '#2f2a26', roughness: 0.9 });
// Rooftop bridge decks (cyber-medina) — gunmetal span with a neon edge that glows at night.
const BRIDGE_MAT = new THREE.MeshStandardMaterial({ color: '#3a3e45', roughness: 0.7, metalness: 0.3 });
const BRIDGE_GLOW = new THREE.Color('#4dffe6');

// Night city-glow: each building gets a low, street-level skirt of soft self-lit colour, varied
// per building (iridescent) — shopfronts/lanterns lining the alleys. Additive + toneMapped:false so
// it pushes past the bloom threshold and reads as glow after dark. Opacity ramps with nightFactor.
const GLOW_PALETTE = ['#ffcf9e', '#8fe6ff', '#c7a6ff', '#9dffd0', '#ff9ec4', '#bfe0ff', '#ffe79a'].map((c) => new THREE.Color(c));
const GLOW_MAT = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
const hashTile = (x, y) => { let h = (x * 73856093) ^ (y * 19349663); return ((h ^ (h >>> 13)) >>> 0); };

// Instanced geometry with optional per-instance color. `items`: {x,z,w,d,h,color?,y?}.
function InstancedBoxes({ geometry = BOX, material, items, cast = true }) {
  const ref = useRef();
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const d = new THREE.Object3D();
    items.forEach((it, i) => {
      d.position.set(it.x, it.y || 0, it.z);
      d.scale.set(it.w, it.h, it.d ?? it.w);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
      if (it.color && mesh.setColorAt) mesh.setColorAt(i, it.color);
    });
    mesh.count = items.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items, geometry]);
  return (
    <instancedMesh ref={ref} args={[geometry, material, Math.max(1, items.length)]} castShadow={cast} receiveShadow frustumCulled={false} />
  );
}

function buildMedina(planet, worldHalf) {
  const tm = planet && planet.mapData && planet.mapData.tileMap;
  if (!tm || !Array.isArray(tm.tiles) || !tm.tiles.length) return null;
  const tileSize = tm.tileSize || 2;
  const scale = worldHalf / 50;
  const tileW = tileSize * scale;
  const s2w = (sx, sy) => [(sx - 50) * scale, (sy - 50) * scale];

  // Biome-tinted per-use palettes (computed once for this planet's settlement style).
  const biome = tm.style || 'medina';
  let wallFor, glowFor;
  if (biome === 'medina') {
    wallFor = CYBER_WALL_C; glowFor = CYBER_GLOW_C; // grey-cyberpunk city + neon signage
  } else {
    const baseC = new THREE.Color(BIOME_BASE[biome] || BIOME_BASE.medina);
    const glowC = new THREE.Color(BIOME_GLOW[biome] || BIOME_GLOW.medina);
    wallFor = {}; glowFor = {};
    for (const cat of Object.keys(CAT_WALL_C)) {
      const w = CAT_WALL_C[cat].clone(); w.lerp(baseC, BIOME_STRENGTH); wallFor[cat] = w;
      const g = CAT_GLOW_C[cat].clone(); g.lerp(glowC, 0.55); glowFor[cat] = g;
    }
  }
  const fill = BIOME_FILL[biome] || BIOME_FILL.medina;
  // Paving shades (a little variation so the floor isn't a flat sheet).
  const pavingBase = new THREE.Color(BIOME_PAVING[biome] || '#3a3a3a');
  const pavingShades = [pavingBase, pavingBase.clone().multiplyScalar(1.07), pavingBase.clone().multiplyScalar(0.93)];

  const buildings = [], stallBases = [], awnings = [], stairs = [], stairCaps = [], glow = [], shopAwnings = [], paving = [], bridges = [];
  const blocks = new Map(); // blockId -> { minx,maxx,miny,maxy,h } for per-block roofs
  for (let ty = 0; ty < tm.tiles.length; ty++) {
    const row = tm.tiles[ty];
    if (!row) continue;
    for (let tx = 0; tx < row.length; tx++) {
      const t = row[tx];
      if (!t) continue;
      const [wx, wz] = s2w((tx + 0.5) * tileSize, (ty + 0.5) * tileSize);
      if (t.type === 'building' && t.height) {
        const cat = t.category || 'apartment';
        buildings.push({ x: wx, z: wz, w: tileW * 0.995, h: t.height * STORY, color: wallFor[cat] || PALETTE[(t.style || 0) % PALETTE.length] });
        // accumulate this tile into its building block (for one roof per block)
        const bId = t.block != null ? t.block : ty * 1000 + tx;
        const bb = blocks.get(bId);
        if (!bb) blocks.set(bId, { minx: tx, maxx: tx, miny: ty, maxy: ty, h: t.height });
        else { if (tx < bb.minx) bb.minx = tx; if (tx > bb.maxx) bb.maxx = tx; if (ty < bb.miny) bb.miny = ty; if (ty > bb.maxy) bb.maxy = ty; if (t.height > bb.h) bb.h = t.height; }
        // Street-level glow skirt (use + biome tinted), slightly oversized so it spills into the alleys.
        glow.push({ x: wx, z: wz, w: tileW * 1.05, d: tileW * 1.05, h: Math.min(t.height * STORY, 2.2), color: glowFor[cat] || GLOW_PALETTE[hashTile(tx, ty) % GLOW_PALETTE.length] });
        // Storefront awnings: a fabric ledge over each alley-facing facade of a commercial building.
        if (COMMERCIAL.has(cat)) {
          const awnColor = CAT_AWNING_C[cat];
          for (const [dx, dy] of DIRS4) {
            const n = row[tx] && tm.tiles[ty + dy] && tm.tiles[ty + dy][tx + dx];
            if (n && n.walkable) {
              const depth = tileW * 0.4, along = tileW * 0.92;
              shopAwnings.push({
                x: wx + dx * tileW * 0.5, z: wz + dy * tileW * 0.5,
                w: dx ? depth : along, d: dy ? depth : along, h: 0.16, y: 2.3, color: awnColor,
              });
            }
          }
        }
      } else if (t.type === 'stair') {
        // An oriented flight of steps rising toward the roof it serves (distinct stone), capped by a
        // glowing marker. The street-side stays low so you can step onto it; the sim handles the
        // ground↔roof transition and the player's Y lerps up the climb.
        const h = (t.height || 1) * STORY;
        let rdx = 0, rdz = 0; // direction toward the building roof this stair connects to
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nn = tm.tiles[ty + dy] && tm.tiles[ty + dy][tx + dx];
          if (nn && nn.type === 'building') { rdx = dx; rdz = dy; break; }
        }
        const STEPS = 4;
        for (let k = 0; k < STEPS; k++) {
          const frac = (k + 0.5) / STEPS;           // 0..1 across the tile toward the roof
          const depth = tileW / STEPS;
          stairs.push({
            x: wx + rdx * (frac - 0.5) * tileW,
            z: wz + rdz * (frac - 0.5) * tileW,
            w: rdx ? depth : tileW * 0.82,
            d: rdz ? depth : tileW * 0.82,
            h: h * (k + 1) / STEPS,                  // each step a bit taller → a staircase
            color: STAIR_COLOR,
          });
        }
        stairCaps.push({ x: wx + rdx * tileW * 0.4, z: wz + rdz * tileW * 0.4, w: tileW * 0.42, d: tileW * 0.42, h: 0.35, y: h });
      } else if (t.type === 'stall') {
        const sw = tileW * 0.7;
        stallBases.push({ x: wx, z: wz, w: sw, d: sw, h: 1.1 });
        awnings.push({ x: wx, z: wz, w: tileW * 0.92, d: tileW * 0.92, h: 0.18, y: 1.25, color: STALL_AWNINGS[(t.stallStyle || 0) % STALL_AWNINGS.length] });
      } else if (t.type === 'bridge') {
        // Pave the alley underneath (you walk under) + a roof-height deck you cross, with a neon edge.
        paving.push({ x: wx, z: wz, w: tileW, d: tileW, h: 0.05, y: 0.02, color: pavingShades[hashTile(tx, ty) % 3] });
        const by = (t.height || 1) * STORY;
        bridges.push({ x: wx, z: wz, w: tileW, d: tileW, h: 0.22, y: by - 0.22 });
        glow.push({ x: wx, z: wz, w: tileW * 1.08, d: tileW * 1.08, h: 0.3, y: by - 0.16, color: BRIDGE_GLOW });
      } else if (t.walkable && (t.type === 'street' || t.type === 'plaza')) {
        // Pave the navigable floor so it's unmistakably walkable (a road/deck), not terrain/water.
        paving.push({ x: wx, z: wz, w: tileW, d: tileW, h: 0.05, y: 0.02, color: pavingShades[hashTile(tx, ty) % 3] });
      }
    }
  }
  // Per-biome roofs — one shaped cap per building block.
  const roofDomes = [], roofPitch = [], roofStacks = [];
  for (const bb of blocks.values()) {
    const ctx = (bb.minx + bb.maxx + 1) / 2, cty = (bb.miny + bb.maxy + 1) / 2;
    const [cx, cz] = s2w(ctx * tileSize, cty * tileSize);
    const bw = (bb.maxx - bb.minx + 1) * tileW, bd = (bb.maxy - bb.miny + 1) * tileW;
    const roofY = bb.h * STORY;
    if (biome === 'dome_colony') {
      roofDomes.push({ x: cx, y: roofY - 0.05, z: cz, w: bw * 0.98, h: Math.min(bw, bd) * 0.42, d: bd * 0.98 });
    } else if (biome === 'hamlet') {
      roofPitch.push({ x: cx, y: roofY - 0.05, z: cz, w: bw * 1.04, h: Math.min(bw, bd) * 0.55, d: bd * 1.04 });
    } else if (biome === 'mining_camp') {
      roofStacks.push({ x: cx + bw * 0.2, y: roofY, z: cz + bd * 0.2, w: tileW * 0.4, h: STORY * 1.2, d: tileW * 0.4 });
    }
    // medina roofs are WALKABLE (stairs) — left flat/clean so the player isn't clipping rooftop props.
  }

  if (!buildings.length && !stallBases.length && !stairs.length) return null;
  const glowOpacity = biome === 'medina' ? 1.0 : 0.8; // medina = punchier neon
  return { buildings, stallBases, awnings, stairs, stairCaps, glow, shopAwnings, paving, bridges, glowOpacity, roofDomes, roofPitch, roofStacks, fillSky: fill[0], fillGround: fill[1] };
}

export default function MedinaBuildings({ planet, worldHalf }) {
  const data = useMemo(() => buildMedina(planet, worldHalf), [planet, worldHalf]);
  const atmo = useAtmosphere();
  const fillRef = useRef();
  // Ramp the building glow + a soft fill light with nightfall (read from the shared atmosphere ref,
  // no re-render). By day both are off, so the medina looks normal; after dusk the city lights up.
  useFrame(() => {
    const night = (atmo && atmo.current && atmo.current.nightFactor) || 0;
    GLOW_MAT.opacity = night * ((data && data.glowOpacity) || 0.85);
    if (fillRef.current) fillRef.current.intensity = 0.12 + night * 0.95; // keep streets readable day & night
  });
  if (!data) return null;
  return (
    <>
      {/* Paved navigable floor — drawn first so everything else sits on it. */}
      {data.paving.length > 0 && <InstancedBoxes material={PAVING_MAT} items={data.paving} cast={false} />}
      {data.buildings.length > 0 && <InstancedBoxes material={BLDG_MAT} items={data.buildings} />}
      {/* Per-biome roof silhouettes (one per block). */}
      {data.roofDomes.length > 0 && <InstancedBoxes geometry={DOME_GEO} material={DOME_MAT} items={data.roofDomes} />}
      {data.roofPitch.length > 0 && <InstancedBoxes geometry={PITCH_GEO} material={PITCH_MAT} items={data.roofPitch} />}
      {data.roofStacks.length > 0 && <InstancedBoxes geometry={STACK_GEO} material={STACK_MAT} items={data.roofStacks} />}
      {data.stairs.length > 0 && <InstancedBoxes material={BLDG_MAT} items={data.stairs} />}
      {data.stairCaps.length > 0 && <InstancedBoxes material={STAIR_CAP_MAT} items={data.stairCaps} cast={false} />}
      {data.bridges.length > 0 && <InstancedBoxes material={BRIDGE_MAT} items={data.bridges} />}
      {data.stallBases.length > 0 && <InstancedBoxes material={STALL_MAT} items={data.stallBases} />}
      {data.awnings.length > 0 && <InstancedBoxes material={AWNING_MAT} items={data.awnings} cast={false} />}
      {data.shopAwnings.length > 0 && <InstancedBoxes material={SHOP_AWNING_MAT} items={data.shopAwnings} cast={false} />}
      {/* Iridescent night glow lining the alleys (additive, blooms after dusk). */}
      {data.glow.length > 0 && <InstancedBoxes material={GLOW_MAT} items={data.glow} cast={false} />}
      {/* Low biome-tinted fill so streets aren't pitch-black at night (ember on volcanic, cold on
          ice, etc.). Renders only where there's a settlement. */}
      <hemisphereLight ref={fillRef} args={[data.fillSky, data.fillGround, 0]} />
    </>
  );
}
