/**
 * Nameplate — a floating WoW-style nameplate for an NPC.
 *
 * Role drives the treatment (the battle-tested UX vocabulary from the migration brief):
 *   - quest_giver    → a pulsing gold `!` marker above the name
 *   - vendor         → "Vendor" tag
 *   - companion      → "Ally" tag
 *   - faction_leader → "Elite" tag + gold frame
 *   - random_encounter (hostile) → red frame + "Hostile" threat tag
 * An optional `level` renders as `Lv N` (future-proof for surface enemies in P4).
 *
 * Shared by NpcActor (animated NPCs) and NpcProxies (instanced distant NPCs) so the
 * nameplate looks identical regardless of how the body is rendered.
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { getRoleColor } from '../../data/modelManifest';

// Distance fade (world units): nameplates fade out with range so crowds don't clutter.
const NP_NEAR = 22;
const NP_FAR = 60;

// Inject the marker pulse keyframes once (drei <Html> portals into document.body).
if (typeof document !== 'undefined' && !document.getElementById('otg-nameplate-css')) {
  const el = document.createElement('style');
  el.id = 'otg-nameplate-css';
  el.textContent = '@keyframes otgQuestPulse{0%,100%{transform:translateY(0) scale(1);opacity:.85}50%{transform:translateY(-2px) scale(1.15);opacity:1}}';
  document.head.appendChild(el);
}

const ROLE_TAG = {
  quest_giver: { marker: '!', markerColor: '#ffd24a' },
  vendor: { tag: 'Vendor' },
  companion: { tag: 'Ally' },
  faction_leader: { tag: 'Elite', elite: true },
  random_encounter: { tag: 'Hostile', hostile: true },
};

export default function Nameplate({ name, npcType, level, y = 2.4, hp, maxHp }) {
  const color = getRoleColor(npcType);
  const cfg = ROLE_TAG[npcType] || {};
  const sub = level != null
    ? `Lv ${level}${cfg.tag ? ' · ' + cfg.tag : ''}`
    : cfg.tag;
  const border = cfg.elite ? '1px solid #e7c27a'
    : cfg.hostile ? '1px solid #ff6a5a'
      : '1px solid rgba(120,150,200,0.25)';

  const gref = useRef();
  const divRef = useRef();
  const wpos = useMemo(() => new THREE.Vector3(), []);
  useFrame((state) => {
    if (!gref.current || !divRef.current) return;
    gref.current.getWorldPosition(wpos);
    const d = Math.hypot(state.camera.position.x - wpos.x, state.camera.position.z - wpos.z);
    const o = d <= NP_NEAR ? 1 : d >= NP_FAR ? 0 : 1 - (d - NP_NEAR) / (NP_FAR - NP_NEAR);
    divRef.current.style.opacity = o.toFixed(2);
    divRef.current.style.display = o <= 0.03 ? 'none' : 'block';
  });

  return (
    <group ref={gref}>
    {/* zIndexRange caps the nameplate's DOM z-index below the HUD layer scale (lowest = --hud-z-
        ambient-hints 990) so it can't paint over menus/dialogue/toasts/fullscreen overlays. drei's
        default is ~16.7M, which is why nameplates were bleeding over the inventory modal. The Html
        still renders above the 3D canvas (separate DOM overlay), so world labels remain visible. */}
    <Html position={[0, y, 0]} center distanceFactor={22} occlude={false} zIndexRange={[980, 0]} style={{ pointerEvents: 'none' }}>
      <div ref={divRef} style={{ textAlign: 'center', whiteSpace: 'nowrap', fontFamily: 'system-ui, sans-serif', transform: 'translateY(-50%)' }}>
        {cfg.marker && (
          <div style={{ color: cfg.markerColor, fontSize: 18, fontWeight: 800, lineHeight: 1, textShadow: '0 1px 5px #000', animation: 'otgQuestPulse 1.2s ease-in-out infinite' }}>
            {cfg.marker}
          </div>
        )}
        <div style={{
          display: 'inline-block', padding: '1px 8px', borderRadius: 6,
          background: 'rgba(8,12,22,0.55)', border, color,
          fontSize: 12, fontWeight: 600, textShadow: '0 1px 3px #000',
        }}>
          {name}
        </div>
        {sub && (
          <div style={{ color: cfg.hostile ? '#ff8a7a' : '#8aa0c4', fontSize: 10, textShadow: '0 1px 3px #000' }}>{sub}</div>
        )}
        {hp != null && maxHp > 0 && (
          <div style={{ width: 56, height: 5, margin: '3px auto 0', background: 'rgba(8,12,22,0.7)', border: '1px solid rgba(0,0,0,0.6)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(0, Math.min(100, (hp / maxHp) * 100))}%`, height: '100%', background: cfg.hostile ? '#ff5a4a' : '#6cf0c2' }} />
          </div>
        )}
      </div>
    </Html>
    </group>
  );
}
