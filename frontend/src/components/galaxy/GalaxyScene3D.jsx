/**
 * GalaxyScene3D — a WebGL (three.js / react-three-fiber) galaxy view that replaces
 * the flat 2D canvas. Star systems are glowing nodes on a tilted plane, fold-lanes
 * are glowing lines, and a starfield sits behind. Click a system to select it
 * (the surrounding GalaxyMap sidebar then handles planet travel). The camera can
 * be flown to a system for the tutorial closing-choice reveal payoff.
 *
 * Pure presentation: all data + travel logic stays in GalaxyMap; this component
 * takes systems/routes and emits onSelectSystem / onHoverSystem.
 */

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { prefersReducedMotion } from '../../utils/motion';

// Single source of truth for the galaxy's star/route colors, aligned to the HUD
// token palette. The legend and the sidebar import these so the map, its key,
// and the planet list always agree (previously three different "current" hues).
export const GALAXY_COLORS = {
  current: '#6cf0c2',   // --hud-heal — "you are here"
  selected: '#4a9eff',  // --hud-accent — selected system
  hovered: '#93c5fd',   // light accent on hover
  default: '#9fb3d1',   // muted star
  route: '#3f72c4'      // dim accent fold-lane
};
const COLORS = GALAXY_COLORS;

// Build a centered 2D→3D layout: galaxy x/y map onto world x/z, fit to ~90 units.
function useLayout(systems) {
  return useMemo(() => {
    const coords = (systems || []).map((s) => s.coordinates).filter(Boolean);
    if (coords.length === 0) return null;
    const xs = coords.map((c) => c.x);
    const ys = coords.map((c) => c.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const span = Math.max(maxX - minX, maxY - minY) || 100;
    const scale = 90 / span;
    const pos = (c) => new THREE.Vector3((c.x - cx) * scale, 0, (c.y - cy) * scale);
    return { pos, scale };
  }, [systems]);
}

function SystemNode({ system, position, state, onSelect, onHover }) {
  const ref = useRef();
  const haloRef = useRef();
  const [hovered, setHovered] = useState(false);
  const color = COLORS[state] || COLORS.default;
  const baseR = state === 'current' ? 1.5 : state === 'selected' ? 1.4 : 1.0;

  useFrame(({ clock }) => {
    const pulse = state === 'current' || state === 'selected'
      ? 1 + Math.sin(clock.elapsedTime * 2.2) * 0.12
      : 1;
    const target = (hovered ? 1.35 : 1) * pulse;
    if (ref.current) ref.current.scale.setScalar(THREE.MathUtils.lerp(ref.current.scale.x, target, 0.2));
    if (haloRef.current) haloRef.current.scale.setScalar(THREE.MathUtils.lerp(haloRef.current.scale.x, target, 0.2));
  });

  const showLabel = hovered || state === 'current' || state === 'selected';

  return (
    <group position={position}>
      {/* glow halo (additive, unlit) */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[baseR * 2.1, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* core star */}
      <mesh
        ref={ref}
        onClick={(e) => { e.stopPropagation(); onSelect(system); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); onHover(system); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); onHover(null); document.body.style.cursor = 'auto'; }}
      >
        <sphereGeometry args={[baseR, 24, 24]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {showLabel && (
        <Html position={[0, baseR * 2.4, 0]} center distanceFactor={120} occlude={false} style={{ pointerEvents: 'none' }}>
          <div style={{
            color: '#e6eefc', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap',
            textShadow: '0 1px 3px rgba(0,0,0,0.9)', transform: 'translateY(-2px)'
          }}>{system.name}</div>
        </Html>
      )}
    </group>
  );
}

function RouteLines({ systems, routes, layout }) {
  const byId = useMemo(() => {
    const m = new Map();
    (systems || []).forEach((s) => m.set(s.id, s));
    return m;
  }, [systems]);

  const segments = useMemo(() => {
    const out = [];
    (routes || []).forEach((route) => {
      let a, b;
      if (route.fromSystemId && route.toSystemId) {
        a = byId.get(route.fromSystemId); b = byId.get(route.toSystemId);
      } else if (route.from && route.to) {
        a = route.from; b = route.to;
      }
      if (a?.coordinates && b?.coordinates) {
        out.push([layout.pos(a.coordinates), layout.pos(b.coordinates)]);
      }
    });
    return out;
  }, [routes, byId, layout]);

  return segments.map((seg, i) => (
    <Line key={i} points={seg} color={GALAXY_COLORS.route} lineWidth={1} transparent opacity={0.35} />
  ));
}

// Flies the camera + orbit target to a focus point when it changes (reveal payoff).
// OrbitControls is disabled during the flight so it doesn't fight the manual
// camera move; we orient with camera.lookAt and hand control back at the end.
function CameraRig({ controlsRef, focusPoint }) {
  const { camera } = useThree();
  const anim = useRef(null);
  const tmp = useRef(new THREE.Vector3());

  useEffect(() => {
    if (!focusPoint || !Number.isFinite(focusPoint.x)) return;
    const toTarget = focusPoint.clone();
    // Pull back enough to frame the destination with its neighbours (the systems
    // are sparse, so a tight zoom looks empty).
    const toCam = focusPoint.clone().add(new THREE.Vector3(0, 40, 64));
    if (prefersReducedMotion()) {
      camera.position.copy(toCam);
      camera.lookAt(toTarget);
      if (controlsRef.current) { controlsRef.current.target.copy(toTarget); controlsRef.current.update(); }
      return;
    }
    if (controlsRef.current) controlsRef.current.enabled = false;
    anim.current = {
      fromCam: camera.position.clone(),
      toCam,
      fromTarget: controlsRef.current ? controlsRef.current.target.clone() : new THREE.Vector3(),
      toTarget,
      t: 0
    };
  }, [focusPoint, camera, controlsRef]);

  useFrame((_, dt) => {
    const a = anim.current;
    if (!a) return;
    a.t = Math.min(1, a.t + dt / 1.5);
    const e = a.t < 0.5 ? 4 * a.t ** 3 : 1 - Math.pow(-2 * a.t + 2, 3) / 2;
    camera.position.lerpVectors(a.fromCam, a.toCam, e);
    tmp.current.lerpVectors(a.fromTarget, a.toTarget, e);
    camera.lookAt(tmp.current);
    if (a.t >= 1) {
      if (controlsRef.current) {
        controlsRef.current.target.copy(a.toTarget);
        controlsRef.current.enabled = true;
        controlsRef.current.update();
      }
      anim.current = null;
    }
  });

  return null;
}

function Scene({ systems, routes, currentSystemId, selectedSystemId, focusPoint, onSelectSystem, onHoverSystem }) {
  const layout = useLayout(systems);
  const controlsRef = useRef();
  // Stable world-space focus vector — only changes when the target coords change,
  // so CameraRig's fly-to fires once instead of restarting on every re-render.
  const focusVec = useMemo(
    () => (layout && focusPoint ? layout.pos(focusPoint) : null),
    [layout, focusPoint?.x, focusPoint?.y]
  );
  if (!layout) return null;

  return (
    <>
      <color attach="background" args={['#05070f']} />
      <ambientLight intensity={0.6} />
      <Stars radius={220} depth={80} count={4500} factor={4} saturation={0} fade speed={0.4} />
      <RouteLines systems={systems} routes={routes} layout={layout} />
      {systems.filter((s) => s.coordinates).map((s) => {
        const state = s.id === currentSystemId ? 'current' : s.id === selectedSystemId ? 'selected' : 'default';
        return (
          <SystemNode
            key={s.id}
            system={s}
            position={layout.pos(s.coordinates)}
            state={state}
            onSelect={onSelectSystem}
            onHover={onHoverSystem}
          />
        );
      })}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan
        enableDamping
        dampingFactor={0.08}
        minDistance={18}
        maxDistance={220}
        maxPolarAngle={Math.PI * 0.49}
      />
      <CameraRig controlsRef={controlsRef} focusPoint={focusVec} />
    </>
  );
}

export default function GalaxyScene3D({
  systems = [],
  routes = [],
  currentPlanetId = null,
  selectedSystemId = null,
  focusPlanetId = null,
  onSelectSystem = () => {},
  onHoverSystem = () => {}
}) {
  const currentSystemId = useMemo(
    () => systems.find((s) => (s.planets || []).some((p) => p.id === currentPlanetId))?.id || null,
    [systems, currentPlanetId]
  );
  const focusCoords = useMemo(() => {
    if (!focusPlanetId) return null;
    const sys = systems.find((s) => (s.planets || []).some((p) => p.id === focusPlanetId || p.name?.toLowerCase() === focusPlanetId));
    return sys?.coordinates || null;
  }, [systems, focusPlanetId]);

  return (
    <Canvas
      camera={{ position: [0, 70, 95], fov: 50, near: 0.1, far: 1000 }}
      dpr={[1, 2]}
      resize={{ scroll: false, debounce: 0 }}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <Scene
        systems={systems}
        routes={routes}
        currentSystemId={currentSystemId}
        selectedSystemId={selectedSystemId}
        focusPoint={focusCoords}
        onSelectSystem={onSelectSystem}
        onHoverSystem={onHoverSystem}
      />
    </Canvas>
  );
}
