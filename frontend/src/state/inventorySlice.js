/**
 * Inventory State Slice
 * Zustand store for inventory state management
 */

import { create } from 'zustand';
import { inventoryApi } from '../services/api/inventoryApi';
import { notify } from '../components/hud/NotificationCenter';

export const useInventoryStore = create((set, get) => ({
  // State
  items: [],
  equipped: [],
  setBonuses: {},
  loading: false,
  error: null,

  // Actions
  setItems: (items) => set({ items }),
  setEquipped: (equipped) => set({ equipped }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // API Actions
  loadInventory: async (characterId, rarity = null) => {
    set({ loading: true, error: null });
    try {
      const response = await inventoryApi.getInventory(characterId, rarity);
      if (response.success) {
        set({
          items: response.data.items || [],
          equipped: response.data.equipped || [],
          setBonuses: response.data.setBonuses || {},
          loading: false
        });
      } else {
        set({ error: 'Failed to load inventory', loading: false });
      }
    } catch (error) {
      set({ error: error.message || 'Failed to load inventory', loading: false });
      throw error;
    }
  },

  addItem: async (characterId, itemId, quantity = 1, acquiredFrom = null) => {
    try {
      const response = await inventoryApi.addItem(characterId, itemId, quantity, acquiredFrom);
      if (response.success) {
        // Reload inventory to get updated state
        await get().loadInventory(characterId);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to add item');
      }
    } catch (error) {
      set({ error: error.message || 'Failed to add item' });
      throw error;
    }
  },

  removeItem: async (characterId, itemId, quantity = 1) => {
    try {
      const response = await inventoryApi.removeItem(characterId, itemId, quantity);
      if (response.success) {
        // Reload inventory to get updated state
        await get().loadInventory(characterId);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to remove item');
      }
    } catch (error) {
      set({ error: error.message || 'Failed to remove item' });
      throw error;
    }
  },

  equipItem: async (characterId, itemId, slot) => {
    try {
      const response = await inventoryApi.equipItem(characterId, itemId, slot);
      if (response.success) {
        // Check if ability was unlocked
        if (response.data?.abilityUnlocked) {
          const abilityInfo = response.data.abilityUnlocked;
          const abilityName = abilityInfo.ability.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          notify(
            `✨ Ability Unlocked: ${abilityName}`,
            'success',
            6000
          );
          
          // Reload character to get updated abilities
          const { useCharacterStore } = await import('./characterSlice');
          const characterStore = useCharacterStore.getState();
          if (characterStore.currentCharacter?.id === characterId && characterStore.loadCharacter) {
            try {
              await characterStore.loadCharacter(characterId);
            } catch (err) {
              console.warn('[Inventory] Failed to reload character after ability unlock:', err);
            }
          }
        }
        
        // Reload inventory to get updated state
        await get().loadInventory(characterId);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to equip item');
      }
    } catch (error) {
      set({ error: error.message || 'Failed to equip item' });
      throw error;
    }
  },

  unequipItem: async (characterId, itemId) => {
    try {
      const response = await inventoryApi.unequipItem(characterId, itemId);
      if (response.success) {
        // Reload inventory to get updated state
        await get().loadInventory(characterId);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to unequip item');
      }
    } catch (error) {
      set({ error: error.message || 'Failed to unequip item' });
      throw error;
    }
  },

  useItem: async (characterId, itemId) => {
    try {
      console.log('[Inventory] Using item:', { characterId, itemId });
      const response = await inventoryApi.useItem(characterId, itemId);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to use item');
      }
      
      const result = response.data;
      console.log('[Inventory] Item used successfully:', result);
      
      // Emit tutorial event for item usage
      const { tutorialEventBus, TUTORIAL_EVENTS } = await import('../services/tutorialEventBus');
      tutorialEventBus.emit(TUTORIAL_EVENTS.ITEM_USED, {
        itemId,
        itemName: result?.itemName || itemId,
        itemType: result?.type || 'consumable',
        healthRestored: result?.healthRestored || 0,
        staminaRestored: result?.staminaRestored || 0,
        characterId,
        timestamp: new Date().toISOString()
      });
      
      // Reload character FIRST to get updated health/stamina before showing notification
      // Add a small delay to ensure backend has saved the changes
      const { useCharacterStore } = await import('./characterSlice');
      const characterStore = useCharacterStore.getState();
      if (characterStore.currentCharacter?.id === characterId && characterStore.loadCharacter) {
        try {
          const oldHealth = characterStore.currentCharacter?.currentHealth || 0;
          const oldStamina = characterStore.currentCharacter?.currentStamina || 0;
          
          console.log('[Inventory] Reloading character to update health/stamina...', {
            oldHealth,
            oldStamina,
            expectedHealthRestore: result?.healthRestored,
            expectedStaminaRestore: result?.staminaRestored
          });
          
          // Small delay to ensure backend has saved
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const updatedCharacter = await characterStore.loadCharacter(characterId);
          const newHealth = updatedCharacter?.currentHealth || 0;
          const newStamina = updatedCharacter?.currentStamina || 0;
          
          console.log('[Inventory] Character reloaded:', {
            oldHealth,
            newHealth,
            healthChange: newHealth - oldHealth,
            expectedHealthRestore: result?.healthRestored,
            oldStamina,
            newStamina,
            staminaChange: newStamina - oldStamina,
            expectedStaminaRestore: result?.staminaRestored
          });
          
          // Verify health was actually updated
          if (result.healthRestored > 0 && newHealth <= oldHealth) {
            console.warn('[Inventory] ⚠️ Health was not updated! Expected:', result.healthRestored, 'but health stayed at', oldHealth);
          }
          if (result.staminaRestored > 0 && newStamina <= oldStamina) {
            console.warn('[Inventory] ⚠️ Stamina was not updated! Expected:', result.staminaRestored, 'but stamina stayed at', oldStamina);
          }
        } catch (err) {
          console.error('[Inventory] Failed to reload character after using item:', err);
          // Still show notification even if reload fails
        }
      }
      
      // Reload inventory to get updated state (item quantity decreased)
      await get().loadInventory(characterId);
      
      // Show notification with detailed feedback
      if (result.healthRestored > 0) {
        const message = `Used ${result.itemName}: Restored ${result.healthRestored} HP${result.fullHeal ? ' (Full Heal!)' : ''}`;
        console.log('[Inventory] Showing notification:', message);
        notify(
          message,
          'success',
          4000 // Longer duration for better visibility
        );
      } else if (result.staminaRestored > 0) {
        const message = `Used ${result.itemName}: Restored ${result.staminaRestored} Stamina`;
        console.log('[Inventory] Showing notification:', message);
        notify(
          message,
          'success',
          4000
        );
      } else {
        // Item was used but didn't restore anything (might be a different type of consumable)
        notify(
          `Used ${result.itemName}`,
          'info',
          3000
        );
      }
      
      return result;
    } catch (error) {
      console.error('[Inventory] Error using item:', error);
      set({ error: error.message || 'Failed to use item' });
      notify(
        error.message || 'Failed to use item',
        'error',
        4000
      );
      throw error;
    }
  }
}));


