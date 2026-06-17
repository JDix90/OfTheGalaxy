/**
 * DungeonView3D — a walkable 3D dungeon with real-time, server-authoritative combat (P5.1).
 *
 * Rendered by SubMapView3D for `type==='dungeon'` submaps. Connects a dungeon NetWorld
 * (real-time enemies + the full P4 combat: hotbar, dodge, damage numbers, server-resolved
 * abilities) and renders a dark, torch-lit interior built from the dungeon grid. Falls back
 * to local prediction if the realtime server is down. Exit portals return to the 3D surface.
 */

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

import { useCharacterStore } from '../state/characterSlice';
import { useQuestStore } from '../state/questSlice';
import { getAuthToken } from '../services/api/client';
import { CHARACTER_GLTF_URLS } from '../data/modelManifest';
import { createSubmapSim, buildSubmapExits, buildSubmapWaypoints } from '../components/submap3d/submapData';
import { useDungeonWorld } from '../world/useDungeonWorld';
import { useSurfaceInput } from '../components/surface3d/useSurfaceInput';
import DungeonScene from '../components/submap3d/DungeonScene';
import HUD from '../components/hud/HUD';
import CombatToasts from '../components/hud/CombatToasts';
import ActionCluster from '../components/hud/ActionCluster';
import LowHpVignette from '../components/hud/LowHpVignette';
import HitFlash from '../components/hud/HitFlash';
import { Z } from '../components/hud/hudTokens';
import TutorialOverlay from '../components/tutorial/TutorialOverlay';

useGLTF.preload(CHARACTER_GLTF_URLS[0]);

export default function DungeonView3D({ subMap }) {
  const navigate = useNavigate();
  const { currentCharacter } = useCharacterStore();
  const activeQuests = useQuestStore((s) => s.activeQuests);
  const planetId = subMap.planetId || (currentCharacter && currentCharacter.currentPlanet);

  const inputEnabledRef = useRef(true);
  const sim = useMemo(() => createSubmapSim(subMap), [subMap.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const token = useMemo(() => getAuthToken(), []);
  const [netStatus, setNetStatus] = useState(null);
  const netOptions = useMemo(() => ({
    enabled: import.meta.env.VITE_REALTIME !== 'false', token, characterId: currentCharacter && currentCharacter.id, onStatus: setNetStatus,
  }), [token, currentCharacter && currentCharacter.id]);
  const worldRef = useDungeonWorld(subMap, sim, netOptions);
  const input = useSurfaceInput(inputEnabledRef);

  const exits = useMemo(() => buildSubmapExits(subMap, sim), [subMap, sim]);
  const waypoints = useMemo(() => buildSubmapWaypoints(activeQuests, subMap, sim), [activeQuests, subMap, sim]);

  const [combatTarget, setCombatTarget] = useState(null);
  const [activePoiId, setActivePoiId] = useState(null);
  const [proxPrompt, setProxPrompt] = useState(null);
  const [cdSnap, setCdSnap] = useState({});
  const [log, setLog] = useState([]);
  const [hp, setHp] = useState(null);

  // Poll combat UI state off the net world (decoupled from the 20Hz wire).
  useEffect(() => {
    const id = setInterval(() => {
      const w = worldRef.current; if (!w) return;
      setCdSnap({ ...(w.castCd() || {}) });
      const lg = w.combatLog(); setLog(lg ? lg.slice(-8) : []);
      setHp(w.combat());
    }, 100);
    return () => clearInterval(id);
  }, []); // worldRef is stable; the interval reads worldRef.current dynamically

  const targetRef = useRef(null);
  useEffect(() => { targetRef.current = combatTarget; }, [combatTarget]);
  const castAbility = useCallback((ab) => {
    const w = worldRef.current; if (!w || !ab || !w.cast) return;
    const tid = targetRef.current;
    if (ab.target === 'enemy' || ab.target === 'all_enemies') {
      const en = w._net && w._net.enemies && w._net.enemies.get(String(tid));
      if (!en || en.hp <= 0) return;
    }
    w.cast(ab.id, tid);
  }, [worldRef]);
  useEffect(() => {
    const onKey = (e) => {
      const w = worldRef.current; if (!w || !inputEnabledRef.current) return;
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); w.dodge && w.dodge(); return; }
      if (e.key >= '1' && e.key <= '9') { const hb = w.hotbar ? w.hotbar() : []; castAbility(hb[parseInt(e.key, 10) - 1]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [worldRef, castAbility]);

  const onProximity = useCallback((hit) => {
    if (!hit) { setActivePoiId(null); setProxPrompt(null); return; }
    setActivePoiId(hit.poi.id); setProxPrompt({ poi: hit.poi, x: hit.x, y: hit.y });
  }, []);
  const handleExit = useCallback(() => {
    const surf = worldRef.current && worldRef.current.getSurfacePos ? worldRef.current.getSurfacePos() : { x: 50, y: 50 };
    navigate(`/game/planet/${planetId}`, { state: { returnFromSubmap: true, playerLocation: { x: surf.x, y: surf.y, area: 'surface' } } });
  }, [navigate, planetId, worldRef]);
  const onMoved = useCallback(() => {}, []);

  if (!currentCharacter) { navigate('/character/select'); return null; }

  const hotbar = worldRef.current && worldRef.current.hotbar ? worldRef.current.hotbar() : [];
  const now = Date.now();

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#04050a', overflow: 'hidden' }}>
      <Canvas shadows flat dpr={[1, 2]} camera={{ position: [0, 9, 16], fov: 55, near: 0.1, far: 1200 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}>
        {sim && (
          <DungeonScene
            world={worldRef} input={input} subMap={subMap} sim={sim}
            exits={exits} waypoints={waypoints} activePoiId={activePoiId} worldHalf={sim.worldHalf}
            onProximity={onProximity} onMoved={onMoved} onExitActivate={handleExit}
            combatTarget={combatTarget} onCombatTarget={setCombatTarget} postQuality="high"
          />
        )}
      </Canvas>

      <HUD />

      {/* Combat log */}
      {log.length > 0 && (
        <div style={{ position: 'fixed', bottom: 96, right: 16, width: 260, zIndex: 40, fontFamily: 'system-ui, sans-serif', fontSize: 12, pointerEvents: 'none' }}>
          {log.map((l, i) => (
            <div key={l.t + '_' + i} style={{ color: '#aebbd6', opacity: 0.55 + (i / log.length) * 0.45, textShadow: '0 1px 2px #000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.line}{l.count > 1 ? ` ×${l.count}` : ''}</div>
          ))}
        </div>
      )}

      {/* In-world combat feedback: low-HP danger vignette + on-hit flash. */}
      <LowHpVignette combat={hp} />
      <HitFlash combat={hp} />

      {/* Bottom action lane: hotbar + unified live vitals; yields to dialogue. */}
      <ActionCluster
        worldRef={worldRef}
        characterId={currentCharacter?.id}
        inputEnabledRef={inputEnabledRef}
        combat={hp}
        hotbar={hotbar}
        cdSnap={cdSnap}
        castAbility={castAbility}
        hint={(<><b>WASD</b> move · <b>Shift</b> run · click a hostile to target</>)}
      />

      {proxPrompt && (
        <div style={{ position: 'fixed', left: proxPrompt.x, top: proxPrompt.y, transform: 'translate(-50%, -130%)', zIndex: Z.WORLD_PROMPTS }}>
          <button style={{ ...btnStyle, background: 'rgba(12,18,32,0.92)', borderColor: '#2f7a64' }} onClick={handleExit}>▸ {proxPrompt.poi.label || 'Exit'}</button>
        </div>
      )}

      <CombatToasts world={worldRef} />

      <TutorialOverlay />

      <div style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 8, zIndex: Z.STATUS }}>
        <button style={btnStyle} onClick={handleExit}>Exit Dungeon</button>
        <button style={btnStyle} onClick={() => navigate('/game/galaxy')}>Galaxy</button>
      </div>

    </div>
  );
}

const btnStyle = {
  padding: '7px 12px', background: 'rgba(12,18,32,0.85)', color: '#cfe3ff',
  border: '1px solid #2a3654', borderRadius: 8, cursor: 'pointer',
  fontFamily: 'system-ui, sans-serif', fontSize: 13,
};
