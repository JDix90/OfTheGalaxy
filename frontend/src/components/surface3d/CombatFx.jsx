/**
 * CombatFx — the in-world combat client (Phase 4.3): auto-attacks the soft-target and
 * renders floating damage numbers from server fx events.
 *
 * Combat is server-authoritative: this just streams "cast basic_attack at target" while a
 * target is selected + in range (the server validates range/cooldown/cost), and turns the
 * server's fx events (hit/miss/dodge) into rising damage numbers at the right world spot.
 * Online-only.
 */

import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

const ATTACK_CADENCE = 0.9; // s between auto-attacks (server gates the real cooldown)
const ATTACK_RANGE = 4.0;   // client-side gate so we don't spam casts out of range
const FLOAT_TTL = 1.05;     // s a damage number lives

// rise + fade keyframes (drei <Html> portals into the DOM)
if (typeof document !== 'undefined' && !document.getElementById('otg-dmg-css')) {
  const el = document.createElement('style');
  el.id = 'otg-dmg-css';
  el.textContent = '@keyframes otgDmg{0%{opacity:0;transform:translate(-50%,-40%) scale(.7)}15%{opacity:1;transform:translate(-50%,-60%) scale(1)}100%{opacity:0;transform:translate(-50%,-160%) scale(1)}}';
  document.head.appendChild(el);
}

export default function CombatFx({ world, targetId, onClearTarget }) {
  const acc = useRef(0);
  const idRef = useRef(0);
  const [floats, setFloats] = useState([]);

  useFrame((state, dt) => {
    const w = world.current;
    const net = w && w._net;
    if (!net || net.mode !== 'online') { if (floats.length) setFloats([]); return; }

    // --- auto-attack the current target ---
    acc.current += dt;
    if (targetId && !net.enemies.has(targetId)) { onClearTarget(); }
    else if (targetId && acc.current >= ATTACK_CADENCE) {
      const e = net.enemies.get(targetId);
      const p = w.player;
      if (e && p && Math.hypot(p.x - e.x, p.z - e.z) <= ATTACK_RANGE) {
        acc.current = 0;
        w.cast('basic_attack', targetId);
      }
    }

    // --- damage numbers from fx ---
    const fx = w.drainFx && w.drainFx();
    const now = state.clock.elapsedTime;
    let next = floats;
    if (fx && fx.length) {
      const you = net.you;
      const add = [];
      for (const f of fx) {
        if (f.type !== 'hit') continue;
        // Optimistic enemy hp so the bar drops immediately (server snapshot reconciles ~50ms later).
        if (f.dmg && net.enemies.has(f.targetId)) { const e = net.enemies.get(f.targetId); e.hp = Math.max(0, (e.hp || 0) - f.dmg); }
        // Prefer the server-embedded hit position (where the hit actually landed).
        let pos = null;
        if (f.x !== undefined && f.z !== undefined) pos = { x: f.x, z: f.z };
        else if (f.targetId === you) pos = { x: w.player.x, z: w.player.z };
        else if (net.enemies.has(f.targetId)) { const e = net.enemies.get(f.targetId); pos = { x: e.x, z: e.z }; }
        else if (net.remotes.has(f.targetId)) { const r = net.remotes.get(f.targetId); pos = { x: r.x, z: r.z }; }
        if (!pos) continue;
        const toSelf = f.targetId === you;
        const text = f.miss ? 'miss' : f.dodged ? 'dodge' : `-${f.dmg}`;
        const color = (f.miss || f.dodged) ? '#cfd6e6' : toSelf ? '#ff6a5a' : f.crit ? '#ffd24a' : '#ffffff';
        add.push({ key: ++idRef.current, x: pos.x, z: pos.z, text, color, crit: !!f.crit, born: now });
      }
      if (add.length) next = [...next, ...add].slice(-30);
    }
    // expire (only setState when the set actually changes)
    const survivors = next.filter((fl) => fl.born > now - FLOAT_TTL);
    if (survivors.length !== floats.length || next !== floats) setFloats(survivors);
  });

  return (
    <>
      {floats.map((f) => (
        <group key={f.key} position={[f.x, 2.3, f.z]}>
          <Html center distanceFactor={18} occlude={false} style={{ pointerEvents: 'none' }}>
            <div style={{ color: f.color, fontWeight: f.crit ? 800 : 700, fontSize: f.crit ? 17 : 13, fontFamily: 'system-ui, sans-serif', textShadow: '0 1px 4px #000', whiteSpace: 'nowrap', animation: `otgDmg ${FLOAT_TTL}s ease-out forwards` }}>
              {f.text}
            </div>
          </Html>
        </group>
      ))}
    </>
  );
}
