/**
 * CrowdActors — the ambient, server-authoritative crowd (Phase 6b) drawn as ONE instanced
 * mesh, so a bustling concourse of dozens of background walkers is ~1 draw call.
 *
 * Reads the live crowd map from the net client (world._net.crowd), written by authoritative
 * snapshots, and interpolates each walker prev→current over the snapshot window. Purely
 * cosmetic: no clicks, no nameplates, no combat — just people crossing the hall to give the
 * spaceport a sense of real presence. Online-only; renders nothing offline.
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const MAX_CROWD = 64;   // render cap (matches/exceeds the server's per-world crowd cap)
const INTERP_MS = 140;  // interpolation window (snapshot interval + buffer)

// Muted civilian tints (server sends a small role index `r`; we map it to a color bucket).
const ROLE_COLORS = ['#cdd6e6', '#b9c4d8', '#9fb3d1', '#d8c6a6', '#a9c6b0', '#c6a9be'];

// A tinted-capsule figure (body + head), base ≈ ground. Built once, shared by all instances.
const FIGURE_GEOM = (() => {
  const body = new THREE.CapsuleGeometry(0.3, 0.66, 4, 8); body.translate(0, 0.6, 0);
  const head = new THREE.SphereGeometry(0.25, 12, 10); head.translate(0, 1.36, 0);
  return mergeGeometries([body, head], false);
})();
const FIGURE_MAT = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, metalness: 0.08 });

function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export default function CrowdActors({ world }) {
  const ref = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const col = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const net = world && world.current && world.current._net;
    const map = net && net.crowd;
    if (!map || map.size === 0) {
      if (mesh.count !== 0) { mesh.count = 0; mesh.instanceMatrix.needsUpdate = true; }
      return;
    }
    const now = Date.now();
    const tNow = clock.elapsedTime;
    let i = 0;
    for (const c of map.values()) {
      if (i >= MAX_CROWD) break;
      const t = Math.min(1, (now - c.at) / INTERP_MS);
      const x = c.px + (c.x - c.px) * t;
      const z = c.pz + (c.z - c.pz) * t;
      // A subtle vertical bob while moving fakes a walk cycle on the static instanced figure.
      const moving = Math.hypot(c.x - c.px, c.z - c.pz) > 0.01;
      const bob = moving ? Math.abs(Math.sin(tNow * 6 + i)) * 0.06 : 0;
      dummy.position.set(x, bob, z);
      dummy.rotation.set(0, lerpAngle(c.pf, c.f, t), 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, col.set(ROLE_COLORS[(c.r | 0) % ROLE_COLORS.length]));
      i++;
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[FIGURE_GEOM, FIGURE_MAT, MAX_CROWD]} castShadow receiveShadow frustumCulled={false} />
  );
}
