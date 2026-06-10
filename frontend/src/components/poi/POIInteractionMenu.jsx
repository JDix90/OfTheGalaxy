/**
 * POI Interaction Menu Component
 * Context menu for interacting with Points of Interest
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../../state/characterSlice';
import { useCombatStore } from '../../state/combatSlice';
import { useDiscoveryStore } from '../../state/discoverySlice';
import { useInventoryStore } from '../../state/inventorySlice';
import poiApi from '../../services/api/poiApi';
import { notify } from '../hud/NotificationCenter';
import InvestigationModal from './InvestigationModal';
import { tutorialEventBus, TUTORIAL_EVENTS } from '../../services/tutorialEventBus';
import { addTutorialTarget, TUTORIAL_TARGETS } from '../../services/tutorialTargetRegistry';
import './POIInteractionMenu.css';

export default function POIInteractionMenu({ poi, planet, isOpen, onClose, position }) {
  const navigate = useNavigate();
  const { currentCharacter } = useCharacterStore();
  const { startEncounter } = useCombatStore();
  const { recordDiscovery } = useDiscoveryStore();
  const { loadInventory } = useInventoryStore();
  const [loading, setLoading] = useState(false);
  const [interactionState, setInteractionState] = useState('undiscovered');
  const [availableActions, setAvailableActions] = useState([]);
  const [investigationModalOpen, setInvestigationModalOpen] = useState(false);
  const [investigationLore, setInvestigationLore] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (isOpen && currentCharacter && poi && planet) {
      loadPOIState();
      determineAvailableActions();
    }
  }, [isOpen, currentCharacter, poi, planet]);

  // Add tutorial targets
  useEffect(() => {
    if (menuRef.current && isOpen) {
      addTutorialTarget(menuRef.current, TUTORIAL_TARGETS.POI_INTERACTION_MENU);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && currentCharacter && poi && planet && availableActions.length > 0) {
      // Emit POI menu opened event for tutorial
      tutorialEventBus.emit(TUTORIAL_EVENTS.POI_MENU_OPENED, {
        poiId: poi.id || poi.name,
        poiName: poi.name,
        poiType: poi.type,
        location: 'planet_surface',
        planetId: planet.id,
        characterId: currentCharacter.id,
        availableActions: availableActions.map(a => a.type),
        timestamp: new Date().toISOString()
      });
      
      // Emit fast travel option shown if available
      if (poi.type === 'spaceport' && availableActions.some(a => a.type === 'fast_travel')) {
        tutorialEventBus.emit(TUTORIAL_EVENTS.FAST_TRAVEL_OPTION_SHOWN, {
          poiId: poi.id || poi.name,
          poiName: poi.name,
          poiType: poi.type,
          location: 'planet_surface',
          planetId: planet.id,
          characterId: currentCharacter.id,
          timestamp: new Date().toISOString()
        });
      }
    }
  }, [isOpen, currentCharacter, poi, planet, availableActions]);

  const loadPOIState = async () => {
    if (!currentCharacter || !poi || !planet) return;

    try {
      const poiId = poi.id || poi.name;
      const response = await poiApi.getState(currentCharacter.id, planet.id, poiId);
      if (response.data && response.data.data) {
        setInteractionState(response.data.data.state);
      }
    } catch (error) {
      console.error('Failed to load POI state:', error);
    }
  };

  const determineAvailableActions = () => {
    if (!poi) return;

    const actions = [];
    const poiType = poi.type;
    
    // Check if POI is a dungeon (by type or metadata)
    const isDungeon = poiType === 'danger' || 
                       poiType === 'mine' || 
                       poiType === 'underworld' || 
                       poiType === 'cave' || 
                       poiType === 'ruins' || 
                       poiType === 'fortress' ||
                       (poi.metadata && poi.metadata.isDungeon === true) ||
                       (poi.dangerLevel && poi.dangerLevel >= 6);

    // Determine available actions based on POI type and state
    if (isDungeon) {
      // Dungeon POIs: Enter or Investigate
      actions.push({ type: 'enter', label: 'Enter Dungeon', icon: '⚔️' });
      actions.push({ type: 'investigate', label: 'Investigate', icon: '🔎' });
    } else if (poiType === 'danger' || poiType === 'base' || poiType === 'pirate' || poiType === 'hostile') {
      if (interactionState !== 'completed') {
        actions.push({ type: 'combat', label: 'Enter (Combat)', icon: '⚔️' });
      }
    } else if (poiType === 'ruins' || poiType === 'wreck' || poiType === 'cache') {
      if (interactionState !== 'searched') {
        actions.push({ type: 'loot', label: 'Search', icon: '🔍' });
      }
      actions.push({ type: 'investigate', label: 'Investigate', icon: '🔎' });
    } else if (poiType === 'temple' || poiType === 'government' || poiType === 'palace') {
      actions.push({ type: 'quest', label: 'Enter', icon: '🏛️' });
      actions.push({ type: 'investigate', label: 'Investigate', icon: '🔎' });
    } else if (poiType === 'spaceport') {
      actions.push({ type: 'fast_travel', label: 'Fast Travel', icon: '🚀' });
      actions.push({ type: 'enter', label: 'Enter', icon: '🚪' });
    } else if (poiType === 'medical_center') {
      actions.push({ type: 'medical', label: 'Heal', icon: '⚕️' });
      actions.push({ type: 'enter', label: 'Enter', icon: '🚪' });
    } else if (poiType === 'market' || poiType === 'cantina' || poiType === 'entertainment') {
      actions.push({ type: 'enter', label: 'Enter', icon: '🚪' });
    } else if (poiType === 'settlement' || poiType === 'province') {
      actions.push({ type: 'enter', label: 'Enter', icon: '🚪' });
      actions.push({ type: 'investigate', label: 'Investigate', icon: '🔎' });
    } else if (poiType === 'wilderness') {
      // Wilderness areas can be entered if they contain settlements or important locations
      actions.push({ type: 'enter', label: 'Enter', icon: '🚪' });
      actions.push({ type: 'investigate', label: 'Investigate', icon: '🔎' });
    } else {
      actions.push({ type: 'investigate', label: 'Investigate', icon: '🔎' });
      actions.push({ type: 'discovery', label: 'Explore', icon: '🗺️' });
    }

    setAvailableActions(actions);
  };

  const handleAction = async (actionType) => {
    if (!currentCharacter || !poi || !planet || loading) return;

    setLoading(true);

    try {
      console.log('POI Interaction:', { actionType, poi: poi.name, poiType: poi.type });
      
      const result = await poiApi.interact(
        currentCharacter.id,
        planet.id,
        poi,
        actionType
      );

      console.log('POI Interaction Response:', result);

      // Handle different response structures
      const data = result?.data?.data || result?.data || result;
      
      // If the response doesn't have a success field, assume it succeeded if we got data
      // For 409 Conflict (resource already exists), treat as success since the resource exists
      const isSuccess = data?.success !== false && (data?.success === true || data !== null);
      
      // Don't show notifications for enter/quest actions - they navigate instead
      const shouldShowNotification = !['enter', 'quest', 'investigate'].includes(actionType);

      if (isSuccess) {
        // Handle different action results
        if (actionType === 'combat' && data.combatEncounter) {
          // Navigate to combat
          const encounter = await startEncounter(
            currentCharacter.id,
            'poi',
            data.combatEncounter.combatants?.filter(c => c.type === 'enemy').map(e => e.name) || []
          );
          if (encounter && encounter.id) {
            navigate(`/game/combat/${encounter.id}`);
          }
        } else if (actionType === 'loot' && data.rewards) {
          // Show loot rewards
          notify({
            type: 'success',
            title: 'Loot Found',
            message: `Found ${data.rewards.credits} credits and ${data.rewards.items.length} items`
          });
        } else if (actionType === 'medical' && data.rewards) {
          // Show healing result
          notify({
            type: 'success',
            title: 'Healed',
            message: data.message || `Restored ${data.rewards.healthRestored} health for ${data.rewards.cost} credits`
          });
          // Reload character to update health
          if (currentCharacter) {
            const { loadCharacter } = useCharacterStore.getState();
            await loadCharacter(currentCharacter.id);
          }
        } else if (actionType === 'discovery') {
          // Record discovery and navigate to submap (Explore = Enter for cities/default POIs)
          // Record discovery before entering
          if (currentCharacter?.id) {
            try {
              // Determine discovery type based on POI type
              const discoveryType = poi.type === 'city' ? 'city' : 'poi'; // Markets are POIs
              const discoveryId = poi.type === 'city' 
                ? `city_${poi.name}` 
                : poi.type === 'market' 
                ? `market_${poi.name}` 
                : `poi_${poi.name}_${poi.type}`;
              
              await recordDiscovery(
                currentCharacter.id,
                planet.id,
                discoveryType,
                discoveryId,
                {
                  locationName: poi.name,
                  metadata: { type: poi.type, description: poi.description }
                }
              );
            } catch (err) {
              console.warn('Failed to record discovery:', err);
            }
          }
          
          // Navigate to submap (same as enter action)
          // Check if this is a dungeon POI
          const isDungeon = poi.type === 'danger' || 
                            poi.type === 'mine' || 
                            poi.type === 'underworld' || 
                            poi.type === 'cave' || 
                            poi.type === 'ruins' || 
                            poi.type === 'fortress' ||
                            (poi.metadata && poi.metadata.isDungeon === true) ||
                            (poi.dangerLevel && poi.dangerLevel >= 6);
          
          const locationType = poi.type === 'city' ? 'city' : poi.type === 'market' ? 'market' : isDungeon ? 'dungeon' : 'poi';
          const parentLocationType = poi.type === 'city' ? 'city' : poi.type === 'market' ? 'market' : isDungeon ? poi.type : 'poi';
          const subMapType = isDungeon ? 'dungeon' : locationType;
          
          navigate(`/game/location/${planet.id}/${encodeURIComponent(poi.name || poi.id)}/${parentLocationType}/${subMapType}`, {
            state: {
              planetId: planet.id,
              parentLocationId: poi.id || poi.name,
              parentLocationType: parentLocationType,
              type: subMapType
            }
          });
          
          // Close menu after navigation
          onClose();
          return;
        } else if (actionType === 'enter' || actionType === 'quest') {
          // Enter POI (navigate to sub-map if available)
          // 'quest' type is used for temples/government buildings and should behave like 'enter'
          
          // Record discovery before entering (same as right-side menu)
          if (currentCharacter?.id) {
            try {
              // For markets, use 'market' as the discovery type
              const discoveryType = 'poi'; // Markets are POIs
              const discoveryId = poi.type === 'market' 
                ? `market_${poi.name}` 
                : `poi_${poi.name}_${poi.type}`;
              
              await recordDiscovery(
                currentCharacter.id,
                planet.id,
                discoveryType,
                discoveryId,
                {
                  locationName: poi.name,
                  metadata: { type: poi.type, description: poi.description }
                }
              );
            } catch (err) {
              console.warn('Failed to record discovery:', err);
            }
          }
          
          // Use the same navigation pattern as the right-side menu
          // Check if this is a dungeon POI
          const isDungeon = poi.type === 'danger' || 
                            poi.type === 'mine' || 
                            poi.type === 'underworld' || 
                            poi.type === 'cave' || 
                            poi.type === 'ruins' || 
                            poi.type === 'fortress' ||
                            (poi.metadata && poi.metadata.isDungeon === true) ||
                            (poi.dangerLevel && poi.dangerLevel >= 6);
          
          // For markets, use 'market' as the type in the route
          // For dungeons, use the POI type as parentLocationType and 'dungeon' as type
          const locationType = poi.type === 'market' ? 'market' : isDungeon ? 'dungeon' : 'poi';
          const parentLocationType = poi.type === 'market' ? 'market' : isDungeon ? poi.type : 'poi';
          const subMapType = isDungeon ? 'dungeon' : poi.type;
          
          navigate(`/game/location/${planet.id}/${encodeURIComponent(poi.name || poi.id)}/${parentLocationType}/${subMapType}`, {
            state: {
              planetId: planet.id,
              parentLocationId: poi.id || poi.name,
              parentLocationType: parentLocationType,
              type: subMapType
            }
          });
          
          // Emit POI entered event for tutorial
          tutorialEventBus.emit(TUTORIAL_EVENTS.POI_ENTERED, {
            poiId: poi.id || poi.name,
            poiName: poi.name,
            poiType: poi.type,
            location: 'planet_surface',
            planetId: planet.id,
            characterId: currentCharacter.id,
            subMapType: subMapType,
            timestamp: new Date().toISOString()
          });
        } else if (actionType === 'harvest' && data.rewards) {
          // Show harvest results
          const itemCount = data.rewards.items?.length || 0;
          const itemNames = data.rewards.items?.map(item => {
            const itemDef = require('../../data/items').find(i => i.id === item.itemId);
            return `${item.quantity}x ${itemDef?.name || item.itemId}`;
          }).join(', ') || 'resources';
          
          notify({
            type: 'success',
            title: 'Resources Harvested',
            message: data.message || `Harvested ${itemNames}`
          });
          
          // Reload inventory to show new items
          if (currentCharacter) {
            await loadInventory(currentCharacter.id);
          }
        } else if (actionType === 'investigate') {
          // Investigate POI - show modal with lore-accurate description
          setInvestigationLore(data.lore || data.description || poi.description);
          setInvestigationModalOpen(true);
          
          // Emit POI investigated event for tutorial
          tutorialEventBus.emit(TUTORIAL_EVENTS.POI_INVESTIGATED, {
            poiId: poi.id || poi.name,
            poiName: poi.name,
            poiType: poi.type,
            location: 'planet_surface',
            planetId: planet.id,
            characterId: currentCharacter.id,
            timestamp: new Date().toISOString()
          });
          
          // Record discovery
          try {
            await recordDiscovery(
              currentCharacter.id,
              planet.id,
              'poi',
              poi.id || poi.name,
              {
                name: poi.name,
                type: poi.type,
                description: poi.description
              }
            );
          } catch (err) {
            console.warn('Failed to record POI discovery:', err);
          }
        } else if (actionType === 'fast_travel') {
          // Fast travel (handled separately)
          notify({
            type: 'info',
            title: 'Fast Travel',
            message: `Fast travel point unlocked: ${poi.name}`
          });
          
          // Emit fast travel used event for tutorial
          tutorialEventBus.emit(TUTORIAL_EVENTS.FAST_TRAVEL_USED, {
            poiId: poi.id || poi.name,
            poiName: poi.name,
            poiType: poi.type,
            location: 'planet_surface',
            planetId: planet.id,
            characterId: currentCharacter.id,
            timestamp: new Date().toISOString()
          });
        } else {
          // Default handling for any other action types
          console.log('Unhandled action type:', actionType, 'with data:', data);
          if (shouldShowNotification) {
            notify({
              type: 'info',
              title: 'Action Complete',
              message: data.message || `Action completed for ${poi.name}`
            });
          }
        }

        // Update state
        setInteractionState(data.interaction?.state || data.state || 'discovered');
        
        // Only close menu if not showing investigation modal
        if (actionType !== 'investigate') {
          onClose();
        }
      } else {
        notify({
          type: 'error',
          title: 'Action Failed',
          message: data.message || 'Failed to interact with POI'
        });
      }
    } catch (error) {
      console.error('Failed to interact with POI:', error);
      
      // Handle 409 Conflict (resource already exists) - this is OK for enter/quest/discovery actions
      // It means the POI interaction already exists, which is fine
      if (error?.response?.status === 409 && (actionType === 'enter' || actionType === 'quest' || actionType === 'discovery')) {
        console.log('POI interaction already exists (409), proceeding with navigation...');
        
        // For enter/quest/discovery actions, proceed with navigation even if interaction already exists
        if (actionType === 'enter' || actionType === 'quest' || actionType === 'discovery') {
          // Record discovery before entering (same as right-side menu)
          if (currentCharacter?.id) {
            try {
              // For markets, use 'market' as the discovery type
              const discoveryType = 'poi'; // Markets are POIs
              const discoveryId = poi.type === 'market' 
                ? `market_${poi.name}` 
                : `poi_${poi.name}_${poi.type}`;
              
              await recordDiscovery(
                currentCharacter.id,
                planet.id,
                discoveryType,
                discoveryId,
                {
                  locationName: poi.name,
                  metadata: { type: poi.type, description: poi.description }
                }
              );
            } catch (err) {
              console.warn('Failed to record discovery:', err);
            }
          }
          
          // Use the same navigation pattern as the right-side menu
          // For markets, use 'market' as the type in the route
          // Check if this is a dungeon POI
          const isDungeon = poi.type === 'danger' || 
                            poi.type === 'mine' || 
                            poi.type === 'underworld' || 
                            poi.type === 'cave' || 
                            poi.type === 'ruins' || 
                            poi.type === 'fortress' ||
                            (poi.metadata && poi.metadata.isDungeon === true) ||
                            (poi.dangerLevel && poi.dangerLevel >= 6);
          
          const locationType = poi.type === 'market' ? 'market' : isDungeon ? 'dungeon' : 'poi';
          const parentLocationType = poi.type === 'market' ? 'market' : isDungeon ? poi.type : 'poi';
          const subMapType = isDungeon ? 'dungeon' : poi.type;
          
          navigate(`/game/location/${planet.id}/${encodeURIComponent(poi.name || poi.id)}/${parentLocationType}/${subMapType}`, {
            state: {
              planetId: planet.id,
              parentLocationId: poi.id || poi.name,
              parentLocationType: parentLocationType,
              type: subMapType
            }
          });
          
          // Close menu after navigation
          onClose();
          return;
        }
      }
      
      // Extract error message from various possible locations
      let errorMessage = 'Failed to interact with POI';
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // Ensure it's a string
      if (typeof errorMessage !== 'string') {
        errorMessage = String(errorMessage || 'Failed to interact with POI');
      }
      
      notify({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !poi) return null;

  return (
    <div
      ref={menuRef}
      className="poi-interaction-menu"
      data-tutorial-target={TUTORIAL_TARGETS.POI_INTERACTION_MENU}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 1000
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="poi-interaction-header">
        <h3>{poi.name}</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      <div className="poi-interaction-info">
        <p className="poi-type">{poi.type}</p>
        {poi.description && <p className="poi-description">{poi.description}</p>}
        {interactionState !== 'undiscovered' && (
          <p className="poi-state">State: {interactionState}</p>
        )}
      </div>
      <div className="poi-interaction-actions">
        {availableActions.length === 0 ? (
          <p className="no-actions">No actions available</p>
        ) : (
          availableActions.map((action, index) => (
            <button
              key={index}
              className="action-btn"
              onClick={() => handleAction(action.type)}
              disabled={loading}
              data-tutorial-target={action.type === 'fast_travel' ? TUTORIAL_TARGETS.FAST_TRAVEL_BUTTON : undefined}
            >
              <span className="action-icon">{action.icon}</span>
              <span className="action-label">{action.label}</span>
            </button>
          ))
        )}
      </div>
      {loading && (
        <div className="loading-overlay">
          <div className="spinner">⏳</div>
        </div>
      )}
      <InvestigationModal
        isOpen={investigationModalOpen}
        onClose={() => {
          setInvestigationModalOpen(false);
          setInvestigationLore(null);
          onClose();
        }}
        poi={poi}
        lore={investigationLore}
      />
    </div>
  );
}

