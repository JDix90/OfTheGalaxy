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
import { galaxyApi } from '../services/api/galaxyApi';
import { npcApi } from '../services/api/npcApi';
import subMapApi from '../services/api/subMapApi';
import { combatApi } from '../services/api/combatApi';
import { generateProceduralMap } from '../services/mapGenerator';
import { assetManager } from '../services/assetManager';

import { createSurfaceSim, DEFAULTS } from '../../../shared/sim/surface.mjs';
import { CHARACTER_GLTF_URLS } from '../data/modelManifest';
import { useSurfaceWorld } from '../world/useSurfaceWorld';
import { useSurfaceInput } from '../components/surface3d/useSurfaceInput';
import SurfaceScene from '../components/surface3d/SurfaceScene';
import { buildPois, buildNpcs, isDungeon, deriveSubMapType } from '../components/surface3d/surfaceData';

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
  const worldRef = useSurfaceWorld(planet, sim);
  const input = useSurfaceInput(inputEnabledRef);

  const pois = useMemo(() => buildPois(planet, sim), [planet, sim]);
  const npcs3d = useMemo(() => buildNpcs(npcs, sim), [npcs, sim]);

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
            activePoiId={activePoiId}
            textureUrl={textureUrl}
            worldHalf={sim.worldHalf}
            startTime={0.55}
            cycleSeconds={600}
            postQuality="high"
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

      {/* Onboarding / tutorial overlay (rendered per-page; the surface is the 3D scene now). */}
      <TutorialOverlay />

      {/* Top-right controls */}
      <div style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 8, zIndex: 50 }}>
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
