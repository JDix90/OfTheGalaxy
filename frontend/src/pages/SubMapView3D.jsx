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
import { useDungeonWorld } from '../world/useDungeonWorld';
import { getAuthToken } from '../services/api/client';
import { useSurfaceInput } from '../components/surface3d/useSurfaceInput';
import SubmapScene from '../components/submap3d/SubmapScene';
import { createSubmapSim, buildSubmapPois, buildSubmapExits, buildSubmapNpcs, buildSubmapWaypoints, buildSubmapFurniture } from '../components/submap3d/submapData';

import HUD from '../components/hud/HUD';
import CombatToasts from '../components/hud/CombatToasts';
import ConsumableQuickslot from '../components/hud/ConsumableQuickslot';
import NPCInteractionMenu from '../components/npc/NPCInteractionMenu';
import DialogueInterface from '../features/dialogue/DialogueInterface';
import TutorialOverlay from '../components/tutorial/TutorialOverlay';
import LoadingSpinner from '../components/common/LoadingSpinner';
import SubMapView from './SubMapView';     // 2D fallback (no submap types delegate here now; kept defensive)
import DungeonView3D from './DungeonView3D'; // 3D real-time dungeon (Phase 5.1)

useGLTF.preload(CHARACTER_GLTF_URLS[0]);

const DELEGATE_2D = new Set(); // spaceport/city/settlement/market/civic/building_interior all 3D now

// Hub submaps that run as authoritative real-time worlds (server-driven players + hostiles +
// the full P4 combat stack), so the tutorial fight + NPC/POI/quest combat happen in-place.
// A Set so it's trivial to extend to city/market later (the backend already routes any subMapId).
const REALTIME_SUBMAP_TYPES = new Set(['spaceport']);

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

  const isDungeon = !!subMap && subMap.type === 'dungeon';
  const is3D = !!subMap && !isDungeon && !DELEGATE_2D.has(subMap.type);
  const isRealtime = !!subMap && REALTIME_SUBMAP_TYPES.has(subMap.type); // spaceport runs server-authoritative
  const sim = useMemo(() => (is3D ? createSubmapSim(subMap) : null), [is3D, subMap?.id]); // eslint-disable-line

  // Phase 6a: the spaceport is an authoritative real-time world (movement + presence + combat),
  // every other 3D submap stays single-player/local. BOTH hooks must be called every render
  // (React rules); the inactive one is fed null and no-ops.
  const token = useMemo(() => getAuthToken(), []);
  const [netStatus, setNetStatus] = useState(null);
  const netOptions = useMemo(() => ({
    enabled: isRealtime && import.meta.env.VITE_REALTIME !== 'false',
    token, characterId: currentCharacter?.id, onStatus: setNetStatus,
  }), [isRealtime, token, currentCharacter?.id]);
  const rtWorld = useDungeonWorld(isRealtime ? subMap : null, isRealtime ? sim : null, netOptions);
  const localWorld = useSubmapWorld((!isRealtime && is3D) ? subMap : null, sim);
  const worldRef = isRealtime ? rtWorld : localWorld;
  const input = useSurfaceInput(inputEnabledRef);

  // Combat HUD state (Phase 4.3/4.4) — polled off the net world; realtime submaps only.
  const [combat, setCombat] = useState(null);   // { hp, maxHp, dead } | null
  const [hotbar, setHotbar] = useState([]);      // ability bar
  const [cdSnap, setCdSnap] = useState({});      // ability id → ms-ready
  const [log, setLog] = useState([]);            // combat log lines
  const [combatTarget, setCombatTarget] = useState(null); // soft-target enemy id
  useEffect(() => {
    if (!isRealtime) { setCombat(null); setHotbar([]); setLog([]); return undefined; }
    const id = setInterval(() => {
      const w = worldRef.current;
      setCombat(w && w.combat ? w.combat() : null);
      setHotbar(w && w.hotbar ? w.hotbar() : []);
      const cd = w && w.castCd ? w.castCd() : null;
      setCdSnap(cd ? { ...cd } : {});
      const lg = w && w.combatLog ? w.combatLog() : null;
      setLog(lg ? lg.slice(-8) : []);
    }, 100);
    return () => clearInterval(id);
  }, [isRealtime, worldRef]);

  // Combat keybinds (1–9 cast hotbar abilities at the soft-target, Space dodges). Guards on
  // `w.cast` so local (non-realtime) submaps don't intercept Space/number keys.
  const targetRef = useRef(null);
  useEffect(() => { targetRef.current = combatTarget; }, [combatTarget]);
  const castAbility = useCallback((ab) => {
    const w = worldRef.current;
    if (!w || !ab || !w.cast) return;
    const tid = targetRef.current;
    if (ab.target === 'enemy' || ab.target === 'all_enemies') {
      const en = w._net && w._net.enemies && w._net.enemies.get(String(tid));
      if (!en || en.hp <= 0) return; // require a live target for offensive abilities
    }
    w.cast(ab.id, tid);
  }, [worldRef]);
  useEffect(() => {
    const onKey = (e) => {
      const w = worldRef.current;
      if (!w || !w.cast || !inputEnabledRef.current) return; // realtime-only; not while a menu is open
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); w.dodge && w.dodge(); return; }
      if (e.key >= '1' && e.key <= '9') {
        const hb = w.hotbar ? w.hotbar() : [];
        castAbility(hb[parseInt(e.key, 10) - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [worldRef, castAbility]);

  const pois = useMemo(() => buildSubmapPois(subMap, sim), [subMap, sim]);
  const exits = useMemo(() => buildSubmapExits(subMap, sim), [subMap, sim]);
  const npcs3d = useMemo(() => buildSubmapNpcs(npcs, subMap, sim), [npcs, subMap, sim]);
  const waypoints = useMemo(() => buildSubmapWaypoints(activeQuests, subMap, sim), [activeQuests, subMap, sim]);
  const isInterior = subMap?.type === 'building_interior';
  const furniture = useMemo(() => (isInterior ? buildSubmapFurniture(subMap, sim) : []), [isInterior, subMap, sim]);

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
        // Dungeons (3D real-time, own NPC/enemy + net world) + building interiors (2D) load themselves.
        if (sm.type === 'dungeon' || DELEGATE_2D.has(sm.type)) { setLoading(false); return; }

        // Ensure the onboarding contact (Dockmaster Jax) is on this submap — but ONLY in
        // the spaceport and ONLY while the onboarding tutorial is still running. The backend
        // `ensureTutorialNPCOnSubmap` RELOCATES the single tutorial NPC to whatever submap we
        // pass, so calling it for every facility made Jax follow the player into the clinic,
        // market, residences, etc. (the reported bug). Gate mirrors the 2D SubMapView
        // (`isNewCharacter && isSpaceport`).
        const tutorialActive = !!currentCharacter && currentCharacter.level === 1 && !currentCharacter.tutorialCompleted;
        const ensureTutorialNpc = sm.type === 'spaceport' && tutorialActive;
        if (ensureTutorialNpc) {
          try { await tutorialApi.ensureNPCOnSubmap(currentCharacter.id, sm.id); } catch (e) { /* non-fatal */ }
        }

        // NPCs (generate if none).
        let list = [];
        try {
          const area = sm.parentLocationId && /tann/i.test(sm.parentLocationId) ? 'tann_province'
            : (sm.parentLocationId && /sythmar/i.test(sm.parentLocationId) ? 'sythmar' : null);
          const r = await npcApi.getBySubMap(sm.id, sm.parentLocationId, sm.planetId, area);
          if (r?.success && r.data) list = Array.isArray(r.data) ? r.data : [r.data];
          // Generate procedural NPCs when the submap has none — or only the tutorial contact,
          // so the spaceport still gets its vendors/dock staff/security beside Dockmaster Jax.
          const nonTutorial = list.filter((n) => !String(n.id || '').startsWith('npc_tutorial_'));
          if (nonTutorial.length === 0) {
            const gen = await npcApi.generateForSubMap(sm.id);
            if (gen?.success && Array.isArray(gen.data)) list = gen.data;
            // Re-ensure the tutorial NPC after a fresh generate (still spaceport + tutorial only).
            if (ensureTutorialNpc) {
              try { await tutorialApi.ensureNPCOnSubmap(currentCharacter.id, sm.id); const r2 = await npcApi.getBySubMap(sm.id, sm.parentLocationId, sm.planetId, area); if (r2?.success && Array.isArray(r2.data)) list = r2.data; } catch (e) {}
            }
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

  // Phase 6a: in a real-time spaceport, NPC "Attack" spawns a server-authoritative hostile
  // in-world (mirrors PlanetSurface3D) instead of the turn-based card screen. Returns true only
  // when handled in-world (server online); on false the menu falls back to the legacy path.
  const onAttackNpc = useCallback((npc) => {
    const w = worldRef.current;
    if (!npc?.id || !w || !w.requestSpawn || (w.isOffline && w.isOffline())) return false;
    w.requestSpawn({ kind: 'npc', npcId: npc.id });
    setNpcs((prev) => prev.filter((n) => n.id !== npc.id)); // the friendly NPC becomes the hostile
    return true;
  }, [worldRef]);

  const handleExit = useCallback(() => {
    // A building interior exits back to its PARENT submap, not the surface.
    if (subMap?.type === 'building_interior') {
      const parent = location.state?.parentSubMap || (exits[0] && exits[0].exitsTo && exits[0].exitsTo.subMapId);
      if (parent) { navigate(`/game/submap/${parent}`, { state: { returnFromBuilding: true } }); return; }
    }
    const surf = worldRef.current?.getSurfacePos?.() || { x: 50, y: 50 };
    navigate(`/game/planet/${planetId || subMap?.planetId}`, {
      state: { returnFromSubmap: true, playerLocation: { x: surf.x, y: surf.y, area: 'surface' } },
    });
  }, [navigate, planetId, subMap, worldRef, location.state, exits]);

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
  if (subMap && subMap.type === 'dungeon') return <DungeonView3D subMap={subMap} />; // 3D real-time dungeon
  if (subMap && DELEGATE_2D.has(subMap.type)) return <SubMapView />; // building interiors (2D for now)
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
            subMap={subMap} sim={sim} furniture={furniture} interior={isInterior}
            activePoiId={activePoiId} worldHalf={sim.worldHalf}
            startTime={isInterior ? 0.5 : 0.42} postQuality="high"
            realtime={isRealtime} combatTarget={combatTarget} onCombatTarget={setCombatTarget}
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
          onAttack={isRealtime ? onAttackNpc : undefined}
          position={{ x: npcMenu.x, y: npcMenu.y }} />
      )}
      {selectedNPC && !npcMenu && (
        <DialogueInterface npc={selectedNPC} onClose={() => setSelectedNPC(null)} />
      )}

      {/* Combat HUD (Phase 4.3/4.4) — health bar + ability hotbar + consumable quickslot
          (realtime spaceport only; online). */}
      {isRealtime && combat && (
        <div style={{ position: 'fixed', bottom: 56, left: '50%', transform: 'translateX(-50%)', zIndex: 45, fontFamily: 'system-ui, sans-serif', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <ConsumableQuickslot world={worldRef} characterId={currentCharacter?.id} enabledRef={inputEnabledRef} />
            {hotbar.slice(0, 9).map((ab, i) => {
              const ready = (cdSnap[ab.id] || 0) <= Date.now();
              const cdLeft = Math.max(0, ((cdSnap[ab.id] || 0) - Date.now()) / 1000);
              const accent = ab.type === 'heal' ? '#6cf0c2' : ab.type === 'buff' ? '#ffd24a' : ab.type === 'debuff' ? '#d18cff' : '#ff8d6c';
              return (
                <button key={ab.id} title={`${ab.name} (${ab.stam} stamina)`} onClick={() => castAbility(ab)}
                  style={{ position: 'relative', width: 48, height: 48, borderRadius: 8, background: 'rgba(10,15,28,0.92)', border: `1px solid ${ready ? accent : '#2a3654'}`, color: ready ? '#e6eefc' : '#6f7c98', cursor: 'pointer', overflow: 'hidden', fontFamily: 'system-ui' }}>
                  <div style={{ position: 'absolute', top: 2, left: 4, fontSize: 10, color: '#8aa0c4' }}>{i + 1}</div>
                  <div style={{ fontSize: 9, lineHeight: 1.05, padding: '14px 3px 0', fontWeight: 600 }}>{ab.name.replace(/ (Mastery|Insight)$/, '')}</div>
                  {!ready && <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,6,12,0.66)', display: 'grid', placeItems: 'center', color: '#cfe3ff', fontWeight: 700, fontSize: 14 }}>{cdLeft.toFixed(1)}</div>}
                </button>
              );
            })}
          </div>
          <div style={{ width: 240 }}>
            <div style={{ height: 14, background: 'rgba(8,12,22,0.8)', border: '1px solid #2a3654', borderRadius: 7, overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(0, Math.min(100, (combat.hp / combat.maxHp) * 100))}%`, height: '100%', background: (combat.hp / combat.maxHp) < 0.3 ? '#ff5a4a' : '#6cf0c2', transition: 'width .15s' }} />
            </div>
            <div style={{ color: '#cfe3ff', fontSize: 11, marginTop: 2, textShadow: '0 1px 3px #000' }}>
              {Math.max(0, Math.round(combat.hp))}/{combat.maxHp} HP · click a hostile · <b style={{ color: '#cfe3ff' }}>1–9</b> abilities · <b style={{ color: '#cfe3ff' }}>Space</b> dodge
            </div>
          </div>
        </div>
      )}

      {/* Combat log */}
      {isRealtime && combat && log.length > 0 && (
        <div style={{ position: 'fixed', bottom: 20, right: 16, width: 210, maxHeight: 140, overflow: 'hidden', zIndex: 44, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, lineHeight: 1.5, pointerEvents: 'none' }}>
          {log.map((l, i) => (
            <div key={l.t + '_' + i} style={{ color: '#aebbd6', opacity: 0.55 + (i / log.length) * 0.45, textShadow: '0 1px 2px #000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.line}{l.count > 1 ? ` ×${l.count}` : ''}</div>
          ))}
        </div>
      )}
      {isRealtime && combat && combat.dead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(24,4,6,0.5)', display: 'grid', placeItems: 'center', zIndex: 60, pointerEvents: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ff8a7a', fontFamily: 'system-ui, sans-serif', fontSize: 44, fontWeight: 800, textShadow: '0 2px 14px #000' }}>Defeated</div>
            <div style={{ color: '#cfe3ff', fontFamily: 'system-ui, sans-serif', fontSize: 14, marginTop: 6, textShadow: '0 1px 4px #000' }}>respawning…</div>
          </div>
        </div>
      )}

      {/* Non-blocking victory/death feedback (Phase 2). */}
      {isRealtime && <CombatToasts world={worldRef} />}

      <TutorialOverlay />

      <div style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 8, alignItems: 'center', zIndex: 50 }}>
        {isRealtime && netOptions.enabled && netStatus && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'rgba(12,18,32,0.85)', border: '1px solid #2a3654', borderRadius: 8, fontFamily: 'system-ui, sans-serif', fontSize: 12, color: '#cfe3ff' }}
            title={netStatus.mode === 'online' ? `Server-authoritative · ${netStatus.rtt}ms RTT · ${netStatus.online} online` : 'Single-player (server unavailable)'}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: netStatus.mode === 'online' ? '#6cf0c2' : netStatus.mode === 'connecting' ? '#ffe9a8' : '#ff8d6c', boxShadow: netStatus.mode === 'online' ? '0 0 6px #6cf0c2' : 'none' }} />
            {netStatus.mode === 'online' ? `Online · ${netStatus.rtt}ms` : netStatus.mode === 'connecting' ? 'Connecting…' : 'Offline'}
          </div>
        )}
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
