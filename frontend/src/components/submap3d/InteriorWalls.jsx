/**
 * InteriorWalls — instanced room walls for a 3D building interior (Phase 5.2).
 *
 * A building interior's walkability comes from its collisionMap (no raw grid), so we
 * SAMPLE the sim at the building's grid resolution: a cell is a wall if it's non-walkable
 * and borders a walkable cell (the visible room shell). One InstancedMesh; cell→world via
 * the same sim the player collides against, so walls line up with collision.
 */

import React, { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { submapCoordDims } from '../../../../shared/sim/submap.mjs';

const WALL_H = 4;

export default function InteriorWalls({ subMap, sim }) {
  const meshRef = useRef();

  const { cells, cellWorld } = useMemo(() => {
    if (!sim) return { cells: [], cellWorld: 2 };
    const { w, h } = submapCoordDims(subMap);
    const walk = (gx, gy) => {
      if (gx < 0 || gx >= w || gy < 0 || gy >= h) return false;
      return sim.isWalkableSurface(((gx + 0.5) / w) * 100, ((gy + 0.5) / h) * 100);
    };
    const out = [];
    for (let gy = 0; gy < h; gy++) {
      for (let gx = 0; gx < w; gx++) {
        if (walk(gx, gy)) continue; // wall cell
        if (!(walk(gx + 1, gy) || walk(gx - 1, gy) || walk(gx, gy + 1) || walk(gx, gy - 1)
          || walk(gx + 1, gy + 1) || walk(gx - 1, gy - 1) || walk(gx + 1, gy - 1) || walk(gx - 1, gy + 1))) continue;
        const p = sim.surfaceToWorld(((gx + 0.5) / w) * 100, ((gy + 0.5) / h) * 100);
        out.push([p.x, p.z]);
      }
    }
    return { cells: out, cellWorld: (100 / w) * sim.scale };
  }, [subMap, sim]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    cells.forEach(([x, z], i) => { m.makeTranslation(x, WALL_H / 2, z); mesh.setMatrixAt(i, m); });
    mesh.count = cells.length;
    mesh.instanceMatrix.needsUpdate = true;
  }, [cells]);

  if (!cells.length) return null;
  return (
    <instancedMesh ref={meshRef} args={[null, null, cells.length]} castShadow receiveShadow frustumCulled={false}>
      <boxGeometry args={[cellWorld * 1.02, WALL_H, cellWorld * 1.02]} />
      <meshStandardMaterial color="#3a3f52" roughness={0.95} metalness={0.05} />
    </instancedMesh>
  );
}
