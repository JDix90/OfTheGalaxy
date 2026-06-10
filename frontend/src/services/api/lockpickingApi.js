/**
 * Lockpicking API Client
 * Handles lockpicking-related API calls
 */

import { apiClient } from './client';

const lockpickingApi = {
  /**
   * Attempt to pick a lock
   * @param {string} characterId - Character UUID
   * @param {string} lockId - Lock/door ID
   * @param {number} lockTier - Lock tier (1-5)
   * @param {boolean} useAdvantage - Whether to use advantage
   * @param {number} toolQuality - Tool quality bonus
   * @returns {Promise<Object>} Lockpicking result
   */
  async attemptPickLock(characterId, lockId, lockTier, useAdvantage = false, toolQuality = 0) {
    const response = await apiClient.post('/lockpicking/attempt', {
      characterId,
      lockId,
      lockTier,
      useAdvantage,
      toolQuality
    });
    return response.data;
  },

  /**
   * Get lockpicking success chance preview
   * @param {string} characterId - Character UUID
   * @param {number} lockTier - Lock tier (1-5)
   * @param {number} toolQuality - Tool quality bonus
   * @returns {Promise<Object>} Success chance information
   */
  async getLockpickChance(characterId, lockTier, toolQuality = 0) {
    const response = await apiClient.get(`/lockpicking/chance/${characterId}`, {
      params: { lockTier, toolQuality }
    });
    return response.data;
  }
};

export default lockpickingApi;

