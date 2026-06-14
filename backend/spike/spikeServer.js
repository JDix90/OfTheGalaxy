/**
 * backend/spike/spikeServer.js — Phase-0 spike: minimal AUTHORITATIVE real-time loop.
 *
 * THROWAWAY / ISOLATED. Does NOT touch the Express app, Sequelize, or :3001.
 * Standalone WebSocket server on :3002 that proves the smallest possible
 * "the server owns the world" experiment, the way the migration brief (§4) asks:
 *
 *   - Fixed 20 Hz tick driven by an hrtime accumulator (ClaudeCraft's pattern).
 *   - Clients send INPUTS (button flags + camera yaw), never positions — the server
 *     integrates movement authoritatively via the SHARED sim module that the browser
 *     client also imports (so client prediction == server authority => ~0 drift).
 *   - Server broadcasts authoritative snapshots; each client's snapshot carries an
 *     ack of its last input so the client can measure RTT and predicted-vs-authoritative drift.
 *   - Reuses REAL OtG content: it `require()`s backend/src/data/enemyTemplates.js and
 *     spawns those stat blocks as live server-driven actors — the "can we run existing
 *     content/data behind a real-time loop?" question, answered directly.
 *
 * Run:  node backend/spike/spikeServer.js     (or: npm run spike  — see package.json)
 */

const path = require('path');
const { pathToFileURL } = require('url');
const { WebSocketServer } = require('ws');

const WS_PORT = process.env.SPIKE_PORT ? Number(process.env.SPIKE_PORT) : 3002;

// REAL OtG content, reused verbatim behind the real-time loop (CJS require).
// We use the actual content accessor, not just the raw data, to prove the existing
// domain layer runs unchanged behind a real-time loop.
const { getEnemyTemplate } = require('../src/data/enemyTemplates');

(async () => {
  // The ONE shared sim core, imported across the CJS→ESM boundary (the key test).
  const sharedUrl = pathToFileURL(path.join(__dirname, '../../shared/spike/world.mjs'));
  const W = await import(sharedUrl.href);

  const wss = new WebSocketServer({ port: WS_PORT });

  // ---- World state ----------------------------------------------------------
  let nextPlayerId = 1;
  const players = new Map(); // id -> { id, ws, x, z, facing, input, lastSeq, lastClientTime, color, name }
  const PALETTE = ['#ffcf5c', '#6cf0c2', '#7db8ff', '#ff8d6c', '#d18cff', '#9affa0'];

  // Spawn live enemies straight from OtG's enemy templates (content reuse proof).
  // turns->timers: the data is turn-based; here a 3-turn attack cadence becomes a
  // real-time cooldown (3 * tick window). We just integrate position; combat math
  // would slot in identically (server-authoritative), which is the whole point.
  function makeEnemy(templateKey, id, home, patrolRadius) {
    const t = getEnemyTemplate(templateKey);
    return {
      id,
      templateKey,
      name: t.name,
      level: t.level,
      tier: t.tier,
      hp: t.stats.health,
      maxHp: t.stats.maxHealth,
      // a "turn" cooldown reinterpreted as seconds — the migration's turns->timers seam
      attackCooldownS: 3 * 0.8,
      x: home.x, z: home.z, facing: 0,
      home, patrolRadius, phase: id.length, // deterministic-ish phase offset
    };
  }
  const enemies = [
    makeEnemy('ironclad', 'enemy-ironclad-1', { x: 10, z: -2 }, 5),
    makeEnemy('pirate', 'enemy-pirate-1', { x: 24, z: 3 }, 4),
  ];

  // ---- Networking -----------------------------------------------------------
  function send(ws, obj) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
  }

  wss.on('connection', (ws) => {
    const id = `p${nextPlayerId++}`;
    const color = PALETTE[(nextPlayerId - 2) % PALETTE.length];
    const player = {
      id, ws, x: 0, z: 6, facing: Math.PI, color, name: id,
      input: { f: 0, b: 0, l: 0, r: 0, run: 0, yaw: 0 },
      lastSeq: 0, lastClientTime: 0,
    };
    players.set(id, player);
    console.log(`[spike] + ${id} connected (${players.size} online)`);

    // hello: hand the client its id, the world geometry, chunks, and enemy roster.
    send(ws, {
      t: 'hello',
      you: id,
      color,
      tickHz: W.TICK_HZ,
      spawn: { x: player.x, z: player.z, facing: player.facing },
      props: W.PROPS,
      chunks: W.CHUNKS,
      enemies: enemies.map((e) => ({
        id: e.id, name: e.name, level: e.level, tier: e.tier, maxHp: e.maxHp, templateKey: e.templateKey,
      })),
    });

    ws.on('message', (buf) => {
      let msg;
      try { msg = JSON.parse(buf); } catch { return; }
      if (msg.t === 'input') {
        // Trust only inputs, never positions.
        player.input = {
          f: msg.f ? 1 : 0, b: msg.b ? 1 : 0, l: msg.l ? 1 : 0, r: msg.r ? 1 : 0,
          run: msg.run ? 1 : 0, yaw: typeof msg.yaw === 'number' ? msg.yaw : player.input.yaw,
        };
        player.lastSeq = msg.seq | 0;
        player.lastClientTime = msg.ct || 0;
      }
    });

    ws.on('close', () => {
      players.delete(id);
      console.log(`[spike] - ${id} disconnected (${players.size} online)`);
    });
    ws.on('error', () => {});
  });

  // ---- The authoritative tick ----------------------------------------------
  let tick = 0;
  let simTime = 0;
  let tickMsEMA = 0;          // smoothed per-tick compute cost
  let acc = 0;
  let last = process.hrtime.bigint();

  function step() {
    const t0 = process.hrtime.bigint();

    // Integrate every player from their latest input — SHARED module, same as client.
    for (const p of players.values()) {
      const next = W.integrateMovement({ x: p.x, z: p.z, facing: p.facing }, p.input, W.DT);
      p.x = next.x; p.z = next.z; p.facing = next.facing; p.moving = next.moving;
    }

    // Server-driven enemy actors (simple deterministic patrol around home).
    for (const e of enemies) {
      const a = simTime * 0.6 + e.phase;
      const px = e.home.x + Math.cos(a) * e.patrolRadius;
      const pz = e.home.z + Math.sin(a) * e.patrolRadius;
      e.facing = Math.atan2(px - e.x, pz - e.z);
      e.x = px; e.z = pz;
    }

    tick++;
    simTime += W.DT;
    const dtMs = Number(process.hrtime.bigint() - t0) / 1e6;
    tickMsEMA = tickMsEMA * 0.9 + dtMs * 0.1;
  }

  function broadcast() {
    const playerWire = [...players.values()].map((p) => ({
      id: p.id, x: round(p.x), z: round(p.z), f: round(p.facing), m: p.moving ? 1 : 0, c: p.color,
    }));
    const enemyWire = enemies.map((e) => ({
      id: e.id, x: round(e.x), z: round(e.z), f: round(e.facing), hp: e.hp, maxHp: e.maxHp,
    }));
    const now = Date.now();
    for (const p of players.values()) {
      // Per-recipient snapshot: tailor the ack so the client can compute RTT + drift.
      send(p.ws, {
        t: 'snap',
        tick,
        time: round(simTime),
        serverMs: round(tickMsEMA, 3),
        ack: p.lastSeq,          // last input we've applied for this client
        actMs: p.lastClientTime, // echo their clientTime -> RTT = now - actMs
        self: { x: round(p.x), z: round(p.z), f: round(p.facing) },
        players: playerWire,
        enemies: enemyWire,
        n: players.size,
      });
    }
  }

  // setInterval + accumulator: catch up missed ticks, broadcast once per interval.
  const loop = setInterval(() => {
    const now = process.hrtime.bigint();
    let frame = Number(now - last) / 1e9;
    last = now;
    if (frame > 0.25) frame = 0.25; // clamp after a stall; never spiral
    acc += frame;
    let steps = 0;
    while (acc >= W.DT && steps < 5) { step(); acc -= W.DT; steps++; }
    if (players.size > 0) broadcast();
  }, 1000 / W.TICK_HZ);

  // Lightweight perf heartbeat to the console (for the recommendation's measurements).
  const heartbeat = setInterval(() => {
    if (players.size === 0) return;
    console.log(`[spike] tick=${tick} online=${players.size} tickCost=${tickMsEMA.toFixed(3)}ms`);
  }, 5000);

  function shutdown() {
    clearInterval(loop); clearInterval(heartbeat);
    wss.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 500);
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log(`[spike] authoritative tick server on ws://localhost:${WS_PORT}  @ ${W.TICK_HZ}Hz`);
  console.log(`[spike] reusing OtG enemy templates: ${enemies.map((e) => e.name).join(', ')}`);
})().catch((err) => {
  console.error('[spike] failed to start:', err);
  process.exit(1);
});

function round(n, p = 2) {
  const f = Math.pow(10, p);
  return Math.round(n * f) / f;
}
