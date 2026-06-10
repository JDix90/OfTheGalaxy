/**
 * Turn Order Component
 * Displays the turn order for combat
 */

import React from 'react';
import './TurnOrder.css';

export default function TurnOrder({ turnOrder, combatants, currentTurn }) {
  if (!turnOrder || turnOrder.length === 0) return null;

  const getCombatant = (combatantId) => {
    return combatants.find(c => c.id === combatantId);
  };

  return (
    <div className="turn-order" data-tutorial-target="combat-turn-order">
      <h3>Turn Order</h3>
      <div className="turn-order-list">
        {turnOrder.map((combatantId, index) => {
          const combatant = getCombatant(combatantId);
          if (!combatant) return null;

          const isCurrent = index === currentTurn;
          const isPlayer = combatant.type === 'player';

          return (
            <div
              key={combatantId}
              className={`turn-order-item ${isCurrent ? 'current' : ''} ${isPlayer ? 'player' : 'enemy'}`}
            >
              <div className="turn-order-indicator">
                {isCurrent && <span className="current-indicator">→</span>}
                <span className="turn-number">{index + 1}</span>
              </div>
              <div className="turn-order-info">
                <span className="turn-order-name">{combatant.name}</span>
                <span className="turn-order-type">{isPlayer ? 'Player' : 'Enemy'}</span>
              </div>
              <div className="turn-order-stats">
                <span className="turn-order-health">
                  {combatant.stats.health}/{combatant.stats.maxHealth} HP
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


