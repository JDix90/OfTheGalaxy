/**
 * useSpikeNet — the client half of the Phase-0 authoritative loop.
 *
 * The "IWorld seam" in miniature (ClaudeCraft's central abstraction): the scene
 * reads ONE shape (`net`) and never knows whether the world is server-driven or
 * local. Online, this hook streams inputs up and applies authoritative snapshots;
 * if the tick server is down it transparently falls back to OFFLINE mode using the
 * same shared world data, so the scene renders and plays either way.
 *
 * Design notes:
 *  - Everything the render loop touches lives in a single mutable ref (`net`) so
 *    snapshots at 20 Hz never trigger React re-renders. Only the HUD reads React
 *    state, refreshed on a slow timer.
 *  - The client sends INPUTS (+ camera yaw), never positions — matching the
 *    server's authoritative model. Movement is predicted locally with the SAME
 *    shared `integrateMovement`, so prediction tracks authority (~0 drift).
 */

import { useEffect, useRef, useState } from 'react';
import { PROPS, CHUNKS } from '../../../shared/spike/world.mjs';

function wsUrl() {
  // Same-origin via the Vite proxy (/spike-ws -> ws://localhost:3002), or override
  // with ?ws=ws://host:port for direct connection.
  const params = new URLSearchParams(window.location.search);
  if (params.get('ws')) return params.get('ws');
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/spike-ws`;
}

export function useSpikeNet() {
  const net = useRef({
    mode: 'connecting',        // 'connecting' | 'online' | 'offline'
    you: null,
    color: '#ffcf5c',
    // World (from the server's hello, or the shared module when offline).
    props: PROPS,
    chunks: CHUNKS,
    enemyRoster: [],
    // Authoritative buffers (written by snapshots; read by the render loop).
    self: null,                // { x, z, f } authoritative position of OUR player
    players: new Map(),        // id -> { x, z, f, m, c } (includes remotes)
    enemies: new Map(),        // id -> { x, z, f, hp, maxHp }
    // Metrics.
    tick: 0,
    serverMs: 0,
    rttEMA: 0,
    snapIntervalEMA: 50,
    lastSnapAt: 0,
    snapCount: 0,
    count: 0,                  // players online
    // Outbound input plumbing.
    seq: 0,
    _ws: null,
    send(input) {
      const ws = this._ws;
      if (!ws || ws.readyState !== ws.OPEN) return;
      this.seq += 1;
      ws.send(JSON.stringify({
        t: 'input',
        f: input.f, b: input.b, l: input.l, r: input.r, run: input.run,
        yaw: input.yaw,
        seq: this.seq,
        ct: Date.now(),
      }));
    },
  });

  const [hud, setHud] = useState({
    mode: 'connecting', online: 0, rtt: 0, serverMs: 0, snapHz: 0, tick: 0, you: null,
  });

  useEffect(() => {
    const n = net.current;
    let closed = false;
    let socket;
    let offlineTimer;

    const goOffline = () => {
      if (closed) return;
      n.mode = 'offline';
      n._ws = null;
      n.props = PROPS;
      n.chunks = CHUNKS;
      // Offline = no authoritative self; the scene runs pure local prediction.
      n.self = null;
    };

    try {
      socket = new WebSocket(wsUrl());
      n._ws = socket;
    } catch (e) {
      goOffline();
    }

    if (socket) {
      // If we can't connect promptly, drop to offline so the scene still plays.
      offlineTimer = setTimeout(() => {
        if (n.mode === 'connecting') goOffline();
      }, 2500);

      socket.onopen = () => { clearTimeout(offlineTimer); };

      socket.onmessage = (ev) => {
        let m;
        try { m = JSON.parse(ev.data); } catch { return; }
        if (m.t === 'hello') {
          n.mode = 'online';
          n.you = m.you;
          n.color = m.color || n.color;
          n.props = m.props || PROPS;
          n.chunks = m.chunks || CHUNKS;
          n.enemyRoster = m.enemies || [];
          n.self = { x: m.spawn.x, z: m.spawn.z, f: m.spawn.facing };
        } else if (m.t === 'snap') {
          const now = Date.now();
          if (n.lastSnapAt) {
            const dt = now - n.lastSnapAt;
            n.snapIntervalEMA = n.snapIntervalEMA * 0.9 + dt * 0.1;
          }
          n.lastSnapAt = now;
          n.snapCount += 1;
          n.tick = m.tick;
          n.serverMs = m.serverMs;
          n.count = m.n;
          if (m.actMs) {
            const rtt = now - m.actMs;
            n.rttEMA = n.rttEMA ? n.rttEMA * 0.85 + rtt * 0.15 : rtt;
          }
          n.self = m.self; // authoritative position of our player
          // Remote players (everyone except us; the scene predicts our own).
          const seen = new Set();
          for (const p of m.players) {
            seen.add(p.id);
            const prev = n.players.get(p.id);
            if (prev) {
              // keep prev pose for interpolation anchor
              prev.px = prev.x; prev.pz = prev.z; prev.pf = prev.f;
              prev.x = p.x; prev.z = p.z; prev.f = p.f; prev.m = p.m; prev.c = p.c;
              prev.at = now;
            } else {
              n.players.set(p.id, { ...p, px: p.x, pz: p.z, pf: p.f, at: now });
            }
          }
          for (const id of [...n.players.keys()]) if (!seen.has(id)) n.players.delete(id);
          // Enemies (server-driven actors from real OtG templates).
          const eseen = new Set();
          for (const e of m.enemies) {
            eseen.add(e.id);
            const prev = n.enemies.get(e.id);
            if (prev) {
              prev.px = prev.x; prev.pz = prev.z; prev.pf = prev.f;
              prev.x = e.x; prev.z = e.z; prev.f = e.f; prev.hp = e.hp; prev.maxHp = e.maxHp;
              prev.at = now;
            } else {
              n.enemies.set(e.id, { ...e, px: e.x, pz: e.z, pf: e.f, at: now });
            }
          }
          for (const id of [...n.enemies.keys()]) if (!eseen.has(id)) n.enemies.delete(id);
        }
      };

      socket.onerror = () => { /* close handler will decide offline */ };
      socket.onclose = () => { if (!closed) goOffline(); };
    }

    // Slow HUD refresh — decouples the 20 Hz wire from React re-renders.
    const hudTimer = setInterval(() => {
      const snapHz = n.snapIntervalEMA > 0 ? 1000 / n.snapIntervalEMA : 0;
      setHud({
        mode: n.mode,
        online: n.count,
        rtt: Math.round(n.rttEMA),
        serverMs: n.serverMs,
        snapHz: n.mode === 'online' ? Math.round(snapHz) : 0,
        tick: n.tick,
        you: n.you,
      });
    }, 250);

    return () => {
      closed = true;
      clearTimeout(offlineTimer);
      clearInterval(hudTimer);
      if (socket) { try { socket.close(); } catch {} }
    };
  }, []);

  return { net: net.current, hud };
}
