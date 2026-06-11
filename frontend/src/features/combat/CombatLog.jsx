/**
 * Combat Log Component
 * Displays action history and combat messages
 */

import React, { useEffect, useRef } from 'react';
import './CombatLog.css';

export default function CombatLog({ encounter, actionHistory = [] }) {
  const logEndRef = useRef(null);

  useEffect(() => {
    // Auto-scroll to bottom when new actions are added
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [actionHistory]);

  const getCombatantName = (combatantId) => {
    const combatant = encounter?.combatants?.find(c => c.id === combatantId);
    return combatant?.name || combatantId;
  };

  const formatActionMessage = (action) => {
    if (!action) return '';

    switch (action.type) {
      case 'attack':
        const attackerName = getCombatantName(action.attacker);
        const targetName = getCombatantName(action.target);
        if (action.hit) {
          if (action.critical) {
            return `💥 ${attackerName} critically hit ${targetName} for ${action.damage} damage!`;
          }
          return `⚔️ ${attackerName} hit ${targetName} for ${action.damage} damage`;
        }
        if (action.dodged) {
          return `✨ ${targetName} dodged ${attackerName}'s attack`;
        }
        return `❌ ${attackerName} missed ${targetName}`;

      case 'defend':
        const defenderName = getCombatantName(action.combatant);
        return `🛡️ ${defenderName} takes a defensive stance`;

      case 'use_item':
        const userName = getCombatantName(action.combatant);
        const itemName = action.itemId?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'item';
        return `💊 ${userName} used ${itemName}`;

      case 'flee':
        if (action.success) {
          return `🏃 ${getCombatantName(action.combatant)} successfully fled`;
        }
        return `❌ ${getCombatantName(action.combatant)} failed to flee`;

      default:
        return action.message || `${action.type} action`;
    }
  };

  return (
    <div className="combat-log">
      <h3>Combat Log</h3>
      <div className="combat-log-content">
        {actionHistory.length === 0 ? (
          <div className="log-entry">Combat started...</div>
        ) : (
          actionHistory.map((action, index) => (
            <div key={index} className="log-entry">
              {formatActionMessage(action)}
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}


