/**
 * Sub-Map View Page
 * Displays and allows navigation of location sub-maps (cities, buildings, etc.)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCharacterStore } from '../state/characterSlice';
import { useDiscoveryStore } from '../state/discoverySlice';
import { useInventoryStore } from '../state/inventorySlice';
import { useQuestStore } from '../state/questSlice';
import { useTutorial } from '../contexts/TutorialContext';
import { TUTORIAL_STATES } from '../services/tutorialStateMachine';
import TutorialOverlay from '../components/tutorial/TutorialOverlay';
import subMapApi from '../services/api/subMapApi';
import { npcApi } from '../services/api/npcApi';
import { galaxyApi } from '../services/api/galaxyApi';
import DialogueInterface from '../features/dialogue/DialogueInterface';
import NPCInteractionMenu from '../components/npc/NPCInteractionMenu';
import ResourceEncounterDialog from '../components/resource/ResourceEncounterDialog';
import { renderSubMap } from '../utils/subMapRenderer';
import { useOptimizedCanvas } from '../hooks/useOptimizedCanvas';
import LoadingSpinner from '../components/common/LoadingSpinner';
import HUD from '../components/hud/HUD';
import { notify } from '../components/hud/NotificationCenter';
import {
  findDungeonPath, 
  isNavigable, 
  percentToGrid, 
  gridToPercent,
  findNearestNavigable,
  getNeighbors
} from '../utils/dungeonPathfinding';
import {
  canMoveTo,
  isWalkable,
  findNearestWalkable,
  getDoorAt,
  updateDoorState
} from '../utils/collisionDetection';
import { animateMovement } from '../utils/movementAnimator';
import { drawDungeonEnemies, getEnemyAtPoint } from '../utils/dungeonEnemyRenderer';
import { checkCombatProximity } from '../utils/dungeonCombatTrigger';
import { combatApi } from '../services/api/combatApi';
import DungeonDepthIndicator from '../components/dungeon/DungeonDepthIndicator';
import lockpickingApi from '../services/api/lockpickingApi';
import PauseMenu from '../features/menus/PauseMenu';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { addTutorialTarget } from '../services/tutorialTargetRegistry';
import { tutorialEventBus, TUTORIAL_EVENTS } from '../services/tutorialEventBus';
import './SubMapView.css';

export default function SubMapView() {
  const { planetId, parentLocationId, parentLocationType, type, subMapId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [subMap, setSubMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mouseDownPosition, setMouseDownPosition] = useState({ x: 0, y: 0 });
  const [pendingMoveTarget, setPendingMoveTarget] = useState(null);
  const [isMoving, setIsMoving] = useState(false);
  const [npcs, setNpcs] = useState([]);
  const [selectedNPC, setSelectedNPC] = useState(null);
  const [hoveredNPC, setHoveredNPC] = useState(null);
  const [dungeonEnemies, setDungeonEnemies] = useState([]);
  const [hoveredEnemy, setHoveredEnemy] = useState(null);
  const [currentDepthZone, setCurrentDepthZone] = useState(0);
  const [hoveredBuilding, setHoveredBuilding] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [hoveredPOI, setHoveredPOI] = useState(null);
  const [npcMenuOpen, setNpcMenuOpen] = useState(false);
  const [npcMenuPosition, setNpcMenuPosition] = useState({ x: 0, y: 0 });
  const [resourceEncounter, setResourceEncounter] = useState(null);
  const [lastResourceCheck, setLastResourceCheck] = useState(null);
  const [pendingDoorInteraction, setPendingDoorInteraction] = useState(null);
  const [lockpickingActive, setLockpickingActive] = useState(false);
  const [unlockedDoors, setUnlockedDoors] = useState(new Set()); // Track unlocked doors
  const [isPauseMenuOpen, setIsPauseMenuOpen] = useState(false);
  const subMapEntryTimeRef = useRef(null); // Track when player entered submap to prevent immediate auto-exit
  const tutorialInitializedRef = useRef(null); // Track tutorial initialization to prevent infinite loops

  // ESC key handler for pause menu
  useKeyboardShortcuts({
    onPauseMenuToggle: () => setIsPauseMenuOpen(prev => !prev),
    onInventoryOpen: () => {
      // Dispatch custom event to open HUD inventory overlay instead of navigating
      window.dispatchEvent(new CustomEvent('hud:openInventory'));
    },
    onQuestLogOpen: () => {
      // Dispatch custom event to open HUD quest log overlay instead of navigating
      window.dispatchEvent(new CustomEvent('hud:openQuestLog'));
    },
    onMapOpen: () => navigate('/game/galaxy')
  });
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const positionRestoreProcessedRef = useRef(null); // Track if we've processed position restoration
  const { currentCharacter, setCurrentCharacter, updateLocation } = useCharacterStore();
  const { recordDiscovery } = useDiscoveryStore();
  const { loadInventory, addItem } = useInventoryStore();
  const { loadActiveQuests } = useQuestStore();
  const { startTutorial, isActive: tutorialActive, currentState: tutorialState } = useTutorial();

  // Canvas optimization hook
  const { 
    requestRender, 
    stopRender, 
    markDirty, 
    markFullRedraw, 
    updateViewport 
  } = useOptimizedCanvas({
    targetFPS: 60,
    enableDirtyRects: true,
    enableViewportCulling: true,
    enablePerformanceMonitoring: process.env.NODE_ENV === 'development'
  });

  // Get params from location state if not in URL
  const effectiveSubMapId = subMapId || location.state?.subMapId;
  const [effectivePlanetId, setEffectivePlanetId] = useState(planetId || location.state?.planetId || null);
  const effectiveParentLocationId = parentLocationId || location.state?.parentLocationId;
  const effectiveParentLocationType = parentLocationType || location.state?.parentLocationType;
  const effectiveType = type || location.state?.type;

  // Log when returning from crafting to debug submap loading
  useEffect(() => {
    if (location.state?.returnFromCrafting && effectiveSubMapId) {
      console.log('[SubMapView] Returning from crafting, loading submap by ID:', {
        subMapId: effectiveSubMapId,
        fromUrl: !!subMapId,
        fromState: !!location.state?.subMapId,
        playerLocation: location.state?.playerLocation
      });
    }
  }, [location.state?.returnFromCrafting, effectiveSubMapId, subMapId]);

  // Define loadSubMapNPCs first so it can be used by other functions
  const loadSubMapNPCs = useCallback(async (subMap) => {
    // CRITICAL: Dungeons do not have regular NPCs - only enemy combatants
    if (subMap.type === 'dungeon') {
      setNpcs([]);
      return;
    }
    
    try {
      // Try to load existing NPCs
      // Pass parentLocationId, planetId, and area to help find NPCs by area
      // Extract area from parentLocationId (e.g., "Lessu, the Capital City" -> "lessu")
      let area = null;
      if (subMap.parentLocationId) {
        const parentLower = subMap.parentLocationId.toLowerCase();
        if (parentLower.includes('lessu')) {
          area = 'lessu';
        } else if (parentLower.includes('tann')) {
          area = 'tann_province';
        }
      }
      
      const npcResponse = await npcApi.getBySubMap(
        subMap.id,
        subMap.parentLocationId,
        subMap.planetId || effectivePlanetId,
        area
      );
      
      if (npcResponse && npcResponse.success && npcResponse.data) {
        const existingNPCs = Array.isArray(npcResponse.data) ? npcResponse.data : (npcResponse.data ? [npcResponse.data] : []);
        
        // Check if this is a market submap and if it has enough vendors in stalls
        const isMarket = subMap.subMapType === 'market' || subMap.type === 'market';
        let shouldRegenerate = false;
        
        if (isMarket) {
          const vendorCount = existingNPCs.filter(npc => npc.npcType === 'vendor').length;
          console.log(`[SubMapView] Market submap check: ${vendorCount} vendors found`);
          
          // Always regenerate market NPCs to ensure they're in stalls
          // The backend will check if they're properly positioned
          if (vendorCount < 7) {
            console.log(`[SubMapView] Market submap has ${vendorCount} vendors, need 7. Regenerating...`);
            shouldRegenerate = true;
          } else {
            // Even if we have 7 vendors, regenerate to ensure they're in stalls
            // The backend will check positioning and only regenerate if needed
            console.log(`[SubMapView] Market submap has ${vendorCount} vendors, checking if they're in stalls...`);
            shouldRegenerate = true; // Let backend decide if regeneration is needed
          }
        }
        
        // If no NPCs exist, or market needs regeneration, generate them
        if (existingNPCs.length === 0 || shouldRegenerate) {
          console.log(shouldRegenerate ? `[SubMapView] Regenerating NPCs for market submap ${subMap.id}...` : 'No NPCs found, generating NPCs for sub-map...');
          try {
            console.log(`[SubMapView] Calling generateForSubMap API for ${subMap.id}`);
            const generateResponse = await npcApi.generateForSubMap(subMap.id);
            console.log(`[SubMapView] Generate response:`, generateResponse);
            if (generateResponse && generateResponse.success && generateResponse.data) {
              const generatedNPCs = Array.isArray(generateResponse.data) ? generateResponse.data : [];
              // Deduplicate NPCs by ID to prevent overlapping
              const uniqueNPCs = Array.from(
                new Map(generatedNPCs.map(npc => [npc.id, npc])).values()
              );
              setNpcs(uniqueNPCs);
              console.log(`[SubMapView] Generated ${generateResponse.count || generatedNPCs.length} NPCs for sub-map (${uniqueNPCs.length} unique after deduplication)`);
            } else {
              console.warn(`[SubMapView] Generate response was not successful:`, generateResponse);
              setNpcs([]);
            }
          } catch (genError) {
            console.error('[SubMapView] Failed to generate NPCs:', genError);
            setNpcs([]);
          }
        } else {
          console.log(`[SubMapView] Using existing NPCs (${existingNPCs.length} found)`);
          
          // Debug: Check if tutorial NPC is in the list
          if (currentCharacter && currentCharacter.background) {
            const tutorialNPCIds = {
              smuggler: 'npc_tutorial_dockmaster_jax',
              scholar: 'npc_tutorial_archivist_tera',
              soldier: 'npc_tutorial_sergeant_kael',
              medic: 'npc_tutorial_medic_voss',
              engineer: 'npc_tutorial_tech_rynn',
              diplomat: 'npc_tutorial_ambassador_lira',
              pilot: 'npc_tutorial_flight_controller_dex'
            };
            const expectedTutorialNPCId = tutorialNPCIds[currentCharacter.background] || tutorialNPCIds.smuggler;
            const tutorialNPC = existingNPCs.find(npc => npc.id === expectedTutorialNPCId);
            
            if (tutorialNPC) {
              const layout = subMap.layoutData || subMap.layout || {};
              const mapWidth = layout.width || 15;
              const mapHeight = layout.height || 15;
              
              const npcX = tutorialNPC.location?.x;
              const npcY = tutorialNPC.location?.y;
              const isPercentage = npcX > mapWidth || npcY > mapHeight;
              const gridX = isPercentage ? Math.round((npcX / 100) * mapWidth) : npcX;
              const gridY = isPercentage ? Math.round((npcY / 100) * mapHeight) : npcY;
              
              console.log(`[SubMapView] ✓ Tutorial NPC found in NPCs array:`, {
                id: tutorialNPC.id,
                name: tutorialNPC.name,
                location: tutorialNPC.location,
                npcType: tutorialNPC.npcType,
                originalCoordinates: { x: npcX, y: npcY },
                isPercentage: isPercentage,
                gridCoordinates: { x: gridX, y: gridY },
                mapSize: { width: mapWidth, height: mapHeight },
                isValidCoordinates: gridX >= 0 && gridX < mapWidth && gridY >= 0 && gridY < mapHeight
              });
            } else {
              console.warn(`[SubMapView] ⚠ Tutorial NPC ${expectedTutorialNPCId} NOT found in NPCs array!`, {
                expectedId: expectedTutorialNPCId,
                characterBackground: currentCharacter.background,
                subMapId: subMap.id,
                foundNPCs: existingNPCs.map(n => ({ 
                  id: n.id, 
                  name: n.name,
                  location: n.location,
                  subMapId: n.location?.subMapId
                }))
              });
              
              // If tutorial NPC is missing, try to fetch it directly and add it to the array
              console.log(`[SubMapView] Attempting to fetch tutorial NPC directly...`);
              try {
                const tutorialApi = await import('../services/api/tutorialApi');
                const tutorialNPCResponse = await tutorialApi.default.getTutorialNPC(currentCharacter.id, subMap.id);
                if (tutorialNPCResponse && tutorialNPCResponse.success && tutorialNPCResponse.data) {
                  const fetchedTutorialNPC = tutorialNPCResponse.data;
                  console.log(`[SubMapView] ✓ Fetched tutorial NPC directly:`, {
                    id: fetchedTutorialNPC.id,
                    name: fetchedTutorialNPC.name,
                    location: fetchedTutorialNPC.location,
                    subMapId: fetchedTutorialNPC.location?.subMapId
                  });
                  
                  // Add tutorial NPC to the array if it's not already there
                  const npcExists = existingNPCs.some(n => n.id === fetchedTutorialNPC.id);
                  if (!npcExists) {
                    console.log(`[SubMapView] Adding tutorial NPC to NPCs array`);
                    
                    // Verify coordinates are valid for the submap
                    const layout = subMap.layoutData || subMap.layout || {};
                    const mapWidth = layout.width || 15;
                    const mapHeight = layout.height || 15;
                    
                    if (fetchedTutorialNPC.location) {
                      const npcX = fetchedTutorialNPC.location.x;
                      const npcY = fetchedTutorialNPC.location.y;
                      
                      // Check if coordinates are within valid range
                      if (npcX >= 0 && npcX < mapWidth && npcY >= 0 && npcY < mapHeight) {
                        console.log(`[SubMapView] Tutorial NPC coordinates are valid: (${npcX}, ${npcY}) for ${mapWidth}x${mapHeight} map`);
                        existingNPCs.push(fetchedTutorialNPC);
                      } else {
                        console.warn(`[SubMapView] Tutorial NPC coordinates are out of bounds: (${npcX}, ${npcY}) for ${mapWidth}x${mapHeight} map`);
                        // Clamp coordinates to valid range
                        fetchedTutorialNPC.location.x = Math.max(0, Math.min(mapWidth - 1, npcX));
                        fetchedTutorialNPC.location.y = Math.max(0, Math.min(mapHeight - 1, npcY));
                        console.log(`[SubMapView] Clamped tutorial NPC coordinates to: (${fetchedTutorialNPC.location.x}, ${fetchedTutorialNPC.location.y})`);
                        existingNPCs.push(fetchedTutorialNPC);
                      }
                    } else {
                      console.warn(`[SubMapView] Tutorial NPC has no location data, using default coordinates`);
                      // Set default location if missing
                      fetchedTutorialNPC.location = {
                        planet: currentCharacter.currentPlanet,
                        area: 'submap',
                        subMapId: subMap.id,
                        x: Math.floor(mapWidth / 2),
                        y: Math.floor(mapHeight / 2)
                      };
                      existingNPCs.push(fetchedTutorialNPC);
                    }
                  } else {
                    console.log(`[SubMapView] Tutorial NPC already in array (found by ID match)`);
                  }
                }
              } catch (fetchError) {
                console.error(`[SubMapView] Failed to fetch tutorial NPC directly:`, fetchError);
              }
            }
          }
          
          // Deduplicate NPCs by ID to prevent overlapping, then set NPCs
          // Ensure existingNPCs is an array and filter out any null/undefined entries
          const validNPCs = (existingNPCs || []).filter(npc => npc && npc.id);
          
          // Filter tutorial NPCs - only show the one that matches the current character's background
          // Tutorial NPCs are shared globally, so we need to hide ones that don't match
          let filteredNPCs = validNPCs;
          if (currentCharacter && currentCharacter.background) {
            const tutorialNPCIds = {
              smuggler: 'npc_tutorial_dockmaster_jax',
              scholar: 'npc_tutorial_archivist_tera',
              soldier: 'npc_tutorial_sergeant_kael',
              medic: 'npc_tutorial_medic_voss',
              engineer: 'npc_tutorial_tech_rynn',
              diplomat: 'npc_tutorial_ambassador_lira',
              pilot: 'npc_tutorial_flight_controller_dex'
            };
            const expectedTutorialNPCId = tutorialNPCIds[currentCharacter.background];
            
            // Filter out tutorial NPCs that don't match this character's background
            filteredNPCs = validNPCs.filter(npc => {
              // Keep all non-tutorial NPCs
              if (!npc.id || !npc.id.startsWith('npc_tutorial_')) {
                return true;
              }
              // Only keep the tutorial NPC that matches this character's background
              return npc.id === expectedTutorialNPCId;
            });
            
            if (filteredNPCs.length !== validNPCs.length) {
              const removedCount = validNPCs.length - filteredNPCs.length;
              console.log(`[SubMapView] Filtered out ${removedCount} tutorial NPC(s) that don't match character background (${currentCharacter.background})`);
            }
          }
          
          const uniqueNPCs = Array.from(
            new Map(filteredNPCs.map(npc => [npc.id, npc])).values()
          );
          setNpcs(uniqueNPCs);
          console.log(`[SubMapView] Set ${uniqueNPCs.length} unique NPCs (${filteredNPCs.length} after filtering, ${validNPCs.length} valid, ${existingNPCs?.length || 0} total before deduplication)`);
        }
      } else {
        setNpcs([]);
      }
    } catch (error) {
      console.error('Failed to load sub-map NPCs:', error);
      setNpcs([]);
    }
  }, [effectivePlanetId]);

  // Load dungeon enemies
  const loadDungeonEnemies = useCallback(async (subMap, character, isReturningFromCombat = false) => {
    if (subMap.type !== 'dungeon') {
      setDungeonEnemies([]);
      return;
    }
    
    try {
      // First, get fresh submap data to check for lastExitTime
      // We need fresh data because the subMap object passed in might be stale
      let freshSubMapData = null;
      try {
        const subMapResponse = await subMapApi.getSubMapById(subMap.id);
        if (subMapResponse && subMapResponse.success && subMapResponse.data) {
          freshSubMapData = subMapResponse.data;
        }
      } catch (subMapError) {
        console.warn('[Dungeon] Failed to get fresh submap data, using passed submap:', subMapError);
        freshSubMapData = subMap; // Fallback to passed submap
      }
      
      // Get existing enemies
      const response = await subMapApi.getDungeonEnemies(subMap.id);
      
      if (response && response.success) {
        const existingEnemies = response.data || [];
        
        // If returning from combat, just use existing enemies (defeated ones should stay defeated)
        if (isReturningFromCombat) {
          console.log('[Dungeon] Returning from combat, loading existing enemies (defeated enemies remain defeated)', {
            enemyCount: existingEnemies.length,
            defeatedCount: existingEnemies.filter(e => e.defeated).length,
            activeCount: existingEnemies.filter(e => !e.defeated && !e.inCombat).length
          });
          setDungeonEnemies(existingEnemies);
          return;
        }
        
        // Check for lastExitTime from fresh submap data (not stale subMap object)
        const metadata = freshSubMapData?.metadata || subMap.metadata || {};
        const progress = metadata.progress || {};
        const lastExitTime = progress.lastExitTime;
        
        console.log('[Dungeon] Checking for re-entry:', {
          hasLastExitTime: !!lastExitTime,
          lastExitTime,
          existingEnemiesCount: existingEnemies.length,
          defeatedCount: existingEnemies.filter(e => e.defeated).length,
          freshSubMapDataMetadata: freshSubMapData?.metadata ? 'present' : 'missing',
          freshSubMapDataProgress: freshSubMapData?.metadata?.progress ? 'present' : 'missing',
          metadataKeys: Object.keys(metadata),
          progressKeys: Object.keys(progress)
        });
        
        // If no enemies exist, spawn them (only on fresh entry, not when returning from combat)
        if (existingEnemies.length === 0 && character) {
          console.log('[Dungeon] No enemies found, spawning enemies...');
          try {
            const spawnResponse = await subMapApi.spawnDungeonEnemies(
              subMap.id,
              character.level || 1
            );
            
            if (spawnResponse && spawnResponse.success) {
              setDungeonEnemies(spawnResponse.data || []);
              console.log(`[Dungeon] Spawned ${spawnResponse.count || spawnResponse.data?.length || 0} enemies`);
            } else {
              setDungeonEnemies([]);
            }
          } catch (spawnError) {
            console.error('[Dungeon] Failed to spawn enemies:', spawnError);
            setDungeonEnemies([]);
          }
        } else if (lastExitTime) {
          // If lastExitTime exists, player left the submap - handle re-entry (fully respawn ALL enemies)
          console.log('[Dungeon] Player re-entered dungeon after leaving - fully respawning all enemies', {
            lastExitTime,
            existingEnemiesCount: existingEnemies.length
          });
          if (!character || !character.level) {
            console.error('[Dungeon] Cannot respawn enemies: character level not available');
            setDungeonEnemies(existingEnemies);
          } else {
            try {
              const respawnResponse = await subMapApi.respawnDungeonEnemies(subMap.id, character.level);
              if (respawnResponse && respawnResponse.success) {
                const respawnedEnemies = respawnResponse.data || [];
                setDungeonEnemies(respawnedEnemies);
                console.log('[Dungeon] Handled re-entry, fully respawned all enemies', {
                  respawnedCount: respawnedEnemies.length,
                  defeatedCount: respawnedEnemies.filter(e => e.defeated).length,
                  activeCount: respawnedEnemies.filter(e => !e.defeated && !e.inCombat).length
                });
              } else {
                console.warn('[Dungeon] Respawn response was not successful, using existing enemies');
                setDungeonEnemies(existingEnemies);
              }
            } catch (respawnError) {
              console.error('[Dungeon] Failed to handle re-entry:', respawnError);
              setDungeonEnemies(existingEnemies);
            }
          }
        } else {
          // Normal entry - just load existing enemies
          console.log('[Dungeon] Normal entry, loading existing enemies', {
            enemyCount: existingEnemies.length,
            defeatedCount: existingEnemies.filter(e => e.defeated).length
          });
          setDungeonEnemies(existingEnemies);
        }
      } else {
        setDungeonEnemies([]);
      }
    } catch (error) {
      console.error('[Dungeon] Failed to load enemies:', error);
      setDungeonEnemies([]);
    }
  }, []);

  const loadSubMapById = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[SubMapView] Loading submap by ID:', effectiveSubMapId);
      const response = await subMapApi.getSubMapById(effectiveSubMapId);
      
      if (response && response.success && response.data) {
        console.log('[SubMapView] Loaded submap:', {
          id: response.data.id,
          type: response.data.type,
          parentLocationId: response.data.parentLocationId,
          hasLayout: !!(response.data.layoutData || response.data.layout)
        });
      }

      if (!response || !response.success || !response.data) {
        throw new Error('Failed to load sub-map');
      }

      const loadedSubMap = response.data;
      setSubMap(loadedSubMap);

      // Extract params from loaded sub-map for discovery tracking
      const planetIdFromSubMap = loadedSubMap.planetId;
      const parentLocationIdFromSubMap = loadedSubMap.parentLocationId;
      const parentLocationTypeFromSubMap = loadedSubMap.parentLocationType;
      const typeFromSubMap = loadedSubMap.type;

      // Update effectivePlanetId if it wasn't set (when loading by subMapId)
      if (!effectivePlanetId && planetIdFromSubMap) {
        setEffectivePlanetId(planetIdFromSubMap);
      }

      // Record sub-map discovery
      const character = useCharacterStore.getState().currentCharacter;
      if (character?.id && planetIdFromSubMap) {
        try {
          await recordDiscovery(
            character.id,
            planetIdFromSubMap,
            'sub_map',
            `submap_${parentLocationIdFromSubMap}_${typeFromSubMap}`,
            {
              locationName: `${parentLocationIdFromSubMap} (${typeFromSubMap})`,
              metadata: {
                parentLocationId: parentLocationIdFromSubMap,
                parentLocationType: parentLocationTypeFromSubMap,
                subMapType: typeFromSubMap
              }
            }
          );
        } catch (err) {
          console.warn('Failed to record sub-map discovery:', err);
        }
      }

      // Load NPCs for this sub-map (skips dungeons)
      await loadSubMapNPCs(loadedSubMap);
      
      // Load dungeon enemies if this is a dungeon
      if (loadedSubMap.type === 'dungeon' && character) {
        const isReturningFromCombat = location.state?.returnFromCombat === true;
        await loadDungeonEnemies(loadedSubMap, character, isReturningFromCombat);
        
        // Initialize depth zone from current player position
        const layout = loadedSubMap.layoutData || loadedSubMap.layout || {};
        if (layout.grid && layout.entrance && layout.depthZones && character.currentLocation) {
          const playerLoc = character.currentLocation;
          const gridWidth = layout.size?.width || layout.width || 20;
          const gridHeight = layout.size?.height || layout.height || 20;
          const playerGridX = Math.floor((playerLoc.x / 100) * gridWidth);
          const playerGridY = Math.floor((playerLoc.y / 100) * gridHeight);
          const initialDepthZone = calculateDepthZone(playerGridX, playerGridY, layout);
          setCurrentDepthZone(initialDepthZone);
        }
      } else {
        setDungeonEnemies([]);
        setCurrentDepthZone(0);
      }

      // Set player spawn position at entry point when entering sub-map
      // CRITICAL: Skip entry point spawn if returning from building (position will be restored)
      if (character && loadedSubMap.layoutData?.entryPoints && loadedSubMap.layoutData.entryPoints.length > 0 && !location.state?.returnFromBuilding) {
        const entryPoint = loadedSubMap.layoutData.entryPoints[0];
        const layout = loadedSubMap.layoutData || loadedSubMap.layout || {};
        const isDungeon = loadedSubMap.type === 'dungeon';
        
        // For dungeons, use size.width/height; for others, use width/height
        const mapWidth = isDungeon ? (layout.size?.width || layout.width || 20) : (layout.width || 15);
        const mapHeight = isDungeon ? (layout.size?.height || layout.height || 20) : (layout.height || 15);
        
        let spawnGridX = entryPoint.position.x;
        let spawnGridY = entryPoint.position.y;
        
        // Offset spawn position slightly from entry point to avoid immediate auto-exit
        // Move player 1-2 cells away from entry point (prefer moving right/down if possible)
        const offsetX = 1; // Move 1 cell to the right
        const offsetY = 1; // Move 1 cell down
        
        spawnGridX = Math.min(mapWidth - 1, spawnGridX + offsetX);
        spawnGridY = Math.min(mapHeight - 1, spawnGridY + offsetY);
        
        // For dungeons, ensure spawn position is navigable
        if (isDungeon && layout.grid) {
          const grid = layout.grid;
          
          // Check if offset position is navigable
          if (!isNavigable(grid, spawnGridX, spawnGridY)) {
            // Try original position first
            if (isNavigable(grid, entryPoint.position.x, entryPoint.position.y)) {
              spawnGridX = entryPoint.position.x;
              spawnGridY = entryPoint.position.y;
            } else {
              // Find nearest navigable cell
              const nearest = findNearestNavigable(grid, entryPoint.position.x, entryPoint.position.y, 10);
              if (nearest) {
                spawnGridX = nearest.x;
                spawnGridY = nearest.y;
                console.log('[Spawn] Found nearest navigable cell:', { x: spawnGridX, y: spawnGridY });
              } else {
                console.error('[Spawn] CRITICAL: Could not find navigable spawn position! Using entrance anyway.');
                spawnGridX = entryPoint.position.x;
                spawnGridY = entryPoint.position.y;
              }
            }
          }
        }
        
        // Convert grid coordinates to percentage for player location
        // Add 0.5 to center in cell, then convert to percentage
        const spawnX = ((spawnGridX + 0.5) / mapWidth) * 100;
        const spawnY = ((spawnGridY + 0.5) / mapHeight) * 100;
        
        // Clamp to valid range (0-100)
        const clampedSpawnX = Math.max(0, Math.min(100, spawnX));
        const clampedSpawnY = Math.max(0, Math.min(100, spawnY));
        
        // Get current location
        const currentLoc = character.currentLocation || {};
        
        // Check if we're returning from crafting - if so, use the saved player location
        const returningFromCrafting = location.state?.returnFromCrafting && location.state?.playerLocation;
        if (returningFromCrafting && location.state.playerLocation.x !== undefined && location.state.playerLocation.y !== undefined) {
          console.log('📍 Returning from crafting, using saved player location:', location.state.playerLocation);
          const savedLoc = location.state.playerLocation;
          const { updateLocation: updateLocationFn, setCurrentCharacter } = useCharacterStore.getState();
          updateLocationFn(planetIdFromSubMap, {
            x: savedLoc.x,
            y: savedLoc.y,
            area: savedLoc.area || 'submap',
            subMapId: savedLoc.subMapId || loadedSubMap.id,
            parentLocationId: parentLocationIdFromSubMap
          }).then((updatedCharacter) => {
            console.log('✅ Player position restored from crafting:', {
              location: updatedCharacter?.currentLocation,
              planet: updatedCharacter?.currentPlanet
            });
            if (updatedCharacter) {
              setCurrentCharacter(updatedCharacter);
            }
          }).catch(err => {
            console.error('❌ Failed to restore player position from crafting:', err);
          });
          setLoading(false);
          return; // Skip the spawn logic since we're using the saved position
        }
        
        // CRITICAL: Double-check we're not returning from building (safety check)
        if (location.state?.returnFromBuilding) {
          console.log('[Building Exit] Entry point spawn blocked (first check) - returning from building');
        } else {
          // Check if player needs spawn position set
          const needsSpawn = 
            character.currentPlanet !== planetIdFromSubMap ||
            !currentLoc ||
            !currentLoc.x ||
            !currentLoc.y ||
            currentLoc.area !== 'submap' ||
            currentLoc.subMapId !== loadedSubMap.id;
          
          // For dungeons, also check if current position is navigable (even if needsSpawn is false)
          let needsPositionFix = false;
          if (isDungeon && layout.grid && !needsSpawn && currentLoc.x && currentLoc.y) {
            // Convert current position to grid coordinates
            const currentGridX = Math.floor((currentLoc.x / 100) * mapWidth);
            const currentGridY = Math.floor((currentLoc.y / 100) * mapHeight);
            
            // Check if current position is navigable
            if (!isNavigable(layout.grid, currentGridX, currentGridY)) {
              console.warn('[Spawn] Current saved position is not navigable, fixing spawn position', {
                currentLoc,
                currentGrid: { x: currentGridX, y: currentGridY },
                cellValue: layout.grid[currentGridY]?.[currentGridX]
              });
              needsPositionFix = true;
            }
          }
          
          if (needsSpawn || needsPositionFix) {
            console.log('🎮 Setting player spawn at sub-map entry point:', {
              subMap: loadedSubMap.id,
              entryPoint: entryPoint.position,
              spawnGrid: { x: spawnGridX, y: spawnGridY },
              spawn: { x: clampedSpawnX, y: clampedSpawnY },
              mapSize: { width: mapWidth, height: mapHeight }
            });
            
            const { updateLocation, setCurrentCharacter } = useCharacterStore.getState();
            updateLocation(planetIdFromSubMap, {
              x: clampedSpawnX,
              y: clampedSpawnY,
              area: 'submap',
              subMapId: loadedSubMap.id,
              parentLocationId: parentLocationIdFromSubMap
            }).then((updatedCharacter) => {
              console.log('✅ Player spawned at sub-map entry point successfully:', {
                location: updatedCharacter?.currentLocation,
                planet: updatedCharacter?.currentPlanet
              });
              // Ensure character is updated in store to trigger re-render
              if (updatedCharacter) {
                setCurrentCharacter(updatedCharacter);
              }
            }).catch(err => {
              console.error('❌ Failed to set sub-map spawn position:', err);
            });
          } else {
            console.log('ℹ️ Player already has valid location in sub-map:', currentLoc);
          }
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Failed to load sub-map by ID:', err);
      setError(err.message || 'Failed to load sub-map');
      setLoading(false);
    }
  }, [effectiveSubMapId, recordDiscovery, updateLocation, loadSubMapNPCs]);

  const loadSubMap = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      try {
        response = await subMapApi.getSubMapForLocation(
          effectivePlanetId,
          effectiveParentLocationId,
          effectiveParentLocationType || 'city',
          effectiveType
        );
      } catch (apiError) {
        // If we get a 409 Conflict (resource already exists), try fetching by location again
        // This can happen due to race conditions
        if (apiError.response?.status === 409 || apiError.message?.includes('already exists')) {
          console.log('Submap already exists, retrying fetch...');
          // Retry the request - the backend should now return the existing submap
          response = await subMapApi.getSubMapForLocation(
            effectivePlanetId,
            effectiveParentLocationId,
            effectiveParentLocationType || 'city',
            effectiveType
          );
        } else {
          throw apiError;
        }
      }

      if (!response || !response.success || !response.data) {
        throw new Error('Failed to load sub-map');
      }

      const loadedSubMap = response.data;
      setSubMap(loadedSubMap);

      // Record sub-map discovery
      const character = useCharacterStore.getState().currentCharacter;
      if (character?.id && effectivePlanetId) {
        try {
          await recordDiscovery(
            character.id,
            effectivePlanetId,
            'sub_map',
            `submap_${effectiveParentLocationId}_${effectiveType}`,
            {
              locationName: `${effectiveParentLocationId} (${effectiveType})`,
              metadata: {
                parentLocationId: effectiveParentLocationId,
                parentLocationType: effectiveParentLocationType,
                subMapType: effectiveType
              }
            }
          );
        } catch (err) {
          console.warn('Failed to record sub-map discovery:', err);
        }
      }

      // Load NPCs for this sub-map (skips dungeons)
      await loadSubMapNPCs(loadedSubMap);
      
      // Load dungeon enemies if this is a dungeon
      if (loadedSubMap.type === 'dungeon' && character) {
        const isReturningFromCombat = location.state?.returnFromCombat === true;
        await loadDungeonEnemies(loadedSubMap, character, isReturningFromCombat);
        
        // Initialize depth zone from current player position
        const layout = loadedSubMap.layoutData || loadedSubMap.layout || {};
        if (layout.grid && layout.entrance && layout.depthZones && character.currentLocation) {
          const playerLoc = character.currentLocation;
          const gridWidth = layout.size?.width || layout.width || 20;
          const gridHeight = layout.size?.height || layout.height || 20;
          const playerGridX = Math.floor((playerLoc.x / 100) * gridWidth);
          const playerGridY = Math.floor((playerLoc.y / 100) * gridHeight);
          const initialDepthZone = calculateDepthZone(playerGridX, playerGridY, layout);
          setCurrentDepthZone(initialDepthZone);
        }
      } else {
        setDungeonEnemies([]);
        setCurrentDepthZone(0);
      }

      // Set player spawn position at entry point when entering sub-map
      // BUT skip this if we're returning from a building (position will be restored separately)
      // CRITICAL: If returning from building, restore position IMMEDIATELY during load
      // This must happen before any entry point spawn logic
      if (location.state?.returnFromBuilding && location.state?.restorePosition && character) {
        const { restorePosition } = location.state;
        const currentLoc = character.currentLocation || {};
        
        console.log('[Building Exit] Restoring position immediately during load:', {
          subMapId: loadedSubMap.id,
          restorePosition,
          currentLocation: currentLoc
        });
        
        // Check if position needs to be restored
        const needsRestore = 
          !currentLoc.x || 
          !currentLoc.y || 
          currentLoc.subMapId !== loadedSubMap.id ||
          Math.abs((currentLoc.x || 0) - restorePosition.x) > 1 ||
          Math.abs((currentLoc.y || 0) - restorePosition.y) > 1;
        
        if (needsRestore) {
          console.log('[Building Exit] Position needs restoration, updating immediately');
          const { updateLocation, setCurrentCharacter } = useCharacterStore.getState();
          updateLocation(effectivePlanetId, {
            x: restorePosition.x,
            y: restorePosition.y,
            area: 'submap',
            subMapId: loadedSubMap.id,
            parentLocationId: effectiveParentLocationId
          }).then((updatedCharacter) => {
            console.log('[Building Exit] Position restored successfully during load:', {
              location: updatedCharacter?.currentLocation
            });
            if (updatedCharacter) {
              setCurrentCharacter(updatedCharacter);
            }
            setIsMoving(false);
          }).catch(err => {
            console.error('[Building Exit] Failed to restore position during load:', err);
            setIsMoving(false);
          });
        } else {
          console.log('[Building Exit] Position already correct, no restoration needed');
          setIsMoving(false);
        }
      } else if (character && loadedSubMap.layoutData?.entryPoints && loadedSubMap.layoutData.entryPoints.length > 0) {
        // Only run entry point spawn if NOT returning from building
        const entryPoint = loadedSubMap.layoutData.entryPoints[0];
        const layout = loadedSubMap.layoutData || loadedSubMap.layout || {};
        const isDungeon = loadedSubMap.type === 'dungeon';
        
        // For dungeons, use size.width/height; for others, use width/height
        const mapWidth = isDungeon ? (layout.size?.width || layout.width || 20) : (layout.width || 15);
        const mapHeight = isDungeon ? (layout.size?.height || layout.height || 20) : (layout.height || 15);
        
        let spawnGridX = entryPoint.position.x;
        let spawnGridY = entryPoint.position.y;
        
        // Offset spawn position slightly from entry point to avoid immediate auto-exit
        // Move player 1-2 cells away from entry point (prefer moving right/down if possible)
        const offsetX = 1; // Move 1 cell to the right
        const offsetY = 1; // Move 1 cell down
        
        spawnGridX = Math.min(mapWidth - 1, spawnGridX + offsetX);
        spawnGridY = Math.min(mapHeight - 1, spawnGridY + offsetY);
        
        // For dungeons, ensure spawn position is navigable
        if (isDungeon && layout.grid) {
          const grid = layout.grid;
          
          // Check if offset position is navigable
          if (!isNavigable(grid, spawnGridX, spawnGridY)) {
            // Try original position first
            if (isNavigable(grid, entryPoint.position.x, entryPoint.position.y)) {
              spawnGridX = entryPoint.position.x;
              spawnGridY = entryPoint.position.y;
            } else {
              // Find nearest navigable cell
              const nearest = findNearestNavigable(grid, entryPoint.position.x, entryPoint.position.y, 10);
              if (nearest) {
                spawnGridX = nearest.x;
                spawnGridY = nearest.y;
                console.log('[Spawn] Found nearest navigable cell:', { x: spawnGridX, y: spawnGridY });
              } else {
                console.error('[Spawn] CRITICAL: Could not find navigable spawn position! Using entrance anyway.');
                spawnGridX = entryPoint.position.x;
                spawnGridY = entryPoint.position.y;
              }
            }
          }
        }
        
        // Convert grid coordinates to percentage for player location
        // Add 0.5 to center in cell, then convert to percentage
        const spawnX = ((spawnGridX + 0.5) / mapWidth) * 100;
        const spawnY = ((spawnGridY + 0.5) / mapHeight) * 100;
        
        // Clamp to valid range (0-100)
        const clampedSpawnX = Math.max(0, Math.min(100, spawnX));
        const clampedSpawnY = Math.max(0, Math.min(100, spawnY));
        
        // Get current location
        const currentLoc = character.currentLocation || {};
        
        // CRITICAL: Double-check we're not returning from building (safety check)
        if (location.state?.returnFromBuilding) {
          console.log('[Building Exit] Entry point spawn blocked - returning from building');
        } else {
          // Check if player needs spawn position set
          const needsSpawn = 
            character.currentPlanet !== effectivePlanetId ||
            !currentLoc ||
            !currentLoc.x ||
            !currentLoc.y ||
            currentLoc.area !== 'submap' ||
            currentLoc.subMapId !== loadedSubMap.id;
          
          // For dungeons, also check if current position is navigable (even if needsSpawn is false)
          let needsPositionFix = false;
          if (isDungeon && layout.grid && !needsSpawn && currentLoc.x && currentLoc.y) {
            // Convert current position to grid coordinates
            const currentGridX = Math.floor((currentLoc.x / 100) * mapWidth);
            const currentGridY = Math.floor((currentLoc.y / 100) * mapHeight);
            
            // Check if current position is navigable
            if (!isNavigable(layout.grid, currentGridX, currentGridY)) {
              console.warn('[Spawn] Current saved position is not navigable, fixing spawn position', {
                currentLoc,
                currentGrid: { x: currentGridX, y: currentGridY },
                cellValue: layout.grid[currentGridY]?.[currentGridX]
              });
              needsPositionFix = true;
            }
          }
          
          if (needsSpawn || needsPositionFix) {
            console.log('🎮 Setting player spawn at sub-map entry point:', {
              subMap: loadedSubMap.id,
              entryPoint: entryPoint.position,
              spawnGrid: { x: spawnGridX, y: spawnGridY },
              spawn: { x: clampedSpawnX, y: clampedSpawnY },
              mapSize: { width: mapWidth, height: mapHeight }
            });
            
            const { updateLocation, setCurrentCharacter } = useCharacterStore.getState();
            updateLocation(effectivePlanetId, {
              x: clampedSpawnX,
              y: clampedSpawnY,
              area: 'submap',
              subMapId: loadedSubMap.id,
              parentLocationId: effectiveParentLocationId
            }).then((updatedCharacter) => {
              console.log('✅ Player spawned at sub-map entry point successfully:', {
                location: updatedCharacter?.currentLocation,
                planet: updatedCharacter?.currentPlanet
              });
              // Ensure character is updated in store to trigger re-render
              if (updatedCharacter) {
                setCurrentCharacter(updatedCharacter);
              }
            }).catch(err => {
              console.error('❌ Failed to set sub-map spawn position:', err);
            });
          } else {
            console.log('ℹ️ Player already has valid location in sub-map:', currentLoc);
          }
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Failed to load sub-map:', err);
      setError(err.message || 'Failed to load sub-map');
      setLoading(false);
    }
  }, [effectivePlanetId, effectiveParentLocationId, effectiveParentLocationType, effectiveType, recordDiscovery, updateLocation, loadSubMapNPCs]);

  useEffect(() => {
    // If we have a subMapId, load by ID directly
    if (effectiveSubMapId) {
      loadSubMapById();
    } 
    // Otherwise, load by location params
    else if (effectivePlanetId && effectiveParentLocationId && effectiveType) {
      loadSubMap();
    } else if (!effectiveSubMapId && !effectivePlanetId && !effectiveParentLocationId && !effectiveType) {
      // No params at all - show error
      setError('Missing required parameters to load sub-map');
      setLoading(false);
    }
  }, [effectiveSubMapId, effectivePlanetId, effectiveParentLocationId, effectiveType, loadSubMapById, loadSubMap]);

  // Initialize tutorial for new characters entering spaceport
  useEffect(() => {
    const initializeTutorial = async () => {
      if (!currentCharacter || !subMap || loading) return;
      
      // Prevent multiple initializations for the same character/submap combo
      const initKey = `${currentCharacter.id}_${subMap.id}`;
      if (tutorialInitializedRef.current === initKey) {
        return; // Already initialized
      }
      
      // Check if this is a new character entering a spaceport for the first time
      const isNewCharacter = currentCharacter.level === 1 && !currentCharacter.tutorialCompleted;
      const isSpaceport = subMap.type === 'spaceport';
      const isNewCharacterEntry = location.state?.isNewCharacter || location.state?.showTutorial;
      
      if (isNewCharacter && isSpaceport && (isNewCharacterEntry || !tutorialActive)) {
        tutorialInitializedRef.current = initKey; // Mark as initialized
        
        console.log('[SubMapView] Initializing tutorial for new character in spaceport', {
          characterId: currentCharacter.id,
          subMapId: subMap.id,
          tutorialActive
        });
        try {
          // Ensure tutorial NPC exists on submap (ignore 409 errors - NPC already exists is fine)
          try {
            const tutorialApi = await import('../services/api/tutorialApi');
            await tutorialApi.default.ensureNPCOnSubmap(currentCharacter.id, subMap.id);
            console.log('[SubMapView] Ensured tutorial NPC exists on submap');
            
            // Wait a moment for database to update, then reload NPCs
            await new Promise(resolve => setTimeout(resolve, 1000)); // Increased delay to ensure DB update
            await loadSubMapNPCs(subMap);
            console.log('[SubMapView] Reloaded NPCs after ensuring tutorial NPC');
            
            // Force a re-render by marking the canvas as dirty
            markFullRedraw();
            
            // Verify tutorial NPC is now in the NPCs array
            const tutorialNPCIds = {
              smuggler: 'npc_tutorial_dockmaster_jax',
              scholar: 'npc_tutorial_archivist_tera',
              soldier: 'npc_tutorial_sergeant_kael',
              medic: 'npc_tutorial_medic_voss',
              engineer: 'npc_tutorial_tech_rynn',
              diplomat: 'npc_tutorial_ambassador_lira',
              pilot: 'npc_tutorial_flight_controller_dex'
            };
            const expectedTutorialNPCId = tutorialNPCIds[currentCharacter.background] || tutorialNPCIds.smuggler;
            
            // Check NPCs state after reload
            setTimeout(() => {
              const currentNPCs = npcs; // This will be stale, but we'll check after state update
              console.log('[SubMapView] Checking tutorial NPC after reload, current NPCs count:', currentNPCs.length);
            }, 100);
          } catch (npcError) {
            // 409 Conflict means NPC already exists - that's fine, continue
            if (npcError.response?.status === 409 || npcError.message?.includes('already exists')) {
              console.log('[SubMapView] Tutorial NPC already exists, reloading NPCs...');
              // Still reload NPCs to make sure tutorial NPC is visible
              await loadSubMapNPCs(subMap);
            } else {
              console.warn('[SubMapView] Failed to ensure tutorial NPC (non-fatal):', npcError.message);
            }
          }
          
          // Small delay to ensure submap is fully loaded
          setTimeout(async () => {
            try {
              await startTutorial();
              console.log('[SubMapView] Tutorial start initiated');
            } catch (startError) {
              console.error('[SubMapView] Failed to start tutorial:', startError);
            }
          }, 1000);
        } catch (error) {
          console.error('[SubMapView] Failed to initialize tutorial:', error);
          // Still try to start tutorial even if NPC creation failed
          try {
            setTimeout(async () => {
              await startTutorial();
            }, 1000);
          } catch (startError) {
            console.error('[SubMapView] Failed to start tutorial after error:', startError);
          }
        }
      }
    };

    initializeTutorial();
  }, [currentCharacter?.id, subMap?.id, loading, location.state?.isNewCharacter, tutorialActive, startTutorial, loadSubMapNPCs]);

  // Add tutorial target for spaceport exit
  useEffect(() => {
    if (containerRef.current && subMap && subMap.type === 'spaceport') {
      addTutorialTarget(containerRef.current, 'spaceport-exit-point');
    }
  }, [subMap]);

  // Auto-open dialogue with tutorial NPC after returning from tutorial combat
  const autoDialogueAttemptedRef = useRef(false);
  useEffect(() => {
    const handleReturnFromTutorialCombat = async () => {
      // Check if we're returning from combat and tutorial is active
      const isReturningFromCombat = location.state?.returnFromCombat === true;
      const isTutorialCombat = location.state?.isTutorial === true;
      
      if (!isReturningFromCombat || !isTutorialCombat || !currentCharacter || !subMap || loading) {
        return;
      }

      // Wait for NPCs to be loaded before attempting to open dialogue
      if (npcs.length === 0) {
        console.log('[SubMapView] Waiting for NPCs to load before auto-opening dialogue...');
        return;
      }

      // Prevent multiple attempts
      if (autoDialogueAttemptedRef.current) {
        return;
      }

      // Check if tutorial is in combat_complete or vendor_intro state
      try {
        const { tutorialApi } = await import('../services/api/tutorialApi');
        const tutorialStateResponse = await tutorialApi.getState(currentCharacter.id);
        
        if (tutorialStateResponse.success && tutorialStateResponse.data) {
          const tutorialState = tutorialStateResponse.data.state;
          
          // Auto-open dialogue if we're in combat_complete, vendor_intro, item_sold, loot_received, inventory_opened, or spaceport_exit_explained state
          if (tutorialState === 'combat_complete' || tutorialState === 'vendor_intro' || 
              tutorialState === 'item_sold' || tutorialState === 'loot_received' || 
              tutorialState === 'inventory_opened' || tutorialState === 'spaceport_exit_explained') {
            // Find the tutorial NPC for this character's background
            const tutorialNPCIds = {
              smuggler: 'npc_tutorial_dockmaster_jax',
              scholar: 'npc_tutorial_archivist_tera',
              soldier: 'npc_tutorial_sergeant_kael',
              medic: 'npc_tutorial_medic_voss',
              engineer: 'npc_tutorial_tech_rynn',
              diplomat: 'npc_tutorial_ambassador_lira',
              pilot: 'npc_tutorial_flight_controller_dex'
            };
            const expectedTutorialNPCId = tutorialNPCIds[currentCharacter.background] || tutorialNPCIds.soldier;
            
            // Find the tutorial NPC in the NPCs array
            const tutorialNPC = npcs.find(npc => npc.id === expectedTutorialNPCId);
            
            if (tutorialNPC) {
              console.log('[SubMapView] Auto-opening dialogue with tutorial NPC after combat:', tutorialNPC.name);
              autoDialogueAttemptedRef.current = true;
              // Small delay to ensure UI is ready
              setTimeout(() => {
                setSelectedNPC(tutorialNPC);
                setNpcMenuOpen(false); // Skip the menu, go straight to dialogue
              }, 500);
            } else {
              console.warn('[SubMapView] Tutorial NPC not found for auto-dialogue, reloading NPCs...', expectedTutorialNPCId);
              // Try to reload NPCs - the effect will re-run when npcs state updates
              await loadSubMapNPCs(subMap);
            }
          }
        }
      } catch (error) {
        console.error('[SubMapView] Failed to check tutorial state for auto-dialogue:', error);
      }
    };

    handleReturnFromTutorialCombat();
    
    // Reset the ref when location changes (new navigation)
    return () => {
      if (!location.state?.returnFromCombat) {
        autoDialogueAttemptedRef.current = false;
      }
    };
  }, [location.state?.returnFromCombat, location.state?.isTutorial, currentCharacter?.id, subMap?.id, npcs, loading, loadSubMapNPCs]);

  // Auto-open dialogue and send farewell message when spaceport exit tutorial step is reached
  const farewellDialogueSentRef = useRef(false);
  useEffect(() => {
    if (tutorialState === TUTORIAL_STATES.SPACEPORT_EXIT_EXPLAINED && 
        currentCharacter && 
        subMap && 
        npcs.length > 0 && 
        !farewellDialogueSentRef.current) {
      
      // Find the tutorial NPC for this character's background
      const tutorialNPCIds = {
        smuggler: 'npc_tutorial_dockmaster_jax',
        scholar: 'npc_tutorial_archivist_tera',
        soldier: 'npc_tutorial_sergeant_kael',
        medic: 'npc_tutorial_medic_voss',
        engineer: 'npc_tutorial_tech_rynn',
        diplomat: 'npc_tutorial_ambassador_lira',
        pilot: 'npc_tutorial_flight_controller_dex'
      };
      const expectedTutorialNPCId = tutorialNPCIds[currentCharacter.background] || tutorialNPCIds.soldier;
      
      // Find the tutorial NPC in the NPCs array
      const tutorialNPC = npcs.find(npc => npc.id === expectedTutorialNPCId);
      
      if (tutorialNPC) {
        console.log('[SubMapView] Auto-opening dialogue for spaceport exit farewell:', tutorialNPC.name);
        farewellDialogueSentRef.current = true;
        // Small delay to ensure UI is ready
        setTimeout(() => {
          // Open dialogue even if it's already open (to trigger auto-send)
          setSelectedNPC(tutorialNPC);
          setNpcMenuOpen(false); // Skip the menu, go straight to dialogue
        }, 500);
      }
    }
    
    // Reset ref when tutorial state changes away from spaceport_exit_explained
    if (tutorialState !== TUTORIAL_STATES.SPACEPORT_EXIT_EXPLAINED) {
      farewellDialogueSentRef.current = false;
    }
  }, [tutorialState, currentCharacter, subMap, npcs, selectedNPC]);

  // Optimized sub-map renderer (defined early so it can be used in useEffect)
  const renderSubMapOptimized = useCallback(({ dirtyRects, needsFullRedraw, viewportCuller }) => {
    const canvas = canvasRef.current;
    if (!canvas || !subMap) return;

    const container = containerRef.current;
    if (!container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    let width = rect.width || container.offsetWidth || 800;
    let height = rect.height || container.offsetHeight || 600;

    if (width <= 0 || height <= 0) return;

    // Update canvas dimensions if needed
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      needsFullRedraw = true; // Force full redraw on resize
    }

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    try {
      const layout = subMap.layoutData || subMap.layout || {};
      const mapWidth = layout.width || 15;
      const mapHeight = layout.height || 15;
      
      const hoverState = {
        hoveredBuilding,
        hoveredPOI,
        hoveredNPC: hoveredNPC?.id || hoveredNPC,
        selectedNPC: selectedNPC?.id || selectedNPC,
        npcs: npcs // Pass NPCs to renderSubMap so it can draw them correctly
      };

      // If full redraw needed or no dirty rects, render everything
      if (needsFullRedraw || !dirtyRects || dirtyRects.length === 0) {
        // Full render (this will draw NPCs via hoverState.npcs)
        renderSubMap(ctx, width, height, subMap, zoom, pan, hoverState);
        
        // Define centerX and centerY for transformations (used by both player and enemies)
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Draw player position (player location is stored as percentage 0-100, not grid coordinates)
        if (currentCharacter?.currentLocation && currentCharacter.currentLocation.x !== undefined && currentCharacter.currentLocation.y !== undefined) {
          ctx.save();
          ctx.translate(centerX + pan.x, centerY + pan.y);
          ctx.scale(zoom, zoom);
          ctx.translate(-centerX, -centerY);
          
          // Player location is stored as percentage (0-100), convert directly to pixels
          const playerLoc = currentCharacter.currentLocation;
          
          // For dungeons, ensure we're drawing at the center of the grid cell
          let playerX, playerY;
          if (subMap.type === 'dungeon' && layout.grid) {
            const gridWidth = layout.size?.width || layout.width || 20;
            const gridHeight = layout.size?.height || layout.height || 20;
            
            // Convert percentage to grid cell, then back to pixel position at cell center
            const gridX = Math.floor((playerLoc.x / 100) * gridWidth);
            const gridY = Math.floor((playerLoc.y / 100) * gridHeight);
            
            // Calculate pixel position at the center of the grid cell
            const cellWidth = width / gridWidth;
            const cellHeight = height / gridHeight;
            playerX = gridX * cellWidth + cellWidth / 2;
            playerY = gridY * cellHeight + cellHeight / 2;
          } else {
            // Normal percentage coordinates for non-dungeons
            playerX = (playerLoc.x / 100) * width;
            playerY = (playerLoc.y / 100) * height;
          }
          
          // Use red color for consistency with planet map
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(playerX, playerY, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.stroke();
          
          // Draw "You" label
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 2;
          ctx.fillText('You', playerX, playerY + 10);
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          
          ctx.restore();
        }
        
        // Draw dungeon enemies if this is a dungeon
        if (subMap.type === 'dungeon' && dungeonEnemies.length > 0 && layout.grid) {
          ctx.save();
          ctx.translate(centerX + pan.x, centerY + pan.y);
          ctx.scale(zoom, zoom);
          ctx.translate(-centerX, -centerY);
          
          drawDungeonEnemies(
            ctx,
            width,
            height,
            dungeonEnemies,
            layout.grid,
            layout,
            hoveredEnemy
          );
          
          ctx.restore();
        }
      } else {
        // Partial render - only redraw dirty rectangles
        const centerX = width / 2;
        const centerY = height / 2;
        
        dirtyRects.forEach(rect => {
          ctx.save();
          
          // Clip to dirty rectangle with padding
          const padding = 10;
          ctx.beginPath();
          ctx.rect(rect.x - padding, rect.y - padding, rect.width + padding * 2, rect.height + padding * 2);
          ctx.clip();
          
          // Clear the dirty area
          ctx.clearRect(rect.x - padding, rect.y - padding, rect.width + padding * 2, rect.height + padding * 2);
          
          // Render map in this area (this will draw NPCs via hoverState.npcs)
          renderSubMap(ctx, width, height, subMap, zoom, pan, hoverState);
          
          // Draw dungeon enemies if this is a dungeon
          if (subMap.type === 'dungeon' && dungeonEnemies.length > 0 && layout.grid) {
            ctx.save();
            ctx.translate(centerX + pan.x, centerY + pan.y);
            ctx.scale(zoom, zoom);
            ctx.translate(-centerX, -centerY);
            
            drawDungeonEnemies(
              ctx,
              width,
              height,
              dungeonEnemies,
              layout.grid,
              layout,
              hoveredEnemy
            );
            
            ctx.restore();
          }
          
          // Draw player in this area (if visible)
          // Player location is stored as percentage (0-100), convert directly to pixels
          const playerLoc = currentCharacter?.currentLocation;
          if (playerLoc && playerLoc.x !== undefined && playerLoc.y !== undefined) {
            let playerX, playerY;
            if (subMap.type === 'dungeon' && layout.grid) {
              const gridWidth = layout.size?.width || layout.width || 20;
              const gridHeight = layout.size?.height || layout.height || 20;
              const gridX = Math.floor((playerLoc.x / 100) * gridWidth);
              const gridY = Math.floor((playerLoc.y / 100) * gridHeight);
              const cellWidth = width / gridWidth;
              const cellHeight = height / gridHeight;
              playerX = gridX * cellWidth + cellWidth / 2;
              playerY = gridY * cellHeight + cellHeight / 2;
            } else {
              playerX = (playerLoc.x / 100) * width;
              playerY = (playerLoc.y / 100) * height;
            }
            if (!viewportCuller || viewportCuller.isVisible(playerX, playerY, 20, 20)) {
              ctx.save();
              const centerX = width / 2;
              const centerY = height / 2;
              ctx.translate(centerX + pan.x, centerY + pan.y);
              ctx.scale(zoom, zoom);
              ctx.translate(-centerX, -centerY);
              
              // Use red color for consistency with planet map
              ctx.fillStyle = '#ef4444';
              ctx.beginPath();
              ctx.arc(playerX, playerY, 8, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 3;
              ctx.stroke();
              
              ctx.restore();
            }
          }
          ctx.restore(); // Restore clip
        });
      }
    } catch (error) {
      console.error('Error rendering sub-map:', error);
    }
  }, [subMap, zoom, pan, hoveredBuilding, hoveredPOI, hoveredNPC, selectedNPC, npcs, currentCharacter?.currentLocation, dungeonEnemies, hoveredEnemy]);

  // Start optimized rendering when sub-map loads
  useEffect(() => {
    if (subMap && canvasRef.current && containerRef.current) {
      markFullRedraw();
      requestRender(renderSubMapOptimized);
    } else {
      stopRender();
    }

    return () => {
      stopRender();
    };
  }, [subMap, requestRender, stopRender, markFullRedraw, renderSubMapOptimized]);

  // Mark dirty areas when dynamic elements change
  useEffect(() => {
    if (subMap && canvasRef.current) {
      // Mark area around player position as dirty (location is percentage 0-100)
      if (currentCharacter?.currentLocation && currentCharacter.currentLocation.x !== undefined && currentCharacter.currentLocation.y !== undefined) {
        const loc = currentCharacter.currentLocation;
        const canvas = canvasRef.current;
        if (canvas) {
          markDirty((loc.x / 100) * canvas.width - 50, 
                    (loc.y / 100) * canvas.height - 50, 100, 100);
        }
      }
      
      // Mark areas around NPCs as dirty
      npcs.forEach(npc => {
        if (npc.location) {
          markDirty((npc.location.x / 100) * canvasRef.current.width - 30,
                    (npc.location.y / 100) * canvasRef.current.height - 30, 60, 60);
        }
      });
    }
  }, [currentCharacter?.currentLocation, npcs, hoveredNPC, selectedNPC, hoveredBuilding, hoveredPOI, markDirty, subMap, dungeonEnemies, hoveredEnemy]);

  // Helper to draw player in sub-map (legacy function, kept for compatibility)
  const drawPlayerInSubMap = useCallback((ctx, width, height) => {
    const playerLoc = currentCharacter?.currentLocation || {};
    const playerInSubMap = currentCharacter?.currentPlanet === effectivePlanetId &&
      playerLoc &&
      (playerLoc.subMapId === subMap?.id ||
       playerLoc.area === 'submap' ||
       !playerLoc.area);

    if (playerInSubMap && playerLoc.x !== undefined && playerLoc.y !== undefined) {
      // Player location is stored as percentage (0-100), convert directly to pixels
      const playerX = (playerLoc.x / 100) * width;
      const playerY = (playerLoc.y / 100) * height;

      ctx.save();
      ctx.translate(playerX, playerY);

      // Draw player marker - use red for consistency with planet map
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 2;
      ctx.fillText('You', 0, 10);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      ctx.restore();
    }
  }, [currentCharacter, effectivePlanetId, subMap]);

  // Legacy drawSubMap for compatibility
  const drawSubMap = useCallback(() => {
    markFullRedraw();
  }, [markFullRedraw]);

  // Legacy drawSubMap function (kept for reference)
  const drawSubMapLegacy = () => {
    const canvas = canvasRef.current;
    if (!canvas || !subMap) return;

    const container = containerRef.current;
    if (!container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    let width = rect.width;
    let height = rect.height;

    if (!width || width <= 0) {
      width = container.offsetWidth || 800;
    }
    if (!height || height <= 0) {
      height = container.offsetHeight || 600;
    }

    if (width <= 0 || height <= 0) {
      setTimeout(() => drawSubMapLegacy(), 100);
      return;
    }

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const layout = subMap.layoutData || subMap.layout || {};
    const gridSize = layout.gridSize || 40;

    // Render sub-map
    renderSubMap(ctx, width, height, subMap, zoom, pan, {
      hoveredBuilding,
      hoveredPOI,
      npcs,
      hoveredNPC,
      selectedNPC
    });

    // Draw player position if in this sub-map
    // Check if player is on this planet and either in this sub-map or we assume they're here
    const playerLoc = currentCharacter?.currentLocation || {};
    const playerInSubMap = currentCharacter?.currentPlanet === effectivePlanetId &&
      playerLoc &&
      (playerLoc.subMapId === subMap.id ||
       playerLoc.area === 'submap' ||
       playerLoc.parentLocationId === effectiveParentLocationId);
    
    if (playerInSubMap && playerLoc.x !== undefined && playerLoc.y !== undefined) {
      ctx.save();
      const centerX = width / 2;
      const centerY = height / 2;
      ctx.translate(centerX + pan.x, centerY + pan.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-centerX, -centerY);
      
      // Player location is stored as percentage (0-100), convert directly to pixels
      const playerX = (playerLoc.x / 100) * width;
      const playerY = (playerLoc.y / 100) * height;
      
      // Draw player marker - use red for consistency with planet map
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(playerX, playerY, 8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Draw label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 2;
      ctx.fillText('You', playerX, playerY + 10);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      
      ctx.restore();
    }
  };

  const handleExit = useCallback(async () => {
    console.log('[Submap Exit] handleExit called', {
      subMapType: subMap?.type,
      subMapId: subMap?.id,
      effectivePlanetId,
      parentLocationId: subMap?.parentLocationId
    });
    
    // If leaving a dungeon submap, mark exit time for respawn tracking
    if (subMap && subMap.type === 'dungeon' && subMap.id) {
      try {
        console.log('[Dungeon Exit] Calling markDungeonExit for:', subMap.id);
        // Mark that player is leaving the submap (this will set lastExitTime)
        // This allows enemies to respawn when player returns later
        const result = await subMapApi.markDungeonExit(subMap.id);
        console.log('[Dungeon Exit] Marked exit time for dungeon:', subMap.id, result);
      } catch (error) {
        console.error('[Dungeon Exit] Failed to mark exit time:', error);
        // Don't prevent navigation, but log the error
      }
    }
    
        // Find the submap's location on the planet map and set player position there
    let planetLocation = null;
    if (subMap?.parentLocationId && effectivePlanetId) {
      try {
        const planetResponse = await galaxyApi.getPlanet(effectivePlanetId);
        
        if (planetResponse && planetResponse.success && planetResponse.data) {
          const planet = planetResponse.data;
          const mapLayout = planet.mapData?.mapLayout || {};
          
          // Check locations array
          const locations = mapLayout.locations || mapLayout.districts || mapLayout.regions || mapLayout.settlements || [];
          planetLocation = locations.find(loc => 
            loc.name === subMap.parentLocationId || 
            loc.id === subMap.parentLocationId ||
            loc.name?.toLowerCase() === subMap.parentLocationId?.toLowerCase()
          );
          
          // Also check POIs if not found in locations
          if (!planetLocation && planet.mapData?.pointsOfInterest) {
            planetLocation = planet.mapData.pointsOfInterest.find(poi =>
              poi.name === subMap.parentLocationId ||
              poi.id === subMap.parentLocationId ||
              poi.name?.toLowerCase() === subMap.parentLocationId?.toLowerCase()
            );
          }
          
          console.log('[Submap Exit] Found planet location:', {
            parentLocationId: subMap.parentLocationId,
            planetLocation,
            hasCoordinates: !!(planetLocation?.x && planetLocation?.y),
            allLocations: locations.map(l => ({ name: l.name, id: l.id, x: l.x, y: l.y })),
            allPOIs: planet.mapData?.pointsOfInterest?.map(p => ({ name: p.name, id: p.id, x: p.x, y: p.y })) || []
          });
        }
      } catch (error) {
        console.error('[Submap Exit] Failed to fetch planet data:', error);
        // Continue with navigation even if we can't find the location
      }
    }
    
    // Set player position on planet map if we found the location
    let spawnX = null;
    let spawnY = null;
    
    if (planetLocation && planetLocation.x !== undefined && planetLocation.y !== undefined && currentCharacter) {
      try {
        // Find a walkable position near the exit point
        spawnX = planetLocation.x;
        spawnY = planetLocation.y;
        
        // Get planet data to check tile map
        try {
          const planetResponse = await galaxyApi.getPlanet(effectivePlanetId);
          if (planetResponse && planetResponse.success && planetResponse.data) {
            const planet = planetResponse.data;
            const mapData = planet.mapData || {};
            const tileMap = mapData.tileMap;
            
            if (tileMap) {
              // Check if the original position is walkable
              const tileX = Math.floor(spawnX / (tileMap.tileSize || 2));
              const tileY = Math.floor(spawnY / (tileMap.tileSize || 2));
              
              if (tileY >= 0 && tileY < tileMap.gridSize && tileX >= 0 && tileX < tileMap.gridSize) {
                const tile = tileMap.tiles[tileY] && tileMap.tiles[tileY][tileX];
                const obstacleTypes = [
                  'building', 'rock', 'tree', 'canyon', 'lava_flow', 'volcanic_vent',
                  'crevasse', 'crater', 'water'
                ];
                
                // If position is not walkable, find nearest walkable position
                if (!tile || !tile.walkable || obstacleTypes.includes(tile.type)) {
                  console.log('[Submap Exit] Original position is not walkable, searching for walkable position...', {
                    originalX: spawnX,
                    originalY: spawnY,
                    tileX,
                    tileY,
                    tileType: tile?.type,
                    walkable: tile?.walkable
                  });
                  
                  // Search in a spiral pattern for a walkable position
                  const searchRadius = 10; // Search up to 10% away
                  const stepSize = 0.5; // Search in 0.5% increments
                  let foundWalkable = false;
                  
                  for (let r = stepSize; r <= searchRadius && !foundWalkable; r += stepSize) {
                    for (let angle = 0; angle < 360 && !foundWalkable; angle += 15) {
                      const rad = (angle * Math.PI) / 180;
                      const checkX = spawnX + r * Math.cos(rad);
                      const checkY = spawnY + r * Math.sin(rad);
                      
                      // Clamp to bounds (0-100)
                      const clampedX = Math.max(0, Math.min(100, checkX));
                      const clampedY = Math.max(0, Math.min(100, checkY));
                      
                      const checkTileX = Math.floor(clampedX / (tileMap.tileSize || 2));
                      const checkTileY = Math.floor(clampedY / (tileMap.tileSize || 2));
                      
                      if (checkTileY >= 0 && checkTileY < tileMap.gridSize && 
                          checkTileX >= 0 && checkTileX < tileMap.gridSize) {
                        const checkTile = tileMap.tiles[checkTileY] && tileMap.tiles[checkTileY][checkTileX];
                        
                        if (checkTile && checkTile.walkable && !obstacleTypes.includes(checkTile.type)) {
                          spawnX = clampedX;
                          spawnY = clampedY;
                          foundWalkable = true;
                          console.log('[Submap Exit] Found walkable position:', {
                            originalX: planetLocation.x,
                            originalY: planetLocation.y,
                            walkableX: spawnX,
                            walkableY: spawnY,
                            distance: r.toFixed(2)
                          });
                        }
                      }
                    }
                  }
                  
                  if (!foundWalkable) {
                    console.warn('[Submap Exit] Could not find walkable position near exit point, using original position');
                  }
                } else {
                  console.log('[Submap Exit] Original position is walkable');
                }
              }
            }
          }
        } catch (tileMapError) {
          console.warn('[Submap Exit] Could not check tile map, using original position:', tileMapError);
        }
        
        const { updateLocation } = useCharacterStore.getState();
        await updateLocation(effectivePlanetId, {
          x: spawnX,
          y: spawnY,
          area: 'surface',
          subMapId: null,
          parentLocationId: null
        });
        console.log('[Submap Exit] Player position set on planet map:', {
          x: spawnX,
          y: spawnY,
          locationName: planetLocation.name,
          wasAdjusted: spawnX !== planetLocation.x || spawnY !== planetLocation.y
        });
      } catch (error) {
        console.error('[Submap Exit] Failed to set player position on planet map:', error);
        // Continue with navigation even if position update fails
      }
    } else {
      console.log('[Submap Exit] No planet location found or missing coordinates, player will spawn at default location');
    }
    
    // Navigate back to planet surface
    console.log('[Submap Exit] Navigating to planet:', effectivePlanetId);
    const isSpaceport = subMap?.type === 'spaceport';
    navigate(`/game/planet/${effectivePlanetId}`, {
      state: {
        returnFromSubmap: true,
        fromSpaceport: isSpaceport, // Set flag for tutorial system
        playerLocation: planetLocation && (spawnX !== null && spawnY !== null) ? {
          x: spawnX,
          y: spawnY,
          area: 'surface',
          subMapId: null,
          parentLocationId: null
        } : planetLocation ? {
          x: planetLocation.x,
          y: planetLocation.y,
          area: 'surface',
          subMapId: null,
          parentLocationId: null
        } : null
      }
    });
  }, [subMap, effectivePlanetId, navigate, currentCharacter]);

  const handleCanvasMouseDown = async (e) => {
    if (!subMap) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;

    // Convert to world coordinates (accounting for pan/zoom)
    const centerX = width / 2;
    const centerY = height / 2;
    // Reverse the pan/zoom transformation to get actual world coordinates
    const worldX = ((clickX - centerX - pan.x) / zoom) + centerX;
    const worldY = ((clickY - centerY - pan.y) / zoom) + centerY;

    const layout = subMap.layoutData || subMap.layout || {};
    const isDungeon = subMap.type === 'dungeon';
    // For dungeons, use size.width/height; for others, use width/height
    const mapWidth = isDungeon ? (layout.size?.width || layout.width || 20) : (layout.width || 15);
    const mapHeight = isDungeon ? (layout.size?.height || layout.height || 20) : (layout.height || 15);
    const buildings = layout.buildings || [];

    // Check if clicking on a defeated enemy (for searching) - only in dungeons
    if (isDungeon && dungeonEnemies.length > 0) {
      const clickedEnemy = getEnemyAtPoint(worldX, worldY, dungeonEnemies, layout, width, height);
      if (clickedEnemy && clickedEnemy.defeated) {
        // Search defeated enemy for loot
        handleSearchDefeatedEnemy(clickedEnemy);
        return;
      }
    }

    // Check if clicking on an NPC
    for (const npc of npcs) {
      const location = npc.location || {};
      
      // Convert coordinates using the same logic as the renderer
      // NPCs in sub-maps use grid coordinates (0-15), not percentages
      // If coordinates are > mapWidth/Height, they're likely percentages (0-100) and need conversion
      let npcX = location.x;
      let npcY = location.y;
      
      // Check if coordinates are percentages (0-100) instead of grid coordinates (0-15)
      if (npcX > mapWidth || npcY > mapHeight) {
        // Convert percentage to grid coordinates
        npcX = Math.round((npcX / 100) * mapWidth);
        npcY = Math.round((npcY / 100) * mapHeight);
        // Clamp to valid range
        npcX = Math.max(0, Math.min(mapWidth - 1, npcX));
        npcY = Math.max(0, Math.min(mapHeight - 1, npcY));
      }
      
      // Convert grid coordinates to screen pixels
      const x = (npcX / mapWidth) * width;
      const y = (npcY / mapHeight) * height;
      const distance = Math.sqrt((worldX - x) ** 2 + (worldY - y) ** 2);
      
      // Use larger click radius for tutorial NPCs to make them easier to click
      const isTutorialNPC = npc.id && npc.id.startsWith('npc_tutorial_');
      const clickRadius = isTutorialNPC ? 20 : 15;
      
      if (distance < clickRadius / zoom) {
        // Show NPC interaction menu instead of directly opening dialogue
        console.log(`[SubMapView] NPC clicked: ${npc.name} (${npc.id}) at grid (${npcX}, ${npcY}), screen (${x}, ${y}), distance: ${distance}`);
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        setNpcMenuPosition({ x: e.clientX, y: e.clientY });
        setSelectedNPC(npc);
        setNpcMenuOpen(true);
        setSelectedBuilding(null);
        return;
      }
    }

    // Check if clicking on a building
    let clicked = false;
    for (const building of buildings) {
      // Convert grid coordinates to pixels
      const x = (building.position.x / mapWidth) * width;
      const y = (building.position.y / mapHeight) * height;
      const w = (building.size.width / mapWidth) * width;
      const h = (building.size.height / mapHeight) * height;

      if (worldX >= x && worldX <= x + w && worldY >= y && worldY <= y + h) {
        setSelectedBuilding(building);
        clicked = true;
        break;
      }
    }

    // Check exit points
    const exitPoints = layout.exitPoints || [];
    for (const exit of exitPoints) {
      // Convert grid coordinates to pixels
      const x = (exit.position.x / mapWidth) * width;
      const y = (exit.position.y / mapHeight) * height;
      const distance = Math.sqrt((worldX - x) ** 2 + (worldY - y) ** 2);
      if (distance < 15 / zoom) {
        handleExit();
        return;
      }
    }

    if (!clicked) {
      // Check if this is a dungeon - if so, move player to clicked location with pathfinding
      const isDungeon = subMap.type === 'dungeon';
      if (isDungeon) {
        const layout = subMap.layoutData || subMap.layout || {};
        const gridWidth = layout.size?.width || layout.width || 20;
        const gridHeight = layout.size?.height || layout.height || 20;
        const grid = layout.grid;
        
        // Convert world coordinates to grid coordinates
        // worldX and worldY are already in canvas pixel coordinates (0 to width/height)
        // We need to convert these directly to grid cell coordinates
        const cellWidth = width / gridWidth;
        const cellHeight = height / gridHeight;
        const gridX = Math.floor(worldX / cellWidth);
        const gridY = Math.floor(worldY / cellHeight);
        
        // Clamp to grid bounds
        const clampedGridX = Math.max(0, Math.min(gridWidth - 1, gridX));
        const clampedGridY = Math.max(0, Math.min(gridHeight - 1, gridY));
        
        // CRITICAL: Check if target is navigable - BLOCK if it's a wall
        const targetCellValue = grid[clampedGridY]?.[clampedGridX];
        const isTargetNavigable = isNavigable(grid, clampedGridX, clampedGridY);
        
        // Log click-to-move check (only in development, reduce spam)
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
          console.log('[Click-to-Move] Target check:', {
            worldCoords: { x: worldX, y: worldY },
            gridCoords: { x: clampedGridX, y: clampedGridY },
            targetCellValue,
            isNavigable: isTargetNavigable,
            gridBounds: { width: gridWidth, height: gridHeight }
          });
        }
        
        if (!isTargetNavigable) {
          // If clicking on a wall or non-navigable cell, enable dragging for panning
          // This allows users to drag to navigate the view even in dungeons
          setIsDragging(true);
          setDragStart({ x: e.clientX, y: e.clientY });
          setMouseDownPosition({ x: e.clientX, y: e.clientY });
          setSelectedBuilding(null);
          return;
        }
        
        // For navigable cells, store the move target and enable dragging
        // If user drags, we'll pan. If they just click, we'll move the player
        const percentX = ((clampedGridX + 0.5) / gridWidth) * 100;
        const percentY = ((clampedGridY + 0.5) / gridHeight) * 100;
        setPendingMoveTarget({ x: percentX, y: percentY });
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        setMouseDownPosition({ x: e.clientX, y: e.clientY });
      } else {
        // For non-dungeons, use drag behavior
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        setMouseDownPosition({ x: e.clientX, y: e.clientY });
        setSelectedBuilding(null);
      }
    }
  };

  // Handle searching defeated enemies for loot
  const handleSearchDefeatedEnemy = useCallback(async (enemy) => {
    if (!enemy || !enemy.defeated || !subMap || !currentCharacter) {
      return;
    }

    // Check if already searched
    if (enemy.searched) {
      notify({
        type: 'info',
        title: 'Already Searched',
        message: 'You have already searched this enemy.'
      });
      return;
    }

    try {
      const response = await subMapApi.searchDefeatedEnemy(
        subMap.id,
        enemy.id,
        currentCharacter.id
      );

      const result = response?.data || response;
      
      if (result && result.loot) {
        // Update enemy state in local state
        setDungeonEnemies(prevEnemies => 
          prevEnemies.map(e => 
            e.id === enemy.id ? { ...e, searched: true } : e
          )
        );

        // Show loot notification
        const lootItems = result.loot.items || [];
        const credits = result.loot.credits || 0;
        
        let message = '';
        if (credits > 0 && lootItems.length > 0) {
          message = `Found ${credits} credits and ${lootItems.length} item(s)!`;
        } else if (credits > 0) {
          message = `Found ${credits} credits!`;
        } else if (lootItems.length > 0) {
          message = `Found ${lootItems.length} item(s)!`;
        } else {
          message = 'Found nothing of value.';
        }

        notify({
          type: 'success',
          title: 'Loot Found',
          message
        });

        // Reload inventory to show new items
        if (lootItems.length > 0) {
          loadInventory();
        }
      }
    } catch (error) {
      console.error('Failed to search defeated enemy:', error);
      notify({
        type: 'error',
        title: 'Search Failed',
        message: error.message || 'Failed to search enemy. Please try again.'
      });
    }
  }, [subMap, currentCharacter, loadInventory]);

  // Calculate depth zone from player position
  const calculateDepthZone = useCallback((playerX, playerY, layout) => {
    if (!layout || !layout.entrance || !layout.depthZones) {
      return 0;
    }

    const entrance = layout.entrance;
    const distance = Math.abs(playerX - entrance.x) + Math.abs(playerY - entrance.y);
    
    // Find which depth zone this distance falls into
    for (const zone of layout.depthZones) {
      if (distance >= zone.minDistance && distance <= zone.maxDistance) {
        return zone.depth;
      }
    }
    
    return 0; // Default to entrance
  }, []);

  // Track depth reached for quest objectives
  const trackDepthReached = useCallback(async (characterId, subMapId, depthZone) => {
    try {
      // Call backend API to track depth (will update quest objectives)
      const response = await subMapApi.trackDepth(subMapId, characterId, depthZone);
      
      if (!response || !response.success) {
        console.warn('[Dungeon] Failed to track depth:', response?.error || 'Unknown error');
      }
    } catch (error) {
      console.warn('[Dungeon] Failed to track depth reached:', error);
      // Don't throw - quest tracking shouldn't break movement
    }
  }, []);

  // Update current depth zone when player position changes (for dungeons)
  useEffect(() => {
    if (!subMap || subMap.type !== 'dungeon' || !currentCharacter?.currentLocation) {
      if (subMap && subMap.type !== 'dungeon') {
        setCurrentDepthZone(0); // Reset when not in dungeon
      }
      return;
    }

    const layout = subMap.layoutData || subMap.layout || {};
    if (!layout.grid || !layout.entrance || !layout.depthZones) {
      return;
    }

    const playerLoc = currentCharacter.currentLocation;
    const gridWidth = layout.size?.width || layout.width || 20;
    const gridHeight = layout.size?.height || layout.height || 20;
    
    // Convert percentage to grid coordinates
    const playerGridX = Math.floor((playerLoc.x / 100) * gridWidth);
    const playerGridY = Math.floor((playerLoc.y / 100) * gridHeight);
    
    // Calculate depth zone
    const depthZone = calculateDepthZone(playerGridX, playerGridY, layout);
    
    // Update state if depth zone changed
    if (depthZone !== currentDepthZone) {
      setCurrentDepthZone(depthZone);
      
      // Track depth reached for quest objectives
      if (currentCharacter.id && subMap.id) {
        trackDepthReached(currentCharacter.id, subMap.id, depthZone)
          .then(() => {
            // Reload active quests to check for completions
            if (currentCharacter.id) {
              loadActiveQuests(currentCharacter.id).catch(err => {
                console.warn('[Dungeon] Failed to reload quests after depth tracking:', err);
              });
            }
          })
          .catch(err => {
            console.warn('[Dungeon] Failed to track depth:', err);
          });
      }
    }
  }, [currentCharacter?.currentLocation, subMap, currentDepthZone, calculateDepthZone, trackDepthReached, loadActiveQuests]);

  const handleCanvasMouseMove = (e) => {
    if (!subMap) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;

    if (isDragging) {
      // Check if mouse has moved significantly (more than 5 pixels) to distinguish drag from click
      const dragDistance = Math.sqrt(
        Math.pow(e.clientX - mouseDownPosition.x, 2) + 
        Math.pow(e.clientY - mouseDownPosition.y, 2)
      );
      
      // If moved more than 5 pixels, it's a drag - clear pending move and pan
      if (dragDistance > 5 && pendingMoveTarget) {
        setPendingMoveTarget(null);
      }
      
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setPan(prevPan => ({
        x: prevPan.x + deltaX,
        y: prevPan.y + deltaY
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Convert to world coordinates for hover
    const centerX = width / 2;
    const centerY = height / 2;
    const worldX = (mouseX - centerX - pan.x) / zoom + centerX;
    const worldY = (mouseY - centerY - pan.y) / zoom + centerY;

    const layout = subMap.layoutData || subMap.layout || {};
    const mapWidth = layout.width || 15;
    const mapHeight = layout.height || 15;
    const buildings = layout.buildings || [];

    // Check hover on NPCs
    let hovered = false;
    for (const npc of npcs) {
      const location = npc.location || {};
      const x = (location.x / mapWidth) * width;
      const y = (location.y / mapHeight) * height;
      const distance = Math.sqrt((worldX - x) ** 2 + (worldY - y) ** 2);
      
      if (distance < 15 / zoom) {
        setHoveredNPC(npc.id);
        canvas.style.cursor = 'pointer';
        hovered = true;
        break;
      }
    }

    if (!hovered) {
      setHoveredNPC(null);
    }
    
    // Check hover on dungeon enemies
    if (subMap.type === 'dungeon' && dungeonEnemies.length > 0) {
      const layout = subMap.layoutData || subMap.layout || {};
      const enemy = getEnemyAtPoint(worldX, worldY, dungeonEnemies, layout, width, height);
      if (enemy) {
        setHoveredEnemy(enemy);
        canvas.style.cursor = 'pointer';
        hovered = true;
      } else if (!hovered) {
        setHoveredEnemy(null);
      }
    }

    // Check hover on buildings
    for (const building of buildings) {
      // Convert grid coordinates to pixels
      const x = (building.position.x / mapWidth) * width;
      const y = (building.position.y / mapHeight) * height;
      const w = (building.size.width / mapWidth) * width;
      const h = (building.size.height / mapHeight) * height;

      if (worldX >= x && worldX <= x + w && worldY >= y && worldY <= y + h) {
        setHoveredBuilding(building);
        canvas.style.cursor = 'pointer';
        hovered = true;
        break;
      }
    }

    if (!hovered) {
      setHoveredBuilding(null);
      canvas.style.cursor = isDragging ? 'grabbing' : 'grab';
    }
  };

  const handleCanvasMouseUp = async () => {
    // If we have a pending move target and didn't drag much, execute the move
    if (pendingMoveTarget && isDragging) {
      const dragDistance = Math.sqrt(
        Math.pow(dragStart.x - mouseDownPosition.x, 2) + 
        Math.pow(dragStart.y - mouseDownPosition.y, 2)
      );
      
      // If moved less than 5 pixels, treat as click and move player
      if (dragDistance <= 5) {
        await movePlayer(pendingMoveTarget.x, pendingMoveTarget.y, true);
      }
      
      setPendingMoveTarget(null);
    }
    
    setIsDragging(false);
  };

  const handleCanvasMouseLeave = () => {
    setIsDragging(false);
    setPendingMoveTarget(null);
  };

  // Set up wheel event listener for zooming
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prevZoom => Math.max(0.5, Math.min(3, prevZoom + delta)));
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Check for resource encounter
  const checkForResourceEncounter = useCallback(async (character, subMap) => {
    // Don't check if dialog is already open
    if (!character || !subMap || resourceEncounter?.isOpen) return false;

    // Cooldown check - don't check too frequently
    const now = Date.now();
    if (lastResourceCheck && (now - lastResourceCheck) < 2000) {
      return false; // 2 second cooldown between checks
    }
    setLastResourceCheck(now);

    try {
      const response = await subMapApi.checkResourceEncounter(subMap.id, character.id);
      
      // API client interceptor returns response.data from axios
      const result = response?.data || response;

      if (result && result.shouldTrigger && result.resource) {
        // Show resource encounter dialog
        setResourceEncounter({
          isOpen: true,
          resource: result.resource
        });
        return true;
      }
    } catch (error) {
      console.error('Failed to check for resource encounter:', error);
    }

    return false;
  }, [lastResourceCheck, resourceEncounter]);

  // Handle entering building through unlocked door
  const handleEnterBuilding = useCallback(async (building, door) => {
    if (!building || !door || !subMap || !currentCharacter) {
      console.warn('[Building Entry] Missing required data:', { building: !!building, door: !!door, subMap: !!subMap, currentCharacter: !!currentCharacter });
      return;
    }

    // Check if door is unlocked
    if (door.locked && !unlockedDoors.has(door.id)) {
      notify({
        type: 'warning',
        title: 'Door Locked',
        message: 'This door is locked. You must unlock it first.'
      });
      return;
    }

    // Validate planetId
    const planetId = subMap.planetId || effectivePlanetId;
    if (!planetId) {
      console.error('[Building Entry] Missing planetId');
      notify({
        type: 'error',
        title: 'Entry Failed',
        message: 'Cannot determine planet location. Please try again.'
      });
      return;
    }

    // Validate building ID
    if (!building.id) {
      console.error('[Building Entry] Missing building.id');
      notify({
        type: 'error',
        title: 'Entry Failed',
        message: 'Building information is invalid.'
      });
      return;
    }

    try {
      console.log('[Building Entry] Attempting to enter building:', {
        buildingId: building.id,
        buildingName: building.name,
        doorId: door.id,
        planetId,
        parentSubMapId: subMap.id
      });

      // Get or create building interior
      const interiorResponse = await subMapApi.getBuildingInterior(
        planetId,
        building.id,
        {
          ...building,
          parentSubMapId: subMap.id,
          entrance: door.position
        }
      );

      console.log('[Building Entry] API response:', interiorResponse);

      if (interiorResponse && interiorResponse.success && interiorResponse.data) {
        const interiorSubMap = interiorResponse.data;
        
        if (!interiorSubMap || !interiorSubMap.id) {
          throw new Error('Invalid interior submap data received');
        }

        console.log('[Building Entry] Interior submap loaded:', interiorSubMap.id);
        
        // Save exit position (current position on exterior)
        const exitPosition = {
          subMapId: subMap.id,
          position: {
            x: currentCharacter.currentLocation?.x || 50,
            y: currentCharacter.currentLocation?.y || 50
          }
        };

        // Navigate to building interior using the correct route format
        // Route is: /game/submap/:subMapId
        const interiorSubMapId = interiorSubMap.id;
        console.log('[Building Entry] Navigating to:', `/game/submap/${interiorSubMapId}`);
        
        navigate(`/game/submap/${interiorSubMapId}`, {
          state: {
            exitPosition,
            parentSubMap: subMap.id,
            parentSubMapId: subMap.id,
            buildingId: building.id,
            doorId: door.id,
            planetId: planetId,
            returnTo: {
              subMapId: subMap.id,
              planetId: planetId,
              parentLocationId: subMap.parentLocationId,
              parentLocationType: subMap.parentLocationType,
              type: subMap.type
            }
          }
        });
      } else {
        const errorMsg = interiorResponse?.error || 'Failed to load building interior';
        console.error('[Building Entry] API returned error:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('[Building Entry] Error:', error);
      console.error('[Building Entry] Error stack:', error.stack);
      
      // Check if it's an authentication error (401) which would redirect to landing
      if (error.response?.status === 401 || error.status === 401) {
        notify({
          type: 'error',
          title: 'Authentication Error',
          message: 'Your session has expired. Please log in again.'
        });
        // Don't navigate - let the auth system handle it
        return;
      }
      
      notify({
        type: 'error',
        title: 'Entry Failed',
        message: error.message || error.response?.data?.error || 'Failed to enter building. Please try again.'
      });
    }
  }, [subMap, currentCharacter, unlockedDoors, effectivePlanetId, navigate]);

  // Move player function
  const movePlayer = useCallback(async (x, y, usePathfinding = false) => {
    // Get current character from store to avoid stale closures
    const character = useCharacterStore.getState().currentCharacter;
    if (!character || !subMap || isMoving) {
      return;
    }

    // Prevent multiple simultaneous moves
    setIsMoving(true);
    try {
      const layout = subMap.layoutData || subMap.layout || {};
      const isDungeon = subMap.type === 'dungeon';
      
      let targetX = x;
      let targetY = y;
      let path = null;

      // For dungeons, ALWAYS use grid-based movement with strict navigability checks
      if (isDungeon && layout.grid) {
        const gridWidth = layout.size?.width || layout.width || 20;
        const gridHeight = layout.size?.height || layout.height || 20;
        const grid = layout.grid;
        
        // CRITICAL: Verify grid structure
        if (!Array.isArray(grid) || grid.length === 0) {
          console.error('[Dungeon Movement] CRITICAL: Grid is not a valid array!', {
            gridType: typeof grid,
            isArray: Array.isArray(grid),
            length: grid?.length
          });
          notify({
            type: 'error',
            title: 'Movement Error',
            message: 'Dungeon grid data is invalid. Cannot move.'
          });
          setIsMoving(false);
          return;
        }
        
        // DEBUG: Log grid info and sample wall count
        let wallCount = 0;
        let corridorCount = 0;
        let roomCount = 0;
        let totalCells = 0;
        for (let y = 0; y < grid.length; y++) {
          for (let x = 0; x < (grid[y]?.length || 0); x++) {
            const val = grid[y]?.[x];
            totalCells++;
            if (val === 0) wallCount++;
            else if (val === 1) corridorCount++;
            else if (val === 2) roomCount++;
          }
        }
        
        const wallPercent = totalCells > 0 ? (wallCount / totalCells * 100).toFixed(1) : 0;
        
        console.log('[Dungeon Movement] Grid check:', {
          isDungeon,
          hasGrid: !!grid,
          gridWidth,
          gridHeight,
          gridSize: `${grid.length}x${grid[0]?.length || 0}`,
          totalCells,
          walls: wallCount,
          corridors: corridorCount,
          rooms: roomCount,
          wallPercent: `${wallPercent}%`,
          firstRowSample: grid[0]?.slice(0, 10),
          hasWalls: wallCount > 0
        });
        
        // CRITICAL: If grid has no walls, this is a problem!
        if (wallCount === 0) {
          console.error('[Dungeon Movement] CRITICAL: Grid has NO WALLS! All cells are navigable. This is wrong.');
        }

        // Convert current position to grid coordinates
        const currentLoc = character.currentLocation || {};
        const currentGrid = percentToGrid(
          currentLoc.x || 50, 
          currentLoc.y || 50, 
          gridWidth, 
          gridHeight
        );

        // Ensure current position is navigable (if not, find nearest)
        if (!isNavigable(grid, currentGrid.x, currentGrid.y)) {
          const nearest = findNearestNavigable(grid, currentGrid.x, currentGrid.y, 5);
          if (nearest) {
            const nearestPercent = gridToPercent(nearest.x, nearest.y, gridWidth, gridHeight);
            // Clamp to valid range
            const clampedX = Math.max(0, Math.min(100, nearestPercent.x));
            const clampedY = Math.max(0, Math.min(100, nearestPercent.y));
            
            // Update character position to nearest navigable first
            const planetIdToUse = effectivePlanetId || subMap?.planetId;
            if (!planetIdToUse) {
              console.error('[Dungeon Movement] Cannot update location: planetId is missing');
              setIsMoving(false);
              return;
            }
            
            await updateLocation(planetIdToUse, {
              x: clampedX,
              y: clampedY,
              area: 'submap',
              subMapId: subMap.id,
              parentLocationId: effectiveParentLocationId || subMap?.parentLocationId
            });
            setIsMoving(false);
            return; // Exit and let player try again from valid position
          } else {
            console.error('[Dungeon Movement] Player is stuck in a wall with no escape');
            setIsMoving(false);
            return;
          }
        }

        // Convert target position to grid coordinates
        const targetGrid = percentToGrid(x, y, gridWidth, gridHeight);

        // STRICT CHECK: If target is a wall, BLOCK movement completely
        const targetCellValue = grid[targetGrid.y]?.[targetGrid.x];
        const isTargetNavigable = isNavigable(grid, targetGrid.x, targetGrid.y);
        
        // Log target check (only in development, reduce spam)
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
          console.log(`[Dungeon Movement] Target check:`, {
            targetGrid: { x: targetGrid.x, y: targetGrid.y },
            targetCellValue,
            isNavigable: isTargetNavigable,
            gridBounds: { width: gridWidth, height: gridHeight }
          });
        }
        
        if (!isTargetNavigable) {
          console.log(`[Dungeon Movement] BLOCKED: Target cell (${targetGrid.x}, ${targetGrid.y}) is a wall (value: ${targetCellValue})`);
          notify({
            type: 'error',
            title: 'Movement Blocked',
            message: 'Cannot move through walls. You must follow the corridors and pathways.'
          });
          setIsMoving(false);
          return; // BLOCK movement to walls
        }

        // Use pathfinding if requested, otherwise just validate direct movement
        if (usePathfinding) {
          // Find path using A* - this will only find paths through navigable cells
          path = findDungeonPath(grid, currentGrid, targetGrid);
          
          if (!path || path.length === 0) {
            // Enhanced logging for debugging
            const fromValue = grid[currentGrid.y]?.[currentGrid.x];
            const toValue = grid[targetGrid.y]?.[targetGrid.x];
            const fromNeighbors = getNeighbors(grid, currentGrid.x, currentGrid.y);
            
            console.warn('[Dungeon Movement] No path found to target', {
              from: currentGrid,
              to: targetGrid,
              fromValue,
              toValue,
              fromNeighborsCount: fromNeighbors.length,
              gridSize: `${gridWidth}x${gridHeight}`,
              distance: Math.abs(currentGrid.x - targetGrid.x) + Math.abs(currentGrid.y - targetGrid.y)
            });
            
            // If target is very close (adjacent), try direct movement instead
            const dx = Math.abs(currentGrid.x - targetGrid.x);
            const dy = Math.abs(currentGrid.y - targetGrid.y);
            if (dx <= 1 && dy <= 1 && (dx + dy) === 1 && isNavigable(grid, targetGrid.x, targetGrid.y)) {
              // Adjacent and navigable - allow direct movement
              console.log('[Dungeon Movement] Allowing direct adjacent movement');
              const targetPercent = gridToPercent(targetGrid.x, targetGrid.y, gridWidth, gridHeight);
              targetX = targetPercent.x;
              targetY = targetPercent.y;
              path = null; // No path needed for adjacent movement
            } else {
              notify({
                type: 'error',
                title: 'Path Blocked',
                message: 'No clear path found to that location. You must follow the corridors and pathways.'
              });
              setIsMoving(false);
              return;
            }
          }

          // Verify all path points are navigable (safety check)
          for (const point of path) {
            if (!isNavigable(grid, point.x, point.y)) {
              console.error('[Dungeon Movement] CRITICAL: Path contains non-navigable cell!', {
                point,
                cellValue: grid[point.y]?.[point.x]
              });
              notify({
                type: 'error',
                title: 'Path Error',
                message: 'Invalid path detected. Movement blocked.'
              });
              setIsMoving(false);
              return;
            }
          }

          // Convert final path point back to percentage coordinates
          const finalPoint = path[path.length - 1];
          const finalPercent = gridToPercent(finalPoint.x, finalPoint.y, gridWidth, gridHeight);
          targetX = finalPercent.x;
          targetY = finalPercent.y;
        } else {
          // For direct movement (keyboard), validate it's an adjacent navigable cell
          const dx = Math.abs(targetGrid.x - currentGrid.x);
          const dy = Math.abs(targetGrid.y - currentGrid.y);
          
          // Only allow movement to adjacent cells (1 cell away)
          if (dx > 1 || dy > 1 || (dx === 0 && dy === 0)) {
            console.warn('[Dungeon Movement] Invalid movement distance for keyboard input', {
              current: currentGrid,
              target: targetGrid,
              dx,
              dy
            });
            setIsMoving(false);
            return;
          }
          
          // DOUBLE-CHECK navigability (safety check)
          const targetCellValue = grid[targetGrid.y]?.[targetGrid.x];
          if (!isNavigable(grid, targetGrid.x, targetGrid.y)) {
            console.error('[Dungeon Movement] CRITICAL: Target cell failed navigability check in direct movement!', {
              target: targetGrid,
              cellValue: targetCellValue
            });
            notify({
              type: 'error',
              title: 'Movement Blocked',
              message: 'Cannot move through walls.'
            });
            setIsMoving(false);
            return;
          }
          
          // Convert to percentage (center of cell)
          const targetPercent = gridToPercent(targetGrid.x, targetGrid.y, gridWidth, gridHeight);
          targetX = targetPercent.x;
          targetY = targetPercent.y;
        }
      } else if (isDungeon) {
        // If this is a dungeon but grid is missing, BLOCK all movement
        console.error('[Dungeon Movement] CRITICAL: Dungeon detected but grid is missing!', {
          isDungeon,
          hasLayout: !!layout,
          hasGrid: !!layout.grid,
          layoutKeys: layout ? Object.keys(layout) : []
        });
        notify({
          type: 'error',
          title: 'Movement Error',
          message: 'Dungeon grid data is missing. Cannot move.'
        });
        setIsMoving(false);
        return;
      } else {
        // CRITICAL: If this is a dungeon, we should NEVER reach this else block
        // If we do, it means the dungeon check failed and we're allowing free movement
        if (isDungeon) {
          console.error('[Dungeon Movement] CRITICAL ERROR: Dungeon movement fell through to non-dungeon path!', {
            isDungeon,
            hasGrid: !!layout.grid,
            targetX,
            targetY
          });
          notify({
            type: 'error',
            title: 'Movement Error',
            message: 'Dungeon movement system error. Movement blocked for safety.'
          });
          setIsMoving(false);
          return;
        }
        
        // For non-dungeon submaps, check collision before allowing movement
        const collisionMap = layout.collisionMap;
        
        // Get current location for collision checking
        const currentLoc = character.currentLocation || {};
        
        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          if (!collisionMap) {
            console.warn('[Movement] No collision map found for non-dungeon submap');
          } else {
            console.debug('[Movement] Checking collision:', {
              hasCollisionMap: !!collisionMap,
              hasCells: !!collisionMap.cells,
              resolution: collisionMap.resolution,
              doors: collisionMap.doors?.length || 0
            });
          }
        }

        if (collisionMap) {
          // Check if target position is walkable
          const canMove = canMoveTo(
            collisionMap,
            currentLoc.x || 50,
            currentLoc.y || 50,
            targetX,
            targetY
          );

          // Debug logging for door detection
          if (process.env.NODE_ENV === 'development') {
            const doorAtTarget = getDoorAt(collisionMap, targetX, targetY);
            if (doorAtTarget) {
              console.log('[Movement] Door detected at target:', {
                doorId: doorAtTarget.id,
                doorPosition: doorAtTarget.position,
                doorCell: { x: doorAtTarget.cellX, y: doorAtTarget.cellY },
                targetPosition: { x: targetX, y: targetY },
                doorLocked: doorAtTarget.locked,
                doorOpensTo: doorAtTarget.opensTo,
                canMoveAllowed: canMove.allowed,
                canMoveReason: canMove.reason
              });
            }
          }

          if (!canMove.allowed) {
            // Check if there's a door at the target position that we might have missed
            const doorAtTarget = getDoorAt(collisionMap, targetX, targetY);
            if (doorAtTarget && canMove.reason === 'wall') {
              // Door exists but collision map shows it as a wall - this is a bug
              // Check if door is unlocked
              const isUnlocked = !doorAtTarget.locked || unlockedDoors.has(doorAtTarget.id);
              if (isUnlocked && doorAtTarget.opensTo && typeof doorAtTarget.opensTo === 'string' && doorAtTarget.opensTo.trim().length > 0) {
                // Door should be walkable - try to find building and enter
                const buildings = layout.buildings || [];
                let building = null;
                for (const b of buildings) {
                  if (b.collision?.doors) {
                    const door = b.collision.doors.find(d => d.id === doorAtTarget.id);
                    if (door) {
                      building = b;
                      break;
                    }
                  }
                }
                if (building) {
                  console.log('[Movement] Door detected but marked as wall - attempting entry anyway');
                  handleEnterBuilding(building, doorAtTarget);
                  setIsMoving(false);
                  return;
                }
              } else if (doorAtTarget.locked && !unlockedDoors.has(doorAtTarget.id)) {
                // Locked door - show interaction prompt
                setPendingDoorInteraction(doorAtTarget);
                notify({
                  type: 'info',
                  title: 'Locked Door',
                  message: `This door is locked. Press [E] to attempt lockpicking.`
                });
                setIsMoving(false);
                return;
              }
            }

            // Handle blocked movement
            if (canMove.reason === 'locked_door' && canMove.door) {
              // Locked door - show interaction prompt
              setPendingDoorInteraction(canMove.door);
              notify({
                type: 'info',
                title: 'Locked Door',
                message: `This door is locked. Press [E] to attempt lockpicking.`
              });
            } else if (canMove.reason === 'wall') {
              // Blocked by wall
              notify({
                type: 'warning',
                title: 'Movement Blocked',
                message: 'You cannot move through walls.'
              });
            } else {
              // Other blocking reason
              notify({
                type: 'warning',
                title: 'Movement Blocked',
                message: 'You cannot move to that location.'
              });
            }
            setIsMoving(false);
            return;
          }

          // If moving to a door (unlocked), check if it opens to a building interior
          if (canMove.reason === 'door' && canMove.door) {
            // Door is unlocked (canMove.reason === 'door' means it's walkable)
            // Find the building that contains this door
            const buildings = layout.buildings || [];
            let building = null;
            
            // Try to find building by door ID
            for (const b of buildings) {
              if (b.collision?.doors) {
                const door = b.collision.doors.find(d => d.id === canMove.door.id);
                if (door) {
                  building = b;
                  break;
                }
              }
            }
            
            // If we found a building and the door opens to an interior, enter it
            // Check if opensTo is a truthy string (not null, undefined, or empty)
            if (building && canMove.door.opensTo && typeof canMove.door.opensTo === 'string' && canMove.door.opensTo.trim().length > 0) {
              // Check if door is unlocked (double-check)
              const isUnlocked = !canMove.door.locked || unlockedDoors.has(canMove.door.id);
              
              if (isUnlocked) {
                console.log('[Movement] Entering building through door:', {
                  buildingId: building.id,
                  buildingName: building.name,
                  doorId: canMove.door.id
                });
                // Enter building interior
                handleEnterBuilding(building, canMove.door);
                setIsMoving(false);
                return;
              } else {
                // Door is still locked (shouldn't happen if canMove.reason === 'door')
                console.warn('[Movement] Door marked as walkable but still locked:', canMove.door.id);
                setPendingDoorInteraction(canMove.door);
                notify({
                  type: 'info',
                  title: 'Locked Door',
                  message: 'This door is locked. Press [E] to attempt lockpicking.'
                });
                setIsMoving(false);
                return;
              }
            } else if (building && !canMove.door.opensTo) {
              // Door doesn't open to an interior - allow normal movement through it
              console.debug('[Movement] Door does not open to interior, allowing normal movement');
            } else if (!building) {
              // Couldn't find building for this door - log warning but allow movement
              console.warn('[Movement] Could not find building for door:', canMove.door.id);
            }
            // If door doesn't have opensTo or building not found, allow normal movement through it
            // (fall through to normal movement update below)
          }
        }

        // Clamp coordinates to map bounds (0-100 for percentage)
        const clampedX = Math.max(0, Math.min(100, targetX));
        const clampedY = Math.max(0, Math.min(100, targetY));
        targetX = clampedX;
        targetY = clampedY;
      }

      // Final coordinate clamping for all cases
      const clampedX = Math.max(0, Math.min(100, targetX));
      const clampedY = Math.max(0, Math.min(100, targetY));
      
      // Ensure we have a planetId - use from subMap if effectivePlanetId is not set
      const planetIdToUse = effectivePlanetId || subMap?.planetId;
      
      if (!planetIdToUse) {
        console.error('Cannot update location: planetId is missing');
        return;
      }

      // If we have a path, animate movement along it
      if (path && path.length > 1) {
        const gridWidth = layout.size?.width || layout.width || 20;
        const gridHeight = layout.size?.height || layout.height || 20;
        
        // Convert path to percentage coordinates
        const pathPercent = path.map(point => 
          gridToPercent(point.x, point.y, gridWidth, gridHeight)
        );

        // Animate movement along path
        await animateMovement(
          pathPercent,
          (currentPos) => {
            // Update character position during animation
            const location = {
              x: currentPos.x,
              y: currentPos.y,
              area: 'submap',
              subMapId: subMap.id,
              parentLocationId: effectiveParentLocationId || subMap?.parentLocationId
            };
            
            // Update character in store for visual feedback
            const tempCharacter = { ...character, currentLocation: location };
            setCurrentCharacter(tempCharacter);
          },
          { duration: Math.max(300, pathPercent.length * 100) } // Duration based on path length
        );
      }
      
      // CRITICAL FINAL SAFETY CHECK: For dungeons, verify final position is navigable BEFORE updating
      if (isDungeon && layout.grid) {
        const gridWidth = layout.size?.width || layout.width || 20;
        const gridHeight = layout.size?.height || layout.height || 20;
        const grid = layout.grid;
        const finalGrid = percentToGrid(clampedX, clampedY, gridWidth, gridHeight);
        
        // Validate grid bounds
        if (finalGrid.y < 0 || finalGrid.y >= grid.length || 
            finalGrid.x < 0 || finalGrid.x >= (grid[finalGrid.y]?.length || 0)) {
          console.error('[Dungeon Movement] CRITICAL: Final position out of grid bounds!', {
            finalGrid,
            gridSize: `${grid.length}x${grid[0]?.length || 0}`,
            clampedCoords: { x: clampedX, y: clampedY }
          });
          notify({
            type: 'error',
            title: 'Movement Error',
            message: 'Target location is out of bounds.'
          });
          setIsMoving(false);
          return;
        }
        
        const finalCellValue = grid[finalGrid.y][finalGrid.x];
        const isFinalNavigable = isNavigable(grid, finalGrid.x, finalGrid.y);
        
        console.log('[Dungeon Movement] Final safety check:', {
          finalGrid,
          finalCellValue,
          isNavigable: isFinalNavigable,
          clampedCoords: { x: clampedX, y: clampedY }
        });
        
        if (!isFinalNavigable) {
          console.error('[Dungeon Movement] CRITICAL: Final position is not navigable! Blocking movement.', {
            finalGrid,
            finalCellValue,
            clampedCoords: { x: clampedX, y: clampedY }
          });
          notify({
            type: 'error',
            title: 'Movement Blocked',
            message: 'Cannot move to that location. It is blocked by walls.'
          });
          setIsMoving(false);
          return; // BLOCK the movement completely - DO NOT update location
        }
      }
      
      const location = {
        x: clampedX,
        y: clampedY,
        area: 'submap',
        subMapId: subMap.id,
        parentLocationId: effectiveParentLocationId || subMap?.parentLocationId
      };
      
      const updatedCharacter = await updateLocation(planetIdToUse, location);
      
      // Update character in store - this will trigger useEffect to redraw
      if (updatedCharacter) {
        setCurrentCharacter(updatedCharacter);
        
        // Check for resource encounter after movement
        await checkForResourceEncounter(updatedCharacter, subMap);
        
        // Check for combat proximity in dungeons
        if (subMap.type === 'dungeon' && dungeonEnemies.length > 0 && layout.grid) {
          const gridWidth = layout.size?.width || layout.width || 20;
          const gridHeight = layout.size?.height || layout.height || 20;
          const playerGridPos = percentToGrid(clampedX, clampedY, gridWidth, gridHeight);
          
          const combatCheck = checkCombatProximity(playerGridPos, dungeonEnemies);
          
          if (combatCheck.shouldTrigger && combatCheck.enemy) {
            // Create combat encounter first (before marking enemy as in combat)
            try {
              const encounterResponse = await combatApi.startEncounter(
                updatedCharacter.id,
                'dungeon',
                null,
                {
                  dungeonEnemy: combatCheck.enemy,
                  subMapId: subMap.id
                }
              );
              
              // Check response structure - API client returns response.data
              const encounter = encounterResponse?.data || encounterResponse;
              
              if (encounter && encounter.id) {
                // Mark enemy as in combat (only if encounter was created successfully)
                try {
                  await subMapApi.updateEnemyState(subMap.id, combatCheck.enemy.id, { inCombat: true });
                } catch (updateError) {
                  console.warn('[Dungeon] Failed to update enemy combat state (non-critical):', updateError);
                  // Continue anyway - combat is more important than state update
                }
                
                // Navigate to combat view with return location
                navigate(`/game/combat/${encounter.id}`, {
                  state: {
                    returnLocation: {
                      planetId: effectivePlanetId,
                      location: currentCharacter.currentLocation,
                      subMapId: subMap.id,
                      parentLocationId: effectiveParentLocationId,
                      parentLocationType: effectiveParentLocationType,
                      type: effectiveType
                    }
                  }
                });
              } else {
                console.error('[Dungeon] Invalid encounter response:', encounterResponse);
                notify({
                  type: 'error',
                  title: 'Combat Error',
                  message: 'Failed to initiate combat. Invalid response from server.'
                });
              }
            } catch (combatError) {
              console.error('[Dungeon] Failed to create combat encounter:', combatError);
              notify({
                type: 'error',
                title: 'Combat Error',
                message: 'Failed to initiate combat. Please try again.'
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to update player location in sub-map:', error);
    } finally {
      setIsMoving(false);
    }
  }, [subMap, effectivePlanetId, effectiveParentLocationId, isMoving, updateLocation, setCurrentCharacter, checkForResourceEncounter, calculateDepthZone, trackDepthReached, currentCharacter]);

  // Set up keyboard navigation
  useEffect(() => {
    const handleKeyDown = async (e) => {
      // Only handle arrow keys when not typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Get current character from store to avoid stale closures
      const character = useCharacterStore.getState().currentCharacter;
      if (!character || !subMap || isMoving) return;

      const layout = subMap.layoutData || subMap.layout || {};
      const isDungeon = subMap.type === 'dungeon';
      
      // CRITICAL: For dungeons, we MUST use grid-based movement
      if (isDungeon && layout.grid) {
        const gridWidth = layout.size?.width || layout.width || 20;
        const gridHeight = layout.size?.height || layout.height || 20;
        const grid = layout.grid;
        
        // Verify grid is valid
        if (!grid || !Array.isArray(grid) || grid.length === 0) {
          console.error('[Keyboard] CRITICAL: Grid is missing or invalid!', {
            hasGrid: !!grid,
            isArray: Array.isArray(grid),
            length: grid?.length,
            subMapType: subMap.type
          });
          return; // Can't move without grid
        }
        
        const currentLoc = character.currentLocation || {};
        const currentGrid = percentToGrid(
          currentLoc.x || 50,
          currentLoc.y || 50,
          gridWidth,
          gridHeight
        );
        
        // Ensure current position is valid
        if (!isNavigable(grid, currentGrid.x, currentGrid.y)) {
          console.warn('[Keyboard] Current position is not navigable, finding nearest');
          const nearest = findNearestNavigable(grid, currentGrid.x, currentGrid.y, 5);
          if (nearest) {
            const nearestPercent = gridToPercent(nearest.x, nearest.y, gridWidth, gridHeight);
            await movePlayer(nearestPercent.x, nearestPercent.y, false);
          }
          return;
        }
        
        let targetGrid = { ...currentGrid };
        let shouldMove = false;
        
        // Calculate target grid position based on key
        switch (e.key) {
          case 'ArrowUp':
          case 'w':
          case 'W':
            e.preventDefault();
            targetGrid.y = Math.max(0, currentGrid.y - 1);
            shouldMove = true;
            break;
          case 'ArrowDown':
          case 's':
          case 'S':
            e.preventDefault();
            targetGrid.y = Math.min(gridHeight - 1, currentGrid.y + 1);
            shouldMove = true;
            break;
          case 'ArrowLeft':
          case 'a':
          case 'A':
            e.preventDefault();
            targetGrid.x = Math.max(0, currentGrid.x - 1);
            shouldMove = true;
            break;
          case 'ArrowRight':
          case 'd':
          case 'D':
            e.preventDefault();
            targetGrid.x = Math.min(gridWidth - 1, currentGrid.x + 1);
            shouldMove = true;
            break;
        }
        
        // CRITICAL CHECK: Block movement to walls
        if (shouldMove) {
          const targetCellValue = grid[targetGrid.y]?.[targetGrid.x];
          const isTargetNavigable = isNavigable(grid, targetGrid.x, targetGrid.y);
          
          console.log('[Keyboard] Movement check:', {
            from: currentGrid,
            to: targetGrid,
            targetCellValue,
            isNavigable: isTargetNavigable
          });
          
          if (!isTargetNavigable) {
            console.log(`[Keyboard] BLOCKED: Cannot move to wall at (${targetGrid.x}, ${targetGrid.y})`);
            notify({
              type: 'error',
              title: 'Movement Blocked',
              message: 'Cannot move through walls. Follow the corridors and pathways.'
            });
            return; // BLOCK movement
          }
          
          // Convert grid coordinates to percentage and move
          const targetPercent = gridToPercent(targetGrid.x, targetGrid.y, gridWidth, gridHeight);
          await movePlayer(targetPercent.x, targetPercent.y, false);
        }
        return; // Exit early for dungeons
      }
      
      // Non-dungeon movement with collision checking
      const currentLoc = character.currentLocation || {};
      let newX = currentLoc.x || 50;
      let newY = currentLoc.y || 50;

      let shouldMove = false;
      let moveSpeed = 2; // Default movement speed in percentage points
      
      // Get collision map for non-dungeon submaps (layout already declared above)
      const collisionMap = layout.collisionMap;

      if (false) { // This block is now unreachable for dungeons
        // For dungeons, move one cell at a time
        const gridWidth = layout.size?.width || layout.width || 20;
        const gridHeight = layout.size?.height || layout.height || 20;
        const grid = layout.grid;

        // Convert current position to grid coordinates
        const currentGrid = percentToGrid(newX, newY, gridWidth, gridHeight);
        let targetGrid = { ...currentGrid };

        switch (e.key) {
          case 'ArrowUp':
          case 'w':
          case 'W':
            e.preventDefault();
            targetGrid.y = Math.max(0, currentGrid.y - 1);
            shouldMove = true;
            break;
          case 'ArrowDown':
          case 's':
          case 'S':
            e.preventDefault();
            targetGrid.y = Math.min(gridHeight - 1, currentGrid.y + 1);
            shouldMove = true;
            break;
          case 'ArrowLeft':
          case 'a':
          case 'A':
            e.preventDefault();
            targetGrid.x = Math.max(0, currentGrid.x - 1);
            shouldMove = true;
            break;
          case 'ArrowRight':
          case 'd':
          case 'D':
            e.preventDefault();
            targetGrid.x = Math.min(gridWidth - 1, currentGrid.x + 1);
            shouldMove = true;
            break;
        }

        // Check if target cell is navigable
        if (shouldMove && !isNavigable(grid, targetGrid.x, targetGrid.y)) {
          shouldMove = false; // Can't move into a wall
        }

        if (shouldMove) {
          // Convert grid coordinates back to percentage
          const targetPercent = gridToPercent(targetGrid.x, targetGrid.y, gridWidth, gridHeight);
          newX = targetPercent.x;
          newY = targetPercent.y;
        }
      } else {
        // For non-dungeons, use percentage-based movement
        switch (e.key) {
          case 'ArrowUp':
          case 'w':
          case 'W':
            e.preventDefault();
            const targetYUp = Math.max(0, newY - moveSpeed);
            // Check collision before allowing movement
            const collisionUp = collisionMap ? canMoveTo(collisionMap, newX, newY, newX, targetYUp) : { allowed: true };
            if (collisionUp.allowed) {
              // Check if this is a door that opens to a building interior
              if (collisionUp.reason === 'door' && collisionUp.door && collisionUp.door.opensTo && typeof collisionUp.door.opensTo === 'string' && collisionUp.door.opensTo.trim().length > 0) {
                const buildings = layout.buildings || [];
                let building = null;
                for (const b of buildings) {
                  if (b.collision?.doors) {
                    const door = b.collision.doors.find(d => d.id === collisionUp.door.id);
                    if (door) {
                      building = b;
                      break;
                    }
                  }
                }
                if (building) {
                  const isUnlocked = !collisionUp.door.locked || unlockedDoors.has(collisionUp.door.id);
                  if (isUnlocked) {
                    handleEnterBuilding(building, collisionUp.door);
                    return;
                  }
                }
              }
              newY = targetYUp;
              shouldMove = true;
            } else if (collisionUp.reason === 'locked_door' && collisionUp.door) {
              setPendingDoorInteraction(collisionUp.door);
              notify({
                type: 'info',
                title: 'Locked Door',
                message: 'This door is locked. Press [E] to attempt lockpicking.'
              });
            } else if (collisionUp.reason === 'wall') {
              notify({
                type: 'warning',
                title: 'Movement Blocked',
                message: 'You cannot move through walls.'
              });
            }
            break;
          case 'ArrowDown':
          case 's':
          case 'S':
            e.preventDefault();
            const targetYDown = Math.min(100, newY + moveSpeed);
            const collisionDown = collisionMap ? canMoveTo(collisionMap, newX, newY, newX, targetYDown) : { allowed: true };
            if (collisionDown.allowed) {
              // Check if this is a door that opens to a building interior
              if (collisionDown.reason === 'door' && collisionDown.door && collisionDown.door.opensTo && typeof collisionDown.door.opensTo === 'string' && collisionDown.door.opensTo.trim().length > 0) {
                const buildings = layout.buildings || [];
                let building = null;
                for (const b of buildings) {
                  if (b.collision?.doors) {
                    const door = b.collision.doors.find(d => d.id === collisionDown.door.id);
                    if (door) {
                      building = b;
                      break;
                    }
                  }
                }
                if (building) {
                  const isUnlocked = !collisionDown.door.locked || unlockedDoors.has(collisionDown.door.id);
                  if (isUnlocked) {
                    handleEnterBuilding(building, collisionDown.door);
                    return;
                  }
                }
              }
              newY = targetYDown;
              shouldMove = true;
            } else if (collisionDown.reason === 'locked_door' && collisionDown.door) {
              setPendingDoorInteraction(collisionDown.door);
              notify({
                type: 'info',
                title: 'Locked Door',
                message: 'This door is locked. Press [E] to attempt lockpicking.'
              });
            } else if (collisionDown.reason === 'wall') {
              notify({
                type: 'warning',
                title: 'Movement Blocked',
                message: 'You cannot move through walls.'
              });
            }
            break;
          case 'ArrowLeft':
          case 'a':
          case 'A':
            e.preventDefault();
            const targetXLeft = Math.max(0, newX - moveSpeed);
            const collisionLeft = collisionMap ? canMoveTo(collisionMap, newX, newY, targetXLeft, newY) : { allowed: true };
            if (collisionLeft.allowed) {
              // Check if this is a door that opens to a building interior
              if (collisionLeft.reason === 'door' && collisionLeft.door && collisionLeft.door.opensTo && typeof collisionLeft.door.opensTo === 'string' && collisionLeft.door.opensTo.trim().length > 0) {
                const buildings = layout.buildings || [];
                let building = null;
                for (const b of buildings) {
                  if (b.collision?.doors) {
                    const door = b.collision.doors.find(d => d.id === collisionLeft.door.id);
                    if (door) {
                      building = b;
                      break;
                    }
                  }
                }
                if (building) {
                  const isUnlocked = !collisionLeft.door.locked || unlockedDoors.has(collisionLeft.door.id);
                  if (isUnlocked) {
                    handleEnterBuilding(building, collisionLeft.door);
                    return;
                  }
                }
              }
              newX = targetXLeft;
              shouldMove = true;
            } else if (collisionLeft.reason === 'locked_door' && collisionLeft.door) {
              setPendingDoorInteraction(collisionLeft.door);
              notify({
                type: 'info',
                title: 'Locked Door',
                message: 'This door is locked. Press [E] to attempt lockpicking.'
              });
            } else if (collisionLeft.reason === 'wall') {
              notify({
                type: 'warning',
                title: 'Movement Blocked',
                message: 'You cannot move through walls.'
              });
            }
            break;
          case 'ArrowRight':
          case 'd':
          case 'D':
            e.preventDefault();
            const targetXRight = Math.min(100, newX + moveSpeed);
            const collisionRight = collisionMap ? canMoveTo(collisionMap, newX, newY, targetXRight, newY) : { allowed: true };
            if (collisionRight.allowed) {
              // Check if this is a door that opens to a building interior
              if (collisionRight.reason === 'door' && collisionRight.door && collisionRight.door.opensTo && typeof collisionRight.door.opensTo === 'string' && collisionRight.door.opensTo.trim().length > 0) {
                const buildings = layout.buildings || [];
                let building = null;
                for (const b of buildings) {
                  if (b.collision?.doors) {
                    const door = b.collision.doors.find(d => d.id === collisionRight.door.id);
                    if (door) {
                      building = b;
                      break;
                    }
                  }
                }
                if (building) {
                  const isUnlocked = !collisionRight.door.locked || unlockedDoors.has(collisionRight.door.id);
                  if (isUnlocked) {
                    handleEnterBuilding(building, collisionRight.door);
                    return;
                  }
                }
              }
              newX = targetXRight;
              shouldMove = true;
            } else if (collisionRight.reason === 'locked_door' && collisionRight.door) {
              setPendingDoorInteraction(collisionRight.door);
              notify({
                type: 'info',
                title: 'Locked Door',
                message: 'This door is locked. Press [E] to attempt lockpicking.'
              });
            } else if (collisionRight.reason === 'wall') {
              notify({
                type: 'warning',
                title: 'Movement Blocked',
                message: 'You cannot move through walls.'
              });
            }
            break;
        }
      }

      if (shouldMove) {
        await movePlayer(newX, newY, false); // Keyboard movement doesn't use pathfinding
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [subMap, isMoving, movePlayer, pendingDoorInteraction, handleEnterBuilding, unlockedDoors]);

  // Handle door interaction (E key)
  useEffect(() => {
    const handleDoorInteraction = async (e) => {
      // Only handle E key when not typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'e' || e.key === 'E') {
        // Always prevent default for E key to avoid conflicts with other handlers
        e.preventDefault();
        e.stopPropagation(); // Stop event from bubbling to other handlers

        // Only proceed if there's a pending door interaction
        if (!pendingDoorInteraction || lockpickingActive) {
          return;
        }

        const character = useCharacterStore.getState().currentCharacter;
        if (!character || !subMap) {
          return;
        }

        const door = pendingDoorInteraction;
        
        // Check if door is already unlocked
        if (unlockedDoors.has(door.id)) {
          notify({
            type: 'info',
            title: 'Door Already Unlocked',
            message: 'This door is already unlocked.'
          });
          setPendingDoorInteraction(null);
          return;
        }

        // Pre-check: Verify lockpicking skill is unlocked
        const { ProgressionSystem } = await import('../core/progression/ProgressionSystem');
        const progressionSystem = new ProgressionSystem(character);
        const lockpickingLevel = progressionSystem.getSkillLevel('stealth', 'lockpicking');
        
        if (lockpickingLevel <= 0) {
          notify({
            type: 'error',
            title: 'Skill Required',
            message: 'You need to unlock the Lockpicking skill first. Requires Level 3 and Basic Stealth Level 2.'
          });
          
          // Emit lockpicking failed no skill event for tutorial
          tutorialEventBus.emit(TUTORIAL_EVENTS.LOCKPICKING_FAILED_NO_SKILL, {
            characterId: character.id,
            doorId: door.id,
            doorName: door.name || 'Locked Door',
            reason: 'Lockpicking skill not unlocked',
            characterLevel: character.level || 1,
            lockpickingLevel: 0,
            timestamp: new Date().toISOString()
          });
          
          setPendingDoorInteraction(null);
          return;
        }

        // Pre-check: Verify stamina is sufficient
        const lockTier = door.lockLevel || 1;
        const staminaCost = 5 + (lockTier * 2);
        const currentStamina = character.currentStamina || 0;
        
        if (currentStamina < staminaCost) {
          notify({
            type: 'error',
            title: 'Not Enough Stamina',
            message: `You need ${staminaCost} stamina to attempt lockpicking. You currently have ${currentStamina} stamina. Rest to restore stamina.`
          });
          return;
        }

        // Start lockpicking
        setLockpickingActive(true);
        
        try {
          const result = await lockpickingApi.attemptPickLock(
            character.id,
            door.id,
            door.lockLevel || 1,
            false, // useAdvantage - could check for master lockpicks
            0 // toolQuality - could check inventory
          );

          // Defensive check: ensure result exists and has expected structure
          if (!result) {
            console.error('[Door Interaction] API returned undefined result');
            throw new Error('Lockpicking API returned no result');
          }

          console.log('[Door Interaction] Lockpicking result:', result);

          // Handle case where API returns error structure at top level
          if (result.success === false) {
            const errorMessage = result.error || result.message || 'Lockpicking failed';
            notify({
              type: 'error',
              title: 'Lockpicking Failed',
              message: errorMessage
            });
            setLockpickingActive(false);
            return;
          }

          // Handle both response formats:
          // 1. Wrapped: { success: true, data: { success: true, ... } }
          // 2. Direct: { success: true, chance: ..., ... }
          const lockpickingData = result.data || result;
          
          // Check if the lockpicking attempt was successful
          if (result.success && lockpickingData.success) {
            // Unlock door
            setUnlockedDoors(prev => new Set([...prev, door.id]));
            
            // Update collision map
            if (subMap.layoutData?.collisionMap) {
              subMap.layoutData.collisionMap = updateDoorState(
                subMap.layoutData.collisionMap,
                door.id,
                false
              );
            }
            if (subMap.layout?.collisionMap) {
              subMap.layout.collisionMap = updateDoorState(
                subMap.layout.collisionMap,
                door.id,
                false
              );
            }

            // Update character stamina
            if (lockpickingData.remainingStamina !== undefined) {
              setCurrentCharacter({
                ...character,
                currentStamina: lockpickingData.remainingStamina
              });
            }

            notify({
              type: 'success',
              title: 'Door Unlocked',
              message: `You successfully picked the lock! (${(lockpickingData.chance * 100).toFixed(0)}% chance)`
            });

            setPendingDoorInteraction(null);
            markFullRedraw(); // Redraw map to show unlocked door

            // If door opens to a building interior, show entry prompt
            if (door.opensTo) {
              setTimeout(() => {
                notify({
                  type: 'info',
                  title: 'Building Access',
                  message: 'You can now enter this building. Walk through the door to enter.'
                });
              }, 1000);
            }
          } else {
            // Lockpicking failed - lockpickingData already set above
            const reason = lockpickingData?.reason || lockpickingData?.message || 'Lockpicking failed';
            const chance = lockpickingData?.chance || 0;
            const staminaCost = lockpickingData?.staminaCost || 0;
            const remainingStamina = lockpickingData?.remainingStamina;
            
            // Build detailed failure message
            let message = '';
            if (reason === 'Not enough stamina') {
              message = `Not enough stamina to attempt lockpicking. Need ${staminaCost} stamina.`;
            } else if (reason === 'Lockpicking skill not unlocked') {
              message = 'You need to unlock the Lockpicking skill first. Requires Level 3 and Basic Stealth Level 2.';
            } else if (chance > 0) {
              // Attempt was made but failed
              message = `Lockpicking attempt failed (${(chance * 100).toFixed(0)}% success chance). You spent ${staminaCost} stamina.`;
            } else {
              message = `Failed to pick the lock. ${reason}`;
            }
            
            notify({
              type: 'error',
              title: 'Lockpicking Failed',
              message: message
            });

            // Update character stamina even on failure (stamina was consumed)
            if (remainingStamina !== undefined) {
              setCurrentCharacter({
                ...character,
                currentStamina: remainingStamina
              });
            }
          }
        } catch (error) {
          console.error('[Door Interaction] Error:', error);
          console.error('[Door Interaction] Error details:', {
            message: error.message,
            stack: error.stack,
            response: error.response,
            status: error.status
          });
          
          let errorMessage = 'Failed to attempt lockpicking.';
          if (error.message) {
            errorMessage = error.message;
          } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error.response?.data?.error) {
            errorMessage = error.response.data.error;
          }
          
          notify({
            type: 'error',
            title: 'Lockpicking Error',
            message: errorMessage
          });
        } finally {
          setLockpickingActive(false);
        }
      }
    };

    // Use capture phase to ensure this handler runs before other handlers (like HUDMenu)
    // This gives door interaction priority over other E key handlers
    window.addEventListener('keydown', handleDoorInteraction, true);
    return () => {
      window.removeEventListener('keydown', handleDoorInteraction, true);
    };
  }, [pendingDoorInteraction, lockpickingActive, subMap, unlockedDoors, setCurrentCharacter, markFullRedraw]);

  // Handle exiting building (return to exterior)
  const handleExitBuilding = useCallback(async () => {
    if (!location.state?.exitPosition || !location.state?.parentSubMap) {
      console.warn('[Building Exit] Missing exit position or parent submap:', {
        hasExitPosition: !!location.state?.exitPosition,
        hasParentSubMap: !!location.state?.parentSubMap,
        state: location.state
      });
      return;
    }

    const { exitPosition, parentSubMap } = location.state;

    try {
      console.log('[Building Exit] Exiting building interior:', {
        parentSubMapId: parentSubMap,
        exitPosition: exitPosition.position,
        exitSubMapId: exitPosition.subMapId
      });

      // Ensure movement is not blocked during exit
      setIsMoving(false);

      // Use the submap ID directly (same format as when entering)
      // The exitPosition.subMapId should match parentSubMap
      const targetSubMapId = exitPosition.subMapId || parentSubMap;
      
      console.log('[Building Exit] Navigating to parent submap:', `/game/submap/${targetSubMapId}`);
      
      // Navigate back to parent submap using the submap ID route format
      navigate(`/game/submap/${targetSubMapId}`, {
        state: {
          returnFromBuilding: true,
          restorePosition: exitPosition.position,
          parentSubMapId: targetSubMapId
        },
        replace: false // Use replace: false to allow proper state restoration
      });
    } catch (error) {
      console.error('[Building Exit] Error:', error);
      setIsMoving(false); // Ensure movement is enabled even on error
      notify({
        type: 'error',
        title: 'Exit Failed',
        message: error.message || 'Failed to exit building.'
      });
    }
  }, [location.state, navigate]);

  // Handle exiting building (return to exterior) - auto-exit detection
  useEffect(() => {
    // Check if we're in a building interior and player is at exit point
    if (subMap && subMap.type === 'building_interior' && location.state?.exitPosition) {
      const layout = subMap.layoutData || subMap.layout || {};
      const exitPoint = layout.entryPoints?.find(ep => ep.type === 'exit');
      
      if (exitPoint && currentCharacter) {
        const currentLoc = currentCharacter.currentLocation || {};
        const exitX = (exitPoint.position.x / (layout.width || 15)) * 100;
        const exitY = (exitPoint.position.y / (layout.height || 15)) * 100;
        
        // Check if player is at exit point (within 3% distance)
        const distance = Math.sqrt(
          Math.pow((currentLoc.x || 50) - exitX, 2) + 
          Math.pow((currentLoc.y || 50) - exitY, 2)
        );
        
        // Auto-exit when very close to exit point (within 2%)
        if (distance < 2 && !isMoving) {
          handleExitBuilding();
        }
      }
    }
  }, [subMap, currentCharacter, location.state, isMoving, handleExitBuilding]);

  // Handle exiting submap to planet surface - auto-exit detection
  useEffect(() => {
    // Check if player is at the main entrance/exit point (not in building interior)
    if (subMap && subMap.type !== 'building_interior' && currentCharacter && !isMoving) {
      const layout = subMap.layoutData || subMap.layout || {};
      const exitPoints = layout.exitPoints || [];
      const entryPoints = layout.entryPoints || [];
      
      // Use the first exit point (or fall back to first entry point if no exit points)
      const exitPoint = exitPoints[0] || entryPoints[0];
      
      if (exitPoint) {
        const currentLoc = currentCharacter.currentLocation || {};
        const isDungeon = subMap.type === 'dungeon';
        const mapWidth = isDungeon ? (layout.size?.width || layout.width || 20) : (layout.width || 15);
        const mapHeight = isDungeon ? (layout.size?.height || layout.height || 20) : (layout.height || 15);
        
        // Convert exit point grid coordinates to percentage
        const exitX = ((exitPoint.position.x + 0.5) / mapWidth) * 100;
        const exitY = ((exitPoint.position.y + 0.5) / mapHeight) * 100;
        
        // Check if player is at exit point (within 5% distance - more lenient)
        const distance = Math.sqrt(
          Math.pow((currentLoc.x || 50) - exitX, 2) + 
          Math.pow((currentLoc.y || 50) - exitY, 2)
        );
        
        // Log for debugging
        if (distance < 10) { // Only log when close
          console.log('[Submap Exit] Exit point check:', {
            hasExitPoints: exitPoints.length > 0,
            hasEntryPoints: entryPoints.length > 0,
            exitPoint: exitPoint.position,
            exitPercent: { x: exitX, y: exitY },
            playerPos: { x: currentLoc.x, y: currentLoc.y },
            distance: distance.toFixed(2),
            threshold: 5,
            isMoving,
            subMapType: subMap.type
          });
        }
        
        // Auto-exit when close to exit point (within 5% - more lenient threshold)
        if (distance < 5 && !isMoving) {
          console.log('[Submap Exit] ✅ Player at exit point, exiting to planet surface', {
            distance: distance.toFixed(2),
            exitPoint: exitPoint.position,
            exitPercent: { x: exitX, y: exitY },
            playerPos: { x: currentLoc.x, y: currentLoc.y },
            subMapId: subMap.id,
            parentLocationId: subMap.parentLocationId
          });
          handleExit();
        }
      } else {
        // Log if no exit point found
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) {
          console.warn('[Submap Exit] No exit point found in submap:', {
            subMapId: subMap.id,
            subMapType: subMap.type,
            hasExitPoints: exitPoints.length > 0,
            hasEntryPoints: entryPoints.length > 0,
            layout: Object.keys(layout)
          });
        }
      }
    }
  }, [subMap, currentCharacter, isMoving, handleExit]);

  // Handle restoring position when returning from building
  useEffect(() => {
    if (location.state?.restorePosition && location.state?.returnFromBuilding && subMap && currentCharacter) {
      const { restorePosition } = location.state;
      
      // Create a unique key for this restoration to prevent re-processing
      const restoreKey = `${subMap.id}_${restorePosition.x}_${restorePosition.y}`;
      
      // Skip if we've already processed this restoration
      if (positionRestoreProcessedRef.current === restoreKey) {
        console.log('[Building Exit] Position restoration already processed, skipping');
        return;
      }
      
      console.log('[Building Exit] Restoring position:', {
        subMapId: subMap.id,
        restorePosition,
        currentLocation: currentCharacter.currentLocation
      });
      
      // Mark this restoration as processed
      positionRestoreProcessedRef.current = restoreKey;
      
      // Ensure movement is not blocked
      setIsMoving(false);
      
      // Check if position needs to be restored
      // Always restore if subMapId doesn't match (player is still in building interior)
      // Or if position is significantly different
      const currentLoc = currentCharacter.currentLocation || {};
      const needsRestore = 
        !currentLoc.x || 
        !currentLoc.y || 
        currentLoc.subMapId !== subMap.id || // Always restore if subMapId doesn't match
        Math.abs((currentLoc.x || 0) - restorePosition.x) > 1 ||
        Math.abs((currentLoc.y || 0) - restorePosition.y) > 1;
      
      console.log('[Building Exit] Position restore check:', {
        needsRestore,
        currentSubMapId: currentLoc.subMapId,
        targetSubMapId: subMap.id,
        currentPos: { x: currentLoc.x, y: currentLoc.y },
        restorePos: restorePosition
      });
      
      if (needsRestore) {
        // Restore player position
        updateLocation(effectivePlanetId || subMap.planetId, {
          x: restorePosition.x,
          y: restorePosition.y,
          area: 'submap',
          subMapId: subMap.id,
          parentLocationId: subMap.parentLocationId
        }).then((updatedCharacter) => {
          console.log('[Building Exit] Position restored successfully:', {
            location: updatedCharacter?.currentLocation
          });
          if (updatedCharacter) {
            setCurrentCharacter(updatedCharacter);
            // Ensure movement is enabled after position restore
            setIsMoving(false);
            // Force a re-render to update the canvas
            setTimeout(() => {
              markFullRedraw();
            }, 100);
          }
        }).catch(err => {
          console.error('[Building Exit] Failed to restore position:', err);
          setIsMoving(false);
          // Reset the processed flag on error so we can retry
          positionRestoreProcessedRef.current = null;
        });
      } else {
        console.log('[Building Exit] Position already correct, skipping restore');
        // Still ensure movement is enabled
        setIsMoving(false);
        // Don't call setCurrentCharacter here to avoid infinite loop
        // The character state is already correct
      }
    } else {
      // Reset the processed flag when conditions change
      positionRestoreProcessedRef.current = null;
    }
  }, [location.state?.restorePosition, location.state?.returnFromBuilding, subMap?.id, effectivePlanetId, updateLocation, setCurrentCharacter, markFullRedraw]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (subMap && canvasRef.current) {
        requestAnimationFrame(() => {
          drawSubMap();
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [subMap]);

  if (loading) {
    return (
      <div className="submap-view">
        <LoadingSpinner fullScreen message="Loading sub-map..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="submap-view">
        <div className="error">Error: {error}</div>
        <button onClick={handleExit}>← Back to Planet</button>
      </div>
    );
  }

  if (!subMap) {
    return (
      <div className="submap-view">
        <div className="error">Sub-map not found</div>
        <button onClick={handleExit}>← Back to Planet</button>
      </div>
    );
  }

  return (
    <div className="submap-view">
      <HUD />
      {subMap.type === 'dungeon' && (
        <DungeonDepthIndicator
          currentDepthZone={currentDepthZone}
          depthZones={subMap.layoutData?.depthZones || subMap.layout?.depthZones || []}
          dungeonEnemies={dungeonEnemies}
          layout={subMap.layoutData || subMap.layout || {}}
        />
      )}
      <div className="submap-header">
        <div className="submap-title">
          <h2>{(() => {
            // Clean up submap name - remove internal ID prefixes like "poi_spaceport_main"
            let displayName = subMap.name || 'Unknown Location';
            // Remove common ID prefixes (poi_, submap_, etc.) and clean up underscores
            displayName = displayName.replace(/^(poi|submap)_\w+_/i, '');
            // Replace underscores with spaces and capitalize words
            displayName = displayName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return displayName;
          })()}</h2>
          <p>{subMap.metadata?.description || `${subMap.type} on ${effectivePlanetId}`}</p>
        </div>
        <div className="submap-controls">
          <button onClick={() => setZoom(prev => Math.min(3, prev + 0.1))}>+</button>
          <button onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}>-</button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reset</button>
          <button onClick={handleExit} className="exit-button">← Exit</button>
        </div>
      </div>

      <div className="submap-container" ref={containerRef}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseLeave}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        />
      </div>

      {selectedBuilding && (
        <div className="building-detail-panel">
          <h3>{selectedBuilding.name}</h3>
          <p>Type: {selectedBuilding.type}</p>
          {selectedBuilding.description && (
            <p className="building-description">{selectedBuilding.description}</p>
          )}
          {selectedBuilding.type === 'crafting_bench' && (
            <button 
              className="crafting-bench-button"
              onClick={() => {
                // Save current player location for return navigation
                const playerLoc = currentCharacter?.currentLocation || {};
                // Use subMap.id to ensure we have the actual submap ID
                const currentSubMapId = subMap?.id || effectiveSubMapId;
                console.log('[SubMapView] Navigating to crafting, saving submap ID:', {
                  subMapId: currentSubMapId,
                  effectiveSubMapId,
                  subMapIdFromSubMap: subMap?.id,
                  playerLocation: playerLoc
                });
                navigate('/game/crafting', {
                  state: {
                    returnTo: 'submap',
                    planetId: effectivePlanetId,
                    parentLocationId: effectiveParentLocationId,
                    parentLocationType: effectiveParentLocationType,
                    subMapId: currentSubMapId, // Use actual submap ID from loaded submap
                    type: subMap?.type || effectiveType, // Include type for reference
                    playerLocation: {
                      x: playerLoc.x,
                      y: playerLoc.y,
                      area: playerLoc.area,
                      subMapId: playerLoc.subMapId || currentSubMapId // Ensure subMapId is set
                    }
                  }
                });
                setSelectedBuilding(null);
              }}
            >
              🔨 Use Crafting Bench
            </button>
          )}
          {selectedBuilding.subMapId && selectedBuilding.type !== 'crafting_bench' && (
            <button onClick={() => {
              // Navigate to building interior
              navigate(`/game/submap/${selectedBuilding.subMapId}`, {
                state: {
                  planetId: effectivePlanetId,
                  parentLocationId: subMap.id,
                  parentLocationType: 'submap',
                  type: selectedBuilding.type
                }
              });
            }}>
              Enter {selectedBuilding.name}
            </button>
          )}
          <button onClick={() => setSelectedBuilding(null)}>Close</button>
        </div>
      )}

      {/* NPC Interaction Menu */}
      {npcMenuOpen && selectedNPC && (
        <NPCInteractionMenu
          npc={selectedNPC}
          planet={subMap ? { id: effectivePlanetId || subMap.planetId } : null}
          isOpen={npcMenuOpen}
          onClose={() => {
            setNpcMenuOpen(false);
            setSelectedNPC(null); // Clear selectedNPC when closing modal
          }}
          onTalk={() => {
            setNpcMenuOpen(false);
            // Keep selectedNPC set so DialogueInterface opens
          }}
          position={npcMenuPosition}
        />
      )}

      {/* Dialogue Interface - opened when Talk is clicked */}
      {selectedNPC && !npcMenuOpen && (
        <DialogueInterface
          key={`${selectedNPC?.id}-${tutorialState === TUTORIAL_STATES.SPACEPORT_EXIT_EXPLAINED ? 'farewell' : 'normal'}`}
          npc={selectedNPC}
          onClose={() => setSelectedNPC(null)}
          autoSendMessage={
            (location.state?.returnFromCombat && location.state?.isTutorial) ||
            (tutorialState === TUTORIAL_STATES.SPACEPORT_EXIT_EXPLAINED && selectedNPC?.id?.startsWith('npc_tutorial_'))
              ? ''
              : undefined
          }
        />
      )}

      {/* Pause Menu */}
      <PauseMenu isOpen={isPauseMenuOpen} onClose={() => setIsPauseMenuOpen(false)} />

      {/* Resource Encounter Dialog */}
      {resourceEncounter && resourceEncounter.isOpen && (
        <ResourceEncounterDialog
          isOpen={resourceEncounter.isOpen}
          resource={resourceEncounter.resource}
          onHarvest={async () => {
            try {
              const character = useCharacterStore.getState().currentCharacter;
              if (!character) {
                notify({
                  type: 'error',
                  title: 'Error',
                  message: 'Character not found'
                });
                return;
              }

              // Add resource to inventory
              await addItem(character.id, resourceEncounter.resource.id, 1, 'harvest');
              
              // Reload inventory to show new item
              await loadInventory(character.id);

              notify({
                type: 'success',
                title: 'Resource Harvested',
                message: `You collected ${resourceEncounter.resource.name}!`
              });

              // Close dialog
              setResourceEncounter(null);
            } catch (error) {
              console.error('Failed to harvest resource:', error);
              notify({
                type: 'error',
                title: 'Error',
                message: `Failed to harvest resource: ${error.message}`
              });
            }
          }}
          onLeave={() => {
            // Just close the dialog
            setResourceEncounter(null);
          }}
        />
      )}
      <TutorialOverlay />
    </div>
  );
}

