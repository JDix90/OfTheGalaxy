/**
 * Weather — a lightweight GPU particle field (one THREE.Points, ~one draw call) that
 * follows the player and adds biome-appropriate mood: drifting dust, rising embers/ash,
 * rain, or snow. Picked from the planet's biome/climate via getWeatherPreset(), or driven
 * explicitly with the `preset` prop. Respects scene fog so particles fade into the haze.
 *
 * Particles recycle around the player: falling ones respawn at the top, rising ones at the
 * ground, and any that drift past the field radius re-seed near the player — so a small,
 * fixed particle budget covers an infinite walk.
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// fall > 0 falls; fall < 0 rises. area = field diameter; top = spawn ceiling (world units).
const PRESETS = {
  dust: { count: 400, color: '#d9c9a8', size: 0.14, fall: 0.3, drift: 0.7, area: 64, top: 22, opacity: 0.58 },
  ash:  { count: 260, color: '#ff8a4a', size: 0.16, fall: -0.5, drift: 0.8, area: 58, top: 26, opacity: 0.65, glow: true },
  rain: { count: 600, color: '#a9c9ee', size: 0.1, fall: 9.0, drift: 0.5, area: 52, top: 28, opacity: 0.4 },
  snow: { count: 420, color: '#eaf2ff', size: 0.17, fall: 1.3, drift: 1.1, area: 64, top: 26, opacity: 0.75 },
};

const KEYWORDS = [
  [/(desert|arid|dune|dry|barren|sand|waste)/, 'dust'],
  [/(volcan|lava|magma|ash|ember|infern|scorch|molten)/, 'ash'],
  [/(ice|frozen|snow|glaci|tundra|arctic|polar)/, 'snow'],
  [/(ocean|water|rain|jungle|swamp|tropical|humid|forest|verdant)/, 'rain'],
];

/** Choose a weather preset key from a planet's biome/climate/type/name (or null = none). */
export function getWeatherPreset(planet) {
  if (!planet) return 'dust';
  const hay = [planet.biome, planet.climate, planet.type, planet.terrain, planet.name]
    .filter(Boolean).join(' ').toLowerCase();
  for (const [re, key] of KEYWORDS) if (re.test(hay)) return key;
  return 'dust'; // subtle default so every world has a little life in the air
}

export default function Weather({ preset = 'dust', world, worldHalf = 80 }) {
  const cfg = PRESETS[preset] || PRESETS.dust;
  const pointsRef = useRef();
  const center = useMemo(() => new THREE.Vector3(), []);

  // Per-particle state: positions buffer + horizontal drift velocities + sway phase.
  const { positions, vel, geom } = useMemo(() => {
    const n = cfg.count;
    const positions = new Float32Array(n * 3);
    const vel = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      positions[i * 3] = (Math.random() - 0.5) * cfg.area;
      positions[i * 3 + 1] = Math.random() * cfg.top;
      positions[i * 3 + 2] = (Math.random() - 0.5) * cfg.area;
      vel[i * 2] = (Math.random() - 0.5) * cfg.drift;
      vel[i * 2 + 1] = (Math.random() - 0.5) * cfg.drift;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return { positions, vel, geom };
  }, [cfg]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const pts = pointsRef.current;
    if (!pts) return;
    const p = world && world.current && world.current.player;
    if (p) center.set(p.x, 0, p.z);
    const half = cfg.area / 2;
    const rising = cfg.fall < 0;

    for (let i = 0; i < cfg.count; i++) {
      const ix = i * 3;
      positions[ix + 1] -= cfg.fall * dt;
      positions[ix] += vel[i * 2] * dt;
      positions[ix + 2] += vel[i * 2 + 1] * dt;

      // recycle vertically
      if (!rising && positions[ix + 1] < 0) {
        positions[ix + 1] = cfg.top;
        positions[ix] = center.x + (Math.random() - 0.5) * cfg.area;
        positions[ix + 2] = center.z + (Math.random() - 0.5) * cfg.area;
      } else if (rising && positions[ix + 1] > cfg.top) {
        positions[ix + 1] = 0;
        positions[ix] = center.x + (Math.random() - 0.5) * cfg.area;
        positions[ix + 2] = center.z + (Math.random() - 0.5) * cfg.area;
      }
      // keep the field centered on the player
      if (positions[ix] - center.x > half) positions[ix] -= cfg.area;
      else if (positions[ix] - center.x < -half) positions[ix] += cfg.area;
      if (positions[ix + 2] - center.z > half) positions[ix + 2] -= cfg.area;
      else if (positions[ix + 2] - center.z < -half) positions[ix + 2] += cfg.area;
    }
    pts.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geom} frustumCulled={false}>
      <pointsMaterial
        color={cfg.color}
        size={cfg.size}
        sizeAttenuation
        transparent
        opacity={cfg.opacity}
        depthWrite={false}
        fog
        toneMapped={!cfg.glow}
        blending={cfg.glow ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </points>
  );
}
