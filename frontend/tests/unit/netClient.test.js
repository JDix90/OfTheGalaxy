/**
 * netClient (Phase 4) — client netcode: handshake, input-replay reconciliation against
 * authoritative snapshots, offline fallback, and remote-player tracking. Uses a fake
 * WebSocket + the REAL shared surface sim (so reconcile math matches production).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NetClient } from '../../src/world/netClient';
import { createSurfaceSim, DEFAULTS } from '../../../shared/sim/surface.mjs';

// --- minimal fake WebSocket the test can drive ---
class FakeWS {
  constructor(url) {
    this.url = url;
    this.OPEN = 1;
    this.readyState = 0;
    this.sent = [];
    FakeWS.instances.push(this);
  }
  send(d) { this.sent.push(JSON.parse(d)); }
  close() { this.readyState = 3; if (this.onclose) this.onclose({ code: 1006 }); }
  _open() { this.readyState = 1; if (this.onopen) this.onopen(); }
  _recv(obj) { if (this.onmessage) this.onmessage({ data: JSON.stringify(obj) }); }
}
FakeWS.instances = [];

const FORWARD = { f: 1, b: 0, l: 0, r: 0, run: 0, yaw: 0 };

function makeClient() {
  const sim = createSurfaceSim({}, { scale: DEFAULTS.scale }); // open ground, no walls
  const player = { x: 0, z: 0, facing: Math.PI, moving: false, speed: 0 };
  const client = new NetClient({ token: 't', characterId: 'c1', planetId: 'solenne', sim, player });
  client.connect();
  return { sim, player, client, ws: FakeWS.instances[FakeWS.instances.length - 1] };
}

describe('NetClient', () => {
  beforeEach(() => { FakeWS.instances = []; global.WebSocket = FakeWS; });
  afterEach(() => { vi.restoreAllMocks(); });

  it('handshakes: sends join on open, adopts authoritative spawn on welcome', () => {
    const { player, client, ws } = makeClient();
    ws._open();
    const join = ws.sent.find((m) => m.t === 'join');
    expect(join).toMatchObject({ t: 'join', characterId: 'c1', planetId: 'solenne' });

    ws._recv({ t: 'welcome', you: 'c1', spawn: { x: 12, z: -4, facing: 1 }, tickHz: 20 });
    expect(client.mode).toBe('online');
    expect(client.you).toBe('c1');
    expect(player).toMatchObject({ x: 12, z: -4, facing: 1 });
    client.close();
  });

  it('reconciles predicted player = server self + replay of unacked inputs', () => {
    const { sim, player, client, ws } = makeClient();
    ws._open();
    ws._recv({ t: 'welcome', you: 'c1', spawn: { x: 0, z: 0, facing: Math.PI }, tickHz: 20 });

    // One input send (dt past the 1/20 threshold) → buffered as pending seq 1.
    client.pushInput(FORWARD, 0.06);
    expect(ws.sent.some((m) => m.t === 'input' && m.seq === 1)).toBe(true);

    // Snapshot acks nothing (ack:0) → pending {seq:1} replayed on top of server self.
    ws._recv({ t: 'snap', tick: 1, serverMs: 0, ack: 0, actMs: Date.now(), self: { x: 5, z: 5, f: 0 }, players: [], n: 1 });

    // Replay uses the FIXED server timestep (1/20s), not the push dt — matches the server.
    const expected = sim.integrate({ x: 5, z: 5, facing: 0 }, FORWARD, 1 / 20);
    expect(player.x).toBeCloseTo(expected.x, 5);
    expect(player.z).toBeCloseTo(expected.z, 5);

    // After the server acks seq 1, pending clears → player snaps exactly to server self.
    ws._recv({ t: 'snap', tick: 2, serverMs: 0, ack: 1, actMs: Date.now(), self: { x: 9, z: 9, f: 0 }, players: [], n: 1 });
    expect(player.x).toBeCloseTo(9, 5);
    expect(player.z).toBeCloseTo(9, 5);
    client.close();
  });

  it('tracks remote players from snapshots, excluding self', () => {
    const { client, ws } = makeClient();
    ws._open();
    ws._recv({ t: 'welcome', you: 'c1', spawn: { x: 0, z: 0, facing: 0 }, tickHz: 20 });
    ws._recv({
      t: 'snap', tick: 1, serverMs: 0, ack: 0, actMs: Date.now(), self: { x: 0, z: 0, f: 0 }, n: 2,
      players: [{ id: 'c1', x: 0, z: 0, f: 0, m: 0, c: '#fff', name: 'me' }, { id: 'c2', x: 3, z: 4, f: 1, m: 1, c: '#0f0', name: 'Ally' }],
    });
    expect(client.remotes.has('c1')).toBe(false);
    expect(client.remotes.has('c2')).toBe(true);
    expect(client.remotes.get('c2')).toMatchObject({ x: 3, z: 4, name: 'Ally' });
    client.close();
  });

  it('combat: sends cast, tracks self hp + fx, and revives on respawn', () => {
    const { client, ws, player } = makeClient();
    ws._open();
    ws._recv({ t: 'welcome', you: 'c1', spawn: { x: 0, z: 0, facing: 0 }, tickHz: 20 });

    client.cast('basic_attack', 'e0');
    expect(ws.sent.some((m) => m.t === 'cast' && m.ability === 'basic_attack' && m.targetId === 'e0')).toBe(true);

    ws._recv({
      t: 'snap', tick: 1, serverMs: 0, ack: 0, actMs: Date.now(),
      self: { x: 0, z: 0, f: 0, hp: 42, maxHp: 100, dead: 0 }, players: [], enemies: [], n: 1,
      fx: [{ type: 'hit', sourceId: 'c1', targetId: 'e0', dmg: 17, crit: true }],
    });
    expect(client.selfHp).toBe(42);
    expect(client.selfMaxHp).toBe(100);
    const fx = client.drainFx();
    expect(fx).toHaveLength(1);
    expect(fx[0]).toMatchObject({ targetId: 'e0', dmg: 17, crit: true });
    expect(client.drainFx()).toBeNull(); // drained

    // death then server respawn
    ws._recv({ t: 'snap', tick: 2, serverMs: 0, ack: 0, actMs: Date.now(), self: { x: 0, z: 0, f: 0, hp: 0, maxHp: 100, dead: 1 }, players: [], enemies: [], n: 1 });
    expect(client.selfDead).toBe(true);
    ws._recv({ t: 'respawn', x: 7, z: -3, hp: 40 });
    expect(client.selfDead).toBe(false);
    expect(player).toMatchObject({ x: 7, z: -3 });
    client.close();
  });

  it('falls offline when the socket closes and stops sending', () => {
    const { client, ws, player } = makeClient();
    ws._open();
    ws._recv({ t: 'welcome', you: 'c1', spawn: { x: 1, z: 2, facing: 0 }, tickHz: 20 });
    expect(client.mode).toBe('online');
    ws.close(); // server/connection drop
    expect(client.mode).toBe('offline');
    const before = ws.sent.length;
    client.pushInput(FORWARD, 0.06); // offline → no send
    expect(ws.sent.length).toBe(before);
    expect(player).toMatchObject({ x: 1, z: 2 }); // not mutated while offline
    client.close();
  });
});
