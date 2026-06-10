/**
 * Crafting View
 * Interface for crafting items from recipes
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCharacterStore } from '../../state/characterSlice';
import { useInventoryStore } from '../../state/inventorySlice';
import { craftingApi } from '../../services/api/craftingApi';
import { getRarityColor, getRarityName } from '../../utils/itemRarity';
import { notify } from '../../components/hud/NotificationCenter';
import CraftingSuccessTooltip from '../../components/tooltips/CraftingSuccessTooltip';
import './CraftingView.css';

const RECIPE_CATEGORIES = {
  WEAPON: 'weapon',
  ARMOR: 'armor',
  CONSUMABLE: 'consumable',
  TOOL: 'tool',
  ACCESSORY: 'accessory'
};

const CATEGORY_LABELS = {
  [RECIPE_CATEGORIES.WEAPON]: 'Weapons',
  [RECIPE_CATEGORIES.ARMOR]: 'Armor',
  [RECIPE_CATEGORIES.CONSUMABLE]: 'Consumables',
  [RECIPE_CATEGORIES.TOOL]: 'Tools',
  [RECIPE_CATEGORIES.ACCESSORY]: 'Accessories'
};

export default function CraftingView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentCharacter, updateLocation, loadCharacter, setCurrentCharacter } = useCharacterStore();
  const { loadInventory, items } = useInventoryStore();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [craftingQuantity, setCraftingQuantity] = useState(1);
  const [crafting, setCrafting] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [craftSuccess, setCraftSuccess] = useState(null);

  // Get return location info from navigation state
  const returnLocation = location.state;

  useEffect(() => {
    if (currentCharacter?.id) {
      // Load both inventory and recipes
      loadInventory(currentCharacter.id).then(() => {
        loadRecipes();
      }).catch(err => {
        console.error('[CraftingView] Failed to load inventory:', err);
        loadRecipes(); // Still try to load recipes even if inventory fails
      });
    }
  }, [currentCharacter?.id]);

  const loadRecipes = async () => {
    if (!currentCharacter?.id) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await craftingApi.getRecipes(currentCharacter.id);
      if (response.success) {
        setRecipes(response.data || []);
      } else {
        setError(response.message || 'Failed to load recipes');
      }
    } catch (err) {
      console.error('[CraftingView] Failed to load recipes:', err);
      setError(err.message || 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleCraft = async (recipe) => {
    if (!currentCharacter?.id) return;
    if (crafting) return;

    setCrafting(true);
    try {
      const response = await craftingApi.craftItem(
        currentCharacter.id,
        recipe.id,
        craftingQuantity
      );
      
      if (response.success) {
        const craftedItem = response.data;
        
        // Show prominent success notification
        notify(
          `✨ Successfully crafted ${craftedItem.quantity}x ${craftedItem.itemName}!`,
          'success',
          7000
        );
        
        // Show visual success feedback
        setCraftSuccess({
          itemName: craftedItem.itemName,
          quantity: craftedItem.quantity,
          staminaCost: craftedItem.staminaCost || 0,
          remainingStamina: craftedItem.remainingStamina
        });
        
        // Clear success message after animation
        setTimeout(() => setCraftSuccess(null), 3000);
        
        // Update character state immediately (stamina change)
        if (craftedItem.remainingStamina !== undefined) {
          const updatedCharacter = {
            ...currentCharacter.toJSON(),
            currentStamina: craftedItem.remainingStamina
          };
          setCurrentCharacter(updatedCharacter);
        }
        
        // Reload character to get latest data
        try {
          await loadCharacter(currentCharacter.id);
        } catch (err) {
          console.warn('Failed to reload character after crafting:', err);
        }
        
        // Reload inventory
        await loadInventory(currentCharacter.id);
        
        // Reload recipes to update availability
        await loadRecipes();
        
        setSelectedRecipe(null);
        setCraftingQuantity(1);
      } else {
        notify(response.message || 'Failed to craft item', 'error', 5000);
      }
    } catch (err) {
      console.error('[CraftingView] Failed to craft:', err);
      notify(err.message || 'Failed to craft item', 'error', 5000);
    } finally {
      setCrafting(false);
    }
  };

  const handleReturn = async () => {
    console.log('[CraftingView] handleReturn called, returnLocation:', returnLocation);
    
    if (!returnLocation || returnLocation.returnTo !== 'submap') {
      // If no return location, navigate to game world
      console.warn('[CraftingView] No valid return location, navigating to game world');
      navigate('/game');
      return;
    }

    const { planetId, parentLocationId, parentLocationType, subMapId, playerLocation } = returnLocation;
    
    console.log('[CraftingView] Extracted return location data:', {
      planetId,
      parentLocationId,
      parentLocationType,
      subMapId,
      playerLocation,
      hasSubMapId: !!subMapId
    });

    // Restore player position if available
    if (playerLocation && currentCharacter) {
      try {
        await updateLocation(planetId, {
          x: playerLocation.x,
          y: playerLocation.y,
          area: playerLocation.area || 'submap',
          subMapId: playerLocation.subMapId || subMapId,
          parentLocationId: parentLocationId
        });
      } catch (err) {
        console.error('[CraftingView] Failed to restore player position:', err);
      }
    }

    // Navigate back to submap
    // Always use the submap ID route to ensure we load the exact same submap
    if (subMapId) {
      console.log('[CraftingView] Returning to submap:', {
        subMapId,
        planetId,
        parentLocationId,
        playerLocation
      });
      navigate(`/game/submap/${subMapId}`, {
        state: {
          planetId,
          parentLocationId,
          parentLocationType,
          subMapId: subMapId, // Explicitly set in state as backup
          type: returnLocation.type || 'city', // Default type if not provided
          playerLocation: playerLocation,
          returnFromCrafting: true // Flag to prevent regeneration
        }
      });
    } else {
      // Fallback to location route if no subMapId (shouldn't happen, but just in case)
      console.warn('[CraftingView] No subMapId provided, using location route');
      navigate(`/game/location/${planetId}/${encodeURIComponent(parentLocationId)}/${parentLocationType}/city`, {
        state: {
          planetId,
          parentLocationId,
          parentLocationType,
          subMapId: subMapId,
          playerLocation: playerLocation,
          returnFromCrafting: true
        }
      });
    }
  };

  const filteredRecipes = selectedCategory === 'all'
    ? recipes
    : recipes.filter(recipe => recipe.category === selectedCategory);

  const categories = ['all', ...Object.values(RECIPE_CATEGORIES)];

  if (loading) {
    return (
      <div className="crafting-view">
        <div className="loading">Loading recipes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="crafting-view">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="crafting-view">
      <div className="crafting-header">
        <div className="header-content">
          <div>
            <h2>Crafting</h2>
            <p className="crafting-description">
              Use materials from your inventory to craft items. Select a recipe to see requirements.
            </p>
          </div>
          <div className="header-actions">
            {returnLocation?.returnTo === 'submap' && (
              <button
                className="return-button"
                onClick={handleReturn}
                title="Return to previous location"
              >
                ← Return
              </button>
            )}
            <button
              className={`inventory-toggle ${showInventory ? 'active' : ''}`}
              onClick={() => setShowInventory(!showInventory)}
              title={showInventory ? 'Hide Inventory' : 'Show Inventory'}
            >
              {showInventory ? '📦 Hide Inventory' : '📦 View Inventory'}
            </button>
          </div>
        </div>
      </div>

      {showInventory && (
        <div className="crafting-inventory-panel">
          <div className="inventory-panel-header">
            <h3>Your Inventory</h3>
            <button
              className="close-inventory"
              onClick={() => setShowInventory(false)}
              title="Close Inventory"
            >
              ×
            </button>
          </div>
          <div className="inventory-panel-content">
            {items.length === 0 ? (
              <div className="no-items">
                <p>Your inventory is empty.</p>
              </div>
            ) : (
              <div className="inventory-items-grid">
                {items.map((item, index) => {
                  const itemName = item.itemDefinition?.name || item.name || item.itemId?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  const itemRarity = item.itemDefinition?.rarity || item.rarity || 'common';
                  const itemType = item.itemDefinition?.itemType || item.itemType || 'misc';
                  
                  // Always use index in key to ensure uniqueness
                  // This prevents duplicate key warnings even if multiple items share the same itemId
                  const uniqueKey = `inventory-item-${index}`;
                  
                  return (
                    <div
                      key={uniqueKey}
                      className={`inventory-item-card ${itemType === 'resource' ? 'resource' : ''}`}
                    >
                      <div className="item-card-header">
                        <span className="item-name">{itemName}</span>
                        <span className="item-quantity">×{item.quantity || 1}</span>
                      </div>
                      <div className="item-card-info">
                        <span className={`item-rarity rarity-${itemRarity}`}>
                          {itemRarity}
                        </span>
                        {itemType && (
                          <span className="item-type">{itemType}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="crafting-content">
        <div className="crafting-sidebar">
          <h3>Categories</h3>
          <div className="category-filters">
            {categories.map(category => (
              <button
                key={category}
                className={`category-filter ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => {
                  setSelectedCategory(category);
                  setSelectedRecipe(null);
                }}
              >
                {category === 'all' ? 'All' : CATEGORY_LABELS[category] || category}
              </button>
            ))}
          </div>
        </div>

        <div className="crafting-main">
          <div className="recipes-list">
            <h3>Available Recipes ({filteredRecipes.length})</h3>
            {filteredRecipes.length === 0 ? (
              <div className="no-recipes">
                <p>No recipes available in this category.</p>
                <p className="hint">
                  {selectedCategory === 'all' 
                    ? 'You may need to level up or learn skills to unlock recipes.'
                    : 'Try selecting a different category or leveling up your skills.'}
                </p>
              </div>
            ) : (
              <div className="recipes-grid">
                {filteredRecipes.map(recipe => {
                  // Item name will come from API or use itemId as fallback
                  const resultItemName = recipe.result?.itemId?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown Item';
                  
                  return (
                    <div
                      key={recipe.id}
                      className={`recipe-card ${selectedRecipe?.id === recipe.id ? 'selected' : ''} ${!recipe.canCraft ? 'unavailable' : ''}`}
                      onClick={() => setSelectedRecipe(recipe)}
                    >
                      <div className="recipe-header">
                        <h4 className="recipe-name">{recipe.name}</h4>
                        {recipe.unlockLevel && (
                          <span className="recipe-level-req">Lv. {recipe.unlockLevel}+</span>
                        )}
                      </div>
                      <p className="recipe-description">{recipe.description}</p>
                      <div className="recipe-result">
                        <span className="result-label">Creates:</span>
                        <span className="result-item">
                          {resultItemName} × {recipe.result?.quantity || 1}
                        </span>
                      </div>
                      {!recipe.canCraft && recipe.missingMaterials && recipe.missingMaterials.length > 0 && (
                        <div className="recipe-unavailable">
                          Missing materials
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedRecipe && (
            <div className="recipe-details">
              <h3>Recipe Details</h3>
              <div className="recipe-info">
                <div className="recipe-section">
                  <h4>{selectedRecipe.name}</h4>
                  <p>{selectedRecipe.description}</p>
                </div>

                <div className="recipe-section">
                  <h4>Materials Required</h4>
                  <div className="materials-list">
                    {Object.entries(selectedRecipe.materials || {}).map(([materialId, quantity]) => {
                      // Use items from the store hook (reactive)
                      const inventoryItem = items.find(item => item.itemId === materialId);
                      const available = inventoryItem ? inventoryItem.quantity : 0;
                      const hasEnough = available >= quantity;
                      // Check both itemDefinition.name and direct name property
                      const materialName = inventoryItem?.itemDefinition?.name || 
                                         inventoryItem?.name ||
                                         materialId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                      
                      return (
                        <div
                          key={materialId}
                          className={`material-item ${hasEnough ? 'has-enough' : 'missing'}`}
                        >
                          <span className="material-name">
                            {materialName}
                          </span>
                          <span className="material-quantity">
                            {available} / {quantity}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedRecipe.skillRequirement && (
                  <div className="recipe-section">
                    <h4>Skill Requirement</h4>
                    <p>
                      {selectedRecipe.skillRequirement.skillId} Level {selectedRecipe.skillRequirement.level} 
                      {' '}in {selectedRecipe.skillRequirement.tree} tree
                    </p>
                  </div>
                )}

                <div className="recipe-section">
                  <h4>Result</h4>
                  <div className="result-preview">
                    <span className="result-item-name">
                      {selectedRecipe.result?.itemId?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown Item'}
                    </span>
                    <span className="result-quantity">
                      × {selectedRecipe.result?.quantity || 1}
                    </span>
                  </div>
                </div>

                <div className="recipe-actions">
                  <div className="quantity-selector">
                    <label>Quantity:</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={craftingQuantity}
                      onChange={(e) => setCraftingQuantity(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                      disabled={crafting}
                    />
                  </div>
                  {(() => {
                    const staminaCost = 10 + ((selectedRecipe.difficulty || 0) * 5);
                    const totalCost = staminaCost * craftingQuantity;
                    const hasEnoughStamina = (currentCharacter.currentStamina || 0) >= totalCost;
                    
                    return (
                      <div className="craft-button-container">
                        <CraftingSuccessTooltip recipe={selectedRecipe}>
                          <button
                            className={`craft-button ${craftSuccess ? 'craft-success' : ''}`}
                            onClick={() => handleCraft(selectedRecipe)}
                            disabled={!selectedRecipe.canCraft || crafting || !hasEnoughStamina}
                          >
                            {crafting ? 'Crafting...' : `Craft Item${totalCost > 0 ? ` (${totalCost} ⚡)` : ''}`}
                          </button>
                        </CraftingSuccessTooltip>
                        {craftSuccess && (
                          <div className="craft-success-message">
                            <div className="success-icon">✨</div>
                            <div className="success-text">
                              <div className="success-title">Crafting Successful!</div>
                              <div className="success-details">
                                Created {craftSuccess.quantity}x {craftSuccess.itemName}
                                {craftSuccess.staminaCost > 0 && (
                                  <span className="stamina-cost"> (-{craftSuccess.staminaCost} ⚡)</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

