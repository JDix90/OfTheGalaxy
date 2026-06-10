/**
 * Faction State Slice
 * Zustand store for faction reputation management
 */

import { create } from 'zustand';
import { factionApi } from '../services/api/factionApi';
import { useCharacterStore } from './characterSlice';

export const useFactionStore = create((set, get) => ({
  // State
  reputations: [],
  isLoading: false,
  error: null,

  // Actions
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  /**
   * Load all faction reputations for current character
   */
  loadReputations: async (characterId, showAll = false) => {
    const characterIdToUse = characterId || useCharacterStore.getState().currentCharacter?.id;
    if (!characterIdToUse) {
      set({ error: 'No character selected' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      // Only show factions with non-zero reputation by default
      const response = await factionApi.getReputations(characterIdToUse, showAll);
      // API client interceptor already returns response.data, so we need response.data not response.data.data
      const reputations = response.data || [];
      
      // Filter out factions with 0 reputation unless showAll is true
      const filtered = showAll 
        ? reputations 
        : reputations.filter(r => r.reputation !== 0 || r.factionId);
      
      set({ 
        reputations: filtered,
        isLoading: false 
      });
      return filtered;
    } catch (error) {
      set({ 
        error: error.message || 'Failed to load faction reputations',
        isLoading: false 
      });
      throw error;
    }
  },

  /**
   * Get reputation for a specific faction
   */
  getReputation: async (characterId, factionId) => {
    const characterIdToUse = characterId || useCharacterStore.getState().currentCharacter?.id;
    if (!characterIdToUse) {
      set({ error: 'No character selected' });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await factionApi.getReputation(characterIdToUse, factionId);
      // API client interceptor already returns response.data
      const reputation = response.data;
      
      // Update in local state if exists
      set((state) => {
        const existingIndex = state.reputations.findIndex(
          r => r.factionId === factionId
        );
        if (existingIndex >= 0) {
          const updated = [...state.reputations];
          updated[existingIndex] = reputation;
          return { reputations: updated };
        } else {
          return { reputations: [...state.reputations, reputation] };
        }
      });
      
      set({ isLoading: false });
      return reputation;
    } catch (error) {
      set({ 
        error: error.message || 'Failed to load faction reputation',
        isLoading: false 
      });
      throw error;
    }
  },

  /**
   * Update faction reputation
   */
  updateReputation: async (characterId, factionId, amount) => {
    const characterIdToUse = characterId || useCharacterStore.getState().currentCharacter?.id;
    if (!characterIdToUse) {
      set({ error: 'No character selected' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await factionApi.updateReputation(characterIdToUse, factionId, amount);
      // API client interceptor already returns response.data
      const updatedReputation = response.data;
      
      // Update in local state
      set((state) => {
        const existingIndex = state.reputations.findIndex(
          r => r.factionId === factionId
        );
        if (existingIndex >= 0) {
          const updated = [...state.reputations];
          updated[existingIndex] = updatedReputation;
          return { reputations: updated };
        } else {
          return { reputations: [...state.reputations, updatedReputation] };
        }
      });
      
      set({ isLoading: false });
      return updatedReputation;
    } catch (error) {
      set({ 
        error: error.message || 'Failed to update faction reputation',
        isLoading: false 
      });
      throw error;
    }
  },

  /**
   * Get reputation for a faction from local state
   */
  getReputationLocal: (factionId) => {
    const reputation = get().reputations.find(r => r.factionId === factionId);
    return reputation || {
      reputation: 0,
      tier: 'neutral',
      factionId,
      factionName: factionId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      tierInfo: {
        min: 0,
        max: 100,
        color: '#6b7280',
        label: 'Neutral'
      }
    };
  },

  // Reset store
  reset: () => set({
    reputations: [],
    isLoading: false,
    error: null
  })
}));

