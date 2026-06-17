/**
 * SurfaceProps — scatters modeled "lived-in" clutter (CC0 glTF kit) through a settlement so cities
 * read as inhabited, not empty: barrels/crates/containers/pipes in the souk plazas, a satellite dish
 * here and there, and a parked speeder + rover by the spaceport. Deterministic from tile coords and
 * instanced (a handful of draw calls), gated to settlement surfaces (renders nothing in the wild).
 */
import React, { Suspense, useMemo } from 'react';
import InstancedGLTF from './InstancedGLTF';

const CLUTTER = [
  '/models/props/barrel.glb', '/models/props/barrels.glb',
  '/models/props/container.glb', '/models/props/pipe_straight.glb', '/models/props/pipe_ring.glb',
];
const DISH = '/models/props/satelliteDish.glb';
const SPEEDER = '/models/props/craft_speederA.glb';
const ROVER = '/models/props/rover.glb';

const hashTile = (x, y) => { let h = (x * 73856093) ^ (y * 19349663); return ((h ^ (h >>> 13)) >>> 0); };

function buildProps(planet, worldHalf) {
  const tm = planet && planet.mapData && planet.mapData.tileMap;
  if (!tm || !Array.isArray(tm.tiles) || !tm.tiles.length || !(tm.settlement || tm.style === 'medina')) return null;
  const ts = tm.tileSize || 2, scale = worldHalf / 50, tileW = ts * scale;
  const s2w = (sx, sy) => [(sx - 50) * scale, (sy - 50) * scale];

  const clutter = CLUTTER.map(() => []); // one item-list per model
  const dishes = [];
  for (let ty = 0; ty < tm.tiles.length; ty++) {
    const row = tm.tiles[ty];
    if (!row) continue;
    for (let tx = 0; tx < row.length; tx++) {
      const t = row[tx];
      if (!t || t.type !== 'plaza') continue;
      const h = hashTile(tx, ty);
      if ((h & 7) >= 3) continue; // ~3/8 of plaza tiles get a prop (keeps the square walkable)
      const jx = (((h >> 6) & 0xff) / 255 - 0.5) * tileW * 0.5;
      const jz = (((h >> 14) & 0xff) / 255 - 0.5) * tileW * 0.5;
      const [wx, wz] = s2w((tx + 0.5) * ts, (ty + 0.5) * ts);
      const item = { x: wx + jx, z: wz + jz, s: 0.5 + ((h >> 22) & 3) * 0.13, ry: ((h >> 4) & 0xff) / 255 * Math.PI * 2 };
      if ((h & 0x100) && dishes.length < 12) dishes.push({ ...item, s: 0.7 });
      // `>>>` (unsigned): a signed `>>` makes high hashes negative → clutter[-n]
      // is undefined and .push() crashes the whole surface (e.g. on drydock).
      else clutter[(h >>> 3) % CLUTTER.length].push(item);
    }
  }
  // A parked speeder + rover near the spaceport (player spawn), if there is one.
  const sp = tm.tiles && planet.mapData.spaceport;
  let speeder = [], rover = [];
  if (sp && Number.isFinite(sp.x)) {
    const [sx, sz] = s2w(sp.x, sp.y);
    speeder = [{ x: sx + tileW * 1.4, z: sz + tileW * 0.6, s: 1.1, ry: 0.6 }];
    rover = [{ x: sx - tileW * 1.2, z: sz + tileW * 1.1, s: 1.0, ry: -0.8 }];
  }
  // cap clutter so dense medinas don't flood
  const cap = (a, n) => (a.length > n ? a.filter((_, i) => i % Math.ceil(a.length / n) === 0) : a);
  return { clutter: clutter.map((a) => cap(a, 120)), dishes, speeder, rover, tileW };
}

export default function SurfaceProps({ planet, worldHalf }) {
  const data = useMemo(() => buildProps(planet, worldHalf), [planet, worldHalf]);
  if (!data) return null;
  return (
    <Suspense fallback={null}>
      {CLUTTER.map((url, i) => (data.clutter[i].length > 0
        ? <InstancedGLTF key={url} url={url} items={data.clutter[i]} size={data.tileW * 0.6} /> : null))}
      {data.dishes.length > 0 && <InstancedGLTF url={DISH} items={data.dishes} size={data.tileW * 0.9} />}
      {data.speeder.length > 0 && <InstancedGLTF url={SPEEDER} items={data.speeder} size={data.tileW * 1.6} />}
      {data.rover.length > 0 && <InstancedGLTF url={ROVER} items={data.rover} size={data.tileW * 1.3} />}
    </Suspense>
  );
}
