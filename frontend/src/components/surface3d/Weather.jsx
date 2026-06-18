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

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// fall > 0 falls; fall < 0 rises. area = field diameter; top = spawn ceiling (world units).
// `sprite` (optional) = a painted particle texture in public/assets/sprites/particles.
const PRESETS = {
  dust:   { count: 400, color: '#d9c9a8', sprite: 'spr_particle_sand_64.png',        size: 0.34, fall: 0.3,   drift: 0.7, area: 64, top: 22, opacity: 0.75 },
  ash:    { count: 240, color: '#ff8a4a', sprite: 'spr_particle_ember_64.png',       size: 0.42, fall: -0.5,  drift: 0.8, area: 58, top: 26, opacity: 0.95, glow: true },
  rain:   { count: 600, color: '#a9c9ee',                                            size: 0.1,  fall: 9.0,   drift: 0.5, area: 52, top: 28, opacity: 0.4 },
  snow:   { count: 360, color: '#eaf2ff', sprite: 'spr_particle_ice_crystal_64.png', size: 0.5,  fall: 1.3,   drift: 1.1, area: 64, top: 26, opacity: 0.95 },
  mist:   { count: 150, color: '#cfd9e6', sprite: 'spr_particle_mist_64.png',        size: 1.3,  fall: 0.12,  drift: 0.4, area: 60, top: 14, opacity: 0.4 },
  pollen: { count: 300, color: '#dfe9a0', sprite: 'spr_particle_pollen_64.png',      size: 0.32, fall: -0.15, drift: 0.9, area: 60, top: 18, opacity: 0.9, glow: true },
};

const KEYWORDS = [
  [/(desert|arid|dune|dry|barren|sand|waste)/, 'dust'],
  [/(volcan|lava|magma|ash|ember|infern|scorch|molten)/, 'ash'],
  [/(ice|frozen|snow|glaci|tundra|arctic|polar)/, 'snow'],
  [/(fog|mist|humid|swamp|mire|marsh|bog|cloud)/, 'mist'],
  [/(spore|fungal|fungus|pollen|bloom|jungle|alien)/, 'pollen'],
  [/(ocean|water|rain|tropical|forest|verdant)/, 'rain'],
];

// The shipped particle PNGs have NO alpha (a gray checkerboard is baked behind the
// painted speck) and are an oversized 1024². We derive a clean alpha at load: a
// pixel is opaque where it's saturated (a colored particle) OR distinctly brighter
// than the checkerboard (light specks on a dark grid), times a soft radial guard
// that kills the corners. Downsamples to 96². One texture per file, cached; a
// failed load → null (the field falls back to flat colored points).
const _ptexCache = new Map(); // file -> Promise<THREE.CanvasTexture | null>
function loadParticleTexture(file) {
  if (_ptexCache.has(file)) return _ptexCache.get(file);
  const promise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const N = 96;
      const c = document.createElement('canvas');
      c.width = c.height = N;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, N, N);
      const im = ctx.getImageData(0, 0, N, N);
      const d = im.data;
      const lumAt = (i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const corners = [0, (N - 1) * 4, N * (N - 1) * 4, (N * N - 1) * 4];
      const bgLum = corners.reduce((s, i) => s + lumAt(i), 0) / 4;
      const bgDark = bgLum < 120;
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const i = (y * N + x) * 4;
          const sat = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
          let a = Math.max((sat - 12) / 30, bgDark ? (lumAt(i) - (bgLum + 45)) / 90 : 0);
          const dx = (x - N / 2) / (N / 2);
          const dy = (y - N / 2) / (N / 2);
          const rr = Math.hypot(dx, dy);
          const rad = rr < 0.82 ? 1 : rr > 1 ? 0 : 1 - (rr - 0.82) / 0.18;
          a = Math.max(0, Math.min(1, a)) * rad;
          d[i + 3] = a < 0.12 ? 0 : Math.round(a * 255);
        }
      }
      ctx.putImageData(im, 0, 0);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      resolve(tex);
    };
    img.onerror = () => resolve(null);
    img.src = `/assets/sprites/particles/${file}`;
  });
  _ptexCache.set(file, promise);
  return promise;
}

function useParticleTexture(file) {
  const [tex, setTex] = useState(null);
  useEffect(() => {
    if (!file) { setTex(null); return undefined; }
    let cancelled = false;
    loadParticleTexture(file).then((t) => { if (!cancelled) setTex(t); });
    return () => { cancelled = true; };
  }, [file]);
  return tex;
}

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
  const spriteTex = useParticleTexture(cfg.sprite);

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
        // Remount the material when the sprite resolves so the shader picks up the
        // map define; white tint lets the painted sprite show its own colors.
        key={spriteTex ? 'sprite' : 'flat'}
        map={spriteTex || null}
        color={spriteTex ? '#ffffff' : cfg.color}
        size={cfg.size}
        sizeAttenuation
        transparent
        alphaTest={spriteTex ? 0.2 : 0}
        opacity={cfg.opacity}
        depthWrite={false}
        fog
        toneMapped={!cfg.glow}
        blending={cfg.glow ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </points>
  );
}
