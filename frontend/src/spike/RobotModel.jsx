/**
 * RobotModel — one animated CC0 character (Quaternius "RobotExpressive", shipped via
 * three.js examples; royalty-free). Reused for the local player, remote players, and
 * enemies, each tinted differently.
 *
 * The locomotion layer (ClaudeCraft's `locomotion.ts` / `characters/visual.ts`):
 * crossfades Idle <-> Walking <-> Running from a live `motion.speed` (units/s) and
 * time-scales the clip to the actual ground speed so feet don't slide. Each instance
 * is a SkeletonUtils clone with its own AnimationMixer (the model has 2 skins).
 *
 * Position/rotation are driven by the PARENT group; this component is pure visual.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
// SkeletonUtils.clone for per-instance skeletons (independent animation per actor).
// resolve.dedupe:['three'] in vite.config keeps this on the single three instance.
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';

const URL = '/spike/models/RobotExpressive.glb';
const WALK_REF = 6.0;    // matches shared WALK_SPEED
const RUN_REF = 10.8;    // matches WALK_SPEED * RUN_MULT
const RUN_THRESHOLD = 7.2;
const MOVE_THRESHOLD = 0.4;

export default function RobotModel({ motion, tint = null, scale = 0.42 }) {
  const { scene, animations } = useGLTF(URL);

  // Per-instance deep clone (preserves skinning) + optional tint of the "Main" body.
  const cloned = useMemo(() => {
    const c = skeletonClone(scene);
    c.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (tint && o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          o.material = mats.map((m) => {
            if (m.name === 'Main') {
              const nm = m.clone();
              nm.color = new THREE.Color(tint);
              return nm;
            }
            return m;
          });
          if (!Array.isArray(o.material) && o.material.length === 1) o.material = o.material[0];
        }
      }
    });
    return c;
  }, [scene, tint]);

  const mixer = useMemo(() => new THREE.AnimationMixer(cloned), [cloned]);
  const actions = useMemo(() => {
    const map = {};
    for (const clip of animations) map[clip.name] = mixer.clipAction(clip);
    return map;
  }, [animations, mixer]);

  const currentRef = useRef(null);

  const fadeTo = (name, dur = 0.22) => {
    const next = actions[name];
    if (!next || currentRef.current === next) return;
    if (currentRef.current) currentRef.current.fadeOut(dur);
    next.reset().fadeIn(dur).play();
    currentRef.current = next;
  };

  useEffect(() => {
    fadeTo('Idle', 0);
    return () => mixer.stopAllAction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  useFrame((_, dt) => {
    mixer.update(dt);
    const s = (motion && motion.current && motion.current.speed) || 0;
    const desired = s > RUN_THRESHOLD ? 'Running' : s > MOVE_THRESHOLD ? 'Walking' : 'Idle';
    fadeTo(desired);
    if (desired !== 'Idle' && currentRef.current) {
      const ref = desired === 'Running' ? RUN_REF : WALK_REF;
      currentRef.current.timeScale = Math.min(1.8, Math.max(0.6, s / ref));
    }
  });

  return <primitive object={cloned} scale={scale} />;
}

useGLTF.preload(URL);
