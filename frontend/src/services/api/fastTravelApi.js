/**
 * Fast Travel API Service
 * Frontend API calls for fast travel
 */

import { apiClient } from './client';

const fastTravelApi = {
  /**
   * Get available fast travel points
   * @param {string} characterId - Character UUID
   * @param {string} planetId - Planet ID
   * @returns {Promise} API response
   */
  getPoints: async (characterId, planetId) => {
    return apiClient.get(`/fast-travel/${characterId}/${planetId}`);
  },

  /**
   * Fast travel to destination
   * @param {string} characterId - Character UUID
   * @param {string} planetId - Planet ID
   * @param {string} destinationId - Destination point ID
   * @param {object} options - Travel options
   * @returns {Promise} API response
   */
  travel: async (characterId, planetId, destinationId, options = {}) => {
    return apiClient.post('/fast-travel/travel', {
      characterId,
      planetId,
      destinationId,
      options
    });
  }
};

export default fastTravelApi;

