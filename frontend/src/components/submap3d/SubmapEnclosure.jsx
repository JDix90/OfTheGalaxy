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

const PALETTE = {
  enclosed: { wall: '#2c3346', floor: '#242a3a', ceiling: '#161b2a', strip: '#dce8ff', trim: '#7db8ff' },
  open: { wall: '#39405a', floor: '#2a3145', ceiling: '#161b2a', strip: '#cfe3ff', trim: '#6cf0c2' },
};

export default function SubmapEnclosure({ sim, mode = 'open', accent }) {
  if (!sim) return null;
  const half = sim.worldHalf || 40;
  const enclosed = mode === 'enclosed'; // clinics/civic: roofed room. else: open-air district.
  const pal = enclosed ? PALETTE.enclosed : PALETTE.open;
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
          {[-ringHalf * 0.5, 0, ringHalf * 0.5].map((cx, i) => (
            <mesh key={i} position={[cx, wallH - 0.18, 0]}>
              <boxGeometry args={[ringHalf * 0.06, 0.12, span * 0.7]} />
              <meshStandardMaterial color={pal.strip} emissive={pal.strip} emissiveIntensity={1.6} toneMapped={false} />
            </mesh>
          ))}
          {/* Indoor lighting: hemisphere + ambient give an even, distance-independent base (no
              dark corners); a soft overhead point adds gentle center pooling. Kept moderate so
              the night-time room reads as a clean lit interior without blowing out the floor. */}
          <ambientLight intensity={0.3} color="#cdd8ee" />
          <hemisphereLight intensity={0.5} color="#dce8ff" groundColor="#2a3145" />
          <pointLight position={[0, wallH - 1, 0]} intensity={1.5} distance={ringHalf * 3} decay={2} color="#e9f0ff" />
        </group>
      )}
    </group>
  );
}
