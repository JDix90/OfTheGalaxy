/**
 * Furniture — typed 3D props for a building interior (Phase 5.2): counters, shelves,
 * displays, signs, plants, and glowing vendor/terminal accents. Built by
 * buildSubmapFurniture (submapData). Collision is the submap's collisionMap (the sim
 * already blocks these cells); these meshes are the visual layer.
 */

import React from 'react';

export default function Furniture({ items }) {
  if (!items || !items.length) return null;
  return (
    <group>
      {items.map((f) => (
        <mesh key={f.id} position={[f.wx, f.ht / 2, f.wz]} rotation={[0, f.rot || 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[f.wlen, f.ht, f.dlen]} />
          <meshStandardMaterial
            color={f.color}
            emissive={f.emissive || '#000000'}
            emissiveIntensity={f.emissive ? 0.7 : 0}
            roughness={0.8}
            metalness={0.1}
            toneMapped={!f.emissive}
          />
        </mesh>
      ))}
    </group>
  );
}
