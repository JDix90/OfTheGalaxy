/**
 * NPC API Service
 * API calls for NPC interactions
 */

import { apiClient } from './client';

export const npcApi = {
  /**
   * Get NPC by ID
   */
  getById: async (npcId) => {
    return await apiClient.get(`/npcs/${npcId}`);
  },

  /**
   * Get NPC with relationship data
   */
  getWithRelationship: async (npcId, characterId) => {
    return await apiClient.get(`/npcs/${npcId}?characterId=${characterId}`);
  },

  /**
   * Get NPCs by location
   */
  getByLocation: async (planet, area = null) => {
    const params = area ? `?area=${area}` : '';
    return await apiClient.get(`/npcs/location/${planet}${params}`);
  },

  /**
   * Get NPCs by faction
   */
  getByFaction: async (factionId) => {
    return await apiClient.get(`/npcs/faction/${factionId}`);
  },

  /**
   * Get all companions
   */
  getCompanions: async () => {
    return await apiClient.get('/npcs/companions');
  },

  /**
   * Get all vendors
   */
  getVendors: async () => {
    return await apiClient.get('/npcs/vendors');
  },

  /**
   * Send dialogue message to NPC
   */
  sendDialogue: async (npcId, characterId, message) => {
    return await apiClient.post(`/npcs/${npcId}/dialogue`, {
      characterId,
      message
    });
  },

  /**
   * Get suggested responses for NPC dialogue
   */
  getSuggestedResponses: async (npcId, characterId, conversationHistory = []) => {
    return await apiClient.post(`/npcs/${npcId}/suggested-responses`, {
      characterId,
      conversationHistory
    });
  },

  /**
   * Get conversation history for NPC-Character relationship
   */
  getConversationHistory: async (npcId, characterId, options = {}) => {
    const params = new URLSearchParams({
      characterId,
      ...(options.limit && { limit: options.limit.toString() }),
      ...(options.offset && { offset: options.offset.toString() }),
      ...(options.topic && { topic: options.topic }),
      ...(options.questId && { questId: options.questId }),
      ...(options.search && { search: options.search }) // Phase 5: Search support
    });
    return await apiClient.get(`/npcs/${npcId}/conversation-history?${params.toString()}`);
  },

  /**
   * Get conversation topics for NPC-Character relationship
   */
  getConversationTopics: async (npcId, characterId) => {
    return await apiClient.get(`/npcs/${npcId}/conversation-topics?characterId=${characterId}`);
  },

  /**
   * Get conversation context for dialogue generation
   */
  getConversationContext: async (npcId, characterId, playerMessage = '') => {
    const params = new URLSearchParams({
      characterId,
      ...(playerMessage && { playerMessage })
    });
    return await apiClient.get(`/npcs/${npcId}/conversation-context?${params.toString()}`);
  },

  /**
   * Recruit NPC as companion
   */
  recruit: async (npcId, characterId) => {
    return await apiClient.post(`/npcs/${npcId}/recruit`, {
      characterId
    });
  },

  /**
   * Dismiss companion
   */
  dismiss: async (npcId, characterId) => {
    return await apiClient.post(`/npcs/${npcId}/dismiss`, {
      characterId
    });
  },

  /**
   * Get recruited companions for character
   */
  getRecruited: async (characterId) => {
    return await apiClient.get(`/npcs/recruited/${characterId}`);
  },

  /**
   * Get NPCs by sub-map
   */
  getBySubMap: async (subMapId, parentLocationId = null, planetId = null, area = null) => {
    const params = new URLSearchParams();
    if (parentLocationId) params.append('parentLocationId', parentLocationId);
    if (planetId) params.append('planetId', planetId);
    if (area) params.append('area', area);
    const queryString = params.toString();
    return await apiClient.get(`/npcs/submap/${subMapId}${queryString ? '?' + queryString : ''}`);
  },

  /**
   * Generate NPCs for a planet
   */
  generateForPlanet: async (planetId, count = null) => {
    return await apiClient.post(`/npcs/generate/planet/${planetId}`, { count });
  },

  /**
   * Generate NPCs for a sub-map
   */
  generateForSubMap: async (subMapId, count = null) => {
    return await apiClient.post(`/npcs/generate/submap/${subMapId}`, { count });
  },

  /**
   * Get all NPCs
   */
  getAll: async (options = {}) => {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit);
    if (options.offset) params.append('offset', options.offset);
    if (options.npcType) params.append('npcType', options.npcType);
    if (options.factionId) params.append('factionId', options.factionId);
    if (options.planetId) params.append('planetId', options.planetId);
    if (options.systemId) params.append('systemId', options.systemId);
    
    const queryString = params.toString();
    const url = queryString ? `/npcs?${queryString}` : '/npcs';
    return await apiClient.get(url);
  },

  /**
   * Get active escort quest for character
   * GET /api/npcs/escort/active/:characterId
   */
  getActiveEscortQuest: async (characterId) => {
    return await apiClient.get(`/npcs/escort/active/${characterId}`);
  },

  /**
   * Get escort quest marker for map display
   * GET /api/npcs/escort/marker/:characterId
   */
  getEscortQuestMarker: async (characterId) => {
    return await apiClient.get(`/npcs/escort/marker/${characterId}`);
  }
};
