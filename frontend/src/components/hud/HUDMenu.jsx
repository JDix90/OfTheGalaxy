/**
 * HUD Menu Component
 * Consolidated menu for quick access to game features
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../../state/characterSlice';
import { addTutorialTarget, TUTORIAL_TARGETS } from '../../services/tutorialTargetRegistry';
import { tutorialEventBus, TUTORIAL_EVENTS } from '../../services/tutorialEventBus';
import './HUDMenu.css';

export default function HUDMenu({ onOpenInventory }) {
  const navigate = useNavigate();
  const { currentCharacter } = useCharacterStore();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const inventoryButtonRef = useRef(null);
  const questLogButtonRef = useRef(null);
  const galaxyMapButtonRef = useRef(null);

  const handleInventory = useCallback(() => {
    if (onOpenInventory) {
      onOpenInventory();
    }
    if (currentCharacter) {
      tutorialEventBus.emit(TUTORIAL_EVENTS.UI_OPENED_INVENTORY, {
        characterId: currentCharacter.id
      });
    }
    setIsOpen(false);
  }, [onOpenInventory, currentCharacter]);

  const handleQuests = useCallback(() => {
    if (currentCharacter) {
      tutorialEventBus.emit(TUTORIAL_EVENTS.UI_OPENED_QUESTLOG, {
        characterId: currentCharacter.id
      });
    }
    navigate('/game/quests');
    setIsOpen(false);
  }, [navigate, currentCharacter]);

  const handleFactions = useCallback(() => {
    if (currentCharacter) {
      tutorialEventBus.emit(TUTORIAL_EVENTS.UI_OPENED_FACTIONS, {
        characterId: currentCharacter.id
      });
    }
    navigate('/game/factions');
    setIsOpen(false);
  }, [navigate, currentCharacter]);

  const handleExploration = useCallback(() => {
    navigate('/game/exploration');
    setIsOpen(false);
  }, [navigate]);

  const handleGalaxy = useCallback(() => {
    if (currentCharacter) {
      tutorialEventBus.emit(TUTORIAL_EVENTS.UI_OPENED_GALAXYMAP, {
        characterId: currentCharacter.id
      });
    }
    navigate('/game/galaxy');
    setIsOpen(false);
  }, [navigate, currentCharacter]);

  const menuItems = useMemo(() => [
    {
      id: 'inventory',
      label: 'Inventory',
      icon: '📦',
      shortcut: 'I',
      action: handleInventory
    },
    {
      id: 'quests',
      label: 'Quests',
      icon: '📜',
      shortcut: 'J',
      action: handleQuests
    },
    {
      id: 'factions',
      label: 'Factions',
      icon: '⚔️',
      shortcut: 'F',
      action: handleFactions
    },
    {
      id: 'exploration',
      label: 'Exploration',
      icon: '🗺️',
      shortcut: null, // Removed E key shortcut - use navigation link instead
      action: handleExploration
    },
    {
      id: 'galaxy',
      label: 'Galaxy Map',
      icon: '🌌',
      shortcut: 'G',
      action: handleGalaxy
    }
  ], [handleInventory, handleQuests, handleFactions, handleExploration, handleGalaxy]);

  // Add tutorial targets to menu buttons
  useEffect(() => {
    if (inventoryButtonRef.current) {
      addTutorialTarget(inventoryButtonRef.current, TUTORIAL_TARGETS.HUD_INVENTORY_BUTTON);
    }
    if (questLogButtonRef.current) {
      addTutorialTarget(questLogButtonRef.current, TUTORIAL_TARGETS.HUD_QUEST_LOG_BUTTON);
    }
    if (galaxyMapButtonRef.current) {
      addTutorialTarget(galaxyMapButtonRef.current, TUTORIAL_TARGETS.HUD_GALAXY_MAP_BUTTON);
    }
  }, [isOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Only handle if not typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Don't handle E key here - it's used for door interaction in SubMapView
      // This allows the door interaction handler to have priority
      if (e.key === 'e' || e.key === 'E') {
        return;
      }

      // Check for menu shortcuts (excluding E which is handled elsewhere)
      const item = menuItems.find(m => m.shortcut && m.shortcut.toLowerCase() === e.key.toLowerCase());
      if (item) {
        e.preventDefault();
        item.action();
        return;
      }

      // M key to toggle menu
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [menuItems]);

  return (
    <div className="hud-menu-container" ref={menuRef}>
      <button
        className="hud-menu-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Open Menu (M)"
      >
        <span className="menu-icon">☰</span>
      </button>

      {isOpen && (
        <div className="hud-menu-dropdown">
          {menuItems.map(item => {
            let buttonRef = null;
            if (item.id === 'inventory') buttonRef = inventoryButtonRef;
            else if (item.id === 'quests') buttonRef = questLogButtonRef;
            else if (item.id === 'galaxy') buttonRef = galaxyMapButtonRef;
            
            return (
              <button
                key={item.id}
                ref={buttonRef}
                className="hud-menu-item"
                onClick={item.action}
                title={`${item.label} (${item.shortcut})`}
              >
                <span className="menu-item-icon">{item.icon}</span>
                <span className="menu-item-label">{item.label}</span>
                <span className="menu-item-shortcut">{item.shortcut}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

