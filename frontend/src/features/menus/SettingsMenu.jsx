/**
 * Settings Menu
 * Game settings and preferences
 */

import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../state/settingsSlice';
import './SettingsMenu.css';

export default function SettingsMenu() {
  const { settings, updateSetting, resetSettings } = useSettingsStore();
  const [hasChanges, setHasChanges] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);

  // Sync local settings with store when store changes
  useEffect(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings]);

  const handleSettingChange = (category, key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    setHasChanges(true);
    // Apply immediately for visual feedback
    updateSetting(category, key, value);
  };

  const handleSave = () => {
    // Settings are already saved via updateSetting, just mark as saved
    setHasChanges(false);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
      resetSettings();
      setHasChanges(false);
    }
  };

  return (
    <div className="settings-menu">
      <div className="settings-section">
        <h3>Graphics</h3>
        <div className="setting-item">
          <label>Quality</label>
          <select 
            value={localSettings.graphics.quality}
            onChange={(e) => handleSettingChange('graphics', 'quality', e.target.value)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="ultra">Ultra</option>
          </select>
        </div>
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={localSettings.graphics.vsync}
              onChange={(e) => handleSettingChange('graphics', 'vsync', e.target.checked)}
            />
            VSync
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>Audio</h3>
        <div className="setting-item">
          <label>Master Volume: {localSettings.audio.master}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={localSettings.audio.master}
            onChange={(e) => handleSettingChange('audio', 'master', parseInt(e.target.value))}
          />
        </div>
        <div className="setting-item">
          <label>Music Volume: {localSettings.audio.music}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={localSettings.audio.music}
            onChange={(e) => handleSettingChange('audio', 'music', parseInt(e.target.value))}
          />
        </div>
        <div className="setting-item">
          <label>SFX Volume: {localSettings.audio.sfx}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={localSettings.audio.sfx}
            onChange={(e) => handleSettingChange('audio', 'sfx', parseInt(e.target.value))}
          />
        </div>
        <div className="setting-item">
          <label>Dialogue Volume: {localSettings.audio.dialogue}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={localSettings.audio.dialogue}
            onChange={(e) => handleSettingChange('audio', 'dialogue', parseInt(e.target.value))}
          />
        </div>
      </div>

      <div className="settings-section">
        <h3>Gameplay</h3>
        <div className="setting-item">
          <label>Difficulty</label>
          <select 
            value={localSettings.gameplay.difficulty}
            onChange={(e) => handleSettingChange('gameplay', 'difficulty', e.target.value)}
          >
            <option value="easy">Easy</option>
            <option value="normal">Normal</option>
            <option value="hard">Hard</option>
            <option value="very_hard">Very Hard</option>
          </select>
        </div>
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={localSettings.gameplay.autoSave}
              onChange={(e) => handleSettingChange('gameplay', 'autoSave', e.target.checked)}
            />
            Auto-Save
          </label>
        </div>
        {localSettings.gameplay.autoSave && (
          <div className="setting-item">
            <label>Auto-Save Interval (minutes): {localSettings.gameplay.autoSaveInterval}</label>
            <input
              type="range"
              min="1"
              max="30"
              value={localSettings.gameplay.autoSaveInterval}
              onChange={(e) => handleSettingChange('gameplay', 'autoSaveInterval', parseInt(e.target.value))}
            />
          </div>
        )}
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={localSettings.gameplay.tooltips}
              onChange={(e) => handleSettingChange('gameplay', 'tooltips', e.target.checked)}
            />
            Show Tooltips
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>Interface</h3>
        <div className="setting-item">
          <label>HUD Opacity: {localSettings.interface.hudOpacity}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={localSettings.interface.hudOpacity}
            onChange={(e) => handleSettingChange('interface', 'hudOpacity', parseInt(e.target.value))}
          />
        </div>
        <div className="setting-item">
          <label>Font Size</label>
          <select 
            value={localSettings.interface.fontSize}
            onChange={(e) => handleSettingChange('interface', 'fontSize', e.target.value)}
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
      </div>

      <div className="settings-actions">
        <button 
          className="save-settings-button"
          onClick={handleSave}
          disabled={!hasChanges}
        >
          {hasChanges ? 'Save Settings' : 'Settings Saved'}
        </button>
        <button 
          className="reset-settings-button"
          onClick={handleReset}
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}

