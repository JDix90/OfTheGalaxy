/**
 * SubmapScene — the R3F scene for a walkable 3D submap interior (Phase 5).
 *
 * Reuses the surface3d kit wholesale (Atmosphere day-night rig, PostFX, Ground,
 * PoiStructure buildings, NpcActor, PlayerActor, QuestWaypoint) over a submap-scoped
 * LocalWorld. Adds ExitMarker portals. No NPC LOD (interiors are small) and no realtime
 * net layer (submaps are single-player; combat flows through the existing encounter path).
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import Ground from '../surface3d/Ground';
import PoiStructure from '../surface3d/PoiStructure';
import NpcActor from '../surface3d/NpcActor';
import PlayerActor from '../surface3d/PlayerActor';
import RemotePlayers from '../surface3d/RemotePlayers';
import RemoteEnemies from '../surface3d/RemoteEnemies';
import CrowdActors from '../surface3d/CrowdActors';
import CombatFx from '../surface3d/CombatFx';
import Weather from '../surface3d/Weather';
import QuestWaypoint from '../surface3d/QuestWaypoint';
import Atmosphere from '../surface3d/atmosphere/Atmosphere';
import DistantSkyline from '../surface3d/atmosphere/DistantSkyline';
import PostFX from '../surface3d/atmosphere/PostFX';
import { AtmosphereContext } from '../surface3d/atmosphere/AtmosphereContext';
import ExitMarker from './ExitMarker';
import InteriorWalls from './InteriorWalls';
import SubmapProps from './SubmapProps';
import SubmapCrowd from './SubmapCrowd';
import SubmapEnclosure from './SubmapEnclosure';
import { getSubmapTheme } from './submapThemes';
import { buildSubmapProps } from './submapData';

// Cap on per-POI accent point lights so a roomful never blows the shared MAX_POINT_LIGHTS budget.
const MAX_ACCENT_LIGHTS = 6;

function HeadlessHook() {
  const get = useThree((s) => s.get);
  useEffect(() => {
    if (typeof window !== 'undefined') window.__otg3d = get;
    return () => { if (typeof window !== 'undefined' && window.__otg3d === get) delete window.__otg3d; };
  }, [get]);
  return null;
}

export default function SubmapScene({
  world, input, planetLike, pois, exits, npcs3d, waypoints, activePoiId, worldHalf,
  onProximity, onMoved, onPoiActivate, onNpcActivate, onExitActivate,
  subMap, sim, interior = false,
  startTime = 0.4, postQuality = 'high',
  realtime = false, combatTarget = null, onCombatTarget = () => {}, focus = null,
}) {
  const groundSize = worldHalf * 2;
  const atmoRef = useRef({ nightFactor: 0, dayFactor: 1, time: startTime });

  // Per-POI-type theme (palette + lighting). Drives the enclosure, ground tint, fog, and the
  // per-POI accent lights — the submap analogue of the surface's biome look.
  const theme = useMemo(() => getSubmapTheme(subMap), [subMap]);
  const lit = theme.lighting;

  // How the boundary reads: building interiors keep their own (5.2) room shell + daylight;
  // clinics/civic become enclosed roofed rooms; everything else is an open-air district ringed
  // by compound walls. The theme owns enclosed vs open via `lighting.mode`.
  const isEnclosed = !interior && lit.mode === 'enclosed';
  // Enclosed rooms render at "night" so the global sun never floods through the ceiling; the
  // room is lit by its ceiling strips, fill, and POI lights (which rise at night).
  const atmoTime = isEnclosed ? 0.02 : startTime;
  // Accent point lights for the nearest enterable POIs (capped), tinted by the theme so each
  // structure casts a soft in-character glow. Sorted by distance to the concourse centre.
  const accentPois = useMemo(() => (
    [...pois].sort((a, b) => (a.wx * a.wx + a.wz * a.wz) - (b.wx * b.wx + b.wz * b.wz)).slice(0, MAX_ACCENT_LIGHTS)
  ), [pois]);

  // Themed dressing: biobeds/stalls/cargo/etc. derived from the layout + theme (replaces the bare
  // boxes; zone-derived props furnish the otherwise-empty clinic/market).
  const propData = useMemo(() => buildSubmapProps(subMap, sim, theme), [subMap, sim, theme]);

  // Exits double as enterable POIs so PlayerActor's proximity prompt reuse works.
  const proximityPois = useMemo(() => ([
    ...pois,
    ...exits.map((e) => ({ ...e, enterable: true, _isExit: true, structure: { height: 3.2, footprint: 3, emissive: '#6cf0c2' } })),
  ]), [pois, exits]);

  return (
    <AtmosphereContext.Provider value={atmoRef}>
      <Atmosphere
        worldHalf={worldHalf} time={atmoTime} startTime={atmoTime} paused atmoRef={atmoRef}
        fogNear={isEnclosed ? 0.7 : 0.85} fogFar={isEnclosed ? 2.0 : 2.0}
        fogColor={isEnclosed ? (lit.fog || '#9aa6bc') : (lit.fog || null)}
      />
      <Ground planet={planetLike} size={groundSize} colorOverride={theme.palette.floor} />
      {/* Open-air districts (spaceport/city) get the distant animated skyline so the edge reads
          as a continued world, not a blank slab. Enclosed rooms keep their walls/ceiling. */}
      {!interior && !isEnclosed && <DistantSkyline worldHalf={worldHalf} />}
      {!interior && <SubmapEnclosure sim={sim} theme={theme} />}

      {interior && <InteriorWalls subMap={subMap} sim={sim} />}
      {/* Themed props dress both enclosed interiors and open districts (spaceport concourse). */}
      <SubmapProps data={propData} theme={theme} />

      {/* Building interiors keep their own InteriorWalls shell (no enclosure), so give them a
          themed fill so a home reads warm/cozy instead of flat daylight. */}
      {interior && (
        <hemisphereLight args={[lit.hemiSky, lit.hemiGround, lit.hemiInt ?? 0.5]} />
      )}

      {/* A soft always-on accent over the nearest few structures (theme-tinted) so each POI casts
          an in-character glow — bright concourse, warm market stall, cold clinic console. Capped
          to respect the shared point-light budget; the rest rely on emissive + bloom. */}
      {accentPois.map((poi) => (
        <pointLight key={`acc_${poi.id}`} position={[poi.wx, 3.4, poi.wz]} intensity={0.55} distance={15} decay={2} color={theme.palette.accent} />
      ))}

      {pois.map((poi) => (
        <PoiStructure key={poi.id} poi={poi} active={poi.id === activePoiId} lit onActivate={onPoiActivate} />
      ))}

      {exits.map((e) => (
        <ExitMarker key={e.id} exit={e} active={e.id === activePoiId} onActivate={onExitActivate} />
      ))}

      {npcs3d.map((npc) => (
        <NpcActor key={npc.id} npc3d={npc} tier="full" onActivate={onNpcActivate} />
      ))}

      {(waypoints || []).map((wp) => <QuestWaypoint key={wp.id} wp={wp} />)}

      {/* Interior atmosphere — faint motes / steam / embers so the air isn't dead. Small, slow
          fields tuned per theme (Weather PRESETS) and kept under the ceiling for enclosed rooms. */}
      {theme.particle && <Weather preset={theme.particle.preset} world={world} worldHalf={worldHalf} />}

      {/* Ambient wandering crowd (offline submaps): patients/shoppers/travelers give the space life.
          Gated off when realtime (the spaceport keeps its server-authoritative CrowdActors below). */}
      {!realtime && theme.crowd && theme.crowd.flavor !== 'none' && (
        <SubmapCrowd world={world} sim={sim} theme={theme} />
      )}

      <PlayerActor world={world} input={input} pois={proximityPois} onProximity={onProximity} onMoved={onMoved} focus={focus} />

      {/* Real-time hub submaps (spaceport): server-driven players + hostiles + combat fx,
          reusing the surface/dungeon net-combat leaf components over the submap NetWorld. */}
      {realtime && (
        <>
          <RemotePlayers world={world} />
          <RemoteEnemies world={world} targetId={combatTarget} onTarget={onCombatTarget} />
          <CrowdActors world={world} />
          <CombatFx world={world} targetId={combatTarget} onClearTarget={() => onCombatTarget(null)} />
        </>
      )}

      <PostFX quality={postQuality} />
      <HeadlessHook />
    </AtmosphereContext.Provider>
  );
}
