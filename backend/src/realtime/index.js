/**
 * realtime/index — attach the authoritative WebSocket world to the http.Server.
 *
 * Handshake (security: trust inputs, never positions):
 *   1. Client connects to  ws(s)://host/realtime?token=<JWT>  — token verified on connect.
 *   2. Client sends { t:'join', characterId, planetId } — server asserts the character
 *      belongs to the authed user, loads the planet world, spawns the player, replies
 *      { t:'welcome', you, spawn, color, tickHz }.
 *   3. Client streams { t:'input', f,b,l,r,run,yaw,seq,ct }; server integrates at 20 Hz
 *      and broadcasts { t:'snap', ... } (see WorldManager).
 *
 * Falls back gracefully: the client's NetWorld plays offline (local prediction) if this
 * endpoint is unreachable, so single-player works with or without the realtime server.
 */

const path = require('path');
const { pathToFileURL } = require('url');
const jwt = require('jsonwebtoken');
const { WebSocketServer } = require('ws');
const { WorldManager } = require('./WorldManager');
const characterService = require('../services/characterService');
const combatService = require('../services/combatService');

const JWT_SECRET = process.env.JWT_SECRET;

const SIM_URL = pathToFileURL(path.join(__dirname, '../../../shared/sim/surface.mjs')).href;

/**
 * @param {import('http').Server} server
 * @returns {Promise<{ wss: WebSocketServer, manager: WorldManager }>}
 */
async function attachRealtime(server) {
  const simModule = await import(SIM_URL); // ESM sim across the CJS→ESM boundary
  const manager = new WorldManager(simModule);
  manager.start();

  // maxPayload caps inbound frames (legit messages are < 1KB) to prevent memory-exhaustion
  // DoS; deflate off (tiny messages don't benefit and it adds CPU).
  const wss = new WebSocketServer({ server, path: '/realtime', perMessageDeflate: false, maxPayload: 16 * 1024 });

  wss.on('connection', (ws, req) => {
    // --- authenticate the connection from the token query param ---
    let userId;
    try {
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      if (!token) throw new Error('no token');
      userId = jwt.verify(token, JWT_SECRET).userId; // sync; throws on invalid/expired
    } catch (e) {
      try { ws.close(4001, 'unauthorized'); } catch (_) {}
      return;
    }

    // --- origin allowlist (CSWSH guard) — enforced in production only so dev/preview
    //     ports and non-browser clients (no Origin header) aren't blocked. ---
    if (process.env.NODE_ENV === 'production') {
      const origin = req.headers.origin;
      const allowed = [process.env.CORS_ORIGIN, process.env.ALLOWED_ORIGIN].filter(Boolean);
      if (origin && allowed.length && !allowed.includes(origin)) {
        try { ws.close(1008, 'forbidden-origin'); } catch (_) {}
        return;
      }
    }

    let joined = false;
    let world = null;
    let playerId = null;
    let lastInputAt = 0;
    let lastCastAt = 0;

    // Force-close connections that authenticate but never join (stale-connection DoS).
    const joinTimeout = setTimeout(() => {
      if (!joined) { try { ws.close(4000, 'no-join'); } catch (_) {} }
    }, 10000);

    ws.on('message', async (buf) => {
      if (buf.length > 16 * 1024) { try { ws.close(1009, 'too-large'); } catch (_) {} return; }
      let msg;
      try { msg = JSON.parse(buf); } catch { return; }

      if (!joined) {
        if (msg.t !== 'join') return;
        try {
          const character = await characterService.getCharacter(msg.characterId);
          if (!character || String(character.userId) !== String(userId)) {
            try { ws.close(4003, 'forbidden'); } catch (_) {}
            return;
          }
          const planetId = String(msg.planetId);
          // Only authoritative on the planet the character actually traveled to (set by the
          // REST travel flow) — closes a travel-cost bypass. Mismatch → client plays offline.
          if (character.currentPlanet && String(character.currentPlanet) !== planetId) {
            try { ws.close(4006, 'planet-mismatch'); } catch (_) {}
            return;
          }
          world = await manager.getOrCreateWorld(planetId); // throws on bad planet / world cap
          playerId = String(character.id);
          // Replace any stale session for this character (e.g. a second tab / reconnect).
          const existing = world.players.get(playerId);
          if (existing && existing.ws && existing.ws !== ws) {
            try { existing.ws.close(4000, 'replaced'); } catch (_) {}
          }
          // Build the player's combat stat block once (DB: stats + equipped items).
          let combatant = null;
          try { combatant = await combatService.buildPlayerCombatant(character); } catch (e) { /* combat-less fallback */ }
          const player = world.addPlayer({ id: playerId, character, ws, combatant });
          if (!player) { try { ws.close(4007, 'world-full'); } catch (_) {} return; }
          joined = true;
          clearTimeout(joinTimeout);
          ws.send(JSON.stringify({
            t: 'welcome',
            you: playerId,
            color: player.color,
            tickHz: manager.TICK_HZ,
            spawn: { x: player.x, z: player.z, facing: player.facing },
          }));
        } catch (e) {
          try { ws.close(4002, 'join-failed'); } catch (_) {}
        }
        return;
      }

      if (msg.t === 'input') {
        const now = Date.now();
        if (now - lastInputAt < 25) return; // server-side flood guard (legit clients send @20Hz)
        lastInputAt = now;
        world.applyInput(playerId, msg);
      } else if (msg.t === 'cast') {
        const now = Date.now();
        if (now - lastCastAt < 120) return; // anti-spam (server still gates real cooldowns)
        lastCastAt = now;
        world.handleCast(playerId, msg, now); // server validates range/cooldown/cost
      }
    });

    ws.once('close', async () => {
      clearTimeout(joinTimeout);
      if (joined && world && playerId) {
        const p = world.players.get(playerId);
        if (p && p.ws === ws) {
          if (p.encounterId) { try { await manager.combat.finalize(world, p, 'fled'); } catch (_) {} } // end fight + save combat hp
          await manager.flushPlayer(p, world, true); // final save on disconnect (awaited)
          world.removePlayer(playerId);
        }
      }
      ws.removeAllListeners('message');
      ws.removeAllListeners('error');
    });
    ws.on('error', () => {});
  });

  console.log(`✓ Realtime world attached on ws path /realtime @ ${manager.TICK_HZ}Hz`);
  return { wss, manager };
}

module.exports = { attachRealtime };
