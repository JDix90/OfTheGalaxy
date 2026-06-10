/**
 * Settings State Slice
 * Zustand store for game settings with localStorage persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const defaultSettings = {
  graphics: {
    quality: 'high',
    vsync: true
  },
  audio: {
    master: 100,
    music: 80,
    sfx: 80,
    dialogue: 100
  },
  controls: {
    mouseSensitivity: 50
  },
  gameplay: {
    difficulty: 'normal',
    autoSave: true,
    autoSaveInterval: 5,
    tooltips: true
  },
  interface: {
    hudOpacity: 100,
    fontSize: 'medium'
  }
};

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      settings: defaultSettings,

      // Update a single setting
      updateSetting: (category, key, value) => {
        set((state) => ({
          settings: {
            ...state.settings,
            [category]: {
              ...state.settings[category],
              [key]: value
            }
          }
        }));
        
        // Apply immediate effects for certain settings
        const newSettings = {
          ...get().settings,
          [category]: {
            ...get().settings[category],
            [key]: value
          }
        };
        applySettingsEffects(newSettings);
      },

      // Update multiple settings at once
      updateSettings: (updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ...updates
          }
        }));
        applySettingsEffects(get().settings);
      },

      // Reset to defaults
      resetSettings: () => {
        set({ settings: defaultSettings });
        applySettingsEffects(defaultSettings);
      },

      // Get a specific setting value
      getSetting: (category, key) => {
        return get().settings[category]?.[key];
      }
    }),
    {
      name: 'game-settings',
      partialize: (state) => ({ settings: state.settings })
    }
  )
);

/**
 * Apply immediate visual/functional effects of settings
 */
function applySettingsEffects(settings) {
  // Apply HUD opacity
  const hudOpacity = settings.interface.hudOpacity / 100;
  document.documentElement.style.setProperty('--hud-opacity', hudOpacity);

  // Apply font size
  const fontSizeMap = {
    small: '0.875rem',
    medium: '1rem',
    large: '1.125rem'
  };
  const baseFontSize = fontSizeMap[settings.interface.fontSize] || '1rem';
  document.documentElement.style.setProperty('--base-font-size', baseFontSize);

  // Apply tooltips visibility (stored in data attribute for CSS)
  document.documentElement.setAttribute(
    'data-tooltips-enabled',
    settings.gameplay.tooltips ? 'true' : 'false'
  );

  // Apply audio volumes (when audio system is implemented)
  // This is a placeholder for future audio implementation
  if (window.gameAudio) {
    window.gameAudio.setMasterVolume(settings.audio.master / 100);
    window.gameAudio.setMusicVolume(settings.audio.music / 100);
    window.gameAudio.setSFXVolume(settings.audio.sfx / 100);
    window.gameAudio.setDialogueVolume(settings.audio.dialogue / 100);
  }
}

// Initialize settings effects on load
if (typeof window !== 'undefined') {
  const store = useSettingsStore.getState();
  applySettingsEffects(store.settings);
}


