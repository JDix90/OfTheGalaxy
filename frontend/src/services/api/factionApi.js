/**
 * Faction API Service
 * Frontend API calls for faction reputation management
 */

import { apiClient } from './client';

export const factionApi = {
  /**
   * Get all faction reputations for a character
   * @param {string} characterId - Character UUID
   * @param {boolean} showAll - Show all factions, even with 0 reputation
   * @returns {Promise} API response
   */
  getReputations: async (characterId, showAll = false) => {
    const params = showAll ? { showAll: 'true' } : {};
    return apiClient.get(`/factions/${characterId}`, { params });
  },

  /**
   * Get reputation for a specific faction
   * @param {string} characterId - Character UUID
   * @param {string} factionId - Faction ID
   * @returns {Promise} API response
   */
  getReputation: async (characterId, factionId) => {
    return apiClient.get(`/factions/${characterId}/${factionId}`);
  },

  /**
   * Update faction reputation
   * @param {string} characterId - Character UUID
   * @param {string} factionId - Faction ID
   * @param {number} amount - Reputation change amount
   * @returns {Promise} API response
   */
  updateReputation: async (characterId, factionId, amount) => {
    return apiClient.post(`/factions/${characterId}/${factionId}`, { amount });
  }
};

