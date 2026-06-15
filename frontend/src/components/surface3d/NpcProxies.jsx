/**
 * NpcProxies — every distant / over-cap NPC ('proxy' LOD tier) drawn as a SINGLE
 * instanced mesh, so a crowd of hundreds is ~1 draw call instead of N React nodes.
 *
 * A capsule body + sphere head are merged into one "figure" geometry once; each instance
 * is positioned at its NPC and tinted by role via instanceColor. Click/hover raycast the
 * instanced mesh (event.instanceId → the NPC) so distant NPCs stay interactive. Nameplates
 * are rendered only for the nearest few proxies (`labelIds`, computed in SurfaceScene) to
 * keep DOM bounded; the animated NPCs render their own.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import Nameplate from './Nameplate';
import { getRoleColor } from '../../data/modelManifest';

const MAX_PROXIES = 512; // instance buffer cap (far above any realistic surface crowd)

// A tinted-capsule figure (body + head), base ≈ ground. Built once, shared by all instances.
const FIGURE_GEOM = (() => {
  const body = new THREE.CapsuleGeometry(0.32, 0.7, 4, 8); body.translate(0, 0.62, 0);
  const head = new THREE.SphereGeometry(0.27, 12, 10); head.translate(0, 1.42, 0);
  return mergeGeometries([body, head], false);
})();
const FIGURE_MAT = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, metalness: 0.1 });

export default function NpcProxies({ npcs, onActivate, labelIds }) {
  const ref = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  // Rebuild instance matrices + colors whenever the proxy set changes.
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const n = Math.min(npcs.length, MAX_PROXIES);
    for (let i = 0; i < n; i++) {
      const npc = npcs[i];
      const facing = npc.facing != null ? npc.facing : (npc.id ? String(npc.id).length : 0);
      dummy.position.set(npc.wx, 0, npc.wz);
      dummy.rotation.set(0, facing, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, tmpColor.set(getRoleColor(npc.npcType || 'generic')));
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [npcs, dummy, tmpColor]);

  const handleClick = (e) => {
    const id = e.instanceId;
    if (id != null && npcs[id]) { e.stopPropagation(); onActivate && onActivate(npcs[id], e); }
  };

  const labelled = labelIds ? npcs.filter((n) => labelIds.has(n.id)) : [];

  return (
    <>
      <instancedMesh
        ref={ref}
        args={[FIGURE_GEOM, FIGURE_MAT, MAX_PROXIES]}
        castShadow
        receiveShadow
        frustumCulled={false}
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      />
      {labelled.map((n) => (
        <group key={n.id} position={[n.wx, 0, n.wz]}>
          <Nameplate name={n.name} npcType={n.npcType || 'generic'} level={n.level} />
        </group>
      ))}
    </>
  );
}
