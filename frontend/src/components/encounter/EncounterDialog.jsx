/**
 * Encounter Dialog Component
 * Displays when a random encounter is triggered
 */

import React, { useEffect, useRef } from 'react';
import { addTutorialTarget, TUTORIAL_TARGETS } from '../../services/tutorialTargetRegistry';
import { tutorialEventBus, TUTORIAL_EVENTS } from '../../services/tutorialEventBus';
import { useLocation } from 'react-router-dom';
import './EncounterDialog.css';

export default function EncounterDialog({ 
  isOpen, 
  onFight, 
  onFlee, 
  canFlee = true,
  enemyCount = 1,
  planetDangerLevel = 1
}) {
  const location = useLocation();
  const dialogRef = useRef(null);
  
  // Add tutorial target and emit event
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      addTutorialTarget(dialogRef.current, TUTORIAL_TARGETS.ENCOUNTER_DIALOG);
      
      // Determine location based on current route
      const isOnPlanetSurface = location.pathname.includes('/planet/');
      
      // Emit random encounter triggered event for tutorial
      tutorialEventBus.emit(TUTORIAL_EVENTS.RANDOM_ENCOUNTER_TRIGGERED, {
        location: isOnPlanetSurface ? 'planet_surface' : 'spaceport',
        enemyCount,
        planetDangerLevel,
        timestamp: new Date().toISOString()
      });
    }
  }, [isOpen, location.pathname, enemyCount, planetDangerLevel]);
  
  if (!isOpen) return null;

  const dangerMessages = {
    1: 'A lone figure approaches...',
    2: 'You sense danger nearby...',
    3: 'Hostile forces detected!',
    4: 'Multiple hostiles closing in!',
    5: 'Dangerous enemies ahead!',
    6: 'Heavy enemy presence detected!',
    7: 'Extremely dangerous situation!',
    8: 'Critical threat level!',
    9: 'Overwhelming enemy force!',
    10: 'DEATH APPROACHES!'
  };

  const message = dangerMessages[Math.min(planetDangerLevel, 10)] || dangerMessages[3];
  const enemyText = enemyCount === 1 ? 'enemy' : 'enemies';

  return (
    <div className="encounter-dialog-overlay">
      <div 
        ref={dialogRef}
        className="encounter-dialog"
        data-tutorial-target={TUTORIAL_TARGETS.ENCOUNTER_DIALOG}
      >
        <div className="encounter-dialog-header">
          <h2>⚠️ Encounter!</h2>
        </div>
        
        <div className="encounter-dialog-content">
          <p className="encounter-message">{message}</p>
          <p className="encounter-details">
            {enemyCount} {enemyText} {enemyCount === 1 ? 'has' : 'have'} appeared!
          </p>
          <p className="encounter-warning">
            Danger Level: {planetDangerLevel}/10
          </p>
        </div>

        <div className="encounter-dialog-actions">
          <button 
            onClick={onFight} 
            className="btn-primary btn-fight"
          >
            ⚔️ Fight
          </button>
          {canFlee && (
            <button 
              onClick={onFlee} 
              className="btn-secondary btn-flee"
            >
              🏃 Flee
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


