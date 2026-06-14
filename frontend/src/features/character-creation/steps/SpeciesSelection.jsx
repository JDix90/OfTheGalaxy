/**
 * SpeciesSelection Component
 * Step 1: Choose character species
 */

import React from 'react';
import { SPECIES_BONUSES } from '../../../utils/characterBonuses';

const SPECIES = [
  {
    id: 'human',
    name: 'Human',
    description: 'Versatile and adaptable, humans are found throughout the galaxy.'
  },
  {
    id: 'sytheen',
    name: "Sytheen",
    description: 'Graceful and charismatic, known for their distinctive head-tails.'
  },
  {
    id: 'skarn',
    name: 'Skarn',
    description: 'Keen-eyed hunters with exceptional perception.'
  },
  {
    id: 'ursk',
    name: 'Ursk',
    description: 'Powerful and loyal, towering warriors from Verdholm.'
  },
  {
    id: 'karnaki',
    name: 'Karnaki',
    description: 'Resilient and determined, with natural resistance to pain.'
  },
  {
    id: 'sethari',
    name: 'Sethari',
    description: 'Intuitive and perceptive, with natural spatial awareness.'
  },
  {
    id: 'jeharu',
    name: 'Jeharu',
    description: 'Spiritual and disciplined, guided by tradition.'
  },
  {
    id: 'vorne',
    name: 'Vorne',
    description: 'Analytical and strategic, known for tactical brilliance.'
  }
];

/**
 * Format attribute bonuses for display with React elements for styling
 */
function formatBonuses(speciesId) {
  const bonuses = SPECIES_BONUSES[speciesId] || {};
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

export default function SpeciesSelection({ characterData, onUpdate }) {
  const handleSelect = (speciesId) => {
    onUpdate({ species: speciesId });
  };

  return (
    <div className="species-selection">
      <p className="step-description">
        Choose your character's species. Each species has unique bonuses that will affect your starting attributes.
      </p>

      <div className="species-grid">
        {SPECIES.map((species) => (
          <div
            key={species.id}
            className={`species-card ${
              characterData.species === species.id ? 'selected' : ''
            }`}
            onClick={() => handleSelect(species.id)}
          >
            <h3>{species.name}</h3>
            <p className="species-description">{species.description}</p>
            <div className="species-bonuses">
              <strong>Attribute Modifiers:</strong> {formatBonuses(species.id)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
