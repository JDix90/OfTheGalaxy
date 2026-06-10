/**
 * Inventory Overlay Component
 * Modal overlay for inventory management with tabs for Items and Resources
 */

import React, { useEffect, useState } from 'react';
import { useInventoryStore } from '../../state/inventorySlice';
import { useCharacterStore } from '../../state/characterSlice';
import { getRarityColor } from '../../utils/itemRarity';
import InventoryGrid from '../../features/inventory/InventoryGrid';
import EquipmentPanel from '../../features/inventory/EquipmentPanel';
import { tutorialEventBus, TUTORIAL_EVENTS } from '../../services/tutorialEventBus';
import './InventoryOverlay.css';

export default function InventoryOverlay({ isOpen, onClose }) {
  const { currentCharacter } = useCharacterStore();
  const { items, equipped, loadInventory, loading } = useInventoryStore();
  const [activeTab, setActiveTab] = useState('items'); // 'items' or 'resources'
  const [filter, setFilter] = useState('all');
  const [rarityFilter, setRarityFilter] = useState(null);

  useEffect(() => {
    if (isOpen && currentCharacter) {
      loadInventory(currentCharacter.id);
      
      // Emit tutorial event when inventory is opened
      tutorialEventBus.emit(TUTORIAL_EVENTS.UI_OPENED_INVENTORY, {
        characterId: currentCharacter.id,
        timestamp: new Date().toISOString()
      });
    }
  }, [isOpen, currentCharacter, loadInventory]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Separate items and resources
  const regularItems = items.filter(item => {
    const itemType = item.itemType || item.type || '';
    return itemType !== 'resource';
  });

  const resources = items.filter(item => {
    const itemType = item.itemType || item.type || '';
    return itemType === 'resource';
  });

  // Filter items based on active tab and filters
  const getFilteredItems = () => {
    if (activeTab === 'resources') {
      return resources.filter(item => {
        if (rarityFilter && item.rarity !== rarityFilter) {
          return false;
        }
        return true;
      });
    } else {
      return regularItems.filter(item => {
        // Type filter
        if (filter !== 'all') {
          const itemType = item.itemType || item.type;
          if (filter === 'weapons' && itemType !== 'weapon') return false;
          if (filter === 'armor' && itemType !== 'armor') return false;
          if (filter === 'consumables' && itemType !== 'consumable') return false;
          if (filter === 'misc' && !['quest_item', 'junk'].includes(itemType)) return false;
        }
        
        // Rarity filter
        if (rarityFilter && item.rarity !== rarityFilter) {
          return false;
        }
        
        return true;
      });
    }
  };

  const filteredItems = getFilteredItems();

  const calculateWeight = (items) => {
    return items.reduce((total, item) => {
      const weight = item.weight || item.itemDefinition?.weight || 0;
      const quantity = item.quantity || 1;
      return total + (weight * quantity);
    }, 0);
  };

  const maxWeight = currentCharacter?.getCarryWeight ? currentCharacter.getCarryWeight() : 50;
  const totalWeight = calculateWeight(items);

  return (
    <div className="inventory-overlay" onClick={onClose}>
      <div className="inventory-overlay-content" onClick={(e) => e.stopPropagation()}>
        <div className="inventory-overlay-header">
          <div className="header-info">
            <h2>Inventory</h2>
            <div className="inventory-stats">
              <span>Items: {regularItems.length}</span>
              <span>Resources: {resources.length}</span>
              <span>Weight: {totalWeight.toFixed(1)} / {maxWeight}</span>
              <span>Credits: {currentCharacter?.credits || 0}</span>
            </div>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="inventory-overlay-tabs">
          <button
            className={`tab-button ${activeTab === 'items' ? 'active' : ''}`}
            onClick={() => setActiveTab('items')}
          >
            📦 Items
          </button>
          <button
            className={`tab-button ${activeTab === 'resources' ? 'active' : ''}`}
            onClick={() => setActiveTab('resources')}
          >
            💎 Resources
          </button>
        </div>

        {loading ? (
          <div className="inventory-loading">Loading inventory...</div>
        ) : (
          <div className="inventory-overlay-body">
            <div className="inventory-left">
              {activeTab === 'items' && (
                <div className="filter-section">
                  <h3>Filter by Type</h3>
                  <div className="filter-buttons">
                    <button
                      className={filter === 'all' ? 'active' : ''}
                      onClick={() => setFilter('all')}
                    >
                      All
                    </button>
                    <button
                      className={filter === 'weapons' ? 'active' : ''}
                      onClick={() => setFilter('weapons')}
                    >
                      Weapons
                    </button>
                    <button
                      className={filter === 'armor' ? 'active' : ''}
                      onClick={() => setFilter('armor')}
                    >
                      Armor
                    </button>
                    <button
                      className={filter === 'consumables' ? 'active' : ''}
                      onClick={() => setFilter('consumables')}
                    >
                      Consumables
                    </button>
                    <button
                      className={filter === 'misc' ? 'active' : ''}
                      onClick={() => setFilter('misc')}
                    >
                      Misc
                    </button>
                  </div>
                </div>
              )}

              <div className="filter-section">
                <h3>Filter by Rarity</h3>
                <div className="filter-buttons rarity-filters">
                  <button
                    className={rarityFilter === null ? 'active' : ''}
                    onClick={() => setRarityFilter(null)}
                  >
                    All
                  </button>
                  <button
                    className={rarityFilter === 'common' ? 'active' : ''}
                    onClick={() => setRarityFilter('common')}
                    style={{ borderColor: getRarityColor('common') }}
                  >
                    Common
                  </button>
                  <button
                    className={rarityFilter === 'uncommon' ? 'active' : ''}
                    onClick={() => setRarityFilter('uncommon')}
                    style={{ borderColor: getRarityColor('uncommon') }}
                  >
                    Uncommon
                  </button>
                  <button
                    className={rarityFilter === 'rare' ? 'active' : ''}
                    onClick={() => setRarityFilter('rare')}
                    style={{ borderColor: getRarityColor('rare') }}
                  >
                    Rare
                  </button>
                  <button
                    className={rarityFilter === 'epic' ? 'active' : ''}
                    onClick={() => setRarityFilter('epic')}
                    style={{ borderColor: getRarityColor('epic') }}
                  >
                    Epic
                  </button>
                  <button
                    className={rarityFilter === 'legendary' ? 'active' : ''}
                    onClick={() => setRarityFilter('legendary')}
                    style={{ borderColor: getRarityColor('legendary') }}
                  >
                    Legendary
                  </button>
                </div>
              </div>

              <InventoryGrid items={filteredItems} />
            </div>
            <div className="inventory-right">
              {activeTab === 'items' && <EquipmentPanel equipped={equipped} />}
              {activeTab === 'resources' && (
                <div className="resources-info-panel">
                  <h3>Resources</h3>
                  <p className="resources-description">
                    Resources are materials gathered from planets. They can be used for crafting, trading, or quest completion.
                  </p>
                  <div className="resources-summary">
                    <div className="summary-item">
                      <span className="summary-label">Total Resources:</span>
                      <span className="summary-value">{resources.length}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Unique Types:</span>
                      <span className="summary-value">
                        {new Set(resources.map(r => r.itemId || r.id)).size}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

