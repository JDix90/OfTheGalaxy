/**
 * PlanetSurface3D — the walkable, lit 3D planet surface (Phase 1).
 *
 * Reuses OtG's existing domain wholesale: the same planet `mapData`, NPC API, submap
 * routing, encounter flow, character store + position persistence, and the existing
 * React overlay panels (HUD, SubMapEntryMenu, POIInteractionMenu, NPCInteractionMenu,
 * DialogueInterface, EncounterDialog). The 3D layer is purely a new *presentation +
 * real-time movement* over that domain, built on the authoritative-ready seam
 * (shared surface sim + useSurfaceWorld). Coexists with the 2D PlanetSurface.
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

import { useCharacterStore } from '../state/characterSlice';
import { useCombatStore } from '../state/combatSlice';
import { useQuestStore } from '../state/questSlice';
import { tutorialEventBus, TUTORIAL_EVENTS } from '../services/tutorialEventBus';
import { galaxyApi } from '../services/api/galaxyApi';
import { npcApi } from '../services/api/npcApi';
import subMapApi from '../services/api/subMapApi';
import { combatApi } from '../services/api/combatApi';
import { generateProceduralMap } from '../services/mapGenerator';
import { assetManager } from '../services/assetManager';

import { createSurfaceSim, DEFAULTS } from '../../../shared/sim/surface.mjs';
import { CHARACTER_GLTF_URLS } from '../data/modelManifest';
import { useSurfaceWorld } from '../world/useSurfaceWorld';
import { getAuthToken } from '../services/api/client';
import { useSurfaceInput } from '../components/surface3d/useSurfaceInput';
import SurfaceScene from '../components/surface3d/SurfaceScene';
import { buildPois, buildNpcs, buildQuestWaypoints, isDungeon, deriveSubMapType } from '../components/surface3d/surfaceData';

import HUD from '../components/hud/HUD';
import SubMapEntryMenu from '../components/submap/SubMapEntryMenu';
import POIInteractionMenu from '../components/poi/POIInteractionMenu';
import NPCInteractionMenu from '../components/npc/NPCInteractionMenu';
import DialogueInterface from '../features/dialogue/DialogueInterface';
import EncounterDialog from '../components/encounter/EncounterDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import TutorialOverlay from '../components/tutorial/TutorialOverlay';

useGLTF.preload(CHARACTER_GLTF_URLS[0]);

export default function PlanetSurface3D() {
  const { planetId } = useParams();
  const navigate = useNavigate();
  const { currentCharacter } = useCharacterStore();
  const { startEncounter } = useCombatStore();
  const activeQuests = useQuestStore((s) => s.activeQuests);

  const [planet, setPlanet] = useState(null);
  const [npcs, setNpcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [textureUrl, setTextureUrl] = useState(null);

  // Interaction state
  const [activePoiId, setActivePoiId] = useState(null);
  const [proxMenu, setProxMenu] = useState(null);   // { subMap, x, y } (passive prompt)
  const [poiMenu, setPoiMenu] = useState(null);     // { poi, x, y } (click; modal)
  const [npcMenu, setNpcMenu] = useState(null);     // { npc, x, y } (click; modal)
  const [selectedNPC, setSelectedNPC] = useState(null);
  const [encounter, setEncounter] = useState(null); // { enemies, planetDangerLevel, enemyCount }

  const lastEncounterRef = useRef(0);
  const inputEnabledRef = useRef(true);

  // --- sim + world seam ---
  const sim = useMemo(
    () => (planet ? createSurfaceSim(planet.mapData || {}, { scale: DEFAULTS.scale }) : null),
    [planet?.id], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Phase 4: authoritative real-time net (with offline fallback). Opt out via VITE_REALTIME=false.
  const [netStatus, setNetStatus] = useState({ mode: 'connecting', online: 0, rtt: 0 });
  const netOptions = useMemo(() => ({
    enabled: import.meta.env.VITE_REALTIME !== 'false',
    token: getAuthToken(),
    characterId: currentCharacter?.id,
    onStatus: setNetStatus,
  }), [currentCharacter?.id]);
  const worldRef = useSurfaceWorld(planet, sim, netOptions);

  // Combat HUD state (Phase 4.3/4.4) — polled from the authoritative net world.
  const [combat, setCombat] = useState(null);   // { hp, maxHp, dead } | null
  const [hotbar, setHotbar] = useState([]);     // ability bar
  const [cdSnap, setCdSnap] = useState({});     // ability id → ms-ready
  const [log, setLog] = useState([]);           // combat log lines
  const [combatTarget, setCombatTarget] = useState(null); // soft-target enemy id (Phase 4.4)
  useEffect(() => {
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
  }, [worldRef]);
  const input = useSurfaceInput(inputEnabledRef);

  // Combat keybinds (Phase 4.4): 1–9 cast hotbar abilities at the soft-target, Space dodges.
  const targetRef = useRef(null);
  useEffect(() => { targetRef.current = combatTarget; }, [combatTarget]);
  // Cast an ability, validating an enemy target client-side first so we don't start a
  // local cooldown for a cast the server will reject (no/dead target).
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
      if (!w || !inputEnabledRef.current) return; // not while a menu/modal is open
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

  const pois = useMemo(() => buildPois(planet, sim), [planet, sim]);
  const npcs3d = useMemo(() => buildNpcs(npcs, sim), [npcs, sim]);
  const waypoints = useMemo(
    () => buildQuestWaypoints(activeQuests, planet?.id, sim, currentCharacter?.currentLocation?.area),
    [activeQuests, planet?.id, sim, currentCharacter?.currentLocation?.area],
  );

  // Modal menus block movement; the passive proximity prompt does not.
  const modalOpen = !!(poiMenu || npcMenu || selectedNPC || encounter);
  useEffect(() => {
    inputEnabledRef.current = !modalOpen;
    if (modalOpen) {
      const i = input.current;
      i.f = i.b = i.l = i.r = i.run = i.qLeft = i.qRight = 0;
    }
  }, [modalOpen, input]);

  // --- data load ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setError(null);
        const res = await galaxyApi.getPlanet(planetId);
        if (!res?.success || !res.data) throw new Error('Planet not found');
        const p = res.data;
        if (!p.mapData) p.mapData = generateProceduralMap(p);
        if (cancelled) return;
        setPlanet(p);

        // Resolve the aerial ground texture (best-effort).
        assetManager.getTextureFilename(p.id).then((file) => {
          if (!cancelled && file) setTextureUrl(`/assets/textures/planets/${file}`);
        }).catch(() => {});

        // NPCs (surface-level only); generate if none exist (mirrors 2D surface).
        try {
          let list = [];
          const r1 = await npcApi.getByLocation(planetId);
          if (r1?.success && Array.isArray(r1.data)) {
            list = r1.data.filter((n) => !n.location?.subMapId);
          }
          if (list.length === 0) {
            const gen = await npcApi.generateForPlanet(planetId);
            if (gen?.success && Array.isArray(gen.data)) list = gen.data;
          }
          if (!cancelled) setNpcs(list);
        } catch (e) {
          if (!cancelled) setNpcs([]);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load planet');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [planetId]);

  // --- interaction handlers ---
  const onProximity = useCallback((hit) => {
    if (!hit) {
      setActivePoiId(null);
      setProxMenu(null);
      return;
    }
    const { poi, x, y } = hit;
    setActivePoiId(poi.id);
    setProxMenu({
      subMap: {
        id: `virtual_${poi.id}`,
        name: poi.name,
        type: deriveSubMapType(poi.raw),
        parentLocationId: poi.raw.id || poi.raw.name || poi.id,
        parentLocationType: isDungeon(poi.raw) ? (poi.type || 'poi') : 'poi',
      },
      x, y,
    });
  }, []);

  const onPoiActivate = useCallback((poi, e) => {
    const ne = e?.nativeEvent || e;
    setProxMenu(null);
    setNpcMenu(null);
    setPoiMenu({ poi: poi.raw, x: ne?.clientX ?? window.innerWidth / 2, y: ne?.clientY ?? window.innerHeight / 2 });
  }, []);

  const onNpcActivate = useCallback((npc, e) => {
    const ne = e?.nativeEvent || e;
    setPoiMenu(null);
    setNpcMenu({ npc: npc.raw, x: ne?.clientX ?? window.innerWidth / 2, y: ne?.clientY ?? window.innerHeight / 2 });
  }, []);

  const onMoved = useCallback(async (surfacePos) => {
    const ch = useCharacterStore.getState().currentCharacter;
    if (!ch || !planet || encounter) return;

    // Quest objective proximity → fire the tutorial/quest "reached" event (mirrors the 2D
    // surface). Cheap, runs on the throttled move report; the visual beacons come from
    // buildQuestWaypoints.
    const aq = useQuestStore.getState().activeQuests;
    if (aq && aq.length) {
      for (const { quest, progress } of aq) {
        if (!quest?.objectives) continue;
        for (const objective of quest.objectives) {
          if (progress?.objectivesCompleted?.[objective.id]) continue;
          const loc = objective.location;
          if (!loc || loc.planet !== planet.id) continue;
          const d = Math.hypot(surfacePos.x - (loc.x || 0), surfacePos.y - (loc.y || 0));
          if (d < 5) {
            tutorialEventBus.emit(TUTORIAL_EVENTS.QUEST_OBJECTIVE_LOCATION_REACHED, {
              characterId: ch.id, questId: quest.id, objectiveId: objective.id,
              objectiveType: objective.type, location: 'planet_surface', planetId: planet.id,
            });
          }
        }
      }
    }

    const now = Date.now();
    if (now - lastEncounterRef.current < 2500) return;
    lastEncounterRef.current = now;
    try {
      const r = await combatApi.checkEncounter(
        ch.id, planet.id, planet.dangerLevel || 1,
        { x: surfacePos.x, y: surfacePos.y, area: 'surface' },
      );
      const result = r?.data || r;
      if (result?.shouldTrigger) {
        setEncounter({
          enemies: result.enemies || ['ironclad'],
          planetDangerLevel: result.planetDangerLevel || planet.dangerLevel || 1,
          enemyCount: result.enemies?.length || result.enemyCount || 1,
        });
      }
    } catch (e) { /* ignore */ }
  }, [planet, encounter]);

  const handleFight = useCallback(async () => {
    const ch = useCharacterStore.getState().currentCharacter;
    if (!ch || !encounter) return;
    const surf = worldRef.current?.getSurfacePos?.() || { x: 50, y: 50 };
    try {
      const enc = await startEncounter(ch.id, 'random', encounter.enemies);
      const id = enc?.id || enc?.encounter?.id || enc?.data?.id;
      setEncounter(null);
      if (id) {
        navigate(`/game/combat/${id}`, {
          state: { returnLocation: { planetId: planet.id, location: { x: surf.x, y: surf.y, area: 'surface' } } },
        });
      }
    } catch (e) {
      setEncounter(null);
    }
  }, [encounter, navigate, planet, startEncounter, worldRef]);

  if (!currentCharacter) { navigate('/character/select'); return null; }

  if (loading) return <LoadingSpinner fullScreen message="Descending to surface..." />;
  if (error) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: '#05070f', color: '#e6eefc' }}>
        <div style={{ textAlign: 'center' }}>
          <p>{error}</p>
          <button onClick={() => navigate('/game/galaxy')} style={btnStyle}>Back to galaxy</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#05070f', overflow: 'hidden' }}>
      <Canvas
        shadows
        flat
        dpr={[1, 2]}
        camera={{ position: [0, 12, 22], fov: 55, near: 0.1, far: 1200 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      >
        {sim && (
          <SurfaceScene
            world={worldRef}
            input={input}
            planet={planet}
            pois={pois}
            npcs3d={npcs3d}
            waypoints={waypoints}
            activePoiId={activePoiId}
            textureUrl={textureUrl}
            worldHalf={sim.worldHalf}
            startTime={0.55}
            cycleSeconds={600}
            postQuality="high"
            combatTarget={combatTarget}
            onCombatTarget={setCombatTarget}
            onProximity={onProximity}
            onMoved={onMoved}
            onPoiActivate={onPoiActivate}
            onNpcActivate={onNpcActivate}
          />
        )}
      </Canvas>

      {/* DOM overlays (the brief's "UI as overlay, not rebuilt in 3D") */}
      <HUD />

      {proxMenu && !modalOpen && (
        <SubMapEntryMenu
          subMap={proxMenu.subMap}
          planet={planet}
          isOpen
          onClose={() => { setProxMenu(null); setActivePoiId(null); }}
          position={{ x: proxMenu.x, y: proxMenu.y }}
        />
      )}

      {poiMenu && (
        <POIInteractionMenu
          poi={poiMenu.poi}
          planet={planet}
          isOpen
          onClose={() => setPoiMenu(null)}
          position={{ x: poiMenu.x, y: poiMenu.y }}
        />
      )}

      {npcMenu && (
        <NPCInteractionMenu
          npc={npcMenu.npc}
          planet={planet}
          isOpen
          onClose={() => setNpcMenu(null)}
          onTalk={() => { setSelectedNPC(npcMenu.npc); setNpcMenu(null); }}
          position={{ x: npcMenu.x, y: npcMenu.y }}
        />
      )}

      {selectedNPC && !npcMenu && (
        <DialogueInterface npc={selectedNPC} onClose={() => setSelectedNPC(null)} />
      )}

      <EncounterDialog
        isOpen={!!encounter}
        enemyCount={encounter?.enemyCount || 1}
        planetDangerLevel={encounter?.planetDangerLevel || 1}
        canFlee
        onFight={handleFight}
        onFlee={() => setEncounter(null)}
      />

      {/* Combat HUD (Phase 4.3/4.4) — health bar + ability hotbar (online only). */}
      {combat && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 45, fontFamily: 'system-ui, sans-serif', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {/* ability hotbar */}
          {hotbar.length > 0 && (
            <div style={{ display: 'flex', gap: 6 }}>
              {hotbar.slice(0, 9).map((ab, i) => {
                const ready = (cdSnap[ab.id] || 0) <= Date.now();
                const cdLeft = Math.max(0, ((cdSnap[ab.id] || 0) - Date.now()) / 1000);
                const accent = ab.type === 'heal' ? '#6cf0c2' : ab.type === 'buff' ? '#ffd24a' : ab.type === 'debuff' ? '#d18cff' : '#ff8d6c';
                return (
                  <button key={ab.id} title={`${ab.name} (${ab.stam} stamina)`}
                    onClick={() => castAbility(ab)}
                    style={{ position: 'relative', width: 48, height: 48, borderRadius: 8, background: 'rgba(10,15,28,0.92)', border: `1px solid ${ready ? accent : '#2a3654'}`, color: ready ? '#e6eefc' : '#6f7c98', cursor: 'pointer', overflow: 'hidden', fontFamily: 'system-ui' }}>
                    <div style={{ position: 'absolute', top: 2, left: 4, fontSize: 10, color: '#8aa0c4' }}>{i + 1}</div>
                    <div style={{ fontSize: 9, lineHeight: 1.05, padding: '14px 3px 0', fontWeight: 600 }}>{ab.name.replace(/ (Mastery|Insight)$/, '')}</div>
                    {!ready && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,6,12,0.66)', display: 'grid', placeItems: 'center', color: '#cfe3ff', fontWeight: 700, fontSize: 14 }}>{cdLeft.toFixed(1)}</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {/* health bar */}
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

      {/* Combat log (Phase 4.4) */}
      {combat && log.length > 0 && (
        <div style={{ position: 'fixed', bottom: 20, right: 16, width: 210, maxHeight: 140, overflow: 'hidden', zIndex: 44, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, lineHeight: 1.5, pointerEvents: 'none' }}>
          {log.map((l, i) => (
            <div key={l.t + '_' + i} style={{ color: '#aebbd6', opacity: 0.55 + (i / log.length) * 0.45, textShadow: '0 1px 2px #000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.line}{l.count > 1 ? ` ×${l.count}` : ''}</div>
          ))}
        </div>
      )}
      {combat && combat.dead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(24,4,6,0.5)', display: 'grid', placeItems: 'center', zIndex: 60, pointerEvents: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ff8a7a', fontFamily: 'system-ui, sans-serif', fontSize: 44, fontWeight: 800, textShadow: '0 2px 14px #000' }}>Defeated</div>
            <div style={{ color: '#cfe3ff', fontFamily: 'system-ui, sans-serif', fontSize: 14, marginTop: 6, textShadow: '0 1px 4px #000' }}>respawning…</div>
          </div>
        </div>
      )}

      {/* Onboarding / tutorial overlay (rendered per-page; the surface is the 3D scene now). */}
      <TutorialOverlay />

      {/* Top-right controls */}
      <div style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 8, alignItems: 'center', zIndex: 50 }}>
        {netOptions.enabled && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
            background: 'rgba(12,18,32,0.85)', border: '1px solid #2a3654', borderRadius: 8,
            fontFamily: 'system-ui, sans-serif', fontSize: 12, color: '#cfe3ff',
          }} title={netStatus.mode === 'online' ? `Server-authoritative · ${netStatus.rtt}ms RTT · ${netStatus.online} online` : 'Single-player (server unavailable)'}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: netStatus.mode === 'online' ? '#6cf0c2' : netStatus.mode === 'connecting' ? '#ffe9a8' : '#ff8d6c',
              boxShadow: netStatus.mode === 'online' ? '0 0 6px #6cf0c2' : 'none',
            }} />
            {netStatus.mode === 'online' ? `Online · ${netStatus.rtt}ms` : netStatus.mode === 'connecting' ? 'Connecting…' : 'Offline'}
          </div>
        )}
        <button style={btnStyle} onClick={() => navigate('/game/galaxy')}>Galaxy</button>
      </div>

      {/* Controls hint */}
      <div style={{
        position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        padding: '8px 14px', background: 'rgba(8,12,22,0.72)', border: '1px solid #1d2742',
        borderRadius: 8, color: '#9fb3d1', fontFamily: 'system-ui, sans-serif', fontSize: 12,
        pointerEvents: 'none', zIndex: 40, whiteSpace: 'nowrap',
      }}>
        <b style={{ color: '#cfe3ff' }}>WASD</b> move · <b style={{ color: '#cfe3ff' }}>Shift</b> run ·{' '}
        <b style={{ color: '#cfe3ff' }}>Q/E</b> or <b style={{ color: '#cfe3ff' }}>drag</b> turn ·{' '}
        walk up to a glowing site to enter · click an NPC to talk
      </div>
    </div>
  );
}

const btnStyle = {
  padding: '7px 12px', background: 'rgba(12,18,32,0.85)', color: '#cfe3ff',
  border: '1px solid #2a3654', borderRadius: 8, cursor: 'pointer',
  fontFamily: 'system-ui, sans-serif', fontSize: 13,
};
