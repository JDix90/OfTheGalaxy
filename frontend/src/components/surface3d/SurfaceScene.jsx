/**
 * SurfaceScene — the R3F scene graph for the walkable 3D planet surface.
 *
 * Phase 2 replaces the static lighting with the day-night <Atmosphere> rig and a
 * <PostFX> chain (N8AO + bloom + ACES tone-mapping + SMAA). The atmosphere writes a
 * shared night/day ref (AtmosphereContext) that POI point lights ramp against. The
 * host Canvas is `flat` so tone mapping happens once, in PostFX.
 *
 * NPC LOD: <NpcLOD> ranks NPCs by distance to the player a few times a second and
 * assigns each a tier (full / lod / proxy / hidden) — bounding the count of expensive
 * skinned-mesh + AnimationMixer instances on crowded planets, with hysteresis to avoid
 * boundary thrash.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import Ground from './Ground';
import SurfaceObstacles from './SurfaceObstacles';
import PoiStructure from './PoiStructure';
import NpcActor from './NpcActor';
import NpcProxies from './NpcProxies';
import PlayerActor from './PlayerActor';
import RemotePlayers from './RemotePlayers';
import RemoteEnemies from './RemoteEnemies';
import CombatFx from './CombatFx';
import QuestWaypoint from './QuestWaypoint';
import Weather, { getWeatherPreset } from './Weather';
import Atmosphere from './atmosphere/Atmosphere';
import DistantSkyline from './atmosphere/DistantSkyline';
import PostFX from './atmosphere/PostFX';
import { AtmosphereContext } from './atmosphere/AtmosphereContext';

const MAX_POINT_LIGHTS = 12;  // bound dynamic lights regardless of POI count

// --- NPC level-of-detail tuning (world units) ---
const MAX_ANIMATED_NPCS = 8;  // hard cap on skinned-mesh + mixer instances
const FULL_DIST = 26;         // animated at full mixer rate within this
const ANIM_DIST = 70;         // eligible to become animated within this
const ANIM_KEEP_DIST = 84;    // hysteresis: stay animated until beyond this
const LOD_PERIOD = 0.18;      // seconds between LOD re-evaluations (~5.5 Hz)
const MAX_LABELS = 14;        // cap on simultaneous proxy nameplates (DOM cost)
const LABEL_DIST = 36;        // only label proxies within this (world units)

// Exposes R3F's manual advance() for headless preview verification (rAF is paused on
// a hidden tab). Harmless during normal play.
function HeadlessHook() {
  const get = useThree((s) => s.get);
  useEffect(() => {
    if (typeof window !== 'undefined') window.__otg3d = get;
    return () => { if (typeof window !== 'undefined' && window.__otg3d === get) delete window.__otg3d; };
  }, [get]);
  return null;
}

// Ranks NPCs by distance to the player and assigns LOD tiers (throttled, ref-stable
// with hysteresis so incumbents keep their animated slots). Writes via onChange only
// when the tier map actually changes.
function NpcLOD({ npcs, world, worldHalf, tiersRef, labelsRef, onChange, onLabels }) {
  const acc = useRef(0);
  const cull = worldHalf * 2.4; // just inside the fog far plane

  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < LOD_PERIOD) return;
    acc.current = 0;
    const p = world.current && world.current.player;
    if (!p || npcs.length === 0) return;

    const arr = npcs.map((n) => ({ id: n.id, d: Math.hypot(n.wx - p.x, n.wz - p.z) }));
    arr.sort((a, b) => a.d - b.d);
    const prev = tiersRef.current;

    // Choose the animated set: keep eligible incumbents first (hysteresis), then fill
    // remaining slots with the nearest newcomers.
    const anim = new Set();
    for (const { id, d } of arr) {
      if (anim.size >= MAX_ANIMATED_NPCS) break;
      if ((prev[id] === 'full' || prev[id] === 'lod') && d < ANIM_KEEP_DIST) anim.add(id);
    }
    for (const { id, d } of arr) {
      if (anim.size >= MAX_ANIMATED_NPCS) break;
      if (!anim.has(id) && d < ANIM_DIST) anim.add(id);
    }

    const next = {};
    for (const { id, d } of arr) {
      if (anim.has(id)) next[id] = d < FULL_DIST ? 'full' : 'lod';
      else if (d < cull) next[id] = 'proxy';
      else next[id] = 'hidden';
    }

    let changed = Object.keys(next).length !== Object.keys(prev).length;
    if (!changed) { for (const id in next) { if (next[id] !== prev[id]) { changed = true; break; } } }
    if (changed) { tiersRef.current = next; onChange(next); }

    // Nearest-N label set (proxies render a nameplate only if labelled — bounds DOM).
    const nextLabels = new Set();
    for (const { id, d } of arr) {
      if (nextLabels.size >= MAX_LABELS || d > LABEL_DIST) break;
      nextLabels.add(id);
    }
    const prevLabels = labelsRef.current;
    let lChanged = nextLabels.size !== prevLabels.size;
    if (!lChanged) { for (const id of nextLabels) { if (!prevLabels.has(id)) { lChanged = true; break; } } }
    if (lChanged) { labelsRef.current = nextLabels; onLabels(nextLabels); }
  });

  return null;
}

export default function SurfaceScene({
  world, input, planet, pois, npcs3d, waypoints, activePoiId, textureUrl, worldHalf,
  onProximity, onMoved, onPoiActivate, onNpcActivate,
  time, cycleSeconds, startTime = 0.6, paused, onTime, postQuality = 'high', weather,
  combatTarget = null, onCombatTarget = () => {},
}) {
  const groundSize = worldHalf * 2;
  const atmoRef = useRef({ nightFactor: 0, dayFactor: 1, time: startTime });

  // Biome-driven weather preset (explicit `weather` prop overrides; 'none' disables).
  const weatherPreset = useMemo(() => weather ?? getWeatherPreset(planet), [weather, planet]);

  // Cap dynamic point lights: enterable + brightest-glow POIs win.
  const litIds = useMemo(() => {
    const ranked = [...pois].sort((a, b) =>
      (Number(b.enterable) - Number(a.enterable)) || ((b.structure.glow || 0) - (a.structure.glow || 0)));
    return new Set(ranked.slice(0, MAX_POINT_LIGHTS).map((p) => p.id));
  }, [pois]);

  // NPC LOD tiers (id -> 'full'|'lod'|'proxy'|'hidden'); default proxy avoids a
  // first-frame spike of mounting every NPC's glTF at once.
  const [npcTiers, setNpcTiers] = useState({});
  const tiersRef = useRef({});
  // Nearest-N ids that should show a nameplate (bounds DOM on crowds).
  const [npcLabels, setNpcLabels] = useState(() => new Set());
  const labelsRef = useRef(new Set());

  // Split NPCs by LOD tier: animated ones mount full glTF actors; the rest draw as a
  // single instanced-mesh crowd. Memoized so the arrays are stable between LOD changes.
  const { animatedNpcs, proxyNpcs } = useMemo(() => {
    const animatedNpcs = [], proxyNpcs = [];
    for (const n of npcs3d) {
      const t = npcTiers[n.id] || 'proxy';
      if (t === 'full' || t === 'lod') animatedNpcs.push(n);
      else if (t === 'proxy') proxyNpcs.push(n);
      // 'hidden' → not rendered
    }
    return { animatedNpcs, proxyNpcs };
  }, [npcs3d, npcTiers]);

  return (
    <AtmosphereContext.Provider value={atmoRef}>
      <Atmosphere
        worldHalf={worldHalf}
        time={time}
        cycleSeconds={cycleSeconds}
        startTime={startTime}
        paused={paused}
        atmoRef={atmoRef}
        onTime={onTime}
      />

      <Ground planet={planet} size={groundSize} textureUrl={textureUrl} />
      <SurfaceObstacles planet={planet} worldHalf={worldHalf} />
      <DistantSkyline worldHalf={worldHalf} />

      {pois.map((poi) => (
        <PoiStructure
          key={poi.id}
          poi={poi}
          active={poi.id === activePoiId}
          lit={litIds.has(poi.id)}
          onActivate={onPoiActivate}
        />
      ))}

      {animatedNpcs.map((npc) => (
        <NpcActor key={npc.id} npc3d={npc} tier={npcTiers[npc.id]} onActivate={onNpcActivate} />
      ))}
      <NpcProxies npcs={proxyNpcs} labelIds={npcLabels} onActivate={onNpcActivate} />

      {(waypoints || []).map((wp) => (
        <QuestWaypoint key={wp.id} wp={wp} />
      ))}
      <NpcLOD
        npcs={npcs3d} world={world} worldHalf={worldHalf}
        tiersRef={tiersRef} labelsRef={labelsRef} onChange={setNpcTiers} onLabels={setNpcLabels}
      />

      <PlayerActor world={world} input={input} pois={pois} onProximity={onProximity} onMoved={onMoved} />

      {/* Other players sharing the planet (Phase 4.1 — online only). */}
      <RemotePlayers world={world} />

      {/* Server-driven hostile actors (Phase 4.2/4.3 — online only). */}
      <RemoteEnemies world={world} targetId={combatTarget} onTarget={onCombatTarget} />
      <CombatFx world={world} targetId={combatTarget} onClearTarget={() => onCombatTarget(null)} />

      {weatherPreset && weatherPreset !== 'none' && (
        <Weather preset={weatherPreset} world={world} worldHalf={worldHalf} />
      )}

      <PostFX quality={postQuality} />
      <HeadlessHook />
    </AtmosphereContext.Provider>
  );
}
