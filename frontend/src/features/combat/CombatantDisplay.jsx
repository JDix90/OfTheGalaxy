/**
 * Combatant Display Component
 * Displays individual combatant (player or enemy) with stats
 */

import React from 'react';
import { getEffectsDisplay } from '../../utils/effectDefinitions';
import './CombatantDisplay.css';

export default function CombatantDisplay({
  combatant,
  isPlayer = false,
  isCompanion = false,
  isCurrentTurn = false,
  isSelected = false,
  onSelect = null
}) {
  if (!combatant) return null;

  const healthPercent = (combatant.stats.health / combatant.stats.maxHealth) * 100;
  const staminaPercent = (combatant.stats.stamina / combatant.stats.maxStamina) * 100;

  const handleClick = () => {
    if (onSelect && !isPlayer) {
      onSelect(combatant.id);
    }
  };

  const combatantType = isPlayer ? 'player' : isCompanion ? 'companion' : 'enemy';

  return (
    <div
      className={`combatant-display ${combatantType} ${isCurrentTurn ? 'current-turn' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
      data-tutorial-target={combatantType === 'enemy' ? 'combat-enemy-combatant' : undefined}
    >
      <div className="combatant-header">
        <h3 className="combatant-name">{combatant.name}</h3>
        {combatant.type === 'enemy' && combatant.tier && combatant.tier !== 'normal' && (
          <span className={`tier-badge tier-${combatant.tier}`}>{combatant.tier}</span>
        )}
        {isCurrentTurn && <span className="turn-indicator">Current Turn</span>}
      </div>

      <div className="combatant-stats">
        {/* Health Bar */}
        <div className="stat-bar health-bar">
          <div className="stat-label">
            <span>Health</span>
            <span className="stat-value">
              {combatant.stats.health} / {combatant.stats.maxHealth}
            </span>
          </div>
          <div className="stat-bar-fill">
            <div
              className="stat-bar-progress"
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>

        {/* Stamina Bar */}
        <div className="stat-bar stamina-bar">
          <div className="stat-label">
            <span>Stamina</span>
            <span className="stat-value">
              {combatant.stats.stamina} / {combatant.stats.maxStamina}
            </span>
          </div>
          <div className="stat-bar-fill">
            <div
              className="stat-bar-progress"
              style={{ width: `${staminaPercent}%` }}
            />
          </div>
        </div>

        {/* Combat Stats */}
        <div className="combat-stats-grid">
          <div className="stat-item">
            <span className="stat-name">Attack</span>
            <span className="stat-number">{combatant.stats.attack}</span>
          </div>
          <div className="stat-item">
            <span className="stat-name">Defense</span>
            <span className="stat-number">{combatant.stats.defense}</span>
          </div>
          <div className="stat-item">
            <span className="stat-name">Speed</span>
            <span className="stat-number">{combatant.stats.speed}</span>
          </div>
          <div className="stat-item">
            <span className="stat-name">Accuracy</span>
            <span className="stat-number">{combatant.stats.accuracy}%</span>
          </div>
        </div>

        {/* Equipment */}
        {combatant.equipment && (
          <div className="combatant-equipment">
            {combatant.equipment.weapon && (
              <div className="equipment-item">
                <span className="equipment-label">Weapon:</span>
                <span className="equipment-name">
                  {combatant.equipment.weapon.itemId?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'None'}
                </span>
              </div>
            )}
            {combatant.equipment.armor && (
              <div className="equipment-item">
                <span className="equipment-label">Armor:</span>
                <span className="equipment-name">
                  {combatant.equipment.armor.itemId?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'None'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Status Effects */}
        {combatant.statusEffects && combatant.statusEffects.length > 0 && (
          <div className="status-effects">
            <div className="status-effects-label">Status Effects:</div>
            {combatant.statusEffects.map((effect, index) => (
              <span key={index} className="status-effect">
                {effect.type}
              </span>
            ))}
          </div>
        )}

        {/* Special Effects (from equipped items) */}
        {combatant.activeEffects && combatant.activeEffects.length > 0 && (
          <div className="special-effects">
            <div className="special-effects-label">Special Effects:</div>
            {combatant.activeEffects.map((effect, index) => {
              const effectDisplay = getEffectsDisplay([effect.id || effect.name])[0];
              return (
                <span 
                  key={index} 
                  className="special-effect"
                  title={effectDisplay.description || effect.description}
                >
                  <span className="effect-icon">{effectDisplay.icon}</span>
                  <span className="effect-name">{effectDisplay.name || effect.name}</span>
                </span>
              );
            })}
          </div>
        )}

        {/* Temporary Effects (from consumables) */}
        {combatant.temporaryEffects && combatant.temporaryEffects.length > 0 && (
          <div className="temporary-effects">
            <div className="temporary-effects-label">Temporary Effects:</div>
            {combatant.temporaryEffects
              .filter(effect => effect.duration > 0)
              .map((effect, index) => {
                const effectIcons = {
                  shield: '🛡️',
                  accuracy: '🎯',
                  damage: '⚔️',
                  stealth: '👤'
                };
                const effectNames = {
                  shield: 'Shield',
                  accuracy: 'Accuracy',
                  damage: 'Damage',
                  stealth: 'Stealth'
                };
                const durationSeconds = Math.ceil(effect.duration);
                const durationMinutes = Math.floor(durationSeconds / 60);
                const durationSecs = durationSeconds % 60;
                const durationText = durationMinutes > 0 
                  ? `${durationMinutes}m ${durationSecs}s`
                  : `${durationSecs}s`;
                
                return (
                  <span 
                    key={index} 
                    className="temporary-effect"
                    title={`${effectNames[effect.type] || effect.type}: +${effect.value} (${durationText} remaining)`}
                  >
                    {effectIcons[effect.type] || '✨'} {effectNames[effect.type] || effect.type} +{effect.value} ({durationText})
                  </span>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}


