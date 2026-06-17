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

import { tutorialEventBus, TUTORIAL_EVENTS } from '../services/tutorialEventBus';

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
  constructor({ token, characterId, planetId, subMapId, sim, player, onStatus }) {
    this.token = token;
    this.characterId = characterId;
    this.planetId = planetId;
    this.subMapId = subMapId || null; // when set, joins a dungeon submap world (real-time combat)
    this.sim = sim;
    this.player = player;        // the live, scene-rendered player ref (mutated on reconcile)
    this.onStatus = onStatus || (() => {});

    this.mode = 'connecting';    // 'connecting' | 'online' | 'offline'
    this.you = null;
    this.serverSelf = null;
    this.remotes = new Map();    // id -> { x,z,f,m,name,c, px,pz,pf, at }  (other players)
    this.enemies = new Map();    // id -> { x,z,f,hp,maxHp,name,level,st, px,pz,pf, at }
    this.crowd = new Map();      // id -> { x,z,f,r, px,pz,pf, at }  (ambient cosmetic walkers)
    this.selfHp = null;          // authoritative player hp (Phase 4.3)
    this.selfMaxHp = null;
    this.selfDead = false;
    this.fxQueue = [];           // combat fx events to render (drained by the scene)
    this.hotbar = [];            // ability bar (Phase 4.4) [{id,name,type,cd,stam,target}]
    this.castCdUntil = {};       // local cooldown display (ms) per ability id
    this.dodgeCdUntil = 0;
    this.log = [];               // combat log lines (bounded)
    this.toasts = [];            // non-blocking combat toasts (reward/death) drained by the HUD
    this._toastId = 0;
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
      ws.send(JSON.stringify({ t: 'join', characterId: this.characterId, planetId: this.planetId, subMapId: this.subMapId }));
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
        this.hotbar = m.hotbar || [];
        // Adopt the authoritative spawn (server resumes saved position / spaceport).
        if (m.spawn) {
          this.player.x = m.spawn.x; this.player.z = m.spawn.z; this.player.facing = m.spawn.facing;
        }
        this.pending.length = 0;
        this._setMode('online');
      } else if (m.t === 'snap') {
        this._onSnap(m);
      } else if (m.t === 'respawn') {
        // Server respawned us (after death): teleport + clear prediction buffer + revive.
        if (typeof m.x === 'number') { this.player.x = m.x; this.player.z = m.z; }
        this.pending.length = 0;
        this.selfDead = false;
        if (typeof m.hp === 'number') this.selfHp = m.hp;
        this._pushToast({ kind: 'death', area: m.area || null, fee: m.fee || 0, restored: m.restored });
      } else if (m.t === 'reward') {
        // Victory: non-blocking reward toast (xp / credits / loot / level-up / faction rep).
        // reputation: [{ factionId, name, delta, newTier, tierChanged }] — display name comes
        // from the backend so the HUD needs no faction registry.
        this._pushToast({ kind: 'reward', xp: m.xp || 0, credits: m.credits || 0, loot: m.loot || [], leveledUp: m.leveledUp || [], newLevel: m.newLevel, reputation: Array.isArray(m.reputation) ? m.reputation : [] });
      } else if (m.t === 'hotbar') {
        // Server pushed a refreshed kit (e.g. a mid-session ability unlock after a level-up).
        if (Array.isArray(m.hotbar)) this.hotbar = m.hotbar;
      } else if (m.t === 'combat_done') {
        // A scripted 3D fight finished (e.g. the tutorial training drone). Re-emit on the tutorial
        // bus so the state machine advances COMBAT_ENDED → COMBAT_COMPLETE → VENDOR_INTRO — the
        // 3D engine's analogue of the old turn-based VictoryScreen emit.
        if (m.tutorial) { try { tutorialEventBus.emit(TUTORIAL_EVENTS.COMBAT_ENDED, { isTutorial: true, status: 'won' }); } catch (_) {} }
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
    if (typeof m.self.hp === 'number') { this.selfHp = m.self.hp; this.selfMaxHp = m.self.maxHp; this.selfDead = !!m.self.dead; }
    if (m.fx && m.fx.length) {
      const nameOf = (id) => (id === this.you ? 'You' : ((this.enemies.get(id) && this.enemies.get(id).name) || (this.remotes.get(id) && this.remotes.get(id).name) || 'Hostile'));
      for (const f of m.fx) {
        this.fxQueue.push(f);
        let line = null;
        if (f.type === 'hit') {
          if (f.dodged || f.miss) line = `${nameOf(f.sourceId)} → ${nameOf(f.targetId)}: ${f.dodged ? 'dodged' : 'miss'}`;
          else line = `${nameOf(f.sourceId)} → ${nameOf(f.targetId)}: ${f.dmg}${f.crit ? ' (crit!)' : ''}`;
        } else if (f.type === 'heal') line = `${nameOf(f.targetId)} heals +${f.amount}`;
        else if (f.type === 'death') line = `${nameOf(f.id)} defeated`;
        if (line) {
          const last = this.log[this.log.length - 1];
          if (last && last.line === line) last.count = (last.count || 1) + 1; // collapse repeats
          else this.log.push({ t: now, line, count: 1 });
        }
      }
      if (this.fxQueue.length > 96) this.fxQueue.splice(0, this.fxQueue.length - 96);
      if (this.log.length > 40) this.log.splice(0, this.log.length - 40);
    }

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

    // --- enemies (server-driven actors; same interpolation anchoring) ---
    const eseen = new Set();
    for (const e of (m.enemies || [])) {
      eseen.add(e.id);
      const prev = this.enemies.get(e.id);
      if (prev) {
        prev.px = prev.x; prev.pz = prev.z; prev.pf = prev.f;
        prev.x = e.x; prev.z = e.z; prev.f = e.f; prev.hp = e.hp; prev.maxHp = e.maxHp;
        prev.name = e.name; prev.level = e.level; prev.st = e.st; prev.at = now;
      } else {
        this.enemies.set(e.id, { ...e, px: e.x, pz: e.z, pf: e.f, at: now });
      }
    }
    for (const id of [...this.enemies.keys()]) if (!eseen.has(id)) this.enemies.delete(id);

    // --- ambient crowd (cosmetic background walkers; same interpolation anchoring) ---
    if (m.crowd) {
      const cseen = new Set();
      for (const c of m.crowd) {
        cseen.add(c.id);
        const prev = this.crowd.get(c.id);
        if (prev) {
          prev.px = prev.x; prev.pz = prev.z; prev.pf = prev.f;
          prev.x = c.x; prev.z = c.z; prev.f = c.f; prev.r = c.r; prev.at = now;
        } else {
          this.crowd.set(c.id, { ...c, px: c.x, pz: c.z, pf: c.f, at: now });
        }
      }
      for (const id of [...this.crowd.keys()]) if (!cseen.has(id)) this.crowd.delete(id);
    }
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

  /** Send a combat cast (server validates range/cooldown/cost) + track local cooldown. */
  cast(ability, targetId) {
    if (this.mode !== 'online') return;
    const ws = this._ws;
    if (!(ws && ws.readyState === ws.OPEN)) return;
    ws.send(JSON.stringify({ t: 'cast', ability, targetId }));
    const e = this.hotbar.find((h) => h.id === ability);
    const cdMs = ability === 'basic_attack' ? 850 : (e ? (e.cd || 1) * 1000 : 1000);
    this.castCdUntil[ability] = Date.now() + cdMs;
  }

  /** Send a dodge-roll. */
  dodge() {
    if (this.mode !== 'online') return;
    if (Date.now() < this.dodgeCdUntil) return;
    const ws = this._ws;
    if (ws && ws.readyState === ws.OPEN) { ws.send(JSON.stringify({ t: 'dodge' })); this.dodgeCdUntil = Date.now() + 1000; }
  }

  /** Use a consumable in-world (server applies it to the authoritative combatant + decrements). */
  useItem(itemId) {
    if (this.mode !== 'online' || !itemId) return;
    const ws = this._ws;
    if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify({ t: 'item', itemId }));
  }

  /** Request a server-authoritative scripted spawn (NPC attack / POI / quest combat). The server
   *  derives + validates the enemy from the reference; e.g. { kind:'npc', npcId } / { kind:'poi',
   *  poiId } / { kind:'quest', questId, objectiveId }. */
  requestSpawn(payload) {
    if (this.mode !== 'online' || !payload) return;
    const ws = this._ws;
    if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify({ t: 'spawn', ...payload }));
  }

  /** Drain queued combat fx (hit/death) for the scene to render. */
  drainFx() { if (this.fxQueue.length === 0) return null; const f = this.fxQueue; this.fxQueue = []; return f; }

  _pushToast(t) { this.toasts.push({ id: ++this._toastId, at: Date.now(), ...t }); if (this.toasts.length > 8) this.toasts.shift(); }
  /** Drain queued combat toasts (reward/death) for the HUD to display. */
  drainToasts() { if (this.toasts.length === 0) return null; const t = this.toasts; this.toasts = []; return t; }

  _goOffline() {
    this.serverSelf = null;
    this.remotes.clear();
    this.enemies.clear();
    this.crowd.clear();
    this.fxQueue.length = 0;
    this.selfHp = null; this.selfDead = false;
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
