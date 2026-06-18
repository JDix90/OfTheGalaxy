/**
 * SurfaceTest — an isolated, unauthenticated harness for the Phase-1 3D surface.
 *
 * Renders the REAL surface pipeline (shared sim, model manifest, SurfaceScene,
 * useSurfaceWorld, buildPois/buildNpcs) against a hand-crafted synthetic planet —
 * no backend, no auth, no CORS. Lets the walkable scene, lit structures, NPCs,
 * collision, follow camera, and proximity/click interactions be verified directly.
 * The live route (/game/planet3d/:planetId) feeds the identical components real
 * mapData. Mounted at /surface-test.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

import { createSurfaceSim, DEFAULTS } from '../../../shared/sim/surface.mjs';
import { CHARACTER_GLTF_URLS } from '../data/modelManifest';
import { useSurfaceWorld } from '../world/useSurfaceWorld';
import { useSurfaceInput } from '../components/surface3d/useSurfaceInput';
import { buildPois, buildNpcs } from '../components/surface3d/surfaceData';
import SurfaceScene from '../components/surface3d/SurfaceScene';

useGLTF.preload(CHARACTER_GLTF_URLS[0]);

// ---- Synthetic planet (covers every POI category + a wall to test collision) ----
function makeTileMap() {
  const gridSize = 50, tileSize = 2;
  const tiles = [];
  for (let y = 0; y < gridSize; y++) {
    const row = [];
    for (let x = 0; x < gridSize; x++) row.push({ type: 'open', walkable: true, visual: 'open' });
    tiles.push(row);
  }
  // A solid building block (tiles x:14..20, y:18..24) — should block walking.
  for (let y = 18; y <= 24; y++) for (let x = 14; x <= 20; x++) tiles[y][x] = { type: 'building', walkable: false, visual: 'building' };
  // A rock cluster to the east.
  for (let y = 12; y <= 14; y++) for (let x = 34; x <= 36; x++) tiles[y][x] = { type: 'rock', walkable: false, visual: 'rock' };
  return { gridSize, tileSize, tiles };
}

const SYNTH_PLANET = {
  id: 'testworld',
  name: 'Test World',
  terrain: 'urban',
  planetType: 'urban',
  dangerLevel: 3,
  mapData: {
    terrain: 'urban',
    spaceport: { x: 48, y: 48, spawnX: 48, spawnY: 52, size: 2 },
    tileMap: makeTileMap(),
    pointsOfInterest: [
      { id: 'sp', name: 'Landing Pad', type: 'spaceport', x: 48, y: 48 },
      { id: 'mk', name: 'Night Market', type: 'market', x: 36, y: 40 },
      { id: 'ct', name: 'Dome Hall', type: 'temple', x: 62, y: 44 },
      { id: 'mn', name: 'Ore Refinery', type: 'mine', x: 64, y: 64 },
      { id: 'dn', name: 'Sunken Ruins', type: 'ruins', x: 30, y: 64 },
      { id: 'gv', name: 'Magistrate', type: 'government', x: 50, y: 30 },
    ],
    mapLayout: {
      type: 'urban',
      districts: [
        { name: 'Habitat Row', type: 'city', x: 40, y: 56, size: 'large' },
        { name: 'Outer Ward', type: 'settlement', x: 60, y: 36, size: 'medium' },
      ],
    },
    markets: [],
    medicalCenters: [{ name: 'Med Bay', type: 'medical_center', x: 56, y: 58 }],
  },
};

// A few named NPCs near spawn + a synthetic CROWD to stress-test NPC LOD/capping.
const NPC_TYPES = ['generic', 'vendor', 'quest_giver', 'companion', 'faction_leader', 'random_encounter'];
const SYNTH_NPCS = [
  { id: 'n1', name: 'Dock Boss', npcType: 'quest_giver', location: { x: 50, y: 50, area: 'surface' } },
  { id: 'n2', name: 'Parts Dealer', npcType: 'vendor', location: { x: 38, y: 42, area: 'surface' } },
  { id: 'n3', name: 'Stray Drifter', npcType: 'generic', location: { x: 54, y: 46, area: 'surface' } },
];
// ~40 extra NPCs scattered deterministically across the surface (avoids the building).
for (let i = 0; i < 40; i++) {
  const a = i * 2.39996; // golden-angle spread
  const r = 6 + (i % 10) * 4.2;
  let x = 50 + Math.cos(a) * r;
  let y = 50 + Math.sin(a) * r;
  x = Math.max(4, Math.min(96, x));
  y = Math.max(4, Math.min(96, y));
  SYNTH_NPCS.push({ id: `crowd${i}`, name: `Citizen ${i + 1}`, npcType: NPC_TYPES[i % NPC_TYPES.length], location: { x, y, area: 'surface' } });
}

export default function SurfaceTest() {
  const planet = SYNTH_PLANET;
  const sim = useMemo(() => createSurfaceSim(planet.mapData, { scale: DEFAULTS.scale }), []);
  const worldRef = useSurfaceWorld(planet, sim);
  const inputEnabled = useRef(true);
  const input = useSurfaceInput(inputEnabled);

  const pois = useMemo(() => buildPois(planet, sim), [sim]);
  const npcs3d = useMemo(() => buildNpcs(SYNTH_NPCS, sim), [sim]);
  // Synthetic quest waypoints (one delivery objective at the market, one combat at the refinery).
  const waypoints = useMemo(() => {
    const a = sim.surfaceToWorld(42, 47);
    const b = sim.surfaceToWorld(56, 47);
    return [
      { id: 'wp_deliver', wx: a.x, wz: a.z, combat: false, label: 'Deliver the cargo' },
      { id: 'wp_clear', wx: b.x, wz: b.z, combat: true, label: 'Clear the Ore Refinery' },
    ];
  }, [sim]);

  const [activePoiId, setActivePoiId] = useState(null);
  const [prompt, setPrompt] = useState(null);   // { name, x, y } proximity
  const [popup, setPopup] = useState(null);      // { label, x, y } click
  const [fps, setFps] = useState(0);
  const [pos, setPos] = useState({ x: 50, y: 50 });

  // Day-night controls
  const [tod, setTod] = useState(0.6);     // fixed time slider (0-1)
  const [auto, setAuto] = useState(false);
  const [displayTime, setDisplayTime] = useState(0.6);
  const [weather, setWeather] = useState('dust'); // Phase-3 weather preset
  const clock = (t) => { const h = Math.floor(t * 24); const m = Math.floor((t * 24 - h) * 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; };

  // FPS + player-position sampler (independent of React churn).
  useEffect(() => {
    let raf, frames = 0, last = performance.now();
    const tick = (now) => {
      frames++;
      if (now - last >= 500) {
        setFps(Math.round((frames * 1000) / (now - last)));
        const w = worldRef.current;
        if (w) setPos(w.getSurfacePos());
        frames = 0; last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [worldRef]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#05070f', overflow: 'hidden' }}>
      <Canvas
        shadows flat dpr={[1, 2]}
        camera={{ position: [0, 12, 22], fov: 55, near: 0.1, far: 1200 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      >
        <SurfaceScene
          world={worldRef}
          input={input}
          planet={planet}
          pois={pois}
          npcs3d={npcs3d}
          waypoints={waypoints}
          activePoiId={activePoiId}
          textureUrl={null}
          worldHalf={sim.worldHalf}
          time={auto ? undefined : tod}
          startTime={tod}
          cycleSeconds={90}
          onTime={auto ? (t) => setDisplayTime(t) : undefined}
          postQuality="high"
          weather={weather}
          onProximity={(hit) => {
            if (!hit) { setActivePoiId(null); setPrompt(null); return; }
            setActivePoiId(hit.poi.id);
            setPrompt({ name: hit.poi.name, x: hit.x, y: hit.y });
          }}
          onMoved={() => {}}
          onPoiActivate={(poi, e) => {
            const ne = e?.nativeEvent || e;
            setPopup({ label: `POI: ${poi.name} (${poi.type})`, x: ne?.clientX ?? 100, y: ne?.clientY ?? 100 });
          }}
          onNpcActivate={(npc, e) => {
            const ne = e?.nativeEvent || e;
            setPopup({ label: `NPC: ${npc.name} (${npc.npcType})`, x: ne?.clientX ?? 100, y: ne?.clientY ?? 100 });
          }}
        />
      </Canvas>

      {/* status */}
      <div style={panel}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>OtG · Phase-3 glTF Kit</div>
        <Row k="fps" v={fps} c={fps >= 55 ? '#6cf0c2' : '#ffe9a8'} />
        <Row k="time" v={clock(auto ? displayTime : tod)} c="#ffe9a8" />
        <Row k="player x,y" v={`${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}`} />
        <Row k="pois" v={pois.length} />
        <Row k="npcs" v={npcs3d.length} />
        <Row k="near" v={activePoiId || '—'} />

        <div style={{ marginTop: 10, borderTop: '1px solid #1d2742', paddingTop: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9fb3d1', marginBottom: 6 }}>
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> auto cycle (90s)
          </label>
          <input
            type="range" min="0" max="1" step="0.005" value={tod} disabled={auto}
            onChange={(e) => setTod(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#7db8ff' }}
          />
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            {[['Dawn', 0.27], ['Day', 0.5], ['Dusk', 0.76], ['Night', 0.95]].map(([lbl, v]) => (
              <button key={lbl} onClick={() => { setAuto(false); setTod(v); }} style={todBtn}>{lbl}</button>
            ))}
          </div>
          <div style={{ marginTop: 8, color: '#7e8aa6' }}>weather</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            {['dust', 'ash', 'rain', 'snow', 'mist', 'pollen', 'none'].map((w) => (
              <button key={w} onClick={() => setWeather(w)} style={{ ...todBtn, opacity: weather === w ? 1 : 0.55, borderColor: weather === w ? '#7db8ff' : '#2a3654' }}>{w}</button>
            ))}
          </div>
        </div>
      </div>

      {prompt && (
        <div style={{ position: 'fixed', left: prompt.x, top: prompt.y, transform: 'translate(-50%,-130%)', padding: '4px 10px', background: 'rgba(20,40,30,0.85)', border: '1px solid #2c6', borderRadius: 6, color: '#9affa0', fontSize: 12, fontFamily: 'system-ui', pointerEvents: 'none', zIndex: 30 }}>
          ▸ Enter {prompt.name}
        </div>
      )}
      {popup && (
        <div style={{ position: 'fixed', left: popup.x, top: popup.y, transform: 'translate(-50%,-130%)', padding: '6px 10px', background: 'rgba(12,18,32,0.92)', border: '1px solid #2a3654', borderRadius: 8, color: '#cfe3ff', fontSize: 12, fontFamily: 'system-ui', zIndex: 30 }}>
          {popup.label} <span onClick={() => setPopup(null)} style={{ cursor: 'pointer', color: '#8aa0c4', marginLeft: 8 }}>✕</span>
        </div>
      )}

      <div style={hint}>
        <b style={{ color: '#cfe3ff' }}>WASD</b> move · <b style={{ color: '#cfe3ff' }}>Shift</b> run ·{' '}
        <b style={{ color: '#cfe3ff' }}>Q/E</b> or <b style={{ color: '#cfe3ff' }}>drag</b> turn · walk into the building to test collision · click POIs/NPCs
      </div>
    </div>
  );
}

const panel = {
  position: 'fixed', top: 16, left: 16, minWidth: 190, padding: '12px 14px',
  background: 'rgba(8,12,22,0.8)', border: '1px solid #1d2742', borderRadius: 10,
  color: '#e6eefc', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, lineHeight: 1.7, zIndex: 40,
};
const hint = {
  position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', padding: '8px 14px',
  background: 'rgba(8,12,22,0.72)', border: '1px solid #1d2742', borderRadius: 8,
  color: '#9fb3d1', fontFamily: 'system-ui', fontSize: 12, pointerEvents: 'none', zIndex: 40, whiteSpace: 'nowrap',
};
const todBtn = {
  flex: 1, padding: '3px 0', background: 'rgba(20,28,46,0.9)', color: '#cfe3ff',
  border: '1px solid #2a3654', borderRadius: 5, cursor: 'pointer', fontSize: 10, fontFamily: 'system-ui',
};
function Row({ k, v, c }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ color: '#7e8aa6' }}>{k}</span>
      <span style={{ color: c || '#e6eefc', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{v}</span>
    </div>
  );
}
