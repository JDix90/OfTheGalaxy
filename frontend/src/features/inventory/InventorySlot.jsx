/**
 * Inventory Slot
 * Individual slot in the inventory grid
 */

import React from 'react';
import { getRarityColor, getRarityBorderColor } from '../../utils/itemRarity';
import './InventorySlot.css';

export default function InventorySlot({ item, slotIndex, onHover, onLeave, onClick, onContextMenu }) {
  const handleMouseEnter = (e) => {
    if (item) {
      onHover(item, e);
    }
  };

  const handleMouseLeave = () => {
    onLeave();
  };

  const handleClick = (e) => {
    if (item && onClick) {
      onClick(item, e);
    }
  };

  const handleContextMenu = (e) => {
    if (item && onContextMenu) {
      e.preventDefault();
      onContextMenu(item, e);
    }
  };

  const handleDoubleClick = (e) => {
    // Double-click to equip if item is equippable
    if (item && item.equipmentSlot && !item.equipped && onClick) {
      onClick(item, e);
    }
  };

  const rarityBorderColor = item?.rarity ? getRarityBorderColor(item.rarity) : null;
  const isEquippable = item?.equipmentSlot && !item.equipped;
  
  // Add tutorial target attribute for medpac
  const isMedpac = item?.itemId === 'medpac_01';
  const tutorialTarget = isMedpac ? 'inventory-item-medpac' : `inventory-item-${item?.itemId || slotIndex}`;
  
  return (
    <div
      className={`inventory-slot ${item ? 'filled' : 'empty'} ${item?.rarity ? `rarity-${item.rarity}` : ''} ${isEquippable ? 'equippable' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      style={rarityBorderColor ? { borderColor: rarityBorderColor, borderWidth: '2px' } : {}}
      title={isEquippable ? `Double-click to equip ${item.name || item.itemId}` : ''}
      data-tutorial-target={item ? tutorialTarget : undefined}
    >
      {item && (
        <>
          <div className="item-icon">
            {/* Placeholder icon - would use actual item icon */}
            <span className="item-icon-placeholder">📦</span>
          </div>
          {item.quantity > 1 && (
            <div className="item-quantity">{item.quantity}</div>
          )}
          {item.equipped && (
            <div className="equipped-indicator">✓</div>
          )}
          {isEquippable && (
            <div className="equippable-indicator" title="Equippable">⚔️</div>
          )}
        </>
      )}
    </div>
  );
}


