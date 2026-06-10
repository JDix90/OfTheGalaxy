/**
 * Quest API Service
 * API calls for quest management
 */

import { apiClient } from './client';

export const questApi = {
  /**
   * Get available quests for character
   */
  getAvailable: async (characterId) => {
    return await apiClient.get(`/quests/available/${characterId}`);
  },

  /**
   * Get active quests for character
   */
  getActive: async (characterId) => {
    return await apiClient.get(`/quests/active/${characterId}`);
  },

  /**
   * Get completed quests for character
   */
  getCompleted: async (characterId) => {
    return await apiClient.get(`/quests/completed/${characterId}`);
  },

  /**
   * Get quest by ID
   * @param {string} questId - Quest ID
   * @param {string} characterId - Optional character ID for character-specific customization (e.g., tutorial quests)
   */
  getById: async (questId, characterId = null) => {
    const params = characterId ? { characterId } : {};
    return await apiClient.get(`/quests/${questId}`, { params });
  },

  /**
   * Get quests by faction
   */
  getByFaction: async (factionId) => {
    return await apiClient.get(`/quests/faction/${factionId}`);
  },

  /**
   * Get available quests from a specific NPC
   */
  getByNPC: async (npcId, characterId) => {
    return await apiClient.get(`/quests/npc/${npcId}/${characterId}`);
  },

  /**
   * Start a quest
   */
  start: async (characterId, questId) => {
    return await apiClient.post('/quests/start', {
      characterId,
      questId
    });
  },

  /**
   * Update quest objective
   */
  updateObjective: async (characterId, questId, objectiveId, completed = true, progress = null) => {
    return await apiClient.put('/quests/objective', {
      characterId,
      questId,
      objectiveId,
      completed,
      progress
    });
  },

  /**
   * Complete a quest
   */
  complete: async (characterId, questId) => {
    return await apiClient.post('/quests/complete', {
      characterId,
      questId
    });
  },

  /**
   * Abandon a quest
   */
  abandon: async (characterId, questId) => {
    return await apiClient.post('/quests/abandon', {
      characterId,
      questId
    });
  }
};
