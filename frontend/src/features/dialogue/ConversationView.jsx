/**
 * ConversationView — the modern in-world dialogue surface.
 *
 * Replaces the legacy 1,242-line DialogueInterface. It is a compact lower-third
 * that keeps the 3D NPC visible: the NPC speaks as a typewriter subtitle, the
 * player answers from a choices-first list (free-text behind a quiet expander),
 * relationship reads as slim pips, and the full transcript/search lives in an
 * on-demand log. All conversation state + domain side-effects live in
 * useDialogueStore; this component owns rendering and the host-coupled actions
 * (vendor overlay, galaxy-map navigation, the quest-offer / details modals).
 *
 * Prop contract is unchanged from the legacy component so hosts swap one import:
 *   { npc, onClose, autoSendMessage, onShop }
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatDisplayName } from '../../utils/formatName';
import { useCharacterStore } from '../../state/characterSlice';
import { useDialogueStore } from '../../state/dialogueStore';
import { tutorialEventBus, TUTORIAL_EVENTS } from '../../services/tutorialEventBus';
import { addTutorialTarget, TUTORIAL_TARGETS } from '../../services/tutorialTargetRegistry';
import NPCDetailsModal from '../../components/npc/NPCDetailsModal';
import QuestOfferModal from '../../components/quest/QuestOfferModal';
import GameIcon from '../../components/common/GameIcon';
import { getFactionDisplayName } from './dialogueUtils';
import NpcLine from './components/NpcLine';
import ChoiceList from './components/ChoiceList';
import SayElse from './components/SayElse';
import RelationshipPips from './components/RelationshipPips';
import ConversationLog from './components/ConversationLog';
import './ConversationView.css';

export default function ConversationView({ npc, onClose, autoSendMessage, onShop }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentCharacter } = useCharacterStore();
  const characterId = currentCharacter?.id;

  // Store state (one canonical source of truth).
  const messages = useDialogueStore((s) => s.messages);
  const suggestions = useDialogueStore((s) => s.suggestions);
  const status = useDialogueStore((s) => s.status);
  const relationship = useDialogueStore((s) => s.relationship);
  const fullNpc = useDialogueStore((s) => s.fullNpc);
  const questOffer = useDialogueStore((s) => s.questOffer);
  const closing = useDialogueStore((s) => s.closing);

  const [logOpen, setLogOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const rootRef = useRef(null);
  const startedRef = useRef(null);

  // Open the conversation (loads relationship + history once, seeds the opener).
  useEffect(() => {
    if (!npc?.id || !characterId) return undefined;
    const store = useDialogueStore.getState();
    store.setCharacterName(currentCharacter?.name);
    store.open(npc, { characterId, autoSendMessage });
    return () => useDialogueStore.getState().reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [npc?.id, characterId, autoSendMessage]);

  // Tutorial root target + DIALOGUE_STARTED (once per NPC, with location).
  useEffect(() => {
    if (rootRef.current) addTutorialTarget(rootRef.current, TUTORIAL_TARGETS.DIALOGUE_INTERFACE);
  }, [npc?.id]);

  useEffect(() => {
    if (!npc?.id || !characterId || messages.length === 0) return;
    if (startedRef.current === npc.id) return;
    startedRef.current = npc.id;
    tutorialEventBus.emit(TUTORIAL_EVENTS.DIALOGUE_STARTED, {
      npcId: npc.id, npcName: npc.name, characterId,
      location: location.pathname.includes('/planet/') ? 'planet_surface' : 'spaceport',
      isTutorialNPC: !!npc.id?.startsWith('npc_tutorial_'),
      timestamp: new Date().toISOString(),
    });
  }, [npc?.id, characterId, messages.length, location.pathname]);

  // The NPC's current spoken line is the last npc/system message; while a reply
  // is in flight (or on initial load) we show the thinking indicator instead.
  const currentLine = useMemo(
    () => [...messages].reverse().find((m) => m.sender === 'npc' || m.sender === 'system') || null,
    [messages],
  );
  // Thinking dots only until the first token lands; once the line has text the
  // streaming reveal takes over (or the typewriter, for non-streamed branches).
  const thinking = status === 'loading' || (status === 'sending' && !currentLine?.text);
  const busy = status !== 'idle';

  // Keyboard: 1-9 pick a choice, Esc closes (ignored while typing in an input).
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') { onClose?.(); return; }
      const n = parseInt(e.key, 10);
      if (!busy && n >= 1 && n <= suggestions.length) {
        e.preventDefault();
        handleChoose(suggestions[n - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, suggestions]);

  const handleChoose = (s) => {
    const store = useDialogueStore.getState();
    if (s.action === 'open_vendor') {
      if (npc.id?.startsWith('npc_tutorial_')) {
        tutorialEventBus.emit(TUTORIAL_EVENTS.UI_OPENED_VENDOR, { npcId: npc.id, vendorId: npc.id, characterId });
      }
      if (onShop) { onShop(npc); onClose?.(); }
      else navigate(`/game/vendor/${npc.id}`);
      return;
    }
    // A live quest offer is owned by the modal — don't re-send the accept line.
    if (s.action === 'accept_quest' && store.questOffer) return;
    store.send(s.text);
  };

  const handleSetCourse = () => {
    if (!closing) return;
    navigate('/game/galaxy', {
      state: { revealPlanet: closing.destinationPlanet, fromTutorialClosing: true, followOnQuestTitle: closing.followOnQuestTitle },
    });
    onClose?.();
  };

  const headNpc = fullNpc || npc;
  const planetName = closing?.destinationPlanet
    ? closing.destinationPlanet.charAt(0).toUpperCase() + closing.destinationPlanet.slice(1)
    : 'the Reach';

  return (
    <div className="cv-root">
      <div ref={rootRef} className="cv-panel">
        {/* Header: identity · relationship · log · close */}
        <div className="cv-head">
          <button type="button" className="cv-identity" onClick={() => setInfoOpen(true)} title="View details">
            <span className="cv-name">{npc.name}</span>
            <span className="cv-meta">
              {formatDisplayName(headNpc.occupation) || 'Citizen'}
              {headNpc.species ? ` · ${formatDisplayName(headNpc.species)}` : ''}
              {headNpc.factionId ? ` · ${getFactionDisplayName(headNpc.factionId)}` : ''}
            </span>
          </button>

          <div className="cv-head-right">
            {relationship && <RelationshipPips level={relationship.relationshipLevel || 0} />}
            {npc.npcType === 'vendor' && (
              <button
                type="button"
                className="cv-iconbtn"
                aria-label="Trade"
                title="Trade"
                onClick={() => { if (onShop) { onShop(npc); onClose?.(); } else navigate(`/game/vendor/${npc.id}`); }}
              >
                <GameIcon name="shop" size={16} />
              </button>
            )}
            <button type="button" className="cv-iconbtn" aria-label="Conversation log" title="Conversation log" onClick={() => setLogOpen((v) => !v)}>
              <GameIcon name="history" size={16} />
            </button>
            <button type="button" className="cv-iconbtn cv-close" aria-label="End conversation" title="End conversation" onClick={onClose}>×</button>
          </div>
        </div>

        {/* NPC's spoken line */}
        <NpcLine line={currentLine} thinking={thinking} />

        {/* Golden-path closing CTA */}
        {closing && (
          <div className="cv-closing">
            <span className="cv-closing-label">Your first quest awaits</span>
            <button type="button" className="cv-setcourse" onClick={handleSetCourse}>
              <GameIcon name="course" size={16} /> Set course for {planetName}
              {closing.followOnQuestTitle ? ` — “${closing.followOnQuestTitle}”` : ''}
            </button>
          </div>
        )}

        {/* Player choices + free-text expander */}
        {!closing && (
          <>
            <ChoiceList suggestions={suggestions} onChoose={handleChoose} disabled={busy} />
            <SayElse onSend={(t) => useDialogueStore.getState().send(t)} disabled={busy} />
          </>
        )}
      </div>

      {logOpen && (
        <ConversationLog npcId={npc.id} characterId={characterId} npcName={npc.name} onClose={() => setLogOpen(false)} />
      )}

      <NPCDetailsModal
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
        npc={fullNpc || npc}
        characterId={characterId}
      />

      <QuestOfferModal
        isOpen={!!questOffer}
        onClose={() => useDialogueStore.getState().clearQuestOffer()}
        questId={questOffer?.questId}
        npcName={npc?.name}
        onQuestAccepted={async (quest) => {
          const store = useDialogueStore.getState();
          if (quest.questType === 'tutorial' || quest.id === 'tutorial_001_dockside_initiation') {
            store.appendNpcMessage('Great! Are you ready to learn the combat rules of engagement?');
            store.setSuggestions([
              { text: "Yes, I'm ready", action: 'ready_for_combat', icon: '⚔️' },
              { text: 'Not yet', action: 'not_ready', icon: '⏸️' },
            ], { locked: true });
            tutorialEventBus.emit(TUTORIAL_EVENTS.QUEST_ACCEPTED, { questId: quest.id, questTitle: quest.title, characterId });
            return;
          }
          store.appendSystemMessage(`Quest "${quest.title}" has been accepted!`);
          setTimeout(() => store.send(''), 200);
        }}
      />
    </div>
  );
}
