/**
 * LevelUpGlow — a short celebratory golden burst around the player on LEVEL UP.
 *
 * Mounted inside PlayerActor's group, so it tracks the player automatically. Triggered by the
 * universal `tutorialEventBus` LEVEL_UP event (emitted by characterSlice whenever newLevel >
 * oldLevel — so it fires for combat kills, quest turn-ins, anything). Pure in-scene meshes + a
 * point light (no extra deps); bright untonemapped golds read strongly through the scene bloom.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { tutorialEventBus, TUTORIAL_EVENTS } from '../../services/tutorialEventBus';

const DURATION = 2.6;       // seconds the burst lives
const GOLD = '#ffd86a';
const GOLD_PALE = '#fff1b0';

export default function LevelUpGlow() {
  const [active, setActive] = useState(false);
  const startRef = useRef(0);
  const begun = useRef(false);
  const lightRef = useRef();
  const flashRef = useRef();
  const ringARef = useRef();
  const ringBRef = useRef();
  const columnRef = useRef();

  // Subscribe once; each LEVEL_UP (re)starts the burst.
  useEffect(() => {
    const onLevelUp = () => { begun.current = false; setActive(true); };
    tutorialEventBus.on(TUTORIAL_EVENTS.LEVEL_UP, onLevelUp);
    return () => tutorialEventBus.off(TUTORIAL_EVENTS.LEVEL_UP, onLevelUp);
  }, []);

  useFrame(({ clock }) => {
    if (!active) return;
    if (!begun.current) { startRef.current = clock.elapsedTime; begun.current = true; }
    const t = (clock.elapsedTime - startRef.current) / DURATION; // 0..1
    if (t >= 1) { setActive(false); return; }
    const fade = 1 - t;
    const ramp = Math.min(1, t * 5); // quick ramp-in

    // Warm uplight on the character, pulsing as it fades.
    if (lightRef.current) {
      const flicker = 0.85 + 0.15 * Math.sin(clock.elapsedTime * 18);
      lightRef.current.intensity = 6 * ramp * fade * flicker;
    }
    // Bright initial flash (first quarter), then gone.
    if (flashRef.current) {
      const ft = Math.min(1, t / 0.25);
      flashRef.current.visible = ft < 1;
      flashRef.current.scale.setScalar(0.4 + ft * 1.5);
      flashRef.current.material.opacity = 0.85 * (1 - ft);
    }
    // Two expanding ground shockwave rings.
    if (ringARef.current) {
      ringARef.current.scale.setScalar(0.6 + t * 2.8);
      ringARef.current.material.opacity = 0.75 * fade;
    }
    if (ringBRef.current) {
      const tb = Math.min(1, t * 1.4);
      ringBRef.current.scale.setScalar(0.6 + tb * 2.0);
      ringBRef.current.material.opacity = 0.6 * (1 - tb);
    }
    // Slowly rotating golden halo column around the body, rising + fading.
    if (columnRef.current) {
      columnRef.current.scale.set(1, 1 + t * 0.5, 1);
      columnRef.current.rotation.y = clock.elapsedTime * 1.3;
      columnRef.current.material.opacity = 0.42 * fade * ramp;
    }
  });

  if (!active) return null;
  return (
    <group>
      <pointLight ref={lightRef} position={[0, 1.5, 0]} color={GOLD} intensity={0} distance={10} decay={2} />
      {/* initial flash */}
      <mesh ref={flashRef} position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshBasicMaterial color={GOLD_PALE} transparent opacity={0.85} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* ground shockwave rings */}
      <mesh ref={ringARef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[0.85, 1.1, 56]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.75} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ringBRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[0.6, 0.85, 56]} />
        <meshBasicMaterial color={GOLD_PALE} transparent opacity={0.6} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* rotating golden halo column around the body */}
      <mesh ref={columnRef} position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.95, 0.8, 2.6, 32, 1, true]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.4} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}
