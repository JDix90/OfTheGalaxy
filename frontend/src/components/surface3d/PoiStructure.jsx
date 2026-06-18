/**
 * PoiStructure — a manifest-driven 3D structure for one POI / location.
 *
 * Phase 3 renders a real CC0 glTF building (Kenney Space Kit) per category, auto-fitted
 * to the ground, plus a deterministic scatter of props around it. While the glTF streams
 * in (or if a category has no building) it falls back to the Phase-1 composed-primitive
 * "building". The building/props come from `modelManifest` (poi.building / poi.props), so
 * dropping in a Synty kit later is a manifest change. Shows a floating label and, for
 * enterable locations, a pulsing ground ring when the player is in range (`active`).
 */

import React, { Suspense, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import GltfModel from './GltfModel';
import { useAtmosphere } from './atmosphere/AtmosphereContext';
import { formatDisplayName } from '../../utils/formatName';
import { getPOISpriteFilename } from '../../data/poiSpriteMap';

// Painted POI icon (frontend/public/assets/sprites/poi/*). Loaded as a THREE
// texture once per URL and shared across every POI of the same type — a promise
// cache dedupes concurrent first-loads. Mirrors Ground.jsx's manual (no-Suspense)
// loader so a missing sprite degrades gracefully to "no icon", never a throw.
// The shipped POI PNGs are circular badges, but they were exported with NO alpha
// channel — a transparency checkerboard is baked into the (square) corners, and
// they're a needlessly heavy 1024². Rather than depend on re-exported art, we
// composite each through a circular canvas clip on load: real transparent corners
// + downsampled to 256² (a VRAM win). The result reads as an intentional medallion
// marker. (When proper cut-out art arrives, this loader can become a plain load.)
// One texture per URL, shared across every POI of the same type; a promise cache
// dedupes concurrent first-loads, and a failed load resolves to null (no icon).
const _poiTexCache = new Map(); // url -> Promise<THREE.Texture | null>
function loadPoiTexture(url) {
  if (_poiTexCache.has(url)) return _poiTexCache.get(url);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = 256;
      const cx = size / 2;
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);

      // The colorful badge sits in the center; the baked checkerboard is a
      // desaturated (gray) ring/corners. Find the badge edge per-sprite by
      // scanning outward along 8 directions for the saturation falloff, then
      // clip to the median radius so every icon crops to just its art.
      const px = ctx.getImageData(0, 0, size, size).data;
      const satAt = (x, y) => {
        const i = (y * size + x) * 4;
        return Math.max(px[i], px[i + 1], px[i + 2]) - Math.min(px[i], px[i + 1], px[i + 2]);
      };
      const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1], [0.7071, 0.7071], [-0.7071, 0.7071], [0.7071, -0.7071], [-0.7071, -0.7071]];
      const edges = dirs.map(([dx, dy]) => {
        for (let f = 0.20; f <= 0.48; f += 0.01) {
          if (satAt(Math.round(cx + dx * f * size), Math.round(cx + dy * f * size)) < 22) return f;
        }
        return 0.46;
      }).sort((a, b) => a - b);
      const rFrac = Math.min(0.46, Math.max(0.26, edges[edges.length >> 1])); // clamped median

      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cx, rFrac * size, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, 0, 0, size, size);
      ctx.restore();

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      resolve(tex);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
  _poiTexCache.set(url, p);
  return p;
}

function usePoiSpriteTexture(poiType) {
  const [tex, setTex] = useState(null);
  useEffect(() => {
    const file = getPOISpriteFilename(poiType);
    if (!file) { setTex(null); return undefined; }
    let cancelled = false;
    loadPoiTexture(`/assets/sprites/poi/${file}`).then((t) => { if (!cancelled) setTex(t); });
    return () => { cancelled = true; };
  }, [poiType]);
  return tex;
}

function Box({ w, h, d, y = 0, color, emissive, ei = 0, ...rest }) {
  return (
    <mesh position={[0, y + h / 2, 0]} castShadow receiveShadow {...rest}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} emissive={emissive || '#000'} emissiveIntensity={ei} roughness={0.7} metalness={0.2} />
    </mesh>
  );
}

function StructureMesh({ s }) {
  const { shape, color, accent, emissive, height: H, footprint: F, glow } = s;
  switch (shape) {
    case 'pad':
      return (
        <group>
          <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[F * 0.6, F * 0.7, 0.3, 24]} />
            <meshStandardMaterial color={color} roughness={0.6} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.32, 0]}>
            <torusGeometry args={[F * 0.5, 0.08, 8, 32]} />
            <meshStandardMaterial color={accent} emissive={emissive} emissiveIntensity={glow} toneMapped={false} />
          </mesh>
          <Box w={F * 0.22} h={H} d={F * 0.22} y={0.3} color={accent} emissive={emissive} ei={glow * 0.4} />
          <mesh position={[0, H + 0.4, 0]}>
            <sphereGeometry args={[0.45, 16, 16]} />
            <meshStandardMaterial color={accent} emissive={emissive} emissiveIntensity={glow * 1.4} toneMapped={false} />
          </mesh>
        </group>
      );
    case 'cluster':
      return (
        <group>
          {[[-1, -1, 0.7], [1, -0.6, 0.9], [-0.5, 1, 0.6], [1.1, 1, 0.8], [0, 0, 1.0]].map(([ox, oz, hh], i) => (
            <group key={i} position={[ox * F * 0.3, 0, oz * F * 0.3]}>
              <Box w={F * 0.3} h={H * hh} d={F * 0.3} color={color} />
              <Box w={F * 0.36} h={0.15} d={F * 0.36} y={H * hh} color={accent} emissive={emissive} ei={glow} />
            </group>
          ))}
        </group>
      );
    case 'habitat':
      return (
        <group>
          <Box w={F * 0.5} h={H} d={F * 0.5} color={color} emissive={emissive} ei={glow * 0.25} />
          <group position={[F * 0.28, 0, 0]}><Box w={F * 0.32} h={H * 1.45} d={F * 0.32} color={color} emissive={emissive} ei={glow * 0.25} /></group>
          <group position={[-F * 0.26, 0, F * 0.1]}><Box w={F * 0.28} h={H * 0.8} d={F * 0.28} color={color} emissive={emissive} ei={glow * 0.25} /></group>
          {/* lit windows band */}
          <mesh position={[0, H * 0.7, F * 0.251]}>
            <planeGeometry args={[F * 0.46, H * 0.5]} />
            <meshStandardMaterial color={accent} emissive={emissive} emissiveIntensity={glow} toneMapped={false} />
          </mesh>
        </group>
      );
    case 'dome':
      return (
        <group>
          <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[F * 0.5, F * 0.55, 0.8, 24]} />
            <meshStandardMaterial color={color} roughness={0.6} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.8, 0]} castShadow>
            <sphereGeometry args={[F * 0.45, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.85, 0]}>
            <torusGeometry args={[F * 0.45, 0.06, 8, 32]} />
            <meshStandardMaterial color={accent} emissive={emissive} emissiveIntensity={glow} toneMapped={false} />
          </mesh>
          <mesh position={[0, H + 0.4, 0]}>
            <coneGeometry args={[0.25, 1.2, 8]} />
            <meshStandardMaterial color={accent} emissive={emissive} emissiveIntensity={glow * 1.2} toneMapped={false} />
          </mesh>
        </group>
      );
    case 'industrial':
      return (
        <group>
          <Box w={F * 0.6} h={H * 0.7} d={F * 0.5} color={color} />
          <mesh position={[F * 0.28, H * 0.6, 0]} castShadow>
            <cylinderGeometry args={[F * 0.16, F * 0.16, H * 1.2, 16]} />
            <meshStandardMaterial color={color} metalness={0.5} roughness={0.5} />
          </mesh>
          <mesh position={[-F * 0.26, H * 0.45, F * 0.1]} castShadow>
            <cylinderGeometry args={[F * 0.12, F * 0.12, H * 0.9, 16]} />
            <meshStandardMaterial color={accent} metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[F * 0.28, H * 1.25, 0]}>
            <torusGeometry args={[F * 0.18, 0.05, 8, 24]} />
            <meshStandardMaterial color={accent} emissive={emissive} emissiveIntensity={glow} toneMapped={false} />
          </mesh>
        </group>
      );
    case 'spire':
      return (
        <group>
          <mesh position={[0, H * 0.5, 0]} rotation={[0, Math.PI / 5, 0]} castShadow>
            <coneGeometry args={[F * 0.4, H, 5]} />
            <meshStandardMaterial color={color} roughness={0.85} metalness={0.1} />
          </mesh>
          <mesh position={[0, H * 0.45, 0]}>
            <coneGeometry args={[F * 0.18, H * 0.9, 5]} />
            <meshStandardMaterial color={accent} emissive={emissive} emissiveIntensity={glow} toneMapped={false} transparent opacity={0.85} />
          </mesh>
        </group>
      );
    // Low room block — facility rooms (clinic wards, civic offices) + houses. Reads as a
    // walled room, not a tall obelisk. Footprint matches the building's floor cells.
    case 'room':
      return (
        <group>
          <Box w={F} h={H} d={F} color={color} emissive={emissive} ei={glow * 0.12} />
          <Box w={F * 1.05} h={0.18} d={F * 1.05} y={H} color={accent} emissive={emissive} ei={glow * 0.32} />
          {/* lit window/door band on the entrance face */}
          <mesh position={[0, H * 0.46, F / 2 + 0.02]}>
            <planeGeometry args={[F * 0.52, H * 0.42]} />
            <meshStandardMaterial color={accent} emissive={emissive} emissiveIntensity={glow * 1.1} toneMapped={false} />
          </mesh>
        </group>
      );
    // Market stall — counter + glowing wares under a canopy on posts.
    case 'stall':
      return (
        <group>
          <Box w={F} h={H * 0.5} d={F * 0.62} color={color} />
          <Box w={F * 0.72} h={0.16} d={F * 0.42} y={H * 0.5} color={accent} emissive={emissive} ei={glow * 1.3} />
          {[[-F * 0.45, -F * 0.28], [F * 0.45, -F * 0.28], [-F * 0.45, F * 0.28], [F * 0.45, F * 0.28]].map(([px, pz], i) => (
            <mesh key={i} position={[px, H * 0.62, pz]} castShadow>
              <cylinderGeometry args={[0.07, 0.07, H * 1.25, 6]} />
              <meshStandardMaterial color={color} metalness={0.3} roughness={0.6} />
            </mesh>
          ))}
          <Box w={F * 1.12} h={0.12} d={F * 0.78} y={H * 1.22} color={accent} emissive={emissive} ei={glow * 0.4} />
        </group>
      );
    // Service desk / terminal — reception, crafting bench, info kiosk.
    case 'desk':
      return (
        <group>
          <Box w={F} h={H * 0.55} d={F * 0.5} color={color} />
          <Box w={F * 0.9} h={0.12} d={F * 0.42} y={H * 0.55} color={accent} emissive={emissive} ei={glow * 0.5} />
          <mesh position={[0, H * 0.82, 0]}>
            <boxGeometry args={[F * 0.32, H * 0.36, 0.08]} />
            <meshStandardMaterial color={accent} emissive={emissive} emissiveIntensity={glow * 1.2} toneMapped={false} />
          </mesh>
        </group>
      );
    case 'monument':
    default:
      return (
        <group>
          <Box w={F * 0.5} h={0.5} d={F * 0.5} color={color} />
          <mesh position={[0, H * 0.5 + 0.5, 0]} castShadow>
            <cylinderGeometry args={[F * 0.12, F * 0.22, H, 6]} />
            <meshStandardMaterial color={color} roughness={0.6} metalness={0.3} />
          </mesh>
          <mesh position={[0, H + 0.5, 0]}>
            <octahedronGeometry args={[0.5, 0]} />
            <meshStandardMaterial color={accent} emissive={emissive} emissiveIntensity={glow * 1.3} toneMapped={false} />
          </mesh>
        </group>
      );
  }
}

// Deterministic scatter of CC0 props around the building (decoration; not interactive).
function PropScatter({ props }) {
  if (!props || props.length === 0) return null;
  return (
    <Suspense fallback={null}>
      {props.map((p, i) => (
        <group key={i} position={[Math.cos(p.angle) * p.radius, 0, Math.sin(p.angle) * p.radius]} rotation={[0, p.yaw || 0, 0]}>
          <GltfModel url={p.url} fit={p.fit} />
        </group>
      ))}
    </Suspense>
  );
}

// Distance label fade (world units): crisp when near, gone past the far edge — keeps
// far POIs from piling labels on the horizon.
const LABEL_NEAR = 36;
const LABEL_FAR = 80;

export default function PoiStructure({ poi, active, onActivate, lit }) {
  const ringRef = useRef();
  const lightRef = useRef();
  const labelRef = useRef();
  const spriteMatRef = useRef();
  const atmo = useAtmosphere();
  const s = poi.structure;
  const building = poi.building;
  const spriteTex = usePoiSpriteTexture(poi.type);

  // Building height drives label/light placement. Until the glTF reports its fitted
  // height, use a guess from its target footprint (hangars are wider than tall).
  const [fitH, setFitH] = useState(null);
  const h = building ? (fitH || building.fit * 0.5) : s.height;
  const fp = building ? building.fit * 0.5 : s.footprint;

  useFrame((state) => {
    const { clock, camera } = state;
    if (ringRef.current && poi.enterable) {
      const pulse = active ? 1 + Math.sin(clock.elapsedTime * 4) * 0.12 : 1;
      ringRef.current.scale.setScalar(pulse);
      ringRef.current.material.opacity = active ? 0.85 : 0.35;
    }
    if (lightRef.current) {
      // Glow ramps up after dusk; a soft flicker keeps it alive.
      const night = (atmo.current && atmo.current.nightFactor) || 0;
      const flicker = 0.92 + Math.sin(clock.elapsedTime * 6 + poi.wx) * 0.08;
      lightRef.current.intensity = (0.25 + night * 1.6) * s.glow * (s.footprint * 0.6) * flicker;
    }
    const d = Math.hypot(camera.position.x - poi.wx, camera.position.z - poi.wz);
    if (labelRef.current) {
      let o = active ? 1 : d <= LABEL_NEAR ? 0.9 : d >= LABEL_FAR ? 0 : 0.9 * (1 - (d - LABEL_NEAR) / (LABEL_FAR - LABEL_NEAR));
      labelRef.current.style.opacity = o.toFixed(2);
      labelRef.current.style.display = o <= 0.03 ? 'none' : 'block';
    }
    if (spriteMatRef.current) {
      // Painted POI icon fades on the same near/far band as the label so the
      // horizon doesn't fill with signs; full opacity up close.
      spriteMatRef.current.opacity = active ? 1 : d <= LABEL_NEAR ? 1 : d >= LABEL_FAR ? 0 : 1 - (d - LABEL_NEAR) / (LABEL_FAR - LABEL_NEAR);
    }
  });

  const label = poi.name || formatDisplayName(poi.type);

  return (
    <group position={[poi.wx, 0, poi.wz]}>
      <group
        onClick={(e) => { e.stopPropagation(); onActivate && onActivate(poi, e); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        {building
          ? (
            <group rotation={[0, building.yaw || 0, 0]}>
              <Suspense fallback={<StructureMesh s={s} />}>
                <GltfModel url={building.url} fit={building.fit} onFitted={setFitH} selfEmissive={0.14} />
              </Suspense>
            </group>
          )
          : <StructureMesh s={s} />}
      </group>

      {/* Category-colored beacon on glTF buildings: POI identity at night + bloom glow,
          mirroring the primitives' emissive accents (the kit buildings have none). */}
      {building && (
        <mesh position={[0, h + 0.55, 0]}>
          <sphereGeometry args={[0.34, 16, 16]} />
          <meshStandardMaterial color={s.accent} emissive={s.emissive} emissiveIntensity={s.glow * 1.5} toneMapped={false} />
        </mesh>
      )}

      <PropScatter props={poi.props} />

      {/* Painted POI icon — a camera-facing sign that gives each location its
          identity at a glance (cantina vs temple vs garrison). Sprites always
          face the camera natively; missing art simply renders nothing. */}
      {spriteTex && (
        <sprite position={[0, h + 1.7, 0]} scale={[2.2, 2.2, 1]}>
          <spriteMaterial
            ref={spriteMatRef}
            map={spriteTex}
            transparent
            alphaTest={0.1}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      )}

      {lit && (
        <pointLight
          ref={lightRef}
          position={[0, h * 0.7 + 1, 0]}
          color={s.emissive}
          intensity={0}
          distance={fp * 6}
          decay={2}
        />
      )}

      {poi.enterable && (
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[fp * (building ? 0.95 : 0.62), fp * (building ? 1.12 : 0.74), 40]} />
          <meshBasicMaterial color={s.emissive} transparent opacity={0.35} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
        </mesh>
      )}

      <Html position={[0, h + (spriteTex ? 3.2 : 1.6), 0]} center distanceFactor={28} occlude={false} style={{ pointerEvents: 'none' }}>
        <div ref={labelRef} style={{
          textAlign: 'center', whiteSpace: 'nowrap', fontFamily: 'system-ui, sans-serif',
          transform: 'translateY(-50%)', opacity: 0.9,
        }}>
          <div style={{ color: '#e6eefc', fontSize: 13, fontWeight: 600, textShadow: '0 1px 4px #000' }}>{label}</div>
          {poi.enterable && active && (
            <div style={{ color: s.emissive, fontSize: 11, textShadow: '0 1px 3px #000' }}>▸ enter</div>
          )}
        </div>
      </Html>
    </group>
  );
}
