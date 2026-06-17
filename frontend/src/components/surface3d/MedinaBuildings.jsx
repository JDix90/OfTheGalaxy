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

// Unit box with its base at y=0 (so an instance's Y scale grows upward from the ground).
const BOX = new THREE.BoxGeometry(1, 1, 1); BOX.translate(0, 0.5, 0);
const BLDG_MAT = new THREE.MeshStandardMaterial({ roughness: 0.96, metalness: 0 });
const STALL_MAT = new THREE.MeshStandardMaterial({ color: '#6b4a2f', roughness: 0.9 });
const AWNING_MAT = new THREE.MeshStandardMaterial({ roughness: 0.7 });
const SHOP_AWNING_MAT = new THREE.MeshStandardMaterial({ roughness: 0.65 }); // storefront awnings (per-instance colour)
// Bright marker capping each stairwell — signals a climbable rooftop access point.
const STAIR_CAP_MAT = new THREE.MeshStandardMaterial({ color: '#1a3a36', emissive: '#39e0c8', emissiveIntensity: 0.9, roughness: 0.5 });

// Night city-glow: each building gets a low, street-level skirt of soft self-lit colour, varied
// per building (iridescent) — shopfronts/lanterns lining the alleys. Additive + toneMapped:false so
// it pushes past the bloom threshold and reads as glow after dark. Opacity ramps with nightFactor.
const GLOW_PALETTE = ['#ffcf9e', '#8fe6ff', '#c7a6ff', '#9dffd0', '#ff9ec4', '#bfe0ff', '#ffe79a'].map((c) => new THREE.Color(c));
const GLOW_MAT = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
const hashTile = (x, y) => { let h = (x * 73856093) ^ (y * 19349663); return ((h ^ (h >>> 13)) >>> 0); };

// Instanced boxes with optional per-instance color. `items`: {x,z,w,d,h,color?,y?}.
function InstancedBoxes({ material, items, cast = true }) {
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
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[BOX, material, Math.max(1, items.length)]} castShadow={cast} receiveShadow frustumCulled={false} />
  );
}

function buildMedina(planet, worldHalf) {
  const tm = planet && planet.mapData && planet.mapData.tileMap;
  if (!tm || !Array.isArray(tm.tiles) || !tm.tiles.length) return null;
  const tileSize = tm.tileSize || 2;
  const scale = worldHalf / 50;
  const tileW = tileSize * scale;
  const s2w = (sx, sy) => [(sx - 50) * scale, (sy - 50) * scale];

  const buildings = [], stallBases = [], awnings = [], stairs = [], stairCaps = [], glow = [], shopAwnings = [];
  for (let ty = 0; ty < tm.tiles.length; ty++) {
    const row = tm.tiles[ty];
    if (!row) continue;
    for (let tx = 0; tx < row.length; tx++) {
      const t = row[tx];
      if (!t) continue;
      const [wx, wz] = s2w((tx + 0.5) * tileSize, (ty + 0.5) * tileSize);
      if (t.type === 'building' && t.height) {
        const cat = t.category || 'apartment';
        buildings.push({ x: wx, z: wz, w: tileW * 0.995, h: t.height * STORY, color: CAT_WALL_C[cat] || PALETTE[(t.style || 0) % PALETTE.length] });
        // Street-level glow skirt (use-tinted), slightly oversized so it spills into the alleys.
        glow.push({ x: wx, z: wz, w: tileW * 1.05, d: tileW * 1.05, h: Math.min(t.height * STORY, 2.2), color: CAT_GLOW_C[cat] || GLOW_PALETTE[hashTile(tx, ty) % GLOW_PALETTE.length] });
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
      }
    }
  }
  if (!buildings.length && !stallBases.length && !stairs.length) return null;
  return { buildings, stallBases, awnings, stairs, stairCaps, glow, shopAwnings };
}

export default function MedinaBuildings({ planet, worldHalf }) {
  const data = useMemo(() => buildMedina(planet, worldHalf), [planet, worldHalf]);
  const atmo = useAtmosphere();
  const fillRef = useRef();
  // Ramp the building glow + a soft fill light with nightfall (read from the shared atmosphere ref,
  // no re-render). By day both are off, so the medina looks normal; after dusk the city lights up.
  useFrame(() => {
    const night = (atmo && atmo.current && atmo.current.nightFactor) || 0;
    GLOW_MAT.opacity = night * 0.85;
    if (fillRef.current) fillRef.current.intensity = night * 0.5;
  });
  if (!data) return null;
  return (
    <>
      {data.buildings.length > 0 && <InstancedBoxes material={BLDG_MAT} items={data.buildings} />}
      {data.stairs.length > 0 && <InstancedBoxes material={BLDG_MAT} items={data.stairs} />}
      {data.stairCaps.length > 0 && <InstancedBoxes material={STAIR_CAP_MAT} items={data.stairCaps} cast={false} />}
      {data.stallBases.length > 0 && <InstancedBoxes material={STALL_MAT} items={data.stallBases} />}
      {data.awnings.length > 0 && <InstancedBoxes material={AWNING_MAT} items={data.awnings} cast={false} />}
      {data.shopAwnings.length > 0 && <InstancedBoxes material={SHOP_AWNING_MAT} items={data.shopAwnings} cast={false} />}
      {/* Iridescent night glow lining the alleys (additive, blooms after dusk). */}
      {data.glow.length > 0 && <InstancedBoxes material={GLOW_MAT} items={data.glow} cast={false} />}
      {/* Low cool/warm fill so alleys aren't pitch-black at night — medina-only (this whole
          component renders nothing on non-urban planets). */}
      <hemisphereLight ref={fillRef} args={['#a9c8ff', '#ffb583', 0]} />
    </>
  );
}
