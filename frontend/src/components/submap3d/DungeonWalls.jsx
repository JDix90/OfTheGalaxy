/**
 * DungeonWalls — instanced 3D walls built from a dungeon's grid (Phase 5.1).
 *
 * Renders a wall block for every wall cell (grid===0) that borders a walkable cell, so a
 * dungeon reads as enclosed corridors/rooms without drawing the solid interior fill. One
 * InstancedMesh keeps it cheap. Cells map to world space via the same sim the player uses.
 */

import React, { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { submapLayout, submapDims } from '../../../../shared/sim/submap.mjs';

const WALL_H = 5;

export default function DungeonWalls({ subMap, sim }) {
  const meshRef = useRef();

  const cells = useMemo(() => {
    const d = submapLayout(subMap);
    const grid = d.grid;
    if (!Array.isArray(grid) || !grid.length || !sim) return [];
    const h = grid.length;
    const w = grid[0].length;
    const { w: dw, h: dh } = submapDims(subMap);
    const walkable = (x, y) => (y >= 0 && y < h && x >= 0 && x < w && grid[y][x] !== 0);
    const out = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (grid[y][x] !== 0) continue; // only walls
        // Keep only walls adjacent to a walkable cell (the visible shell).
        if (!(walkable(x + 1, y) || walkable(x - 1, y) || walkable(x, y + 1) || walkable(x, y - 1)
          || walkable(x + 1, y + 1) || walkable(x - 1, y - 1) || walkable(x + 1, y - 1) || walkable(x - 1, y + 1))) continue;
        const sx = ((x + 0.5) / dw) * 100;
        const sy = ((y + 0.5) / dh) * 100;
        const p = sim.surfaceToWorld(sx, sy);
        out.push([p.x, p.z]);
      }
    }
    return out;
  }, [subMap, sim]);

  const cellWorld = useMemo(() => (sim ? (100 / (sim.gridSize || 100)) * sim.scale : 2), [sim]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    cells.forEach(([x, z], i) => { m.makeTranslation(x, WALL_H / 2, z); mesh.setMatrixAt(i, m); });
    mesh.count = cells.length;
    mesh.instanceMatrix.needsUpdate = true;
  }, [cells, cellWorld]);

  if (!cells.length) return null;
  return (
    <instancedMesh ref={meshRef} args={[null, null, cells.length]} castShadow receiveShadow frustumCulled={false}>
      <boxGeometry args={[cellWorld * 1.02, WALL_H, cellWorld * 1.02]} />
      <meshStandardMaterial color="#2b2f3e" roughness={0.95} metalness={0.05} emissive="#0a0d16" emissiveIntensity={0.4} />
    </instancedMesh>
  );
}
