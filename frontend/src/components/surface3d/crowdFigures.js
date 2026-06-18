/**
 * crowdFigures — shared geometry + helpers for ambient crowds, so the server-authoritative surface
 * crowd (CrowdActors) and the client-side offline submap crowd (SubmapCrowd) draw the SAME instanced
 * capsule figures and move with the same gait. Pure geometry/util module (no React).
 *
 * Three body BUILDS (average / tall-slim / short-stocky), each its own instanced mesh; a carried
 * case for ~30% of walkers; a stable per-id hash → deterministic build/tint/size jitter; and an
 * angle lerp for smooth turning.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Build a tinted-capsule figure (body + round head), base ≈ ground. `bodyR`/`bodyLen` set the
// build; the head stays spherical regardless of build so tall/short figures don't get egg heads.
export function makeFigure(bodyR, bodyLen, headR) {
  const body = new THREE.CapsuleGeometry(bodyR, bodyLen, 4, 8);
  body.translate(0, bodyR + bodyLen / 2, 0);
  const top = bodyR * 2 + bodyLen;
  const head = new THREE.SphereGeometry(headR, 12, 10);
  head.translate(0, top - 0.1 + headR, 0);
  return mergeGeometries([body, head], false);
}

// Three builds, shared across all instances of that build. Indexed by hashStr(id) % 3.
export const BUILDS = [
  makeFigure(0.30, 0.66, 0.25), // average  (~1.66 tall)
  makeFigure(0.25, 0.98, 0.22), // tall, slim
  makeFigure(0.36, 0.40, 0.28), // short, stocky
];
export const FIGURE_MAT = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, metalness: 0.08 });

// A carried case (held at the side/waist by some walkers).
export const CASE_GEOM = new THREE.BoxGeometry(0.28, 0.24, 0.2);
export const CASE_MAT = new THREE.MeshStandardMaterial({ color: '#3c4250', roughness: 0.7, metalness: 0.15 });

// Muted civilian tints — the surface crowd's role buckets; submap crowds pass their own theme tints.
export const ROLE_COLORS = ['#cdd6e6', '#b9c4d8', '#9fb3d1', '#d8c6a6', '#a9c6b0', '#c6a9be'];

// Stable 32-bit hash of a string id → deterministic per-walker variety.
export function hashStr(s) {
  let h = 2166136261;
  const str = String(s);
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
