/**
 * RemoteEnemies — renders server-driven hostile actors (Phase 4.2).
 *
 * Reads the live enemy map from the net client (world._net.enemies), written by
 * authoritative snapshots. Each enemy is a CC0 alien-creature glTF (the manifest
 * `npc.random_encounter` roster, picked by id) with a hostile nameplate (name + Lv).
 * Position/facing are INTERPOLATED prev→current over the snapshot window (server owns
 * the AI; the client just displays). Online-only; combat resolution lands in P4.3.
 */

import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import CharacterModel from './CharacterModel';
import Nameplate from './Nameplate';
import { getCharacterModel } from '../../data/modelManifest';

const MAX_ENEMIES = 16;
const INTERP_MS = 120;
const REFRESH = 0.3;

function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function RemoteEnemy({ id, map, targeted, onTarget }) {
  const group = useRef();
  const ring = useRef();
  const motion = useRef({ speed: 0 });
  const model = useMemo(() => getCharacterModel('npc.random_encounter', id), [id]);

  useFrame(({ clock }) => {
    const e = map.get(id);
    if (!e || !group.current) return;
    const t = Math.min(1, (Date.now() - e.at) / INTERP_MS);
    group.current.position.set(e.px + (e.x - e.px) * t, 0, e.pz + (e.z - e.pz) * t);
    group.current.rotation.y = (model.facingOffset || 0) + lerpAngle(e.pf, e.f, t);
    motion.current.speed = e.st === 'chase' ? (model.runRef || 5) : (model.walkRef || 2.2) * 0.8;
    if (ring.current) ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.12);
  });

  const e = map.get(id);
  return (
    <group ref={group}>
      <group
        onClick={(ev) => { ev.stopPropagation(); const en = map.get(id); if (en && en.hp > 0) onTarget(id); }}
        onPointerOver={(ev) => { ev.stopPropagation(); document.body.style.cursor = 'crosshair'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <CharacterModel model={model} motion={motion} stride={2} />
      </group>
      {targeted && (
        <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <ringGeometry args={[0.8, 1.05, 32]} />
          <meshBasicMaterial color="#ff4d4d" transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      <Nameplate name={(e && e.name) || 'Hostile'} npcType="random_encounter" level={e && e.level} hp={e && e.hp} maxHp={e && e.maxHp} />
    </group>
  );
}

export default function RemoteEnemies({ world, targetId, onTarget }) {
  const [ids, setIds] = useState([]);
  const acc = useRef(0);

  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < REFRESH) return;
    acc.current = 0;
    const net = world.current && world.current._net;
    const map = net && net.enemies;
    const cur = map ? [...map.keys()].slice(0, MAX_ENEMIES) : [];
    setIds((prev) => (prev.length === cur.length && prev.every((id) => cur.includes(id)) ? prev : cur));
  });

  const net = world.current && world.current._net;
  const map = net && net.enemies;
  if (!map || ids.length === 0) return null;
  return <>{ids.map((id) => <RemoteEnemy key={id} id={id} map={map} targeted={id === targetId} onTarget={onTarget} />)}</>;
}
