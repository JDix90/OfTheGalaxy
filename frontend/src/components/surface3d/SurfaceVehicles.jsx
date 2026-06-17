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

function Vehicle({ scene, fit, baseY, run, speed, hover, seed }) {
  const ref = useRef();
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const dir = useMemo(() => { const dx = run.b[0] - run.a[0], dz = run.b[1] - run.a[1]; const L = Math.hypot(dx, dz) || 1; return { dx: dx / L, dz: dz / L, L }; }, [run]);
  const t = useRef((hash(seed) % 1000) / 1000);
  const sgn = useRef(((hash(seed + 9) & 1) ? 1 : -1));
  useFrame((_, dt) => {
    if (!ref.current) return;
    t.current += sgn.current * (speed * Math.min(dt, 0.05)) / dir.L;
    if (t.current > 1) { t.current = 1; sgn.current = -1; } else if (t.current < 0) { t.current = 0; sgn.current = 1; }
    ref.current.position.set(run.a[0] + (run.b[0] - run.a[0]) * t.current, hover, run.a[1] + (run.b[1] - run.a[1]) * t.current);
    ref.current.rotation.y = Math.atan2(dir.dx * sgn.current, dir.dz * sgn.current) + Math.PI; // kit models face -Z
  });
  return (
    <group ref={ref}>
      <group scale={fit} position={[0, -baseY * fit, 0]}><primitive object={cloned} /></group>
    </group>
  );
}

function Fleet({ tm, worldHalf, cfg }) {
  const { scene } = useGLTF(cfg.url);
  const ts = tm.tileSize || 2, scale = worldHalf / 50, tileW = ts * scale;
  const { fit, baseY } = useMemo(() => {
    scene.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(scene);
    const s = new THREE.Vector3(); box.getSize(s);
    return { fit: (cfg.fit * tileW) / Math.max(s.x, s.y, s.z, 1e-3), baseY: box.min.y };
  }, [scene, tileW, cfg]);
  const runs = useMemo(() => findStreetRuns(tm, ts, scale), [tm, ts, scale]);
  if (!runs.length) return null;
  const fleet = [];
  for (let i = 0; i < cfg.count; i++) fleet.push({ run: runs[(i * 7) % runs.length], seed: i * 131 + 7 });
  return fleet.map((v, i) => (
    <Vehicle key={i} scene={scene} fit={fit} baseY={baseY} run={v.run} speed={cfg.speed} hover={cfg.hover} seed={v.seed} />
  ));
}

export default function SurfaceVehicles({ planet, worldHalf }) {
  const tm = planet && planet.mapData && planet.mapData.tileMap;
  const cfg = useMemo(() => {
    if (!tm || !Array.isArray(tm.tiles) || !(tm.settlement || tm.style === 'medina')) return null;
    return (tm.style in BIOME_VEHICLE) ? BIOME_VEHICLE[tm.style] : BIOME_VEHICLE.outpost;
  }, [tm]);
  if (!cfg) return null;
  return <Suspense fallback={null}><Fleet tm={tm} worldHalf={worldHalf} cfg={cfg} /></Suspense>;
}
