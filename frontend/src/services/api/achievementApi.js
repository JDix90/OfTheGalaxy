/**
 * Achievement API Service
 * Frontend API calls for achievements
 */

import { apiClient } from './client';

const achievementApi = {
  /**
   * Get all achievements for character
   * @param {string} characterId - Character UUID
   * @returns {Promise} API response
   */
  getAchievements: async (characterId) => {
    return apiClient.get(`/achievements/${characterId}`);
  },

  /**
   * Get achievement statistics
   * @param {string} characterId - Character UUID
   * @returns {Promise} API response
   */
  getStats: async (characterId) => {
    return apiClient.get(`/achievements/${characterId}/stats`);
  },

  /**
   * Check and update achievements
   * @param {string} characterId - Character UUID
   * @param {string} type - 'discovery', 'combat', or 'all'
   * @returns {Promise} API response
   */
  checkAchievements: async (characterId, type = 'all') => {
    return apiClient.post(`/achievements/${characterId}/check`, { type });
  }
};

export default achievementApi;

