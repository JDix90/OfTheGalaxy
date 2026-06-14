/**
 * Trading View Component
 * Main UI for vendor trading (buy/sell items)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../../state/characterSlice';
import { useInventoryStore } from '../../state/inventorySlice';
import { vendorApi } from '../../services/api/vendorApi';
import { npcApi } from '../../services/api/npcApi';
import { addTutorialTarget, TUTORIAL_TARGETS } from '../../services/tutorialTargetRegistry';
import { tutorialEventBus, TUTORIAL_EVENTS } from '../../services/tutorialEventBus';
import TutorialOverlay from '../../components/tutorial/TutorialOverlay';
import { formatDisplayName } from '../../utils/formatName';
import { pushToast } from '../../state/toastSlice';
import { getTierLabel } from '../../utils/factionTiers';
import './TradingView.css';

/**
 * Itemized price modifier rows from a price breakdown, expressed from the
 * player's perspective on the final price (cheaper to buy / more to sell = good).
 */
function PriceBreakdown({ breakdown, isBuy }) {
  if (!breakdown) return null;
  const rows = [];
  // A positive modifier fraction `d` always favors the player (lower buy price /
  // higher sell payout). The displayed sign reflects price direction, which is
  // inverted between buying and selling.
  const fmt = (d) => {
    const pct = Math.round(Math.abs(d) * 100);
    const sign = isBuy ? (d > 0 ? '−' : '+') : (d > 0 ? '+' : '−');
    return `${sign}${pct}%`;
  };
  const good = (d) => d > 0;
  // Only surface a modifier if it rounds to at least 1% — avoids noisy "−0%" rows.
  const meaningful = (d) => Math.round(Math.abs(d) * 100) >= 1;

  if (meaningful(breakdown.charismaPct)) rows.push({ key: 'cha', label: 'Charisma', value: breakdown.charismaPct });
  if (meaningful(breakdown.relationshipPct)) rows.push({ key: 'rel', label: 'Relationship', value: breakdown.relationshipPct });
  if (meaningful(breakdown.factionPct)) {
    rows.push({
      key: 'fac',
      label: `Standing${breakdown.factionTier ? ` · ${getTierLabel(breakdown.factionTier)}` : ''}`,
      value: breakdown.factionPct
    });
  }
  if (rows.length === 0) return null;

  return (
    <div className="price-breakdown">
      <div className="price-line subtle">
        <span>Base</span>
        <span>{breakdown.base} cr</span>
      </div>
      {rows.map((r) => (
        <div className={`price-line subtle ${good(r.value) ? 'mod-good' : 'mod-bad'}`} key={r.key}>
          <span>{r.label}</span>
          <span>{fmt(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function TradingView() {
  const { npcId } = useParams();
  const navigate = useNavigate();
  const { currentCharacter } = useCharacterStore();
  const { items, loadInventory } = useInventoryStore();
  
  const [vendorInventory, setVendorInventory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [priceQuote, setPriceQuote] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('buy'); // 'buy' or 'sell'
  const [npc, setNpc] = useState(null);
  const tradingViewRef = useRef(null);
  const itemListRef = useRef(null);

  useEffect(() => {
    if (npcId && currentCharacter) {
      loadData();
    }
  }, [npcId, currentCharacter]);

  useEffect(() => {
    if (currentCharacter) {
      loadInventory(currentCharacter.id);
    }
  }, [currentCharacter]);

  // Add tutorial targets
  useEffect(() => {
    if (tradingViewRef.current) {
      addTutorialTarget(tradingViewRef.current, TUTORIAL_TARGETS.VENDOR_VIEW);
    }
    if (itemListRef.current) {
      addTutorialTarget(itemListRef.current, TUTORIAL_TARGETS.VENDOR_ITEM_LIST);
    }
  }, [vendorInventory]);

  // Emit vendor opened event
  useEffect(() => {
    if (vendorInventory && currentCharacter) {
      tutorialEventBus.emit(TUTORIAL_EVENTS.UI_OPENED_VENDOR, {
        npcId: npcId,
        vendorId: npcId,
        characterId: currentCharacter.id
      });
    }
  }, [vendorInventory, npcId, currentCharacter]);

  useEffect(() => {
    if (selectedItem && currentCharacter && activeTab) {
      loadPriceQuote();
    }
  }, [selectedItem, quantity, activeTab, currentCharacter]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Load NPC data
      const npcResponse = await npcApi.getWithRelationship(npcId, currentCharacter.id);
      const npcData = npcResponse.data?.npc || npcResponse.data?.data?.npc || npcResponse.data;
      setNpc(npcData);
      
      // Load vendor inventory
      const vendorResponse = await vendorApi.getVendorInventory(npcId);
      const inventory = vendorResponse.data || vendorResponse;
      setVendorInventory(inventory);
    } catch (err) {
      console.error('Failed to load vendor data:', err);
      setError(err.message || 'Failed to load vendor');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPriceQuote = async () => {
    if (!selectedItem || !currentCharacter) return;
    
    try {
      let quote;
      if (activeTab === 'buy') {
        quote = await vendorApi.getBuyPrice(npcId, selectedItem.itemId, currentCharacter.id, quantity);
      } else {
        quote = await vendorApi.getSellPrice(npcId, selectedItem.itemId, currentCharacter.id, quantity);
      }
      setPriceQuote(quote.data || quote);
    } catch (err) {
      console.error('Failed to load price quote:', err);
      setPriceQuote(null);
    }
  };

  const handleBuy = async () => {
    if (!selectedItem || !currentCharacter) return;

    try {
      setIsLoading(true);
      const result = await vendorApi.buyItem(npcId, currentCharacter.id, selectedItem.itemId, quantity);
      const purchaseResult = result.data || result;
      
      // Emit tutorial event for item bought
      tutorialEventBus.emit(TUTORIAL_EVENTS.ITEM_BOUGHT, {
        itemId: selectedItem.itemId,
        itemName: purchaseResult.item.name,
        quantity: quantity,
        totalCost: purchaseResult.totalCost,
        characterId: currentCharacter.id,
        npcId: npcId
      });
      
      // Reload data
      await loadData();
      await loadInventory(currentCharacter.id);
      
      // Refresh character data to update credits
      const { loadCharacter } = useCharacterStore.getState();
      if (loadCharacter) {
        await loadCharacter(currentCharacter.id);
      }
      
      pushToast({ type: 'success', message: `Purchased ${quantity}× ${purchaseResult.item.name} for ${purchaseResult.totalCost} credits` });
      setSelectedItem(null);
      setQuantity(1);
    } catch (err) {
      pushToast({ type: 'error', message: `Couldn't buy item: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSell = async () => {
    if (!selectedItem || !currentCharacter) return;
    
    try {
      setIsLoading(true);
      const result = await vendorApi.sellItem(npcId, currentCharacter.id, selectedItem.itemId, quantity);
      const saleResult = result.data || result;
      
      // Emit tutorial event for item sold
      // Check if this is a tutorial vendor and the item is droid_parts (tutorial item)
      const isTutorialVendor = npcId && npcId.startsWith('npc_tutorial_');
      const isTutorialItem = selectedItem.itemId === 'droid_parts';
      tutorialEventBus.emit(TUTORIAL_EVENTS.ITEM_SOLD, {
        itemId: selectedItem.itemId,
        itemName: saleResult.item.name,
        quantity: quantity,
        totalValue: saleResult.totalValue,
        characterId: currentCharacter.id,
        npcId: npcId,
        isTutorial: isTutorialVendor && isTutorialItem
      });
      
      // Reload data
      await loadData();
      await loadInventory(currentCharacter.id);
      
      // Refresh character data to update credits
      const { loadCharacter } = useCharacterStore.getState();
      if (loadCharacter) {
        await loadCharacter(currentCharacter.id);
      }
      
      pushToast({ type: 'success', message: `Sold ${quantity}× ${saleResult.item.name} for ${saleResult.totalValue} credits` });
      setSelectedItem(null);
      setQuantity(1);
    } catch (err) {
      pushToast({ type: 'error', message: `Couldn't sell item: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !vendorInventory) {
    return (
      <div className="trading-view">
        <div className="trading-loading">Loading vendor...</div>
      </div>
    );
  }

  if (error || !vendorInventory) {
    return (
      <div className="trading-view">
        <div className="trading-error">
          <p>{error || 'Vendor not found'}</p>
          <button onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    );
  }

  if (!currentCharacter) {
    return (
      <div className="trading-view">
        <div className="trading-error">
          <p>No character selected</p>
          <button onClick={() => navigate('/character/select')}>Select Character</button>
        </div>
      </div>
    );
  }

  const playerItems = items.filter(item => !item.equipped);

  const handleItemHover = (item) => {
    // Emit tutorial event for item hover
    tutorialEventBus.emit(TUTORIAL_EVENTS.ITEM_HOVERED, {
      itemId: item.itemId || item.id,
      itemName: item.itemDefinition?.name || item.itemId || item.id,
      characterId: currentCharacter?.id,
      npcId: npcId
    });
  };

  return (
    <div className="trading-view" ref={tradingViewRef} data-tutorial-target={TUTORIAL_TARGETS.VENDOR_VIEW}>
      <div className="trading-header">
        <div className="vendor-info">
          <h1>{vendorInventory.vendorName || npc?.name || 'Vendor'}</h1>
          <p className="vendor-subtitle">Trading Post</p>
        </div>
        <div className="player-credits">
          <span className="credits-label">Credits:</span>
          <span className="credits-value">{currentCharacter.credits || 0}</span>
        </div>
        <button className="close-button" onClick={() => navigate(-1)}>×</button>
      </div>

      <div className="trading-content">
        <div className="trading-tabs">
          <button
            className={`tab-button ${activeTab === 'buy' ? 'active' : ''}`}
            data-tutorial-target={TUTORIAL_TARGETS.VENDOR_BUY_TAB}
            onClick={() => {
              setActiveTab('buy');
              setSelectedItem(null);
              setQuantity(1);
            }}
          >
            Buy
          </button>
          <button
            className={`tab-button ${activeTab === 'sell' ? 'active' : ''}`}
            data-tutorial-target={TUTORIAL_TARGETS.VENDOR_SELL_TAB}
            onClick={() => {
              setActiveTab('sell');
              setSelectedItem(null);
              setQuantity(1);
            }}
          >
            Sell
          </button>
        </div>

        <div className="trading-panels">
          {/* Item List Panel */}
          <div className="item-list-panel">
            <h3>{activeTab === 'buy' ? 'Vendor Inventory' : 'Your Inventory'}</h3>
            <div className="item-list" ref={itemListRef} data-tutorial-target={TUTORIAL_TARGETS.VENDOR_ITEM_LIST}>
              {activeTab === 'buy' ? (
                vendorInventory.items && vendorInventory.items.length > 0 ? (
                  vendorInventory.items.map((vendorItem, index) => (
                    <div
                      key={`${vendorItem.itemId}-${index}`}
                      className={`item-card ${selectedItem?.itemId === vendorItem.itemId ? 'selected' : ''}`}
                      data-tutorial-target={vendorItem.itemId === 'medpac_01' ? 'vendor-item-medpac' : `vendor-item-${vendorItem.itemId}`}
                      onClick={() => {
                        setSelectedItem(vendorItem);
                        setQuantity(1);
                      }}
                      onMouseEnter={() => handleItemHover(vendorItem)}
                    >
                      <div className="item-name">
                        {vendorItem.itemDefinition?.name || formatDisplayName(vendorItem.itemId)}
                      </div>
                      <div className="item-details">
                        <span className="item-quantity">
                          Qty: {vendorItem.quantity === -1 || vendorItem.quantity === null ? 'Unlimited' : vendorItem.quantity}
                        </span>
                        {(vendorItem.buyPrice ?? vendorItem.itemDefinition?.value) && (
                          <span className="item-value">
                            {vendorItem.buyPrice ?? vendorItem.itemDefinition.value} credits
                          </span>
                        )}
                      </div>
                      {vendorItem.itemDefinition?.description && (
                        <div className="item-description">
                          {vendorItem.itemDefinition.description}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="empty-list">No items available</div>
                )
              ) : (
                playerItems.length > 0 ? (
                  playerItems.map((item) => (
                    <div
                      key={item.id}
                      className={`item-card ${selectedItem?.itemId === item.itemId ? 'selected' : ''}`}
                      data-tutorial-target={item.itemId === 'droid_parts' ? 'vendor-item-droid-parts' : `vendor-item-${item.itemId}`}
                      onClick={() => {
                        setSelectedItem(item);
                        setQuantity(1);
                      }}
                      onMouseEnter={() => handleItemHover(item)}
                    >
                      <div className="item-name">{item.itemDefinition?.name || formatDisplayName(item.itemId)}</div>
                      <div className="item-details">
                        <span className="item-quantity">Qty: {item.quantity}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-list">No items to sell</div>
                )
              )}
            </div>
          </div>

          {/* Transaction Panel */}
          <div className="transaction-panel">
            {selectedItem ? (
              <>
                <h3>Transaction Details</h3>
                <div className="selected-item-info">
                  <div className="selected-item-name">
                    {selectedItem.itemDefinition?.name || formatDisplayName(selectedItem.itemId)}
                  </div>
                  
                  {/* Item Description */}
                  {activeTab === 'buy' && selectedItem.itemDefinition?.description && (
                    <div className="item-description-trade">
                      {selectedItem.itemDefinition.description}
                    </div>
                  )}
                  
                  {/* Faction Requirements */}
                  {activeTab === 'buy' && (selectedItem.itemDefinition?.factionId || selectedItem.itemDefinition?.minReputationTier) && (
                    <div className="faction-requirement-trade">
                      <div className="requirement-label">Faction Requirement:</div>
                      <div className="requirement-details">
                        {selectedItem.itemDefinition.factionId && (
                          <div className="requirement-line">
                            <span>Faction:</span>
                            <span className="faction-name">
                              {formatDisplayName(selectedItem.itemDefinition.factionId)}
                            </span>
                          </div>
                        )}
                        {selectedItem.itemDefinition.minReputationTier && (
                          <div className="requirement-line">
                            <span>Reputation:</span>
                            <span className="reputation-tier">
                              {selectedItem.itemDefinition.minReputationTier}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="quantity-selector">
                    <label>Quantity:</label>
                    <input
                      type="number"
                      min="1"
                      max={activeTab === 'buy' 
                        ? (selectedItem.quantity === -1 || selectedItem.quantity === null ? undefined : selectedItem.quantity)
                        : selectedItem.quantity}
                      value={quantity}
                      onChange={(e) => {
                        const newQty = parseInt(e.target.value) || 1;
                        if (activeTab === 'buy') {
                          // For unlimited stock, allow any quantity
                          if (selectedItem.quantity === -1 || selectedItem.quantity === null) {
                            setQuantity(Math.max(1, newQty));
                          } else {
                            const maxQty = selectedItem.quantity;
                            setQuantity(Math.max(1, Math.min(newQty, maxQty)));
                          }
                        } else {
                          const maxQty = selectedItem.quantity;
                          setQuantity(Math.max(1, Math.min(newQty, maxQty)));
                        }
                      }}
                    />
                  </div>

                  {priceQuote && (
                    <div className="price-quote">
                      <PriceBreakdown breakdown={priceQuote.breakdown} isBuy={activeTab === 'buy'} />
                      <div className="price-line">
                        <span>Unit Price:</span>
                        <span>{priceQuote.unitPrice} credits</span>
                      </div>
                      <div className="price-line total">
                        <span>Total:</span>
                        <span>
                          {activeTab === 'buy' ? priceQuote.totalCost : priceQuote.totalValue} credits
                        </span>
                      </div>
                      {activeTab === 'buy' && priceQuote.canAfford === false && (
                        <div className="price-warning">
                          Insufficient credits!
                        </div>
                      )}
                    </div>
                  )}

                  <div className="transaction-actions">
                    {activeTab === 'buy' ? (
                      <button
                        className="btn-primary buy-button"
                        data-tutorial-target={TUTORIAL_TARGETS.VENDOR_BUY_BUTTON}
                        onClick={handleBuy}
                        disabled={isLoading || (priceQuote && !priceQuote.canAfford)}
                      >
                        {isLoading ? 'Processing...' : `Buy ${quantity}x`}
                      </button>
                    ) : (
                      <button
                        className="btn-primary sell-button"
                        data-tutorial-target={TUTORIAL_TARGETS.VENDOR_SELL_BUTTON}
                        onClick={handleSell}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Processing...' : `Sell ${quantity}x`}
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="no-selection">
                <p>Select an item to {activeTab === 'buy' ? 'buy' : 'sell'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <TutorialOverlay />
    </div>
  );
}

