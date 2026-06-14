/**
 * NpcActor — one NPC, rendered at a level-of-detail decided by NpcLOD (in SurfaceScene).
 *
 *   tier 'full'   — animated glTF, mixer every frame (nearest NPCs)
 *   tier 'lod'    — animated glTF, mixer throttled (mid-range, still within the cap)
 *   tier 'proxy'  — cheap static capsule stand-in, NO mixer/skinning (far / over-cap)
 *   tier 'hidden' — culled (beyond fog); renders nothing
 *
 * This bounds the number of expensive skinned-mesh + AnimationMixer instances on
 * crowded planets (Sinkport) while keeping every visible NPC's nameplate + click-to-
 * interact working. Model + tint come from the manifest, keyed by npcType.
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import CharacterModel from './CharacterModel';
import { getCharacterModel } from '../../data/modelManifest';

// Cheap, animation-free stand-in for distant NPCs (a tinted capsule figure).
function NpcProxy({ tint }) {
  return (
    <group>
      <mesh position={[0, 0.62, 0]} castShadow>
        <capsuleGeometry args={[0.32, 0.7, 4, 8]} />
        <meshStandardMaterial color={tint} roughness={0.8} metalness={0.1} />
      </mesh>
      <mesh position={[0, 1.42, 0]} castShadow>
        <sphereGeometry args={[0.27, 12, 10]} />
        <meshStandardMaterial color={tint} roughness={0.7} metalness={0.1} />
      </mesh>
    </group>
  );
}

export default function NpcActor({ npc3d, onActivate, tier = 'proxy' }) {
  const group = useRef();
  const motion = useRef({ speed: 0 });
  const model = useMemo(() => getCharacterModel(`npc.${npc3d.npcType || 'generic'}`), [npc3d.npcType]);
  const facing = useMemo(() => (npc3d.facing != null ? npc3d.facing : (npc3d.id ? npc3d.id.length : 0)), [npc3d]);

  const animated = tier === 'full' || tier === 'lod';

  useFrame(({ clock }) => {
    // subtle idle bob, only for the nearby animated NPCs (proxies stay fully static)
    if (animated && group.current) {
      group.current.position.y = Math.sin(clock.elapsedTime * 1.5 + facing) * 0.04;
    }
  });

  if (tier === 'hidden') return null;

  const typeLabel = (npc3d.npcType || '').replace(/_/g, ' ');

  return (
    <group position={[npc3d.wx, 0, npc3d.wz]}>
      <group
        ref={group}
        rotation={[0, (model.facingOffset || 0) + facing, 0]}
        onClick={(e) => { e.stopPropagation(); onActivate && onActivate(npc3d, e); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        {animated
          ? <CharacterModel model={model} motion={motion} stride={tier === 'lod' ? 3 : 1} />
          : <NpcProxy tint={model.tint} />}
      </group>
      <Html position={[0, 2.4, 0]} center distanceFactor={22} occlude={false} style={{ pointerEvents: 'none' }}>
        <div style={{ textAlign: 'center', whiteSpace: 'nowrap', fontFamily: 'system-ui, sans-serif', transform: 'translateY(-50%)' }}>
          <div style={{ color: '#cfe3ff', fontSize: 12, fontWeight: 600, textShadow: '0 1px 3px #000' }}>{npc3d.name}</div>
          {typeLabel && <div style={{ color: '#8aa0c4', fontSize: 10, textShadow: '0 1px 3px #000' }}>{typeLabel}</div>}
        </div>
      </Html>
    </group>
  );
}
