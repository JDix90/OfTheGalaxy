/**
 * Atmosphere — the day-night sky + lighting rig (Phase 2).
 *
 * Drives, every frame, from a time-of-day t ∈ [0,1):
 *   - a gradient sky-dome (custom shader: horizon→top blend + sun glow),
 *   - an animated sun directional light (position/color/intensity) with shadows,
 *   - a hemisphere + ambient fill that cools to moonlight at night,
 *   - a bloom-friendly sun disc + a faint moon,
 *   - drei Stars that fade in after dusk,
 *   - scene fog/background color,
 * and writes the night/day factors into the shared AtmosphereContext ref so other
 * components (POI point lights) can react without re-rendering.
 *
 * `time` (0–1) controls it directly; omit it to auto-advance over `cycleSeconds`.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { sampleDayNight } from './dayNight';

const SKY_VERT = `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;
const SKY_FRAG = `
  uniform vec3 topColor;
  uniform vec3 horizonColor;
  uniform vec3 sunColor;
  uniform vec3 sunDir;
  uniform float sunGlow;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(horizonColor, topColor, pow(h, 0.9));
    float sd = max(dot(d, normalize(sunDir)), 0.0);
    col += sunColor * pow(sd, 220.0) * sunGlow;        // tight disc halo
    col += sunColor * pow(sd, 6.0) * sunGlow * 0.18;   // broad atmospheric scatter
    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function Atmosphere({ worldHalf, time, cycleSeconds = 240, startTime = 0.6, paused = false, atmoRef, onTime }) {
  const { scene } = useThree();
  const sun = useRef();
  const hemi = useRef();
  const amb = useRef();
  const sunDisc = useRef();
  const moon = useRef();
  const skyMat = useRef();
  const stars = useRef();
  const tRef = useRef(startTime);
  const onTimeAcc = useRef(0);

  const domeR = worldHalf * 4;
  const sunR = domeR * 0.9;

  const uniforms = useMemo(() => ({
    topColor: { value: new THREE.Color('#1f4f86') },
    horizonColor: { value: new THREE.Color('#9fc2e0') },
    sunColor: { value: new THREE.Color('#fff3df') },
    sunDir: { value: new THREE.Vector3(0, 1, 0) },
    sunGlow: { value: 1.0 },
  }), []);

  // Cool fog so distance reads at night too; color is updated each frame.
  useEffect(() => {
    const prevFog = scene.fog;
    scene.fog = new THREE.Fog('#0c1426', worldHalf * 0.8, worldHalf * 2.6);
    return () => { scene.fog = prevFog; };
  }, [scene, worldHalf]);

  useFrame((_, dt) => {
    let t = time;
    if (t == null) {
      if (!paused) tRef.current = (tRef.current + dt / cycleSeconds) % 1;
      t = tRef.current;
    } else {
      tRef.current = t;
    }
    const s = sampleDayNight(t);

    if (sun.current) {
      sun.current.position.set(s.sunDir[0] * sunR, s.sunDir[1] * sunR, s.sunDir[2] * sunR);
      sun.current.color.setRGB(s.sunColor[0], s.sunColor[1], s.sunColor[2]);
      sun.current.intensity = s.sunIntensity;
    }
    if (hemi.current) {
      hemi.current.color.setRGB(s.hemiSky[0], s.hemiSky[1], s.hemiSky[2]);
      hemi.current.groundColor.setRGB(s.hemiGround[0], s.hemiGround[1], s.hemiGround[2]);
      hemi.current.intensity = s.hemiIntensity;
    }
    if (amb.current) amb.current.intensity = s.ambientIntensity;

    if (skyMat.current) {
      const u = skyMat.current.uniforms;
      u.topColor.value.setRGB(s.skyTop[0], s.skyTop[1], s.skyTop[2]);
      u.horizonColor.value.setRGB(s.skyHorizon[0], s.skyHorizon[1], s.skyHorizon[2]);
      u.sunColor.value.setRGB(s.sunColor[0], s.sunColor[1], s.sunColor[2]);
      u.sunDir.value.set(s.sunDir[0], s.sunDir[1], s.sunDir[2]);
      u.sunGlow.value = Math.max(s.dayFactor, s.twilight) * 1.2;
    }

    if (sunDisc.current) {
      sunDisc.current.visible = s.sunUp;
      sunDisc.current.position.set(s.sunDir[0] * sunR, s.sunDir[1] * sunR, s.sunDir[2] * sunR);
      // boost > 1 so it crosses the bloom threshold
      sunDisc.current.material.color.setRGB(s.sunColor[0] * 1.7, s.sunColor[1] * 1.7, s.sunColor[2] * 1.7);
    }
    if (moon.current) {
      moon.current.visible = s.nightFactor > 0.25;
      moon.current.position.set(-s.sunDir[0] * sunR, Math.abs(s.sunDir[1]) * sunR * 0.8 + 8, -s.sunDir[2] * sunR);
      const m = 0.7 + s.nightFactor * 0.8;
      moon.current.material.color.setRGB(0.7 * m, 0.78 * m, 0.95 * m);
    }

    if (scene.fog) scene.fog.color.setRGB(s.skyHorizon[0], s.skyHorizon[1], s.skyHorizon[2]);
    if (!scene.background) scene.background = new THREE.Color();
    scene.background.setRGB(s.skyHorizon[0], s.skyHorizon[1], s.skyHorizon[2]);

    if (stars.current && stars.current.material) {
      stars.current.material.transparent = true;
      stars.current.material.opacity = s.starsOpacity;
      stars.current.visible = s.starsOpacity > 0.02;
    }

    if (atmoRef) atmoRef.current = { nightFactor: s.nightFactor, dayFactor: s.dayFactor, time: t };

    if (onTime) {
      onTimeAcc.current += dt;
      if (onTimeAcc.current > 0.2) { onTimeAcc.current = 0; onTime(t, s); }
    }
  });

  return (
    <group>
      <hemisphereLight ref={hemi} args={['#bcd4ff', '#0c0e16', 0.5]} />
      <ambientLight ref={amb} intensity={0.18} />
      <directionalLight
        ref={sun}
        castShadow
        intensity={2.2}
        color="#fff3df"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={worldHalf * 8}
        shadow-camera-left={-worldHalf}
        shadow-camera-right={worldHalf}
        shadow-camera-top={worldHalf}
        shadow-camera-bottom={-worldHalf}
        shadow-bias={-0.0004}
      />

      {/* gradient sky dome */}
      <mesh scale={[domeR, domeR, domeR]} frustumCulled={false}>
        <sphereGeometry args={[1, 32, 16]} />
        <shaderMaterial
          ref={skyMat}
          uniforms={uniforms}
          vertexShader={SKY_VERT}
          fragmentShader={SKY_FRAG}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
          toneMapped={false}
        />
      </mesh>

      {/* sun + moon discs (bloom sources) */}
      <mesh ref={sunDisc}>
        <sphereGeometry args={[domeR * 0.045, 20, 20]} />
        <meshBasicMaterial color="#fff3df" toneMapped={false} fog={false} />
      </mesh>
      <mesh ref={moon} visible={false}>
        <sphereGeometry args={[domeR * 0.03, 20, 20]} />
        <meshBasicMaterial color="#b6c4e0" toneMapped={false} fog={false} />
      </mesh>

      <Stars ref={stars} radius={worldHalf * 3} depth={60} count={3500} factor={5} saturation={0} fade speed={0.3} />
    </group>
  );
}
