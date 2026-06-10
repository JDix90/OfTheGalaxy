/**
 * BackgroundSelection Component
 * Step 2: Choose character background
 */

import React from 'react';
import { BACKGROUND_BONUSES } from '../../../utils/characterBonuses';

const BACKGROUNDS = [
  {
    id: 'smuggler',
    name: 'Smuggler',
    description: 'You made your living on the edge of the law, running cargo and avoiding authorities.',
    startingPlanet: 'Nar Shaddaa',
    startingCredits: 2000,
    skills: 'Stealth, Piloting'
  },
  {
    id: 'scholar',
    name: 'Scholar',
    description: 'You devoted your life to knowledge and understanding the mysteries of the galaxy.',
    startingPlanet: 'Coruscant',
    startingCredits: 1500,
    skills: 'Technical, Diplomacy'
  },
  {
    id: 'soldier',
    name: 'Soldier',
    description: 'You served in military forces, trained in combat and discipline.',
    startingPlanet: 'Chandrila',
    startingCredits: 1000,
    skills: 'Combat, Survival'
  },
  {
    id: 'medic',
    name: 'Medic',
    description: 'You dedicated yourself to healing and helping others in need.',
    startingPlanet: 'Chandrila',
    startingCredits: 1200,
    skills: 'Survival, Diplomacy'
  },
  {
    id: 'engineer',
    name: 'Engineer',
    description: 'You have a talent for building, repairing, and understanding technology.',
    startingPlanet: 'Corellia',
    startingCredits: 1300,
    skills: 'Technical, Survival'
  },
  {
    id: 'diplomat',
    name: 'Diplomat',
    description: 'You excel at negotiation and navigating complex social situations.',
    startingPlanet: 'Naboo',
    startingCredits: 2500,
    skills: 'Diplomacy, Technical'
  },
  {
    id: 'pilot',
    name: 'Pilot',
    description: 'You feel most at home in a cockpit, navigating the stars.',
    startingPlanet: 'Corellia',
    startingCredits: 1800,
    skills: 'Technical, Combat'
  }
];

/**
 * Format attribute bonuses for display with React elements for styling
 */
function formatBonuses(backgroundId) {
  const bonuses = BACKGROUND_BONUSES[backgroundId] || {};
  const attributeNames = {
    strength: 'Strength',
    agility: 'Agility',
    intelligence: 'Intelligence',
    charisma: 'Charisma',
    perception: 'Perception',
    endurance: 'Endurance'
  };

  const positiveBonuses = [];
  const negativeBonuses = [];

  Object.entries(bonuses).forEach(([attr, value]) => {
    const attrName = attributeNames[attr] || attr;
    if (value > 0) {
      positiveBonuses.push(`+${value} ${attrName}`);
    } else if (value < 0) {
      negativeBonuses.push(`${value} ${attrName}`);
    }
  });

  const parts = [];
  if (positiveBonuses.length > 0) {
    parts.push(<span key="positive" style={{ color: 'var(--success-color, #4ade80)' }}>{positiveBonuses.join(', ')}</span>);
  }
  if (negativeBonuses.length > 0) {
    parts.push(<span key="negative" style={{ color: 'var(--danger-color, #ef4444)' }}>{negativeBonuses.join(', ')}</span>);
  }

  if (parts.length === 0) {
    return 'No attribute modifiers';
  }

  return parts.length > 1 ? (
    <>
      {parts[0]}; {parts[1]}
    </>
  ) : parts[0];
}

export default function BackgroundSelection({ characterData, onUpdate }) {
  const handleSelect = (backgroundId) => {
    onUpdate({ background: backgroundId });
  };

  return (
    <div className="background-selection">
      <p className="step-description">
        Choose your character's background. This determines your starting location, credits, and initial skill bonuses.
      </p>

      <div className="background-grid">
        {BACKGROUNDS.map((background) => (
          <div
            key={background.id}
            className={`background-card ${
              characterData.background === background.id ? 'selected' : ''
            }`}
            onClick={() => handleSelect(background.id)}
          >
            <h3>{background.name}</h3>
            <p className="background-description">{background.description}</p>
            
            <div className="background-details">
              <div className="detail-row">
                <strong>Attribute Modifiers:</strong> {formatBonuses(background.id)}
              </div>
              <div className="detail-row">
                <strong>Starting Planet:</strong> {background.startingPlanet}
              </div>
              <div className="detail-row">
                <strong>Starting Credits:</strong> {background.startingCredits}
              </div>
              <div className="detail-row">
                <strong>Skill Focus:</strong> {background.skills}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
