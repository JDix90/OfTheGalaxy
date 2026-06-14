/**
 * SpikePage — standalone Phase-0 spike route (/spike).
 *
 * Full-screen R3F canvas with the DOM HUD as an OVERLAY (per the brief: keep React
 * panels above the canvas, don't rebuild UI in 3D). The HUD surfaces the numbers the
 * architecture recommendation needs: client FPS, server tick rate / cost, RTT,
 * prediction-vs-authority drift, online players, and the active world chunk.
 *
 * Isolated + throwaway: not wired into the game's auth/character flow.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import SpikeScene from './SpikeScene';
import { useSpikeNet } from './useSpikeNet';
import { useSpikeInput } from './useSpikeInput';

function Stat({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ color: '#7e8aa6' }}>{label}</span>
      <span style={{ color: accent || '#e6eefc', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

export default function SpikePage() {
  const { net, hud } = useSpikeNet();
  const input = useSpikeInput();
  const [fps, setFps] = useState(0);
  const [drift, setDrift] = useState(0);

  // Client FPS + drift sampler (independent of React render churn).
  useEffect(() => {
    let raf;
    let frames = 0;
    let last = performance.now();
    const tick = (now) => {
      frames += 1;
      if (now - last >= 500) {
        setFps(Math.round((frames * 1000) / (now - last)));
        setDrift(net.driftEMA || 0);
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [net]);

  const online = hud.mode === 'online';
  const modeColor = hud.mode === 'online' ? '#6cf0c2' : hud.mode === 'offline' ? '#ffb84d' : '#7db8ff';

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#05070f', overflow: 'hidden' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 6, 16], fov: 55, near: 0.1, far: 500 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      >
        <SpikeScene net={net} input={input} />
      </Canvas>

      {/* HUD overlay */}
      <div style={{
        position: 'absolute', top: 16, left: 16, minWidth: 220, padding: '12px 14px',
        background: 'rgba(8,12,22,0.78)', border: '1px solid #1d2742', borderRadius: 10,
        backdropFilter: 'blur(6px)', color: '#e6eefc', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 12, lineHeight: 1.7, boxShadow: '0 8px 30px rgba(0,0,0,0.5)', pointerEvents: 'none',
      }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, letterSpacing: 0.5 }}>
          OtG · Phase-0 Spike
        </div>
        <Stat label="link" value={hud.mode.toUpperCase()} accent={modeColor} />
        <Stat label="client fps" value={fps} accent={fps >= 58 ? '#6cf0c2' : fps >= 45 ? '#ffe9a8' : '#ff8d6c'} />
        <Stat label="server tick" value={online ? `${hud.snapHz} Hz` : '—'} />
        <Stat label="tick cost" value={online ? `${hud.serverMs} ms` : '—'} />
        <Stat label="rtt" value={online ? `${hud.rtt} ms` : '—'} />
        <Stat label="pred drift" value={online ? `${drift.toFixed(2)} m` : '—'} accent={drift < 0.5 ? '#6cf0c2' : '#ffe9a8'} />
        <Stat label="players" value={online ? hud.online : 1} />
        <Stat label="sim tick #" value={online ? hud.tick : '—'} />
      </div>

      {/* Controls hint */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16, padding: '8px 12px',
        background: 'rgba(8,12,22,0.7)', border: '1px solid #1d2742', borderRadius: 8,
        color: '#9fb3d1', fontFamily: 'system-ui, sans-serif', fontSize: 12, pointerEvents: 'none',
      }}>
        <b style={{ color: '#cfe3ff' }}>WASD</b> move · <b style={{ color: '#cfe3ff' }}>Shift</b> run ·{' '}
        <b style={{ color: '#cfe3ff' }}>Q/E</b> or <b style={{ color: '#cfe3ff' }}>drag</b> turn camera ·{' '}
        walk east to stream in the <b style={{ color: '#7df0c2' }}>Beacon</b> chunk
      </div>

      {hud.mode === 'offline' && (
        <div style={{
          position: 'absolute', top: 16, right: 16, padding: '8px 12px',
          background: 'rgba(60,30,0,0.7)', border: '1px solid #6b4a1d', borderRadius: 8,
          color: '#ffd9a0', fontFamily: 'system-ui, sans-serif', fontSize: 12, pointerEvents: 'none',
        }}>
          Tick server offline — running local prediction only.<br />Start it with <b>npm run spike</b> (backend).
        </div>
      )}
    </div>
  );
}
