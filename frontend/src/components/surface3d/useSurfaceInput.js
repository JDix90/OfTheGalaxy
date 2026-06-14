/**
 * useSurfaceInput — keyboard + pointer capture for the walkable surface.
 *
 * Returns a stable mutable ref read every frame:
 *   { f, b, l, r, run, qLeft, qRight, yaw }
 * WASD/arrows = move (camera-relative), Shift = run, Q/E or horizontal drag = orbit.
 * Ignores keys while a text field is focused or a modal/menu is capturing input.
 */

import { useEffect, useRef } from 'react';

export function useSurfaceInput(enabledRef) {
  const input = useRef({ f: 0, b: 0, l: 0, r: 0, run: 0, qLeft: 0, qRight: 0, yaw: 0 });

  useEffect(() => {
    const i = input.current;
    const typing = (e) => {
      const t = e.target;
      return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    };
    const blocked = () => (enabledRef && enabledRef.current === false);

    const set = (e, v) => {
      if (typing(e) || blocked()) return;
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': i.f = v; break;
        case 'KeyS': case 'ArrowDown': i.b = v; break;
        case 'KeyA': i.l = v; break;
        case 'KeyD': i.r = v; break;
        case 'ArrowLeft': i.qLeft = v; break;
        case 'ArrowRight': i.qRight = v; break;
        case 'KeyQ': i.qLeft = v; break;
        case 'KeyE': i.qRight = v; break;
        case 'ShiftLeft': case 'ShiftRight': i.run = v; break;
        default: return;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    };
    const down = (e) => set(e, 1);
    const up = (e) => set(e, 0);

    let dragging = false;
    let lastX = 0;
    const pdown = (e) => {
      // Only rotate when dragging on the canvas (not on UI overlays).
      if (e.target && e.target.tagName === 'CANVAS') { dragging = true; lastX = e.clientX; }
    };
    const pmove = (e) => {
      if (!dragging) return;
      i.yaw -= (e.clientX - lastX) * 0.005;
      lastX = e.clientX;
    };
    const pup = () => { dragging = false; };
    const clear = () => { i.f = i.b = i.l = i.r = i.run = i.qLeft = i.qRight = 0; };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('pointerdown', pdown);
    window.addEventListener('pointermove', pmove);
    window.addEventListener('pointerup', pup);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('pointerdown', pdown);
      window.removeEventListener('pointermove', pmove);
      window.removeEventListener('pointerup', pup);
      window.removeEventListener('blur', clear);
    };
  }, [enabledRef]);

  return input;
}
