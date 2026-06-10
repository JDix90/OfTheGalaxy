/**
 * POI API Service
 * Frontend API calls for POI interactions
 */

import { apiClient } from './client';

const poiApi = {
  /**
   * Interact with a POI
   * @param {string} characterId - Character UUID
   * @param {string} planetId - Planet ID
   * @param {object} poi - POI object
   * @param {string} interactionType - Optional interaction type override
   * @returns {Promise} API response
   */
  interact: async (characterId, planetId, poi, interactionType = null) => {
    return apiClient.post('/pois/interact', {
      characterId,
      planetId,
      poi,
      interactionType
    });
  },

  /**
   * Get POI interactions for character on planet
   * @param {string} characterId - Character UUID
   * @param {string} planetId - Planet ID
   * @returns {Promise} API response
   */
  getInteractions: async (characterId, planetId) => {
    return apiClient.get(`/pois/${characterId}/${planetId}`);
  },

  /**
   * Get POI state
   * @param {string} characterId - Character UUID
   * @param {string} planetId - Planet ID
   * @param {string} poiId - POI ID
   * @returns {Promise} API response
   */
  getState: async (characterId, planetId, poiId) => {
    return apiClient.get(`/pois/${characterId}/${planetId}/${poiId}/state`);
  },

  /**
   * Update POI after combat
   * @param {string} characterId - Character UUID
   * @param {string} planetId - Planet ID
   * @param {string} poiId - POI ID
   * @param {boolean} combatWon - Whether combat was won
   * @returns {Promise} API response
   */
  updateAfterCombat: async (characterId, planetId, poiId, combatWon) => {
    return apiClient.post('/pois/update-combat', {
      characterId,
      planetId,
      poiId,
      combatWon
    });
  }
};

export default poiApi;

