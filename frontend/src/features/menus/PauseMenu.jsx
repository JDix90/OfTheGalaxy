/**
 * Pause Menu
 * In-game pause menu with navigation options
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../../state/characterSlice';
import InventoryView from '../inventory/InventoryView';
import QuestLog from '../quests/QuestLog';
import CharacterSheet from './CharacterSheet';
import SettingsMenu from './SettingsMenu';
import SaveLoadView from '../save/SaveLoadView';
import './PauseMenu.css';

export default function PauseMenu({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { currentCharacter } = useCharacterStore();
  const [activeTab, setActiveTab] = useState('menu');

  // Handle ESC key to close menu
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (activeTab === 'menu') {
          onClose();
        } else {
          setActiveTab('menu');
        }
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, activeTab, onClose]);

  if (!isOpen) return null;

  const handleResume = () => {
    onClose();
  };

  const handleQuit = () => {
    if (window.confirm('Are you sure you want to quit to the main menu?')) {
      navigate('/');
    }
  };

  return (
    <div className="pause-menu-overlay" onClick={activeTab === 'menu' ? onClose : undefined}>
      <div className="pause-menu" onClick={(e) => e.stopPropagation()}>
        {activeTab === 'menu' && (
          <div className="pause-menu-content">
            <div className="pause-menu-header">
              <h2>Game Menu</h2>
              <button className="close-button" onClick={onClose}>×</button>
            </div>
            <div className="pause-menu-buttons">
              <button onClick={handleResume} className="menu-button resume">
                Resume
              </button>
              <button onClick={() => setActiveTab('inventory')} className="menu-button">
                <span className="menu-icon">🎒</span>
                Inventory
              </button>
              <button onClick={() => setActiveTab('quests')} className="menu-button">
                <span className="menu-icon">📜</span>
                Quests
              </button>
              <button onClick={() => setActiveTab('character')} className="menu-button">
                <span className="menu-icon">👤</span>
                Character
              </button>
              <button onClick={() => setActiveTab('map')} className="menu-button">
                <span className="menu-icon">🗺️</span>
                Map
              </button>
              <button onClick={() => setActiveTab('save')} className="menu-button">
                <span className="menu-icon">💾</span>
                Save Game
              </button>
              <button onClick={() => setActiveTab('load')} className="menu-button">
                <span className="menu-icon">📂</span>
                Load Game
              </button>
              <button onClick={() => setActiveTab('settings')} className="menu-button">
                <span className="menu-icon">⚙️</span>
                Settings
              </button>
              <button onClick={handleQuit} className="menu-button quit">
                Quit to Main Menu
              </button>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="pause-menu-content fullscreen">
            <div className="pause-menu-header">
              <button className="back-button" onClick={() => setActiveTab('menu')}>← Back</button>
              <h2>Inventory</h2>
              <button className="close-button" onClick={onClose}>×</button>
            </div>
            <div className="pause-menu-body">
              <InventoryView />
            </div>
          </div>
        )}

        {activeTab === 'quests' && (
          <div className="pause-menu-content fullscreen">
            <div className="pause-menu-header">
              <button className="back-button" onClick={() => setActiveTab('menu')}>← Back</button>
              <h2>Quest Log</h2>
              <button className="close-button" onClick={onClose}>×</button>
            </div>
            <div className="pause-menu-body">
              <QuestLog />
            </div>
          </div>
        )}

        {activeTab === 'character' && (
          <div className="pause-menu-content fullscreen">
            <div className="pause-menu-header">
              <button className="back-button" onClick={() => setActiveTab('menu')}>← Back</button>
              <h2>Character Sheet</h2>
              <button className="close-button" onClick={onClose}>×</button>
            </div>
            <div className="pause-menu-body">
              <CharacterSheet />
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="pause-menu-content">
            <div className="pause-menu-header">
              <button className="back-button" onClick={() => setActiveTab('menu')}>← Back</button>
              <h2>Map</h2>
              <button className="close-button" onClick={onClose}>×</button>
            </div>
            <div className="pause-menu-body">
              <button 
                className="menu-button"
                onClick={() => {
                  onClose();
                  navigate('/game/galaxy');
                }}
              >
                Open Galaxy Map
              </button>
            </div>
          </div>
        )}

        {activeTab === 'save' && (
          <div className="pause-menu-content">
            <div className="pause-menu-header">
              <button className="back-button" onClick={() => setActiveTab('menu')}>← Back</button>
              <h2>Save Game</h2>
              <button className="close-button" onClick={onClose}>×</button>
            </div>
            <div className="pause-menu-body">
              <SaveLoadView mode="save" onClose={onClose} />
            </div>
          </div>
        )}

        {activeTab === 'load' && (
          <div className="pause-menu-content">
            <div className="pause-menu-header">
              <button className="back-button" onClick={() => setActiveTab('menu')}>← Back</button>
              <h2>Load Game</h2>
              <button className="close-button" onClick={onClose}>×</button>
            </div>
            <div className="pause-menu-body">
              <SaveLoadView mode="load" onClose={onClose} />
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="pause-menu-content">
            <div className="pause-menu-header">
              <button className="back-button" onClick={() => setActiveTab('menu')}>← Back</button>
              <h2>Settings</h2>
              <button className="close-button" onClick={onClose}>×</button>
            </div>
            <div className="pause-menu-body">
              <SettingsMenu />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


