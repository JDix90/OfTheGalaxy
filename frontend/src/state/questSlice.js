/**
 * Quest State Slice
 * Zustand store for quest state management
 */

import { create } from 'zustand';
import { questApi } from '../services/api/questApi';
import { notify } from '../components/hud/NotificationCenter';
import { tutorialEventBus, TUTORIAL_EVENTS } from '../services/tutorialEventBus';
import { gameEventBus, GAME_EVENTS } from '../services/gameEventBus';

export const useQuestStore = create((set, get) => ({
  // State
  availableQuests: [],
  activeQuests: [],
  completedQuests: [],
  currentQuest: null,
  isLoading: false,
  error: null,

  // Actions
  setAvailableQuests: (quests) => set({ availableQuests: quests }),
  
  setActiveQuests: (quests) => set({ activeQuests: quests }),
  
  setCompletedQuests: (quests) => set({ completedQuests: quests }),
  
  setCurrentQuest: (quest) => set({ currentQuest: quest }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),

  // API Actions
  loadAvailableQuests: async (characterId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await questApi.getAvailable(characterId);
      set({ availableQuests: response.data, isLoading: false });
      return response.data;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  loadActiveQuests: async (characterId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await questApi.getActive(characterId);
      // API client returns response.data, which is { success: true, data: [...] }
      const quests = response.data || response || [];
      set({ activeQuests: quests, isLoading: false });
      return quests;
    } catch (error) {
      console.error('Error loading active quests:', error);
      set({ error: error.message, isLoading: false, activeQuests: [] });
      throw error;
    }
  },

  loadCompletedQuests: async (characterId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await questApi.getCompleted(characterId);
      // API client returns response.data, which is { success: true, data: [...] }
      const quests = response.data || response || [];
      set({ completedQuests: quests, isLoading: false });
      return quests;
    } catch (error) {
      console.error('Error loading completed quests:', error);
      set({ error: error.message, isLoading: false, completedQuests: [] });
      throw error;
    }
  },

  loadQuest: async (questId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await questApi.getById(questId);
      set({ currentQuest: response.data, isLoading: false });
      return response.data;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  startQuest: async (characterId, questId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await questApi.start(characterId, questId);
      
      set((state) => ({
        activeQuests: [...state.activeQuests, response.data],
        availableQuests: state.availableQuests.filter(q => q.id !== questId),
        isLoading: false
      }));
      
      return response.data;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateObjective: async (characterId, questId, objectiveId, completed = true, progress = null) => {
    set({ isLoading: true, error: null });
    try {
      const response = await questApi.updateObjective(
        characterId,
        questId,
        objectiveId,
        completed,
        progress
      );
      
      // Check if quest was completed (updateObjective returns completion result if all objectives done)
      const result = response.data || response;
      
      // Emit quest objective completed event for tutorial
      const activeQuests = get().activeQuests;
      const questData = activeQuests.find(q => q.quest.id === questId);
      const isFirstObjective = questData && 
        Object.keys(questData.progress?.objectivesCompleted || {}).filter(
          (id) => id !== objectiveId && questData.progress.objectivesCompleted[id]
        ).length === 0;
      
      tutorialEventBus.emit(TUTORIAL_EVENTS.QUEST_OBJECTIVE_COMPLETED, {
        characterId,
        questId,
        objectiveId,
        isFirstObjective,
        location: 'planet_surface', // Could be more specific based on context
        timestamp: new Date().toISOString()
      });
      
      // Check if all objectives are complete (quest ready to turn in)
      if (result.quest && !result.rewards) {
        // All objectives complete but quest not yet turned in
        const allObjectivesComplete = result.quest.objectives?.every(
          obj => obj.id === objectiveId || 
          (questData?.progress?.objectivesCompleted?.[obj.id] === true)
        );
        
        if (allObjectivesComplete) {
          tutorialEventBus.emit(TUTORIAL_EVENTS.QUEST_READY_TO_TURN_IN, {
            characterId,
            questId,
            questTitle: result.quest.title,
            location: 'planet_surface',
            timestamp: new Date().toISOString()
          });
        }
      }
      
      if (result.quest && result.rewards) {
        // Quest was completed! Show notification
        const quest = result.quest;
        const rewards = result.rewards;
        
        // Show quest completion notification
        notify({
          type: 'success',
          title: 'Quest Completed!',
          message: `"${quest.title}" completed!`,
          duration: 8000
        });
        
        // Show reward notifications
        const rewardMessages = [];
        if (rewards.xp && rewards.xp > 0) {
          rewardMessages.push(`+${rewards.xp} XP`);
        }
        if (rewards.credits && rewards.credits > 0) {
          rewardMessages.push(`+${rewards.credits} credits`);
        }
        if (rewards.items && rewards.items.length > 0) {
          rewardMessages.push(`${rewards.items.length} item(s)`);
        }
        
        if (rewardMessages.length > 0) {
          setTimeout(() => {
            notify({
              type: 'info',
              title: 'Rewards',
              message: rewardMessages.join(', '),
              duration: 6000
            });
          }, 500);
        }

        // Surface faction standing consequences (rep toast + tier-up modal)
        if (Array.isArray(result.reputationChanges)) {
          result.reputationChanges.forEach((change) => {
            if (change && change.factionId && change.delta) {
              gameEventBus.emit(GAME_EVENTS.REP_CHANGED, change);
            }
          });
        }

        // Update state to move quest from active to completed
        set((state) => ({
          activeQuests: state.activeQuests.filter(q => q.quest.id !== questId),
          completedQuests: [...state.completedQuests, result],
          isLoading: false
        }));
        
        // Reload character to update XP/credits
        // Use dynamic import to avoid circular dependency
        import('../services/api/characterApi').then(({ characterApi }) => {
          characterApi.getById(characterId)
            .then(async (response) => {
              // Dynamic import (not require) — keeps the circular-dependency break
              // while staying valid in the browser ESM bundle.
              const { useCharacterStore } = await import('./characterSlice');
              const { setCurrentCharacter } = useCharacterStore.getState();
              const updated = response.data || response;
              if (setCurrentCharacter && updated) {
                setCurrentCharacter(updated);
              }
            })
            .catch(err => {
              console.warn('Failed to reload character after quest completion:', err);
            });
        }).catch(err => {
          console.warn('Failed to import characterApi:', err);
        });
      } else {
        // Just update the quest progress
        set((state) => ({
          activeQuests: state.activeQuests.map(q =>
            q.quest.id === questId ? result : q
          ),
          isLoading: false
        }));
      }
      
      return result;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  completeQuest: async (characterId, questId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await questApi.complete(characterId, questId);
      const result = response.data || response;
      
      // Show quest completion notification
      if (result.quest) {
        const quest = result.quest;
        const rewards = result.rewards || {};
        
        notify({
          type: 'success',
          title: 'Quest Completed!',
          message: `"${quest.title}" completed!`,
          duration: 8000
        });
        
        // Show reward notifications
        const rewardMessages = [];
        if (rewards.xp && rewards.xp > 0) {
          rewardMessages.push(`+${rewards.xp} XP`);
        }
        if (rewards.credits && rewards.credits > 0) {
          rewardMessages.push(`+${rewards.credits} credits`);
        }
        if (rewards.items && rewards.items.length > 0) {
          rewardMessages.push(`${rewards.items.length} item(s)`);
        }
        
        if (rewardMessages.length > 0) {
          setTimeout(() => {
            notify({
              type: 'info',
              title: 'Rewards',
              message: rewardMessages.join(', '),
              duration: 6000
            });
          }, 500);
        }

        // Surface faction standing consequences (rep toast + tier-up modal)
        if (Array.isArray(result.reputationChanges)) {
          result.reputationChanges.forEach((change) => {
            if (change && change.factionId && change.delta) {
              gameEventBus.emit(GAME_EVENTS.REP_CHANGED, change);
            }
          });
        }

        // Reload character to update XP/credits
        // Use dynamic import to avoid circular dependency
        import('../services/api/characterApi').then(({ characterApi }) => {
          characterApi.getById(characterId)
            .then(async (response) => {
              // Dynamic import (not require) — keeps the circular-dependency break
              // while staying valid in the browser ESM bundle.
              const { useCharacterStore } = await import('./characterSlice');
              const { setCurrentCharacter } = useCharacterStore.getState();
              const updated = response.data || response;
              if (setCurrentCharacter && updated) {
                setCurrentCharacter(updated);
              }
            })
            .catch(err => {
              console.warn('Failed to reload character after quest completion:', err);
            });
        }).catch(err => {
          console.warn('Failed to import characterApi:', err);
        });
      }
      
      set((state) => ({
        activeQuests: state.activeQuests.filter(q => q.quest.id !== questId),
        completedQuests: [...state.completedQuests, result],
        isLoading: false
      }));
      
      return result;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  abandonQuest: async (characterId, questId) => {
    set({ isLoading: true, error: null });
    try {
      await questApi.abandon(characterId, questId);
      
      set((state) => ({
        activeQuests: state.activeQuests.filter(q => q.quest.id !== questId),
        isLoading: false
      }));
      
      // Reload available quests
      get().loadAvailableQuests(characterId);
      
      // Emit event to refresh planet data (to remove abandoned quest POIs)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('quest:abandoned', {
          detail: { questId, characterId }
        }));
      }
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Utility functions
  getQuestById: (questId) => {
    const { availableQuests, activeQuests, completedQuests } = get();
    
    return (
      availableQuests.find(q => q.id === questId) ||
      activeQuests.find(q => q.quest.id === questId)?.quest ||
      completedQuests.find(q => q.quest.id === questId)?.quest ||
      null
    );
  },

  getActiveQuestProgress: (questId) => {
    const { activeQuests } = get();
    const questData = activeQuests.find(q => q.quest.id === questId);
    return questData?.progress || null;
  },

  isQuestActive: (questId) => {
    const { activeQuests } = get();
    return activeQuests.some(q => q.quest.id === questId);
  },

  isQuestCompleted: (questId) => {
    const { completedQuests } = get();
    return completedQuests.some(q => q.quest.id === questId);
  },

  getQuestsByFaction: (factionId) => {
    const { availableQuests, activeQuests, completedQuests } = get();
    
    return {
      available: availableQuests.filter(q => q.factionId === factionId),
      active: activeQuests.filter(q => q.quest.factionId === factionId),
      completed: completedQuests.filter(q => q.quest.factionId === factionId)
    };
  },

  // Reset store
  reset: () => set({
    availableQuests: [],
    activeQuests: [],
    completedQuests: [],
    currentQuest: null,
    isLoading: false,
    error: null
  })
}));
