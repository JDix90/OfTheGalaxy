/**
 * Action Menu Component
 * Displays available actions for the player's turn
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useInventoryStore } from '../../state/inventorySlice';
import { useCharacterStore } from '../../state/characterSlice';
import { getAvailableCombatAbilities } from '../../utils/combatAbilities';
import GameIcon from '../../components/common/GameIcon';
import './ActionMenu.css';

export default function ActionMenu({
  combatant,
  targets,
  selectedTarget,
  onSelectTarget,
  onAction,
  isLoading = false
}) {
  const { currentCharacter } = useCharacterStore();
  const { items, loadInventory } = useInventoryStore();
  const [showItemMenu, setShowItemMenu] = useState(false);
  const [showAbilityMenu, setShowAbilityMenu] = useState(false);

  // Load inventory when component mounts
  useEffect(() => {
    if (currentCharacter?.id) {
      loadInventory(currentCharacter.id);
    }
  }, [currentCharacter?.id, loadInventory]);

  // Filter for medpac specifically (medpac_01)
  const medpacItems = items.filter(item => {
    const itemId = item.itemId || '';
    const itemType = item.itemType || item.type || '';
    return itemId === 'medpac_01' || 
           (itemType === 'consumable' && (itemId.includes('medpac') || itemId.includes('medpack')));
  });

  // Get available combat abilities
  const availableAbilities = useMemo(() => {
    if (!currentCharacter || !combatant) return [];
    return getAvailableCombatAbilities(currentCharacter, combatant);
  }, [currentCharacter, combatant]);

  const handleAttack = () => {
    if (!selectedTarget) {
      alert('Please select a target first');
      return;
    }
    onAction('attack', selectedTarget);
  };

  const handleDefend = () => {
    onAction('defend');
  };

  const handleUseItem = (itemId) => {
    // Consumable items (like medpacs) should always target the player, not the selected enemy
    // The target should always be the player's combatant ID
    onAction('use_item', combatant.id, { itemId });
    setShowItemMenu(false);
  };

  const handleAbility = (abilityId) => {
    const target = selectedTarget || null;
    onAction('ability', target, { abilityId });
    setShowAbilityMenu(false);
  };

  const handleFlee = () => {
    if (window.confirm('Are you sure you want to attempt to flee?')) {
      onAction('flee');
    }
  };

  return (
    <div className="action-menu">
      <h3>Your Turn - Choose an Action</h3>

      {/* Target Selection */}
      {targets.length > 0 && (
        <div className="target-selection">
          <label>Select Target:</label>
          <div className="target-buttons">
            {targets.map((target) => (
              <button
                key={target.id}
                className={`target-button ${selectedTarget === target.id ? 'selected' : ''}`}
                onClick={() => onSelectTarget(target.id)}
                disabled={target.stats.health <= 0}
              >
                {target.name} ({target.stats.health}/{target.stats.maxHealth} HP)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons" data-tutorial-target="combat-action-menu">
        <button
          className="action-btn attack-btn"
          onClick={handleAttack}
          disabled={isLoading || !selectedTarget || targets.length === 0}
        >
          <GameIcon name="attack" size={16} /> Attack
        </button>

        <button
          className="action-btn defend-btn"
          onClick={handleDefend}
          disabled={isLoading}
        >
          <GameIcon name="defend" size={16} /> Defend
        </button>

        <div className="action-dropdown">
          <button
            className="action-btn item-btn"
            onClick={() => {
              setShowItemMenu(!showItemMenu);
              setShowAbilityMenu(false);
            }}
            disabled={isLoading || medpacItems.length === 0}
          >
            <GameIcon name="item" size={16} /> Use Item {showItemMenu ? '▼' : '▶'}
          </button>
          {showItemMenu && medpacItems.length > 0 && (
            <div className="dropdown-menu">
              {medpacItems.map((item) => (
                <button
                  key={item.id || item.itemId}
                  className="dropdown-item"
                  onClick={() => handleUseItem(item.itemId)}
                  title={`Restores 50 health. You have ${item.quantity} available.`}
                >
                  Medpac (x{item.quantity || 1})
                </button>
              ))}
            </div>
          )}
          {showItemMenu && medpacItems.length === 0 && (
            <div className="dropdown-menu">
              <div className="dropdown-item disabled">
                No Medpacs available
              </div>
            </div>
          )}
        </div>

        <div className="action-dropdown">
          <button
            className="action-btn ability-btn"
            onClick={() => {
              setShowAbilityMenu(!showAbilityMenu);
              setShowItemMenu(false);
            }}
            disabled={isLoading || availableAbilities.length === 0}
          >
            <GameIcon name="ability" size={16} /> Ability {showAbilityMenu ? '▼' : '▶'} {availableAbilities.length > 0 && `(${availableAbilities.length})`}
          </button>
          {showAbilityMenu && (
            <div className="dropdown-menu">
              {availableAbilities.length > 0 ? (
                availableAbilities.map((ability) => {
                  const isAvailable = ability.available?.available !== false;
                  const staminaCost = ability.cost?.stamina || 0;
                  const cooldown = ability.cooldown || 0;
                  const cooldownTurns = combatant?.abilityCooldowns?.[ability.id] || 0;
                  
                  return (
                    <button
                      key={ability.id}
                      className={`dropdown-item ${!isAvailable ? 'disabled' : ''}`}
                      onClick={() => {
                        if (isAvailable) {
                          // For self-target abilities, don't require a target
                          if (ability.targetType === 'self') {
                            handleAbility(ability.id);
                          } else if (ability.targetType === 'ally' && combatant) {
                            // For ally abilities, target self
                            handleAbility(ability.id);
                          } else if (selectedTarget || ability.targetType === 'self') {
                            handleAbility(ability.id);
                          } else {
                            alert('Please select a target first');
                          }
                        }
                      }}
                      disabled={!isAvailable || isLoading}
                      title={
                        !isAvailable 
                          ? ability.available?.reason || 'Ability unavailable'
                          : `${ability.description}\nCost: ${staminaCost} Stamina${cooldown > 0 ? `\nCooldown: ${cooldown} turns` : ''}${cooldownTurns > 0 ? `\nOn cooldown: ${cooldownTurns} turns` : ''}`
                      }
                    >
                      <span className="ability-icon">{ability.icon || '✨'}</span>
                      <span className="ability-name">{ability.name}</span>
                      <span className="ability-cost">
                        {staminaCost > 0 && `⚡${staminaCost}`}
                        {cooldownTurns > 0 && ` ⏱️${cooldownTurns}`}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="dropdown-item disabled">
                  No abilities available
                </div>
              )}
            </div>
          )}
        </div>

        <button
          className="action-btn flee-btn"
          onClick={handleFlee}
          disabled={isLoading}
        >
          <GameIcon name="flee" size={16} /> Flee
        </button>
      </div>

      {isLoading && (
        <div className="action-loading">Processing action...</div>
      )}
    </div>
  );
}

