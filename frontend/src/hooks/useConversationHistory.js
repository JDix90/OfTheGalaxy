/**
 * useConversationHistory Hook
 * Loads and manages conversation history for NPC dialogue
 */

import { useState, useEffect, useCallback } from 'react';
import { npcApi } from '../services/api/npcApi';

export function useConversationHistory(npcId, characterId) {
  const [messages, setMessages] = useState([]);
  const [topics, setTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Phase 5: Debounced search
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  const loadConversationHistory = useCallback(async (options = {}) => {
    if (!npcId || !characterId) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Phase 5: Include search query in options
      const search = options.searchQuery || debouncedSearchQuery || null;
      
      // Load conversation history
      const historyResponse = await npcApi.getConversationHistory(
        npcId,
        characterId,
        {
          limit: options.limit || 100,
          offset: options.offset || 0,
          topic: options.topic || null,
          questId: options.questId || null,
          search: search || null // Phase 5: Search support
        }
      );
      
      const historyData = historyResponse.data.data || historyResponse.data;
      const loadedMessages = historyData.messages || [];
      
      if (options.append) {
        // Append to existing messages (for pagination)
        setMessages(prev => [...prev, ...loadedMessages]);
      } else {
        // Replace messages
        setMessages(loadedMessages);
      }
      
      setHasMore(historyData.hasMore || false);
      setTotal(historyData.total || 0);
      
      // Load conversation topics
      const topicsResponse = await npcApi.getConversationTopics(npcId, characterId);
      const topicsData = topicsResponse.data.data || topicsResponse.data;
      setTopics(topicsData.topics || []);
      
    } catch (err) {
      console.error('[useConversationHistory] Failed to load conversation history:', err);
      setError(err.message || 'Failed to load conversation history');
      setMessages([]);
      setTopics([]);
      setHasMore(false);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [npcId, characterId]);
  
  // Load history when NPC or character changes
  useEffect(() => {
    loadConversationHistory();
  }, [loadConversationHistory]);
  
  const addMessage = useCallback((message) => {
    setMessages(prev => [...prev, message]);
    setTotal(prev => prev + 1);
  }, []);
  
  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    
    loadConversationHistory({
      limit: 50,
      offset: messages.length,
      append: true
    });
  }, [hasMore, isLoading, messages.length, loadConversationHistory]);
  
  const filterByTopic = useCallback((topic) => {
    if (!topic) {
      loadConversationHistory();
      return;
    }
    
    loadConversationHistory({ topic });
  }, [loadConversationHistory]);
  
  const filterByQuest = useCallback((questId) => {
    if (!questId) {
      loadConversationHistory();
      return;
    }
    
    loadConversationHistory({ questId });
  }, [loadConversationHistory]);
  
  // Phase 5: Search functionality
  const search = useCallback((query) => {
    setSearchQuery(query);
    // Debounced effect will handle the actual search
  }, []);
  
  // Phase 5: Reload when debounced search query changes
  useEffect(() => {
    // Only trigger search if debounced query is different from current search
    // This prevents duplicate searches on initial load
    if (debouncedSearchQuery !== undefined && debouncedSearchQuery !== '') {
      loadConversationHistory({ searchQuery: debouncedSearchQuery, offset: 0 });
    } else if (debouncedSearchQuery === '' && searchQuery === '') {
      // Clear search - reload without search query
      loadConversationHistory({ searchQuery: null, offset: 0 });
    }
  }, [debouncedSearchQuery, loadConversationHistory, searchQuery]);
  
  return {
    messages,
    topics,
    isLoading,
    error,
    hasMore,
    total,
    searchQuery,
    reload: () => loadConversationHistory(),
    addMessage,
    loadMore,
    filterByTopic,
    filterByQuest,
    search // Phase 5: Search function
  };
}

