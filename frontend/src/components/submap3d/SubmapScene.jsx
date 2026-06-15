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
import QuestWaypoint from '../surface3d/QuestWaypoint';
import Atmosphere from '../surface3d/atmosphere/Atmosphere';
import PostFX from '../surface3d/atmosphere/PostFX';
import { AtmosphereContext } from '../surface3d/atmosphere/AtmosphereContext';
import ExitMarker from './ExitMarker';
import InteriorWalls from './InteriorWalls';
import Furniture from './Furniture';

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
}) {
  const groundSize = worldHalf * 2;
  const atmoRef = useRef({ nightFactor: 0, dayFactor: 1, time: startTime });

  // Exits double as enterable POIs so PlayerActor's proximity prompt reuse works.
  const proximityPois = useMemo(() => ([
    ...pois,
    ...exits.map((e) => ({ ...e, enterable: true, _isExit: true, structure: { height: 3.2, footprint: 3, emissive: '#6cf0c2' } })),
  ]), [pois, exits]);

  return (
    <AtmosphereContext.Provider value={atmoRef}>
      <Atmosphere worldHalf={worldHalf} time={startTime} startTime={startTime} paused atmoRef={atmoRef} />
      <Ground planet={planetLike} size={groundSize} />

      {interior && <InteriorWalls subMap={subMap} sim={sim} />}
      {interior && <Furniture items={furniture} />}

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

      <PostFX quality={postQuality} />
      <HeadlessHook />
    </AtmosphereContext.Provider>
  );
}
