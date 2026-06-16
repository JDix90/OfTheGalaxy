/**
 * DistantSkyline — the "the world continues past here" backdrop (Phase 6 polish).
 *
 * Replaces the hard ground-slab dropoff at the playable edge with a continuous, animated
 * far background: (1) an extended ground disc that fades the floor into the horizon haze,
 * (2) a ring of instanced building silhouettes sitting at the fog distance, (3) twinkling
 * window lights (brighter at night), and (4) a slowly drifting haze shell. Everything is
 * colour-synced to the scene's horizon fog each frame, so it tracks the day-night cycle and
 * reads as a city you simply can't walk to rather than a blank edge.
 *
 * Purely decorative + non-collidable (collision is the sim's walkable bounds). Deterministic
 * layout (seeded) so it's stable across frames/sessions. Scales off `worldHalf`, so it fits
 * both the wide planet surface and a compact spaceport submap.
 */

import React, { useMemo, useRef, useLayoutEffect, useContext } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { AtmosphereContext } from './AtmosphereContext';

// mulberry32 — a tiny deterministic PRNG so the skyline is identical every render/session.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LIGHT_VERT = `
  attribute float phase;
  uniform float uTime;
  uniform float uSize;
  varying float vTw;
  void main() {
    vTw = 0.45 + 0.55 * sin(uTime * 1.7 + phase);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * (260.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const LIGHT_FRAG = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vTw;
  void main() {
    float d = 1.0 - smoothstep(0.0, 0.5, length(gl_PointCoord - 0.5));
    gl_FragColor = vec4(uColor, d * vTw * uOpacity);
  }
`;

const HAZE_VERT = `
  varying float vY;
  void main() {
    vY = uv.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const HAZE_FRAG = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vY;
  void main() {
    float a = pow(1.0 - vY, 1.6);   // dense at the horizon, fading up
    gl_FragColor = vec4(uColor, a * uOpacity);
  }
`;

export default function DistantSkyline({ worldHalf = 40, radiusFactor = 1.55, count = 132 }) {
  const atmo = useContext(AtmosphereContext);
  const { scene } = useThree();
  const meshRef = useRef();
  const skyMatRef = useRef();
  const floorMatRef = useRef();
  const lightMatRef = useRef();
  const hazeRef = useRef();
  const hazeMatRef = useRef();

  const R = worldHalf * radiusFactor;
  const hazeR = R * 0.92;
  const hazeH = worldHalf * 0.6;

  // Build the building transforms + window-light point cloud once (deterministic).
  const { matrices, lightGeo } = useMemo(() => {
    const rand = mulberry32(0x51771);
    const dummy = new THREE.Object3D();
    const matrices = [];
    const lp = [];     // light positions
    const lph = [];    // light twinkle phases
    for (let i = 0; i < count; i++) {
      const ring = i % 3 === 0 ? 1.26 : 1.0;            // a near + far band for depth
      const a = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.07;
      const r = R * ring * (0.95 + rand() * 0.13);
      const w = worldHalf * (0.028 + rand() * 0.055);
      const d = worldHalf * (0.028 + rand() * 0.055);
      const h = worldHalf * (0.12 + rand() * 0.42) * (ring > 1 ? 0.8 : 1);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      dummy.position.set(x, h / 2, z);
      dummy.scale.set(w, h, d);
      dummy.rotation.set(0, a, 0);
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());
      // a few lit windows up the facing face
      const rows = Math.max(3, Math.floor(h / (worldHalf * 0.026)));
      for (let k = 0; k < rows; k++) {
        if (rand() < 0.32) continue;
        lp.push(x + (rand() - 0.5) * w, (k + 0.5) / rows * h, z + (rand() - 0.5) * d);
        lph.push(rand() * Math.PI * 2);
      }
    }
    const lightGeo = new THREE.BufferGeometry();
    lightGeo.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    lightGeo.setAttribute('phase', new THREE.Float32BufferAttribute(lph, 1));
    return { matrices, lightGeo };
  }, [worldHalf, R, count]);

  useLayoutEffect(() => {
    const m = meshRef.current;
    if (!m) return;
    for (let i = 0; i < matrices.length; i++) m.setMatrixAt(i, matrices[i]);
    m.instanceMatrix.needsUpdate = true;
    m.frustumCulled = false;
  }, [matrices]);

  const lightUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSize: { value: Math.max(1.2, worldHalf * 0.045) },
    uColor: { value: new THREE.Color('#ffd9a0') },
    uOpacity: { value: 0.0 },
  }), [worldHalf]);
  const hazeUniforms = useMemo(() => ({
    uColor: { value: new THREE.Color('#9fb3d1') },
    uOpacity: { value: 0.5 },
  }), []);

  const _c = useMemo(() => new THREE.Color(), []);
  useFrame((state, dt) => {
    const fogCol = scene.fog && scene.fog.color;
    const night = (atmo && atmo.current && atmo.current.nightFactor) || 0;
    // Silhouettes: a touch darker than the horizon so they read as shapes; the extended floor
    // sits just under the horizon tone so the ground appears to continue into the haze.
    if (fogCol) {
      if (skyMatRef.current) skyMatRef.current.color.copy(fogCol).multiplyScalar(0.6 - night * 0.15);
      if (floorMatRef.current) floorMatRef.current.color.copy(fogCol).multiplyScalar(0.82);
      if (hazeMatRef.current) hazeMatRef.current.uniforms.uColor.value.copy(fogCol).lerp(_c.set('#ffffff'), 0.06);
    }
    if (lightMatRef.current) {
      lightMatRef.current.uniforms.uTime.value += dt;
      lightMatRef.current.uniforms.uOpacity.value = 0.18 + night * 0.82; // windows light up at dusk
    }
    if (hazeMatRef.current) hazeMatRef.current.uniforms.uOpacity.value = 0.5 + 0.14 * Math.sin(state.clock.elapsedTime * 0.25);
    if (hazeRef.current) hazeRef.current.rotation.y += dt * 0.012; // slow drift
  });

  return (
    <group>
      {/* extended ground — continues the floor past the play edge and fades into the haze */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} frustumCulled={false}>
        <circleGeometry args={[R * 1.35, 72]} />
        <meshBasicMaterial ref={floorMatRef} color="#0c1426" />
      </mesh>

      {/* building silhouettes */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, matrices.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial ref={skyMatRef} color="#0c1426" />
      </instancedMesh>

      {/* twinkling window lights */}
      <points geometry={lightGeo} frustumCulled={false}>
        <shaderMaterial
          ref={lightMatRef}
          uniforms={lightUniforms}
          vertexShader={LIGHT_VERT}
          fragmentShader={LIGHT_FRAG}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          fog={false}
          toneMapped={false}
        />
      </points>

      {/* drifting horizon haze shell */}
      <mesh ref={hazeRef} position={[0, hazeH * 0.42, 0]} frustumCulled={false}>
        <cylinderGeometry args={[hazeR, hazeR, hazeH, 56, 1, true]} />
        <shaderMaterial
          ref={hazeMatRef}
          uniforms={hazeUniforms}
          vertexShader={HAZE_VERT}
          fragmentShader={HAZE_FRAG}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
