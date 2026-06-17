/**
 * ConversationLog — the on-demand backlog. The cinematic view shows only the
 * latest line, so this is where the full transcript lives. It renders the
 * store's canonical `messages` (the history loaded at open() + every line this
 * session) rather than a separate fetch, so what you just said is always here,
 * with a simple client-side search over it.
 */

import React, { useState } from 'react';
import { useDialogueStore } from '../../../state/dialogueStore';
import ConversationSearch from '../../../components/dialogue/ConversationSearch';

export default function ConversationLog({ npcName, onClose }) {
  const messages = useDialogueStore((s) => s.messages);
  const [query, setQuery] = useState('');

  const transcript = (messages || []).filter((m) => m.sender === 'npc' || m.sender === 'player');
  const q = query.trim().toLowerCase();
  const rows = q ? transcript.filter((m) => (m.text || '').toLowerCase().includes(q)) : transcript;

  return (
    <div className="cv-log" role="dialog" aria-label="Conversation history">
      <div className="cv-log-head">
        <span className="cv-log-title">Conversation log</span>
        <button type="button" className="cv-iconbtn" aria-label="Close log" onClick={onClose}>×</button>
      </div>

      <ConversationSearch onSearch={setQuery} searchQuery={query} />

      <div className="cv-log-body">
        {rows.length === 0 ? (
          <div className="cv-log-empty">{q ? 'No matching lines.' : 'Nothing said yet.'}</div>
        ) : (
          rows.map((m) => (
            <div key={m.id} className={`cv-log-row cv-log-${m.sender}`}>
              <span className="cv-log-who">{m.sender === 'player' ? 'You' : (npcName || 'NPC')}</span>
              <span className="cv-log-text">{m.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
