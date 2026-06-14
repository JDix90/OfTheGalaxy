/**
 * CharacterCreation Component
 * Multi-step character creation flow
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../../state/characterSlice';
import { galaxyApi } from '../../services/api/galaxyApi';
import SpeciesSelection from './steps/SpeciesSelection';
import BackgroundSelection from './steps/BackgroundSelection';
import AttributeAllocation from './steps/AttributeAllocation';
import NameAndConfirm from './steps/NameAndConfirm';
import './CharacterCreation.css';

const STEPS = [
  { id: 'species', title: 'Choose Species', component: SpeciesSelection },
  { id: 'background', title: 'Choose Background', component: BackgroundSelection },
  { id: 'attributes', title: 'Allocate Attributes', component: AttributeAllocation },
  { id: 'confirm', title: 'Name & Confirm', component: NameAndConfirm }
];

export default function CharacterCreation() {
  const navigate = useNavigate();
  const { createCharacter, isLoading } = useCharacterStore();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [characterData, setCharacterData] = useState({
    species: null,
    background: null,
    stats: {
      strength: 10,
      agility: 10,
      intelligence: 10,
      charisma: 10,
      perception: 10,
      endurance: 10
    },
    appearance: {},
    name: ''
  });

  const CurrentStepComponent = STEPS[currentStep].component;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleUpdateData = (updates) => {
    setCharacterData(prev => ({
      ...prev,
      ...updates
    }));
  };

  const handleComplete = async () => {
    try {
      const character = await createCharacter(characterData);
      
      // Navigate to spaceport submap on starting planet
      try {
        const planetId = character.currentPlanet;
        console.log('[CharacterCreation] Navigating to spaceport on planet:', planetId);
        
        // Get planet data to find spaceport
        const planetResponse = await galaxyApi.getPlanet(planetId);
        if (planetResponse && planetResponse.success && planetResponse.data) {
          const planet = planetResponse.data;
          
          // Find spaceport POI
          let spaceportPOI = null;
          if (planet.mapData?.pointsOfInterest) {
            spaceportPOI = planet.mapData.pointsOfInterest.find(poi => poi.type === 'spaceport');
          }
          
          // If no POI found, check if there's a spaceport object
          if (!spaceportPOI && planet.mapData?.spaceport) {
            // Create a virtual spaceport POI from the spaceport object
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
            
            console.log('[CharacterCreation] Found spaceport, navigating to:', {
              planetId,
              parentLocationId,
              path: `/game/location/${planetId}/${encodedLocationId}/poi/spaceport`
            });
            
            // Navigate to spaceport submap
            navigate(`/game/location/${planetId}/${encodedLocationId}/poi/spaceport`, {
              state: {
                isNewCharacter: true,
                showTutorial: true
              }
            });
          } else {
            console.warn('[CharacterCreation] No spaceport found, navigating to planet surface');
            // Fallback to planet surface if no spaceport found
            navigate(`/game/planet/${planetId}`, {
              state: {
                isNewCharacter: true,
                showTutorial: true
              }
            });
          }
        } else {
          console.warn('[CharacterCreation] Failed to load planet data, navigating to planet surface');
          navigate(`/game/planet/${planetId}`, {
            state: {
              isNewCharacter: true,
              showTutorial: true
            }
          });
        }
      } catch (navError) {
        console.error('[CharacterCreation] Error navigating to spaceport:', navError);
        // Fallback to game world if navigation fails
        navigate(`/game`, {
          state: {
            isNewCharacter: true,
            showTutorial: true
          }
        });
      }
    } catch (error) {
      console.error('Failed to create character:', error);
      alert('Failed to create character. Please try again.');
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Species
        return characterData.species !== null;
      case 1: // Background
        return characterData.background !== null;
      case 2: // Attributes
        return true; // Can always proceed from attributes
      case 3: // Name & Confirm
        return characterData.name.trim().length >= 2;
      default:
        return false;
    }
  };

  return (
    <div className="character-creation">
      <div className="creation-container">
        {/* Progress indicator */}
        <div className="creation-progress">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`progress-step ${index === currentStep ? 'active' : ''} ${
                index < currentStep ? 'completed' : ''
              }`}
            >
              <div className="step-number">{index + 1}</div>
              <div className="step-title">{step.title}</div>
            </div>
          ))}
        </div>

        {/* Current step content */}
        <div className="creation-content">
          <h2>{STEPS[currentStep].title}</h2>
          
          <CurrentStepComponent
            characterData={characterData}
            onUpdate={handleUpdateData}
          />
        </div>

        {/* Navigation buttons */}
        <div className="creation-navigation">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="btn-secondary"
          >
            Back
          </button>

          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="btn-primary"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!canProceed() || isLoading}
              className="btn-primary"
            >
              {isLoading ? 'Creating...' : 'Create Character'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
