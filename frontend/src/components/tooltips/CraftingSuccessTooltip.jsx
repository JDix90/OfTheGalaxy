import React, { useState, useMemo } from 'react';
import { useCharacterStore } from '../../state/characterSlice';
import { calculateCraftingSuccess } from '../../utils/abilityScaling';
import { ProgressionSystem } from '../../core/progression/ProgressionSystem';
import './CraftingSuccessTooltip.css';

export default function CraftingSuccessTooltip({ 
  recipe, 
  children 
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { currentCharacter } = useCharacterStore();
  
  if (!recipe || !currentCharacter) {
    return children;
  }
  
  // Calculate crafting success
  const successInfo = useMemo(() => {
    const progressionSystem = new ProgressionSystem(currentCharacter);
    const engineeringLevel = progressionSystem.getSkillLevel('technical', 'engineering');
    const intelligence = currentCharacter.stats?.intelligence || 10;
    const recipeDifficulty = recipe.difficulty || 0;
    
    // Base success chance
    const baseSuccess = 0.50; // 50%
    
    // Calculate success with piecewise scaling
    const successChance = calculateCraftingSuccess(
      baseSuccess,
      intelligence,
      engineeringLevel,
      recipeDifficulty
    );
    
    // Get previews
    const previews = [
      {
        label: 'If INT +1',
        chance: calculateCraftingSuccess(baseSuccess, intelligence + 1, engineeringLevel, recipeDifficulty)
      },
      {
        label: 'If Engineering +1',
        chance: calculateCraftingSuccess(baseSuccess, intelligence, engineeringLevel + 1, recipeDifficulty)
      },
      {
        label: 'If INT +3',
        chance: calculateCraftingSuccess(baseSuccess, intelligence + 3, engineeringLevel, recipeDifficulty)
      }
    ];
    
    return {
      chance: successChance,
      previews,
      intelligence,
      engineeringLevel,
      difficulty: recipeDifficulty
    };
  }, [recipe, currentCharacter]);
  
  return (
    <div 
      className="crafting-success-container"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <div className="crafting-success-tooltip">
          <div className="tooltip-header">
            <h4>Crafting Success Chance</h4>
            <div className="tooltip-value">{(successInfo.chance * 100).toFixed(1)}%</div>
          </div>
          <div className="tooltip-body">
            <div className="success-breakdown">
              <div className="breakdown-item">
                <span className="breakdown-label">Base:</span>
                <span className="breakdown-value">50%</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Intelligence:</span>
                <span className="breakdown-value">{successInfo.intelligence}</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Engineering:</span>
                <span className="breakdown-value">Level {successInfo.engineeringLevel}</span>
              </div>
              {successInfo.difficulty > 0 && (
                <div className="breakdown-item">
                  <span className="breakdown-label">Difficulty:</span>
                  <span className="breakdown-value">-{(successInfo.difficulty * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>
            <div className="preview-section">
              <h5>Preview:</h5>
              <div className="preview-list">
                {successInfo.previews.map((preview, index) => (
                  <div key={index} className="preview-item">
                    <span className="preview-label">{preview.label}:</span>
                    <span className="preview-value">{(preview.chance * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

