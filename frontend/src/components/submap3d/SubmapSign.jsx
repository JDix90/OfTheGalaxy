/**
 * SubmapSign — a diegetic wayfinding sign (submap-liveliness Phase 5): a physical emissive panel on
 * a post, with the zone name printed on it. Marks the named areas of an interior ("Reception",
 * "Treatment Wing", "Hangar Bay", "Market Floor") that otherwise had no in-world label, so a space
 * reads as a real, sign-posted place. Positioned by buildSubmapSignage (submapData).
 *
 * The post + glowing board are real geometry (catch bloom); the readable text is a small drei <Html>
 * billboard parented to the board (reusing the PoiStructure label look) so it stays legible from the
 * top-down follow camera. Visual only — no collision, no interaction.
 */

import React from 'react';
import { Html } from '@react-three/drei';

const POST_MAT_COLOR = '#3a3e48';

export default function SubmapSign({ sign, theme }) {
  if (!sign) return null;
  const pal = (theme && theme.palette) || {};
  const accent = pal.accent || '#9fb3d1';
  const trim = pal.trim || accent;

  return (
    <group position={[sign.wx, 0, sign.wz]}>
      {/* post */}
      <mesh position={[0, 1.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.12, 2.7, 0.12]} />
        <meshStandardMaterial color={POST_MAT_COLOR} roughness={0.7} metalness={0.3} />
      </mesh>
      {/* glowing board */}
      <mesh position={[0, 2.85, 0]} castShadow>
        <boxGeometry args={[1.8, 0.58, 0.08]} />
        <meshStandardMaterial color="#10151f" emissive={trim} emissiveIntensity={0.5} toneMapped={false} />
      </mesh>
      {/* printed text (billboard, legible from the follow cam) */}
      <Html position={[0, 2.85, 0.06]} center distanceFactor={14} occlude={false} style={{ pointerEvents: 'none' }}>
        <div style={{
          whiteSpace: 'nowrap', fontFamily: 'system-ui, sans-serif', fontSize: 13, fontWeight: 600,
          letterSpacing: 0.3, color: '#eaf0fb', textShadow: `0 0 6px ${trim}, 0 1px 3px #000`,
        }}>{sign.label}</div>
      </Html>
    </group>
  );
}
