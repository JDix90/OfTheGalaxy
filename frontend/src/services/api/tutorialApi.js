/**
 * Tutorial API Service
 * Frontend API calls for tutorial operations
 */

import { apiClient } from './client';

export const tutorialApi = {
  /**
   * Get tutorial state for a character
   * @param {string} characterId - Character ID
   * @returns {Promise} API response
   */
  getState: async (characterId) => {
    return apiClient.get(`/tutorial/state/${characterId}`);
  },

  /**
   * Update tutorial state
   * @param {string} characterId - Character ID
   * @param {Object} updates - State updates
   * @returns {Promise} API response
   */
  updateState: async (characterId, updates) => {
    return apiClient.post(`/tutorial/state/${characterId}`, updates);
  },

  /**
   * Complete a tutorial step
   * @param {string} characterId - Character ID
   * @param {string} stepId - Step ID
   * @param {Object} stepData - Step data
   * @returns {Promise} API response
   */
  completeStep: async (characterId, stepId, stepData = {}) => {
    return apiClient.post(`/tutorial/step/${characterId}`, {
      stepId,
      stepData
    });
  },

  /**
   * Start tutorial
   * @param {string} characterId - Character ID
   * @returns {Promise} API response
   */
  start: async (characterId) => {
    return apiClient.post(`/tutorial/start/${characterId}`);
  },

  /**
   * Complete tutorial
   * @param {string} characterId - Character ID
   * @returns {Promise} API response
   */
  complete: async (characterId) => {
    return apiClient.post(`/tutorial/complete/${characterId}`);
  },

  /**
   * Skip tutorial
   * @param {string} characterId - Character ID
   * @returns {Promise} API response
   */
  skip: async (characterId) => {
    return apiClient.post(`/tutorial/skip/${characterId}`);
  },

  /**
   * Assign tutorial quest
   * @param {string} characterId - Character ID
   * @returns {Promise} API response
   */
  assignQuest: async (characterId) => {
    return apiClient.post(`/tutorial/assign-quest/${characterId}`);
  },

  /**
   * Get tutorial NPC
   * @param {string} characterId - Character ID
   * @returns {Promise} API response
   */
  getTutorialNPC: async (characterId) => {
    return apiClient.get(`/tutorial/npc/${characterId}`);
  },

  /**
   * Ensure tutorial NPC exists on submap
   * @param {string} characterId - Character ID
   * @param {string} subMapId - Submap ID
   * @returns {Promise} API response
   */
  ensureNPCOnSubmap: async (characterId, subMapId) => {
    return apiClient.post(`/tutorial/ensure-npc/${characterId}`, { subMapId });
  },

  /**
   * Get tutorial config for character
   * @param {string} characterId - Character ID
   * @returns {Promise} API response
   */
  getTutorialConfig: async (characterId) => {
    return apiClient.get(`/tutorial/config/${characterId}`);
  }
};

export default tutorialApi;

