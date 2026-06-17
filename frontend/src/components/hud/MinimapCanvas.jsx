/**
 * MinimapCanvas — a real top-down minimap for the 3D surfaces/submaps, replacing
 * the old text-label placeholder. Fed by the scene data the 3D pages already
 * compute (player position from the live world, plus POIs / NPCs / exits / quest
 * waypoints in world coords). Redraws a few times a second.
 */

import React, { useEffect, useRef } from 'react';
import { HUD } from './hudTokens';

// World (x,z in [-half, half]) → canvas px (north-up: world -Z = top). Pure +
// exported for unit testing.
export function worldToMinimap(wx, wz, half, size) {
  const h = half || 1;
  return [((wx / h) * 0.5 + 0.5) * size, ((wz / h) * 0.5 + 0.5) * size];
}

export default function MinimapCanvas({
  worldRef, worldHalf, pois = [], npcs3d = [], exits = [], waypoints = [], expanded = false,
}) {
  const canvasRef = useRef(null);
  const size = expanded ? 340 : 200;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const half = worldHalf || 100;

    const dot = (wx, wz, r, color, ring) => {
      if (!Number.isFinite(wx) || !Number.isFinite(wz)) return;
      const [mx, my] = worldToMinimap(wx, wz, half, size);
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      if (ring) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = HUD.accent;
        ctx.stroke();
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = HUD.surfaceSoft;
      ctx.fillRect(0, 0, size, size);

      pois.forEach((p) => dot(p.wx, p.wz, 3, p.enterable ? 'rgba(74,158,255,0.35)' : '#586a86', p.enterable));
      npcs3d.forEach((n) => dot(n.wx, n.wz, 2.4, HUD.heal));
      exits.forEach((e) => dot(e.wx ?? e.x, e.wz ?? e.z, 3, '#7bdc8a', true));
      waypoints.forEach((w) => dot(w.wx, w.wz, 3.5, HUD.warn, true));

      // Player heading triangle (live position from the world).
      const p = worldRef && worldRef.current && worldRef.current.player;
      if (p) {
        const [mx, my] = worldToMinimap(p.x || 0, p.z || 0, half, size);
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(p.facing || 0);
        ctx.beginPath();
        ctx.moveTo(0, -6.5);
        ctx.lineTo(4.5, 5);
        ctx.lineTo(-4.5, 5);
        ctx.closePath();
        ctx.fillStyle = HUD.accent;
        ctx.fill();
        ctx.restore();
      }
    };

    draw();
    const id = setInterval(draw, 150);
    return () => clearInterval(id);
  }, [size, worldHalf, pois, npcs3d, exits, waypoints, worldRef]);

  return <canvas ref={canvasRef} className="minimap-canvas" style={{ display: 'block', borderRadius: 6, width: size, height: size }} />;
}
