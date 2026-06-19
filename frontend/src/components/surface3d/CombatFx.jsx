/**
 * CombatFx — the in-world combat client (Phase 4.3): auto-attacks the soft-target and
 * renders floating damage numbers from server fx events.
 *
 * Combat is server-authoritative: this just streams "cast basic_attack at target" while a
 * target is selected + in range (the server validates range/cooldown/cost), and turns the
 * server's fx events (hit/miss/dodge) into rising damage numbers at the right world spot.
 *
 * Ranged feel: when a hit fx is flagged `ranged` (server sets it from the attacker's weapon
 * class), we also render a short-lived energy bolt travelling source→target with a muzzle flash
 * at the origin and an impact flash at the target. Melee hits keep the damage-number-only feedback.
 * Online-only.
 */

import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

const ATTACK_CADENCE = 0.9; // s between auto-attacks (server gates the real cooldown)
const DEFAULT_RANGE = 4.0;  // fallback client gate before the server reports the weapon range
const FLOAT_TTL = 1.05;     // s a damage number lives
const BOLT_TTL = 0.16;      // s a ranged bolt takes to travel + fade
const FX_Y = 1.4;           // chest-height world Y for bolts / muzzle / impact

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
  const [bolts, setBolts] = useState([]); // [{key,x1,z1,x2,z2,born,color}]

  useFrame((state, dt) => {
    const w = world.current;
    const net = w && w._net;
    if (!net || net.mode !== 'online') { if (floats.length) setFloats([]); if (bolts.length) setBolts([]); return; }

    // --- auto-attack the current target (gate by the server-reported weapon range) ---
    const range = Number.isFinite(net.atkRange) ? net.atkRange : DEFAULT_RANGE;
    acc.current += dt;
    if (targetId && !net.enemies.has(targetId)) { onClearTarget(); }
    else if (targetId && acc.current >= ATTACK_CADENCE) {
      const e = net.enemies.get(targetId);
      const p = w.player;
      if (e && p && Math.hypot(p.x - e.x, p.z - e.z) <= range) {
        acc.current = 0;
        w.cast('basic_attack', targetId);
      }
    }

    // --- damage numbers + ranged bolts from fx ---
    const fx = w.drainFx && w.drainFx();
    const now = state.clock.elapsedTime;
    let next = floats;
    let nextBolts = bolts;
    if (fx && fx.length) {
      const you = net.you;
      const add = [];
      const addBolts = [];
      for (const f of fx) {
        if (f.type === 'heal') {
          if (f.amount > 0 && f.x !== undefined) add.push({ key: ++idRef.current, x: f.x, z: f.z, text: `+${f.amount}`, color: '#6cf0c2', crit: false, born: now });
          continue;
        }
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
        // Ranged bolt: source (sx,sz) → landing pos. Enemy shots tint red, player shots cyan/gold.
        if (f.ranged && Number.isFinite(f.sx) && Number.isFinite(f.sz)) {
          const boltColor = toSelf ? '#ff7a5a' : f.crit ? '#ffd24a' : '#6ad6ff';
          addBolts.push({ key: ++idRef.current, x1: f.sx, z1: f.sz, x2: pos.x, z2: pos.z, color: boltColor, born: now });
        }
      }
      if (add.length) next = [...next, ...add].slice(-30);
      if (addBolts.length) nextBolts = [...nextBolts, ...addBolts].slice(-16);
    }
    // expire (only setState when the set actually changes)
    const survivors = next.filter((fl) => fl.born > now - FLOAT_TTL);
    if (survivors.length !== floats.length || next !== floats) setFloats(survivors);
    // bolts advance every frame while alive, so re-render whenever any exist or the set changed.
    const boltSurvivors = nextBolts.filter((b) => b.born > now - BOLT_TTL);
    if (boltSurvivors.length || nextBolts !== bolts || bolts.length) {
      // stamp a live progress 0..1 so render can place the travelling bolt without a clock read
      for (const b of boltSurvivors) b.t = Math.min(1, (now - b.born) / BOLT_TTL);
      setBolts(boltSurvivors);
    }
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
      {bolts.map((b) => {
        const t = b.t || 0;
        const bx = b.x1 + (b.x2 - b.x1) * t;
        const bz = b.z1 + (b.z2 - b.z1) * t;
        const fade = 1 - t;                 // bolt + impact fade as it lands
        const muzzleFade = Math.max(0, 1 - t * 4); // muzzle flash dies in the first quarter
        const impact = t > 0.75 ? (t - 0.75) / 0.25 : 0; // impact swells near the target
        return (
          <group key={b.key}>
            {/* travelling energy bolt */}
            <mesh position={[bx, FX_Y, bz]}>
              <sphereGeometry args={[0.18, 8, 8]} />
              <meshBasicMaterial color={b.color} transparent opacity={0.5 + 0.5 * fade} />
            </mesh>
            {/* muzzle flash at the origin */}
            {muzzleFade > 0 && (
              <mesh position={[b.x1, FX_Y, b.z1]}>
                <sphereGeometry args={[0.32, 8, 8]} />
                <meshBasicMaterial color={b.color} transparent opacity={0.6 * muzzleFade} />
              </mesh>
            )}
            {/* impact flash at the target */}
            {impact > 0 && (
              <mesh position={[b.x2, FX_Y, b.z2]}>
                <sphereGeometry args={[0.28 + 0.25 * impact, 8, 8]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.7 * (1 - impact)} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}
