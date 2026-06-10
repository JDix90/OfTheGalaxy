/**
 * Inventory Grid
 * Displays items in a grid layout
 */

import React, { useState, useEffect } from 'react';
import { useInventoryStore } from '../../state/inventorySlice';
import { useCharacterStore } from '../../state/characterSlice';
import InventorySlot from './InventorySlot';
import ItemTooltip from './ItemTooltip';
import './InventoryGrid.css';

export default function InventoryGrid({ items }) {
  const [hoveredItem, setHoveredItem] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const { equipItem, useItem, unequipItem, loadInventory } = useInventoryStore();
  const { currentCharacter } = useCharacterStore();

  // Clear tooltip when inventory overlay is closed
  useEffect(() => {
    const checkInventoryOpen = () => {
      const inventoryOverlay = document.querySelector('.inventory-overlay');
      if (!inventoryOverlay || inventoryOverlay.style.display === 'none') {
        setHoveredItem(null);
      }
    };

    // Check periodically if inventory is closed
    const interval = setInterval(checkInventoryOpen, 100);
    
    return () => clearInterval(interval);
  }, []);

  const GRID_COLS = 8;
  const GRID_ROWS = 6;
  const TOTAL_SLOTS = GRID_COLS * GRID_ROWS;

  // Create array of slots (filled with items or empty)
  const slots = Array(TOTAL_SLOTS).fill(null).map((_, index) => {
    return items[index] || null;
  });

  const handleSlotHover = (item, event) => {
    if (item) {
      setHoveredItem(item);
      setHoverPosition({
        x: event.clientX,
        y: event.clientY
      });
    } else {
      setHoveredItem(null);
    }
  };

  const handleSlotLeave = () => {
    // Don't clear tooltip on mouse leave - let it persist
    // Tooltip will close when:
    // - User clicks a different item (handleSlotClick)
    // - User clicks the X button (onClose in ItemTooltip)
    // - User uses the item (onClose in ItemTooltip after useItem)
    // - Inventory is closed (useEffect watching inventory overlay)
  };

  const handleSlotClick = async (item, event) => {
    if (!item || !currentCharacter) return;

    // Show tooltip on click (for consumables and other items)
    // This allows the player to see item info and use the "Use" button
    setHoveredItem(item);
    setHoverPosition({
      x: event.clientX,
      y: event.clientY
    });

    const itemType = item.itemType || item.type || 'misc';
    
    // Don't auto-use consumables on click - let the tooltip's "Use" button handle it
    // Clicking on an item should just show the tooltip with item info and action buttons
    // If item is equippable and not already equipped, equip it (double-click behavior)
    if (item.equipmentSlot && !item.equipped) {
      try {
        await equipItem(currentCharacter.id, item.itemId, item.equipmentSlot);
        // Reload inventory to update UI
        await loadInventory(currentCharacter.id);
        // Clear hovered item to refresh tooltip
        setHoveredItem(null);
      } catch (error) {
        console.error('Failed to equip item:', error);
      }
    }
    // For consumables, clicking just shows the tooltip (no auto-use)
    // The tooltip will have a "Use" button that the player can click
  };

  const handleSlotContextMenu = async (item, event) => {
    event.preventDefault();
    if (!item || !currentCharacter) return;

    // Right-click to unequip if item is equipped
    if (item.equipped && item.equipmentSlot) {
      try {
        await unequipItem(currentCharacter.id, item.itemId);
        // Reload inventory to update UI
        await loadInventory(currentCharacter.id);
        // Clear hovered item to refresh tooltip
        setHoveredItem(null);
      } catch (error) {
        console.error('Failed to unequip item:', error);
      }
    }
  };

  const handleEquipFromTooltip = async (item) => {
    // Reload inventory after equipping
    if (currentCharacter) {
      await loadInventory(currentCharacter.id);
      setHoveredItem(null);
    }
  };

  return (
    <div className="inventory-grid-container">
      <div className="inventory-grid">
        {slots.map((item, index) => (
          <InventorySlot
            key={index}
            item={item}
            slotIndex={index}
            onHover={handleSlotHover}
            onLeave={handleSlotLeave}
            onClick={handleSlotClick}
            onContextMenu={handleSlotContextMenu}
          />
        ))}
      </div>
      {hoveredItem && (
        <ItemTooltip
          item={hoveredItem}
          position={hoverPosition}
          onEquip={handleEquipFromTooltip}
          onClose={() => setHoveredItem(null)}
        />
      )}
    </div>
  );
}


