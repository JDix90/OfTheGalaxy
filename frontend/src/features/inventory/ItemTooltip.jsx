/**
 * Item Tooltip
 * Displays item information on hover with equip functionality
 */

import React, { useRef, useState, useLayoutEffect } from 'react';
import { useSettingsStore } from '../../state/settingsSlice';
import { useInventoryStore } from '../../state/inventorySlice';
import { useCharacterStore } from '../../state/characterSlice';
import { getRarityColor, getRarityName } from '../../utils/itemRarity';
import { getEffectsDisplay } from '../../utils/effectDefinitions';
import { getSetForItem } from '../../utils/itemSets';
import { formatDisplayName } from '../../utils/formatName';
import './ItemTooltip.css';

export default function ItemTooltip({ item, position, onEquip, onClose }) {
  const tooltipsEnabled = useSettingsStore(state => state.getSetting('gameplay', 'tooltips'));
  const { equipItem, useItem, unequipItem } = useInventoryStore();
  const { currentCharacter } = useCharacterStore();

  // Keep the panel fully on-screen: measure it after render and clamp/flip so it never spills past a
  // viewport edge (the raw cursor position would clip a panel opened near the right/bottom of the
  // screen — e.g. an item in the last grid column). Positioned in a layout effect (before paint) so
  // there's no visible jump; hidden until measured.
  const tooltipRef = useRef(null);
  const [coords, setCoords] = useState({ left: 0, top: 0, ready: false });
  const px = position?.x ?? 0;
  const py = position?.y ?? 0;
  useLayoutEffect(() => {
    const el = tooltipRef.current;
    if (!el) return;
    const M = 12; // viewport margin + cursor offset
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let left = px + M;
    if (left + w > vw - M) left = px - w - M; // flip to the left of the cursor on right-edge overflow
    left = Math.max(M, Math.min(left, vw - w - M));
    let top = py + M;
    if (top + h > vh - M) top = vh - h - M;   // lift up on bottom-edge overflow
    top = Math.max(M, top);
    setCoords({ left, top, ready: true });
  }, [px, py, item?.itemId, item?.quantity]);

  if (!item || !tooltipsEnabled) return null;

  const isEquippable = item.equipmentSlot && !item.equipped;
  const itemType = item.itemType || item.type || 'misc';
  const stats = item.stats || {};

  const handleEquip = async (e) => {
    e.stopPropagation();
    if (!currentCharacter || !isEquippable) return;
    
    try {
      await equipItem(currentCharacter.id, item.itemId, item.equipmentSlot);
      if (onEquip) {
        onEquip(item);
      }
    } catch (error) {
      console.error('Failed to equip item:', error);
      // Show error message to user
      const errorMessage = error.response?.data?.message || error.message || 'Failed to equip item';
      alert(errorMessage);
    }
  };

  const getSlotLabel = (slot) => {
    const labels = {
      weapon: 'Weapon',
      armor: 'Armor',
      accessory: 'Accessory',
      tool: 'Tool'
    };
    return labels[slot] || slot;
  };

  return (
    <div
      ref={tooltipRef}
      className="item-tooltip"
      style={{
        left: `${coords.left}px`,
        top: `${coords.top}px`,
        // Hide for the first frame (before the layout-effect measure) so it never flashes at an
        // unclamped spot.
        visibility: coords.ready ? 'visible' : 'hidden'
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={(e) => e.stopPropagation()}
      onMouseLeave={(e) => e.stopPropagation()}
    >
      <div className="tooltip-header">
        <h4>{item.name || formatDisplayName(item.itemId)}</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {item.equipped && <span className="equipped-badge">Equipped</span>}
          {item.rarity && (
            <span 
              className="rarity-badge"
              style={{ 
                color: getRarityColor(item.rarity),
                borderColor: getRarityColor(item.rarity)
              }}
            >
              {getRarityName(item.rarity)}
            </span>
          )}
          {onClose && (
            <button
              className="tooltip-close-button"
              onClick={(e) => {
                e.stopPropagation();
                if (onClose) onClose();
              }}
              title="Close"
            >
              ×
            </button>
          )}
        </div>
      </div>
      <div className="tooltip-body">
        {item.description && (
          <div className="tooltip-section">
            <p className="item-description">{item.description}</p>
          </div>
        )}
        
        {item.equipmentSlot && (
          <div className="tooltip-section">
            <p className="equipment-slot-info">
              <strong>Slot:</strong> {getSlotLabel(item.equipmentSlot)}
            </p>
          </div>
        )}

        {/* Item Stats */}
        {Object.keys(stats).length > 0 && (
          <div className="tooltip-section">
            <p className="tooltip-stats-label"><strong>Stats:</strong></p>
            <div className="tooltip-stats">
              {stats.damage !== undefined && (
                <div className="stat-line">
                  <span>Damage:</span>
                  <span className="stat-value">+{stats.damage}</span>
                </div>
              )}
              {stats.defense !== undefined && (
                <div className="stat-line">
                  <span>Defense:</span>
                  <span className="stat-value">+{stats.defense}</span>
                </div>
              )}
              {stats.accuracy !== undefined && (
                <div className="stat-line">
                  <span>Accuracy:</span>
                  <span className="stat-value">{stats.accuracy}%</span>
                </div>
              )}
              {stats.range !== undefined && (
                <div className="stat-line">
                  <span>Range:</span>
                  <span className="stat-value">{stats.range}</span>
                </div>
              )}
              {stats.mobility !== undefined && (
                <div className="stat-line">
                  <span>Mobility:</span>
                  <span className="stat-value">{stats.mobility > 0 ? '+' : ''}{stats.mobility}</span>
                </div>
              )}
              {stats.healthRestore !== undefined && (
                <div className="stat-line">
                  <span>Restores Health:</span>
                  <span className="stat-value">+{stats.healthRestore}</span>
                </div>
              )}
              {stats.staminaRestore !== undefined && (
                <div className="stat-line">
                  <span>Restores Stamina:</span>
                  <span className="stat-value">+{stats.staminaRestore}</span>
                </div>
              )}
              {stats.fullHeal && (
                <div className="stat-line">
                  <span>Effect:</span>
                  <span className="stat-value">Full Heal</span>
                </div>
              )}
              {stats.useSpeed && (
                <div className="stat-line">
                  <span>Use Speed:</span>
                  <span className="stat-value">
                    {stats.useSpeed === 'instant' ? 'Instant' : stats.useSpeed === 'fast' ? 'Fast' : 'Normal'}
                  </span>
                </div>
              )}
              {stats.temporaryShield && (
                <div className="stat-line">
                  <span>Temporary Shield:</span>
                  <span className="stat-value">+{stats.temporaryShield} ({Math.floor(stats.duration / 60)}m)</span>
                </div>
              )}
              {stats.temporaryAccuracy && (
                <div className="stat-line">
                  <span>Temporary Accuracy:</span>
                  <span className="stat-value">+{stats.temporaryAccuracy} ({Math.floor(stats.duration / 60)}m)</span>
                </div>
              )}
              {stats.temporaryDamage && (
                <div className="stat-line">
                  <span>Temporary Damage:</span>
                  <span className="stat-value">+{stats.temporaryDamage} ({Math.floor(stats.duration / 60)}m)</span>
                </div>
              )}
              {stats.temporaryStealth && (
                <div className="stat-line">
                  <span>Temporary Stealth:</span>
                  <span className="stat-value">+{stats.temporaryStealth} ({Math.floor(stats.duration / 60)}m)</span>
                </div>
              )}
            </div>
          </div>
        )}

        {item.quantity > 1 && (
          <div className="tooltip-section">
            <p>Quantity: {item.quantity}</p>
          </div>
        )}
        {item.acquiredFrom && (
          <div className="tooltip-section">
            <p className="acquired-from">Acquired from: {item.acquiredFrom}</p>
          </div>
        )}
        
        {/* Faction Requirements */}
        {(item.factionId || item.minReputationTier) && (
          <div className="tooltip-section">
            <p className="faction-requirement">
              <strong>Faction Requirement:</strong>
            </p>
            <div className="faction-details">
              {item.factionId && (
                <div className="faction-line">
                  <span>Faction:</span>
                  <span className="faction-name">{formatDisplayName(item.factionId)}</span>
                </div>
              )}
              {item.minReputationTier && (
                <div className="faction-line">
                  <span>Reputation:</span>
                  <span className="reputation-tier">{item.minReputationTier}</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Item Set Information */}
        {(() => {
          const itemSet = getSetForItem(item.itemId);
          if (itemSet) {
            return (
              <div className="tooltip-section">
                <p className="item-set-label">
                  <strong>Set: {itemSet.name}</strong>
                </p>
                <p className="item-set-description">{itemSet.description}</p>
                <div className="item-set-pieces">
                  <p className="set-pieces-label">Set Pieces ({itemSet.pieces.length}):</p>
                  <ul className="set-pieces-list">
                    {itemSet.pieces.map((pieceId, index) => {
                      const isThisItem = pieceId === item.itemId;
                      return (
                        <li 
                          key={index} 
                          className={`set-piece ${isThisItem ? 'current-item' : ''}`}
                        >
                          {isThisItem ? '✓ ' : '○ '}
                          {pieceId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="item-set-bonuses">
                  <p className="set-bonuses-label">Set Bonuses:</p>
                  {Object.entries(itemSet.bonuses).map(([pieceCount, bonus]) => (
                    <div key={pieceCount} className="set-bonus">
                      <span className="bonus-tier">{pieceCount}-piece:</span>
                      <span className="bonus-description">{bonus.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          return null;
        })()}
        
        {/* Special Effects */}
        {item.specialEffects && Array.isArray(item.specialEffects) && item.specialEffects.length > 0 && (
          <div className="tooltip-section">
            <p className="special-effects-label">
              <strong>Special Effects:</strong>
            </p>
            <div className="special-effects-list">
              {getEffectsDisplay(item.specialEffects).map((effect, index) => (
                <div key={index} className="special-effect-item" title={effect.description}>
                  <span className="effect-icon">{effect.icon}</span>
                  <span className="effect-name">{effect.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="tooltip-actions">
        {isEquippable && currentCharacter && (
          <button 
            className="equip-button"
            onClick={handleEquip}
            title={`Equip to ${getSlotLabel(item.equipmentSlot)} slot`}
          >
            ⚔️ Equip
          </button>
        )}
        {itemType === 'consumable' && currentCharacter && (
          <button 
            className="use-button"
            onClick={async (e) => {
              e.stopPropagation();
              if (!currentCharacter) return;
              
              try {
                await useItem(currentCharacter.id, item.itemId);
                if (onEquip) {
                  onEquip(item);
                }
                // Close tooltip after using item
                if (onClose) {
                  onClose();
                }
              } catch (error) {
                console.error('Failed to use item:', error);
                const errorMessage = error.response?.data?.message || error.message || 'Failed to use item';
                alert(errorMessage);
              }
            }}
            title="Use item"
          >
            💉 Use
          </button>
        )}
        {item.equipped && currentCharacter && (
          <button 
            className="unequip-button"
            onClick={async (e) => {
              e.stopPropagation();
              if (!currentCharacter) return;
              
              try {
                await unequipItem(currentCharacter.id, item.itemId);
                if (onEquip) {
                  onEquip(item);
                }
              } catch (error) {
                console.error('Failed to unequip item:', error);
                const errorMessage = error.response?.data?.message || error.message || 'Failed to unequip item';
                alert(errorMessage);
              }
            }}
            title="Unequip item"
          >
            🚫 Unequip
          </button>
        )}
      </div>
    </div>
  );
}

