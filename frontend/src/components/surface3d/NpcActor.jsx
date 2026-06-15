/**
 * NpcActor — one ANIMATED NPC (LOD tier 'full' or 'lod').
 *
 *   tier 'full' — animated glTF, mixer every frame (nearest NPCs)
 *   tier 'lod'  — animated glTF, mixer throttled (mid-range, still within the cap)
 *
 * Distant / over-cap NPCs are NOT rendered here — they go through <NpcProxies> (a single
 * instanced mesh). SurfaceScene splits NPCs by tier and only mounts NpcActor for the
 * animated set, bounding the number of skinned-mesh + AnimationMixer instances.
 *
 * The model variant is picked deterministically from the role's roster by the NPC id, so
 * a crowd has visual variety (astronauts / mechs / robots, alien creatures for hostiles).
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import CharacterModel from './CharacterModel';
import Nameplate from './Nameplate';
import { getCharacterModel } from '../../data/modelManifest';

export default function NpcActor({ npc3d, onActivate, tier = 'full', showLabel = true }) {
  const group = useRef();
  const motion = useRef({ speed: 0 });
  const npcType = npc3d.npcType || 'generic';
  const model = useMemo(() => getCharacterModel(`npc.${npcType}`, npc3d.id), [npcType, npc3d.id]);
  const facing = useMemo(() => (npc3d.facing != null ? npc3d.facing : (npc3d.id ? String(npc3d.id).length : 0)), [npc3d]);

  useFrame(({ clock }) => {
    // subtle idle bob (proxies stay fully static)
    if (group.current) group.current.position.y = Math.sin(clock.elapsedTime * 1.5 + facing) * 0.04;
  });

  return (
    <group position={[npc3d.wx, 0, npc3d.wz]}>
      <group
        ref={group}
        rotation={[0, (model.facingOffset || 0) + facing, 0]}
        onClick={(e) => { e.stopPropagation(); onActivate && onActivate(npc3d, e); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <CharacterModel model={model} motion={motion} stride={tier === 'lod' ? 3 : 1} />
      </group>
      {showLabel && <Nameplate name={npc3d.name} npcType={npcType} level={npc3d.level} />}
    </group>
  );
}
