/**
 * RemotePlayers — renders other players sharing the planet (Phase 4.1 presence).
 *
 * Reads the live remote map from the net client (world._net.remotes), which is written by
 * authoritative snapshots. Each remote is a character (the player robot, tinted by the
 * server-assigned color) whose position/facing are INTERPOLATED prev→current over the
 * snapshot window (no prediction — remotes are display-only), with a nameplate.
 *
 * Only present when online; offline/single-player renders nothing.
 */

import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import CharacterModel from './CharacterModel';
import Nameplate from './Nameplate';
import { getCharacterModel } from '../../data/modelManifest';

const MAX_REMOTES = 16;     // cap rendered remotes (co-op scale)
const INTERP_MS = 120;      // interpolation window (snapshot interval + buffer)
const REFRESH = 0.3;        // seconds between roster (mount/unmount) re-evaluations

function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function RemotePlayer({ id, map }) {
  const group = useRef();
  const motion = useRef({ speed: 0 });
  // A robot tinted by the remote's server color → clear "other player" identity.
  const entry0 = map.get(id);
  const model = useMemo(() => ({ ...getCharacterModel('char.player'), tint: entry0?.c || '#9fb3d1' }), [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    const r = map.get(id);
    if (!r || !group.current) return;
    const t = Math.min(1, (Date.now() - r.at) / INTERP_MS);
    group.current.position.set(r.px + (r.x - r.px) * t, 0, r.pz + (r.z - r.pz) * t);
    group.current.rotation.y = (model.facingOffset || 0) + lerpAngle(r.pf, r.f, t);
    motion.current.speed = r.m ? (model.runRef || 6.5) * 0.8 : 0; // drive walk/idle anim
  });

  const r = map.get(id);
  return (
    <group ref={group}>
      <CharacterModel model={model} motion={motion} stride={2} />
      <Nameplate name={(r && r.name) || 'Traveler'} npcType="companion" />
    </group>
  );
}

export default function RemotePlayers({ world }) {
  const [ids, setIds] = useState([]);
  const acc = useRef(0);

  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < REFRESH) return;
    acc.current = 0;
    const net = world.current && world.current._net;
    const map = net && net.remotes;
    const cur = map ? [...map.keys()].slice(0, MAX_REMOTES) : [];
    setIds((prev) => (prev.length === cur.length && prev.every((id) => cur.includes(id)) ? prev : cur));
  });

  const net = world.current && world.current._net;
  const map = net && net.remotes;
  if (!map || ids.length === 0) return null;
  return <>{ids.map((id) => <RemotePlayer key={id} id={id} map={map} />)}</>;
}
