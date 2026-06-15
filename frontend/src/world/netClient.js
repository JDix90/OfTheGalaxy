/**
 * netClient — the client half of the Phase-4 authoritative loop (the NetWorld internals).
 *
 * Framework-agnostic. Owns the WS connection to /realtime, streams INPUTS (never positions)
 * at a fixed rate, and reconciles the locally-PREDICTED player against authoritative server
 * snapshots via input replay: drop inputs the server has acked, then re-apply the unacked
 * ones on top of the server position. Because both ends run the same shared sim, the
 * correction is ~0 and there's no rubber-banding.
 *
 * Degrades gracefully: if the server is unreachable it stays in 'offline' mode (the caller
 * then runs pure local prediction + REST persistence, i.e. the single-player path) and
 * keeps trying to reconnect with backoff.
 *
 * Used by useSurfaceWorld. `player` is the SAME ref the scene renders, so reconciliation is
 * felt immediately.
 */

const SEND_HZ = 20;            // input send rate (matches the server tick)
const CONNECT_TIMEOUT_MS = 2500;
const BACKOFF = [1000, 2000, 4000, 8000, 10000];

function wsUrl(planetId, token) {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  const base = params.get('ws')
    || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/realtime`;
  const u = new URL(base, window.location.origin);
  if (token) u.searchParams.set('token', token);
  return u.toString();
}

export class NetClient {
  constructor({ token, characterId, planetId, sim, player, onStatus }) {
    this.token = token;
    this.characterId = characterId;
    this.planetId = planetId;
    this.sim = sim;
    this.player = player;        // the live, scene-rendered player ref (mutated on reconcile)
    this.onStatus = onStatus || (() => {});

    this.mode = 'connecting';    // 'connecting' | 'online' | 'offline'
    this.you = null;
    this.serverSelf = null;
    this.remotes = new Map();    // id -> { x,z,f,m,name,c, px,pz,pf, at }  (other players)
    this.pending = [];           // unacked inputs [{ seq, input, dt }]
    this.seq = 0;
    this.rttEMA = 0;
    this.serverMs = 0;
    this.count = 0;

    this._ws = null;
    this._sendAcc = 0;
    this._curInput = { f: 0, b: 0, l: 0, r: 0, run: 0, yaw: 0 };
    this._lastAck = -1;
    this._lastAckAt = 0;
    this._warnedTrunc = false;
    this._closed = false;
    this._retry = 0;
    this._connectTimer = null;
    this._reconnectTimer = null;
  }

  _setMode(m) { if (this.mode !== m) { this.mode = m; this.onStatus(this.snapshotStatus()); } }

  snapshotStatus() {
    return { mode: this.mode, you: this.you, rtt: Math.round(this.rttEMA), serverMs: this.serverMs, online: this.count };
  }

  connect() {
    if (this._closed) return;
    let ws;
    try {
      ws = new WebSocket(wsUrl(this.planetId, this.token));
    } catch (e) {
      this._goOffline();
      return;
    }
    this._ws = ws;

    this._connectTimer = setTimeout(() => {
      if (this.mode === 'connecting') { try { ws.close(); } catch (_) {} this._goOffline(); }
    }, CONNECT_TIMEOUT_MS);

    ws.onopen = () => {
      clearTimeout(this._connectTimer);
      // Handshake: assert which character on which planet.
      ws.send(JSON.stringify({ t: 'join', characterId: this.characterId, planetId: this.planetId }));
    };

    ws.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch { return; }
      if (m.t === 'welcome') {
        this.you = m.you;
        this._retry = 0;
        clearTimeout(this._reconnectTimer);
        this._lastAck = -1;
        this._lastAckAt = Date.now();
        // Adopt the authoritative spawn (server resumes saved position / spaceport).
        if (m.spawn) {
          this.player.x = m.spawn.x; this.player.z = m.spawn.z; this.player.facing = m.spawn.facing;
        }
        this.pending.length = 0;
        this._setMode('online');
      } else if (m.t === 'snap') {
        this._onSnap(m);
      }
    };

    ws.onerror = () => { /* close handler decides */ };
    ws.onclose = () => {
      clearTimeout(this._connectTimer);
      if (this._closed) return;
      this._goOffline();
      this._scheduleReconnect();
    };
  }

  _onSnap(m) {
    const now = Date.now();
    this.serverMs = m.serverMs;
    this.count = m.n;
    if (m.actMs) {
      const rtt = now - m.actMs;
      this.rttEMA = this.rttEMA ? this.rttEMA * 0.85 + rtt * 0.15 : rtt;
    }
    this.serverSelf = m.self;

    // --- reconcile our predicted player: server pos + replay of unacked inputs ---
    this.pending = this.pending.filter((p) => p.seq > m.ack);
    let pos = { x: m.self.x, z: m.self.z, facing: m.self.f };
    for (const p of this.pending) pos = this.sim.integrate(pos, p.input, p.dt);
    // Snap to the reconciled prediction (≈ current predicted pos → imperceptible).
    this.player.x = pos.x; this.player.z = pos.z; this.player.facing = pos.facing;

    // Stale-ack watchdog: if we have unacked inputs but the server stops advancing the ack
    // despite still sending snapshots, the connection is degraded → drop offline + reconnect.
    if (m.ack > this._lastAck) { this._lastAck = m.ack; this._lastAckAt = now; }
    else if (this.pending.length > 0 && this._lastAckAt && (now - this._lastAckAt) > 2500) {
      this._lastAckAt = now;
      try { this._ws.close(); } catch (_) {} // onclose → offline + scheduleReconnect
    }

    // --- remote players (everyone but us; anchor prev pose for interpolation) ---
    const seen = new Set();
    for (const rp of m.players) {
      if (rp.id === this.you) continue;
      seen.add(rp.id);
      const prev = this.remotes.get(rp.id);
      if (prev) {
        prev.px = prev.x; prev.pz = prev.z; prev.pf = prev.f;
        prev.x = rp.x; prev.z = rp.z; prev.f = rp.f; prev.m = rp.m; prev.c = rp.c; prev.name = rp.name;
        prev.at = now;
      } else {
        this.remotes.set(rp.id, { ...rp, px: rp.x, pz: rp.z, pf: rp.f, at: now });
      }
    }
    for (const id of [...this.remotes.keys()]) if (!seen.has(id)) this.remotes.delete(id);
  }

  /** Called every frame from world.step (predict happens in the caller). Throttles the send. */
  pushInput(input, dt) {
    if (this.mode !== 'online') return;
    this._curInput = {
      f: input.f ? 1 : 0, b: input.b ? 1 : 0, l: input.l ? 1 : 0, r: input.r ? 1 : 0,
      run: input.run ? 1 : 0, yaw: input.yaw,
    };
    this._sendAcc += dt;
    if (this._sendAcc >= 1 / SEND_HZ) {
      this.seq += 1;
      // Replay with the FIXED server timestep (not the variable accumulated frame time) so
      // the client's reconcile trajectory matches the server's deterministic integration.
      this.pending.push({ seq: this.seq, input: this._curInput, dt: 1 / SEND_HZ });
      if (this.pending.length > 120) {
        this.pending.shift();
        if (!this._warnedTrunc) { console.warn('[netClient] input buffer overflow — server not acking; connection degraded'); this._warnedTrunc = true; }
      }
      const ws = this._ws;
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ t: 'input', ...this._curInput, seq: this.seq, ct: Date.now() }));
      }
      this._sendAcc = 0;
    }
  }

  _goOffline() {
    this.serverSelf = null;
    this.remotes.clear();
    this.pending.length = 0;
    this._setMode('offline');
  }

  _scheduleReconnect() {
    if (this._closed) return;
    const delay = BACKOFF[Math.min(this._retry, BACKOFF.length - 1)];
    this._retry += 1;
    clearTimeout(this._reconnectTimer);
    this._reconnectTimer = setTimeout(() => {
      if (this._closed) return;
      this._setMode('connecting');
      this.connect();
    }, delay);
  }

  close() {
    this._closed = true;
    clearTimeout(this._connectTimer);
    clearTimeout(this._reconnectTimer);
    if (this._ws) { try { this._ws.close(); } catch (_) {} }
    this._ws = null;
  }
}
