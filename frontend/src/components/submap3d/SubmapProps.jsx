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
import * as THREE from 'three';
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
// ---- Shantytown "lived-in" dressing ----
const CLOTH_TINTS = ['#b7c4d6', '#d8c9a8', '#c98a6a', '#8aa0b0', '#cdb86a', '#a86a6a', '#9ab08a', '#bcae96'];
// A cord strung between two shacks with a few hanging garments. p carries both endpoints
// (wx,wz)->(wxEnd,wzEnd); we sit the group at the midpoint and rotate to face the far shack.
function LaundryLine({ p }) {
  const dx = (p.wxEnd ?? p.wx) - p.wx, dz = (p.wzEnd ?? p.wz) - p.wz;
  const len = Math.max(0.6, Math.hypot(dx, dz));
  const ang = Math.atan2(dz, dx);
  const H = 2.1; // strung near the shack roofs (shacks are 1.6–2.4 tall)
  const seed = p.seed || 7;
  const n = Math.max(2, Math.min(5, Math.round(len / 0.7)));
  return (
    <group position={[(p.wx + (p.wxEnd ?? p.wx)) / 2, 0, (p.wz + (p.wzEnd ?? p.wz)) / 2]} rotation={[0, -ang, 0]}>
      {/* the cord */}
      <mesh position={[0, H, 0]}><boxGeometry args={[len, 0.03, 0.03]} /><meshStandardMaterial color="#2a241c" roughness={1} /></mesh>
      {/* hanging garments, sagging toward mid-span */}
      {Array.from({ length: n }).map((_, i) => {
        const t = (i + 0.5) / n;
        const x = -len / 2 + t * len;
        const cw = 0.26 + ((seed + i) % 3) * 0.06;
        const ch = 0.4 + ((seed * 3 + i) % 4) * 0.07;
        const sag = Math.sin(t * Math.PI) * 0.06;
        const col = CLOTH_TINTS[(seed + i * 3) % CLOTH_TINTS.length];
        return (
          <mesh key={i} position={[x, H - ch / 2 - 0.02 - sag, 0]}>
            <planeGeometry args={[cw, ch]} />
            <meshStandardMaterial color={col} roughness={0.95} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}
// A ring of stones around glowing embers + crossed charred logs — a warm focal point in the dust.
function Cookfire({ p }) {
  const stones = [0, 1, 2, 3, 4, 5].map((i) => { const a = (i / 6) * Math.PI * 2; return [Math.cos(a) * 0.32, Math.sin(a) * 0.32]; });
  return (
    <group position={[p.wx, 0, p.wz]} rotation={[0, p.rot || 0, 0]}>
      {stones.map(([x, z], i) => (<mesh key={i} position={[x, 0.08, z]} castShadow><dodecahedronGeometry args={[0.11, 0]} /><meshStandardMaterial color="#6a6258" roughness={1} /></mesh>))}
      <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.2, 0.24, 0.07, 10]} /><meshStandardMaterial color="#2a1a10" emissive="#ff6a1e" emissiveIntensity={1.7} toneMapped={false} /></mesh>
      <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0.5]}><cylinderGeometry args={[0.05, 0.05, 0.6, 5]} /><meshStandardMaterial color="#33271c" roughness={1} /></mesh>
      <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, -0.5]}><cylinderGeometry args={[0.05, 0.05, 0.6, 5]} /><meshStandardMaterial color="#2c2118" roughness={1} /></mesh>
      <pointLight position={[0, 0.45, 0]} color="#ff7a2e" intensity={1.0} distance={4.5} decay={2} />
    </group>
  );
}
// A small heap of corrugated scrap / broken planks (theme-tinted), low to the ground.
function Debris({ p }) {
  const planks = [
    { pos: [0, 0.06, 0], rot: [0, 0.3, 0.05], s: [0.7, 0.06, 0.4], c: '#6b5a44' },
    { pos: [0.12, 0.16, 0.05], rot: [0.1, -0.4, 0.12], s: [0.5, 0.05, 0.28], c: '#7a6a52' },
    { pos: [-0.1, 0.13, -0.06], rot: [0.05, 0.8, -0.1], s: [0.4, 0.05, 0.5], c: '#8a6a44' },
    { pos: [0.05, 0.24, 0], rot: [0.2, 0.2, 0.3], s: [0.34, 0.04, 0.22], c: '#9a8a6a' },
  ];
  return (
    <group position={[p.wx, 0, p.wz]} rotation={[0, p.rot || 0, 0]}>
      {planks.map((pl, i) => (<mesh key={i} position={pl.pos} rotation={pl.rot} castShadow><boxGeometry args={pl.s} /><meshStandardMaterial color={pl.c} roughness={1} /></mesh>))}
    </group>
  );
}
const BUILDERS = { biobed: Biobed, medConsole: MedConsole, counterCanopy: CounterCanopy, terminal: Terminal, bench: Bench, planter: Planter, laundry_line: LaundryLine, cookfire: Cookfire, debris: Debris };

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
