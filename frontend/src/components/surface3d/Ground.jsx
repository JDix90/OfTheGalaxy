/**
 * Ground — the lit surface floor.
 *
 * A terrain-tinted PBR plane (planet-specific color) optionally overlaid with the
 * planet's existing aerial texture (the same art the 2D map uses, via assetManager's
 * path convention), plus a subtle grid for motion reference. Receives shadows.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Grid } from '@react-three/drei';
import * as THREE from 'three';

const TERRAIN_COLORS = {
  desert: '#b9925a', sand: '#caa472',
  urban: '#39405a', city: '#39405a',
  // Enclosed clinic/civic interiors: a clean clinical floor (only matches submap "terrains").
  medical_center: '#808a9e', hospital: '#808a9e', civic: '#868ea2',
  jungle: '#2f5d3a', forest: '#2f5d3a', grassland: '#496b39', swamp: '#3d4a35',
  ocean: '#1f4a6b', water: '#1f4a6b', underwater: '#173a55',
  ice: '#acc6d6', frozen: '#acc6d6',
  volcanic: '#3a2420', lava: '#3a2420',
  barren: '#6b5d4f', rocky: '#5d5346', terrestrial: '#3a4458',
  gas_giant: '#54466b',
};

function terrainColor(planet) {
  const keys = [planet?.terrain, planet?.planetType, planet?.type, planet?.mapData?.terrain]
    .filter(Boolean).map((s) => String(s).toLowerCase());
  for (const k of keys) if (TERRAIN_COLORS[k]) return TERRAIN_COLORS[k];
  return '#2a3145';
}

export default function Ground({ planet, size, textureUrl, colorOverride }) {
  const matRef = useRef();
  // `colorOverride` lets a submap tint the play-area floor to its theme palette so the floor and
  // the surrounding enclosure floor read as one surface (submapThemes). Else terrain-tint.
  const color = useMemo(() => colorOverride || terrainColor(planet), [planet, colorOverride]);

  // Load the planet's aerial texture manually (no Suspense): missing = tint only.
  useEffect(() => {
    if (!textureUrl || !matRef.current) return;
    let disposed = false;
    const loader = new THREE.TextureLoader();
    loader.load(
      textureUrl,
      (tex) => {
        if (disposed) { tex.dispose(); return; }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        matRef.current.map = tex;
        // Darken/tint the photo so it reads as lit terrain, not a flat map.
        matRef.current.color = new THREE.Color('#8a93a8');
        matRef.current.needsUpdate = true;
      },
      undefined,
      () => { /* keep solid tint */ },
    );
    return () => { disposed = true; };
  }, [textureUrl]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial ref={matRef} color={color} roughness={1} metalness={0} />
      </mesh>
      <Grid
        args={[size, size]}
        cellSize={4}
        cellThickness={0.5}
        cellColor="#2c3856"
        sectionSize={20}
        sectionThickness={1.0}
        sectionColor="#3c5488"
        fadeDistance={size * 0.85}
        fadeStrength={2}
        infiniteGrid={false}
        position={[0, 0.02, 0]}
      />
    </group>
  );
}
