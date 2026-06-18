/**
 * GameWorld Page
 * Main game interface
 */

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../state/characterSlice';
import { CharacterManager } from '../core/character/CharacterManager';
import HUD from '../components/hud/HUD';
import PauseMenu from '../features/menus/PauseMenu';
import CharacterSelector from '../components/CharacterSelector';
import TutorialOverlay from '../components/tutorial/TutorialOverlay';
import { useTutorial } from '../contexts/TutorialContext';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { formatDisplayName } from '../utils/formatName';
import './GameWorld.css';

export default function GameWorld() {
  const navigate = useNavigate();
  const { currentCharacter, setCurrentCharacter } = useCharacterStore();
  const { isActive, startTutorial } = useTutorial();
  const [isPauseMenuOpen, setIsPauseMenuOpen] = useState(false);
  const [isCharacterSelectorOpen, setIsCharacterSelectorOpen] = useState(false);
  const characterNameRef = useRef(null);
  
  // Track if we've already redirected to prevent redirect loops
  const redirectAttemptedRef = React.useRef(false);
  
  // DO NOT start tutorial on /game page
  // Tutorial should only start on the spaceport submap
  // If a new character lands on /game page, redirect them to spaceport submap ONCE
  React.useEffect(() => {
    const redirectToSpaceport = async () => {
      if (!currentCharacter) return;
      
      // Only redirect once per character
      if (redirectAttemptedRef.current) {
        return;
      }
      
      const isNewCharacter = currentCharacter.level === 1 && !currentCharacter.tutorialCompleted;
      
      if (isNewCharacter) {
        try {
          // Check tutorial state - if not started, redirect to spaceport
          const { tutorialApi } = await import('../services/api/tutorialApi');
          const response = await tutorialApi.getState(currentCharacter.id);
          
          const tutorialState = response?.success && response?.data ? response.data.state : 'not_started';
          
          // Only redirect if tutorial truly hasn't started AND we haven't redirected yet
          if (tutorialState === 'not_started') {
            redirectAttemptedRef.current = true; // Mark as attempted to prevent loops
            console.log('[GameWorld] New character on /game page - redirecting to spaceport submap for tutorial (one-time redirect)');
            
            const planetId = currentCharacter.currentPlanet;
            const { galaxyApi } = await import('../services/api/galaxyApi');
            const planetResponse = await galaxyApi.getPlanet(planetId);
            
            if (planetResponse && planetResponse.success && planetResponse.data) {
              const planet = planetResponse.data;
              let spaceportPOI = null;
              
              if (planet.mapData?.pointsOfInterest) {
                spaceportPOI = planet.mapData.pointsOfInterest.find(poi => poi.type === 'spaceport');
              }
              
              if (!spaceportPOI && planet.mapData?.spaceport) {
                spaceportPOI = {
                  name: `${planet.name} Spaceport`,
                  id: `spaceport_${planetId}`,
                  type: 'spaceport',
                  x: planet.mapData.spaceport.x,
                  y: planet.mapData.spaceport.y
                };
              }
              
              if (spaceportPOI) {
                const parentLocationId = spaceportPOI.id || spaceportPOI.name || `spaceport_${planetId}`;
                const encodedLocationId = encodeURIComponent(parentLocationId);
                navigate(`/game/location/${planetId}/${encodedLocationId}/poi/spaceport`, {
                  state: {
                    isNewCharacter: true,
                    showTutorial: true
                  }
                });
                return;
              }
            }
            
            console.warn('[GameWorld] Could not find spaceport, tutorial will start when player navigates to spaceport');
          } else {
            console.log('[GameWorld] Tutorial already in progress, state:', tutorialState);
            // Tutorial has started, allow player to stay on /game if they navigate here
            redirectAttemptedRef.current = true;
          }
        } catch (error) {
          console.error('[GameWorld] Failed to check tutorial status:', error);
          // On error, mark as attempted to prevent infinite loops
          redirectAttemptedRef.current = true;
        }
      } else {
        // Not a new character, allow them to stay on /game
        redirectAttemptedRef.current = true;
      }
    };
    
    redirectToSpaceport();
  }, [currentCharacter?.id, navigate]);
  
  // Reset redirect flag when character changes
  React.useEffect(() => {
    redirectAttemptedRef.current = false;
  }, [currentCharacter?.id]);

  useKeyboardShortcuts({
    onPauseMenuToggle: () => setIsPauseMenuOpen(prev => !prev),
    onInventoryOpen: () => window.location.href = '/game/inventory',
    onQuestLogOpen: () => window.location.href = '/game/quests',
    onMapOpen: () => window.location.href = '/game/galaxy'
  });

  if (!currentCharacter) {
    return null;
  }

  // Ensure currentCharacter is a CharacterManager instance
  // This handles cases where persist might not have rehydrated properly
  let character = currentCharacter;
  if (!(currentCharacter instanceof CharacterManager)) {
    character = new CharacterManager(currentCharacter);
    // Update the store to fix the instance
    setCurrentCharacter(character);
  }

  return (
    <div className="game-world">
      <HUD />
      <PauseMenu isOpen={isPauseMenuOpen} onClose={() => setIsPauseMenuOpen(false)} />
      <div className="game-header">
        <h1>Of the Galaxy</h1>
        <div className="character-summary">
          <div 
            ref={characterNameRef}
            className="character-name-wrapper"
            onClick={() => setIsCharacterSelectorOpen(true)}
            title="Click to switch character"
          >
            <span className="character-name">{character.name}</span>
            <span className="character-level">Level {character.level}</span>
          </div>
        </div>
      </div>
      
      <CharacterSelector
        isOpen={isCharacterSelectorOpen}
        onClose={() => setIsCharacterSelectorOpen(false)}
        triggerRef={characterNameRef}
      />

      <div className="game-content">
        <div className="game-main">
          <div className="welcome-message">
            <h2>Welcome to the Galaxy, {character.name}</h2>
            <p>
              You are currently on <strong>{character.currentPlanet ? formatDisplayName(character.currentPlanet) : 'an unknown world'}</strong>.
            </p>
            <p>
              This is your command hub. From here, you can:
            </p>
            <ul>
              <li>View and manage your quests</li>
              <li>Explore the galaxy map</li>
              <li>Interact with NPCs</li>
              <li>Manage your character and inventory</li>
            </ul>
          </div>

          <div className="quick-actions">
            <h3>Quick Actions</h3>
            <div className="action-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {character.currentPlanet && (
                <button className="action-card" onClick={() => navigate(`/game/planet/${character.currentPlanet}`)}>
                  <span className="action-icon">🌐</span>
                  <span className="action-label">Return to Surface</span>
                </button>
              )}

              <button className="action-card" onClick={() => window.location.href = '/game/quests'}>
                <span className="action-icon">📜</span>
                <span className="action-label">Quest Log</span>
              </button>

              <button className="action-card" onClick={() => window.location.href = '/game/galaxy'}>
                <span className="action-icon">🗺️</span>
                <span className="action-label">Galaxy Map</span>
              </button>

              <button className="action-card" onClick={() => window.location.href = '/game/npcs'}>
                <span className="action-icon">👥</span>
                <span className="action-label">NPCs</span>
              </button>

              <button className="action-card" onClick={() => window.location.href = '/game/inventory'}>
                <span className="action-icon">🎒</span>
                <span className="action-label">Inventory</span>
              </button>

              <button className="action-card" onClick={() => window.location.href = '/game/factions'}>
                <span className="action-icon">⚔️</span>
                <span className="action-label">Factions</span>
              </button>
            </div>
          </div>
        </div>

        <div className="game-sidebar">
          <div className="character-panel">
            <h3>Character</h3>
            <div className="character-vitals">
              <div className="vital">
                <span className="vital-label">Health</span>
                <div className="vital-bar">
                  <div 
                    className="vital-fill health" 
                    style={{ width: `${(character.currentHealth / character.maxHealth) * 100}%` }}
                  />
                </div>
                <span className="vital-value">{character.currentHealth}/{character.maxHealth}</span>
              </div>
              
              <div className="vital">
                <span className="vital-label">Stamina</span>
                <div className="vital-bar">
                  <div 
                    className="vital-fill stamina" 
                    style={{ width: `${(character.currentStamina / character.maxStamina) * 100}%` }}
                  />
                </div>
                <span className="vital-value">{character.currentStamina}/{character.maxStamina}</span>
              </div>

              <div className="vital">
                <span className="vital-label">XP</span>
                <div className="vital-bar">
                  <div 
                    className="vital-fill xp" 
                    style={{ width: `${Math.min(100, (character.xp / character.getXPForNextLevel()) * 100)}%` }}
                  />
                </div>
                <span className="vital-value">{character.xp || 0}/{character.getXPForNextLevel()}</span>
              </div>
            </div>

            <div className="character-stats">
              <h4>Attributes</h4>
              {Object.entries(character.stats).map(([stat, value]) => (
                <div key={stat} className="stat-row">
                  <span className="stat-name">{stat.charAt(0).toUpperCase() + stat.slice(1)}</span>
                  <span className="stat-value">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <TutorialOverlay />
    </div>
  );
}
