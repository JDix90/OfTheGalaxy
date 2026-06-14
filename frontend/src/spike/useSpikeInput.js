/**
 * useSpikeInput — keyboard + pointer capture for the spike.
 *
 * Returns a stable mutable ref the render loop reads every frame:
 *   { f, b, l, r, run, qLeft, qRight, yaw }
 * WASD = move (camera-relative), Shift = run, Q/E + horizontal drag = rotate camera.
 * `yaw` is the camera/aim heading shared by movement basis and the follow camera.
 */

import { useEffect, useRef } from 'react';

export function useSpikeInput() {
  const input = useRef({ f: 0, b: 0, l: 0, r: 0, run: 0, qLeft: 0, qRight: 0, yaw: 0 });

  useEffect(() => {
    const i = input.current;
    const set = (e, v) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': i.f = v; break;
        case 'KeyS': case 'ArrowDown': i.b = v; break;
        case 'KeyA': i.l = v; break;
        case 'KeyD': i.r = v; break;
        case 'KeyQ': i.qLeft = v; break;
        case 'KeyE': i.qRight = v; break;
        case 'ShiftLeft': case 'ShiftRight': i.run = v; break;
        default: return;
      }
      // Don't scroll/select while driving the character.
      if (['ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    };
    const down = (e) => { if (!e.repeat) set(e, 1); else set(e, 1); };
    const up = (e) => set(e, 0);

    // Pointer drag rotates the camera yaw.
    let dragging = false;
    let lastX = 0;
    const pdown = (e) => { dragging = true; lastX = e.clientX; };
    const pmove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      i.yaw -= dx * 0.005;
    };
    const pup = () => { dragging = false; };
    const blur = () => { i.f = i.b = i.l = i.r = i.run = i.qLeft = i.qRight = 0; };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('pointerdown', pdown);
    window.addEventListener('pointermove', pmove);
    window.addEventListener('pointerup', pup);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('pointerdown', pdown);
      window.removeEventListener('pointermove', pmove);
      window.removeEventListener('pointerup', pup);
      window.removeEventListener('blur', blur);
    };
  }, []);

  return input;
}
