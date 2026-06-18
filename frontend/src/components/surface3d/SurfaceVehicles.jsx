/**
 * SurfaceVehicles — ambient, biome-matched traffic that makes a settlement feel alive. Purely
 * cosmetic + client-side (no netcode): a few CC0-kit vehicles shuttle along the settlement's straight
 * street runs. Matched to the world so it reads as realistic — speeders zip the cyber-medina,
 * hovercraft drift the ocean docks, rovers trundle the arid/cold/mining outposts, and a quiet forest
 * hamlet gets none. Gated to settlement surfaces (renders nothing in the wild).
 */
import React, { Suspense, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createSurfaceSim } from '../../../../shared/sim/surface.mjs';

// biome style -> vehicle kit model + behaviour (count, world speed, hover height, footprint factor).
const SPEEDER = '/models/props/craft_speederA.glb';
const ROVER = '/models/props/rover.glb';
const BIOME_VEHICLE = {
  medina:      { url: SPEEDER, count: 6, speed: 11, hover: 1.5, fit: 1.5 }, // fast hovering speeders
  docks:       { url: SPEEDER, count: 4, speed: 9, hover: 1.1, fit: 1.4 },  // hovercraft over the water
  outpost:     { url: ROVER, count: 3, speed: 4.5, hover: 0, fit: 1.2 },
  scrap_town:  { url: ROVER, count: 3, speed: 4, hover: 0, fit: 1.2 },
  mining_camp: { url: ROVER, count: 3, speed: 4.5, hover: 0, fit: 1.3 },
  dome_colony: { url: ROVER, count: 2, speed: 4, hover: 0, fit: 1.2 },
  hamlet:      null, // a rural forest hamlet stays quiet — pedestrians only
};
const hash = (n) => { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); return (n ^ (n >>> 15)) >>> 0; };

// Longest straight runs of walkable street/plaza, as world-space segments — the lanes traffic uses.
function findStreetRuns(tm, ts, scale) {
  const G = tm.gridSize;
  const s2w = (sx, sy) => [(sx - 50) * scale, (sy - 50) * scale];
  const isStreet = (x, y) => { const r = tm.tiles[y]; const t = r && r[x]; return !!t && t.walkable && (t.type === 'street' || t.type === 'plaza'); };
  const runs = [];
  for (let y = 0; y < G; y++) { let x = 0; while (x < G) { if (isStreet(x, y)) { let e = x; while (e < G && isStreet(e, y)) e++; if (e - x >= 5) { const a = s2w((x + 0.5) * ts, (y + 0.5) * ts), b = s2w((e - 0.5) * ts, (y + 0.5) * ts); runs.push({ a, b, len: e - x }); } x = e; } else x++; } }
  for (let x = 0; x < G; x++) { let y = 0; while (y < G) { if (isStreet(x, y)) { let e = y; while (e < G && isStreet(x, e)) e++; if (e - y >= 5) { const a = s2w((x + 0.5) * ts, (y + 0.5) * ts), b = s2w((x + 0.5) * ts, (e - 0.5) * ts); runs.push({ a, b, len: e - y }); } y = e; } else y++; } }
  return runs.sort((p, q) => q.len - p.len);
}

// Is the WHOLE vehicle footprint clear? The body is a (2·halfL)×(2·halfW) rectangle centred at
// (cx,cz), oriented by the unit vector u (along travel) and p (across it). We sample a 5×5 grid
// over the rectangle, not just the centre + two side edges: a wide body (the speeder is ~2 tiles
// across) can straddle a building/POI tile that pokes into the MIDDLE of its width, which the old
// 3-point check sailed straight through. The grid step (≤ ~1.6u) is finer than a tile (3.2u) so no
// obstacle tile overlapping the body is missed. ~25 cheap tile lookups — negligible per frame.
function footprintClear(isWalkable, cx, cz, ux, uz, px, pz, halfW, halfL) {
  const N = 4; // 5 samples per axis → 25 points covering the rectangle
  for (let li = 0; li <= N; li++) {
    const lf = ((li / N) * 2 - 1) * halfL;          // -halfL .. +halfL (nose..tail)
    const bx = cx + ux * lf, bz = cz + uz * lf;
    for (let wi = 0; wi <= N; wi++) {
      const wf = ((wi / N) * 2 - 1) * halfW;         // -halfW .. +halfW (left..right)
      if (!isWalkable(bx + px * wf, bz + pz * wf)) return false;
    }
  }
  return true;
}

// Trim a lane to its single longest stretch where the WHOLE VEHICLE FOOTPRINT fits clear of
// buildings, POIs, and stalls — not just the centerline. At each step we test the full body
// rectangle (via footprintClear), so a lane that's too narrow, grazes a wall, or has an obstacle
// jutting into the body is shortened/rejected rather than letting the vehicle overhang or drive
// through it. footprintClear already covers the ±halfL nose/tail, so the centre may range over the
// whole clear span (no extra end-trim needed). Returns null if no usable run.
export function clearestSubRun(run, isWalkable, minLen, halfW, halfL) {
  const [ax, az] = run.a, [bx, bz] = run.b;
  const dx = bx - ax, dz = bz - az;
  const L = Math.hypot(dx, dz) || 1;
  const ux = dx / L, uz = dz / L;   // along the lane
  const px = -uz, pz = ux;          // perpendicular (unit)
  const steps = Math.max(2, Math.ceil(L * 2)); // ~0.5u sampling along the lane
  const clearAt = (x, z) => footprintClear(isWalkable, x, z, ux, uz, px, pz, halfW, halfL);
  let bestS = -1, bestE = -1, curS = -1;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ok = clearAt(ax + t * dx, az + t * dz);
    if (ok) {
      if (curS < 0) curS = i;
      if (i === steps && i - curS > bestE - bestS) { bestS = curS; bestE = i; }
    } else {
      if (curS >= 0 && i - 1 - curS > bestE - bestS) { bestS = curS; bestE = i - 1; }
      curS = -1;
    }
  }
  if (bestS < 0 || bestE <= bestS) return null;
  const s0 = (bestS / steps) * L, s1 = (bestE / steps) * L;
  if (s1 - s0 < minLen) return null;
  return { a: [ax + ux * s0, az + uz * s0], b: [ax + ux * s1, az + uz * s1], len: s1 - s0 };
}

function Vehicle({ scene, fit, baseY, run, speed, hover, seed, isWalkable, halfW, halfL }) {
  const ref = useRef();
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const dir = useMemo(() => { const dx = run.b[0] - run.a[0], dz = run.b[1] - run.a[1]; const L = Math.hypot(dx, dz) || 1; return { dx: dx / L, dz: dz / L, L }; }, [run]);
  const t = useRef((hash(seed) % 1000) / 1000);
  const sgn = useRef(((hash(seed + 9) & 1) ? 1 : -1));
  useFrame((_, dt) => {
    if (!ref.current) return;
    let nt = t.current + sgn.current * (speed * Math.min(dt, 0.05)) / dir.L;
    if (nt > 1) { nt = 1; sgn.current = -1; } else if (nt < 0) { nt = 0; sgn.current = 1; }
    // Per-frame footprint guard: if the whole body would clip a building, POI, or storefront at
    // the next step, turn back instead of advancing into it — a hard guarantee on top of the lane
    // trim, so nothing the trim missed (awnings, odd geometry, a tile poking into the body's width)
    // gets driven through. Tests the full footprint rectangle, not just the centre + side edges.
    const cx = run.a[0] + (run.b[0] - run.a[0]) * nt, cz = run.a[1] + (run.b[1] - run.a[1]) * nt;
    const px = -dir.dz, pz = dir.dx;
    const clear = footprintClear(isWalkable, cx, cz, dir.dx, dir.dz, px, pz, halfW, halfL);
    if (clear) t.current = nt; else sgn.current = -sgn.current;
    const x = run.a[0] + (run.b[0] - run.a[0]) * t.current, z = run.a[1] + (run.b[1] - run.a[1]) * t.current;
    ref.current.position.set(x, hover, z);
    ref.current.rotation.y = Math.atan2(dir.dx * sgn.current, dir.dz * sgn.current) + Math.PI; // kit models face -Z
  });
  return (
    <group ref={ref}>
      <group scale={fit} position={[0, -baseY * fit, 0]}><primitive object={cloned} /></group>
    </group>
  );
}

function Fleet({ tm, planet, worldHalf, cfg }) {
  const { scene } = useGLTF(cfg.url);
  const ts = tm.tileSize || 2, scale = worldHalf / 50, tileW = ts * scale;
  const { fit, baseY, halfW, halfL } = useMemo(() => {
    scene.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(scene);
    const s = new THREE.Vector3(); box.getSize(s);
    const fitS = (cfg.fit * tileW) / Math.max(s.x, s.y, s.z, 1e-3);
    // Kit models face -Z: length runs along Z, width along X. Inflate the width a little
    // (storefront awnings spill ~0.4 tiles into the alleys) so the body keeps real clearance.
    return { fit: fitS, baseY: box.min.y, halfW: s.x * fitS * 0.5 + tileW * 0.3, halfL: s.z * fitS * 0.5 };
  }, [scene, tileW, cfg]);
  const sim = useMemo(() => createSurfaceSim((planet && planet.mapData) || {}, { scale }), [planet, scale]);
  const runs = useMemo(() => (
    findStreetRuns(tm, ts, scale)
      .map((r) => clearestSubRun(r, sim.isWalkableWorld, tileW * 3, halfW, halfL))
      .filter(Boolean)
      .sort((p, q) => q.len - p.len)
  ), [tm, ts, scale, sim, halfW, halfL, tileW]);
  if (!runs.length) return null;
  const fleet = [];
  for (let i = 0; i < cfg.count; i++) fleet.push({ run: runs[(i * 7) % runs.length], seed: i * 131 + 7 });
  return fleet.map((v, i) => (
    <Vehicle key={i} scene={scene} fit={fit} baseY={baseY} run={v.run} speed={cfg.speed} hover={cfg.hover} seed={v.seed} isWalkable={sim.isWalkableWorld} halfW={halfW} halfL={halfL} />
  ));
}

export default function SurfaceVehicles({ planet, worldHalf }) {
  const tm = planet && planet.mapData && planet.mapData.tileMap;
  const cfg = useMemo(() => {
    if (!tm || !Array.isArray(tm.tiles) || !(tm.settlement || tm.style === 'medina')) return null;
    return (tm.style in BIOME_VEHICLE) ? BIOME_VEHICLE[tm.style] : BIOME_VEHICLE.outpost;
  }, [tm]);
  if (!cfg) return null;
  return <Suspense fallback={null}><Fleet tm={tm} planet={planet} worldHalf={worldHalf} cfg={cfg} /></Suspense>;
}
