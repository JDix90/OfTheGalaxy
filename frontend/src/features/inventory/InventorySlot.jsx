/**
 * Inventory Slot
 * Individual slot in the inventory grid
 */

import React from 'react';
import { getRarityColor, getRarityBorderColor } from '../../utils/itemRarity';
import './InventorySlot.css';

// Pick an icon from the item's type / equipment slot so the grid is readable at a
// glance instead of a wall of identical boxes.
function getItemIcon(item) {
  if (!item) return '📦';
  const slot = item.equipmentSlot;
  const type = (item.itemType || item.type || '').toLowerCase();
  const id = (item.itemId || '').toLowerCase();
  if (id.includes('medpac') || id.includes('stimpack') || id.includes('medical') || id.includes('scanner')) return '💉';
  if (slot === 'weapon' || type === 'weapon') return id.includes('blade') || id.includes('sword') ? '🗡️' : '🔫';
  if (slot === 'armor' || type === 'armor') return '🛡️';
  if (slot === 'accessory') return '💠';
  if (slot === 'tool') return '🔧';
  if (type === 'consumable') return '🧪';
  if (type === 'quest_item' || type === 'quest') return '❗';
  if (type === 'resource') return '🪨';
  if (id.includes('datapad') || id.includes('slicer') || type === 'tech') return '💾';
  if (type === 'junk') return '🗑️';
  return '📦';
}

export default function InventorySlot({ item, slotIndex, onHover, onLeave, onClick, onEquipShortcut, onContextMenu }) {
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
    // Double-click is a shortcut to equip directly (single-click only inspects).
    if (item && item.equipmentSlot && !item.equipped && onEquipShortcut) {
      onEquipShortcut(item, e);
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
      title={item ? `${item.name || item.itemId}${isEquippable ? ' — click to inspect, double-click to equip' : ' — click to inspect'}` : ''}
      data-tutorial-target={item ? tutorialTarget : undefined}
    >
      {item && (
        <>
          <div className="item-icon">
            <span className="item-icon-placeholder">{getItemIcon(item)}</span>
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


