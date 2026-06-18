/**
 * SubmapEnclosure — boundary + roof shell that makes a submap read as a real place instead
 * of a slab floating in a grey void (Phase 5.3 visual pass).
 *
 * Open facility submaps (medical_center / civic / city / market) are "open" or
 * collision-mapped sims whose PERIMETER is fully walkable, so the player can walk to the slab
 * edge and stare into the void. This wraps the play area (sized from `sim.worldHalf`) in:
 *   - a perimeter wall ring just outside the walkable area, tall + roofed for enclosed rooms,
 *     lower for open-air districts,
 *   - an interior floor that extends out to those walls (no slab edge inside), plus a big dark
 *     skirt so nothing past the walls is ever a void,
 *   - for enclosed types: a ceiling (kept above the camera), bloom-y ceiling light strips, and
 *     hemisphere/ambient/fill lighting.
 *
 * `mode='enclosed'` (clinics/civic) → roofed, night-lit room. `mode='open'` (city/market/etc.)
 * → open-air district under the sky. Building interiors keep their own 5.2 shell (InteriorWalls)
 * and do NOT use this component.
 */

import React from 'react';
import * as THREE from 'three';

// Follow camera sits ~6.5 high (PlayerActor CAM_HEIGHT) and looks down at the player; keep the
// ceiling just above it. Walls sit just outside the play area so they're a visible boundary
// (the down-looking camera mostly stays inside them; transient edge clips are acceptable and
// match the existing building-interior behavior).
const WALL_MARGIN = 5;
const CAM_HEIGHT = 6.5;

// Fallback palette/lighting if no theme is passed (keeps the component usable standalone). The
// real per-POI-type look comes from the `theme` prop (submapThemes.js) — see SubmapScene.
const FALLBACK = {
  palette: { wall: '#c2cbdb', floor: '#808a9e', ceiling: '#dde4ef', trim: '#7fd6ff' },
  lighting: { mode: 'enclosed', ambient: '#e3ecf8', ambientInt: 0.9, hemiSky: '#eef4ff', hemiGround: '#aeb8cc', hemiInt: 1.4, fill: '#f3f8ff', fillInt: 1.6, strip: '#f3f8ff', stripInt: 2.4 },
};

export default function SubmapEnclosure({ sim, theme, accent }) {
  if (!sim) return null;
  const half = sim.worldHalf || 40;
  const pal = (theme && theme.palette) || FALLBACK.palette;
  const lit = (theme && theme.lighting) || FALLBACK.lighting;
  const enclosed = lit.mode === 'enclosed'; // clinics/civic: roofed room. else: open-air district.
  const trim = accent || pal.trim;

  // Walls just outside the walkable area so they read as a real boundary, not a far horizon.
  const ringHalf = half + WALL_MARGIN;
  const tw = 2.2; // wall thickness
  const span = ringHalf * 2 + tw * 2;
  // Keep the ceiling just above the camera so it actually reads as a roof in the down-looking
  // follow view, without ever clipping it (camera is fixed at CAM_HEIGHT).
  const wallH = enclosed ? CAM_HEIGHT + 4 : CAM_HEIGHT + 2;

  // [centerX, centerZ, width(x), depth(z)] for the 4 perimeter walls.
  const walls = [
    [0, -(ringHalf + tw / 2), span, tw],
    [0, ringHalf + tw / 2, span, tw],
    [-(ringHalf + tw / 2), 0, tw, span],
    [ringHalf + tw / 2, 0, tw, span],
  ];

  return (
    <group>
      {/* Interior floor out to the walls (covers the slab edge), then a big dark skirt so the
          area past the walls is never an empty void. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[span, span]} />
        <meshStandardMaterial color={pal.floor} roughness={1} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]}>
        <planeGeometry args={[span * 4, span * 4]} />
        <meshStandardMaterial color="#0b1020" roughness={1} metalness={0} />
      </mesh>

      {walls.map(([x, z, w, d], i) => (
        <group key={i}>
          <mesh position={[x, wallH / 2, z]} castShadow receiveShadow>
            <boxGeometry args={[w, wallH, d]} />
            <meshStandardMaterial color={pal.wall} roughness={0.92} metalness={0.06} />
          </mesh>
          {/* Emissive trim along the top inner edge — neon-ish accent that catches bloom. */}
          <mesh position={[x, wallH - 0.3, z]}>
            <boxGeometry args={[w * 0.99, 0.2, d * 0.99]} />
            <meshStandardMaterial color={trim} emissive={trim} emissiveIntensity={0.9} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {enclosed && (
        <group>
          {/* Ceiling caps the view (reads as indoors). Enclosed scenes render at night (sun
              off), so the room is lit by the strips + fill + POI lights below, not daylight —
              no need to shadow-cast the ceiling (which left sun leaking under its edges). */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, wallH, 0]}>
            <planeGeometry args={[span, span]} />
            <meshStandardMaterial color={pal.ceiling} side={THREE.DoubleSide} roughness={1} metalness={0} />
          </mesh>
          {[-ringHalf * 0.55, 0, ringHalf * 0.55].map((cx, i) => (
            <mesh key={i} position={[cx, wallH - 0.18, 0]}>
              <boxGeometry args={[ringHalf * 0.07, 0.12, span * 0.74]} />
              <meshStandardMaterial color={lit.strip} emissive={lit.strip} emissiveIntensity={lit.stripInt ?? 2.4} toneMapped={false} />
            </mesh>
          ))}
          {/* Themed artificial lighting: a strong hemisphere + ambient give an even, distance-
              independent base (no dark corners / no hotspot), with a soft overhead point for
              depth. The sun is off (night) so this fully defines the room — its colour temp is
              what makes a clinic read surgical and a hall read warm marble. */}
          <ambientLight intensity={lit.ambientInt ?? 0.9} color={lit.ambient} />
          <hemisphereLight intensity={lit.hemiInt ?? 1.4} color={lit.hemiSky} groundColor={lit.hemiGround} />
          <pointLight position={[0, wallH - 1, 0]} intensity={lit.fillInt ?? 1.6} distance={ringHalf * 3.6} decay={1.5} color={lit.fill} />
        </group>
      )}

      {/* Open-air districts keep the global day-night sun, but the theme adds a tinted hemisphere
          + a soft overhead fill so each district reads in-character (warm gold market, cold
          spaceport concourse, ominous ruin) instead of one flat daylight. */}
      {!enclosed && (
        <group>
          <hemisphereLight intensity={lit.hemiInt ?? 0.5} color={lit.hemiSky} groundColor={lit.hemiGround} />
          {lit.fillInt > 0 && (
            <pointLight position={[0, wallH + 4, 0]} intensity={lit.fillInt} distance={half * 2.6} decay={2} color={lit.fill} />
          )}
        </group>
      )}
    </group>
  );
}
