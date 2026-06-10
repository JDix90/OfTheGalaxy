/**
 * Abilities Panel Component
 * Displays unlocked abilities for a character
 */

import React from 'react';
import { useCharacterStore } from '../../state/characterSlice';
import { getAbilityDefinition } from '../../data/abilityDefinitions';
import AbilityEffectTooltip from '../../components/tooltips/AbilityEffectTooltip';
import './AbilitiesPanel.css';

export default function AbilitiesPanel({ abilities = [] }) {
  const { currentCharacter } = useCharacterStore();
  if (!abilities || abilities.length === 0) {
    return (
      <div className="abilities-panel">
        <h4>Abilities</h4>
        <div className="no-abilities">
          <p>No abilities unlocked yet.</p>
          <p className="hint">Equip items with permanent abilities to unlock them.</p>
        </div>
      </div>
    );
  }

  // Ability display information (matches backend abilityService.getAbilityInfo)
  const abilityInfo = {
    force_insight: {
      name: 'Force Insight',
      description: 'Unlocks Force perception abilities',
      icon: '👁️',
      category: 'force'
    },
    force_artifact_mastery: {
      name: 'Force Artifact Mastery',
      description: 'Unlocks artifact-related abilities',
      icon: '🔮',
      category: 'force'
    },
    force_mastery: {
      name: 'Force Mastery',
      description: 'Unlocks advanced Force abilities',
      icon: '⚡',
      category: 'force'
    },
    weapon_mastery: {
      name: 'Weapon Mastery',
      description: 'Unlocks weapon specialization',
      icon: '⚔️',
      category: 'combat'
    },
    armor_mastery: {
      name: 'Armor Mastery',
      description: 'Unlocks armor specialization',
      icon: '🛡️',
      category: 'combat'
    },
    data_analysis_mastery: {
      name: 'Data Analysis Mastery',
      description: 'Unlocks advanced data analysis',
      icon: '📊',
      category: 'utility'
    },
    slicing_mastery: {
      name: 'Slicing Mastery',
      description: 'Unlocks advanced hacking',
      icon: '💻',
      category: 'utility'
    }
  };

  // Group abilities by category
  const abilitiesByCategory = {};
  abilities.forEach(abilityId => {
    const info = abilityInfo[abilityId] || {
      name: abilityId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: 'Unknown ability',
      icon: '✨',
      category: 'unknown'
    };
    
    if (!abilitiesByCategory[info.category]) {
      abilitiesByCategory[info.category] = [];
    }
    abilitiesByCategory[info.category].push({ id: abilityId, ...info });
  });

  const categoryLabels = {
    force: 'Force',
    combat: 'Combat',
    utility: 'Utility',
    unknown: 'Other'
  };

  return (
    <div className="abilities-panel">
      <h4>Abilities</h4>
      <div className="abilities-list">
        {Object.entries(abilitiesByCategory).map(([category, categoryAbilities]) => (
          <div key={category} className="ability-category">
            <h5 className="category-label">{categoryLabels[category] || category}</h5>
            <div className="ability-items">
              {categoryAbilities.map((ability) => {
                const abilityDef = getAbilityDefinition(ability.id);
                return (
                  <AbilityEffectTooltip
                    key={ability.id}
                    abilityDef={abilityDef}
                    character={currentCharacter}
                  >
                    <div className="ability-item" title={ability.description}>
                      <span className="ability-icon">{ability.icon}</span>
                      <div className="ability-details">
                        <span className="ability-name">{ability.name}</span>
                        <span className="ability-description">{ability.description}</span>
                      </div>
                    </div>
                  </AbilityEffectTooltip>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


