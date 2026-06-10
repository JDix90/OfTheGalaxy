/**
 * Discovery State Slice
 * Zustand store for discovery/exploration state management
 */

import { create } from 'zustand';
import { discoveryApi } from '../services/api/discoveryApi';
import { useCharacterStore } from './characterSlice';
import { notify } from '../components/hud/NotificationCenter';

export const useDiscoveryStore = create((set, get) => ({
  // State
  discoveries: [],
  stats: null,
  isLoading: false,
  error: null,

  // Actions
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  /**
   * Record a discovery
   */
  recordDiscovery: async (characterId, planetId, locationType, locationId, options = {}) => {
    const characterIdToUse = characterId || useCharacterStore.getState().currentCharacter?.id;
    if (!characterIdToUse) {
      set({ error: 'No character selected' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await discoveryApi.recordDiscovery(
        characterIdToUse,
        planetId,
        locationType,
        locationId,
        options
      );
      
      // API client interceptor returns response.data from axios
      // Backend returns: { success: true, data: { discovery, isNew, rewards, ... } }
      // Axios wraps it: { data: { success: true, data: { discovery, isNew, rewards, ... } } }
      // Interceptor returns: { success: true, data: { discovery, isNew, rewards, ... } }
      // So we need to access response.data to get the actual result object
      const result = response?.data || response;
      
      // Debug logging
      console.log('🔍 Discovery API response:', { 
        response, 
        result, 
        isNew: result?.isNew, 
        hasDiscovery: !!result?.discovery, 
        hasRewards: !!result?.rewards,
        rewards: result?.rewards
      });

      // Show notifications for new discoveries
      // Note: We suppress notifications for sub_map discoveries to avoid duplicates
      // when entering a location (city/POI/market) that was just discovered
      // Sub-maps are still tracked for completion stats, but don't show notifications
      const shouldShowNotification = result && result.isNew && result.discovery && locationType !== 'sub_map';
      
      if (result && result.isNew && result.discovery) {
        // Add to local state (always track, even if not showing notification)
        set((state) => ({
          discoveries: [result.discovery, ...state.discoveries]
        }));

        // Only show notifications for parent locations (not sub-maps)
        if (shouldShowNotification) {
          // Show discovery notification
          const locationName = result.discovery.locationName || 
            options.locationName || 
            locationId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          
          notify(
            `Discovered: ${locationName}`,
            'success',
            6000
          );

          // Show reward notifications if rewards were awarded
          if (result.rewards) {
            const rewardMessages = [];
            if (result.rewards.xp && result.rewards.xp > 0) {
              rewardMessages.push(`+${result.rewards.xp} XP`);
            }
            if (result.rewards.credits && result.rewards.credits > 0) {
              rewardMessages.push(`+${result.rewards.credits} credits`);
            }
            
            if (rewardMessages.length > 0) {
              setTimeout(() => {
                notify(
                  `Discovery Reward: ${rewardMessages.join(', ')}`,
                  'info',
                  5000
                );
              }, 500);
            }
          }
        }

        // Always update character store with new XP/credits (even for sub-maps, just silently)
        const { currentCharacter, setCurrentCharacter } = useCharacterStore.getState();
        if (currentCharacter && result.rewards) {
          const updatedCharacter = { ...currentCharacter };
          if (result.rewards.xp) {
            updatedCharacter.xp = (updatedCharacter.xp || 0) + result.rewards.xp;
          }
          if (result.rewards.credits) {
            updatedCharacter.credits = (updatedCharacter.credits || 0) + result.rewards.credits;
          }
          setCurrentCharacter(updatedCharacter);
        }

        // Log for debugging
        const locationName = result.discovery.locationName || 
          options.locationName || 
          locationId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        console.log('Discovery recorded:', {
          locationName,
          locationType,
          isNew: result.isNew,
          firstDiscovery: result.firstDiscovery,
          rewards: result.rewards,
          notificationShown: shouldShowNotification
        });
      } else if (!result.isNew) {
        // Already discovered - no notification needed
        console.log('Location already discovered:', locationId);
      }

      set({ isLoading: false });
      return result;
    } catch (error) {
      // Handle 409 Conflict (already exists) gracefully - this is expected in race conditions
      if (error.response?.status === 409 || error.message?.includes('already exists') || error.message?.includes('Conflict')) {
        // Discovery already exists, which is fine - just return null to indicate no new discovery
        set({ isLoading: false });
        return {
          discovery: null,
          isNew: false,
          rewards: null
        };
      }

      set({
        error: error.message || 'Failed to record discovery',
        isLoading: false
      });
      throw error;
    }
  },

  /**
   * Load all discoveries for a character
   */
  loadDiscoveries: async (characterId, filters = {}) => {
    const characterIdToUse = characterId || useCharacterStore.getState().currentCharacter?.id;
    if (!characterIdToUse) {
      set({ error: 'No character selected' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await discoveryApi.getDiscoveries(characterIdToUse, filters);
      const discoveries = response.data || response;

      set({
        discoveries: Array.isArray(discoveries) ? discoveries : [],
        isLoading: false
      });
      return discoveries;
    } catch (error) {
      set({
        error: error.message || 'Failed to load discoveries',
        isLoading: false
      });
      throw error;
    }
  },

  /**
   * Load discovery statistics
   */
  loadStats: async (characterId) => {
    const characterIdToUse = characterId || useCharacterStore.getState().currentCharacter?.id;
    if (!characterIdToUse) {
      set({ error: 'No character selected' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await discoveryApi.getStats(characterIdToUse);
      const stats = response.data || response;

      set({
        stats,
        isLoading: false
      });
      return stats;
    } catch (error) {
      set({
        error: error.message || 'Failed to load discovery stats',
        isLoading: false
      });
      throw error;
    }
  },

  /**
   * Get planet completion
   */
  getPlanetCompletion: async (characterId, planetId, totalLocations = null) => {
    const characterIdToUse = characterId || useCharacterStore.getState().currentCharacter?.id;
    if (!characterIdToUse) {
      set({ error: 'No character selected' });
      return null;
    }

    try {
      const response = await discoveryApi.getPlanetCompletion(characterIdToUse, planetId, totalLocations);
      return response.data || response;
    } catch (error) {
      console.error('Failed to get planet completion:', error);
      return null;
    }
  },

  /**
   * Check if location is discovered
   */
  checkDiscovery: async (characterId, planetId, locationId) => {
    const characterIdToUse = characterId || useCharacterStore.getState().currentCharacter?.id;
    if (!characterIdToUse) {
      return false;
    }

    try {
      const response = await discoveryApi.checkDiscovery(characterIdToUse, planetId, locationId);
      return response.data?.isDiscovered || false;
    } catch (error) {
      console.error('Failed to check discovery:', error);
      return false;
    }
  },

  /**
   * Get discovered locations for a planet
   */
  getPlanetLocations: async (characterId, planetId) => {
    const characterIdToUse = characterId || useCharacterStore.getState().currentCharacter?.id;
    if (!characterIdToUse) {
      return [];
    }

    try {
      const response = await discoveryApi.getPlanetLocations(characterIdToUse, planetId);
      return response.data || [];
    } catch (error) {
      console.error('Failed to get planet locations:', error);
      return [];
    }
  },

  // Reset store
  reset: () => set({
    discoveries: [],
    stats: null,
    isLoading: false,
    error: null
  })
}));

