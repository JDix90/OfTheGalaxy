/**
 * streamDialogue — POST the player's line and consume the NPC reply as a live
 * Server-Sent Events token stream.
 *
 * Bypasses the axios client on purpose: axios/XHR buffer the whole body and
 * can't expose it incrementally, so we use fetch + ReadableStream and replicate
 * the client's auth header, base-URL resolution, and 401 handling by hand.
 *
 * Resolves with the terminal `done` payload (the full processDialogue result:
 * reply text + relationship/quest/reputation side-effects), and calls
 * onDelta(chunk) for each streamed token.
 *
 * Rejects with a staged error so the caller can decide whether re-sending is
 * safe (`err.stage`):
 *   - 'connect' — never received a 200, so the server did NOT process this turn.
 *                 Safe to fall back to the buffered endpoint.
 *   - 'stream'  — got a 200 then failed/truncated. The server may have already
 *                 committed side-effects; the caller must NOT re-send.
 *   - AbortError (err.name) — the caller aborted; handle silently.
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function staged(message, stage) {
  const e = new Error(message);
  e.stage = stage;
  return e;
}

export async function streamDialogue(npcId, characterId, message, { onDelta, signal } = {}) {
  const token = localStorage.getItem('auth_token');

  let res;
  try {
    res = await fetch(`${API_BASE}/npcs/${encodeURIComponent(npcId)}/dialogue/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ characterId, message }),
      signal,
    });
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
    if (!e.stage) e.stage = 'connect'; // network error before any response
    throw e;
  }

  if (res.status === 401) {
    // Mirror the axios interceptor's 401 behaviour (client.js).
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    throw staged('Unauthorized', 'connect');
  }
  if (!res.ok || !res.body) {
    throw staged(`Dialogue stream failed (${res.status})`, 'connect');
  }

  // Connected: a 200 means the server is handling (and may commit) this turn, so
  // every failure from here on is 'stream' stage — the caller must not re-send.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let donePayload = null;

  // Decode one SSE frame: join its `data:` lines and dispatch by event type.
  const handleFrame = (frame) => {
    const dataLines = frame.split('\n').filter((l) => l.startsWith('data:'));
    if (!dataLines.length) return;
    const payload = dataLines.map((l) => l.slice(5).replace(/^ /, '')).join('\n');
    if (!payload || payload === '[DONE]') return;
    let evt;
    try { evt = JSON.parse(payload); } catch (_) { return; }
    if (evt.type === 'delta') {
      if (evt.text && onDelta) onDelta(evt.text);
    } else if (evt.type === 'done') {
      donePayload = evt.data;
    } else if (evt.type === 'error') {
      throw new Error(evt.message || 'Dialogue stream error');
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep;
      // Frames are separated by a blank line ("\n\n"); keep the trailing partial.
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        handleFrame(buffer.slice(0, sep));
        buffer = buffer.slice(sep + 2);
      }
    }
    if (buffer.trim()) handleFrame(buffer);
    if (donePayload == null) throw staged('Dialogue stream ended without completion', 'stream');
    return donePayload;
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
    if (!e.stage) e.stage = 'stream';
    throw e;
  } finally {
    try { reader.cancel(); } catch (_) { /* already closed */ }
  }
}
