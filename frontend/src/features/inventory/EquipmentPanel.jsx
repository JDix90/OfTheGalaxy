/**
 * Equipment Panel
 * Displays equipped items
 */

import React from 'react';
import { useInventoryStore } from '../../state/inventorySlice';
import { useCharacterStore } from '../../state/characterSlice';
import { getSetDisplay, formatSetBonus } from '../../utils/itemSets';
import './EquipmentPanel.css';

export default function EquipmentPanel({ equipped, setBonuses = {} }) {
  const { unequipItem } = useInventoryStore();
  const { currentCharacter } = useCharacterStore();

  const equipmentSlots = [
    { id: 'weapon', label: 'Weapon', icon: '⚔️' },
    { id: 'armor', label: 'Armor', icon: '🛡️' },
    { id: 'accessory', label: 'Accessory', icon: '💍' },
    { id: 'tool', label: 'Tool', icon: '🔧' }
  ];

  const getEquippedItem = (slot) => {
    return equipped.find(item => item.equipmentSlot === slot);
  };

  const handleUnequip = async (itemId) => {
    if (!currentCharacter) return;
    
    try {
      await unequipItem(currentCharacter.id, itemId);
    } catch (error) {
      console.error('Failed to unequip item:', error);
    }
  };

  return (
    <div className="equipment-panel">
      <h3>Equipment</h3>
      <div className="equipment-slots">
        {equipmentSlots.map(slot => {
          const item = getEquippedItem(slot.id);
          return (
            <div key={slot.id} className="equipment-slot">
              <div className="slot-label">
                <span className="slot-icon">{slot.icon}</span>
                <span>{slot.label}</span>
              </div>
              <div className={`slot-content ${item ? 'filled' : 'empty'}`}>
                {item ? (
                  <>
                    <div className="equipped-item">
                      <span className="item-name">{item.itemId}</span>
                      {item.quantity > 1 && (
                        <span className="item-quantity">x{item.quantity}</span>
                      )}
                    </div>
                    <button
                      className="unequip-button"
                      onClick={() => handleUnequip(item.itemId)}
                      title="Unequip"
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <span className="empty-slot-text">Empty</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Active Set Bonuses */}
      {Object.keys(setBonuses).length > 0 && (
        <div className="set-bonuses-section">
          <h4>Active Set Bonuses</h4>
          {Object.values(setBonuses).map((setBonus) => {
            const setInfo = getSetDisplay(setBonus.setId);
            if (!setInfo) return null;
            
            return (
              <div key={setBonus.setId} className="active-set-bonus">
                <div className="set-bonus-header">
                  <span className="set-name">{setBonus.setName}</span>
                  <span className="set-progress">
                    {setBonus.pieceCount}/{setBonus.totalPieces} pieces
                  </span>
                </div>
                <div className="set-bonus-description">
                  {setBonus.bonus.description}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


