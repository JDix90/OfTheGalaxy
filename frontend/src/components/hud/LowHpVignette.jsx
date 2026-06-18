/**
 * LowHpVignette — a red screen-edge pulse that intensifies as the player's HP
 * drops below ~35%, giving in-world "you're in danger" feedback. Reuses the
 * unified vitals source and the inline-style + injected-keyframes pattern from
 * DialogueVignette. Rendered by the 3D pages (it reads the live world HP).
 */

import React from 'react';
import { Z } from './hudTokens';
import { usePlayerVitals } from '../../hooks/usePlayerVitals';

const THRESHOLD = 35; // % HP at which the vignette starts

export default function LowHpVignette({ combat = null }) {
  const { hpPct, maxHp } = usePlayerVitals(combat);

  // Off at full health and at 0 (the defeat overlay owns death).
  const t = maxHp > 0 && hpPct > 0 && hpPct < THRESHOLD ? (THRESHOLD - hpPct) / THRESHOLD : 0;
  if (t <= 0) return null;

  const edge = Math.min(0.82, 0.18 + t * 0.64);
  const mid = (edge * 0.45).toFixed(3);

  return (
    <div
      aria-hidden="true"
      className="low-hp-vignette"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: Z.DIALOGUE_SCRIM,
        pointerEvents: 'none',
        background: `radial-gradient(135% 95% at 50% 50%, rgba(255,40,40,0) 42%, rgba(180,12,12,${mid}) 78%, rgba(120,0,0,${edge.toFixed(3)}) 100%)`,
        animation: 'lowHpPulse 1.15s ease-in-out infinite',
      }}
    />
  );
}

if (typeof document !== 'undefined' && !document.getElementById('low-hp-vignette-css')) {
  const el = document.createElement('style');
  el.id = 'low-hp-vignette-css';
  el.textContent = '@keyframes lowHpPulse{0%,100%{opacity:.72}50%{opacity:1}}'
    + '@media (prefers-reduced-motion: reduce){.low-hp-vignette{animation:none!important}}';
  document.head.appendChild(el);
}
