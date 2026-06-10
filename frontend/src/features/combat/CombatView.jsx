/**
 * Combat View Component
 * Main combat interface for turn-based combat
 */

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCombatStore } from '../../state/combatSlice';
import { useCharacterStore } from '../../state/characterSlice';
import CombatantDisplay from './CombatantDisplay';
import ActionMenu from './ActionMenu';
import TurnOrder from './TurnOrder';
import CombatLog from './CombatLog';
import VictoryScreen from './VictoryScreen';
import PauseMenu from '../menus/PauseMenu';
import TutorialOverlay from '../../components/tutorial/TutorialOverlay';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import './CombatView.css';

export default function CombatView() {
  const { encounterId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentCharacter } = useCharacterStore();
  const {
    currentEncounter,
    isLoading,
    error,
    actionHistory,
    startEncounter,
    getEncounter,
    executeAction,
    clearEncounter,
    processTurn
  } = useCombatStore();

  const [selectedTarget, setSelectedTarget] = useState(null);
  const [showVictoryScreen, setShowVictoryScreen] = useState(false);
  const [victoryData, setVictoryData] = useState(null);
  const [isPauseMenuOpen, setIsPauseMenuOpen] = useState(false);
  const pollingRef = useRef(null);
  const isPollingRef = useRef(false);
  
  // Store return location when entering combat
  const returnLocationRef = useRef(location.state?.returnLocation || null);

  // ESC key handler for pause menu
  useKeyboardShortcuts({
    onPauseMenuToggle: () => setIsPauseMenuOpen(prev => !prev),
    onInventoryOpen: () => navigate('/game/inventory'),
    onQuestLogOpen: () => navigate('/game/quests'),
    onMapOpen: () => navigate('/game/galaxy')
  });

  // Initialize encounter
  useEffect(() => {
    if (encounterId) {
      // Load existing encounter
      loadEncounter();
    } else if (location.state?.startCombat) {
      // Start new encounter from location state
      const { encounterType, enemies } = location.state;
      startNewEncounter(encounterType, enemies);
    } else if (currentCharacter) {
      // Check for active encounter
      checkActiveEncounter();
    }
  }, [encounterId, currentCharacter]);

  // Cleanup polling on unmount or encounter change
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        isPollingRef.current = false;
      }
    };
  }, [encounterId]);

  // Automatically process enemy turns when it's an enemy's turn
  useEffect(() => {
    if (!currentEncounter || !encounterId || isLoading) return;

    const playerCombatant = currentEncounter.combatants?.find(c => c.type === 'player');
    const currentCombatantId = currentEncounter.turnOrder?.[currentEncounter.currentTurn];
    const currentCombatant = currentEncounter.combatants?.find(c => c.id === currentCombatantId);
    const isEnemyTurn = currentCombatant?.type === 'enemy';
    const isCompanionTurn = currentCombatant?.type === 'companion';
    const isPlayerTurn = currentCombatantId === playerCombatant?.id;

    // Only process if it's an enemy's or companion's turn and not the player's turn
    if ((isEnemyTurn || isCompanionTurn) && !isPlayerTurn && currentEncounter.status === 'active') {
      const turnType = isCompanionTurn ? 'companion' : 'enemy';
      console.log(`🤖 Auto-processing ${turnType} turn for:`, currentCombatant?.name);
      
      // Use a small delay to avoid race conditions
      const timeoutId = setTimeout(async () => {
        try {
          await processTurn(encounterId);
          // Refresh encounter state after processing
          await getEncounter(encounterId);
        } catch (error) {
          console.error('Failed to process enemy turn:', error);
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [currentEncounter, encounterId, isLoading, processTurn, getEncounter]);

  // Auto-select first enemy when it's player's turn
  useEffect(() => {
    if (!currentEncounter || isLoading) return;

    const playerCombatant = currentEncounter.combatants?.find(c => c.type === 'player');
    const currentCombatantId = currentEncounter.turnOrder?.[currentEncounter.currentTurn];
    const isPlayerTurn = currentCombatantId === playerCombatant?.id;
    const enemyCombatants = currentEncounter.combatants?.filter(c => c.type === 'enemy' && c.stats.health > 0) || [];

    // Auto-select first enemy when it's player's turn and no target is selected
    if (isPlayerTurn && enemyCombatants.length > 0 && !selectedTarget) {
      const firstEnemy = enemyCombatants[0];
      if (firstEnemy && firstEnemy.id) {
        console.log('🎯 Auto-selecting enemy target:', firstEnemy.name);
        setSelectedTarget(firstEnemy.id);
      }
    }
  }, [currentEncounter, isLoading, selectedTarget]);

  const loadEncounter = async () => {
    try {
      await getEncounter(encounterId);
    } catch (error) {
      console.error('Failed to load encounter:', error);
    }
  };

  const checkActiveEncounter = async () => {
    try {
      const { getActiveEncounter } = useCombatStore.getState();
      const encounter = await getActiveEncounter(currentCharacter.id);
      if (encounter) {
        // Navigate to combat view
        navigate(`/game/combat/${encounter.id}`, { replace: true });
      }
    } catch (error) {
      console.error('Failed to check active encounter:', error);
    }
  };

  const startNewEncounter = async (encounterType = 'random', enemies = null) => {
    try {
      const encounter = await startEncounter(
        currentCharacter.id,
        encounterType,
        enemies
      );
      if (encounter) {
        navigate(`/game/combat/${encounter.id}`, { replace: true });
      }
    } catch (error) {
      console.error('Failed to start encounter:', error);
    }
  };

  const handleAction = async (actionType, targetId = null, params = {}) => {
    if (!currentEncounter || !currentCharacter) return;

    try {
      const playerCombatant = currentEncounter.combatants.find(c => c.type === 'player');
      if (!playerCombatant) return;

      console.log('🎮 Executing action:', actionType, 'target:', targetId);

      const result = await executeAction(
        currentEncounter.id,
        playerCombatant.id,
        actionType,
        targetId,
        params
      );

      console.log('🎮 Action result:', result);

      // Check if player successfully fled
      if (result.action?.type === 'flee' && result.action?.success === true) {
        console.log('✅ Player successfully fled, returning to previous location');
        handleFleeSuccess();
        return;
      }
      
      // Check if combat is over
      if (result.gameOver) {
        setVictoryData({
          status: result.status,
          encounter: result.encounter
        });
        setShowVictoryScreen(true);
      } else {
        // Manually refresh encounter state to ensure UI updates
        // This is important because enemy turns are processed on the backend
        // and we need to ensure the frontend reflects the updated state
        setTimeout(async () => {
          try {
            await getEncounter(encounterId);
            console.log('🔄 Refreshed encounter state after action');
          } catch (error) {
            console.error('Failed to refresh encounter:', error);
          }
        }, 100);
      }

      setSelectedTarget(null);
    } catch (error) {
      console.error('Failed to execute action:', error);
    }
  };

  const handleExit = () => {
    clearEncounter();
    navigate('/game');
  };

  const handleFleeSuccess = () => {
    clearEncounter();
    
    // Get return location from ref or location state
    const returnLocation = returnLocationRef.current || location.state?.returnLocation;
    
    console.log('🏃 HandleFleeSuccess - Return location:', returnLocation);
    
    if (returnLocation) {
      // If we have a submap, return to submap
      if (returnLocation.subMapId) {
        // Use the location route format: /game/location/:planetId/:parentLocationId/:parentLocationType/:type
        // Encode the parentLocationId to handle special characters
        const encodedParentLocationId = encodeURIComponent(returnLocation.parentLocationId || '');
        const path = `/game/location/${returnLocation.planetId}/${encodedParentLocationId}/${returnLocation.parentLocationType}/${returnLocation.type}`;
        console.log('📍 Returning to submap after flee:', path);
        navigate(path, {
          state: {
            returnFromCombat: true, // Mark that we're returning from combat (flee)
            subMapId: returnLocation.subMapId, // Pass subMapId in state
            playerLocation: returnLocation.location, // Preserve player's last position in submap
            planetId: returnLocation.planetId,
            parentLocationId: returnLocation.parentLocationId,
            parentLocationType: returnLocation.parentLocationType,
            type: returnLocation.type
          }
        });
      } else if (returnLocation.planetId) {
        // Otherwise return to planet map
        const { planetId, location: playerLocation } = returnLocation;
        console.log('📍 Returning to planet map after flee:', planetId, 'at location:', playerLocation);
        
        navigate(`/game/planet/${planetId}`, {
          state: {
            returnFromCombat: true,
            playerLocation: playerLocation // Preserve player's last position
          }
        });
      } else {
        // Fallback: try to get planet from character's current location
        const { currentCharacter } = useCharacterStore.getState();
        if (currentCharacter?.currentPlanet) {
          console.log('📍 Returning to character\'s current planet:', currentCharacter.currentPlanet);
          navigate(`/game/planet/${currentCharacter.currentPlanet}`, {
            state: {
              returnFromCombat: true,
              playerLocation: currentCharacter.currentLocation
            }
          });
        } else {
          // Final fallback: go to game world
          navigate('/game');
        }
      }
    } else {
      // Fallback: try to get planet from character's current location
      const { currentCharacter } = useCharacterStore.getState();
      if (currentCharacter?.currentPlanet) {
        console.log('📍 Returning to character\'s current planet:', currentCharacter.currentPlanet);
        navigate(`/game/planet/${currentCharacter.currentPlanet}`, {
          state: {
            returnFromCombat: true,
            playerLocation: currentCharacter.currentLocation
          }
        });
      } else {
        // Final fallback: go to game world
        navigate('/game');
      }
    }
  };

  if (isLoading && !currentEncounter) {
    return (
      <div className="combat-view loading">
        <div className="loading-spinner">Loading combat...</div>
      </div>
    );
  }

  if (error && !currentEncounter) {
    return (
      <div className="combat-view error">
        <div className="error-message">{error}</div>
        <button onClick={handleExit} className="btn-primary">Exit</button>
      </div>
    );
  }

  if (!currentEncounter) {
    return (
      <div className="combat-view no-encounter">
        <div className="no-encounter-message">No active combat encounter</div>
        <button onClick={handleExit} className="btn-primary">Exit</button>
      </div>
    );
  }

  if (showVictoryScreen && victoryData) {
    return (
      <VictoryScreen
        status={victoryData.status}
        encounter={victoryData.encounter}
        onClose={null}
        returnLocation={returnLocationRef.current || location.state?.returnLocation}
      />
    );
  }

  const playerCombatant = currentEncounter?.combatants?.find(c => c.type === 'player');
  const companionCombatants = currentEncounter?.combatants?.filter(c => c.type === 'companion') || [];
  const enemyCombatants = currentEncounter?.combatants?.filter(c => c.type === 'enemy') || [];
  const currentCombatantId = currentEncounter?.turnOrder?.[currentEncounter?.currentTurn];
  const isPlayerTurn = currentCombatantId === playerCombatant?.id;
  const currentCombatant = currentEncounter?.combatants?.find(c => c.id === currentCombatantId);
  const isEnemyTurn = currentCombatant?.type === 'enemy';
  const isCompanionTurn = currentCombatant?.type === 'companion';

  // Debug logging
  if (currentEncounter) {
    console.log('🎯 Combat View State:', {
      currentTurn: currentEncounter.currentTurn,
      currentCombatantId,
      currentCombatantType: currentCombatant?.type,
      currentCombatantName: currentCombatant?.name,
      isPlayerTurn,
      isEnemyTurn
    });
  }

  return (
    <div className="combat-view">
      <PauseMenu isOpen={isPauseMenuOpen} onClose={() => setIsPauseMenuOpen(false)} />
      <div className="combat-header">
        <h1>Combat</h1>
        <button onClick={handleExit} className="btn-secondary">Exit Combat</button>
      </div>

      <div className="combat-main">
        {/* Turn Order */}
        <TurnOrder
          turnOrder={currentEncounter.turnOrder}
          combatants={currentEncounter.combatants}
          currentTurn={currentEncounter.currentTurn}
        />

        {/* Combatants Display */}
        <div className="combatants-container">
          {/* Player */}
          {playerCombatant && (
            <CombatantDisplay
              combatant={playerCombatant}
              isPlayer={true}
              isCurrentTurn={isPlayerTurn}
              isSelected={selectedTarget === playerCombatant.id}
              onSelect={() => setSelectedTarget(playerCombatant.id)}
            />
          )}

          {/* Companions */}
          {companionCombatants.map((companion) => (
            <CombatantDisplay
              key={companion.id}
              combatant={companion}
              isPlayer={false}
              isCompanion={true}
              isCurrentTurn={currentCombatantId === companion.id}
              isSelected={selectedTarget === companion.id}
              onSelect={() => setSelectedTarget(companion.id)}
            />
          ))}

          {/* Enemies */}
          <div className="enemies-container">
            {enemyCombatants.map((enemy) => (
              <CombatantDisplay
                key={enemy.id}
                combatant={enemy}
                isPlayer={false}
                isCurrentTurn={currentCombatantId === enemy.id}
                isSelected={selectedTarget === enemy.id}
                onSelect={() => setSelectedTarget(enemy.id)}
              />
            ))}
          </div>
        </div>

        {/* Action Menu */}
        {isPlayerTurn && playerCombatant && (
          <ActionMenu
            combatant={playerCombatant}
            targets={enemyCombatants}
            selectedTarget={selectedTarget}
            onSelectTarget={setSelectedTarget}
            onAction={handleAction}
            isLoading={isLoading}
          />
        )}

        {/* Companion Turn Indicator */}
        {isCompanionTurn && (
          <div className="companion-turn-indicator">
            <p>{currentCombatant?.name} is taking their turn...</p>
          </div>
        )}

        {/* Enemy Turn Indicator */}
        {isEnemyTurn && (
          <div className="enemy-turn-indicator">
            <div className="enemy-turn-message">
              <span className="spinner">⚔️</span>
              <span>{currentCombatant?.name || 'Enemy'} is taking their turn...</span>
            </div>
          </div>
        )}

        {/* Combat Log */}
        <CombatLog
          encounter={currentEncounter}
          actionHistory={actionHistory}
        />
      </div>
      
      {/* Tutorial Overlay - displays tutorial steps during combat */}
      <TutorialOverlay />
    </div>
  );
}

