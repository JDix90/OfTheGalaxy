/**
 * PlayerActor — the controllable character: drives the sim, the follow camera, the
 * locomotion animation, and (throttled) proximity + movement reporting.
 *
 * Movement comes from the shared surface sim via `world.step(input, dt)` (the IWorld
 * seam). The camera is a third-person follow rig (orbit yaw from Q/E or drag). Each
 * frame it positions the character and camera; a few times a second it finds the
 * nearest enterable POI, projects it to screen px, and reports it (for the existing
 * SubMapEntryMenu), plus reports the player's surface position (for encounter checks).
 */

import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import CharacterModel from './CharacterModel';
import LevelUpGlow from './LevelUpGlow';
import { getCharacterModel } from '../../data/modelManifest';

const CAM_DIST = 11;
const CAM_HEIGHT = 6.5;
const YAW_RATE = 2.0;
const PROXIMITY_WORLD = 7;     // how close (world units) to "enter" a location
const PROXIMITY_PERIOD = 0.15; // s
const MOVE_REPORT_PERIOD = 0.4; // s
// Conversation framing: a raised 3/4 shot of the NPC, blended in/out. Higher +
// closer than the follow cam so it looks DOWN over nearby buildings rather than
// getting trapped behind them in tight medina alleys.
const CONV_DIST = 5.4;
const CONV_HEIGHT = 7.2;
const CONV_LATERAL = 1.5;

// Keep the player in view past buildings between the camera and the look target. Two
// steps, both sampling the sim's obstacle heights (~1u apart) along the target→pos ray:
//   1) LIFT — raise the camera above the tallest building on the sightline (+`lift`) so it
//      looks DOWN over the rooftops into the street instead of into a wall;
//   2) PULL IN — if a block is still in the way (one right beside the player), zoom the
//      camera in toward the player. `minFrac` stops it collapsing onto the player.
function clampCamToView(sim, tgt, pos, minFrac, lift) {
  const dx = pos.x - tgt.x, dz = pos.z - tgt.z;
  const dist = Math.hypot(dx, pos.y - tgt.y, dz) || 1;
  const steps = Math.max(2, Math.ceil(dist));
  if (lift > 0) {
    let maxTop = 0;
    for (let s = 1; s <= steps; s++) { const f = s / steps; maxTop = Math.max(maxTop, sim.obstacleHeightWorld(tgt.x + dx * f, tgt.z + dz * f)); }
    if (maxTop > 0 && pos.y < maxTop + lift) pos.y = maxTop + lift;
  }
  const dy = pos.y - tgt.y; // re-read after any lift
  for (let s = 1; s <= steps; s++) {
    const f = s / steps;
    if (sim.obstacleHeightWorld(tgt.x + dx * f, tgt.z + dz * f) > tgt.y + dy * f) {
      const safe = Math.max(minFrac, (s - 1) / steps);
      pos.set(tgt.x + dx * safe, tgt.y + dy * safe, tgt.z + dz * safe);
      return;
    }
  }
}

export default function PlayerActor({ world, input, pois, onProximity, onMoved, focus = null }) {
  const group = useRef();
  const motion = useRef({ speed: 0 });
  const model = useMemo(() => getCharacterModel('char.player'), []);
  const camTarget = useRef(new THREE.Vector3());
  // Camera framing scratch + blend factor (0 follow → 1 conversation).
  const defPos = useRef(new THREE.Vector3());
  const defTgt = useRef(new THREE.Vector3());
  const convPos = useRef(new THREE.Vector3());
  const convTgt = useRef(new THREE.Vector3());
  const blendPos = useRef(new THREE.Vector3());
  const focusBlend = useRef(0);
  const playerY = useRef(0); // smoothed walk height (0 ground / roof top on the medina upper level)
  const proxAcc = useRef(0);
  const moveAcc = useRef(0);
  const lastProxId = useRef(undefined);
  const tmp = useRef(new THREE.Vector3());
  const { camera, size } = useThree();

  // Place the camera behind the player on first frame (avoid a fly-in from origin).
  const inited = useRef(false);

  useFrame((_, dtRaw) => {
    const w = world.current;
    if (!w || !w.ready) return;
    const dt = Math.min(dtRaw, 0.05);
    const i = input.current;

    // Q/E (or arrows) orbit the camera yaw.
    i.yaw += ((i.qRight ? 1 : 0) - (i.qLeft ? 1 : 0)) * YAW_RATE * dt;

    // Advance the sim (movement + collision + throttled persistence).
    const p = w.step(i, dt);
    motion.current.speed = p.speed;

    // Walk height: 0 on the ground, the roof top when up on the medina's upper level. Smoothed so
    // climbing a stair / stepping between roof heights reads as a rise, not a teleport.
    const sim = w.sim;
    let targetY = 0;
    if (sim && sim.surfaceLevelY && (p.level || 0)) {
      const s = sim.worldToSurface(p.x, p.z);
      targetY = sim.surfaceLevelY(s.x, s.y, p.level);
    }
    playerY.current += (targetY - playerY.current) * (1 - Math.pow(0.0008, dt));
    const py = playerY.current;

    if (group.current) {
      group.current.position.set(p.x, py, p.z);
      group.current.rotation.y = p.facing + (model.facingOffset || 0);
    }

    // Third-person follow camera, blended toward a conversation framing when a
    // dialogue NPC is in focus. Default follow target:
    const fwdX = -Math.sin(i.yaw), fwdZ = -Math.cos(i.yaw);
    defPos.current.set(p.x - fwdX * CAM_DIST, py + CAM_HEIGHT, p.z - fwdZ * CAM_DIST);
    defTgt.current.set(p.x, py + 1.6, p.z);

    // Ease the framing blend toward 1 while focused, back to 0 when it clears.
    focusBlend.current += ((focus ? 1 : 0) - focusBlend.current) * (1 - Math.pow(0.05, dt));

    if (focus) {
      const dx = focus.x - p.x, dz = focus.z - p.z;
      const len = Math.hypot(dx, dz) || 1;
      const dirX = dx / len, dirZ = dz / len;
      const perpX = -dirZ, perpZ = dirX;
      // Camera behind the player (away from the NPC), nudged to one side for a 3/4 shot.
      convPos.current.set(
        p.x - dirX * CONV_DIST + perpX * CONV_LATERAL,
        py + CONV_HEIGHT,
        p.z - dirZ * CONV_DIST + perpZ * CONV_LATERAL,
      );
      // Frame the gap between player and NPC at roughly chest height.
      const look = Math.min(len * 0.5, 2.4);
      convTgt.current.set(p.x + dirX * look, py + 1.45, p.z + dirZ * look);
      // Turn the player to face whoever they're talking to (movement is locked here).
      if (group.current) group.current.rotation.y = Math.atan2(dirX, dirZ) + (model.facingOffset || 0);
    } else if (focusBlend.current < 0.01) {
      convPos.current.copy(defPos.current);
      convTgt.current.copy(defTgt.current);
    }

    const fb = focusBlend.current;
    blendPos.current.lerpVectors(defPos.current, convPos.current, fb);
    camTarget.current.lerpVectors(defTgt.current, convTgt.current, fb);
    // Camera collision: pull the desired spot in past any building between it and the look
    // target so the cam zooms in near tall blocks instead of burying itself in the medina.
    if (sim && sim.obstacleHeightWorld) clampCamToView(sim, camTarget.current, blendPos.current, 0.22, 2.2);
    if (!inited.current) { camera.position.copy(blendPos.current); inited.current = true; }
    else camera.position.lerp(blendPos.current, 1 - Math.pow(0.0016, dt));
    // Final guard: never let the live camera sit inside a building mid-lerp (no extra lift).
    if (sim && sim.obstacleHeightWorld) clampCamToView(sim, camTarget.current, camera.position, 0.1, 0);
    camera.lookAt(camTarget.current);

    // --- throttled proximity to enterable POIs ---
    proxAcc.current += dt;
    if (proxAcc.current >= PROXIMITY_PERIOD && onProximity) {
      proxAcc.current = 0;
      let best = null, bestD = PROXIMITY_WORLD;
      for (const poi of pois) {
        if (!poi.enterable) continue;
        const d = Math.hypot(poi.wx - p.x, poi.wz - p.z);
        if (d < bestD) { bestD = d; best = poi; }
      }
      if (best) {
        tmp.current.set(best.wx, best.structure.height + 1.0, best.wz).project(camera);
        const sx = (tmp.current.x * 0.5 + 0.5) * size.width;
        const sy = (1 - (tmp.current.y * 0.5 + 0.5)) * size.height;
        onProximity({ poi: best, x: sx, y: sy });
        lastProxId.current = best.id;
      } else if (lastProxId.current !== null) {
        lastProxId.current = null;
        onProximity(null);
      }
    }

    // --- throttled movement report (encounter checks) ---
    moveAcc.current += dt;
    if (moveAcc.current >= MOVE_REPORT_PERIOD && onMoved && p.moving) {
      moveAcc.current = 0;
      const s = w.getSurfacePos();
      onMoved(s);
    }
  });

  return (
    <group ref={group}>
      <CharacterModel model={model} motion={motion} />
      {/* celebratory golden burst on level-up (self-arming via the LEVEL_UP event) */}
      <LevelUpGlow />
      {/* soft contact shadow blob under the player for grounding */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[0.7, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </group>
  );
}
