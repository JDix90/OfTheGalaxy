/**
 * CrowdActors — the ambient, server-authoritative crowd (Phase 6b) drawn as a handful of
 * instanced meshes, so a bustling concourse of dozens of background walkers is still only a few
 * draw calls.
 *
 * Reads the live crowd map from the net client (world._net.crowd), written by authoritative
 * snapshots, and interpolates each walker prev→current over the snapshot window. Purely
 * cosmetic: no clicks, no nameplates, no combat — just people crossing the hall to give the
 * spaceport a sense of real presence. Online-only; renders nothing offline.
 *
 * Variety (all derived deterministically from the walker's stable id, so a given walker keeps
 * the same look frame-to-frame):
 *   - one of three body BUILDS (average / tall-slim / short-stocky), each its own instanced mesh;
 *   - a small per-walker height/girth jitter so no two figures are identical;
 *   - a per-walker gait phase driving a vertical bob + side-to-side sway while moving;
 *   - ~30% carry a small case (a 4th instanced mesh) that bobs and turns with them.
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BUILDS, FIGURE_MAT, CASE_GEOM, CASE_MAT, ROLE_COLORS, hashStr, lerpAngle } from './crowdFigures';

const MAX_CROWD = 64;   // render cap (matches/exceeds the server's per-world crowd cap)
const INTERP_MS = 140;  // interpolation window (snapshot interval + buffer)

export default function CrowdActors({ world }) {
  const refs = [useRef(), useRef(), useRef()]; // one instanced mesh per build
  const propRef = useRef();                    // carried cases
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const col = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }) => {
    const meshes = refs.map((r) => r.current);
    const propMesh = propRef.current;
    if (meshes.some((m) => !m) || !propMesh) return;
    const net = world && world.current && world.current._net;
    const map = net && net.crowd;
    if (!map || map.size === 0) {
      meshes.forEach((m) => { if (m.count !== 0) { m.count = 0; m.instanceMatrix.needsUpdate = true; } });
      if (propMesh.count !== 0) { propMesh.count = 0; propMesh.instanceMatrix.needsUpdate = true; }
      return;
    }
    const now = Date.now();
    const tNow = clock.elapsedTime;
    const counts = [0, 0, 0];
    let propCount = 0;
    let total = 0;
    for (const c of map.values()) {
      if (total >= MAX_CROWD) break;
      const h = hashStr(c.id);
      const t = Math.min(1, (now - c.at) / INTERP_MS);
      const x = c.px + (c.x - c.px) * t;
      const z = c.pz + (c.z - c.pz) * t;
      const yaw = lerpAngle(c.pf, c.f, t);

      // Gait: a per-walker phase drives a vertical bob + a side-to-side weight-shift sway, but
      // only while the walker is actually advancing (snapshot delta), so idle figures stand still.
      const phase = (h % 1000) / 1000 * Math.PI * 2;
      const moving = Math.hypot(c.x - c.px, c.z - c.pz) > 0.01;
      const step = Math.sin(tNow * 7 + phase);
      const bob = moving ? Math.abs(step) * 0.075 : 0;
      const sway = moving ? step * 0.05 : 0;

      // Per-walker build + size jitter (kept modest so figures read as people, not a funhouse).
      const v = h % 3;
      const sH = 0.95 + ((h >> 5) & 0xff) / 255 * 0.13;
      const sG = 0.95 + ((h >> 13) & 0xff) / 255 * 0.12;

      const mesh = meshes[v];
      const idx = counts[v];
      if (idx < MAX_CROWD) {
        dummy.position.set(x, bob, z);
        dummy.rotation.set(0, yaw, sway, 'XYZ');
        dummy.scale.set(sG, sH, sG);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
        mesh.setColorAt(idx, col.set(ROLE_COLORS[(c.r | 0) % ROLE_COLORS.length]));
        counts[v] = idx + 1;
      }

      // ~30% of walkers carry a case, offset to one side at waist height, bobbing/turning along.
      if ((h % 10) < 3 && propCount < MAX_CROWD) {
        const ox = Math.cos(yaw) * 0.30;
        const oz = -Math.sin(yaw) * 0.30;
        dummy.position.set(x + ox, 0.6 + bob, z + oz);
        dummy.rotation.set(0, yaw, sway, 'XYZ');
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        propMesh.setMatrixAt(propCount, dummy.matrix);
        propCount++;
      }
      total++;
    }
    meshes.forEach((m, v) => {
      m.count = counts[v];
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
    propMesh.count = propCount;
    propMesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      {BUILDS.map((geom, v) => (
        <instancedMesh key={v} ref={refs[v]} args={[geom, FIGURE_MAT, MAX_CROWD]} castShadow receiveShadow frustumCulled={false} />
      ))}
      <instancedMesh ref={propRef} args={[CASE_GEOM, CASE_MAT, MAX_CROWD]} castShadow receiveShadow frustumCulled={false} />
    </>
  );
}
