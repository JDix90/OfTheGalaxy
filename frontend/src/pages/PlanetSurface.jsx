/**
 * Planet Surface Page
 * 2D planet map with NPCs, POIs, and exploration
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { formatDisplayName } from '../utils/formatName';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCharacterStore } from '../state/characterSlice';
import { useDiscoveryStore } from '../state/discoverySlice';
import { useQuestStore } from '../state/questSlice';
import { galaxyApi } from '../services/api/galaxyApi';
import { npcApi } from '../services/api/npcApi';
import { characterApi } from '../services/api/characterApi';
import ConversationView from '../features/dialogue/ConversationView';
import POIInteractionMenu from '../components/poi/POIInteractionMenu';
import NPCInteractionMenu from '../components/npc/NPCInteractionMenu';
import FastTravelMenu from '../components/fastTravel/FastTravelMenu';
import SubMapEntryMenu from '../components/submap/SubMapEntryMenu';
import subMapApi from '../services/api/subMapApi';
import { renderPlanetMap } from '../utils/planetMapRenderer';
import { drawBlockedMovementIndicator } from '../utils/movementFeedback';
import { generateProceduralMap } from '../services/mapGenerator';
import { useOptimizedCanvas } from '../hooks/useOptimizedCanvas';
import navigationManager from '../services/navigationManager';
import { assetManager } from '../services/assetManager';
import { displayToInternal, internalToDisplay, normalizeCoordinates } from '../utils/coordinateConverter';
import { animateMovement, calculateAnimationDuration, getTerrainSpeedMultiplier } from '../utils/movementAnimator';
import LoadingSpinner from '../components/common/LoadingSpinner';
import HUD from '../components/hud/HUD';
import PauseMenu from '../features/menus/PauseMenu';
import TutorialOverlay from '../components/tutorial/TutorialOverlay';
import { addTutorialTarget, TUTORIAL_TARGETS } from '../services/tutorialTargetRegistry';
import { tutorialEventBus, TUTORIAL_EVENTS } from '../services/tutorialEventBus';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { notify } from '../components/hud/NotificationCenter';
import './PlanetSurface.css';

export default function PlanetSurface() {
  const { planetId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [isPauseMenuOpen, setIsPauseMenuOpen] = useState(false);
  const [planet, setPlanet] = useState(null);
  const [npcs, setNpcs] = useState([]);
  const [selectedNPC, setSelectedNPC] = useState(null);
  const [hoveredNPC, setHoveredNPC] = useState(null);
  const [hoveredPOI, setHoveredPOI] = useState(null);
  const [hoveredMarket, setHoveredMarket] = useState(null);
  const [hoveredCity, setHoveredCity] = useState(null);
  const [hoveredQuestTarget, setHoveredQuestTarget] = useState(null);
  const [escortQuest, setEscortQuest] = useState(null);
  const [escortMarker, setEscortMarker] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedPOI, setSelectedPOI] = useState(null);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isMoving, setIsMoving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [poiMenuOpen, setPoiMenuOpen] = useState(false);
  const [poiMenuPosition, setPoiMenuPosition] = useState({ x: 0, y: 0 });
  const [npcMenuOpen, setNpcMenuOpen] = useState(false);
  const [npcMenuPosition, setNpcMenuPosition] = useState({ x: 0, y: 0 });
  const [fastTravelMenuOpen, setFastTravelMenuOpen] = useState(false);
  const [pathPreview, setPathPreview] = useState(null);
  const [hoveredPath, setHoveredPath] = useState(null);
  const [blockedMovement, setBlockedMovement] = useState(null); // {x, y, obstacleName, timestamp}
  const [subMaps, setSubMaps] = useState([]);
  const [selectedSubMap, setSelectedSubMap] = useState(null);
  const [subMapMenuOpen, setSubMapMenuOpen] = useState(false);
  const [subMapMenuPosition, setSubMapMenuPosition] = useState({ x: 0, y: 0 });

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
  const pathPreviewTimeoutRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { currentCharacter, setCurrentCharacter, updateLocation } = useCharacterStore();
  const { recordDiscovery } = useDiscoveryStore();
  const { activeQuests, loadActiveQuests, updateObjective } = useQuestStore();
  
  // Load active quests when character is available
  useEffect(() => {
    if (currentCharacter?.id) {
      loadActiveQuests(currentCharacter.id).catch(err => {
        console.error('Failed to load active quests:', err);
      });
    }
  }, [currentCharacter?.id, loadActiveQuests]);

  // Check proximity to submap entry points and update menu position
  useEffect(() => {
    if (!currentCharacter || !planet || !subMaps.length) return;
    
    const playerLoc = currentCharacter.currentLocation;
    if (!playerLoc || playerLoc.area !== 'surface' || playerLoc.subMapId) {
      // If player is not on surface or in a submap, close menu
      if (subMapMenuOpen) {
        setSubMapMenuOpen(false);
        setSelectedSubMap(null);
      }
      return;
    }
    
    // Helper function to normalize coordinates to 0-100 range
    const normalizeCoordinates = (x, y) => {
      // Convert from 0-1000 to 0-100 if needed
      let normalizedX = x;
      let normalizedY = y;
      if (normalizedX > 100) normalizedX = normalizedX / 10;
      if (normalizedY > 100) normalizedY = normalizedY / 10;
      return { x: normalizedX, y: normalizedY };
    };
    
    // Helper function to normalize location/POI coordinates to 0-100 range
    const normalizePOICoordinates = (poi) => {
      let x, y;
      if (poi.location) {
        x = poi.location.x;
        y = poi.location.y;
      } else {
        x = poi.x;
        y = poi.y;
      }
      return normalizeCoordinates(x, y);
    };
    
    // Normalize player coordinates to ensure they're in 0-100 range
    const normalizedPlayerLoc = normalizeCoordinates(playerLoc.x || 0, playerLoc.y || 0);
    
    // Helper function to check if submap's parentLocationId matches a location/POI
    const subMapMatchesLocation = (subMap, location) => {
      const parentId = subMap.parentLocationId?.toLowerCase();
      const locName = location.name?.toLowerCase();
      const locId = location.id?.toLowerCase();
      return (
        location.name === subMap.parentLocationId ||
        location.id === subMap.parentLocationId ||
        locName === parentId ||
        locId === parentId ||
        locName?.replace(/[_\s]/g, '') === parentId?.replace(/[_\s]/g, '') ||
        locId?.replace(/[_\s]/g, '') === parentId?.replace(/[_\s]/g, '')
      );
    };
    
    // Find the closest location/POI to the player, then check if it has a submap
    // This matches the click behavior: find what the player is near, then check if it's enterable
    let matchingSubMap = null;
    let matchingLocation = null;
    const PROXIMITY_THRESHOLD = 2.0; // Threshold - player must be very close to location (2.0% - reduced from 5.0%)
    
    const mapLayout = planet.mapData?.mapLayout || {};
    const allLocations = [
      ...(planet.pointsOfInterest || []),
      ...(planet.mapData?.pointsOfInterest || []),
      ...(mapLayout.locations || []),
      ...(mapLayout.districts || []),
      ...(mapLayout.regions || []),
      ...(mapLayout.settlements || [])
    ];
    
    // Remove duplicates
    const uniqueLocations = [];
    const seenLocations = new Set();
    for (const loc of allLocations) {
      const locKey = loc.id || loc.name;
      if (locKey && !seenLocations.has(locKey)) {
        seenLocations.add(locKey);
        uniqueLocations.push(loc);
      }
    }
    
    // Find the closest location to the player
    let closestLocation = null;
    let closestDistance = Infinity;
    
    for (const loc of uniqueLocations) {
      const { x: locX, y: locY } = normalizePOICoordinates(loc);
      const distance = Math.sqrt(
        Math.pow(normalizedPlayerLoc.x - locX, 2) + 
        Math.pow(normalizedPlayerLoc.y - locY, 2)
      );
      
      if (distance < PROXIMITY_THRESHOLD && distance < closestDistance) {
        closestLocation = loc;
        closestDistance = distance;
      }
    }
    
    // Helper function to check if a location type is enterable (supports submaps)
    const isEnterableLocation = (location) => {
      const type = location.type?.toLowerCase();
      // Check if it's a dungeon type
      const isDungeon = type === 'danger' || 
                       type === 'mine' || 
                       type === 'underworld' || 
                       type === 'cave' || 
                       type === 'ruins' || 
                       type === 'fortress' ||
                       (location.metadata && location.metadata.isDungeon === true) ||
                       (location.dangerLevel && location.dangerLevel >= 6);
      
      // Enterable types (matches the click behavior)
      return isDungeon ||
             type === 'spaceport' ||
             type === 'market' ||
             type === 'cantina' ||
             type === 'palace' ||
             type === 'temple' ||
             type === 'medical_center' ||
             type === 'hospital' ||
             type === 'city' ||
             type === 'settlement' ||
             type === 'province' ||
             type === 'wilderness' ||
             type === 'entertainment' ||
             type === 'government' ||
             type === 'base' ||
             type === 'arena';
    };
    
    // If we found a close location, check if it's enterable
    if (closestLocation && isEnterableLocation(closestLocation)) {
      // First, try to find an existing submap
      matchingSubMap = subMaps.find(subMap => {
        const parentId = subMap.parentLocationId?.toLowerCase();
        const locName = closestLocation.name?.toLowerCase();
        const locId = closestLocation.id?.toLowerCase();
        return (
          closestLocation.name === subMap.parentLocationId ||
          closestLocation.id === subMap.parentLocationId ||
          locName === parentId ||
          locId === parentId ||
          locName?.replace(/[_\s]/g, '') === parentId?.replace(/[_\s]/g, '') ||
          locId?.replace(/[_\s]/g, '') === parentId?.replace(/[_\s]/g, '')
        );
      });
      
      // If no submap exists yet, create a virtual submap object from the location
      // The submap will be created on-demand when "Enter" is clicked (just like clicking does)
      if (!matchingSubMap) {
        const locationType = closestLocation.type?.toLowerCase();
        const isDungeon = locationType === 'danger' || 
                         locationType === 'mine' || 
                         locationType === 'underworld' || 
                         locationType === 'cave' || 
                         locationType === 'ruins' || 
                         locationType === 'fortress' ||
                         (closestLocation.metadata && closestLocation.metadata.isDungeon === true) ||
                         (closestLocation.dangerLevel && closestLocation.dangerLevel >= 6);
        
        // Determine submap type from location type
        let subMapType = locationType;
        if (isDungeon) {
          subMapType = 'dungeon';
        } else if (locationType === 'medical_center' || locationType === 'hospital') {
          subMapType = 'medical_center';
        } else if (locationType === 'spaceport') {
          subMapType = 'spaceport';
        } else if (locationType === 'market') {
          subMapType = 'market';
        } else if (locationType === 'city') {
          subMapType = 'city';
        } else if (locationType === 'settlement' || locationType === 'province') {
          subMapType = 'settlement';
        } else if (locationType === 'wilderness') {
          subMapType = 'settlement'; // Wilderness uses settlement layout
        } else {
          subMapType = 'city'; // Default to city for unknown types
        }
        
        // Create virtual submap object
        matchingSubMap = {
          id: `virtual_${closestLocation.id || closestLocation.name}`,
          name: closestLocation.name,
          type: subMapType,
          parentLocationId: closestLocation.id || closestLocation.name,
          parentLocationType: isDungeon ? locationType : 'poi'
        };
      }
      
      matchingLocation = closestLocation;
    }
    
    // Debug logging - always log when no match found, occasionally when match found
    if (process.env.NODE_ENV === 'development') {
      if (!matchingSubMap || Math.random() < 0.1) {
        console.group('[Submap Entry] Proximity check');
        console.log('Player Location:', { x: playerLoc.x, y: playerLoc.y });
        console.log('Normalized Player Location:', normalizedPlayerLoc);
        console.log('Threshold:', PROXIMITY_THRESHOLD + '%');
        console.log('Closest Location:', closestLocation ? {
          name: closestLocation.name,
          id: closestLocation.id,
          distance: closestDistance.toFixed(2) + '%',
          coords: normalizePOICoordinates(closestLocation)
        } : 'NONE');
        console.log('Total SubMaps:', subMaps.length);
        console.log('SubMap Parent Location IDs:', subMaps.map(s => s.parentLocationId));
        if (matchingSubMap) {
          console.log('✅ MATCH FOUND:', {
            subMap: matchingSubMap.name,
            location: matchingLocation?.name,
            parentLocationId: matchingSubMap.parentLocationId,
            distance: closestDistance.toFixed(2) + '%'
          });
        } else {
          console.log('❌ NO MATCH FOUND');
          if (closestLocation) {
            console.log('  Closest location has no submap:', closestLocation.name);
          }
        }
        console.groupEnd();
      }
    }
    
    // If menu is already open, just update its position based on current pan/zoom
    if (subMapMenuOpen && selectedSubMap) {
      // Use the current matchingLocation if available, otherwise find it
      const locationToUse = matchingLocation || (() => {
        const mapLayout = planet.mapData?.mapLayout || {};
        const allLocations = [
          ...(planet.pointsOfInterest || []),
          ...(planet.mapData?.pointsOfInterest || []),
          ...(mapLayout.locations || []),
          ...(mapLayout.districts || []),
          ...(mapLayout.regions || []),
          ...(mapLayout.settlements || [])
        ];
        return allLocations.find(loc => subMapMatchesLocation(selectedSubMap, loc));
      })();
      
      if (locationToUse) {
        const { x: locX, y: locY } = normalizePOICoordinates(locationToUse);
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const screenPos = worldToScreen(locX, locY, rect.width, rect.height);
          const finalPosition = { 
            x: rect.left + screenPos.x, 
            y: rect.top + screenPos.y 
          };
          setSubMapMenuPosition(finalPosition);
          
          // Debug logging for position update
          if (process.env.NODE_ENV === 'development') {
            console.log('[Submap Entry] Updating menu position:', {
              locationName: locationToUse.name,
              normalizedCoords: { x: locX, y: locY },
              screenPos: screenPos,
              finalPosition: finalPosition,
              pan: pan,
              zoom: zoom
            });
          }
        }
      }
      
      // If player moved away from the entry point, close menu
      // Compare by parentLocationId to handle virtual submaps
      const currentParentId = selectedSubMap?.parentLocationId?.toLowerCase();
      const matchingParentId = matchingSubMap?.parentLocationId?.toLowerCase();
      if (!matchingSubMap || !matchingLocation || 
          (currentParentId !== matchingParentId)) {
        setSubMapMenuOpen(false);
        setSelectedSubMap(null);
      }
      return;
    }
    
    // If player is not at any enterable location, close menu if open
    if (!matchingSubMap || !matchingLocation) {
      if (subMapMenuOpen) {
        setSubMapMenuOpen(false);
        setSelectedSubMap(null);
      }
      return;
    }
    
    // Player is at an enterable location - show menu
    const { x: locX, y: locY } = normalizePOICoordinates(matchingLocation);
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const screenPos = worldToScreen(locX, locY, rect.width, rect.height);
      const finalPosition = { 
        x: rect.left + screenPos.x, 
        y: rect.top + screenPos.y 
      };
      setSubMapMenuPosition(finalPosition);
      
      // Debug logging for position calculation
      if (process.env.NODE_ENV === 'development') {
        console.log('[Submap Entry] Position calculation:', {
          locationName: matchingLocation.name,
          normalizedCoords: { x: locX, y: locY },
          canvasRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
          screenPos: screenPos,
          finalPosition: finalPosition,
          pan: pan,
          zoom: zoom
        });
      }
    }
    setSelectedSubMap(matchingSubMap);
    setSubMapMenuOpen(true);
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('[Submap Entry] Showing menu for:', {
        locationName: matchingLocation.name,
        locationId: matchingLocation.id,
        locationType: matchingLocation.type,
        subMapName: matchingSubMap.name,
        subMapType: matchingSubMap.type,
        subMapParentLocationId: matchingSubMap.parentLocationId,
        isVirtual: matchingSubMap.id?.startsWith('virtual_'),
        entryPointCoords: { x: locX, y: locY },
        playerCoords: normalizedPlayerLoc
      });
    }
  }, [currentCharacter, planet, subMaps, subMapMenuOpen, selectedSubMap, pan, zoom]);

  // Load escort quest data
  useEffect(() => {
    if (!currentCharacter?.id) return;

    const loadEscortQuest = async () => {
      try {
        const response = await npcApi.getActiveEscortQuest(currentCharacter.id);
        if (response.success && response.data) {
          setEscortQuest(response.data);
          
          // Load escort marker
          const markerResponse = await npcApi.getEscortQuestMarker(currentCharacter.id);
          if (markerResponse.success && markerResponse.data) {
            setEscortMarker(markerResponse.data);
          }
          
          // Return escort data for use in interval
          return response.data;
        } else {
          setEscortQuest(null);
          setEscortMarker(null);
          return null;
        }
      } catch (error) {
        console.error('Failed to load escort quest:', error);
        setEscortQuest(null);
        setEscortMarker(null);
        return null;
      }
    };

    loadEscortQuest();
    
    // Poll for escort quest updates every 2 seconds
    // Only update escort quest state - escort NPC is drawn separately from escortQuest.npc
    // This prevents reloading all NPCs which would reset their positions
    const interval = setInterval(async () => {
      await loadEscortQuest();
      // Note: Escort NPC position is drawn directly from escortQuest.npc.location
      // No need to update the npcs array - this prevents NPCs from jumping around
    }, 2000);
    return () => clearInterval(interval);
  }, [currentCharacter?.id, planet?.id]);

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

  // Pre-load POI sprites on component mount
  useEffect(() => {
    assetManager.preloadPOISprites().catch(err => {
      console.warn('Failed to preload POI sprites:', err);
    });
  }, []);

  useEffect(() => {
    if (planetId) {
      loadPlanetData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planetId]); // loadPlanetData is stable, no need to include it

  // Reload planet data when a quest is accepted (to show new POIs)
  useEffect(() => {
    const handleQuestAccepted = (event) => {
      console.log('[PlanetSurface] Quest accepted, reloading planet data to show new POIs', event);
      if (planetId && currentCharacter && event?.characterId === currentCharacter.id) {
        // Small delay to ensure backend has saved POIs
        setTimeout(() => {
          loadPlanetData();
        }, 500);
      }
    };

    tutorialEventBus.on(TUTORIAL_EVENTS.QUEST_ACCEPTED, handleQuestAccepted);

    return () => {
      tutorialEventBus.off(TUTORIAL_EVENTS.QUEST_ACCEPTED, handleQuestAccepted);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planetId, currentCharacter?.id]); // loadPlanetData is stable

  // Reload planet data when a quest is abandoned (to remove quest POIs)
  useEffect(() => {
    const handleQuestAbandoned = (event) => {
      console.log('[PlanetSurface] Quest abandoned, reloading planet data to remove quest POIs', event);
      if (planetId && currentCharacter && event?.detail?.characterId === currentCharacter.id) {
        // Small delay to ensure backend has cleaned up POIs
        setTimeout(() => {
          loadPlanetData();
        }, 500);
      }
    };

    window.addEventListener('quest:abandoned', handleQuestAbandoned);

    return () => {
      window.removeEventListener('quest:abandoned', handleQuestAbandoned);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planetId, currentCharacter?.id]); // loadPlanetData is stable

  // Emit planet surface entered event when component mounts and player is on surface
  useEffect(() => {
    if (currentCharacter && planet && !loading) {
      const fromSpaceport = location.state?.fromSpaceport || false;
      tutorialEventBus.emit(TUTORIAL_EVENTS.PLANET_SURFACE_ENTERED, {
        characterId: currentCharacter.id,
        planetId: planet.id,
        fromSpaceport,
        location: 'planet_surface',
        timestamp: new Date().toISOString()
      });
    }
  }, [currentCharacter, planet, loading, location.state]);

  // Generate map data once when planet loads (if not already present)
  // NOTE: This should only run if backend didn't provide mapData
  useEffect(() => {
    if (planet && planet.id && !planet.mapData) {
      // Generate map data once and save it (fallback only)
      console.log('⚠️ Planet loaded without mapData, generating fallback for:', planet.name);
      const generatedMapData = generateProceduralMap(planet);
      setPlanet(prevPlanet => {
        // Only update if still no mapData (prevent race conditions)
        if (!prevPlanet?.mapData) {
          return {
            ...prevPlanet,
            mapData: generatedMapData
          };
        }
        return prevPlanet;
      });
    }
  }, [planet?.id]); // Only run when planet ID changes, not when mapData changes

  // Update viewport for culling when zoom/pan changes
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      updateViewport({
        x: -pan.x,
        y: -pan.y,
        width: rect.width,
        height: rect.height,
        zoom
      });
    }
  }, [zoom, pan, updateViewport]);

  // Optimized planet map renderer (defined early so it can be used in useEffect)
  const renderPlanetMapOptimized = useCallback(({ dirtyRects, needsFullRedraw, viewportCuller }) => {
    const canvas = canvasRef.current;
    if (!canvas || !planet) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    let width = rect.width || container.offsetWidth || 800;
    let height = rect.height || container.offsetHeight || 600;

    if (width <= 0 || height <= 0) {
      return;
    }

    // Update canvas dimensions if needed
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      needsFullRedraw = true; // Veil full redraw on resize
    }

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const mapData = planet.mapData;
    if (!mapData) {
      return;
    }

    try {
      const hoverState = {
        hoveredCity,
        hoveredPOI,
        hoveredMarket
      };

      // If full redraw needed or no dirty rects, render everything
      if (needsFullRedraw || !dirtyRects || dirtyRects.length === 0) {
        // Full render
        renderPlanetMap(ctx, width, height, planet, mapData, zoom, pan, hoverState, null);
        
        // Draw NPCs and player position
        ctx.save();
        const centerX = width / 2;
        const centerY = height / 2;
        ctx.translate(centerX + pan.x, centerY + pan.y);
        ctx.scale(zoom, zoom);
        ctx.translate(-centerX, -centerY);
        
        drawNPCs(ctx, width, height);
        drawPlayerPosition(ctx, width, height);
        
        // Draw blocked movement indicator if present
        if (blockedMovement && (Date.now() - blockedMovement.timestamp) < 1000) {
          const blockedX = (blockedMovement.x / 100) * width;
          const blockedY = (blockedMovement.y / 100) * height;
          drawBlockedMovementIndicator(ctx, blockedX, blockedY, blockedMovement.obstacleName);
        }
        
        ctx.restore();
      } else {
        // Partial render - only redraw dirty rectangles
        dirtyRects.forEach(rect => {
          ctx.save();
          
          // Clip to dirty rectangle with padding for smooth edges
          const padding = 10;
          ctx.beginPath();
          ctx.rect(rect.x - padding, rect.y - padding, rect.width + padding * 2, rect.height + padding * 2);
          ctx.clip();
          
          // Clear the dirty area
          ctx.clearRect(rect.x - padding, rect.y - padding, rect.width + padding * 2, rect.height + padding * 2);
          
          // Render map in this area
          renderPlanetMap(ctx, width, height, planet, mapData, zoom, pan, hoverState, null);
          
          // Draw NPCs and player in this area (if visible)
          ctx.save();
          const centerX = width / 2;
          const centerY = height / 2;
          ctx.translate(centerX + pan.x, centerY + pan.y);
          ctx.scale(zoom, zoom);
          ctx.translate(-centerX, -centerY);
          
          // Only draw player if in viewport
          const playerLoc = currentCharacter?.currentLocation;
          if (playerLoc) {
            const playerX = (playerLoc.x / 100) * width;
            const playerY = (playerLoc.y / 100) * height;
            if (!viewportCuller || viewportCuller.isVisible(playerX, playerY, 20, 20)) {
              drawPlayerPosition(ctx, width, height);
            }
          }
          
          // Draw blocked movement indicator if present and in viewport
          if (blockedMovement && (Date.now() - blockedMovement.timestamp) < 1000) {
            const blockedX = (blockedMovement.x / 100) * width;
            const blockedY = (blockedMovement.y / 100) * height;
            if (!viewportCuller || viewportCuller.isVisible(blockedX, blockedY, 40, 40)) {
              drawBlockedMovementIndicator(ctx, blockedX, blockedY, blockedMovement.obstacleName);
            }
          }
          
          // Draw NPCs in viewport
          npcs.forEach(npc => {
            if (npc.location) {
              const npcX = (npc.location.x / 100) * width;
              const npcY = (npc.location.y / 100) * height;
              if (!viewportCuller || viewportCuller.isVisible(npcX, npcY, 20, 20)) {
                // Draw individual NPC (simplified - would need to extract from drawNPCs)
                ctx.fillStyle = '#4a9eff';
                ctx.beginPath();
                ctx.arc(npcX, npcY, 5, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          });
          
          ctx.restore();
          ctx.restore(); // Restore clip
        });
      }
    } catch (error) {
      console.error('Error rendering planet map:', error);
      // Fallback to basic rendering
      drawBasicMap(ctx, width, height, planet);
    }
  }, [planet, zoom, pan, hoveredCity, hoveredPOI, hoveredMarket, currentCharacter, npcs]);

  // Start optimized rendering when planet loads
  useEffect(() => {
    if (planet && canvasRef.current && containerRef.current) {
      // Mark full redraw needed when planet or mapData changes
      markFullRedraw();
      
      // Start optimized rendering loop
      requestRender(renderPlanetMapOptimized);
    } else {
      stopRender();
    }

    return () => {
      stopRender();
    };
  }, [planet, planet?.mapData, requestRender, stopRender, markFullRedraw, renderPlanetMapOptimized]);

  // Mark dirty areas when dynamic elements change
  useEffect(() => {
    if (planet && canvasRef.current) {
      // Mark area around player position as dirty
      if (currentCharacter?.currentLocation) {
        const loc = currentCharacter.currentLocation;
        markDirty((loc.x / 100) * canvasRef.current.width - 50, 
                  (loc.y / 100) * canvasRef.current.height - 50, 100, 100);
      }
      
      // Mark areas around NPCs as dirty
      npcs.forEach(npc => {
        if (npc.location) {
          markDirty((npc.location.x / 100) * canvasRef.current.width - 30,
                    (npc.location.y / 100) * canvasRef.current.height - 30, 60, 60);
        }
      });
    }
  }, [currentCharacter?.currentLocation, npcs, hoveredNPC, selectedNPC, hoveredPOI, hoveredMarket, hoveredCity, selectedPOI, selectedMarket, markDirty, planet]);

  // Set up wheel event listener with passive: false
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

  // (Random-encounter polling removed in Phase 7 — combat is real-time + 3D-only; ambient hostiles
  // are walkable in-world on the 3D surface, not rolled here.)

  // Fast movement function for keyboard input (arrow keys/WASD)
  // Validates tile map to prevent moving into buildings
  const movePlayerFast = React.useCallback(async (x, y) => {
    const character = useCharacterStore.getState().currentCharacter;
    if (!character || !planet || isMoving) {
      return;
    }

    setIsMoving(true);
    try {
      // Normalize coordinates
      const normalizedDest = normalizeCoordinates(x, y);
      
      // Check tile map for all planets BEFORE moving
      const mapData = planet.mapData || {};
      const tileMap = mapData.tileMap;
      
      if (tileMap) {
        const tileX = Math.floor(normalizedDest.x / (tileMap.tileSize || 2));
        const tileY = Math.floor(normalizedDest.y / (tileMap.tileSize || 2));
        
        if (tileY >= 0 && tileY < tileMap.gridSize && tileX >= 0 && tileX < tileMap.gridSize) {
          const tile = tileMap.tiles[tileY] && tileMap.tiles[tileY][tileX];
          // Block movement on all obstacle types
          const obstacleTypes = [
            'building', 'rock', 'tree', 'canyon', 'lava_flow', 'volcanic_vent',
            'crevasse', 'crater', 'water'
          ];
          if (!tile || !tile.walkable || obstacleTypes.includes(tile.type)) {
            console.warn('[Movement] Keyboard movement blocked by obstacle', {
              tileX, tileY, tileType: tile?.type, walkable: tile?.walkable
            });
            // Show visual feedback for blocked movement
            const obstacleName = getObstacleName(tile?.type, planet);
            setBlockedMovement({
              x: normalizedDest.x,
              y: normalizedDest.y,
              obstacleName: obstacleName,
              timestamp: Date.now()
            });
            // Clear after 1 second
            setTimeout(() => setBlockedMovement(null), 1000);
            setIsMoving(false);
            return; // Block movement
          }
        } else {
          // Out of bounds
          setIsMoving(false);
          return;
        }
      }
      
      // If tile map check passes, update position
      const location = { x: normalizedDest.x, y: normalizedDest.y, area: 'surface' };
      const updatedCharacter = await updateLocation(planet.id, location);
      
      if (updatedCharacter) {
        setCurrentCharacter(updatedCharacter);
        
        // Emit tutorial event for player movement
        tutorialEventBus.emit(TUTORIAL_EVENTS.PLAYER_MOVED, {
          x: normalizedDest.x,
          y: normalizedDest.y,
          planetId: planet.id,
          location: 'planet_surface',
          characterId: updatedCharacter.id,
          timestamp: new Date().toISOString()
        });
        
        // Check if player is near a quest objective location
        const { activeQuests } = useQuestStore.getState();
        if (activeQuests && activeQuests.length > 0) {
          for (const { quest, progress } of activeQuests) {
            if (!quest.objectives) continue;
            
            for (const objective of quest.objectives) {
              // Skip completed objectives
              if (progress?.objectivesCompleted?.[objective.id]) continue;
              if (!objective.location) continue;
              
              const loc = objective.location;
              if (loc.planet !== planet.id) continue;
              
              // Check if player is near objective location (within 5% distance)
              const objX = loc.x || 0;
              const objY = loc.y || 0;
              const distance = Math.sqrt(
                Math.pow(normalizedDest.x - objX, 2) + 
                Math.pow(normalizedDest.y - objY, 2)
              );
              
              if (distance < 5) {
                // Player is near objective location
                tutorialEventBus.emit(TUTORIAL_EVENTS.QUEST_OBJECTIVE_LOCATION_REACHED, {
                  characterId: updatedCharacter.id,
                  questId: quest.id,
                  objectiveId: objective.id,
                  objectiveType: objective.type,
                  location: 'planet_surface',
                  planetId: planet.id,
                  timestamp: new Date().toISOString()
                });
                break; // Only emit once per movement
              }
            }
          }
        }
        
      }
    } catch (error) {
      console.error('Failed to update player location (fast):', error);
    } finally {
      setIsMoving(false);
    }
  }, [planet, isMoving, updateLocation, setCurrentCharacter]);

  // Move player function with pathfinding and animation (for click-to-move)
  const movePlayer = React.useCallback(async (x, y) => {
    // Get current character from store to avoid stale closures
    const character = useCharacterStore.getState().currentCharacter;
    if (!character || !planet) {
      return;
    }

    // Prevent multiple simultaneous moves
    if (isMoving) {
      return;
    }

    setIsMoving(true);
    try {
      // Normalize coordinates (handle both 0-100 and 0-1000 ranges)
      const normalizedDest = normalizeCoordinates(x, y);
      
      // Convert to internal coordinates (0-1000) for pathfinding
      const internalDest = displayToInternal(normalizedDest.x, normalizedDest.y);
      const currentLoc = character.currentLocation || {};
      const normalizedCurrent = normalizeCoordinates(currentLoc.x || 50, currentLoc.y || 50);
      const internalCurrent = displayToInternal(normalizedCurrent.x, normalizedCurrent.y);

      // Check if destination is walkable (tile map takes priority for urban planets)
      const mapData = planet.mapData || {};
      const tileMap = mapData.tileMap;
      
      // For all planets with tile maps, check tile-based walkability FIRST
      if (tileMap) {
        const tileX = Math.floor(normalizedDest.x / (tileMap.tileSize || 2));
        const tileY = Math.floor(normalizedDest.y / (tileMap.tileSize || 2));
        
        if (tileY >= 0 && tileY < tileMap.gridSize && tileX >= 0 && tileX < tileMap.gridSize) {
          const tile = tileMap.tiles[tileY] && tileMap.tiles[tileY][tileX];
          // Block movement on all obstacle types
          const obstacleTypes = [
            'building', 'rock', 'tree', 'canyon', 'lava_flow', 'volcanic_vent',
            'crevasse', 'crater', 'water'
          ];
          if (!tile || !tile.walkable || obstacleTypes.includes(tile.type)) {
            console.warn('[Movement] Destination is blocked by obstacle', {
              tileX, tileY, tileType: tile?.type, walkable: tile?.walkable
            });
            const obstacleName = getObstacleName(tile?.type);
            notify({
              type: 'warning',
              title: 'Cannot Move',
              message: `That location is blocked by ${obstacleName}.`
            });
            setIsMoving(false);
            return;
          }
        } else {
          // Out of bounds
          console.warn('[Movement] Destination is out of bounds', { tileX, tileY, gridSize: tileMap.gridSize });
          notify({
            type: 'warning',
            title: 'Cannot Move',
            message: 'That location is out of bounds.'
          });
          setIsMoving(false);
          return;
        }
      }
      
      // Check if destination is navigable (if Nav-Mesh is available)
      if (planet.navMesh) {
        // Ensure Nav-Mesh is loaded in navigation manager
        await navigationManager.loadNavMesh(planet.id, planet);
        
        const navigable = await navigationManager.isNavigable(planet.id, internalDest);
        if (!navigable) {
          console.warn('[Movement] Destination is not navigable');
          notify({
            type: 'warning',
            title: 'Cannot Move',
            message: 'That location is not accessible. You must follow the pathways.'
          });
          setIsMoving(false);
          return;
        }

        // Calculate path using pathfinding
        const path = await navigationManager.findPath(
          planet.id,
          internalCurrent,
          internalDest
        );

        if (!path || path.length === 0) {
          console.warn('[Movement] No path found to destination');
          setIsMoving(false);
          return;
        }

        // Convert path to display coordinates for animation
        const displayPath = path.map(point => internalToDisplay(point.x, point.y));
        
        // Get terrain type to determine movement speed
        const terrainType = await navigationManager.getTerrainType(planet.id, internalDest);
        const speedMultiplier = getTerrainSpeedMultiplier(terrainType);
        
        // Calculate animation duration based on path distance
        // Ensure minimum duration for visibility (even for short paths)
        const calculatedDuration = calculateAnimationDuration(displayPath);
        const duration = Math.max(300, calculatedDuration); // Minimum 300ms for visibility
        
        console.log('[Movement] Path found:', path.length, 'waypoints, terrain:', terrainType, 'speed:', speedMultiplier, 'duration:', duration);
        
        // Always animate movement along path for click-to-move
        try {
          await animateMovement(displayPath, (currentPos, progress) => {
            // Update character position during animation for visual feedback
            const tempCharacter = {
              ...character,
              currentLocation: {
                ...character.currentLocation,
                x: currentPos.x,
                y: currentPos.y
              }
            };
            // Update store for visual feedback (without saving to backend)
            setCurrentCharacter(tempCharacter);
          }, {
            duration: duration,
            speedMultiplier: speedMultiplier,
            easing: 'easeInOutQuad'
          });
        } catch (error) {
          console.warn('[Movement] Animation error:', error);
          // If animation fails, still update position
          const finalCharacter = {
            ...character,
            currentLocation: {
              ...character.currentLocation,
              x: normalizedDest.x,
              y: normalizedDest.y
            }
          };
          setCurrentCharacter(finalCharacter);
        }
      } else {
        // No Nav-Mesh available, move directly without pathfinding
        console.warn('[Movement] No Nav-Mesh available, moving directly');
      }

      // Final location update (using display coordinates 0-100)
      const location = { x: normalizedDest.x, y: normalizedDest.y, area: 'surface' };
      const updatedCharacter = await updateLocation(planet.id, location);
      
      // Update character in store - this will trigger useEffect to redraw
      if (updatedCharacter) {
        setCurrentCharacter(updatedCharacter);
        
        // Clear path preview after movement
        setPathPreview(null);
        setHoveredPath(null);
        
      }
    } catch (error) {
      console.error('Failed to update player location:', error);
    } finally {
      setIsMoving(false);
    }
  }, [planet, isMoving, updateLocation, setCurrentCharacter]);

  // Set up keyboard navigation
  useEffect(() => {
    const handleKeyDown = async (e) => {
      // Only handle arrow keys when not typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Get current character from store to avoid stale closures
      const character = useCharacterStore.getState().currentCharacter;
      if (!character || !planet || isMoving) return;

      const moveSpeed = 2; // Movement speed in percentage points
      const currentLoc = character.currentLocation || {};
      let newX = currentLoc.x || 50;
      let newY = currentLoc.y || 50;

      let shouldMove = false;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          newY = Math.max(0, newY - moveSpeed);
          shouldMove = true;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          newY = Math.min(100, newY + moveSpeed);
          shouldMove = true;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          newX = Math.max(0, newX - moveSpeed);
          shouldMove = true;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          newX = Math.min(100, newX + moveSpeed);
          shouldMove = true;
          break;
      }

      if (shouldMove) {
        // Use fast movement for keyboard input (no pathfinding, more responsive)
        await movePlayerFast(newX, newY);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [planet, isMoving, movePlayer]);


  // Regenerate map function
  const handleRegenerateMap = async () => {
    if (!planet || isRegenerating) return;

    setIsRegenerating(true);
    try {
      // Generate new procedural map based on Star Wars lore
      const newMapData = generateProceduralMap(planet);
      
      console.log('Regenerated map data:', {
        terrain: newMapData.terrain,
        cities: newMapData.mapLayout?.locations?.length || 0,
        pois: newMapData.pointsOfInterest?.length || 0,
        markets: newMapData.markets?.length || 0,
        pathways: newMapData.pathways?.length || 0
      });
      
      // Update planet with new map data
      const updatedPlanet = {
        ...planet,
        mapData: newMapData
      };
      setPlanet(updatedPlanet);
      
      // Veil redraw after state update
      setTimeout(() => {
        requestAnimationFrame(() => {
          drawPlanetMap();
        });
        setIsRegenerating(false);
      }, 150);
    } catch (error) {
      console.error('Failed to regenerate map:', error);
      setIsRegenerating(false);
      alert('Failed to regenerate map. Please try again.');
    }
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (planet && canvasRef.current) {
        requestAnimationFrame(() => {
          drawPlanetMap();
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [planet]);

  const loadPlanetData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load planet data
      const planetResponse = await galaxyApi.getPlanet(planetId);
      // apiClient interceptor returns response.data, so planetResponse is {success: true, data: {...}}
      if (!planetResponse || !planetResponse.success || !planetResponse.data) {
        throw new Error('Planet not found');
      }
      
      const loadedPlanet = planetResponse.data;
      
      // Pre-load the planet's base texture, then repaint so the photographic
      // ground layer appears without needing a manual interaction.
      if (loadedPlanet.id) {
        assetManager.loadTexture(loadedPlanet.id)
          .then((img) => { if (img) markFullRedraw(); })
          .catch(err => {
            console.debug(`[PlanetSurface] Texture pre-load failed for ${loadedPlanet.id}:`, err);
          });
      }
      
      // Generate map data if not present from backend
      if (!loadedPlanet.mapData) {
        console.warn('⚠️ Planet loaded without mapData from backend, generating fallback...');
        loadedPlanet.mapData = generateProceduralMap(loadedPlanet);
      } else {
        console.log('✅ Planet loaded with mapData from backend:', {
          terrain: loadedPlanet.mapData.terrain,
          pois: loadedPlanet.mapData.pointsOfInterest?.length || 0,
          medicalCenters: loadedPlanet.mapData.medicalCenters?.length || 0,
          hasSpaceport: !!loadedPlanet.mapData.spaceport,
          spaceportPOIs: loadedPlanet.mapData.pointsOfInterest?.filter(p => p.type === 'spaceport').length || 0,
          medicalCenterPOIs: loadedPlanet.mapData.pointsOfInterest?.filter(p => p.type === 'medical_center').length || 0
        });
        
        // Log all POIs for debugging
        if (loadedPlanet.mapData.pointsOfInterest && loadedPlanet.mapData.pointsOfInterest.length > 0) {
          console.log('📍 POIs on map:', loadedPlanet.mapData.pointsOfInterest.map(poi => ({
            name: poi.name || poi.id,
            type: poi.type,
            x: poi.x,
            y: poi.y
          })));
        }
      }
      
      // Check if returning from combat or submap - preserve player position
      const returnFromCombat = location.state?.returnFromCombat;
      const returnFromSubmap = location.state?.returnFromSubmap;
      const savedPlayerLocation = location.state?.playerLocation;
      
      // Set player spawn position adjacent to spaceport
      const character = useCharacterStore.getState().currentCharacter;
      if (character && loadedPlanet.mapData?.spaceport) {
        const spawnPos = loadedPlanet.mapData.spaceport;
        
        // Check if player needs spawn position set
        const isOnDifferentPlanet = character.currentPlanet !== loadedPlanet.id;
        const hasNoLocation = !character.currentLocation || !character.currentLocation.x || !character.currentLocation.y;
        
        // Calculate distance from spaceport if player has a location
        let isFarFromSpaceport = false;
        if (!hasNoLocation && character.currentPlanet === loadedPlanet.id) {
          const dx = character.currentLocation.x - spawnPos.x;
          const dy = character.currentLocation.y - spawnPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          // If player is more than 10% away from spaceport, consider them far
          isFarFromSpaceport = distance > 10;
        }
        
        // If returning from combat or submap, restore saved position instead of spawning at spaceport
        if ((returnFromCombat || returnFromSubmap) && savedPlayerLocation && savedPlayerLocation.x !== undefined && savedPlayerLocation.y !== undefined) {
          console.log(`📍 Restoring player position from ${returnFromSubmap ? 'submap' : 'combat'}:`, savedPlayerLocation);
          const { updateLocation } = useCharacterStore.getState();
          updateLocation(loadedPlanet.id, savedPlayerLocation).then(() => {
            console.log(`✅ Player position restored after ${returnFromSubmap ? 'exiting submap' : 'fleeing combat'}`);
          }).catch(err => {
            console.warn('Failed to restore player position:', err);
          });
        } else if (isOnDifferentPlanet || hasNoLocation || isFarFromSpaceport) {
          console.log('Setting player spawn position adjacent to spaceport:', {
            spaceport: { x: spawnPos.x, y: spawnPos.y },
            spawn: { x: spawnPos.spawnX, y: spawnPos.spawnY },
            currentLocation: character.currentLocation,
            reason: isOnDifferentPlanet ? 'different planet' : hasNoLocation ? 'no location' : 'far from spaceport'
          });
          
          // Set spawn position adjacent to spaceport
          const { updateLocation } = useCharacterStore.getState();
          updateLocation(loadedPlanet.id, { 
            x: spawnPos.spawnX, 
            y: spawnPos.spawnY, 
            area: 'spaceport' 
          }).then(() => {
            console.log('Spawn position set successfully');
            
            // Record planet discovery (first visit)
            if (isOnDifferentPlanet && character.id) {
              recordDiscovery(character.id, loadedPlanet.id, 'poi', `planet_${loadedPlanet.id}`, {
                locationName: loadedPlanet.name,
                metadata: { type: 'planet_visit' }
              }).catch(err => {
                console.warn('Failed to record planet discovery:', err);
              });
            }
          }).catch(err => {
            console.warn('Failed to set spawn position:', err);
          });
        } else {
          console.log('Player already has valid location near spaceport:', character.currentLocation);
        }
      } else if (character && !loadedPlanet.mapData?.spaceport) {
        console.warn('No spaceport found in map data, cannot set spawn position');
      }
      
      setPlanet(loadedPlanet);
      
      // Load submaps for this planet
      try {
        const subMapsResponse = await subMapApi.getSubMapsByPlanet(planetId);
        if (subMapsResponse && subMapsResponse.success && subMapsResponse.data) {
          const loadedSubMaps = Array.isArray(subMapsResponse.data) ? subMapsResponse.data : [];
          setSubMaps(loadedSubMaps);
          console.log(`✅ Loaded ${loadedSubMaps.length} submaps for planet ${planetId}`);
        }
      } catch (subMapErr) {
        console.warn('Failed to load submaps:', subMapErr);
        // Don't fail the whole page load if submaps fail
      }

      // Load NPCs on this planet
      // Load NPCs from 'surface' area AND any other areas on the planet (like 'tann_province')
      try {
        // First try to get NPCs from 'surface' area
        const surfaceNPCsResponse = await npcApi.getByLocation(planetId, 'surface');
        let existingNPCs = [];
        
        if (surfaceNPCsResponse && surfaceNPCsResponse.success && surfaceNPCsResponse.data) {
          existingNPCs = Array.isArray(surfaceNPCsResponse.data) ? surfaceNPCsResponse.data : [];
        }
        
        // Also get NPCs from other areas on the planet (like 'tann_province', 'sythmar', etc.)
        // Get all NPCs on the planet without area filter, then filter for surface-level areas
        try {
          const allPlanetNPCsResponse = await npcApi.getByLocation(planetId);
          if (allPlanetNPCsResponse && allPlanetNPCsResponse.success && allPlanetNPCsResponse.data) {
            const allNPCs = Array.isArray(allPlanetNPCsResponse.data) ? allPlanetNPCsResponse.data : [];
            // Filter for NPCs that are on surface-level areas (not in submaps)
            // Surface-level areas include: 'surface', 'tann_province', and other non-submap areas
            const surfaceLevelNPCs = allNPCs.filter(npc => {
              const area = npc.location?.area;
              // Include NPCs with no subMapId (they're on planet surface or in areas)
              return !npc.location?.subMapId && (
                area === 'surface' || 
                area === 'tann_province' ||
                !area // Include NPCs with no area specified
              );
            });
            
            // Merge with existing NPCs, avoiding duplicates
            const existingIds = new Set(existingNPCs.map(n => n.id));
            const newNPCs = surfaceLevelNPCs.filter(n => !existingIds.has(n.id));
            existingNPCs = [...existingNPCs, ...newNPCs];
          }
        } catch (areaError) {
          console.warn('Error loading NPCs from other areas:', areaError);
        }
        
        // If no NPCs exist, generate them
        if (existingNPCs.length === 0) {
          console.log('No NPCs found, generating NPCs for planet...');
          try {
            const generateResponse = await npcApi.generateForPlanet(planetId);
            if (generateResponse && generateResponse.success && generateResponse.data) {
              setNpcs(Array.isArray(generateResponse.data) ? generateResponse.data : []);
              console.log(`Generated ${generateResponse.count || generateResponse.data.length} NPCs for planet`);
            } else {
              setNpcs([]);
            }
          } catch (genError) {
            console.warn('Failed to generate NPCs:', genError);
            setNpcs([]);
          }
        } else {
          setNpcs(existingNPCs);
          console.log(`Loaded ${existingNPCs.length} NPCs for planet surface`);
        }
      } catch (npcError) {
        console.warn('Error loading NPCs:', npcError);
        setNpcs([]);
      }
    } catch (err) {
      console.error('Failed to load planet data:', err);
      setError(err.message || 'Failed to load planet data');
    } finally {
      setLoading(false);
    }
  };

  // Legacy drawPlanetMap for compatibility (triggers full redraw)
  const drawPlanetMap = useCallback(() => {
    markFullRedraw();
  }, [markFullRedraw]);

  // Legacy drawPlanetMap function (kept for fallback)
  const drawPlanetMapLegacy = () => {
    const canvas = canvasRef.current;
    if (!canvas || !planet) {
      console.warn('Cannot draw map: canvas or planet missing', { canvas: !!canvas, planet: !!planet });
      return;
    }

    const container = containerRef.current;
    if (!container) {
      console.warn('Container ref missing');
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    let width = rect.width;
    let height = rect.height;

    // Use container offset dimensions if getBoundingClientRect fails
    if (!width || width <= 0) {
      width = container.offsetWidth || 800;
    }
    if (!height || height <= 0) {
      height = container.offsetHeight || 600;
    }

    // Ensure we have valid dimensions
    if (width <= 0 || height <= 0) {
      console.warn('Container has invalid dimensions, retrying...', { width, height });
      setTimeout(() => drawPlanetMap(), 100);
      return;
    }


    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Always use existing mapData - it should already be set by useEffect
    // If it's missing, something went wrong, but don't regenerate here (causes infinite loops)
    const mapData = planet.mapData;
    if (!mapData) {
      console.warn('Map data missing, skipping draw until mapData is generated');
      return;
    }

    // Use the planet map renderer (it will handle pan/zoom internally)
    try {
      const hoverState = {
        hoveredCity,
        hoveredPOI,
        hoveredMarket
      };
      
      // Debug: Log map data (only once per render, not on every redraw)
      // Removed excessive logging to prevent console spam
      
      renderPlanetMap(ctx, width, height, planet, mapData, zoom, pan, hoverState);
      
      // Draw NPCs, quest targets, and player position with pan/zoom transformations
      ctx.save();
      const centerX = width / 2;
      const centerY = height / 2;
      ctx.translate(centerX + pan.x, centerY + pan.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-centerX, -centerY);
      
      drawNPCs(ctx, width, height);
      drawQuestTargets(ctx, width, height);
      drawPlayerPosition(ctx, width, height);
      
      // Draw blocked movement indicator if present
      if (blockedMovement && (Date.now() - blockedMovement.timestamp) < 1000) {
        const blockedX = (blockedMovement.x / 100) * width;
        const blockedY = (blockedMovement.y / 100) * height;
        drawBlockedMovementIndicator(ctx, blockedX, blockedY, blockedMovement.obstacleName);
      }
      
      ctx.restore();
    } catch (error) {
      console.error('Error rendering planet map:', error);
      // Fallback to basic rendering
      drawBasicMap(ctx, width, height, planet);
    }
  };

  const generateBasicMapData = (planet) => {
    // Generate basic map data from planet properties
    const terrainType = getTerrainType(planet.planetType, planet.climate);
    const mapLayout = {
      type: planet.planetType || 'terrestrial',
      locations: []
    };

    // Add cities as locations
    if (planet.majorCities && planet.majorCities.length > 0) {
      planet.majorCities.forEach((city, index) => {
        const angle = (index / planet.majorCities.length) * Math.PI * 2;
        const radius = 20 + (index % 3) * 10;
        mapLayout.locations.push({
          name: city,
          x: 50 + Math.cos(angle) * radius,
          y: 50 + Math.sin(angle) * radius,
          type: 'city',
          size: 'medium',
          description: `Major city on ${planet.name}`
        });
      });
    }

    // Generate POIs
    const pointsOfInterest = [];
    if (planet.majorCities && planet.majorCities.length > 0) {
      planet.majorCities.forEach((city, index) => {
        const angle = (index / planet.majorCities.length) * Math.PI * 2;
        const radius = 20 + (index % 3) * 10;
        pointsOfInterest.push({
          name: `${city} Spaceport`,
          x: 50 + Math.cos(angle) * radius,
          y: 50 + Math.sin(angle) * radius,
          type: 'spaceport',
          description: `Main landing facility in ${city}`
        });
      });
    }

    // Generate markets
    const markets = [];
    if (planet.population > 0) {
      planet.majorCities?.slice(0, 2).forEach((city, index) => {
        const angle = (index / Math.max(planet.majorCities.length, 2)) * Math.PI * 2;
        const radius = 20;
        markets.push({
          name: `${city} Market`,
          x: 50 + Math.cos(angle) * radius,
          y: 50 + Math.sin(angle) * radius,
          type: 'general',
          description: `Marketplace in ${city}`
        });
      });
    }

    return {
      terrain: terrainType,
      mapLayout,
      pointsOfInterest,
      markets
    };
  };

  const getTerrainType = (planetType, climate) => {
    const terrainMap = {
      terrestrial: {
        temperate: 'temperate_plains',
        arid: 'arid_plains',
        tropical: 'tropical_forest',
        frozen: 'tundra',
        variable: 'varied_terrain'
      },
      desert: { arid: 'desert', temperate: 'arid_plains', variable: 'desert' },
      jungle: { tropical: 'jungle', temperate: 'temperate_forest', variable: 'jungle' },
      ocean: { temperate: 'ocean', tropical: 'tropical_ocean', frozen: 'ice_ocean', variable: 'ocean' },
      ice: { frozen: 'ice', variable: 'ice' },
      volcanic: { variable: 'volcanic', temperate: 'volcanic' },
      urban: { temperate: 'urban_sprawl', variable: 'urban_sprawl' },
      gas_giant: { variable: 'gas_giant' },
      barren: { variable: 'barren', arid: 'barren' }
    };

    return terrainMap[planetType]?.[climate] || terrainMap[planetType]?.['variable'] || 'temperate_plains';
  };

  const drawBasicMap = (ctx, width, height, planet) => {
    // Basic fallback rendering with planet-specific colors
    const terrainType = getTerrainType(planet?.planetType, planet?.climate);
    
    // Get terrain colors
    const terrainColors = {
      temperate_plains: ['#2d5016', '#3d6b1f', '#4a7c2a'],
      desert: ['#d4a574', '#c49464', '#b88454'],
      jungle: ['#1a4d2e', '#2d5f3f', '#3d6f4f'],
      ice: ['#e0f2f1', '#b2dfdb', '#80cbc4'],
      ocean: ['#0a4d6e', '#1a5d7e', '#2a6d8e'],
      volcanic: ['#2d1a1a', '#3d2a2a', '#4d3a3a'],
      urban_sprawl: ['#1a1a2e', '#16213e', '#0f3460'],
      forest: ['#1b4332', '#2d5f3f', '#40916c'],
      gas_giant: ['#1a1a3e', '#2a2a4e', '#3a3a5e']
    };

    const colors = terrainColors[terrainType] || ['#1a1a2e', '#16213e', '#0f3460'];
    
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height));
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(0.5, colors[1]);
    gradient.addColorStop(1, colors[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw planet name in center
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 5;
    ctx.fillText(planet?.name || 'Planet', width / 2, height / 2);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  };

  const drawNPCs = (ctx, width, height) => {
    // Filter out the escort NPC from the main npcs array if an escort quest is active
    // The escort NPC will be drawn separately with its updated position
    const nonEscortNpcs = escortQuest?.npc 
      ? npcs.filter(npc => npc.id !== escortQuest.npc.id)
      : npcs;

    // Draw regular NPCs
    nonEscortNpcs.forEach(npc => {
      const location = npc.location || {};
      // Normalize coordinates using converter utility
      const normalized = normalizeCoordinates(location.x || 0, location.y || 0);
      const x = normalized.x * (width / 100);
      const y = normalized.y * (height / 100);
      
      const isSelected = selectedNPC?.id === npc.id;
      const isHovered = hoveredNPC === npc.id;
      const isEscortNPC = false; // Regular NPCs are not escort NPCs

      // NPC marker
      ctx.beginPath();
      const radius = isEscortNPC ? 10 : (isSelected ? 10 : isHovered ? 8 : 6);
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      
      // Check if this NPC is a quest target (involved in an active quest objective)
      const isQuestTarget = activeQuests?.some(({ quest, progress }) => {
        if (!quest.objectives || progress?.objectivesCompleted) return false;
        return quest.objectives.some(objective => {
          // Check if NPC is target of interact, deliver, or defeat objective
          if ((objective.type === 'interact' || objective.type === 'deliver' || objective.type === 'defeat') &&
              objective.target === npc.id &&
              !progress?.objectivesCompleted?.[objective.id]) {
            return true;
          }
          return false;
        });
      });

      // Color based on NPC type
      let color = '#60a5fa';
      if (isEscortNPC) {
        // Escort NPCs have a distinct green color with pulsing effect
        const pulse = (Date.now() / 1000) % 1;
        const alpha = 0.7 + (pulse * 0.3);
        color = `rgba(34, 197, 94, ${alpha})`;
      } else if (npc.npcType === 'quest_giver') color = '#fbbf24';
      else if (isQuestTarget) {
        // Quest target NPCs get an orange color to distinguish them
        color = '#f97316'; // Orange
      } else if (npc.npcType === 'vendor') color = '#34d399';
      else if (npc.npcType === 'companion') color = '#a78bfa';
      
      ctx.fillStyle = color;
      ctx.fill();
      
      // Quest target NPCs get a pulsing outer ring
      if (isQuestTarget && !isEscortNPC) {
        const pulse = (Date.now() / 500) % 1;
        const ringRadius = radius + (pulse * 3);
        ctx.strokeStyle = `rgba(249, 115, 22, ${0.6 - pulse * 0.3})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // Escort NPCs get a special border
      if (isEscortNPC) {
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw pulsing outer ring
        const pulse = (Date.now() / 1000) % 1;
        const ringRadius = radius + (pulse * 4);
        ctx.strokeStyle = `rgba(34, 197, 94, ${0.5 - pulse * 0.3})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Quest targets get a white border to make them stand out
        if (isQuestTarget) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
        } else {
          ctx.strokeStyle = isSelected ? '#ffffff' : '#1e293b';
          ctx.lineWidth = isSelected ? 3 : 2;
        }
        ctx.stroke();
      }

      // NPC name - always show for quest targets
      if (isSelected || isHovered || isEscortNPC || isQuestTarget) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 2;
        const nameText = isEscortNPC ? `${npc.name} (Following)` : npc.name;
        ctx.fillText(nameText, x, y - 8);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }
    });

    // Draw escort NPC separately with its updated position from escortQuest
    // This ensures the escort NPC position is always up-to-date without reloading all NPCs
    if (escortQuest?.npc && escortQuest.npc.location) {
      const escortNPC = escortQuest.npc;
      const location = escortNPC.location || {};
      const normalized = normalizeCoordinates(location.x || 0, location.y || 0);
      const x = normalized.x * (width / 100);
      const y = normalized.y * (height / 100);
      
      const isSelected = selectedNPC?.id === escortNPC.id;
      const isHovered = hoveredNPC === escortNPC.id;

      // Escort NPC marker with pulsing effect
      const pulse = (Date.now() / 1000) % 1;
      const radius = 10;
      const alpha = 0.7 + (pulse * 0.3);
      
      // Outer pulsing ring
      ctx.strokeStyle = `rgba(34, 197, 94, ${0.5 - pulse * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, radius + (pulse * 4), 0, Math.PI * 2);
      ctx.stroke();
      
      // Main marker
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`;
      ctx.fill();
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // NPC name
      if (isSelected || isHovered) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 2;
        ctx.fillText(`${escortNPC.name} (Following)`, x, y - 8);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }
    }
  };

  // Draw quest targets on the map
  const drawQuestTargets = (ctx, width, height) => {
    if (!activeQuests || activeQuests.length === 0) return;
    if (!planet || planet.id !== planetId) return;

    activeQuests.forEach(({ quest, progress }) => {
      if (!quest.objectives) return;

      quest.objectives.forEach(objective => {
        // Skip completed objectives
        if (progress?.objectivesCompleted?.[objective.id]) return;

        // Only draw objectives with location data
        if (!objective.location) return;

        const loc = objective.location;
        // Only draw if on current planet
        if (loc.planet !== planetId) return;
        
        // Check area matching - show on planet surface if area matches or if no area specified
        // If player is on planet surface (no submap), show targets for surface areas
        // If player is in a submap, only show targets for that specific submap area
        if (loc.area) {
          const currentArea = currentCharacter?.currentLocation?.area;
          const currentSubMapId = currentCharacter?.currentLocation?.subMapId;
          
          // If player is in a submap, only show targets for that specific submap area
          if (currentSubMapId) {
            // In a submap - only show if area matches exactly
            if (currentArea !== loc.area) {
              return;
            }
          } else {
            // On planet surface - show targets for surface areas (like "tann_province")
            // Surface areas are areas that exist on the planet surface
            // If the quest area matches the current area, or if current area is "surface", show it
            if (currentArea && currentArea !== 'surface' && currentArea !== loc.area) {
              // Only hide if we're in a specific area that doesn't match
              // But allow if we're on general surface or area matches
              return;
            }
          }
        }

        // Normalize coordinates using converter utility
        const normalized = normalizeCoordinates(loc.x || 0, loc.y || 0);
        const x = normalized.x * (width / 100);
        const y = normalized.y * (height / 100);

        // Check if hovered
        const isHovered = hoveredQuestTarget?.questId === quest.id && hoveredQuestTarget?.objectiveId === objective.id;

        // Draw quest target marker (pulsing red/orange circle)
        const pulse = (Date.now() / 500) % 1; // Pulse every 500ms
        const radius = 8 + (pulse * 4); // Pulse between 8-12px

        // Outer glow
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius + 4);
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
        gradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.4)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
        ctx.fill();

        // Main marker
        ctx.fillStyle = '#ef4444'; // Red
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.stroke();

        // Quest target icon (exclamation mark or sword)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (loc.type === 'combat_encounter') {
          ctx.fillText('⚔️', x, y);
        } else {
          ctx.fillText('!', x, y);
        }

        // Objective description label (only show if hovered)
        if (isHovered) {
          ctx.fillStyle = '#fbbf24';
          ctx.font = '10px sans-serif';
          ctx.textBaseline = 'top';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 2;
          ctx.fillText(objective.description.substring(0, 30), x, y + radius + 5);
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }
      });
    });

    // Draw escort destination marker if available
    if (escortMarker && escortMarker.planet === planetId) {
      const currentArea = currentCharacter?.currentLocation?.area || 'surface';
      if (escortMarker.area === currentArea || (!escortMarker.area && currentArea === 'surface')) {
        const normalized = normalizeCoordinates(escortMarker.x || 0, escortMarker.y || 0);
        const x = normalized.x * (width / 100);
        const y = normalized.y * (height / 100);

        // Draw pulsing green beacon for escort destination
        const pulse = (Date.now() / 800) % 1;
        const radius = 10 + (pulse * 6); // Pulse between 10-16px

        // Outer glow (green)
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius + 6);
        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.9)');
        gradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.5)');
        gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius + 6, 0, Math.PI * 2);
        ctx.fill();

        // Main marker (green)
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Destination icon
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('📍', x, y);

        // Label
        ctx.fillStyle = '#22c55e';
        ctx.font = '11px sans-serif';
        ctx.textBaseline = 'top';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 2;
        ctx.fillText(escortMarker.label || 'Destination', x, y + radius + 8);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }
    }
  };

  const drawPlayerPosition = (ctx, width, height) => {
    // Get current character from store to avoid stale closures
    const character = useCharacterStore.getState().currentCharacter;
    if (character?.currentPlanet === planet.id && character?.currentLocation) {
      const loc = character.currentLocation;
      // Location coordinates are stored as percentages (0-100)
      const x = (loc.x || 0) * (width / 100);
      const y = (loc.y || 0) * (height / 100);
      
      // Pulsing animation based on time
      const time = Date.now() / 1000;
      const pulseScale = 1 + Math.sin(time * 2) * 0.15; // Pulse between 1.0 and 1.15
      const glowIntensity = 0.6 + Math.sin(time * 2) * 0.2; // Glow intensity varies
      
      // Draw outer glow effect (pulsing)
      const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 20 * pulseScale);
      glowGradient.addColorStop(0, `rgba(239, 68, 68, ${glowIntensity * 0.6})`);
      glowGradient.addColorStop(0.5, `rgba(239, 68, 68, ${glowIntensity * 0.3})`);
      glowGradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(x, y, 20 * pulseScale, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw middle glow ring
      ctx.strokeStyle = `rgba(239, 68, 68, ${glowIntensity * 0.8})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 14 * pulseScale, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw main player marker (larger and more visible)
      const markerSize = 12 * pulseScale;
      ctx.beginPath();
      ctx.arc(x, y, markerSize, 0, Math.PI * 2);
      
      // Fill with gradient
      const markerGradient = ctx.createRadialGradient(x, y, 0, x, y, markerSize);
      markerGradient.addColorStop(0, '#ff6b6b');
      markerGradient.addColorStop(0.7, '#ef4444');
      markerGradient.addColorStop(1, '#dc2626');
      ctx.fillStyle = markerGradient;
      ctx.fill();
      
      // Enhanced border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Inner highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(x - 2, y - 2, markerSize * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Player label with enhanced styling
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 4;
      ctx.fillText('You', x, y - markerSize - 4);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
  };

  // Convert screen coordinates to world coordinates accounting for pan/zoom
  const worldToScreen = (worldX, worldY, width, height) => {
    // Convert world coordinates (0-100%) to screen coordinates accounting for pan/zoom
    // This matches the canvas transformation in renderPlanetMap:
    // ctx.translate(centerX + pan.x, centerY + pan.y);
    // ctx.scale(zoom, zoom);
    // ctx.translate(-centerX, -centerY);
    const centerX = width / 2;
    const centerY = height / 2;
    // Convert percentage to canvas pixels (matches POI rendering: (poi.x / 100) * width)
    const canvasX = (worldX / 100) * width;
    const canvasY = (worldY / 100) * height;
    // Apply inverse transformation to get screen coordinates
    // The canvas transformation is: translate(centerX + pan.x, centerY + pan.y) * scale(zoom) * translate(-centerX, -centerY)
    // Inverse: translate(centerX, centerY) * scale(1/zoom) * translate(-centerX - pan.x, -centerY - pan.y)
    // Simplified: (canvasX - centerX) * zoom + centerX + pan.x
    const screenX = (canvasX - centerX) * zoom + centerX + pan.x;
    const screenY = (canvasY - centerY) * zoom + centerY + pan.y;
    return { x: screenX, y: screenY };
  };

  const screenToWorld = (screenX, screenY, width, height) => {
    // Account for zoom and pan (transform is centered)
    const centerX = width / 2;
    const centerY = height / 2;
    const worldX = ((screenX - centerX - pan.x) / zoom) + centerX;
    const worldY = ((screenY - centerY - pan.y) / zoom) + centerY;
    return { x: worldX, y: worldY };
  };

  const handleCanvasMouseDown = async (e) => {
    if (!planet) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;

    // Convert to world coordinates
    const world = screenToWorld(clickX, clickY, width, height);

    // Check if clicking on interactive elements first
    let clicked = false;

    // Check markets
    if (planet.mapData?.markets) {
      for (const market of planet.mapData.markets) {
        const x = (market.x / 100) * width;
        const y = (market.y / 100) * height;
        const distance = Math.sqrt((world.x - x) ** 2 + (world.y - y) ** 2);
        if (distance < 20 / zoom) { // Scale hitbox with zoom
          // Show market interaction menu (treat market as POI for menu)
          const canvas = canvasRef.current;
          const rect = canvas.getBoundingClientRect();
          setPoiMenuPosition({ x: e.clientX, y: e.clientY });
          // Convert market to POI format for the interaction menu
          const marketAsPOI = {
            id: market.name,
            name: market.name,
            type: 'market',
            description: market.description || `Marketplace: ${market.name}`
          };
          setSelectedPOI(marketAsPOI);
          setSelectedMarket(market);
          setPoiMenuOpen(true);
          setSelectedNPC(null);
          clicked = true;
          return;
        }
      }
    }

    // Check POIs
    if (planet.pointsOfInterest || planet.mapData?.pointsOfInterest) {
      const pois = planet.pointsOfInterest || planet.mapData.pointsOfInterest || [];
      for (const poi of pois) {
        const x = (poi.x / 100) * width;
        const y = (poi.y / 100) * height;
        const distance = Math.sqrt((world.x - x) ** 2 + (world.y - y) ** 2);
        if (distance < 20 / zoom) {
          // Show POI interaction menu instead of just selecting
          const canvas = canvasRef.current;
          const rect = canvas.getBoundingClientRect();
          setPoiMenuPosition({ x: e.clientX, y: e.clientY });
          setSelectedPOI(poi);
          setPoiMenuOpen(true);
          setSelectedMarket(null);
          setSelectedNPC(null);
          clicked = true;
          
          // Emit POI clicked event for tutorial
          tutorialEventBus.emit(TUTORIAL_EVENTS.POI_CLICKED, {
            poiId: poi.id || poi.name,
            poiName: poi.name,
            poiType: poi.type,
            location: 'planet_surface',
            planetId: planet.id,
            characterId: currentCharacter?.id,
            timestamp: new Date().toISOString()
          });
          
          return;
        }
      }
    }

    // Check cities/locations (check these last so POIs/markets take priority)
    if (planet.mapData?.mapLayout?.locations && !clicked) {
      for (const location of planet.mapData.mapLayout.locations) {
        const x = (location.x / 100) * width;
        const y = (location.y / 100) * height;
        const size = (location.size === 'large' ? 40 : location.size === 'medium' ? 30 : location.size === 'huge' ? 60 : 20) / zoom;
        const distance = Math.sqrt((world.x - x) ** 2 + (world.y - y) ** 2);
        if (distance < size) {
          setSelectedCity(location);
          setSelectedPOI(null);
          setSelectedMarket(null);
          setSelectedNPC(null);
          clicked = true;
          return;
        }
      }
    }

    // Check quest targets (before NPCs so they take priority)
    if (activeQuests && activeQuests.length > 0 && planet && planet.id === planetId) {
      for (const { quest, progress } of activeQuests) {
        if (!quest.objectives) continue;

        for (const objective of quest.objectives) {
          // Skip completed objectives
          if (progress?.objectivesCompleted?.[objective.id]) continue;
          if (!objective.location) continue;
          const loc = objective.location;
          if (loc.planet !== planetId) continue;

          // Normalize coordinates using converter utility
          const normalized = normalizeCoordinates(loc.x || 0, loc.y || 0);
          const x = normalized.x * (width / 100);
          const y = normalized.y * (height / 100);
          const distance = Math.sqrt((world.x - x) ** 2 + (world.y - y) ** 2);

          if (distance < 25 / zoom) {
            // Quest target click. Combat is real-time + 3D-only now (Phase 7 retired turn-based);
            // this 2D fallback surface no longer starts combat, so just surface the objective.
            console.log('🎯 Quest target clicked:', objective.description);
            alert(`Quest Objective: ${objective.description}`);
            clicked = true;
            return;
          }
        }
      }
    }

    // Check NPCs
    for (const npc of npcs) {
      const location = npc.location || {};
      // Location coordinates can be stored as percentages (0-100) or absolute (0-1000)
      // Convert to percentage if needed
      let xPercent = location.x || 0;
      let yPercent = location.y || 0;
      if (xPercent > 100) xPercent = xPercent / 10; // Convert from 0-1000 to 0-100
      if (yPercent > 100) yPercent = yPercent / 10; // Convert from 0-1000 to 0-100
      const x = xPercent * (width / 100);
      const y = yPercent * (height / 100);
      const distance = Math.sqrt((world.x - x) ** 2 + (world.y - y) ** 2);
      if (distance < 20 / zoom) {
        // Show NPC interaction menu instead of directly opening dialogue
        console.log('🎯 NPC clicked:', npc.name, 'at position:', { x, y, worldX: world.x, worldY: world.y, distance });
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        setNpcMenuPosition({ x: e.clientX, y: e.clientY });
        setSelectedNPC(npc);
        setNpcMenuOpen(true);
        setSelectedPOI(null);
        setSelectedMarket(null);
        setSelectedCity(null);
        clicked = true;
        
        // Emit planet NPC clicked event for tutorial
        tutorialEventBus.emit(TUTORIAL_EVENTS.PLANET_NPC_CLICKED, {
          npcId: npc.id,
          npcName: npc.name,
          location: 'planet_surface',
          planetId: planet.id,
          characterId: currentCharacter?.id,
          isTutorialNPC: npc.id?.startsWith('npc_tutorial_'),
          timestamp: new Date().toISOString()
        });
        
        return;
      }
    }

    // If not clicking on an element, start panning (click-and-drag)
    // Removed click-to-move - players navigate with arrow keys only
    if (!clicked) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      
      // Deselect all when clicking empty space
      setSelectedNPC(null);
      setSelectedPOI(null);
      setSelectedMarket(null);
      setSelectedCity(null);
    }
  };

  const handleCanvasClick = (e) => {
    // Click handling is now in mousedown
    // This prevents double-firing
  };

  const handleCanvasMouseMove = (e) => {
    if (!planet) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;

    // If dragging, update pan
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setPan(prevPan => ({
        x: prevPan.x + deltaX,
        y: prevPan.y + deltaY
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Convert to world coordinates for hover detection
    const world = screenToWorld(mouseX, mouseY, width, height);

    // Check markets
    if (planet.mapData?.markets) {
      for (const market of planet.mapData.markets) {
        const x = (market.x / 100) * width;
        const y = (market.y / 100) * height;
        const distance = Math.sqrt((world.x - x) ** 2 + (world.y - y) ** 2);
        if (distance < 20 / zoom) {
          setHoveredMarket(market);
          setHoveredPOI(null);
          setHoveredNPC(null);
          setHoveredCity(null);
          canvas.style.cursor = 'pointer';
          return;
        }
      }
    }

    // Check POIs
    if (planet.pointsOfInterest || planet.mapData?.pointsOfInterest) {
      const pois = planet.pointsOfInterest || planet.mapData.pointsOfInterest || [];
      for (const poi of pois) {
        const x = (poi.x / 100) * width;
        const y = (poi.y / 100) * height;
        const distance = Math.sqrt((world.x - x) ** 2 + (world.y - y) ** 2);
        if (distance < 20 / zoom) {
          setHoveredPOI(poi);
          setHoveredMarket(null);
          setHoveredNPC(null);
          setHoveredCity(null);
          canvas.style.cursor = 'pointer';
          return;
        }
      }
    }

    // Check cities
    if (planet.mapData?.mapLayout?.locations) {
      for (const location of planet.mapData.mapLayout.locations) {
        const x = (location.x / 100) * width;
        const y = (location.y / 100) * height;
        const size = (location.size === 'large' ? 40 : location.size === 'medium' ? 30 : location.size === 'huge' ? 60 : 20) / zoom;
        const distance = Math.sqrt((world.x - x) ** 2 + (world.y - y) ** 2);
        if (distance < size) {
          setHoveredCity(location);
          setHoveredPOI(null);
          setHoveredMarket(null);
          setHoveredNPC(null);
          canvas.style.cursor = 'pointer';
          return;
        }
      }
    }

    // Check NPCs
    let found = false;
    for (const npc of npcs) {
      const location = npc.location || {};
      // Normalize coordinates using converter utility
      const normalized = normalizeCoordinates(location.x || 0, location.y || 0);
      const x = normalized.x * (width / 100);
      const y = normalized.y * (height / 100);
      const distance = Math.sqrt((world.x - x) ** 2 + (world.y - y) ** 2);
      if (distance < 20 / zoom) {
        setHoveredNPC(npc.id);
        setHoveredPOI(null);
        setHoveredMarket(null);
        setHoveredCity(null);
        setHoveredPath(null); // Clear path preview when hovering over NPC
        canvas.style.cursor = 'pointer';
        found = true;
        break;
      }
    }
    
      // Path preview disabled - removed pathfinding line display
      // Players navigate using arrow keys only, no click-to-move or path preview
      setHoveredPath(null);
    
    if (!found) {
      setHoveredNPC(null);
      setHoveredPOI(null);
      setHoveredMarket(null);
      setHoveredCity(null);
      canvas.style.cursor = isDragging ? 'grabbing' : 'grab';
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleCanvasMouseLeave = () => {
    setIsDragging(false);
    setHoveredNPC(null);
    setHoveredPOI(null);
    setHoveredMarket(null);
    setHoveredCity(null);
  };

  // Helper function to get obstacle name for notifications
  const getObstacleName = (tileType) => {
    const names = {
      'building': 'a building',
      'rock': 'rocks',
      'tree': 'trees',
      'canyon': 'a canyon',
      'lava_flow': 'lava',
      'volcanic_vent': 'a volcanic vent',
      'crevasse': 'a crevasse',
      'crater': 'a crater',
      'water': 'water'
    };
    return names[tileType] || 'an obstacle';
  };

  if (loading) {
    return (
      <div className="planet-surface-container">
        <LoadingSpinner fullScreen message="Loading planet surface..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="planet-surface-container">
        <div className="error">{error}</div>
        <button onClick={() => navigate('/game/galaxy')}>Back to Galaxy Map</button>
      </div>
    );
  }

  if (!planet) {
    return (
      <div className="planet-surface-container">
        <div className="error">Planet not found</div>
        <button onClick={() => navigate('/game/galaxy')}>Back to Galaxy Map</button>
      </div>
    );
  }

  return (
    <div className="planet-surface-container" ref={containerRef}>
      <HUD />
      <div className="planet-surface-header">
        <div className="planet-info">
          <h1>{planet.name}</h1>
          <p className="planet-system">{planet.system?.name || 'Unknown System'}</p>
        </div>
        <div className="planet-actions">
          <div className="map-controls">
            <button onClick={() => setZoom(Math.min(zoom + 0.1, 3))} title="Zoom In">+</button>
            <button onClick={() => setZoom(Math.max(zoom - 0.1, 0.5))} title="Zoom Out">-</button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Reset View">Reset</button>
            <button 
              onClick={handleRegenerateMap} 
              disabled={isRegenerating}
              title="Regenerate Map"
              className="regenerate-button"
            >
              {isRegenerating ? 'Generating...' : '🔄 Regenerate Map'}
            </button>
          </div>
          <div className="navigation-hint">
            <span className="hint-text">Use Arrow Keys or WASD to navigate</span>
          </div>
          <button
            onClick={() => navigate(`/game/planet3d/${planetId}`)}
            className="fast-travel-button"
            title="Walk this surface in real-time 3D (Phase 1)"
          >
            🌐 3D View
          </button>
          <button
            onClick={() => setFastTravelMenuOpen(true)}
            className="fast-travel-button"
            title="Fast Travel"
          >
            🚀 Fast Travel
          </button>
          <button onClick={() => navigate('/game/galaxy')} className="back-button">
            ← Galaxy Map
          </button>
        </div>
      </div>

      <div className="planet-surface-content">
        <div className="map-container" ref={containerRef}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseLeave}
            className="planet-map-canvas"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          />
        </div>

        <div className="planet-sidebar">
          <div className="planet-details">
            <h2>Planet Information</h2>
            <div className="info-section">
              <div className="info-row">
                <span className="info-label">Type:</span>
                <span className="info-value">{planet.planetType}</span>
              </div>
              {planet.climate && (
                <div className="info-row">
                  <span className="info-label">Climate:</span>
                  <span className="info-value">{planet.climate}</span>
                </div>
              )}
              {planet.atmosphere && (
                <div className="info-row">
                  <span className="info-label">Atmosphere:</span>
                  <span className="info-value">{planet.atmosphere}</span>
                </div>
              )}
              {planet.population > 0 && (
                <div className="info-row">
                  <span className="info-label">Population:</span>
                  <span className="info-value">{planet.population.toLocaleString()}</span>
                </div>
              )}
              {planet.dangerLevel && (
                <div className="info-row">
                  <span className="info-label">Danger Level:</span>
                  <span className="info-value">{planet.dangerLevel}/10</span>
                </div>
              )}
            </div>

            {planet.description && (
              <div className="description-section">
                <h3>Description</h3>
                <p>{planet.description}</p>
              </div>
            )}

            {planet.majorCities && planet.majorCities.length > 0 && (
              <div className="cities-section">
                <h3>Major Cities</h3>
                <ul>
                  {planet.majorCities.map((cityName, index) => {
                    // Find corresponding location data if available
                    const location = planet.mapData?.mapLayout?.locations?.find(loc => loc.name === cityName);
                    return (
                      <li 
                        key={index}
                        className={hoveredCity?.name === cityName ? 'hovered' : ''}
                        onMouseEnter={() => {
                          if (location) setHoveredCity(location);
                        }}
                        onMouseLeave={() => {
                          if (hoveredCity?.name === cityName) setHoveredCity(null);
                        }}
                      >
                        {cityName}
                        {location && location.description && (
                          <span className="city-description"> - {location.description}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {selectedCity && (
            <div className="city-details-section">
              <h2>City Details</h2>
              <div className="city-details">
                <h3>{selectedCity.name}</h3>
                <div className="info-row">
                  <span className="info-label">Type:</span>
                  <span className="info-value">{selectedCity.type}</span>
                </div>
                {selectedCity.size && (
                  <div className="info-row">
                    <span className="info-label">Size:</span>
                    <span className="info-value">{selectedCity.size}</span>
                  </div>
                )}
                {selectedCity.description && (
                  <p className="city-description-text">{selectedCity.description}</p>
                )}
                <button 
                  className="enter-location-button"
                  onClick={async () => {
                    // Record city discovery before entering
                    if (currentCharacter?.id) {
                      try {
                        await recordDiscovery(
                          currentCharacter.id,
                          planet.id,
                          'city',
                          `city_${selectedCity.name}`,
                          {
                            locationName: selectedCity.name,
                            metadata: { type: 'city', size: selectedCity.size }
                          }
                        );
                      } catch (err) {
                        console.warn('Failed to record city discovery:', err);
                      }
                    }
                    
                    navigate(`/game/location/${planet.id}/${encodeURIComponent(selectedCity.name)}/city/city`, {
                      state: {
                        planetId: planet.id,
                        parentLocationId: selectedCity.name,
                        parentLocationType: 'city',
                        type: 'city'
                      }
                    });
                  }}
                >
                  Enter {selectedCity.name}
                </button>
              </div>
            </div>
          )}

          {planet.mapData?.pointsOfInterest && planet.mapData.pointsOfInterest.length > 0 && (
            <div className="pois-section">
              <h2>Points of Interest</h2>
              <div className="poi-list">
                {planet.mapData.pointsOfInterest.map((poi, index) => (
                  <div
                    key={index}
                    className={`poi-item ${selectedPOI === poi ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedPOI(poi);
                      setSelectedCity(null);
                      setSelectedMarket(null);
                    }}
                  >
                    <div className="poi-name">{poi.name}</div>
                    <div className="poi-type">{poi.type}</div>
                    {poi.description && (
                      <div className="poi-description">{poi.description}</div>
                    )}
                    {(poi.type === 'spaceport' || poi.type === 'market' || poi.type === 'cantina' || poi.type === 'palace' || poi.type === 'temple') && (
                      <button 
                        className="enter-poi-button"
                        onClick={async () => {
                          // Record POI discovery before entering
                          if (currentCharacter?.id) {
                            try {
                              await recordDiscovery(
                                currentCharacter.id,
                                planet.id,
                                'poi',
                                `poi_${poi.name}_${poi.type}`,
                                {
                                  locationName: poi.name,
                                  metadata: { type: poi.type, description: poi.description }
                                }
                              );
                            } catch (err) {
                              console.warn('Failed to record POI discovery:', err);
                            }
                          }
                          
                          navigate(`/game/location/${planet.id}/${encodeURIComponent(poi.name)}/poi/${poi.type}`, {
                            state: {
                              planetId: planet.id,
                              parentLocationId: poi.name,
                              parentLocationType: 'poi',
                              type: poi.type
                            }
                          });
                        }}
                      >
                        Enter {poi.name}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {planet.mapData?.markets && planet.mapData.markets.length > 0 && (
            <div className="markets-section">
              <h2>Markets & Trading Posts</h2>
              <div className="market-list">
                {planet.mapData.markets.map((market, index) => (
                  <div
                    key={index}
                    className={`market-item ${selectedMarket === market ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedMarket(market);
                      setSelectedCity(null);
                      setSelectedPOI(null);
                    }}
                  >
                    <div className="market-name">{market.name}</div>
                    <div className="market-type">{market.type}</div>
                    {market.description && (
                      <div className="market-description">{market.description}</div>
                    )}
                    <button 
                      className="enter-market-button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        
                        // Record market discovery before entering
                        if (currentCharacter?.id) {
                          try {
                            await recordDiscovery(
                              currentCharacter.id,
                              planet.id,
                              'poi',
                              `market_${market.name}`,
                              {
                                locationName: market.name,
                                metadata: { type: 'market' }
                              }
                            );
                          } catch (err) {
                            console.warn('Failed to record market discovery:', err);
                          }
                        }
                        
                        navigate(`/game/location/${planet.id}/${encodeURIComponent(market.name)}/market/market`, {
                          state: {
                            planetId: planet.id,
                            parentLocationId: market.name,
                            parentLocationType: 'market',
                            type: 'market'
                          }
                        });
                      }}
                    >
                      Enter Market
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="npcs-section">
            <h2>NPCs on Planet ({npcs.length})</h2>
            {npcs.length > 0 ? (
              <div className="npc-list">
                {npcs.map(npc => (
                  <div
                    key={npc.id}
                    className={`npc-item ${selectedNPC?.id === npc.id ? 'selected' : ''}`}
                    onClick={() => setSelectedNPC(npc)}
                  >
                    <div className="npc-name">{npc.name}</div>
                    <div className="npc-type">{formatDisplayName(npc.npcType) || 'Generic'}</div>
                    {npc.occupation && (
                      <div className="npc-occupation">{formatDisplayName(npc.occupation)}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-npcs">No NPCs found on this planet.</p>
            )}
          </div>
        </div>
      </div>

      {/* NPC Interaction Menu */}
      {npcMenuOpen && selectedNPC && (
        <NPCInteractionMenu
          npc={selectedNPC}
          planet={planet}
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
        <ConversationView
          npc={selectedNPC}
          onClose={() => setSelectedNPC(null)}
        />
      )}

      {/* POI Interaction Menu */}
      {poiMenuOpen && selectedPOI && planet && (
        <POIInteractionMenu
          poi={selectedPOI}
          planet={planet}
          isOpen={poiMenuOpen}
          onClose={() => {
            setPoiMenuOpen(false);
            setSelectedPOI(null);
          }}
          position={poiMenuPosition}
        />
      )}

      {/* Fast Travel Menu */}
      {fastTravelMenuOpen && planet && (
        <FastTravelMenu
          planet={planet}
          isOpen={fastTravelMenuOpen}
          onClose={() => setFastTravelMenuOpen(false)}
        />
      )}

      {/* SubMap Entry Menu */}
      {subMapMenuOpen && selectedSubMap && planet && (
        <SubMapEntryMenu
          subMap={selectedSubMap}
          planet={planet}
          isOpen={subMapMenuOpen}
          onClose={() => {
            setSubMapMenuOpen(false);
            setSelectedSubMap(null);
          }}
          position={subMapMenuPosition}
        />
      )}

      <TutorialOverlay />
    </div>
  );
}

