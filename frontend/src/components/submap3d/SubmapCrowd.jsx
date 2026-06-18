/**
 * SubmapCrowd — an ambient, client-side wandering crowd for OFFLINE submap interiors (no server):
 * patients drifting a clinic, shoppers a market, travelers a concourse. The single biggest
 * "lively" lever for interiors.
 *
 * Unlike the surface CrowdActors (server-authoritative, interpolated from net snapshots), this
 * simulates its own walkers entirely on the client: each picks a walkable waypoint, steers toward
 * it, and repicks on arrival or when blocked. It reuses CrowdActors' instanced capsule figures +
 * gait (crowdFigures) so it draws in only a few draw calls and matches the surface look. Purely
 * cosmetic: no clicks, no nameplates, no combat.
 *
 * Gated to non-realtime submaps by SubmapScene — the realtime spaceport keeps its server crowd, so
 * the two never double up. Tinted + sized per theme.crowd.
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BUILDS, FIGURE_MAT, CASE_GEOM, CASE_MAT, hashStr, lerpAngle } from '../surface3d/crowdFigures';

const MAX = 24; // hard render cap (instanced mesh capacity)

export default function SubmapCrowd({ world, sim, theme }) {
  const refs = [useRef(), useRef(), useRef()]; // one instanced mesh per build
  const propRef = useRef();                    // carried cases
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const col = useMemo(() => new THREE.Color(), []);
  const crowd = theme && theme.crowd;

  // Walkable world points to spawn at / wander between — scanned once off the submap's collision.
  const spots = useMemo(() => {
    if (!sim) return [];
    const out = [];
    for (let sy = 6; sy < 95; sy += 4) {
      for (let sx = 6; sx < 95; sx += 4) {
        if (sim.isWalkableSurface(sx, sy)) { const w = sim.surfaceToWorld(sx, sy); out.push([w.x, w.z]); }
      }
    }
    return out;
  }, [sim]);

  const tints = (crowd && crowd.tints) || ['#cdd6e6'];

  // Walker state (mutated in useFrame). Deterministic initial build/tint/spot from a per-index hash.
  const walkers = useMemo(() => {
    if (!crowd || crowd.flavor === 'none' || !spots.length) return [];
    const n = Math.min(MAX, crowd.density || 0);
    const arr = [];
    for (let i = 0; i < n; i++) {
      const h = hashStr(`sc${i}`);          // uint32; use UNSIGNED shifts so indices never go negative
      const s = spots[h % spots.length];
      const wp = spots[(h >>> 3) % spots.length];
      arr.push({
        build: h % 3, color: tints[(h >>> 7) % tints.length],
        x: s[0], z: s[1], tx: wp[0], tz: wp[1], yaw: Math.atan2(wp[0] - s[0], wp[1] - s[1]),
        speed: 0.85 + ((h >>> 11) & 0xff) / 255 * 0.8, // 0.85..1.65 u/s
        sH: 0.95 + ((h >>> 5) & 0xff) / 255 * 0.13,
        sG: 0.95 + ((h >>> 13) & 0xff) / 255 * 0.12,
        phase: (h % 1000) / 1000 * Math.PI * 2,
        carries: (h % 10) < 3, moving: true,
      });
    }
    return arr;
  }, [crowd, spots, tints]);

  const pick = () => (spots.length ? spots[(Math.random() * spots.length) | 0] : null);

  useFrame((state, dtRaw) => {
    const meshes = refs.map((r) => r.current);
    const propMesh = propRef.current;
    if (meshes.some((m) => !m) || !propMesh) return;
    if (!walkers.length) {
      meshes.forEach((m) => { if (m.count !== 0) { m.count = 0; m.instanceMatrix.needsUpdate = true; } });
      if (propMesh.count !== 0) { propMesh.count = 0; propMesh.instanceMatrix.needsUpdate = true; }
      return;
    }
    const dt = Math.min(dtRaw, 0.05);
    const tNow = state.clock.elapsedTime;
    const p = world && world.current && world.current.player; // optional: nudge walkers off the player
    const counts = [0, 0, 0];
    let propCount = 0;

    for (const wk of walkers) {
      let dx = wk.tx - wk.x, dz = wk.tz - wk.z;
      let d = Math.hypot(dx, dz) || 1;
      if (d < 0.6) { const np = pick(); if (np) { [wk.tx, wk.tz] = np; } dx = wk.tx - wk.x; dz = wk.tz - wk.z; d = Math.hypot(dx, dz) || 1; }
      const nx = wk.x + (dx / d) * wk.speed * dt;
      const nz = wk.z + (dz / d) * wk.speed * dt;
      const blocked = !sim.isWalkableWorld(nx, nz) || (p && Math.hypot(nx - p.x, nz - p.z) < 1.0);
      if (blocked) { const np = pick(); if (np) { [wk.tx, wk.tz] = np; } wk.moving = false; }
      else { wk.x = nx; wk.z = nz; wk.moving = true; }

      wk.yaw = lerpAngle(wk.yaw, Math.atan2(dx, dz), 1 - Math.pow(0.0015, dt));
      const stepv = Math.sin(tNow * 7 + wk.phase);
      const bob = wk.moving ? Math.abs(stepv) * 0.075 : 0;
      const sway = wk.moving ? stepv * 0.05 : 0;

      const mesh = meshes[wk.build];
      const idx = counts[wk.build];
      dummy.position.set(wk.x, bob, wk.z);
      dummy.rotation.set(0, wk.yaw, sway, 'XYZ');
      dummy.scale.set(wk.sG, wk.sH, wk.sG);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
      mesh.setColorAt(idx, col.set(wk.color));
      counts[wk.build] = idx + 1;

      if (wk.carries) {
        const ox = Math.cos(wk.yaw) * 0.30, oz = -Math.sin(wk.yaw) * 0.30;
        dummy.position.set(wk.x + ox, 0.6 + bob, wk.z + oz);
        dummy.rotation.set(0, wk.yaw, sway, 'XYZ');
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        propMesh.setMatrixAt(propCount, dummy.matrix);
        propCount++;
      }
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
        <instancedMesh key={v} ref={refs[v]} args={[geom, FIGURE_MAT, MAX]} castShadow receiveShadow frustumCulled={false} />
      ))}
      <instancedMesh ref={propRef} args={[CASE_GEOM, CASE_MAT, MAX]} castShadow receiveShadow frustumCulled={false} />
    </>
  );
}
