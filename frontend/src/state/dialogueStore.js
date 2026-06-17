/**
 * dialogueStore — single source of truth for an active NPC conversation.
 *
 * This replaces the legacy DialogueInterface's tangle of two message sources
 * (session + history) merged and de-duplicated by rounded timestamps, plus the
 * 3-second reloadHistory() race. Here there is ONE canonical ordered list:
 * history is read once when the conversation opens, and every subsequent line
 * is appended in place. The server still persists each turn, so re-opening the
 * NPC later re-reads it from history — but mid-conversation, this list is truth.
 *
 * The store owns conversation DATA and the domain side-effects that aren't tied
 * to routing (event-bus emits, relationship/rep updates, quest-offer + closing
 * flags). Host-coupled effects (opening the vendor overlay, navigating to the
 * galaxy map) stay in ConversationView, which has access to onShop / navigate.
 */

import { create } from 'zustand';
import { npcApi } from '../services/api/npcApi';
import { streamDialogue } from '../services/api/dialogueStream';
import { tutorialEventBus, TUTORIAL_EVENTS } from '../services/tutorialEventBus';
import { gameEventBus, GAME_EVENTS } from '../services/gameEventBus';
import {
  getGreeting,
  makeMessageId,
  normalizeMessage,
  normalizeSuggestion,
} from '../features/dialogue/dialogueUtils';

const initialState = {
  npc: null,            // active NPC (the lightweight object the host passed in)
  fullNpc: null,        // richer NPC payload from the API (for the details modal)
  characterId: null,
  relationship: null,   // { relationshipLevel, isRecruited, ... }
  messages: [],         // canonical ordered [{ id, sender, text, ts }]
  suggestions: [],      // normalized [{ text, icon?, action?, label? }]
  status: 'idle',       // 'idle' | 'loading' (initial open) | 'sending'
  error: null,
  questOffer: null,     // { questId } when an offer should surface
  closing: null,        // golden-path { destinationPlanet, followOnQuestTitle, choice }
  hasTutorialActions: false, // guard so generic suggestions don't clobber action chips
  _token: 0,            // async guard against overlapping open() calls
  _abort: null,         // AbortController for the in-flight stream (non-serialized)
};

// Pull the recently-accepted quest for THIS npc, if any (drives the thank-you).
async function recentlyAcceptedQuestFor(npcId) {
  try {
    const { useQuestStore } = await import('./questSlice');
    const active = useQuestStore.getState().activeQuests || [];
    const now = Date.now();
    const hit = active.find((qp) => {
      if (!qp.startedAt) return false;
      const secs = (now - new Date(qp.startedAt).getTime()) / 1000;
      return secs >= 0 && secs < 30;
    });
    const q = hit?.quest;
    if (q && (q.questGiverId === npcId || q.giverId === npcId || q.npcId === npcId)) return q;
  } catch (_) { /* non-fatal */ }
  return null;
}

export const useDialogueStore = create((set, get) => ({
  ...initialState,

  /**
   * Open a conversation. Loads relationship + history once, then seeds the
   * opening line: an explicit autoSendMessage (post-combat / farewell), a
   * recently-accepted-quest thank-you, or the tier-appropriate greeting.
   */
  open: async (npc, { characterId, autoSendMessage } = {}) => {
    if (!npc || !characterId) return;
    const prevAbort = get()._abort;
    if (prevAbort) { try { prevAbort.abort(); } catch (_) { /* noop */ } }
    const token = get()._token + 1;
    set({ ...initialState, _token: token, npc, characterId, status: 'loading' });

    // Relationship + full NPC payload.
    let relationship = { relationshipLevel: 0 };
    let fullNpc = npc;
    try {
      const res = await npcApi.getWithRelationship(npc.id, characterId);
      const data = res.data?.data || res.data || {};
      fullNpc = data.npc || npc;
      relationship = data.relationship || data || relationship;
    } catch (e) {
      console.warn('[dialogue] failed to load NPC relationship:', e?.message);
    }
    if (get()._token !== token) return; // superseded by a newer open()
    set({ relationship, fullNpc });

    // History (read ONCE — no polling, no dedupe).
    let history = [];
    try {
      const res = await npcApi.getConversationHistory(npc.id, characterId, { limit: 100 });
      const data = res.data?.data || res.data || {};
      history = (data.messages || []).map(normalizeMessage).filter(Boolean);
    } catch (e) {
      console.warn('[dialogue] failed to load history:', e?.message);
    }
    if (get()._token !== token) return;

    set({ messages: history, status: 'idle' });

    const isTutorial = !!npc.id?.startsWith('npc_tutorial_');

    // Post-combat / farewell auto-send drives the opening beat itself.
    if (autoSendMessage !== undefined) {
      await get().send(autoSendMessage, { isAuto: true });
      return;
    }

    // Returning to an NPC with existing history: just load fresh suggestions.
    if (history.length > 0) {
      get().loadSuggestions();
      return;
    }

    // Fresh conversation: thank-you if a quest was just accepted, else greeting.
    const accepted = await recentlyAcceptedQuestFor(npc.id);
    if (get()._token !== token) return;
    if (accepted) {
      await get().send('', { isAuto: true });
      return;
    }

    const greeting = isTutorial
      ? `Welcome, ${get().characterName || 'traveler'}. I'm ${npc.name}. I see you've just arrived at the spaceport. Let me help you get oriented and ready to begin your journey.`
      : getGreeting(fullNpc, relationship.relationshipLevel || 0);
    set({ messages: [{ id: makeMessageId('npc'), sender: 'npc', text: greeting, ts: Date.now() }] });
    get().loadSuggestions();
  },

  /**
   * Send a player line (or an empty auto-trigger) and reveal the NPC reply as a
   * live SSE token stream. A placeholder NPC message is appended and mutated as
   * deltas arrive; the terminal `done` payload carries the side-effects. Falls
   * back to the buffered endpoint ONLY when the stream never produced output
   * (re-sending after deltas would double the server-side side-effects).
   */
  send: async (text, { isAuto = false } = {}) => {
    const { npc, characterId, status } = get();
    if (!npc || !characterId) return null;
    if (status === 'sending') return null;
    const message = (text ?? '').toString();

    if (message) {
      get()._append({ sender: 'player', text: message });
    }
    tutorialEventBus.emit(TUTORIAL_EVENTS.DIALOGUE_MESSAGE_SENT, { npcId: npc.id, message });

    // Cancel any in-flight stream, then start a fresh one.
    const prev = get()._abort;
    if (prev) { try { prev.abort(); } catch (_) { /* noop */ } }
    const ac = new AbortController();
    set({ status: 'sending', error: null, _abort: ac });

    // Live NPC placeholder we mutate as tokens arrive.
    const npcMsgId = makeMessageId('npc');
    set((s) => ({ messages: [...s.messages, { id: npcMsgId, sender: 'npc', text: '', ts: Date.now(), streaming: true }] }));
    const patchNpc = (patch) => set((s) => ({
      messages: s.messages.map((m) => (m.id === npcMsgId ? { ...m, ...patch(m) } : m)),
    }));

    let gotDelta = false;
    try {
      const data = await streamDialogue(npc.id, characterId, message, {
        signal: ac.signal,
        onDelta: (chunk) => { gotDelta = true; patchNpc((m) => ({ text: m.text + chunk })); },
      });
      // Reconcile to the authoritative final text (covers non-streamed branches).
      patchNpc(() => ({ text: data.response || data.message || '', streaming: false, streamed: gotDelta }));
      await get()._applyTurn(data, ac);
      return data;
    } catch (e) {
      if (e?.name === 'AbortError') return null; // closed mid-stream; reset() cleans up
      const owns = () => get()._abort === ac; // false once reset()/open()/a new send() supersedes us

      // Only a 'connect'-stage failure means the request never reached the server,
      // so re-sending via the buffered endpoint is safe. Any other failure means
      // the stream got a 200 — the server may have already committed side-effects,
      // so we keep whatever text arrived and must NOT re-send (would double them).
      if (e?.stage === 'connect') {
        try {
          const res = await npcApi.sendDialogue(npc.id, characterId, message);
          const data = res.data?.data || res.data || {};
          patchNpc(() => ({ text: data.response || data.message || 'No response', streaming: false, streamed: false }));
          await get()._applyTurn(data, ac);
          return data;
        } catch (e2) {
          console.error('[dialogue] send failed (stream + buffered):', e2);
          if (owns()) {
            set((s) => ({ messages: s.messages.filter((m) => m.id !== npcMsgId) }));
            get()._append({ sender: 'system', text: 'Failed to send message. Please try again.' });
            set({ error: e2?.message || 'send failed' });
          }
          return null;
        }
      }

      // Connected, then truncated/errored. Keep the partial reply if we have one;
      // otherwise drop the empty placeholder. Never re-send.
      if (gotDelta) {
        patchNpc(() => ({ streaming: false, streamed: true }));
      } else if (owns()) {
        set((s) => ({ messages: s.messages.filter((m) => m.id !== npcMsgId) }));
        get()._append({ sender: 'system', text: 'The reply didn’t finish loading.' });
      }
      if (owns()) set({ error: e?.message || 'stream interrupted' });
      return null;
    } finally {
      // Only clear status if this send still owns the active stream (not superseded/reset).
      if (get()._abort === ac) set({ status: 'idle', _abort: null });
    }
  },

  /**
   * Apply a completed turn's side-effects (relationship, reputation, golden-path
   * closing, suggestions, tutorial combat hand-off, quest offer). Shared by the
   * streamed `done` payload and the buffered fallback so both behave identically.
   */
  _applyTurn: async (data, ac) => {
    const { npc, characterId } = get();
    if (!npc) return;
    // Bail if the conversation moved on (panel closed, NPC switched, new send)
    // while this turn was settling — otherwise we'd stamp NPC-A's relationship/
    // quest/suggestions/events onto NPC-B.
    if (ac && get()._abort !== ac) return;
    tutorialEventBus.emit(TUTORIAL_EVENTS.DIALOGUE_MESSAGE_RECEIVED, { npcId: npc.id, response: data.response });

    if (data.relationshipLevel !== undefined) {
      set((s) => ({ relationship: { ...s.relationship, relationshipLevel: data.relationshipLevel } }));
    }

    if (Array.isArray(data.reputationChanges)) {
      data.reputationChanges.forEach((c) => {
        if (c?.factionId && c?.delta) gameEventBus.emit(GAME_EVENTS.REP_CHANGED, c);
      });
    }

    if (data.closingChoice?.destinationPlanet) {
      const cc = data.closingChoice;
      try {
        const { useQuestStore } = await import('./questSlice');
        useQuestStore.getState().loadActiveQuests(characterId);
      } catch (_) { /* non-fatal */ }
      if (ac && get()._abort !== ac) return; // re-check after the dynamic import yields
      set({ closing: { destinationPlanet: cc.destinationPlanet, followOnQuestTitle: cc.followOnQuestTitle, choice: cc.choice } });
    }

    if (data.isTutorial && data.suggestedResponses) {
      set({ suggestions: data.suggestedResponses.map(normalizeSuggestion).filter(Boolean), hasTutorialActions: true });
    } else if (data.suggestedResponses) {
      set({ suggestions: data.suggestedResponses.map(normalizeSuggestion).filter(Boolean) });
    } else if (!data.isTutorial) {
      get().loadSuggestions();
    }

    if (data.isTutorial && data.nextState === 'combat_intro') {
      setTimeout(() => tutorialEventBus.emit(TUTORIAL_EVENTS.COMBAT_INTRO, { npcId: npc.id, characterId }), 100);
    }

    const questId = data.questId;
    if (questId) {
      tutorialEventBus.emit(TUTORIAL_EVENTS.QUEST_OFFERED, {
        questId, npcId: npc.id, npcName: npc.name, characterId,
        isTutorial: data.isTutorial || false, timestamp: new Date().toISOString(),
      });
      set({ questOffer: { questId } });
    } else if (data.offerQuest === true) {
      console.warn('[dialogue] offerQuest=true but no questId; cannot surface offer.');
    }
  },

  loadSuggestions: async () => {
    const { npc, characterId, messages, hasTutorialActions } = get();
    if (!npc || !characterId) return;
    // Don't stomp locked tutorial action chips.
    if (hasTutorialActions) return;
    try {
      const history = messages.map((m) => ({ sender: m.sender, text: m.text }));
      const res = await npcApi.getSuggestedResponses(npc.id, characterId, history);
      const data = res.data?.data || res.data || [];
      set({ suggestions: (Array.isArray(data) ? data : []).map(normalizeSuggestion).filter(Boolean) });
    } catch (e) {
      set({ suggestions: [] });
    }
  },

  // --- imperative helpers used by ConversationView (modal flows) ---
  appendNpcMessage: (text) => get()._append({ sender: 'npc', text }),
  appendSystemMessage: (text) => get()._append({ sender: 'system', text }),
  setSuggestions: (list, { locked = false } = {}) =>
    set({ suggestions: (list || []).map(normalizeSuggestion).filter(Boolean), hasTutorialActions: locked }),
  clearQuestOffer: () => set({ questOffer: null }),
  setFullNpc: (data) => set({ fullNpc: data }),
  reset: () => {
    const ac = get()._abort;
    if (ac) { try { ac.abort(); } catch (_) { /* noop */ } }
    set({ ...initialState, _token: get()._token + 1 });
  },

  // Stash the player's display name so greetings can use it without a hook.
  characterName: null,
  setCharacterName: (name) => set({ characterName: name }),

  _append: (msg) =>
    set((s) => ({ messages: [...s.messages, { id: makeMessageId(msg.sender), ts: Date.now(), ...msg }] })),
}));
