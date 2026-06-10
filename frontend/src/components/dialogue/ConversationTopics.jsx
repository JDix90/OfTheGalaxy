/**
 * ConversationTopics Component
 * Phase 5: Enhanced with sorting, search, and better UI
 * Displays previous conversation topics and allows filtering by topic
 */

import React, { useState, useMemo } from 'react';
import './ConversationTopics.css';

export default function ConversationTopics({ topics, selectedTopic, onTopicClick, onClearFilter }) {
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'frequent', 'alphabetical'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Phase 5: Filter and sort topics
  const filteredAndSortedTopics = useMemo(() => {
    if (!topics || topics.length === 0) return [];
    
    let filtered = topics;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(topic => 
        topic.topic.toLowerCase().includes(query)
      );
    }
    
    // Sort topics
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'recent') {
        // Sort by last mentioned (most recent first)
        const dateA = new Date(a.lastMentioned || 0);
        const dateB = new Date(b.lastMentioned || 0);
        return dateB - dateA;
      } else if (sortBy === 'frequent') {
        // Sort by mention count (most frequent first)
        return (b.mentionCount || 0) - (a.mentionCount || 0);
      } else if (sortBy === 'alphabetical') {
        // Sort alphabetically
        return (a.topic || '').localeCompare(b.topic || '');
      }
      return 0;
    });
    
    return sorted;
  }, [topics, sortBy, searchQuery]);
  
  if (!topics || topics.length === 0) {
    return null;
  }

  return (
    <div className="conversation-topics">
      <div className="topics-header">
        <h4 className="topics-title">Previous Topics ({topics.length})</h4>
        {selectedTopic && (
          <button 
            className="clear-filter-button"
            onClick={onClearFilter}
            title="Clear topic filter"
          >
            ✕ Clear Filter
          </button>
        )}
      </div>
      
      {/* Phase 5: Search and sort controls */}
      <div className="topics-controls">
        <input
          type="text"
          className="topics-search-input"
          placeholder="Search topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="topics-sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          title="Sort topics"
        >
          <option value="recent">Most Recent</option>
          <option value="frequent">Most Frequent</option>
          <option value="alphabetical">Alphabetical</option>
        </select>
      </div>
      
      <div className="topics-list">
        {filteredAndSortedTopics.length === 0 ? (
          <div className="topics-empty">
            {searchQuery ? 'No topics match your search' : 'No topics found'}
          </div>
        ) : (
          filteredAndSortedTopics.map((topic, index) => {
            const isSelected = selectedTopic === topic.topic;
            const lastMentioned = topic.lastMentioned 
              ? new Date(topic.lastMentioned).toLocaleDateString()
              : 'Unknown';
            
            return (
              <button
                key={topic.topic || index}
                className={`topic-chip ${isSelected ? 'topic-chip-selected' : ''}`}
                onClick={() => onTopicClick(topic.topic)}
                title={`${topic.topic} - Mentioned ${topic.mentionCount} time${topic.mentionCount !== 1 ? 's' : ''}, last on ${lastMentioned}`}
              >
                <span className="topic-name">{topic.topic}</span>
                <span className="topic-count">({topic.mentionCount})</span>
                {sortBy === 'recent' && (
                  <span className="topic-date">{lastMentioned}</span>
                )}
              </button>
            );
          })
        )}
      </div>
      {selectedTopic && (
        <div className="topic-filter-indicator">
          Showing messages about: <strong>{selectedTopic}</strong>
        </div>
      )}
    </div>
  );
}

