/**
 * ConversationLog — the on-demand backlog. The default cinematic view stays
 * clean; pulling up the log is where the full transcript, search and topic
 * filters live (the Phase-5 power features, in their natural home rather than
 * cluttering every conversation). Uses the existing useConversationHistory hook.
 */

import React from 'react';
import { useConversationHistory } from '../../../hooks/useConversationHistory';
import ConversationSearch from '../../../components/dialogue/ConversationSearch';
import ConversationTopics from '../../../components/dialogue/ConversationTopics';
import { normalizeMessage } from '../dialogueUtils';

export default function ConversationLog({ npcId, characterId, npcName, onClose }) {
  const {
    messages, topics, isLoading, filterByTopic, search, searchQuery,
  } = useConversationHistory(npcId, characterId);
  const [selectedTopic, setSelectedTopic] = React.useState(null);

  const rows = (messages || []).map(normalizeMessage).filter(Boolean);

  return (
    <div className="cv-log" role="dialog" aria-label="Conversation history">
      <div className="cv-log-head">
        <span className="cv-log-title">Conversation log</span>
        <button type="button" className="cv-iconbtn" aria-label="Close log" onClick={onClose}>×</button>
      </div>

      <ConversationSearch onSearch={search} searchQuery={searchQuery} />

      {topics && topics.length > 0 && (
        <ConversationTopics
          topics={topics}
          selectedTopic={selectedTopic}
          onTopicClick={(t) => { setSelectedTopic(t); filterByTopic(t); }}
          onClearFilter={() => { setSelectedTopic(null); filterByTopic(null); }}
        />
      )}

      <div className="cv-log-body">
        {isLoading ? (
          <div className="cv-log-empty">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="cv-log-empty">No earlier conversation.</div>
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
