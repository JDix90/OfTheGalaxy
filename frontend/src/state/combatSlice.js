/**
 * Combat State Slice
 * Zustand store for combat state management
 */

import { create } from 'zustand';
import { combatApi } from '../services/api/combatApi';
import { useCharacterStore } from './characterSlice';

export const useCombatStore = create((set, get) => ({
  // State
  currentEncounter: null,
  isLoading: false,
  error: null,
  actionHistory: [],

  // Actions
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  /**
   * Start a new combat encounter
   */
  startEncounter: async (characterId, encounterType = 'random', enemies = null) => {
    set({ isLoading: true, error: null });
    try {
      const response = await combatApi.startEncounter(characterId, encounterType, enemies);
      const encounter = response.data || response;

      set({
        currentEncounter: encounter,
        isLoading: false,
        actionHistory: []
      });

      return encounter;
    } catch (error) {
      set({
        error: error.message || 'Failed to start combat encounter',
        isLoading: false
      });
      throw error;
    }
  },

  /**
   * Get encounter state
   */
  getEncounter: async (encounterId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await combatApi.getEncounter(encounterId);
      const encounter = response.data || response;

      // Deep clone the encounter to ensure nested objects (like combatants) are new references
      const deepClonedEncounter = {
        ...encounter,
        combatants: encounter.combatants?.map(c => ({
          ...c,
          stats: { ...c.stats },
          statusEffects: c.statusEffects ? [...c.statusEffects] : []
        })) || [],
        turnOrder: encounter.turnOrder ? [...encounter.turnOrder] : []
      };

      set({
        currentEncounter: deepClonedEncounter,
        isLoading: false
      });

      return deepClonedEncounter;
    } catch (error) {
      set({
        error: error.message || 'Failed to get encounter state',
        isLoading: false
      });
      throw error;
    }
  },

  /**
   * Execute combat action
   */
  executeAction: async (encounterId, combatantId, actionType, targetId = null, params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await combatApi.executeAction(
        encounterId,
        combatantId,
        actionType,
        targetId,
        params
      );
      const result = response.data || response;

      // Update encounter state
      if (result.encounter) {
        set((state) => {
          const newHistory = [...state.actionHistory, result.action];
          // Add enemy actions to history if present
          if (result.action?.enemyActions && result.action.enemyActions.length > 0) {
            console.log('⚔️ Adding enemy actions to history:', result.action.enemyActions);
            newHistory.push(...result.action.enemyActions);
          }
          
          // Deep clone the encounter to ensure nested objects (like combatants) are new references
          const deepClonedEncounter = {
            ...result.encounter,
            combatants: result.encounter.combatants?.map(c => ({
              ...c,
              stats: { ...c.stats },
              statusEffects: c.statusEffects ? [...c.statusEffects] : []
            })) || [],
            turnOrder: result.encounter.turnOrder ? [...result.encounter.turnOrder] : []
          };
          
          const currentCombatantId = deepClonedEncounter.turnOrder?.[deepClonedEncounter.currentTurn];
          const currentCombatant = deepClonedEncounter.combatants?.find(c => c.id === currentCombatantId);
          
          console.log('⚔️ Updated encounter state:', {
            currentTurn: deepClonedEncounter.currentTurn,
            turnOrder: deepClonedEncounter.turnOrder,
            currentCombatantId,
            currentCombatantType: currentCombatant?.type,
            currentCombatantName: currentCombatant?.name,
            combatantsHealth: deepClonedEncounter.combatants?.map(c => ({ name: c.name, health: c.stats.health }))
          });
          
          // Force a new object reference to ensure React detects the change
          return {
            currentEncounter: deepClonedEncounter,
            actionHistory: newHistory,
            isLoading: false
          };
        });

        // If game over, update character stats
        if (result.gameOver && result.status === 'won') {
          const { currentCharacter, setCurrentCharacter } = useCharacterStore.getState();
          if (currentCharacter) {
            // Reload character to get updated stats - use dynamic import
            try {
              const { characterApi } = await import('../services/api/characterApi');
              const charResponse = await characterApi.getById(currentCharacter.id);
              const updatedCharacter = charResponse.data || charResponse;
              setCurrentCharacter(updatedCharacter);
            } catch (err) {
              console.error('Failed to reload character after combat:', err);
            }
          }
        }
      } else {
        set({ isLoading: false });
      }

      return result;
    } catch (error) {
      set({
        error: error.message || 'Failed to execute action',
        isLoading: false
      });
      throw error;
    }
  },

  /**
   * Attempt to flee
   */
  flee: async (encounterId, combatantId) => {
    return get().executeAction(encounterId, combatantId, 'flee');
  },

  /**
   * Process enemy turn (auto-process if it's an enemy's turn)
   */
  processTurn: async (encounterId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await combatApi.processTurn(encounterId);
      const result = response.data || response;

      // Update encounter state if processed
      if (result.encounter) {
        set((state) => {
          const newHistory = [...state.actionHistory];
          // Add enemy actions to history if present
          if (result.enemyActions && result.enemyActions.length > 0) {
            console.log('⚔️ Adding enemy actions from processTurn:', result.enemyActions);
            newHistory.push(...result.enemyActions);
          }

          return {
            currentEncounter: { ...result.encounter },
            actionHistory: newHistory,
            isLoading: false
          };
        });
      } else {
        set({ isLoading: false });
      }

      return result;
    } catch (error) {
      set({
        error: error.message || 'Failed to process turn',
        isLoading: false
      });
      throw error;
    }
  },

  /**
   * Get active encounter for character
   */
  getActiveEncounter: async (characterId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await combatApi.getActiveEncounter(characterId);
      const encounter = response.data || response;

      set({
        currentEncounter: encounter,
        isLoading: false
      });

      return encounter;
    } catch (error) {
      set({
        error: error.message || 'Failed to get active encounter',
        isLoading: false
      });
      return null;
    }
  },

  /**
   * Clear current encounter
   */
  clearEncounter: () => set({
    currentEncounter: null,
    actionHistory: []
  }),

  // Reset store
  reset: () => set({
    currentEncounter: null,
    isLoading: false,
    error: null,
    actionHistory: []
  })
}));

