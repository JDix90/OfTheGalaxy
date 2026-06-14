/**
 * AttributeAllocation Component
 * Step 3: Allocate attribute points
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { calculateBaseStats, getSpeciesBonus, getBackgroundBonus, getTotalBonus } from '../../../utils/characterBonuses';
import { calculateCritChance, calculateDodgeChance } from '../../../utils/diminishingReturns';

const ATTRIBUTES = [
  {
    id: 'strength',
    name: 'Strength',
    description: 'Physical power and melee damage',
    icon: '💪'
  },
  {
    id: 'agility',
    name: 'Agility',
    description: 'Speed, reflexes, and ranged accuracy',
    icon: '🏃'
  },
  {
    id: 'intelligence',
    name: 'Intelligence',
    description: 'Problem-solving and technical skills',
    icon: '🧠'
  },
  {
    id: 'charisma',
    name: 'Charisma',
    description: 'Persuasion and social influence',
    icon: '💬'
  },
  {
    id: 'perception',
    name: 'Perception',
    description: 'Awareness and critical hit chance',
    icon: '👁️'
  },
  {
    id: 'endurance',
    name: 'Endurance',
    description: 'Health, stamina, and resilience',
    icon: '❤️'
  }
];

const STARTING_POINTS = 15;
const MIN_ATTRIBUTE = 5;
const MAX_ATTRIBUTE = 20;

export default function AttributeAllocation({ characterData, onUpdate }) {
  // Calculate base stats with species and background bonuses
  const baseStats = useMemo(() => {
    if (characterData.species && characterData.background) {
      return calculateBaseStats(characterData.species, characterData.background);
    }
    // Default to 10 for all if species/background not selected
    return {
      strength: 10,
      agility: 10,
      intelligence: 10,
      charisma: 10,
      perception: 10,
      endurance: 10
    };
  }, [characterData.species, characterData.background]);

  // Track if stats have been customized by the user
  const statsCustomizedRef = useRef(false);
  const previousSpeciesRef = useRef(characterData.species);
  const previousBackgroundRef = useRef(characterData.background);
  
  // Check if stats in characterData are just default (all 10s) - if so, ignore them
  const areStatsDefault = useMemo(() => {
    if (!characterData.stats) return true;
    const values = Object.values(characterData.stats);
    return values.length === 6 && values.every(val => val === 10);
  }, [characterData.stats]);
  
  // Initialize stats: if species/background selected, use baseStats (with bonuses)
  // Otherwise, use characterData.stats if customized, or default to all 10s
  const [stats, setStats] = useState(() => {
    // Priority 1: If species and background are selected, calculate and use base stats (includes bonuses)
    if (characterData.species && characterData.background) {
      const calculatedBaseStats = calculateBaseStats(characterData.species, characterData.background);
      return { ...calculatedBaseStats };
    }
    // Priority 2: If stats exist and aren't default, use them (user has customized)
    if (characterData.stats && !areStatsDefault) {
      statsCustomizedRef.current = true;
      return characterData.stats;
    }
    // Priority 3: Default to all 10s
    return {
      strength: 10,
      agility: 10,
      intelligence: 10,
      charisma: 10,
      perception: 10,
      endurance: 10
    };
  });

  // Update stats when base stats change (species/background changed or first time selecting them)
  useEffect(() => {
    if (characterData.species && characterData.background) {
      const speciesChanged = previousSpeciesRef.current !== characterData.species;
      const backgroundChanged = previousBackgroundRef.current !== characterData.background;
      const isFirstSelection = !previousSpeciesRef.current && !previousBackgroundRef.current;
      
      // If species or background changed, or this is the first time selecting them, reset to base stats
      if (speciesChanged || backgroundChanged || isFirstSelection) {
        statsCustomizedRef.current = false;
        setStats({ ...baseStats });
        previousSpeciesRef.current = characterData.species;
        previousBackgroundRef.current = characterData.background;
      } else if (!statsCustomizedRef.current) {
        // If stats haven't been customized yet, ensure they match base stats
        // Check each stat individually to handle any mismatches
        const needsUpdate = Object.keys(baseStats).some(key => stats[key] !== baseStats[key]);
        if (needsUpdate) {
          setStats({ ...baseStats });
        }
      }
    }
  }, [baseStats, characterData.species, characterData.background]);

  // Calculate points spent (current stats - base stats)
  const totalSpent = useMemo(() => {
    return Object.keys(stats).reduce((sum, key) => {
      return sum + (stats[key] - baseStats[key]);
    }, 0);
  }, [stats, baseStats]);

  const pointsRemaining = STARTING_POINTS - totalSpent;

  // Live preview of the derived combat stats these attributes produce at level 1,
  // using the same formulas the in-game character uses — so allocation feels real.
  const derived = useMemo(() => {
    const s = stats;
    return {
      health: 100 + ((s.endurance - 10) * 10),
      stamina: 100 + ((s.endurance - 10) * 5),
      carry: 50 + (s.strength * 5),
      crit: calculateCritChance(s.perception || 10, 0, 0),
      dodge: calculateDodgeChance(s.agility || 10, 0, 0)
    };
  }, [stats]);

  const DERIVED_ROWS = [
    { key: 'health', label: 'Max Health', icon: '❤️', value: derived.health, from: 'Endurance' },
    { key: 'stamina', label: 'Max Stamina', icon: '⚡', value: derived.stamina, from: 'Endurance' },
    { key: 'crit', label: 'Crit Chance', icon: '🎯', value: `${(derived.crit * 100).toFixed(1)}%`, from: 'Perception' },
    { key: 'dodge', label: 'Dodge', icon: '✨', value: `${(derived.dodge * 100).toFixed(1)}%`, from: 'Agility' },
    { key: 'carry', label: 'Carry Weight', icon: '🎒', value: derived.carry, from: 'Strength' }
  ];

  useEffect(() => {
    onUpdate({ stats });
  }, [stats]);

  const handleIncrease = (attribute) => {
    if (pointsRemaining > 0 && stats[attribute] < MAX_ATTRIBUTE) {
      statsCustomizedRef.current = true;
      setStats(prev => ({
        ...prev,
        [attribute]: prev[attribute] + 1
      }));
    }
  };

  const handleDecrease = (attribute) => {
    // Can't go below base stat (which may be below 10 due to negative bonuses)
    const minValue = Math.max(MIN_ATTRIBUTE, baseStats[attribute]);
    if (stats[attribute] > minValue) {
      statsCustomizedRef.current = true;
      setStats(prev => ({
        ...prev,
        [attribute]: prev[attribute] - 1
      }));
    }
  };

  const handleReset = () => {
    statsCustomizedRef.current = false;
    setStats({ ...baseStats });
  };

  return (
    <div className="attribute-allocation">
      <p className="step-description">
        Your attributes start at 10, with bonuses from your Species and Background already applied. 
        Allocate {STARTING_POINTS} points to further customize your attributes. Attributes can range from {MIN_ATTRIBUTE} to {MAX_ATTRIBUTE}.
      </p>

      <div className="points-remaining">
        <h3>Points Remaining: <span className={pointsRemaining === 0 ? 'text-success' : ''}>{pointsRemaining}</span></h3>
        <button onClick={handleReset} className="btn-secondary btn-small">
          Reset to Base Stats
        </button>
      </div>

      <div className="attributes-list">
        {ATTRIBUTES.map((attr) => {
          const speciesBonus = characterData.species ? getSpeciesBonus(characterData.species, attr.id) : 0;
          const backgroundBonus = characterData.background ? getBackgroundBonus(characterData.background, attr.id) : 0;
          const totalBonus = speciesBonus + backgroundBonus;
          const minValue = Math.max(MIN_ATTRIBUTE, baseStats[attr.id]);
          
          return (
            <div key={attr.id} className="attribute-row">
              <div className="attribute-info">
                <span className="attribute-icon">{attr.icon}</span>
                <div>
                  <h4>
                    {attr.name}
                    {totalBonus !== 0 && (
                      <span className="bonus-indicator" title={`Species: ${speciesBonus !== 0 ? (speciesBonus > 0 ? '+' : '') + speciesBonus : '0'}, Background: ${backgroundBonus !== 0 ? (backgroundBonus > 0 ? '+' : '') + backgroundBonus : '0'}`}>
                        {totalBonus > 0 ? '+' : ''}{totalBonus}
                      </span>
                    )}
                  </h4>
                  <p className="attribute-description">{attr.description}</p>
                </div>
              </div>

              <div className="attribute-controls">
                <button
                  onClick={() => handleDecrease(attr.id)}
                  disabled={stats[attr.id] <= minValue}
                  className="btn-control"
                  title={stats[attr.id] <= minValue ? `Cannot go below ${minValue} (base: ${baseStats[attr.id]})` : 'Decrease'}
                >
                  −
                </button>

                <div className="attribute-value">
                  {stats[attr.id]}
                </div>

                <button
                  onClick={() => handleIncrease(attr.id)}
                  disabled={pointsRemaining <= 0 || stats[attr.id] >= MAX_ATTRIBUTE}
                  className="btn-control"
                >
                  +
                </button>
              </div>

              <div className="attribute-bar">
                <div
                  className="attribute-fill"
                  style={{ width: `${((stats[attr.id] - MIN_ATTRIBUTE) / (MAX_ATTRIBUTE - MIN_ATTRIBUTE)) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="derived-preview">
        <h4 className="derived-preview-title">Derived Stats <span className="derived-preview-note">— update live as you allocate</span></h4>
        <div className="derived-preview-grid">
          {DERIVED_ROWS.map((row) => (
            <div key={row.key} className="derived-stat" title={`Scales with ${row.from}`}>
              <span className="derived-stat-icon">{row.icon}</span>
              <span className="derived-stat-value">{row.value}</span>
              <span className="derived-stat-label">{row.label}</span>
            </div>
          ))}
        </div>
      </div>

      {pointsRemaining > 0 && (
        <div className="allocation-warning">
          ⚠️ You have {pointsRemaining} unspent point{pointsRemaining !== 1 ? 's' : ''}.
          You can proceed, but it's recommended to allocate all points.
        </div>
      )}
    </div>
  );
}
