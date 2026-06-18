/**
 * SubmapProps — themed 3D dressing for a submap interior (Phase 5.4 / submap-liveliness Phase 2).
 *
 * Replaces the flat colored Furniture boxes with props that read in-character per POI type:
 * biobeds + consoles in a clinic, awning stalls + produce in a market, cargo at a spaceport,
 * pipes/barrels in a mine, rubble in a ruin. Two prop sources, both produced (and positioned) by
 * the pure `buildSubmapProps` (submapData):
 *   - COMPOSED primitives (this file) for things the glTF kit lacks (bed/stall/console/...), built
 *     the way PoiStructure builds shapes, tinted by the theme palette.
 *   - glTF KIT models (barrels/crates/containers/pipes/rocks) rendered instanced via InstancedGLTF.
 * Anything a theme doesn't map stays a plain box (the original Furniture component).
 *
 * Props are visual-only — collision is the submap's collisionMap, and zone props sit on already
 * non-walkable building cells / scatter is guarded to walkable edge cells, so nothing traps the
 * player.
 */

import React, { Suspense } from 'react';
import Furniture from './Furniture';
import InstancedGLTF from '../surface3d/InstancedGLTF';
import { isGlbProp } from './submapData';

// glTF kit prop → model url + target world size (largest dimension). Reuses the same CC0 kit the
// surface props use (frontend/public/models/props). The kit has no bed/produce/etc. — those are
// the composed builders below.
const GLB = {
  crate: { url: '/models/props/container.glb', size: 1.1 },
  container: { url: '/models/props/container.glb', size: 1.5 },
  barrel: { url: '/models/props/barrels.glb', size: 1.2 },
  pipe: { url: '/models/props/pipe_straight.glb', size: 1.8 },
  rock: { url: '/models/props/rock_largeA.glb', size: 1.6 },
  crystal: { url: '/models/props/rock_crystalsLargeA.glb', size: 1.7 },
};

// ---- Composed-primitive builders (theme-tinted) ----
// Each renders its mesh group at the prop's world position; `p` is { wx, wz, rot }, `t` the theme.
function Biobed({ p, t }) {
  const acc = t.palette.accent, em = t.palette.emissive;
  return (
    <group position={[p.wx, 0, p.wz]} rotation={[0, p.rot, 0]}>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow><boxGeometry args={[1.9, 0.5, 0.85]} /><meshStandardMaterial color="#c8d2e0" roughness={0.6} metalness={0.2} /></mesh>
      <mesh position={[0, 0.62, 0]} castShadow><boxGeometry args={[1.7, 0.2, 0.75]} /><meshStandardMaterial color={acc} roughness={0.7} /></mesh>
      <mesh position={[-0.82, 1.05, 0.28]}><boxGeometry args={[0.08, 0.95, 0.08]} /><meshStandardMaterial color="#9aa6b8" /></mesh>
      <mesh position={[-0.82, 1.42, 0.28]}><boxGeometry args={[0.5, 0.34, 0.05]} /><meshStandardMaterial color="#0d141c" emissive={em} emissiveIntensity={0.85} toneMapped={false} /></mesh>
    </group>
  );
}
function MedConsole({ p, t }) {
  const em = t.palette.emissive;
  return (
    <group position={[p.wx, 0, p.wz]} rotation={[0, p.rot, 0]}>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow><boxGeometry args={[0.8, 0.9, 0.6]} /><meshStandardMaterial color="#cdd6e2" roughness={0.6} metalness={0.15} /></mesh>
      <mesh position={[0, 0.95, 0.22]} rotation={[-0.4, 0, 0]}><boxGeometry args={[0.62, 0.42, 0.05]} /><meshStandardMaterial color="#0a1820" emissive={em} emissiveIntensity={0.8} toneMapped={false} /></mesh>
    </group>
  );
}
function CounterCanopy({ p, t }) {
  const acc = t.palette.accent, em = t.palette.emissive;
  const posts = [[-0.85, -0.45], [0.85, -0.45], [-0.85, 0.45], [0.85, 0.45]];
  return (
    <group position={[p.wx, 0, p.wz]} rotation={[0, p.rot, 0]}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow><boxGeometry args={[1.8, 1.1, 0.8]} /><meshStandardMaterial color="#8a6a44" roughness={0.85} /></mesh>
      {posts.map(([x, z], i) => (<mesh key={i} position={[x, 1.0, z]}><boxGeometry args={[0.08, 2.0, 0.08]} /><meshStandardMaterial color="#5a4632" /></mesh>))}
      <mesh position={[0, 2.05, 0]} castShadow><boxGeometry args={[2.0, 0.1, 1.1]} /><meshStandardMaterial color={acc} roughness={0.6} /></mesh>
      {[-0.5, 0, 0.5].map((x, i) => (<mesh key={i} position={[x, 1.22, 0.18]}><boxGeometry args={[0.3, 0.3, 0.3]} /><meshStandardMaterial color="#2a2018" emissive={em} emissiveIntensity={0.5} toneMapped={false} /></mesh>))}
    </group>
  );
}
function Terminal({ p, t }) {
  const em = t.palette.emissive;
  return (
    <group position={[p.wx, 0, p.wz]} rotation={[0, p.rot, 0]}>
      <mesh position={[0, 0.65, 0]} castShadow receiveShadow><boxGeometry args={[0.55, 1.3, 0.45]} /><meshStandardMaterial color="#3a4254" roughness={0.6} metalness={0.3} /></mesh>
      <mesh position={[0, 1.0, 0.24]} rotation={[-0.3, 0, 0]}><boxGeometry args={[0.46, 0.6, 0.05]} /><meshStandardMaterial color="#0a1018" emissive={em} emissiveIntensity={0.9} toneMapped={false} /></mesh>
    </group>
  );
}
function Bench({ p }) {
  return (
    <group position={[p.wx, 0, p.wz]} rotation={[0, p.rot, 0]}>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow><boxGeometry args={[1.6, 0.14, 0.5]} /><meshStandardMaterial color="#6a5a48" roughness={0.85} /></mesh>
      {[-0.65, 0.65].map((x, i) => (<mesh key={i} position={[x, 0.25, 0]}><boxGeometry args={[0.12, 0.5, 0.45]} /><meshStandardMaterial color="#4a3e30" /></mesh>))}
    </group>
  );
}
function Planter({ p }) {
  return (
    <group position={[p.wx, 0, p.wz]} rotation={[0, p.rot, 0]}>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow><boxGeometry args={[0.7, 0.6, 0.7]} /><meshStandardMaterial color="#5a4a3a" roughness={0.9} /></mesh>
      <mesh position={[0, 0.95, 0]} castShadow><coneGeometry args={[0.5, 0.9, 7]} /><meshStandardMaterial color="#3f7a44" roughness={0.8} /></mesh>
    </group>
  );
}
const BUILDERS = { biobed: Biobed, medConsole: MedConsole, counterCanopy: CounterCanopy, terminal: Terminal, bench: Bench, planter: Planter };

export default function SubmapProps({ data, theme }) {
  if (!data) return null;
  const { themed = [], boxes = [] } = data;
  // Batch glTF-kit props by url so each model is one instanced draw; composed props render per-item.
  const glbByUrl = {};
  const composed = [];
  for (const it of themed) {
    if (isGlbProp(it.semantic) && GLB[it.semantic]) {
      const g = GLB[it.semantic];
      (glbByUrl[g.url] || (glbByUrl[g.url] = { size: g.size, items: [] })).items.push({ x: it.wx, z: it.wz, ry: it.rot });
    } else if (BUILDERS[it.semantic]) {
      composed.push(it);
    }
  }
  return (
    <group>
      {boxes.length > 0 && <Furniture items={boxes} />}
      {composed.map((it) => { const C = BUILDERS[it.semantic]; return <C key={it.id} p={it} t={theme} />; })}
      {Object.entries(glbByUrl).map(([url, g]) => (
        <Suspense key={url} fallback={null}><InstancedGLTF url={url} items={g.items} size={g.size} /></Suspense>
      ))}
    </group>
  );
}
