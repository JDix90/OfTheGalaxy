/**
 * Health Regeneration API
 * Frontend API for health regeneration
 */

import { apiClient } from './client';

const healthRegenApi = {
  /**
   * Process health regeneration for character
   * @param {string} characterId - Character UUID
   * @returns {Promise<Object>} Regeneration result
   */
  async processRegeneration(characterId) {
    const response = await apiClient.post(`/health-regen/${characterId}`);
    return response.data;
  },

  /**
   * Check if character is in combat
   * @param {string} characterId - Character UUID
   * @returns {Promise<Object>} Combat status
   */
  async getCombatStatus(characterId) {
    const response = await apiClient.get(`/health-regen/${characterId}/combat-status`);
    return response.data;
  }
};

export default healthRegenApi;


