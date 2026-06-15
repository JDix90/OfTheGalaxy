/**
 * SubmapTest — an isolated, unauthenticated harness for the 3D submap interiors (Phase 5.3).
 *
 * Renders the REAL submap pipeline (createSubmapSim, submapData builders, SubmapScene,
 * useSubmapWorld) against hand-crafted synthetic submaps of every scene type — no backend,
 * no auth. Lets the enclosure (walls/ceiling/skirt), type-appropriate room structures,
 * lighting, fog, NPCs, and collision be verified per scene type. Mounted at /submap-test.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

import { CHARACTER_GLTF_URLS } from '../data/modelManifest';
import { useSubmapWorld } from '../world/useSubmapWorld';
import { useSurfaceInput } from '../components/surface3d/useSurfaceInput';
import SubmapScene from '../components/submap3d/SubmapScene';
import {
  createSubmapSim, buildSubmapPois, buildSubmapExits, buildSubmapNpcs,
  buildSubmapWaypoints, buildSubmapFurniture,
} from '../components/submap3d/submapData';

useGLTF.preload(CHARACTER_GLTF_URLS[0]);

const B = (id, name, type, x, y, w = 2, h = 2, opensTo = null) => ({ id, name, type, position: { x, y }, size: { width: w, height: h }, opensTo });
const N = (id, name, npcType, x, y) => ({ id, name, npcType, location: { x, y, area: 'submap' } });

// A bordered-room collision map (res == grid) so InteriorWalls draws a clean shell.
function borderRoom(n) {
  const cells = [];
  for (let y = 0; y < n; y++) {
    const row = [];
    for (let x = 0; x < n; x++) row.push(x === 0 || y === 0 || x === n - 1 || y === n - 1 ? 1 : 0);
    cells.push(row);
  }
  return { resolution: n, cells };
}

const EXIT = (x, y) => ({ id: 'main_exit', position: { x, y }, label: 'Exit to Surface' });
// Harness spawns the player centrally (entryPoints[0]) for a clear overview, while the exit
// portal stays at the map edge. The real game uses edge entries.
const ENTRY = (x, y) => ({ id: 'main_entrance', position: { x, y }, label: 'Entrance' });

// ---- Synthetic submaps (one per scene type) ----
const SUBMAPS = {
  medical_center: {
    id: 'test_medical_center', type: 'medical_center', template: 'medium', planetId: 'testworld',
    layoutData: {
      width: 12, height: 12,
      buildings: [
        B('reception_desk', 'Reception', 'reception', 1, 6, 2, 1),
        B('treatment_0', 'Treatment Room 1', 'treatment_room', 1, 1),
        B('treatment_1', 'Treatment Room 2', 'treatment_room', 4, 1),
        B('surgery_0', 'Surgery', 'surgery_room', 8, 1),
        B('patient_0', 'Patient Room 1', 'patient_room', 1, 9),
        B('patient_1', 'Patient Room 2', 'patient_room', 8, 9),
      ],
      entryPoints: [ENTRY(6, 5)], exitPoints: [EXIT(1, 6)],
    },
    npcs: [N('m1', 'Dr. Saru', 'generic', 5, 4), N('m2', 'Nurse Vela', 'generic', 7, 6), N('m3', 'Quartermaster Lysa', 'vendor', 3, 8)],
  },
  city: {
    id: 'test_city', type: 'city', template: 'medium', planetId: 'testworld',
    layoutData: {
      width: 15, height: 15,
      buildings: [
        B('res_0', 'Residence 1', 'residential', 3, 2),
        B('res_1', 'Residence 2', 'residential', 6, 2),
        B('com_0', 'Shop 1', 'commercial', 10, 2, 2, 2, 'int'),
        B('com_1', 'Shop 2', 'commercial', 12, 6, 2, 2, 'int'),
        B('craft', 'Crafting Bench', 'crafting_bench', 8, 9),
      ],
      entryPoints: [ENTRY(7, 8)], exitPoints: [EXIT(1, 7)],
    },
    npcs: [N('c1', 'City Guard', 'generic', 5, 7), N('c2', 'Merchant', 'vendor', 11, 4), N('c3', 'Citizen Leader', 'quest_giver', 4, 4), N('c4', 'Resident', 'generic', 7, 11)],
  },
  market: {
    id: 'test_market', type: 'market', template: 'medium', planetId: 'testworld',
    layoutData: {
      width: 10, height: 10,
      buildings: [
        B('stall_0', 'Vendor Stall 1', 'vendor_stall', 2, 2, 1, 1),
        B('stall_1', 'Vendor Stall 2', 'vendor_stall', 5, 2, 1, 1),
        B('stall_2', 'Vendor Stall 3', 'vendor_stall', 8, 3, 1, 1),
        B('stall_3', 'Vendor Stall 4', 'vendor_stall', 3, 6, 1, 1),
        B('stall_4', 'Vendor Stall 5', 'vendor_stall', 7, 7, 1, 1),
        B('craftm', 'Crafting Bench', 'crafting_bench', 5, 5),
      ],
      entryPoints: [ENTRY(4, 4)], exitPoints: [EXIT(0, 5)],
    },
    npcs: [N('v1', 'Trader', 'vendor', 2, 3), N('v2', 'Trader', 'vendor', 5, 3), N('v3', 'Browser', 'generic', 6, 6)],
  },
  civic: {
    id: 'test_civic', type: 'civic', template: 'medium', planetId: 'testworld',
    layoutData: {
      width: 14, height: 14,
      buildings: [
        B('office_0', 'Registry Office', 'office', 2, 2),
        B('office_1', 'Clerk Office', 'office', 5, 2),
        B('chamber', 'Council Chamber', 'chamber', 9, 2, 3, 3),
        B('court', 'Magistrate Court', 'court', 5, 8, 3, 3),
      ],
      entryPoints: [ENTRY(7, 6)], exitPoints: [EXIT(1, 7)],
    },
    npcs: [N('g1', 'Civic Guard', 'generic', 5, 6), N('g2', 'Magistrate', 'quest_giver', 7, 9), N('g3', 'Clerk', 'generic', 3, 3)],
  },
  building_interior: {
    id: 'test_interior', type: 'building_interior', template: 'residential', planetId: 'testworld',
    layoutData: {
      width: 10, height: 10, collisionMap: borderRoom(10), buildings: [],
      furniture: [
        { id: 'bed', type: 'bed', position: { x: 2, y: 2 }, size: { width: 2, height: 1 } },
        { id: 'table', type: 'table', position: { x: 5, y: 5 }, size: { width: 1, height: 1 } },
        { id: 'shelf', type: 'shelf', position: { x: 7, y: 2 }, size: { width: 1, height: 2 } },
        { id: 'chair', type: 'chair', position: { x: 5, y: 7 }, size: { width: 1, height: 1 } },
        { id: 'storage', type: 'storage', position: { x: 7, y: 7 }, size: { width: 1, height: 1 } },
        { id: 'sign', type: 'sign', position: { x: 5, y: 1 }, size: { width: 2, height: 1 } },
      ],
      entryPoints: [{ id: 'exit', type: 'exit', label: 'Exit', position: { x: 5, y: 9 }, exitsTo: { subMapId: 'test_city' } }],
      exitPoints: [],
    },
    npcs: [N('r1', 'Resident', 'generic', 4, 4)],
  },
};

const TYPES = Object.keys(SUBMAPS);

export default function SubmapTest() {
  const [type, setType] = useState('medical_center');
  const [tod, setTod] = useState(0.5);
  const def = SUBMAPS[type];

  const subMap = useMemo(() => def, [type]);
  const sim = useMemo(() => createSubmapSim(subMap), [type]); // eslint-disable-line
  const worldRef = useSubmapWorld(subMap, sim);
  const inputEnabled = useRef(true);
  const input = useSurfaceInput(inputEnabled);

  const pois = useMemo(() => buildSubmapPois(subMap, sim), [type, sim]); // eslint-disable-line
  const exits = useMemo(() => buildSubmapExits(subMap, sim), [type, sim]); // eslint-disable-line
  const npcs3d = useMemo(() => buildSubmapNpcs(subMap.npcs, subMap, sim), [type, sim]); // eslint-disable-line
  const waypoints = useMemo(() => buildSubmapWaypoints([], subMap, sim), [type, sim]); // eslint-disable-line
  const isInterior = subMap.type === 'building_interior';
  const furniture = useMemo(() => (isInterior ? buildSubmapFurniture(subMap, sim) : []), [type, sim, isInterior]); // eslint-disable-line
  const planetLike = useMemo(() => ({ terrain: subMap.type === 'spaceport' ? 'urban' : subMap.type }), [type]);

  const [activePoiId, setActivePoiId] = useState(null);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let raf, frames = 0, last = performance.now();
    const tick = (now) => { frames++; if (now - last >= 500) { setFps(Math.round((frames * 1000) / (now - last))); frames = 0; last = now; } raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#05070f', overflow: 'hidden' }}>
      <Canvas key={type} shadows flat dpr={[1, 2]} camera={{ position: [0, 12, 22], fov: 55, near: 0.1, far: 1200 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}>
        {sim && (
          <SubmapScene
            world={worldRef} input={input} planetLike={planetLike}
            pois={pois} exits={exits} npcs3d={npcs3d} waypoints={waypoints}
            subMap={subMap} sim={sim} furniture={furniture} interior={isInterior}
            activePoiId={activePoiId} worldHalf={sim.worldHalf}
            startTime={tod} postQuality="high"
            onProximity={(hit) => setActivePoiId(hit ? hit.poi.id : null)}
            onMoved={() => {}} onPoiActivate={() => {}} onNpcActivate={() => {}} onExitActivate={() => {}}
          />
        )}
      </Canvas>

      <div style={panel}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>OtG · Submap 3D Test</div>
        {TYPES.map((t) => (
          <button key={t} onClick={() => setType(t)} style={{ ...btn, opacity: t === type ? 1 : 0.55, borderColor: t === type ? '#7db8ff' : '#2a3654', width: '100%', marginBottom: 4 }}>{t}</button>
        ))}
        <div style={{ marginTop: 8, color: '#7e8aa6' }}>fps {fps} · pois {pois.length} · npcs {npcs3d.length}</div>
        <div style={{ marginTop: 8, color: '#7e8aa6' }}>time of day</div>
        <input type="range" min="0" max="1" step="0.01" value={tod} onChange={(e) => setTod(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#7db8ff' }} />
      </div>

      <div style={hint}><b style={{ color: '#cfe3ff' }}>WASD</b> move · <b style={{ color: '#cfe3ff' }}>Q/E</b> turn · walk to the glowing portal to leave</div>
    </div>
  );
}

const panel = { position: 'fixed', top: 16, left: 16, width: 180, padding: '12px 14px', background: 'rgba(8,12,22,0.8)', border: '1px solid #1d2742', borderRadius: 10, color: '#e6eefc', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, lineHeight: 1.6, zIndex: 40 };
const btn = { padding: '5px 8px', background: 'rgba(20,28,46,0.9)', color: '#cfe3ff', border: '1px solid #2a3654', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'system-ui' };
const hint = { position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', padding: '8px 14px', background: 'rgba(8,12,22,0.72)', border: '1px solid #1d2742', borderRadius: 8, color: '#9fb3d1', fontFamily: 'system-ui', fontSize: 12, pointerEvents: 'none', zIndex: 40, whiteSpace: 'nowrap' };
