import React, { useState } from 'react';
import { useCharacterStore } from '../../state/characterSlice';
import { characterApi } from '../../services/api/characterApi';
import { getAttributePointCost, canIncreaseAttribute, getCostPreview } from '../../utils/attributeScaling';
import StatBreakdownTooltip from '../../components/tooltips/StatBreakdownTooltip';
import './AttributeAllocationView.css';

export default function AttributeAllocationView() {
  const { currentCharacter, loadCharacter } = useCharacterStore();
  const [allocating, setAllocating] = useState(false);
  const [error, setError] = useState(null);

  const attributes = [
    { 
      id: 'strength', 
      name: 'Strength', 
      icon: '💪', 
      description: 'Physical power and melee damage',
      effects: ['Melee damage', 'Carry weight', 'Physical actions']
    },
    { 
      id: 'agility', 
      name: 'Agility', 
      icon: '🏃', 
      description: 'Speed, reflexes, and ranged accuracy',
      effects: ['Ranged accuracy', 'Dodge chance', 'Movement speed']
    },
    { 
      id: 'intelligence', 
      name: 'Intelligence', 
      icon: '🧠', 
      description: 'Problem-solving and technical skills',
      effects: ['Crafting success', 'Hacking success', 'Ability effectiveness']
    },
    { 
      id: 'charisma', 
      name: 'Charisma', 
      icon: '💬', 
      description: 'Persuasion and social influence',
      effects: ['Dialogue success', 'Vendor discounts', 'Faction reputation']
    },
    { 
      id: 'perception', 
      name: 'Perception', 
      icon: '👁️', 
      description: 'Awareness and critical hit chance',
      effects: ['Critical hit chance', 'Hidden location discovery', 'Trap detection']
    },
    { 
      id: 'endurance', 
      name: 'Endurance', 
      icon: '❤️', 
      description: 'Health, stamina, and resilience',
      effects: ['Max health', 'Max stamina', 'Environmental resistance']
    }
  ];

  const handleAllocate = async (attributeId) => {
    if (allocating || !currentCharacter || currentCharacter.attributePoints <= 0) return;
    
    setAllocating(true);
    setError(null);
    
    try {
      const response = await characterApi.allocateAttribute(currentCharacter.id, attributeId);
      
      if (response.success) {
        // Reload character to get updated data
        await loadCharacter(currentCharacter.id);
      } else {
        throw new Error(response.message || 'Failed to allocate attribute point');
      }
    } catch (error) {
      console.error('Failed to allocate attribute point:', error);
      setError(error.message || 'Failed to allocate attribute point');
    } finally {
      setAllocating(false);
    }
  };

  if (!currentCharacter) {
    return (
      <div className="attribute-allocation-view">
        <p>No character selected</p>
      </div>
    );
  }

  const availablePoints = currentCharacter.attributePoints || 0;

  return (
    <div className="attribute-allocation-view">
      <div className="header">
        <h3>Attribute Points</h3>
        <div className="points-counter">
          Available: <span className="points-value">{availablePoints}</span>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="attributes-grid">
        {attributes.map(attr => {
          const currentValue = currentCharacter.stats?.[attr.id] || 10;
          const isAtCap = currentValue >= 100;
          const isAtSoftCap = currentValue >= 50;
          
          // Calculate cost and check if can increase
          const cost = getAttributePointCost(currentValue);
          const check = canIncreaseAttribute(currentValue, availablePoints);
          const canAfford = availablePoints >= cost;
          
          // Get cost preview for tooltip
          const costPreview = getCostPreview(currentValue, 5);
          
          return (
            <div 
              key={attr.id} 
              className={`attribute-card ${isAtCap ? 'capped' : ''} ${isAtSoftCap ? 'soft-capped' : ''}`}
            >
              <div className="attribute-header">
                <span className="attribute-icon">{attr.icon}</span>
                <div className="attribute-info">
                  <h4>{attr.name}</h4>
                  <p className="attribute-description">{attr.description}</p>
                </div>
              </div>
              
              <StatBreakdownTooltip
                statName={attr.name}
                value={currentValue}
                breakdown={{
                  current: { label: 'Current Value', value: currentValue },
                  cost: { label: 'Next Point Cost', value: cost, unit: ' point' + (cost > 1 ? 's' : '') },
                  ...(isAtSoftCap && !isAtCap ? {
                    effectiveness: { label: 'Effectiveness', value: 0.5, unit: ' (50% after soft cap)' }
                  } : {})
                }}
              >
                <div className="attribute-value">
                  <span className="current-value">{currentValue}</span>
                  {isAtSoftCap && !isAtCap && (
                    <span className="soft-cap-warning">(Soft Cap: 50% effectiveness)</span>
                  )}
                  {isAtCap && (
                    <span className="hard-cap-warning">(Hard Cap Reached)</span>
                  )}
                </div>
              </StatBreakdownTooltip>

              <div className="attribute-effects">
                <h5>Effects:</h5>
                <ul>
                  {attr.effects.map((effect, index) => (
                    <li key={index}>{effect}</li>
                  ))}
                </ul>
              </div>
              
              <button
                className={`allocate-button ${cost > 1 ? 'expensive' : ''}`}
                onClick={() => handleAllocate(attr.id)}
                disabled={allocating || !canAfford || isAtCap}
                title={
                  isAtCap 
                    ? 'Attribute at hard cap (100)' 
                    : !canAfford 
                      ? `Need ${cost} point(s), have ${availablePoints}` 
                      : `Allocate ${cost} point(s) to ${attr.name}`
                }
              >
                +1 {cost > 1 && <span className="cost-badge">({cost})</span>}
              </button>
              
              {costPreview.length > 0 && cost > 1 && (
                <div className="cost-preview">
                  <small>Next costs: {costPreview.slice(0, 3).map(p => p.cost).join(', ')}...</small>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {availablePoints > 0 && (
        <div className="allocation-hint">
          <p>Click the +1 button next to an attribute to allocate a point.</p>
        </div>
      )}
    </div>
  );
}

