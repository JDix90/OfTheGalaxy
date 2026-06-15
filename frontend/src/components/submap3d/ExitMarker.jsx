/**
 * ExitMarker — a glowing exit portal in a 3D submap (walk near → leave / click to exit).
 * A teal doorway arch + pulsing ground ring + floating label, bloom-friendly.
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

const COLOR = '#6cf0c2';

export default function ExitMarker({ exit, active, onActivate }) {
  const ringRef = useRef();
  const archRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ringRef.current) {
      ringRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.14);
      ringRef.current.material.opacity = (active ? 0.85 : 0.5) + Math.sin(t * 3) * 0.15;
    }
    if (archRef.current) archRef.current.material.emissiveIntensity = 0.8 + (Math.sin(t * 2) + 1) * 0.3;
  });

  return (
    <group position={[exit.wx, 0, exit.wz]}>
      <group
        onClick={(e) => { e.stopPropagation(); onActivate && onActivate(exit, e); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        {/* doorway arch (two posts + lintel) */}
        {[[-1.1, 0], [1.1, 0]].map(([ox], i) => (
          <mesh key={i} position={[ox, 1.5, 0]} castShadow>
            <boxGeometry args={[0.3, 3, 0.3]} />
            <meshStandardMaterial ref={i === 0 ? archRef : undefined} color="#163a30" emissive={COLOR} emissiveIntensity={0.9} toneMapped={false} />
          </mesh>
        ))}
        <mesh position={[0, 3.1, 0]} castShadow>
          <boxGeometry args={[2.5, 0.3, 0.3]} />
          <meshStandardMaterial color="#163a30" emissive={COLOR} emissiveIntensity={0.9} toneMapped={false} />
        </mesh>
      </group>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[1.3, 1.7, 36]} />
        <meshBasicMaterial color={COLOR} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <Html position={[0, 3.8, 0]} center distanceFactor={26} occlude={false} style={{ pointerEvents: 'none' }}>
        <div style={{ textAlign: 'center', whiteSpace: 'nowrap', fontFamily: 'system-ui, sans-serif', transform: 'translateY(-50%)' }}>
          <div style={{ color: COLOR, fontSize: 13, fontWeight: 700, textShadow: '0 1px 4px #000' }}>{exit.label || 'Exit'}</div>
          {active && <div style={{ color: '#e6eefc', fontSize: 11, textShadow: '0 1px 3px #000' }}>▸ leave</div>}
        </div>
      </Html>
    </group>
  );
}
