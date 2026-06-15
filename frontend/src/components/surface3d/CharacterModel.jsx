/**
 * CharacterModel — one animated, manifest-driven glTF character.
 *
 * Reused for the player and every NPC; the descriptor (url/scale/tint/clips/refs)
 * comes from `modelManifest.js`, so swapping art is a manifest edit. Crossfades
 * Idle/Walk/Run from a live `motion.speed` (world units/s) and time-scales the clip
 * to the actual ground speed (no foot-slide). Each instance is a SkeletonUtils clone
 * with its own AnimationMixer.
 *
 * Position/rotation are driven by the PARENT group; this component is pure visual.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
// dedupe:['three'] in vite.config keeps this on the single three instance.
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';

const MOVE_THRESHOLD = 0.4;

export default function CharacterModel({ model, motion, stride = 1 }) {
  const { scene, animations } = useGLTF(model.url);

  const cloned = useMemo(() => {
    const c = skeletonClone(scene);
    c.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (model.tint && o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          const next = mats.map((m) => {
            if (m.name === 'Main') {
              const nm = m.clone();
              nm.color = new THREE.Color(model.tint);
              return nm;
            }
            return m;
          });
          o.material = Array.isArray(o.material) ? next : next[0];
        }
      }
    });
    return c;
  }, [scene, model.tint]);

  // Normalize mixed-rig sizes: if the descriptor gives a target `fitHeight`, derive the
  // scale from the model's own (rest-pose) height; otherwise use the literal `scale`.
  const fitScale = useMemo(() => {
    if (!model.fitHeight) return model.scale || 0.42;
    const sy = new THREE.Box3().setFromObject(cloned).getSize(new THREE.Vector3()).y || 1;
    return model.fitHeight / sy;
  }, [cloned, model.fitHeight, model.scale]);

  const mixer = useMemo(() => new THREE.AnimationMixer(cloned), [cloned]);
  const actions = useMemo(() => {
    const map = {};
    for (const clip of animations) map[clip.name] = mixer.clipAction(clip);
    return map;
  }, [animations, mixer]);

  const current = useRef(null);
  const clips = model.clips || { idle: 'Idle', walk: 'Walking', run: 'Running' };
  const frame = useRef(0);
  const acc = useRef(0);

  const fadeTo = (name, dur = 0.22) => {
    const next = actions[name];
    if (!next || current.current === next) return;
    if (current.current) current.current.fadeOut(dur);
    next.reset().fadeIn(dur).play();
    current.current = next;
  };

  useEffect(() => {
    fadeTo(clips.idle, 0);
    return () => mixer.stopAllAction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  useFrame((_, dt) => {
    // Mixer throttling: distant NPCs advance the (expensive) skinning every `stride`
    // frames with the accumulated dt, so the animation still plays, more cheaply.
    acc.current += dt;
    if (stride <= 1 || (frame.current++ % stride) === 0) {
      mixer.update(acc.current);
      acc.current = 0;
    }
    const s = (motion && motion.current && motion.current.speed) || 0;
    const desired = s > (model.runThreshold || 8)
      ? clips.run
      : s > MOVE_THRESHOLD ? clips.walk : clips.idle;
    fadeTo(desired);
    if (desired !== clips.idle && current.current) {
      const ref = desired === clips.run ? (model.runRef || 12) : (model.walkRef || 6.5);
      current.current.timeScale = Math.min(1.8, Math.max(0.6, s / ref));
    }
  });

  // yOffset lifts hovering models (flyers) off the ground.
  return (
    <group position={[0, model.yOffset || 0, 0]}>
      <primitive object={cloned} scale={fitScale} />
    </group>
  );
}
