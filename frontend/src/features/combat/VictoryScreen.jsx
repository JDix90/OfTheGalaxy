/**
 * Victory Screen Component
 * Displays victory or defeat screen with rewards
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCharacterStore } from '../../state/characterSlice';
import { useCombatStore } from '../../state/combatSlice';
import { useQuestStore } from '../../state/questSlice';
import { tutorialEventBus, TUTORIAL_EVENTS } from '../../services/tutorialEventBus';
import './VictoryScreen.css';

export default function VictoryScreen({ status, encounter, onClose, returnLocation: propReturnLocation }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentCharacter, setCurrentCharacter } = useCharacterStore();
  const { clearEncounter } = useCombatStore();
  const { loadActiveQuests } = useQuestStore();
  const [rewards, setRewards] = useState(null);
  const [updatedCharacter, setUpdatedCharacter] = useState(null); // Store updated character for navigation
  const [isLoadingCharacter, setIsLoadingCharacter] = useState(true); // Track character reload

  useEffect(() => {
    // Emit combat ended event for tutorial tracking
    if ((status === 'won' || status === 'lost' || status === 'fled') && encounter) {
      const isTutorial = location.state?.isTutorial || propReturnLocation?.isTutorial;
      if (isTutorial) {
        tutorialEventBus.emit(TUTORIAL_EVENTS.COMBAT_ENDED, {
          status,
          encounterId: encounter.id,
          characterId: currentCharacter?.id,
          isTutorial: true
        });
      }
    }

    // Get rewards from encounter metadata (distributed by backend) or calculate from enemies
    if (status === 'won' && encounter) {
      // Check if rewards are stored in encounter metadata (from backend)
      if (encounter.metadata?.rewards) {
        const backendRewards = encounter.metadata.rewards;
        setRewards({
          xp: backendRewards.xp || 0,
          credits: backendRewards.credits || 0,
          loot: backendRewards.loot || []
        });
      } else {
        // Fallback: calculate from defeated enemies (for backwards compatibility)
        const enemies = encounter.combatants.filter(c => c.type === 'enemy');
        let totalXP = 0;
        let totalCredits = 0;
        const loot = [];

        enemies.forEach(enemy => {
          if (enemy.stats.health <= 0) {
            totalXP += enemy.xpReward || 0;
            totalCredits += enemy.creditsReward || 0;
          }
        });

        setRewards({
          xp: totalXP,
          credits: totalCredits,
          loot: loot
        });
      }
    }

    // Reload character to get updated stats (for both victory and defeat)
    // For defeat, add a small delay to ensure respawn completes on backend
    if (currentCharacter && !updatedCharacter) { // Only reload once
      setIsLoadingCharacter(true);
      const reloadDelay = status === 'lost' ? 500 : 0; // Small delay for defeat to ensure respawn completes
      
      setTimeout(() => {
        import('../../services/api/characterApi').then(({ characterApi }) => {
          characterApi.getById(currentCharacter.id)
            .then(response => {
              const updated = response.data || response;
              console.log('✅ Character reloaded after combat:', {
                id: updated.id,
                currentPlanet: updated.currentPlanet,
                currentLocation: updated.currentLocation,
                health: updated.currentHealth,
                status
              });
              setCurrentCharacter(updated);
              setUpdatedCharacter(updated); // Store for navigation
              setIsLoadingCharacter(false);
              
              // Reload active quests to check for completions (especially for dungeon quests)
              if (updated.id) {
                loadActiveQuests(updated.id).catch(err => {
                  console.warn('Failed to reload quests after combat:', err);
                });
              }
              
              // If defeated, show respawn information
              if (status === 'lost') {
                const locationName = updated.currentLocation?.area === 'spaceport' 
                  ? 'Spaceport' 
                  : 'Safe Location';
                setRewards(prev => ({
                  ...prev,
                  respawnLocation: locationName,
                  healthRestored: updated.currentHealth,
                  maxHealth: updated.maxHealth
                }));
              }
            })
            .catch(err => {
              console.error('Failed to reload character:', err);
              setIsLoadingCharacter(false);
            });
        });
      }, reloadDelay);
    } else if (!currentCharacter) {
      setIsLoadingCharacter(false);
    }
  }, [status, encounter]); // Removed currentCharacter and setCurrentCharacter from dependencies to prevent infinite loops

  const handleContinue = () => {
    clearEncounter();
    
    // For defeat, always handle navigation ourselves to go to planet surface
    if (status === 'lost') {
      // Get the latest character from store to ensure we have the most up-to-date data
      const latestCharacter = useCharacterStore.getState().currentCharacter;
      const characterToUse = updatedCharacter || latestCharacter || currentCharacter;
      
      console.log('🎮 HandleContinue (DEFEAT) - Character data:', {
        status,
        hasUpdatedCharacter: !!updatedCharacter,
        hasCurrentCharacter: !!currentCharacter,
        hasLatestCharacter: !!latestCharacter,
        currentPlanet: characterToUse?.currentPlanet,
        updatedCharacterPlanet: updatedCharacter?.currentPlanet,
        latestCharacterPlanet: latestCharacter?.currentPlanet,
        currentCharacterPlanet: currentCharacter?.currentPlanet
      });
      
      // Try multiple sources for planet ID
      const planetId = updatedCharacter?.currentPlanet 
        || latestCharacter?.currentPlanet 
        || currentCharacter?.currentPlanet;
        
      if (planetId) {
        console.log('✅ Navigating to planet surface:', planetId);
        navigate(`/game/planet/${planetId}`);
      } else {
        console.warn('⚠️  No planet ID found in any character source, navigating to /game');
        console.warn('Character sources:', {
          updatedCharacter: updatedCharacter?.currentPlanet,
          latestCharacter: latestCharacter?.currentPlanet,
          currentCharacter: currentCharacter?.currentPlanet
        });
        // Fallback to onClose if provided, otherwise navigate to /game
        if (onClose) {
          onClose();
        } else {
          navigate('/game');
        }
      }
    } else {
      // For victory, try to return to previous location
      // Check prop first, then location.state, then window.history
      const returnLocation = propReturnLocation || location.state?.returnLocation || window.history.state?.usr?.returnLocation;
      
      console.log('🎮 HandleContinue (VICTORY) - Return location:', {
        propReturnLocation,
        locationState: location.state?.returnLocation,
        historyState: window.history.state?.usr?.returnLocation,
        finalReturnLocation: returnLocation
      });
      
      if (returnLocation) {
        console.log('✅ Returning to previous location after victory:', returnLocation);
        
        // If we have a submap, return to submap
        if (returnLocation.subMapId) {
          // Use the location route format: /game/location/:planetId/:parentLocationId/:parentLocationType/:type
          // Encode the parentLocationId to handle special characters
          const encodedParentLocationId = encodeURIComponent(returnLocation.parentLocationId || '');
          const path = `/game/location/${returnLocation.planetId}/${encodedParentLocationId}/${returnLocation.parentLocationType}/${returnLocation.type}`;
          console.log('📍 Navigating to submap:', path);
          navigate(path, {
            state: {
              returnFromCombat: true, // Mark that we're returning from combat
              isTutorial: returnLocation.isTutorial || location.state?.isTutorial || false, // Preserve tutorial flag
              subMapId: returnLocation.subMapId, // Pass subMapId in state
              playerLocation: returnLocation.location,
              planetId: returnLocation.planetId,
              parentLocationId: returnLocation.parentLocationId,
              parentLocationType: returnLocation.parentLocationType,
              type: returnLocation.type
            }
          });
        } else if (returnLocation.planetId) {
          // Otherwise return to planet map with player's saved location
          console.log('📍 Navigating to planet:', returnLocation.planetId, 'at location:', returnLocation.location);
          navigate(`/game/planet/${returnLocation.planetId}`, {
            state: {
              returnFromCombat: true,
              playerLocation: returnLocation.location // Preserve player's last position
            }
          });
        } else {
          // Fallback to onClose or /game
          console.warn('⚠️  Return location missing required fields, falling back');
          if (onClose) {
            onClose();
          } else {
            navigate('/game');
          }
        }
      } else {
        // No return location, use onClose if provided, otherwise navigate to /game
        console.warn('⚠️  No return location found, falling back');
        if (onClose) {
          onClose();
        } else {
          navigate('/game');
        }
      }
    }
  };

  const isVictory = status === 'won';
  const isDefeat = status === 'lost';
  const isFled = status === 'fled';

  return (
    <div className="victory-screen">
      <div className="victory-screen-content">
        {isVictory && (
          <>
            <div className="victory-icon">🎉</div>
            <h1 className="victory-title">Victory!</h1>
            <p className="victory-message">You have defeated your enemies!</p>
            
            {rewards && (
              <div className="victory-rewards">
                <h2>Rewards</h2>
                {rewards.xp > 0 && (
                  <div className="reward-item">
                    <span className="reward-label">Experience:</span>
                    <span className="reward-value">+{rewards.xp} XP</span>
                  </div>
                )}
                {rewards.credits > 0 && (
                  <div className="reward-item">
                    <span className="reward-label">Credits:</span>
                    <span className="reward-value">+{rewards.credits} credits</span>
                  </div>
                )}
                {rewards.loot && rewards.loot.length > 0 && (
                  <div className="reward-item">
                    <span className="reward-label">Loot:</span>
                    <div className="reward-loot">
                      {rewards.loot.map((item, index) => (
                        <span key={index} className="loot-item">
                          {item.itemId} x{item.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {isDefeat && (
          <>
            <div className="victory-icon">💀</div>
            <h1 className="victory-title">Defeat</h1>
            <p className="victory-message">You have been defeated in combat.</p>
            {rewards && rewards.respawnLocation && (
              <div className="defeat-respawn-info">
                <p className="victory-submessage">
                  You have been evacuated to the <strong>{rewards.respawnLocation}</strong> medical facilities.
                </p>
                {rewards.healthRestored !== undefined && (
                  <p className="victory-submessage">
                    Your health has been restored to <strong>{rewards.healthRestored}/{rewards.maxHealth}</strong>.
                  </p>
                )}
              </div>
            )}
            {!rewards && (
              <p className="victory-submessage">You have been evacuated to a safe location.</p>
            )}
          </>
        )}

        {isFled && (
          <>
            <div className="victory-icon">🏃</div>
            <h1 className="victory-title">Fled</h1>
            <p className="victory-message">You successfully fled from combat.</p>
          </>
        )}

        <button onClick={handleContinue} className="btn-primary continue-btn">
          Continue
        </button>
      </div>
    </div>
  );
}

