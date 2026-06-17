/**
 * HitFlash — a brief red screen flash when the player takes damage (the live
 * combat HP decreases). Cheap in-world feedback; pairs with LowHpVignette.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Z } from './hudTokens';

export default function HitFlash({ combat = null }) {
  const [flashKey, setFlashKey] = useState(0);
  const prevHp = useRef(combat ? combat.hp : null);

  useEffect(() => {
    const hp = combat ? combat.hp : null;
    if (hp != null && prevHp.current != null && hp < prevHp.current) {
      setFlashKey((k) => k + 1); // re-trigger the animation even on rapid hits
    }
    prevHp.current = hp;
  }, [combat ? combat.hp : null]);

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (flashKey === 0) return undefined;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 160);
    return () => clearTimeout(t);
  }, [flashKey]);

  if (!visible) return null;
  return (
    <div
      key={flashKey}
      aria-hidden="true"
      className="hit-flash"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: Z.DIALOGUE_SCRIM,
        pointerEvents: 'none',
        background: 'radial-gradient(120% 80% at 50% 50%, rgba(255,40,40,0) 52%, rgba(220,20,20,0.38) 100%)',
        animation: 'hitFlash 0.16s ease-out',
      }}
    />
  );
}

if (typeof document !== 'undefined' && !document.getElementById('hit-flash-css')) {
  const el = document.createElement('style');
  el.id = 'hit-flash-css';
  el.textContent = '@keyframes hitFlash{0%{opacity:.95}100%{opacity:0}}';
  document.head.appendChild(el);
}
