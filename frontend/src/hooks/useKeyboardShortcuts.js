/**
 * Keyboard Shortcuts Hook
 * Handles global keyboard shortcuts for the game
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts({ 
  onPauseMenuToggle, 
  onInventoryOpen, 
  onQuestLogOpen,
  onCharacterSheetOpen,
  onMapOpen
}) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // ESC - Toggle pause menu
      if (e.key === 'Escape' && onPauseMenuToggle) {
        e.preventDefault();
        onPauseMenuToggle();
      }

      // I - Open inventory
      if (e.key === 'i' || e.key === 'I') {
        if (onInventoryOpen) {
          e.preventDefault();
          onInventoryOpen();
        } else {
          navigate('/game/inventory');
        }
      }

      // J or Q - Open quest log
      if ((e.key === 'j' || e.key === 'J' || e.key === 'q' || e.key === 'Q') && !e.ctrlKey && !e.metaKey) {
        if (onQuestLogOpen) {
          e.preventDefault();
          onQuestLogOpen();
        } else {
          navigate('/game/quests');
        }
      }

      // C - Open character sheet
      if (e.key === 'c' || e.key === 'C') {
        if (onCharacterSheetOpen) {
          e.preventDefault();
          onCharacterSheetOpen();
        }
      }

      // M - Open map
      if (e.key === 'm' || e.key === 'M') {
        if (onMapOpen) {
          e.preventDefault();
          onMapOpen();
        } else {
          navigate('/game/galaxy');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, onPauseMenuToggle, onInventoryOpen, onQuestLogOpen, onCharacterSheetOpen, onMapOpen]);
}


