/**
 * dialogueStore — covers the rewritten conversation data flow (single canonical
 * ordered list, no merge/dedupe) AND the Phase 3 SSE streaming path: live token
 * accumulation, the terminal `done` side-effects, the buffered fallback when the
 * stream can't start, and the no-double-send guard after deltas have arrived.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { useDialogueStore } from '../../../src/state/dialogueStore';
import { npcApi } from '../../../src/services/api/npcApi';
import { streamDialogue } from '../../../src/services/api/dialogueStream';

vi.mock('../../../src/services/api/npcApi', () => ({
  npcApi: {
    getWithRelationship: vi.fn(),
    getConversationHistory: vi.fn(),
    getSuggestedResponses: vi.fn(),
    sendDialogue: vi.fn(),
  },
}));

vi.mock('../../../src/services/api/dialogueStream', () => ({ streamDialogue: vi.fn() }));

// No accepted quest / no quest store side effects in these flows.
vi.mock('../../../src/state/questSlice', () => ({
  useQuestStore: { getState: () => ({ activeQuests: [], loadActiveQuests: vi.fn() }) },
}));

const NPC = { id: 'npc_dock_jax', name: 'Dockmaster Jax', occupation: 'dockmaster' };
const CHAR = 'char_1';

function mockOpen({ greeting, relationshipLevel = 0, history = [] } = {}) {
  npcApi.getWithRelationship.mockResolvedValue({
    data: {
      npc: { ...NPC, dialogue: greeting ? { greeting: { stranger: greeting } } : undefined },
      relationship: { relationshipLevel },
    },
  });
  npcApi.getConversationHistory.mockResolvedValue({ data: { messages: history } });
  npcApi.getSuggestedResponses.mockResolvedValue({ data: [{ text: 'Where do I start?' }] });
}

// Staged errors mirror streamDialogue's contract: 'connect' = never reached the
// server (safe to fall back to buffered); 'stream' = got a 200 then failed (the
// server may have committed — must NOT re-send).
const connectErr = (msg = 'stream unavailable') => Object.assign(new Error(msg), { stage: 'connect' });
const streamErr = (msg = 'stream interrupted') => Object.assign(new Error(msg), { stage: 'stream' });

beforeEach(() => {
  vi.clearAllMocks();
  // Default: stream can't connect → exercises the buffered fallback. Streaming
  // tests override this per-case.
  streamDialogue.mockRejectedValue(connectErr());
  useDialogueStore.getState().reset();
});

describe('dialogueStore — open & greeting', () => {
  test('open() seeds the authored greeting when there is no history', async () => {
    mockOpen({ greeting: 'New face, empty pockets.' });
    await useDialogueStore.getState().open(NPC, { characterId: CHAR });

    const { messages, status } = useDialogueStore.getState();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ sender: 'npc', text: 'New face, empty pockets.' });
    expect(status).toBe('idle');
  });

  test('open() with existing history shows it and skips the greeting', async () => {
    mockOpen({
      history: [
        { sender: 'player', text: 'Hello', timestamp: '2026-06-17T10:00:00Z' },
        { sender: 'npc', text: 'We meet again.', timestamp: '2026-06-17T10:00:01Z' },
      ],
    });
    await useDialogueStore.getState().open(NPC, { characterId: CHAR });
    expect(useDialogueStore.getState().messages.map((m) => m.text)).toEqual(['Hello', 'We meet again.']);
  });

  test('a concurrent open() supersedes the earlier one (token guard)', async () => {
    mockOpen({ greeting: 'First.' });
    const first = useDialogueStore.getState().open(NPC, { characterId: CHAR });
    npcApi.getWithRelationship.mockResolvedValue({ data: { npc: { ...NPC, id: 'npc_other', name: 'Other' }, relationship: { relationshipLevel: 0 } } });
    const second = useDialogueStore.getState().open({ id: 'npc_other', name: 'Other' }, { characterId: CHAR });
    await Promise.all([first, second]);
    expect(useDialogueStore.getState().npc.id).toBe('npc_other');
  });
});

describe('dialogueStore — streaming send', () => {
  test('streams deltas into the NPC line and applies done side-effects', async () => {
    mockOpen({ greeting: 'Hi.' });
    await useDialogueStore.getState().open(NPC, { characterId: CHAR });

    streamDialogue.mockImplementation(async (npcId, charId, msg, { onDelta }) => {
      onDelta('General ');
      onDelta('Kenobi.');
      return { response: 'General Kenobi.', relationshipLevel: 22, questId: 'q_9' };
    });
    await useDialogueStore.getState().send('Hello there');

    const { messages, relationship, questOffer } = useDialogueStore.getState();
    expect(messages.map((m) => `${m.sender}:${m.text}`)).toEqual([
      'npc:Hi.', 'player:Hello there', 'npc:General Kenobi.',
    ]);
    expect(messages.at(-1)).toMatchObject({ streamed: true, streaming: false });
    expect(relationship.relationshipLevel).toBe(22);
    expect(questOffer).toEqual({ questId: 'q_9' });
    expect(npcApi.sendDialogue).not.toHaveBeenCalled(); // streaming succeeded → no fallback
  });

  test('a mid-stream error keeps the partial text and does NOT re-send (no double side-effects)', async () => {
    mockOpen({ greeting: 'Hi.' });
    await useDialogueStore.getState().open(NPC, { characterId: CHAR });

    streamDialogue.mockImplementation(async (npcId, charId, msg, { onDelta }) => {
      onDelta('Half a sentence');
      throw streamErr('connection dropped');
    });
    await useDialogueStore.getState().send('Hello there');

    const { messages, status } = useDialogueStore.getState();
    expect(messages.at(-1)).toMatchObject({ sender: 'npc', text: 'Half a sentence', streaming: false });
    expect(messages.some((m) => m.sender === 'system')).toBe(false); // partial reply, not an error toast
    expect(npcApi.sendDialogue).not.toHaveBeenCalled(); // must NOT re-run server side-effects
    expect(status).toBe('idle');
  });

  test('a connected stream that truncates with NO delta does not re-send (server may have committed)', async () => {
    mockOpen({ greeting: 'Hi.' });
    await useDialogueStore.getState().open(NPC, { characterId: CHAR });

    // Non-streamed branch (tutorial/template/cache): 200 received, side-effects
    // committed server-side, but the 'done' frame was lost. gotDelta stays false.
    streamDialogue.mockRejectedValue(streamErr('Dialogue stream ended without completion'));
    await useDialogueStore.getState().send('Hello there');

    expect(npcApi.sendDialogue).not.toHaveBeenCalled(); // re-sending would double side-effects
    const { messages, status } = useDialogueStore.getState();
    expect(messages.some((m) => m.sender === 'npc' && m.text === '')).toBe(false); // empty placeholder dropped
    expect(messages.at(-1)).toMatchObject({ sender: 'system' });
    expect(status).toBe('idle');
  });

  test('falls back to the buffered endpoint when the stream never connects', async () => {
    mockOpen({ greeting: 'Hi.' });
    await useDialogueStore.getState().open(NPC, { characterId: CHAR });

    streamDialogue.mockRejectedValue(connectErr('Dialogue stream failed (404)')); // never reached the server
    npcApi.sendDialogue.mockResolvedValue({ data: { response: 'Buffered reply.', relationshipLevel: 7 } });
    await useDialogueStore.getState().send('Hello there');

    const { messages, relationship } = useDialogueStore.getState();
    expect(messages.at(-1)).toMatchObject({ sender: 'npc', text: 'Buffered reply.' });
    expect(relationship.relationshipLevel).toBe(7);
    expect(npcApi.sendDialogue).toHaveBeenCalledTimes(1);
  });

  test('an aborted stream is silent (no error toast, no re-send)', async () => {
    mockOpen({ greeting: 'Hi.' });
    await useDialogueStore.getState().open(NPC, { characterId: CHAR });

    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    streamDialogue.mockRejectedValue(abortErr);
    await useDialogueStore.getState().send('Hello there');

    const { messages } = useDialogueStore.getState();
    expect(messages.some((m) => m.sender === 'system')).toBe(false);
    expect(npcApi.sendDialogue).not.toHaveBeenCalled();
  });

  test('post-combat auto-send opens straight into a streamed reply with no player line', async () => {
    mockOpen();
    streamDialogue.mockImplementation(async (npcId, charId, msg, { onDelta }) => {
      onDelta('You fought well.');
      return { response: 'You fought well.' };
    });
    await useDialogueStore.getState().open(NPC, { characterId: CHAR, autoSendMessage: '' });

    const { messages } = useDialogueStore.getState();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ sender: 'npc', text: 'You fought well.' });
  });
});

describe('dialogueStore — failure handling', () => {
  test('surfaces a system message when both stream and buffered send fail', async () => {
    mockOpen({ greeting: 'Hi.' });
    await useDialogueStore.getState().open(NPC, { characterId: CHAR });

    streamDialogue.mockRejectedValue(connectErr('stream down'));
    npcApi.sendDialogue.mockRejectedValue(new Error('network down'));
    await useDialogueStore.getState().send('Anyone there?');

    const { messages, status } = useDialogueStore.getState();
    expect(messages.at(-1)).toMatchObject({ sender: 'system' });
    expect(messages.some((m) => m.sender === 'player' && m.text === 'Anyone there?')).toBe(true);
    // the empty NPC placeholder must be dropped, not left dangling
    expect(messages.some((m) => m.sender === 'npc' && m.text === '')).toBe(false);
    expect(status).toBe('idle');
  });
});
