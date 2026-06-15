/**
 * DungeonScene — the R3F scene for a walkable 3D dungeon (Phase 5.1).
 *
 * Dark, torch-lit interior built from the dungeon grid (DungeonWalls). Reuses the P4
 * net-combat leaf components (RemotePlayers, RemoteEnemies, CombatFx, PlayerActor) over a
 * dungeon NetWorld, so real-time server-resolved combat works exactly as on the surface.
 * No day-night sky (it's an interior): low ambient + a player torch + PostFX bloom.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import Ground from '../surface3d/Ground';
import PlayerActor from '../surface3d/PlayerActor';
import RemotePlayers from '../surface3d/RemotePlayers';
import RemoteEnemies from '../surface3d/RemoteEnemies';
import CombatFx from '../surface3d/CombatFx';
import QuestWaypoint from '../surface3d/QuestWaypoint';
import PostFX from '../surface3d/atmosphere/PostFX';
import ExitMarker from './ExitMarker';
import DungeonWalls from './DungeonWalls';

function HeadlessHook() {
  const get = useThree((s) => s.get);
  useEffect(() => {
    if (typeof window !== 'undefined') window.__otg3d = get;
    return () => { if (typeof window !== 'undefined' && window.__otg3d === get) delete window.__otg3d; };
  }, [get]);
  return null;
}

// A warm torch that follows the player — the dungeon's primary light.
function PlayerTorch({ world }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    const p = world.current && world.current.player;
    if (p && ref.current) {
      ref.current.position.set(p.x, 4.2, p.z);
      ref.current.intensity = 20 + Math.sin(clock.elapsedTime * 7) * 2; // soft flicker
    }
  });
  return <pointLight ref={ref} color="#ffd29a" intensity={20} distance={30} decay={2} castShadow />;
}

export default function DungeonScene({
  world, input, subMap, sim, exits, waypoints, activePoiId, worldHalf,
  onProximity, onMoved, onExitActivate, combatTarget = null, onCombatTarget = () => {}, postQuality = 'high',
}) {
  const groundSize = worldHalf * 2;
  const proximityPois = useMemo(() => exits.map((e) => ({ ...e, enterable: true, _isExit: true, structure: { height: 3.2, footprint: 3, emissive: '#6cf0c2' } })), [exits]);

  return (
    <>
      <ambientLight intensity={0.12} color="#3a4a6a" />
      <hemisphereLight args={['#2a3550', '#0a0c14', 0.25]} />
      <PlayerTorch world={world} />
      <fog attach="fog" args={['#05060c', worldHalf * 0.4, worldHalf * 1.9]} />

      <Ground planet={{ terrain: 'rocky' }} size={groundSize} />
      <DungeonWalls subMap={subMap} sim={sim} />

      {exits.map((e) => (
        <ExitMarker key={e.id} exit={e} active={e.id === activePoiId} onActivate={onExitActivate} />
      ))}
      {(waypoints || []).map((wp) => <QuestWaypoint key={wp.id} wp={wp} />)}

      <PlayerActor world={world} input={input} pois={proximityPois} onProximity={onProximity} onMoved={onMoved} />
      <RemotePlayers world={world} />
      <RemoteEnemies world={world} targetId={combatTarget} onTarget={onCombatTarget} />
      <CombatFx world={world} targetId={combatTarget} onClearTarget={() => onCombatTarget(null)} />

      <PostFX quality={postQuality} />
      <HeadlessHook />
    </>
  );
}
