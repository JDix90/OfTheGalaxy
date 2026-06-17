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
import CombatFx from '../surface3d/CombatFx';
import QuestWaypoint from '../surface3d/QuestWaypoint';
import Atmosphere from '../surface3d/atmosphere/Atmosphere';
import DistantSkyline from '../surface3d/atmosphere/DistantSkyline';
import PostFX from '../surface3d/atmosphere/PostFX';
import { AtmosphereContext } from '../surface3d/atmosphere/AtmosphereContext';
import ExitMarker from './ExitMarker';
import InteriorWalls from './InteriorWalls';
import Furniture from './Furniture';
import SubmapEnclosure from './SubmapEnclosure';

// Facility submaps that should read as enclosed interiors (walls + ceiling), not open-air.
const ENCLOSED_TYPES = new Set(['medical_center', 'hospital', 'civic', 'government', 'temple']);

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
  subMap, sim, furniture, interior = false,
  startTime = 0.4, postQuality = 'high',
  realtime = false, combatTarget = null, onCombatTarget = () => {},
}) {
  const groundSize = worldHalf * 2;
  const atmoRef = useRef({ nightFactor: 0, dayFactor: 1, time: startTime });

  // How the boundary reads: building interiors keep their own (5.2) room shell + daylight;
  // clinics/civic become enclosed roofed rooms; everything else is an open-air district ringed
  // by compound walls. Only the enclosed/open facility submaps get the SubmapEnclosure shell.
  const enclosureMode = ENCLOSED_TYPES.has(subMap?.type) ? 'enclosed' : 'open';
  const isEnclosed = !interior && enclosureMode === 'enclosed';
  // Enclosed rooms render at "night" so the global sun never floods through the ceiling; the
  // room is lit by its ceiling strips, fill, and POI lights (which rise at night).
  const atmoTime = isEnclosed ? 0.02 : startTime;

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
        fogColor={isEnclosed ? '#9aa6bc' : null}
      />
      <Ground planet={planetLike} size={groundSize} />
      {/* Open-air districts (spaceport/city) get the distant animated skyline so the edge reads
          as a continued world, not a blank slab. Enclosed rooms keep their walls/ceiling. */}
      {!interior && !isEnclosed && <DistantSkyline worldHalf={worldHalf} />}
      {!interior && <SubmapEnclosure sim={sim} mode={enclosureMode} />}

      {interior && <InteriorWalls subMap={subMap} sim={sim} />}
      {/* Furniture/props dress both enclosed interiors and open districts (spaceport concourse). */}
      {furniture && furniture.length > 0 && <Furniture items={furniture} />}

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

      <PlayerActor world={world} input={input} pois={proximityPois} onProximity={onProximity} onMoved={onMoved} />

      {/* Real-time hub submaps (spaceport): server-driven players + hostiles + combat fx,
          reusing the surface/dungeon net-combat leaf components over the submap NetWorld. */}
      {realtime && (
        <>
          <RemotePlayers world={world} />
          <RemoteEnemies world={world} targetId={combatTarget} onTarget={onCombatTarget} />
          <CombatFx world={world} targetId={combatTarget} onClearTarget={() => onCombatTarget(null)} />
        </>
      )}

      <PostFX quality={postQuality} />
      <HeadlessHook />
    </AtmosphereContext.Provider>
  );
}
