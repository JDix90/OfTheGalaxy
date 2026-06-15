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

import React from 'react';
import { Html } from '@react-three/drei';
import { getRoleColor } from '../../data/modelManifest';

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

export default function Nameplate({ name, npcType, level, y = 2.4 }) {
  const color = getRoleColor(npcType);
  const cfg = ROLE_TAG[npcType] || {};
  const sub = level != null
    ? `Lv ${level}${cfg.tag ? ' · ' + cfg.tag : ''}`
    : cfg.tag;
  const border = cfg.elite ? '1px solid #e7c27a'
    : cfg.hostile ? '1px solid #ff6a5a'
      : '1px solid rgba(120,150,200,0.25)';

  return (
    <Html position={[0, y, 0]} center distanceFactor={22} occlude={false} style={{ pointerEvents: 'none' }}>
      <div style={{ textAlign: 'center', whiteSpace: 'nowrap', fontFamily: 'system-ui, sans-serif', transform: 'translateY(-50%)' }}>
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
      </div>
    </Html>
  );
}
