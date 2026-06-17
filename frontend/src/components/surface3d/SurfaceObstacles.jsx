/**
 * SurfaceObstacles — renders the planet's impassable terrain tiles as real 3D geometry so the
 * collision the player feels has something VISIBLE behind it.
 *
 * The surface sim (shared/sim/surface.mjs) blocks movement on `mapData.tileMap` tiles flagged
 * `walkable:false` (rock, tree, canyon, lava_flow, water, building). Until now the 3D surface
 * drew only a flat Ground plane, so those blocked tiles were invisible walls on open-looking
 * ground. Here we draw each natural obstacle as an instanced low-poly prop placed on the SAME
 * tile centre the collision uses, so what you bump into is what you see.
 *
 * `building` tiles are skipped — those cluster around POIs that already render as <PoiStructure>.
 * Everything is instanced (a few draw calls total) and derived deterministically from tile
 * coords, so the layout is stable across renders.
 */

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

// Shared geometries/materials (built once). Base sits at y=0 where it matters (trees), so an
// instance's Y position puts the prop's foot on the ground.
const ROCK_GEOM = new THREE.DodecahedronGeometry(1, 0);
const ROCK_MAT = new THREE.MeshStandardMaterial({ color: '#6e6b66', roughness: 0.97, metalness: 0.02, flatShading: true });

const TRUNK_GEOM = new THREE.CylinderGeometry(0.16, 0.22, 1, 6); TRUNK_GEOM.translate(0, 0.5, 0);
const TRUNK_MAT = new THREE.MeshStandardMaterial({ color: '#5b4630', roughness: 0.9 });
const FOLIAGE_GEOM = new THREE.ConeGeometry(1, 1, 7); FOLIAGE_GEOM.translate(0, 0.5, 0);
const FOLIAGE_MAT = new THREE.MeshStandardMaterial({ color: '#3f6b3a', roughness: 0.85, flatShading: true });

const FLAT_GEOM = new THREE.PlaneGeometry(1, 1); FLAT_GEOM.rotateX(-Math.PI / 2);
const WATER_MAT = new THREE.MeshStandardMaterial({ color: '#2f6fb0', roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.82 });
const LAVA_MAT = new THREE.MeshStandardMaterial({ color: '#6a1a0a', emissive: '#ff5a1e', emissiveIntensity: 1.3, roughness: 0.6 });
// Volcanic vents read as glowing rock mounds; crevasses/craters as dark recessed patches.
const VENT_MAT = new THREE.MeshStandardMaterial({ color: '#2a1410', emissive: '#ff6a1e', emissiveIntensity: 1.1, roughness: 0.8, flatShading: true });
const PIT_MAT = new THREE.MeshStandardMaterial({ color: '#15110e', roughness: 1, metalness: 0 });

// Small instanced-mesh helper: `items` carry position + per-axis scale + Y-rotation.
function InstancedProps({ geometry, material, items, cast = true }) {
  const ref = useRef();
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const d = new THREE.Object3D();
    items.forEach((it, i) => {
      d.position.set(it.x, it.y || 0, it.z);
      d.rotation.set(0, it.ry || 0, 0);
      d.scale.set(it.sx, it.sy, it.sz);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
    });
    mesh.count = items.length;
    mesh.instanceMatrix.needsUpdate = true;
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[geometry, material, Math.max(1, items.length)]} castShadow={cast} receiveShadow frustumCulled={false} />
  );
}

// Cheap deterministic hash from tile coords → stable per-tile jitter/size.
function hashTile(x, y) { let h = (x * 73856093) ^ (y * 19349663); h = (h ^ (h >>> 13)) >>> 0; return h; }

function buildObstacleInstances(planet, worldHalf) {
  const tm = planet && planet.mapData && planet.mapData.tileMap;
  if (!tm || !Array.isArray(tm.tiles) || !tm.tiles.length) return null;
  const tileSize = tm.tileSize || 2;
  const scale = worldHalf / 50; // matches createSurfaceSim: surfaceToWorld = (p-50)*scale
  const tileW = tileSize * scale;
  const s2w = (sx, sy) => [(sx - 50) * scale, (sy - 50) * scale];

  const rocks = [], trunks = [], foliage = [], water = [], lava = [], vents = [], pits = [];
  for (let ty = 0; ty < tm.tiles.length; ty++) {
    const row = tm.tiles[ty];
    if (!row) continue;
    for (let tx = 0; tx < row.length; tx++) {
      const t = row[tx];
      if (!t || t.walkable !== false) continue;
      const type = t.type;
      if (type === 'building') continue; // POIs already draw these

      const h = hashTile(tx, ty);
      const r = ((h >> 16) & 0xff) / 255;            // 0..1 size roll
      const yaw = (((h >> 4) & 0xff) / 255) * Math.PI * 2;
      const jx = (((h & 0xff) / 255) - 0.5) * tileSize * 0.4;       // sub-tile jitter so it
      const jy = ((((h >> 8) & 0xff) / 255) - 0.5) * tileSize * 0.4; // doesn't look gridded
      const [wx, wz] = s2w((tx + 0.5) * tileSize + jx, (ty + 0.5) * tileSize + jy);

      if (type === 'rock' || type === 'canyon') {
        const sz = tileW * (0.42 + 0.34 * r) * (type === 'canyon' ? 1.35 : 1);
        rocks.push({ x: wx, y: sz * 0.5, z: wz, sx: sz, sy: sz * (0.7 + 0.4 * r), sz, ry: yaw });
      } else if (type === 'tree') {
        const ht = tileW * (1.1 + 0.6 * r);
        const tw = tileW * (0.5 + 0.2 * r);
        trunks.push({ x: wx, y: 0, z: wz, sx: tw * 0.6, sy: ht * 0.5, sz: tw * 0.6, ry: yaw });
        foliage.push({ x: wx, y: ht * 0.45, z: wz, sx: tw, sy: ht * 0.65, sz: tw, ry: yaw });
      } else if (type === 'lava_flow') {
        lava.push({ x: wx, y: 0.06, z: wz, sx: tileW * 0.98, sy: 1, sz: tileW * 0.98, ry: yaw });
      } else if (type === 'volcanic_vent') {
        const sz = tileW * (0.4 + 0.3 * r);
        vents.push({ x: wx, y: sz * 0.4, z: wz, sx: sz, sy: sz * 0.7, sz, ry: yaw });
      } else if (type === 'water') {
        water.push({ x: wx, y: 0.05, z: wz, sx: tileW, sy: 1, sz: tileW, ry: 0 });
      } else if (type === 'crevasse' || type === 'crater') {
        const s = tileW * (type === 'crater' ? 1.05 : 0.85);
        pits.push({ x: wx, y: 0.04, z: wz, sx: s, sy: 1, sz: s, ry: yaw });
      }
    }
  }
  // Cap each category (dense biomes can flood) by deterministic decimation.
  const cap = (a, n) => (a.length > n ? a.filter((_, i) => i % Math.ceil(a.length / n) === 0) : a);
  return {
    rocks: cap(rocks, 600), trunks: cap(trunks, 600), foliage: cap(foliage, 600),
    water: cap(water, 1200), lava: cap(lava, 400), vents: cap(vents, 200), pits: cap(pits, 500),
  };
}

export default function SurfaceObstacles({ planet, worldHalf }) {
  const data = useMemo(() => buildObstacleInstances(planet, worldHalf), [planet, worldHalf]);
  if (!data) return null;
  return (
    <>
      {data.rocks.length > 0 && <InstancedProps geometry={ROCK_GEOM} material={ROCK_MAT} items={data.rocks} />}
      {data.trunks.length > 0 && <InstancedProps geometry={TRUNK_GEOM} material={TRUNK_MAT} items={data.trunks} />}
      {data.foliage.length > 0 && <InstancedProps geometry={FOLIAGE_GEOM} material={FOLIAGE_MAT} items={data.foliage} />}
      {data.lava.length > 0 && <InstancedProps geometry={FLAT_GEOM} material={LAVA_MAT} items={data.lava} cast={false} />}
      {data.vents.length > 0 && <InstancedProps geometry={ROCK_GEOM} material={VENT_MAT} items={data.vents} />}
      {data.pits.length > 0 && <InstancedProps geometry={FLAT_GEOM} material={PIT_MAT} items={data.pits} cast={false} />}
      {data.water.length > 0 && <InstancedProps geometry={FLAT_GEOM} material={WATER_MAT} items={data.water} cast={false} />}
    </>
  );
}
