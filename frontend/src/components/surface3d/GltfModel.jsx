/**
 * GltfModel — load a static glTF, clone it, and auto-fit it to the scene.
 *
 * Each CC0 kit ships at its own native scale/orientation, so rather than hardcode magic
 * scales we normalize at load: center the model horizontally, drop its base to y=0, and
 * scale so its footprint (max of X/Z) — or its height, in `fitMode='height'` — matches
 * `fit` world units. Reports the resulting world-space height via `onFitted` so callers
 * can place labels/lights above it.
 *
 * Static (no skeleton) — a plain deep clone shares geometry + materials across instances,
 * so N copies of the same building are cheap. Used for POI buildings and scatter props.
 */

import React, { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export default function GltfModel({
  url, fit = 4, fitMode = 'footprint', castShadow = true, receiveShadow = true, onFitted,
  selfEmissive = 0,
}) {
  const { scene } = useGLTF(url);

  const prepared = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = castShadow;
        o.receiveShadow = receiveShadow;
        // A subtle self-emissive fill keeps untextured kit buildings from collapsing to
        // black silhouettes at night (they have no emissive of their own). Clone the
        // material so we don't mutate the shared cached source.
        if (selfEmissive > 0 && o.material && o.material.emissive) {
          const mats = (Array.isArray(o.material) ? o.material : [o.material]).map((m) => {
            const nm = m.clone();
            if (nm.emissive) { nm.emissive.copy(nm.color || new THREE.Color('#ffffff')); nm.emissiveIntensity = selfEmissive; }
            return nm;
          });
          o.material = Array.isArray(o.material) ? mats : mats[0];
        }
      }
    });
    const box = new THREE.Box3().setFromObject(c);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const denom = fitMode === 'height' ? (size.y || 1) : (Math.max(size.x, size.z) || 1);
    const s = fit / denom;

    const g = new THREE.Group();
    // recenter on X/Z and rest the base on the ground (pre-scale units; group scale applies uniformly)
    c.position.set(-center.x, -box.min.y, -center.z);
    g.add(c);
    g.scale.setScalar(s);
    g.userData.fitHeight = size.y * s;
    return g;
  }, [scene, fit, fitMode, castShadow, receiveShadow, selfEmissive]);

  useEffect(() => {
    if (onFitted) onFitted(prepared.userData.fitHeight);
  }, [prepared, onFitted]);

  return <primitive object={prepared} />;
}
