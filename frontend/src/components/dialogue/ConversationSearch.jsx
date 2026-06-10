/**
 * ConversationSearch Component
 * Phase 5: Search functionality for conversation history
 */

import React, { useState, useCallback } from 'react';
import './ConversationSearch.css';

export default function ConversationSearch({ onSearch, searchQuery: externalSearchQuery }) {
  const [localSearchQuery, setLocalSearchQuery] = useState(externalSearchQuery || '');
  
  const handleSearch = useCallback((query) => {
    setLocalSearchQuery(query);
    if (onSearch) {
      onSearch(query);
    }
  }, [onSearch]);
  
  const handleClear = useCallback(() => {
    handleSearch('');
  }, [handleSearch]);
  
  return (
    <div className="conversation-search">
      <div className="search-input-wrapper">
        <input
          type="text"
          className="conversation-search-input"
          placeholder="Search conversation history..."
          value={localSearchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
        {localSearchQuery && (
          <button
            className="search-clear-button"
            onClick={handleClear}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>
      {localSearchQuery && (
        <div className="search-indicator">
          Searching for: <strong>{localSearchQuery}</strong>
        </div>
      )}
    </div>
  );
}




