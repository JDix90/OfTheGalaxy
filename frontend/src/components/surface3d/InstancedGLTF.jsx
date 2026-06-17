/**
 * InstancedGLTF — draw one glTF model many times as instanced meshes (a few draw calls for hundreds
 * of copies). Robust to unknown model scale/origin: each model is auto-normalized to a unit box that
 * sits ON the ground (base at y=0, centred in x/z), then scaled to the requested world `size`.
 *
 * `items`: [{ x, z, y?, s?, ry? }] — world position, optional per-instance size multiplier + Y-rotation.
 * Multi-mesh models are handled (one instanced mesh per sub-mesh, preserving local transforms).
 */
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

function InstancedPart({ geometry, material, base, items, size, cast }) {
  const ref = useRef();
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = new THREE.Matrix4(), out = new THREE.Matrix4();
    const q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3();
    items.forEach((it, i) => {
      const s = size * (it.s || 1);
      t.compose(pos.set(it.x, it.y || 0, it.z), q.setFromAxisAngle(UP, it.ry || 0), scl.set(s, s, s));
      out.multiplyMatrices(t, base); // place * (normalized model-local)
      mesh.setMatrixAt(i, out);
    });
    mesh.count = items.length;
    mesh.instanceMatrix.needsUpdate = true;
  }, [items, size, base, geometry]);
  return (
    <instancedMesh ref={ref} args={[geometry, material, Math.max(1, items.length)]} castShadow={cast} receiveShadow frustumCulled={false} />
  );
}

export default function InstancedGLTF({ url, items, size = 1, cast = true }) {
  const { scene } = useGLTF(url);
  // Normalize the model once: fit its largest dimension to 1 unit, centre x/z, seat base at y=0.
  const parts = useMemo(() => {
    scene.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(scene);
    const sz = new THREE.Vector3(); box.getSize(sz);
    const fit = 1 / Math.max(sz.x, sz.y, sz.z, 1e-3);
    const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
    const norm = new THREE.Matrix4().makeScale(fit, fit, fit)
      .multiply(new THREE.Matrix4().makeTranslation(-cx, -box.min.y, -cz));
    const out = [];
    scene.traverse((o) => {
      if (o.isMesh && o.geometry) out.push({ geometry: o.geometry, material: o.material, base: norm.clone().multiply(o.matrixWorld) });
    });
    return out;
  }, [scene]);

  if (!items || !items.length || !parts.length) return null;
  return parts.map((p, i) => (
    <InstancedPart key={i} geometry={p.geometry} material={p.material} base={p.base} items={items} size={size} cast={cast} />
  ));
}
