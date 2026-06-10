/**
 * Save API Service
 * API calls for save/load management
 */

import { apiClient } from './client';

export const saveApi = {
  /**
   * Get all save slots
   */
  getSaveSlots: async () => {
    return await apiClient.get('/saves');
  },

  /**
   * Create or update a save slot
   */
  createSave: async (characterId, slotNumber, saveName = null) => {
    return await apiClient.post(`/saves/${slotNumber}`, {
      characterId,
      saveName
    });
  },

  /**
   * Load a save slot (returns the snapshot for preview; does not change game state)
   */
  loadSave: async (slotNumber) => {
    return await apiClient.get(`/saves/${slotNumber}/load`);
  },

  /**
   * Restore a save slot: applies the snapshot back to the live game state.
   * Returns { characterId, character, savedAt, ... }.
   */
  restoreSave: async (slotNumber) => {
    return await apiClient.post(`/saves/${slotNumber}/restore`);
  },

  /**
   * Delete a save slot
   */
  deleteSave: async (slotNumber) => {
    return await apiClient.delete(`/saves/${slotNumber}`);
  }
};


