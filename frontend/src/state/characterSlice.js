/**
 * Character State Slice
 * Zustand store for character state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CharacterManager } from '../core/character/CharacterManager';
import { characterApi } from '../services/api/characterApi';
import { tutorialEventBus, TUTORIAL_EVENTS } from '../services/tutorialEventBus';

export const useCharacterStore = create(
  persist(
    (set, get) => ({
      // State
      currentCharacter: null,
      characters: [],
      isLoading: false,
      error: null,

      // Actions
      setCurrentCharacter: (character) => {
        const oldCharacter = get().currentCharacter;
        // Handle both CharacterManager instances and raw character data
        const oldLevel = oldCharacter?.level || (oldCharacter?.character?.level) || 0;
        
        const characterManager = character 
          ? (character instanceof CharacterManager ? character : new CharacterManager(character))
          : null;
        
        // Get level from characterManager or raw character data
        const newLevel = characterManager?.level || character?.level || 0;
        
        // Check for level up
        if (oldLevel > 0 && newLevel > oldLevel) {
          // Character leveled up
          const characterId = characterManager?.id || character?.id;
          const skillPoints = characterManager?.skillPoints || character?.skillPoints || 0;
          const attributePoints = characterManager?.attributePoints || character?.attributePoints || 0;
          
          tutorialEventBus.emit(TUTORIAL_EVENTS.LEVEL_UP, {
            characterId,
            oldLevel,
            newLevel,
            skillPoints,
            attributePoints,
            isFirstLevelUpOnPlanet: oldLevel === 1, // Assume first level up if going from level 1
            timestamp: new Date().toISOString()
          });
          
          // Check if skill points are available
          if (skillPoints > 0) {
            tutorialEventBus.emit(TUTORIAL_EVENTS.SKILL_POINTS_AVAILABLE, {
              characterId,
              skillPoints,
              timestamp: new Date().toISOString()
            });
          }
          
          // Check if attribute points are available
          if (attributePoints > 0) {
            tutorialEventBus.emit(TUTORIAL_EVENTS.ATTRIBUTE_POINTS_AVAILABLE, {
              characterId,
              attributePoints,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        set({ currentCharacter: characterManager });
      },

      setCharacters: (characters) => set({ characters }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      // API Actions
      createCharacter: async (characterData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await characterApi.create(characterData);
          const character = new CharacterManager(response.data);
          
          set((state) => ({
            currentCharacter: character,
            characters: [...state.characters, response.data],
            isLoading: false
          }));
          
          return character;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      loadCharacter: async (characterId) => {
        set({ isLoading: true, error: null });
        try {
          const oldCharacter = get().currentCharacter;
          const oldLevel = oldCharacter?.level || 0;
          
          const response = await characterApi.getById(characterId);
          const character = new CharacterManager(response.data);
          
          const newLevel = character.level || 0;
          
          // Check for level up
          if (oldLevel > 0 && newLevel > oldLevel) {
            // Character leveled up
            const skillPoints = character.skillPoints || 0;
            const attributePoints = character.attributePoints || 0;
            
            tutorialEventBus.emit(TUTORIAL_EVENTS.LEVEL_UP, {
              characterId: characterId,
              oldLevel,
              newLevel,
              skillPoints,
              attributePoints,
              isFirstLevelUpOnPlanet: oldLevel === 1,
              timestamp: new Date().toISOString()
            });
            
            // Check if skill points are available
            if (skillPoints > 0) {
              tutorialEventBus.emit(TUTORIAL_EVENTS.SKILL_POINTS_AVAILABLE, {
                characterId: characterId,
                skillPoints,
                timestamp: new Date().toISOString()
              });
            }
            
            // Check if attribute points are available
            if (attributePoints > 0) {
              tutorialEventBus.emit(TUTORIAL_EVENTS.ATTRIBUTE_POINTS_AVAILABLE, {
                characterId: characterId,
                attributePoints,
                timestamp: new Date().toISOString()
              });
            }
          }
          
          set({ currentCharacter: character, isLoading: false });
          return character;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      loadCharacters: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await characterApi.getAll();
          set({ characters: response.data, isLoading: false });
          return response.data;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      addXP: async (amount, source = null) => {
        const { currentCharacter } = get();
        if (!currentCharacter) return;

        set({ isLoading: true, error: null });
        try {
          const oldLevel = currentCharacter.level || 0;
          
          const response = await characterApi.addXP(currentCharacter.id, amount, source);
          const updatedCharacter = new CharacterManager(response.data.character);
          
          const newLevel = updatedCharacter.level || 0;
          
          // Check for level up
          if (newLevel > oldLevel) {
            // Character leveled up
            const skillPoints = updatedCharacter.skillPoints || 0;
            const attributePoints = updatedCharacter.attributePoints || 0;
            
            tutorialEventBus.emit(TUTORIAL_EVENTS.LEVEL_UP, {
              characterId: currentCharacter.id,
              oldLevel,
              newLevel,
              skillPoints,
              attributePoints,
              isFirstLevelUpOnPlanet: oldLevel === 1,
              timestamp: new Date().toISOString()
            });
            
            // Check if skill points are available
            if (skillPoints > 0) {
              tutorialEventBus.emit(TUTORIAL_EVENTS.SKILL_POINTS_AVAILABLE, {
                characterId: currentCharacter.id,
                skillPoints,
                timestamp: new Date().toISOString()
              });
            }
            
            // Check if attribute points are available
            if (attributePoints > 0) {
              tutorialEventBus.emit(TUTORIAL_EVENTS.ATTRIBUTE_POINTS_AVAILABLE, {
                characterId: currentCharacter.id,
                attributePoints,
                timestamp: new Date().toISOString()
              });
            }
          }
          
          set({ currentCharacter: updatedCharacter, isLoading: false });
          return response.data;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      allocateSkillPoint: async (tree, skillId) => {
        const { currentCharacter } = get();
        if (!currentCharacter) return;

        set({ isLoading: true, error: null });
        try {
          const response = await characterApi.allocateSkill(currentCharacter.id, tree, skillId);
          const updatedCharacter = new CharacterManager(response.data);
          
          set({ currentCharacter: updatedCharacter, isLoading: false });
          return updatedCharacter;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      allocateAttributePoint: async (attribute) => {
        const { currentCharacter } = get();
        if (!currentCharacter) return;

        set({ isLoading: true, error: null });
        try {
          const response = await characterApi.allocateAttribute(currentCharacter.id, attribute);
          const updatedCharacter = new CharacterManager(response.data);
          
          set({ currentCharacter: updatedCharacter, isLoading: false });
          return updatedCharacter;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      updateLocation: async (planet, location) => {
        const { currentCharacter } = get();
        if (!currentCharacter) return;

        try {
          const response = await characterApi.updateLocation(currentCharacter.id, planet, location);
          const updatedCharacter = new CharacterManager(response.data);
          
          set({ currentCharacter: updatedCharacter });
          return updatedCharacter;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      updateVitals: async (health = null, stamina = null) => {
        const { currentCharacter } = get();
        if (!currentCharacter) return;

        try {
          const response = await characterApi.updateVitals(currentCharacter.id, health, stamina);
          const updatedCharacter = new CharacterManager(response.data);
          
          set({ currentCharacter: updatedCharacter });
          return updatedCharacter;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      rest: async () => {
        const { currentCharacter } = get();
        if (!currentCharacter) return;

        set({ isLoading: true, error: null });
        try {
          const response = await characterApi.rest(currentCharacter.id);
          const updatedCharacter = new CharacterManager(response.data);
          
          set({ currentCharacter: updatedCharacter, isLoading: false });
          return updatedCharacter;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      deleteCharacter: async (characterId) => {
        set({ isLoading: true, error: null });
        try {
          await characterApi.delete(characterId);
          
          set((state) => ({
            characters: state.characters.filter(c => c.id !== characterId),
            currentCharacter: state.currentCharacter?.id === characterId ? null : state.currentCharacter,
            isLoading: false
          }));
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // Local state updates (optimistic)
      updateCharacterLocal: (updates) => {
        const { currentCharacter } = get();
        if (!currentCharacter) return;

        const updated = new CharacterManager({
          ...currentCharacter.toJSON(),
          ...updates
        });
        
        set({ currentCharacter: updated });
      },

      // Reset store
      reset: () => set({
        currentCharacter: null,
        characters: [],
        isLoading: false,
        error: null
      })
    }),
    {
      name: 'character-storage',
      partialize: (state) => ({
        // Store character data as plain objects for persistence
        // Use toJSON() if available (CharacterManager instance), otherwise use as-is (already plain object)
        currentCharacter: state.currentCharacter 
          ? (typeof state.currentCharacter.toJSON === 'function' 
              ? state.currentCharacter.toJSON() 
              : state.currentCharacter)
          : null,
        characters: state.characters
      }),
      onRehydrateStorage: () => (state) => {
        // Convert persisted plain objects back to CharacterManager instances
        if (state?.currentCharacter && !(state.currentCharacter instanceof CharacterManager)) {
          state.currentCharacter = new CharacterManager(state.currentCharacter);
        }
      }
    }
  )
);
