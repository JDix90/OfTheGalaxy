/**
 * FloatingText — a single combat feedback number/word that floats up and fades.
 * Positioned absolutely (fixed) at a screen point computed when the hit lands.
 *
 *   kind: 'damage' | 'crit' | 'miss' | 'dodge' | 'heal'
 */

import React from 'react';
import './FloatingText.css';

export default function FloatingText({ text, kind = 'damage', x, y }) {
  return (
    <div
      className={`floating-text floating-${kind}`}
      style={{ left: `${x}px`, top: `${y}px` }}
    >
      {text}
    </div>
  );
}
