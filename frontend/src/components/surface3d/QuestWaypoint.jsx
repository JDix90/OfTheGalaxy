/**
 * QuestWaypoint — a floating 3D marker for one quest objective (the 3D port of the 2D
 * surface's pulsing quest target). A tall additive light beam makes it findable from
 * anywhere on the map (even over buildings — the classic MMO quest beacon), with a
 * pulsing ground ring and a bobbing icon + objective label. Combat objectives read red
 * with a ⚔ glyph; others read amber with a !.
 *
 * Data (`wp`) is pre-built world-positioned by buildQuestWaypoints in surfaceData.js, so
 * the beacon lines up exactly with the POI/NPC at the objective's surface coordinate.
 * The beam is `toneMapped={false}` + additive so it blooms in the Phase-2 PostFX.
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

const BEAM_H = 30; // tall enough to clear buildings and read from across the map

export default function QuestWaypoint({ wp }) {
  const beamRef = useRef();
  const ringRef = useRef();
  const iconRef = useRef();
  const color = wp.combat ? '#ff4d4d' : '#ffd24a';
  const icon = wp.combat ? '⚔' : '!';

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ringRef.current) {
      ringRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.18);
      ringRef.current.material.opacity = 0.45 + Math.sin(t * 3) * 0.2;
    }
    if (beamRef.current) beamRef.current.material.opacity = 0.26 + (Math.sin(t * 2) + 1) * 0.06;
    if (iconRef.current) iconRef.current.position.y = 2.6 + Math.sin(t * 2) * 0.16;
  });

  return (
    <group position={[wp.wx, 0, wp.wz]}>
      {/* translucent outer beam — NormalBlending so it reads against a bright daytime sky */}
      <mesh ref={beamRef} position={[0, BEAM_H / 2, 0]}>
        <cylinderGeometry args={[0.55, 0.95, BEAM_H, 14, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.28} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* bright additive core — glows + blooms at night */}
      <mesh position={[0, BEAM_H / 2, 0]}>
        <cylinderGeometry args={[0.16, 0.22, BEAM_H, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      {/* pulsing ground ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[1.0, 1.5, 36]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* bobbing icon + objective label */}
      <group ref={iconRef} position={[0, 2.6, 0]}>
        <Html center distanceFactor={26} occlude={false} style={{ pointerEvents: 'none' }}>
          <div style={{ textAlign: 'center', whiteSpace: 'nowrap', fontFamily: 'system-ui, sans-serif', transform: 'translateY(-50%)' }}>
            <div style={{ color, fontSize: 20, fontWeight: 800, lineHeight: 1, textShadow: '0 1px 6px #000' }}>{icon}</div>
            <div style={{ display: 'inline-block', marginTop: 2, padding: '1px 8px', borderRadius: 6, background: 'rgba(8,12,22,0.6)', border: `1px solid ${color}`, color: '#f0f4ff', fontSize: 11, fontWeight: 600, textShadow: '0 1px 3px #000', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {wp.label}
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
}
