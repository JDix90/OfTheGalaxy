/**
 * HUD Container
 * Main heads-up display component
 */

import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../../state/characterSlice';
import { useQuestStore } from '../../state/questSlice';
import { addTutorialTarget, TUTORIAL_TARGETS } from '../../services/tutorialTargetRegistry';
import { tutorialEventBus, TUTORIAL_EVENTS } from '../../services/tutorialEventBus';
import healthRegenApi from '../../services/api/healthRegenApi';
import StatsBar from './StatsBar';
import Minimap from './Minimap';
import QuestTracker from './QuestTracker';
import NotificationCenter from './NotificationCenter';
import HUDMenu from './HUDMenu';
import InventoryOverlay from '../inventory/InventoryOverlay';
import QuestLogOverlay from '../quest/QuestLogOverlay';
import CharacterSheetOverlay from '../../features/character/CharacterSheetOverlay';
import './HUD.css';

export default function HUD() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentCharacter } = useCharacterStore();
  const { activeQuests, loadActiveQuests } = useQuestStore();
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [questLogOpen, setQuestLogOpen] = useState(false);
  const [characterSheetOpen, setCharacterSheetOpen] = useState(false);
  const inventoryButtonRef = useRef(null);
  const questLogButtonRef = useRef(null);
  const galaxyMapButtonRef = useRef(null);
  const questTrackerRef = useRef(null);

  // Load active quests when character changes
  useEffect(() => {
    if (currentCharacter?.id) {
      loadActiveQuests(currentCharacter.id).catch(err => {
        console.error('Failed to load active quests for HUD:', err);
      });
    }
  }, [currentCharacter?.id, loadActiveQuests]);

  // Add tutorial targets to HUD elements
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
    if (questTrackerRef.current) {
      addTutorialTarget(questTrackerRef.current, TUTORIAL_TARGETS.HUD_QUEST_TRACKER);
    }
  }, []);

  // Listen for custom event to open inventory overlay (from keyboard shortcuts)
  useEffect(() => {
    const handleOpenInventory = () => {
      setInventoryOpen(true);
    };

    window.addEventListener('hud:openInventory', handleOpenInventory);
    return () => {
      window.removeEventListener('hud:openInventory', handleOpenInventory);
    };
  }, []);

  // Listen for custom event to close inventory overlay (from tutorial)
  useEffect(() => {
    const handleCloseInventory = () => {
      setInventoryOpen(false);
    };

    window.addEventListener('hud:closeInventory', handleCloseInventory);
    return () => {
      window.removeEventListener('hud:closeInventory', handleCloseInventory);
    };
  }, []);

  // Listen for custom event to open quest log overlay (from keyboard shortcuts)
  useEffect(() => {
    const handleOpenQuestLog = () => {
      setQuestLogOpen(true);
    };

    window.addEventListener('hud:openQuestLog', handleOpenQuestLog);
    return () => {
      window.removeEventListener('hud:openQuestLog', handleOpenQuestLog);
    };
  }, []);

  // Emit tutorial events for UI opens
  useEffect(() => {
    if (inventoryOpen && currentCharacter) {
      tutorialEventBus.emit(TUTORIAL_EVENTS.UI_OPENED_INVENTORY, {
        characterId: currentCharacter.id
      });
    }
  }, [inventoryOpen, currentCharacter]);

  useEffect(() => {
    if (questLogOpen && currentCharacter) {
      tutorialEventBus.emit(TUTORIAL_EVENTS.UI_OPENED_QUESTLOG, {
        characterId: currentCharacter.id
      });
    }
  }, [questLogOpen, currentCharacter]);

  // Listen for custom event to open character sheet overlay
  useEffect(() => {
    const handleOpenCharacterSheet = () => {
      setCharacterSheetOpen(true);
    };

    window.addEventListener('hud:openCharacterSheet', handleOpenCharacterSheet);
    return () => {
      window.removeEventListener('hud:openCharacterSheet', handleOpenCharacterSheet);
    };
  }, []);


  // Health regeneration interval
  const regenIntervalRef = useRef(null);
  const { loadCharacter } = useCharacterStore();

  useEffect(() => {
    if (!currentCharacter?.id) {
      // Clear interval if no character
      if (regenIntervalRef.current) {
        clearInterval(regenIntervalRef.current);
        regenIntervalRef.current = null;
      }
      return;
    }

    // Only regenerate if character is not at full health
    if (currentCharacter.currentHealth >= currentCharacter.maxHealth) {
      return;
    }

    // Set up regeneration interval (every 30 seconds)
    regenIntervalRef.current = setInterval(async () => {
      try {
        const result = await healthRegenApi.processRegeneration(currentCharacter.id);
        
        if (result.success && result.data?.regenerated) {
          // Reload character to update health
          await loadCharacter(currentCharacter.id);
          
          // Optional: Show subtle notification (only if significant regen)
          if (result.data.amount >= 5) {
            // Only show if regenerated at least 5 HP
            // This prevents spam from tiny regen amounts
          }
        }
      } catch (error) {
        // Silently fail - regeneration is a background process
        console.debug('Health regeneration check failed:', error);
      }
    }, 30000); // 30 seconds

    return () => {
      if (regenIntervalRef.current) {
        clearInterval(regenIntervalRef.current);
        regenIntervalRef.current = null;
      }
    };
  }, [currentCharacter?.id, currentCharacter?.currentHealth, currentCharacter?.maxHealth, loadCharacter]);

  if (!currentCharacter) return null;

  // Determine context for HUD positioning
  const isGameWorld = location.pathname === '/game';
  const isSubMap = location.pathname.includes('/submap') || location.pathname.includes('/location/');

  return (
    <div className={`hud ${isGameWorld ? 'hud-gameworld' : isSubMap ? 'hud-submap' : 'hud-other'}`}>
      <StatsBar 
        character={currentCharacter} 
        onOpenInventory={() => setInventoryOpen(true)}
        onOpenCharacterSheet={() => setCharacterSheetOpen(true)}
      />
      <Minimap character={currentCharacter} />
      <QuestTracker quests={activeQuests} />
      <NotificationCenter />
      <HUDMenu onOpenInventory={() => setInventoryOpen(true)} />
      <InventoryOverlay
        isOpen={inventoryOpen}
        onClose={() => setInventoryOpen(false)}
      />
      <QuestLogOverlay
        isOpen={questLogOpen}
        onClose={() => setQuestLogOpen(false)}
      />
      <CharacterSheetOverlay
        isOpen={characterSheetOpen}
        onClose={() => setCharacterSheetOpen(false)}
      />
    </div>
  );
}

