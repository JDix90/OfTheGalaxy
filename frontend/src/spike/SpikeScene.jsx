/**
 * SpikeScene — the R3F world for the Phase-0 spike.
 *
 * Contents (migration brief §4):
 *   - low-poly lit ground + props (CC0-style primitives) that double as COLLIDERS,
 *   - a third-person follow camera,
 *   - a WASD-driven ANIMATED glTF character with client prediction + server reconcile,
 *   - a world-streaming SEAM stub (props load/unload by area "chunk"),
 *   - remote players + server-driven enemies (real OtG templates) from snapshots.
 *
 * The local player sends INPUTS and predicts with the SAME shared sim the server runs,
 * so prediction tracks authority. Remotes/enemies are interpolated from snapshots.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Grid, Html } from '@react-three/drei';
import * as THREE from 'three';
import RobotModel from './RobotModel';
import {
  integrateMovement, shortestAngle, chunkAt, DT,
} from '../../../shared/spike/world.mjs';

const FACING_OFFSET = Math.PI; // RobotExpressive's modelled forward is -Z; flip to +Z.
const CAM_DIST = 9;
const CAM_HEIGHT = 5.5;
const YAW_RATE = 2.0; // rad/s for Q/E camera turn
const INPUT_PERIOD = 1 / 20; // send inputs at 20 Hz

// ---- Props (also colliders) -------------------------------------------------
const PROP_STYLE = {
  crate:   { color: '#c79a4b', metal: 0.1, rough: 0.8 },
  pillar:  { color: '#5b6b86', metal: 0.3, rough: 0.5 },
  wall:    { color: '#48506b', metal: 0.2, rough: 0.7 },
  habitat: { color: '#3f7a8c', metal: 0.25, rough: 0.6 },
  beacon:  { color: '#7df0c2', metal: 0.6, rough: 0.3, emissive: '#1d6b53' },
};

function PropMesh({ p }) {
  const s = PROP_STYLE[p.type] || PROP_STYLE.crate;
  return (
    <mesh position={[p.x, p.h / 2, p.z]} castShadow receiveShadow>
      <boxGeometry args={[p.hx * 2, p.h, p.hz * 2]} />
      <meshStandardMaterial
        color={s.color}
        metalness={s.metal}
        roughness={s.rough}
        emissive={s.emissive || '#000000'}
        emissiveIntensity={s.emissive ? 0.6 : 0}
      />
    </mesh>
  );
}

// ---- Nameplate --------------------------------------------------------------
function Nameplate({ title, sub, hp, maxHp, color = '#cfe3ff' }) {
  return (
    <Html position={[0, 2.4, 0]} center distanceFactor={14} occlude={false} style={{ pointerEvents: 'none' }}>
      <div style={{ textAlign: 'center', transform: 'translateY(-50%)', whiteSpace: 'nowrap', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ color, fontSize: 12, fontWeight: 600, textShadow: '0 1px 3px #000' }}>{title}</div>
        {sub && <div style={{ color: '#9fb3d1', fontSize: 10, textShadow: '0 1px 3px #000' }}>{sub}</div>}
        {typeof hp === 'number' && (
          <div style={{ width: 54, height: 5, background: '#2a0f12', border: '1px solid #000', borderRadius: 3, margin: '2px auto 0' }}>
            <div style={{ width: `${Math.max(0, (hp / maxHp) * 100)}%`, height: '100%', background: '#e0584f', borderRadius: 2 }} />
          </div>
        )}
      </div>
    </Html>
  );
}

// ---- Local player: prediction + reconcile + camera + input send -------------
function LocalPlayer({ net, input, onChunk }) {
  const group = useRef();
  const motion = useRef({ speed: 0 });
  const state = useRef({ x: 0, z: 6, facing: Math.PI });
  const camTarget = useRef(new THREE.Vector3());
  const inputAcc = useRef(0);
  const lastChunk = useRef(null);
  const { camera } = useThree();

  // Initialize from authoritative spawn once we have it.
  const inited = useRef(false);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const i = input.current;

    if (!inited.current && net.self) {
      state.current = { x: net.self.x, z: net.self.z, facing: net.self.f };
      inited.current = true;
    }

    // Q/E turn the camera yaw.
    i.yaw += ((i.qRight ? 1 : 0) - (i.qLeft ? 1 : 0)) * YAW_RATE * dt;

    // Predict with the SHARED sim — identical math to the server.
    const cmd = { f: i.f, b: i.b, l: i.l, r: i.r, run: i.run, yaw: i.yaw };
    const next = integrateMovement(state.current, cmd, dt);
    state.current = { x: next.x, z: next.z, facing: next.facing };
    motion.current.speed = next.speed;

    // Reconcile against the server's authoritative position.
    if (net.mode === 'online' && net.self) {
      const dx = net.self.x - state.current.x;
      const dz = net.self.z - state.current.z;
      const drift = Math.hypot(dx, dz);
      net.driftEMA = net.driftEMA ? net.driftEMA * 0.9 + drift * 0.1 : drift;
      if (drift > 2.0) {
        // Hard correction (teleport / big desync) — snap to authority.
        state.current.x = net.self.x;
        state.current.z = net.self.z;
      } else if (drift > 0.05) {
        // Soft nudge toward authority so small errors melt away invisibly.
        state.current.x += dx * 0.12;
        state.current.z += dz * 0.12;
      }
    }

    // Apply to the visual group.
    if (group.current) {
      group.current.position.set(state.current.x, 0, state.current.z);
      group.current.rotation.y = state.current.facing + FACING_OFFSET;
    }

    // Third-person follow camera (behind the camera-yaw, looking at the player).
    const fwdX = -Math.sin(i.yaw), fwdZ = -Math.cos(i.yaw);
    const desired = new THREE.Vector3(
      state.current.x - fwdX * CAM_DIST,
      CAM_HEIGHT,
      state.current.z - fwdZ * CAM_DIST,
    );
    camera.position.lerp(desired, 1 - Math.pow(0.0015, dt));
    camTarget.current.set(state.current.x, 1.4, state.current.z);
    camera.lookAt(camTarget.current);

    // Stream inputs to the server at a fixed rate.
    inputAcc.current += dt;
    if (inputAcc.current >= INPUT_PERIOD) {
      inputAcc.current = 0;
      net.send(cmd);
    }

    // World-streaming seam: report chunk crossings.
    const ch = chunkAt(state.current.x);
    if (ch !== lastChunk.current) {
      lastChunk.current = ch;
      onChunk(ch);
    }
  });

  return (
    <group ref={group}>
      <RobotModel motion={motion} tint={net.color} />
      <Nameplate title={net.you ? `You (${net.you})` : 'You'} color="#ffe9a8" />
    </group>
  );
}

// ---- Remote player (interpolated) ------------------------------------------
function RemotePlayer({ data }) {
  const group = useRef();
  const motion = useRef({ speed: 0 });
  const prevPos = useRef(new THREE.Vector3(data.x, 0, data.z));

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    if (!group.current) return;
    const g = group.current;
    const k = 1 - Math.pow(0.0001, dt);
    g.position.x += (data.x - g.position.x) * k;
    g.position.z += (data.z - g.position.z) * k;
    const da = shortestAngle(g.rotation.y - FACING_OFFSET, data.f);
    g.rotation.y += da * k;
    // Derive speed from rendered motion to drive walk/run.
    const moved = Math.hypot(g.position.x - prevPos.current.x, g.position.z - prevPos.current.z);
    motion.current.speed = moved / dt;
    prevPos.current.set(g.position.x, 0, g.position.z);
  });

  return (
    <group ref={group} position={[data.x, 0, data.z]} rotation={[0, FACING_OFFSET, 0]}>
      <RobotModel motion={motion} tint={data.c || '#7db8ff'} />
      <Nameplate title={data.id} color="#bcd2ff" />
    </group>
  );
}

// ---- Enemy (server-driven, real OtG template) -------------------------------
function Enemy({ data, info }) {
  const group = useRef();
  const motion = useRef({ speed: 0 });
  const prevPos = useRef(new THREE.Vector3(data.x, 0, data.z));

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    if (!group.current) return;
    const g = group.current;
    const k = 1 - Math.pow(0.0001, dt);
    g.position.x += (data.x - g.position.x) * k;
    g.position.z += (data.z - g.position.z) * k;
    const da = shortestAngle(g.rotation.y - FACING_OFFSET, data.f);
    g.rotation.y += da * k;
    const moved = Math.hypot(g.position.x - prevPos.current.x, g.position.z - prevPos.current.z);
    motion.current.speed = moved / dt;
    prevPos.current.set(g.position.x, 0, g.position.z);
  });

  const tier = info?.tier;
  const tint = tier === 'veteran' ? '#ff7a7a' : '#e0584f';
  return (
    <group ref={group} position={[data.x, 0, data.z]} rotation={[0, FACING_OFFSET, 0]}>
      <RobotModel motion={motion} tint={tint} scale={0.46} />
      <Nameplate
        title={info ? info.name : 'Enemy'}
        sub={info ? `Lv ${info.level} · ${info.tier}` : null}
        hp={data.hp}
        maxHp={data.maxHp}
        color="#ffb3ad"
      />
    </group>
  );
}

// ---- Networked actors (re-read the net ref each frame; remount on roster change)
function Actors({ net }) {
  const [, force] = useState(0);
  // Cheap roster diff: re-render when the set of player/enemy ids changes.
  const rosterKey = useRef('');
  useFrame(() => {
    const key = [...net.players.keys()].sort().join(',') + '|' + [...net.enemies.keys()].sort().join(',');
    if (key !== rosterKey.current) {
      rosterKey.current = key;
      force((n) => n + 1);
    }
  });

  const players = [...net.players.values()].filter((p) => p.id !== net.you);
  const enemies = [...net.enemies.values()];
  const roster = useMemo(() => {
    const m = {};
    for (const e of net.enemyRoster) m[e.id] = e;
    return m;
  }, [net.enemyRoster, rosterKey.current]);

  return (
    <>
      {players.map((p) => <RemotePlayer key={p.id} data={p} />)}
      {enemies.map((e) => <Enemy key={e.id} data={e} info={roster[e.id]} />)}
    </>
  );
}

// ---- Headless verification hook --------------------------------------------
// Exposes R3F's manual `advance()` so an automated/headless preview (where the tab
// is hidden and the browser pauses requestAnimationFrame) can still step frames to
// verify rendering/animation. No effect during normal interactive play.
function ExposeForHeadless() {
  const get = useThree((s) => s.get);
  useEffect(() => {
    if (typeof window !== 'undefined') window.__spikeThree = get;
    return () => { if (typeof window !== 'undefined' && window.__spikeThree === get) delete window.__spikeThree; };
  }, [get]);
  return null;
}

// ---- Scene root -------------------------------------------------------------
export default function SpikeScene({ net, input }) {
  // World-streaming seam: only mount props for chunks within range of the player.
  const [activeChunks, setActiveChunks] = useState(() => new Set(['alpha']));

  const onChunk = (chunk) => {
    setActiveChunks((prev) => {
      // Load current chunk + its immediate neighbour (so it streams in ahead).
      const want = new Set([chunk]);
      if (chunk === 'alpha') want.add('beacon'); else want.add('alpha');
      // Only update if changed.
      if (prev.size === want.size && [...want].every((c) => prev.has(c))) return prev;
      return want;
    });
  };

  const visibleProps = net.props.filter((p) => activeChunks.has(p.chunk));

  return (
    <>
      <color attach="background" args={['#0a0e1a']} />
      <fog attach="fog" args={['#0a0e1a', 40, 110]} />
      <hemisphereLight args={['#9fc4ff', '#1a1320', 0.7]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[18, 28, 12]}
        intensity={1.6}
        color="#fff0d8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />

      {/* Ground (shadow catcher) + grid for motion reference */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#161b2e" roughness={1} metalness={0} />
      </mesh>
      <Grid
        args={[80, 80]}
        cellSize={2}
        cellThickness={0.6}
        cellColor="#2a3350"
        sectionSize={10}
        sectionThickness={1.1}
        sectionColor="#3c64a8"
        fadeDistance={90}
        fadeStrength={1.5}
        followCamera={false}
        infiniteGrid={false}
        position={[0, 0.01, 0]}
      />

      {visibleProps.map((p) => <PropMesh key={p.id} p={p} />)}

      <LocalPlayer net={net} input={input} onChunk={onChunk} />
      <Actors net={net} />
      <ExposeForHeadless />
    </>
  );
}
