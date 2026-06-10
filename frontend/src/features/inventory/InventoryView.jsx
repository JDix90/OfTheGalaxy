/**
 * Inventory View
 * Main inventory management interface
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventoryStore } from '../../state/inventorySlice';
import { useCharacterStore } from '../../state/characterSlice';
import { getRarityColor, getRarityName } from '../../utils/itemRarity';
import InventoryGrid from './InventoryGrid';
import EquipmentPanel from './EquipmentPanel';
import './InventoryView.css';

export default function InventoryView() {
  const navigate = useNavigate();
  const { currentCharacter } = useCharacterStore();
  const { items, equipped, setBonuses, loadInventory, loading, error } = useInventoryStore();
  const [filter, setFilter] = useState('all');
  const [rarityFilter, setRarityFilter] = useState(null);

  useEffect(() => {
    if (currentCharacter) {
      loadInventory(currentCharacter.id);
    }
  }, [currentCharacter]);

  if (!currentCharacter) {
    return (
      <div className="inventory-view">
        <div className="error">No character selected</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="inventory-view">
        <div className="loading">Loading inventory...</div>
      </div>
    );
  }

  const calculateWeight = (items) => {
    // Placeholder - items don't have weight yet
    return items.length * 1; // Assume 1 unit per item for now
  };

  const maxWeight = currentCharacter.getCarryWeight ? currentCharacter.getCarryWeight() : 50;

  const filteredItems = items.filter(item => {
    // Type filter
    if (filter !== 'all') {
      const itemType = item.itemType || item.type;
      if (filter === 'weapons' && itemType !== 'weapon') return false;
      if (filter === 'armor' && itemType !== 'armor') return false;
      if (filter === 'consumables' && itemType !== 'consumable') return false;
      if (filter === 'misc' && !['resource', 'quest_item', 'junk'].includes(itemType)) return false;
    }
    
    // Rarity filter
    if (rarityFilter && item.rarity !== rarityFilter) {
      return false;
    }
    
    return true;
  });

  return (
    <div className="inventory-view">
      <div className="inventory-header">
        <div className="header-info">
          <h1>Inventory</h1>
          <div className="inventory-stats">
            <span>Items: {items.length}</span>
            <span>Weight: {calculateWeight(items)} / {maxWeight}</span>
            <span>Credits: {currentCharacter.credits || 0}</span>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={() => navigate('/game')} className="back-button">
            ← Back to Game
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      <div className="inventory-content">
        <div className="inventory-left">
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
          <EquipmentPanel equipped={equipped} setBonuses={setBonuses} />
        </div>
      </div>
    </div>
  );
}


