/**
 * ParticleField — a transparent canvas overlay that draws the shared
 * particleEngine pool. Pointer-events-none so it never blocks the UI.
 *
 *   <ParticleField />                       fullscreen overlay (combat sparks)
 *   <ParticleField ambient="ice" rate={0.6} />  also spawns slow biome drift
 *
 * Honors reduce-motion (renders nothing, runs no loop). Particle sprites are
 * loaded via assetManager and fall back to soft circles if missing.
 */

import React, { useEffect, useRef } from 'react';
import { particleEngine } from '../../services/particleEngine';
import { assetManager } from '../../services/assetManager';
import { prefersReducedMotion } from '../../utils/motion';

const FALLBACK_COLORS = {
  ember: '#fbbf24',
  pollen: '#a7f3d0',
  mist: '#cbd5e1',
  sand: '#e3c08a',
  ice: '#bae6fd',
  ice_crystal: '#bae6fd'
};

export default function ParticleField({ ambient = null, rate = 0.5, maxAmbient = 40 }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const lastRef = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined; // no 2D context (e.g. jsdom in tests) — skip the FX
    let disposed = false;

    // Preload the sprites we might draw so the cache is warm.
    ['ember', 'pollen', 'mist', 'sand', 'ice'].forEach((t) => assetManager.loadParticleSprite(t).catch(() => {}));

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (ts) => {
      if (disposed) return;
      const dt = lastRef.current ? Math.min(0.05, (ts - lastRef.current) / 1000) : 0;
      lastRef.current = ts;

      // Ambient drift: trickle new particles up to a soft cap.
      if (ambient && particleEngine.count < maxAmbient && Math.random() < rate * dt * 60 * 0.06) {
        particleEngine.ambient(window.innerWidth, window.innerHeight, ambientOpts(ambient));
      }

      particleEngine.step(dt);

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of particleEngine.particles) {
        const t = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = p.ambient ? t * 0.5 : t;
        const sprite = assetManager.particleCache.get(`particle:${p.sprite}`);
        if (sprite && sprite.complete) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.drawImage(sprite, -p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        } else {
          ctx.fillStyle = p.color || FALLBACK_COLORS[p.sprite] || '#fbbf24';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      disposed = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      lastRef.current = 0;
    };
  }, [ambient, rate, maxAmbient]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 30 }}
    />
  );
}

function ambientOpts(biome) {
  switch (biome) {
    case 'ice':
    case 'arctic':
    case 'tundra':
      return { sprite: 'ice', size: 22, life: 8, drift: 12 };
    case 'desert':
    case 'arid':
      return { sprite: 'sand', size: 26, life: 6, drift: 28 };
    case 'volcanic':
    case 'lava':
      return { sprite: 'ember', size: 16, life: 5, drift: 14 };
    case 'forest':
    case 'jungle':
    case 'swamp':
      return { sprite: 'pollen', size: 20, life: 7, drift: 16 };
    default:
      return { sprite: 'mist', size: 34, life: 9, drift: 14 };
  }
}
