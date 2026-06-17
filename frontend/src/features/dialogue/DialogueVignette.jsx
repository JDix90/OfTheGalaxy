/**
 * DialogueVignette — a subtle radial darkening + desaturation drawn over the 3D
 * canvas while a conversation is active, so the eye settles on the framed NPC
 * and the lower-third. Pure decoration: pointer-events: none, sits just below
 * the dialogue panel (z-index 1003 vs the panel's 1004).
 */

import React from 'react';

export default function DialogueVignette() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1003,
        pointerEvents: 'none',
        background:
          'radial-gradient(120% 75% at 50% 38%, rgba(5,8,15,0) 35%, rgba(5,8,15,0.28) 72%, rgba(5,8,15,0.55) 100%)',
        animation: 'cvVignetteIn 0.3s ease-out',
      }}
    />
  );
}

if (typeof document !== 'undefined' && !document.getElementById('cv-vignette-css')) {
  const el = document.createElement('style');
  el.id = 'cv-vignette-css';
  el.textContent = '@keyframes cvVignetteIn{from{opacity:0}to{opacity:1}}';
  document.head.appendChild(el);
}
