/**
 * SubMapView3D — the walkable, lit 3D submap interior (Phase 5).
 *
 * The submap counterpart to PlanetSurface3D: loads a submap (by id or location params),
 * builds a sim from its collisionMap, and renders the surface3d kit over it (buildings as
 * POIs, NPCs, exit portals, quest waypoints, atmosphere). Reuses the existing overlays
 * (HUD, NPC menu, dialogue, tutorial). Single-player/local — combat still flows through
 * the existing encounter path. Dungeons + building interiors fall back to the 2D
 * SubMapView for now (Phase 5.1 / 5.2).
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

import { useCharacterStore } from '../state/characterSlice';
import { useQuestStore } from '../state/questSlice';
import subMapApi from '../services/api/subMapApi';
import { npcApi } from '../services/api/npcApi';
import { tutorialApi } from '../services/api/tutorialApi';
import { tutorialEventBus, TUTORIAL_EVENTS } from '../services/tutorialEventBus';

import { CHARACTER_GLTF_URLS } from '../data/modelManifest';
import { useSubmapWorld } from '../world/useSubmapWorld';
import { useSurfaceInput } from '../components/surface3d/useSurfaceInput';
import SubmapScene from '../components/submap3d/SubmapScene';
import { createSubmapSim, buildSubmapPois, buildSubmapExits, buildSubmapNpcs, buildSubmapWaypoints } from '../components/submap3d/submapData';

import HUD from '../components/hud/HUD';
import NPCInteractionMenu from '../components/npc/NPCInteractionMenu';
import DialogueInterface from '../features/dialogue/DialogueInterface';
import TutorialOverlay from '../components/tutorial/TutorialOverlay';
import LoadingSpinner from '../components/common/LoadingSpinner';
import SubMapView from './SubMapView'; // 2D fallback for dungeon / building_interior (Phase 5.1/5.2)

useGLTF.preload(CHARACTER_GLTF_URLS[0]);

const DELEGATE_2D = new Set(['dungeon', 'building_interior']);

export default function SubMapView3D() {
  const { planetId, parentLocationId, parentLocationType, type, subMapId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentCharacter } = useCharacterStore();
  const activeQuests = useQuestStore((s) => s.activeQuests);

  const [subMap, setSubMap] = useState(null);
  const [npcs, setNpcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activePoiId, setActivePoiId] = useState(null);
  const [proxPrompt, setProxPrompt] = useState(null); // { poi, x, y, isExit }
  const [npcMenu, setNpcMenu] = useState(null);
  const [selectedNPC, setSelectedNPC] = useState(null);

  const inputEnabledRef = useRef(true);

  const is3D = !!subMap && !DELEGATE_2D.has(subMap.type);
  const sim = useMemo(() => (is3D ? createSubmapSim(subMap) : null), [is3D, subMap?.id]); // eslint-disable-line
  const worldRef = useSubmapWorld(is3D ? subMap : null, sim);
  const input = useSurfaceInput(inputEnabledRef);

  const pois = useMemo(() => buildSubmapPois(subMap, sim), [subMap, sim]);
  const exits = useMemo(() => buildSubmapExits(subMap, sim), [subMap, sim]);
  const npcs3d = useMemo(() => buildSubmapNpcs(npcs, subMap, sim), [npcs, subMap, sim]);
  const waypoints = useMemo(() => buildSubmapWaypoints(activeQuests, subMap, sim), [activeQuests, subMap, sim]);

  const planetLike = useMemo(() => ({ terrain: subMap?.type === 'spaceport' ? 'urban' : (subMap?.type || 'urban') }), [subMap]);

  const modalOpen = !!(npcMenu || selectedNPC);
  useEffect(() => {
    inputEnabledRef.current = !modalOpen;
    if (modalOpen && input.current) {
      const i = input.current; i.f = i.b = i.l = i.r = i.run = i.qLeft = i.qRight = 0;
    }
  }, [modalOpen, input]);

  // --- load submap + NPCs (ensuring the tutorial contact is placed) ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setError(null);
        const res = subMapId
          ? await subMapApi.getSubMapById(subMapId)
          : await subMapApi.getSubMapForLocation(planetId, parentLocationId, parentLocationType, type);
        const sm = res?.data || res;
        if (!sm || !sm.id) throw new Error('Location not found');
        sm.planetId = sm.planetId || planetId;
        if (cancelled) return;
        setSubMap(sm);
        if (DELEGATE_2D.has(sm.type)) { setLoading(false); return; } // 2D fallback handles its own load

        // Ensure the onboarding contact (e.g. Dockmaster Jax) is on this submap.
        try { if (currentCharacter) await tutorialApi.ensureNPCOnSubmap(currentCharacter.id, sm.id); } catch (e) { /* non-fatal */ }

        // NPCs (generate if none).
        let list = [];
        try {
          const area = sm.parentLocationId && /tann/i.test(sm.parentLocationId) ? 'tann_province'
            : (sm.parentLocationId && /sythmar/i.test(sm.parentLocationId) ? 'sythmar' : null);
          const r = await npcApi.getBySubMap(sm.id, sm.parentLocationId, sm.planetId, area);
          if (r?.success && r.data) list = Array.isArray(r.data) ? r.data : [r.data];
          if (list.length === 0) {
            const gen = await npcApi.generateForSubMap(sm.id);
            if (gen?.success && Array.isArray(gen.data)) list = gen.data;
            // re-ensure the tutorial NPC after a fresh generate
            try { if (currentCharacter) { await tutorialApi.ensureNPCOnSubmap(currentCharacter.id, sm.id); const r2 = await npcApi.getBySubMap(sm.id, sm.parentLocationId, sm.planetId, area); if (r2?.success && Array.isArray(r2.data)) list = r2.data; } } catch (e) {}
          }
        } catch (e) { list = []; }
        if (!cancelled) setNpcs(Array.from(new Map(list.map((n) => [n.id, n])).values()));
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load location');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [subMapId, planetId, parentLocationId, parentLocationType, type]); // eslint-disable-line

  // --- interaction handlers ---
  const onProximity = useCallback((hit) => {
    if (!hit) { setActivePoiId(null); setProxPrompt(null); return; }
    setActivePoiId(hit.poi.id);
    setProxPrompt({ poi: hit.poi, x: hit.x, y: hit.y, isExit: !!hit.poi._isExit });
  }, []);

  const onNpcActivate = useCallback((npc, e) => {
    const ne = e?.nativeEvent || e;
    setNpcMenu({ npc: npc.raw, x: ne?.clientX ?? window.innerWidth / 2, y: ne?.clientY ?? window.innerHeight / 2 });
  }, []);

  const handleExit = useCallback(() => {
    const surf = worldRef.current?.getSurfacePos?.() || { x: 50, y: 50 };
    navigate(`/game/planet/${planetId || subMap?.planetId}`, {
      state: { returnFromSubmap: true, playerLocation: { x: surf.x, y: surf.y, area: 'surface' } },
    });
  }, [navigate, planetId, subMap, worldRef]);

  const handleEnterBuilding = useCallback(async (poi) => {
    const b = poi.raw;
    try {
      const res = await subMapApi.getBuildingInterior(subMap.planetId, b.id, { building: b, parentSubMapId: subMap.id, entrance: { x: poi.sx, y: poi.sy } });
      const interior = res?.data || res;
      if (interior?.id) navigate(`/game/submap/${interior.id}`, { state: { parentSubMap: subMap.id, returnTo: { planetId, parentLocationId, parentLocationType, type } } });
    } catch (e) { /* ignore */ }
  }, [navigate, subMap, planetId, parentLocationId, parentLocationType, type]);

  const onPoiActivate = useCallback((poi) => { if (poi.enterable) handleEnterBuilding(poi); }, [handleEnterBuilding]);
  const onExitActivate = useCallback(() => handleExit(), [handleExit]);

  // --- tutorial: emit objective-location-reached on proximity (mirrors 2D + surface) ---
  const lastEmit = useRef(0);
  const onMoved = useCallback((surfacePos) => {
    const aq = useQuestStore.getState().activeQuests;
    if (!aq || !aq.length || !subMap) return;
    const now = Date.now();
    if (now - lastEmit.current < 800) return;
    for (const { quest, progress } of aq) {
      if (!quest.objectives) continue;
      for (const obj of quest.objectives) {
        if (progress?.objectivesCompleted?.[obj.id]) continue;
        const loc = obj.location;
        if (!loc || loc.subMapId !== subMap.id) continue;
        const d = Math.hypot((surfacePos.x - (loc.x || 0)), (surfacePos.y - (loc.y || 0)));
        if (d < 6) {
          lastEmit.current = now;
          tutorialEventBus.emit(TUTORIAL_EVENTS.QUEST_OBJECTIVE_LOCATION_REACHED, {
            characterId: currentCharacter?.id, questId: quest.id, objectiveId: obj.id, objectiveType: obj.type,
            location: 'submap', subMapId: subMap.id, planetId: subMap.planetId, timestamp: new Date().toISOString(),
          });
          return;
        }
      }
    }
  }, [subMap, currentCharacter]);

  if (!currentCharacter) { navigate('/character/select'); return null; }
  if (loading) return <LoadingSpinner fullScreen message="Entering..." />;
  if (subMap && DELEGATE_2D.has(subMap.type)) return <SubMapView />; // dungeons / building interiors (2D for now)
  if (error || !subMap) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: '#05070f', color: '#e6eefc' }}>
        <div style={{ textAlign: 'center' }}>
          <p>{error || 'Location unavailable'}</p>
          <button onClick={() => navigate(`/game/planet/${planetId || subMap?.planetId || ''}`)} style={btnStyle}>Back to surface</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#05070f', overflow: 'hidden' }}>
      <Canvas shadows flat dpr={[1, 2]} camera={{ position: [0, 10, 18], fov: 55, near: 0.1, far: 1200 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}>
        {sim && (
          <SubmapScene
            world={worldRef} input={input} planetLike={planetLike}
            pois={pois} exits={exits} npcs3d={npcs3d} waypoints={waypoints}
            activePoiId={activePoiId} worldHalf={sim.worldHalf}
            startTime={0.42} postQuality="high"
            onProximity={onProximity} onMoved={onMoved}
            onPoiActivate={onPoiActivate} onNpcActivate={onNpcActivate} onExitActivate={onExitActivate}
          />
        )}
      </Canvas>

      <HUD />

      {proxPrompt && !modalOpen && (
        <div style={{ position: 'fixed', left: proxPrompt.x, top: proxPrompt.y, transform: 'translate(-50%, -130%)', zIndex: 45 }}>
          <button style={{ ...btnStyle, background: 'rgba(12,18,32,0.92)', borderColor: proxPrompt.isExit ? '#2f7a64' : '#2a3654' }}
            onClick={() => (proxPrompt.isExit ? handleExit() : handleEnterBuilding(proxPrompt.poi))}>
            {proxPrompt.isExit ? `▸ ${proxPrompt.poi.label || 'Exit'}` : `▸ Enter ${proxPrompt.poi.name || ''}`}
          </button>
        </div>
      )}

      {npcMenu && (
        <NPCInteractionMenu npc={npcMenu.npc} planet={null} isOpen
          onClose={() => setNpcMenu(null)}
          onTalk={() => { setSelectedNPC(npcMenu.npc); setNpcMenu(null); }}
          position={{ x: npcMenu.x, y: npcMenu.y }} />
      )}
      {selectedNPC && !npcMenu && (
        <DialogueInterface npc={selectedNPC} onClose={() => setSelectedNPC(null)} />
      )}

      <TutorialOverlay />

      <div style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 8, zIndex: 50 }}>
        <button style={btnStyle} onClick={handleExit}>Exit to Surface</button>
        <button style={btnStyle} onClick={() => navigate('/game/galaxy')}>Galaxy</button>
      </div>

      <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', padding: '8px 14px', background: 'rgba(8,12,22,0.72)', border: '1px solid #1d2742', borderRadius: 8, color: '#9fb3d1', fontFamily: 'system-ui, sans-serif', fontSize: 12, pointerEvents: 'none', zIndex: 40, whiteSpace: 'nowrap' }}>
        <b style={{ color: '#cfe3ff' }}>WASD</b> move · <b style={{ color: '#cfe3ff' }}>Shift</b> run · <b style={{ color: '#cfe3ff' }}>Q/E</b> turn · click an NPC to talk · walk to a portal to leave
      </div>
    </div>
  );
}

const btnStyle = {
  padding: '7px 12px', background: 'rgba(12,18,32,0.85)', color: '#cfe3ff',
  border: '1px solid #2a3654', borderRadius: 8, cursor: 'pointer',
  fontFamily: 'system-ui, sans-serif', fontSize: 13,
};
