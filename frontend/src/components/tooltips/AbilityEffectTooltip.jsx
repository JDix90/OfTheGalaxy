import React, { useState } from 'react';
import { calculateHealing } from '../../utils/abilityScaling';
import { ProgressionSystem } from '../../core/progression/ProgressionSystem';
import './AbilityEffectTooltip.css';

export default function AbilityEffectTooltip({ 
  abilityDef, 
  character, 
  children 
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  if (!abilityDef || !character) {
    return children;
  }
  
  // Calculate ability effects based on character stats
  const getEffectInfo = () => {
    const effects = [];
    const stats = character.stats || {};
    
    // Healing effects
    if (abilityDef.effects?.heal) {
      const healEffect = abilityDef.effects.heal;
      const baseHeal = healEffect.base || 40;
      const intelligence = stats.intelligence || 10;
      
      // Get Field Medic skill level
      const progressionSystem = new ProgressionSystem(character);
      const medicLevel = progressionSystem.getSkillLevel('survival', 'field_medic');
      
      // Calculate healing with scaling
      const totalHealing = calculateHealing(baseHeal, intelligence, medicLevel);
      
      effects.push({
        type: 'heal',
        label: 'Healing',
        base: baseHeal,
        total: totalHealing,
        intelligence,
        medicLevel,
        scaling: `INT ${intelligence} × ${medicLevel > 0 ? `Medic ${medicLevel}` : 'No Medic'}`
      });
    }
    
    // Damage effects
    if (abilityDef.effects?.damage) {
      const damageEffect = abilityDef.effects.damage;
      const baseDamage = damageEffect.base || 0;
      
      effects.push({
        type: 'damage',
        label: 'Damage',
        base: baseDamage,
        total: baseDamage,
        damageType: damageEffect.type || 'physical'
      });
    }
    
    // Buff effects
    if (abilityDef.effects?.buff) {
      const buffEffect = abilityDef.effects.buff;
      effects.push({
        type: 'buff',
        label: 'Buff',
        stats: buffEffect,
        duration: buffEffect.duration || 0
      });
    }
    
    // Debuff effects
    if (abilityDef.effects?.debuff) {
      const debuffEffect = abilityDef.effects.debuff;
      effects.push({
        type: 'debuff',
        label: 'Debuff',
        stats: debuffEffect,
        duration: debuffEffect.duration || 0
      });
    }
    
    return effects;
  };
  
  const effects = getEffectInfo();
  
  if (effects.length === 0) {
    return children;
  }
  
  return (
    <div 
      className="ability-effect-container"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <div className="ability-effect-tooltip">
          <div className="tooltip-header">
            <h4>{abilityDef.name}</h4>
          </div>
          <div className="tooltip-body">
            <div className="effect-cost">
              {abilityDef.cost?.stamina && (
                <div className="cost-item">
                  <span className="cost-label">Stamina:</span>
                  <span className="cost-value">{abilityDef.cost.stamina}</span>
                </div>
              )}
              {abilityDef.cooldown > 0 && (
                <div className="cost-item">
                  <span className="cost-label">Cooldown:</span>
                  <span className="cost-value">{abilityDef.cooldown} turns</span>
                </div>
              )}
            </div>
            <div className="effect-list">
              {effects.map((effect, index) => (
                <div key={index} className="effect-item">
                  <div className="effect-header">
                    <span className="effect-label">{effect.label}:</span>
                    <span className="effect-value">
                      {effect.type === 'heal' && `${effect.total} HP`}
                      {effect.type === 'damage' && `${effect.total} ${effect.damageType} damage`}
                      {effect.type === 'buff' && 'Active'}
                      {effect.type === 'debuff' && 'Active'}
                    </span>
                  </div>
                  {effect.type === 'heal' && (
                    <div className="effect-breakdown">
                      <div className="breakdown-line">
                        <span>Base:</span>
                        <span>{effect.base} HP</span>
                      </div>
                      {effect.medicLevel > 0 && (
                        <div className="breakdown-line">
                          <span>Medic {effect.medicLevel}:</span>
                          <span>+{((effect.total / effect.base - 1) * 100).toFixed(0)}%</span>
                        </div>
                      )}
                      {effect.intelligence > 10 && (
                        <div className="breakdown-line">
                          <span>INT {effect.intelligence}:</span>
                          <span>+{((effect.total / effect.base - 1) * 100).toFixed(0)}%</span>
                        </div>
                      )}
                    </div>
                  )}
                  {effect.duration > 0 && (
                    <div className="effect-duration">
                      Duration: {effect.duration} turns
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

