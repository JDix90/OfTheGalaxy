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
import * as THREE from 'three';

const STORY = 2.4; // world units per storey
// Sandy / sun-baked medina palette, indexed by tile.style (0..4).
const PALETTE = ['#cdbb9a', '#c7a079', '#b9a98c', '#d8c6a8', '#a98c6f'].map((c) => new THREE.Color(c));
const STALL_AWNINGS = ['#b5483b', '#3b6db5', '#37915a', '#c79a3a'].map((c) => new THREE.Color(c));

// Unit box with its base at y=0 (so an instance's Y scale grows upward from the ground).
const BOX = new THREE.BoxGeometry(1, 1, 1); BOX.translate(0, 0.5, 0);
const BLDG_MAT = new THREE.MeshStandardMaterial({ roughness: 0.96, metalness: 0 });
const STALL_MAT = new THREE.MeshStandardMaterial({ color: '#6b4a2f', roughness: 0.9 });
const AWNING_MAT = new THREE.MeshStandardMaterial({ roughness: 0.7 });

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

  const buildings = [], stallBases = [], awnings = [];
  for (let ty = 0; ty < tm.tiles.length; ty++) {
    const row = tm.tiles[ty];
    if (!row) continue;
    for (let tx = 0; tx < row.length; tx++) {
      const t = row[tx];
      if (!t) continue;
      const [wx, wz] = s2w((tx + 0.5) * tileSize, (ty + 0.5) * tileSize);
      if (t.type === 'building' && t.height) {
        buildings.push({ x: wx, z: wz, w: tileW * 0.995, h: t.height * STORY, color: PALETTE[(t.style || 0) % PALETTE.length] });
      } else if (t.type === 'stall') {
        const sw = tileW * 0.7;
        stallBases.push({ x: wx, z: wz, w: sw, d: sw, h: 1.1 });
        awnings.push({ x: wx, z: wz, w: tileW * 0.92, d: tileW * 0.92, h: 0.18, y: 1.25, color: STALL_AWNINGS[(t.stallStyle || 0) % STALL_AWNINGS.length] });
      }
    }
  }
  if (!buildings.length && !stallBases.length) return null;
  return { buildings, stallBases, awnings };
}

export default function MedinaBuildings({ planet, worldHalf }) {
  const data = useMemo(() => buildMedina(planet, worldHalf), [planet, worldHalf]);
  if (!data) return null;
  return (
    <>
      {data.buildings.length > 0 && <InstancedBoxes material={BLDG_MAT} items={data.buildings} />}
      {data.stallBases.length > 0 && <InstancedBoxes material={STALL_MAT} items={data.stallBases} />}
      {data.awnings.length > 0 && <InstancedBoxes material={AWNING_MAT} items={data.awnings} cast={false} />}
    </>
  );
}
