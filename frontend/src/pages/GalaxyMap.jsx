/**
 * Galaxy Map Page
 * Interactive galaxy map for navigation and travel
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../state/characterSlice';
import { useDiscoveryStore } from '../state/discoverySlice';
import { addTutorialTarget, TUTORIAL_TARGETS } from '../services/tutorialTargetRegistry';
import { tutorialEventBus, TUTORIAL_EVENTS } from '../services/tutorialEventBus';
import TutorialOverlay from '../components/tutorial/TutorialOverlay';
import { galaxyApi } from '../services/api/galaxyApi';
import { CharacterManager } from '../core/character/CharacterManager';
import { useOptimizedCanvas } from '../hooks/useOptimizedCanvas';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import LoadingSpinner from '../components/common/LoadingSpinner';
import HUD from '../components/hud/HUD';
import './GalaxyMap.css';

export default function GalaxyMap() {
  const navigate = useNavigate();
  const { currentCharacter, setCurrentCharacter, loadCharacter } = useCharacterStore();
  const { recordDiscovery } = useDiscoveryStore();
  const [mapData, setMapData] = useState(null);
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [hoveredSystem, setHoveredSystem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('systems'); // 'systems' or 'planets'
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [travelCost, setTravelCost] = useState(null);
  const [showTravelConfirm, setShowTravelConfirm] = useState(false);
  const [pendingTravel, setPendingTravel] = useState(null);
  const [travelLoading, setTravelLoading] = useState(false);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isPauseMenuOpen, setIsPauseMenuOpen] = useState(false);

  // Keyboard shortcuts
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
    onMapOpen: () => {} // Already on map, do nothing
  });

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

  // Add tutorial target to canvas
  useEffect(() => {
    if (canvasRef.current) {
      addTutorialTarget(canvasRef.current, TUTORIAL_TARGETS.GALAXY_MAP_VIEW);
    }
  }, [canvasRef.current]);

  // Emit event when galaxy map opens
  useEffect(() => {
    if (currentCharacter && mapData) {
      tutorialEventBus.emit(TUTORIAL_EVENTS.UI_OPENED_GALAXYMAP, {
        characterId: currentCharacter.id
      });
    }
  }, [mapData, currentCharacter?.id]);

  useEffect(() => {
    loadMapData();
    
    // Reload character from backend to get latest credits when component mounts
    // This ensures we always have the latest data, bypassing localStorage cache
    if (currentCharacter?.id) {
      console.log('🔄 Reloading character from backend to get latest credits...');
      loadCharacter(currentCharacter.id)
        .then(character => {
          console.log('✅ Character reloaded. Credits:', character?.credits);
        })
        .catch(err => {
          console.warn('⚠️ Failed to reload character:', err);
        });
    }
  }, [currentCharacter?.id]); // Reload when character ID changes

  // Region color mapping inspired by Star Wars galaxy map
  const getRegionColor = (region) => {
    const regionColors = {
      'Deep Core': 'rgba(255, 255, 200, 0.15)',
      'Core Worlds': 'rgba(255, 255, 100, 0.2)',
      'Colonies': 'rgba(255, 180, 80, 0.15)',
      'Inner Rim': 'rgba(255, 150, 150, 0.15)',
      'Expansion Region': 'rgba(200, 100, 100, 0.15)',
      'Mid Rim': 'rgba(180, 100, 255, 0.15)',
      'Outer Rim': 'rgba(100, 200, 255, 0.15)',
      'Unknown Regions': 'rgba(20, 20, 40, 0.3)',
      'Wild Space': 'rgba(50, 50, 80, 0.2)',
      'Hutt Space': 'rgba(200, 50, 50, 0.2)',
      'Corporate Sector': 'rgba(100, 150, 255, 0.15)',
      'Bothan Space': 'rgba(200, 50, 50, 0.15)',
    };
    return regionColors[region] || 'rgba(100, 100, 150, 0.1)';
  };

  // Extract map drawing logic (defined early so it can be used in renderGalaxyMapOptimized)
  const drawMapContent = useCallback((ctx, width, height, mapData, selectedSystem, hoveredSystem, zoom, pan, viewMode) => {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw starfield background
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, width, height);
    
    // Add subtle stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 200; i++) {
      const x = (i * 137.5) % width;
      const y = (i * 197.3) % height;
      const size = Math.random() * 1.5;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw subtle gradient overlay
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.8);
    gradient.addColorStop(0, 'rgba(30, 41, 59, 0.3)');
    gradient.addColorStop(1, 'rgba(15, 23, 42, 0.6)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw subtle grid overlay (only when zoomed in)
    if (zoom > 0.8) {
      ctx.strokeStyle = 'rgba(100, 100, 150, 0.1)';
      ctx.lineWidth = 0.5;
      const gridSize = 100 / zoom;
      const startX = Math.floor((pan.x % gridSize) - gridSize);
      const startY = Math.floor((pan.y % gridSize) - gridSize);
      
      for (let x = startX; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      for (let y = startY; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // Calculate bounds
    const systems = mapData.systems || [];
    if (systems.length === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No systems found', width / 2, height / 2);
      return;
    }

    // Calculate coordinate bounds and scaling (same logic as legacy renderer)
    const coords = systems.map(s => s.coordinates).filter(c => c);
    if (coords.length === 0) return;
    
    const minX = Math.min(...coords.map(c => c.x));
    const maxX = Math.max(...coords.map(c => c.x));
    const minY = Math.min(...coords.map(c => c.y));
    const maxY = Math.max(...coords.map(c => c.y));
    
    const rangeX = maxX - minX || 100;
    const rangeY = maxY - minY || 100;
    const padding = 50;
    
    const scaleX = (width - padding * 2) / rangeX;
    const scaleY = (height - padding * 2) / rangeY;
    const scale = Math.min(scaleX, scaleY) * zoom;
    
    const offsetX = (width - (maxX - minX) * scale) / 2 - minX * scale + pan.x;
    const offsetY = (height - (maxY - minY) * scale) / 2 - minY * scale + pan.y;
    
    // Transform function to convert world coordinates to screen coordinates
    const toScreen = (coord) => ({
      x: coord.x * scale + offsetX,
      y: coord.y * scale + offsetY
    });

    // Draw region backgrounds (group systems by region and draw colored areas)
    const systemsByRegion = {};
    systems.forEach(system => {
      if (system.region && system.coordinates) {
        if (!systemsByRegion[system.region]) {
          systemsByRegion[system.region] = [];
        }
        systemsByRegion[system.region].push(system);
      }
    });

    // Draw region areas with subtle colors
    Object.entries(systemsByRegion).forEach(([region, regionSystems]) => {
      if (regionSystems.length < 2) return; // Need at least 2 systems to draw an area
      
      const regionColor = getRegionColor(region);
      ctx.fillStyle = regionColor;
      
      // Create a convex hull or simple bounding area for the region
      const positions = regionSystems.map(s => toScreen(s.coordinates));
      
      // Draw a simple bounding ellipse or polygon for the region
      if (positions.length >= 3) {
        const centerX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
        const centerY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;
        const maxDist = Math.max(...positions.map(p => 
          Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2)
        ));
        
        // Draw subtle region background
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxDist * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw travel routes with enhanced styling
    if (mapData.routes && mapData.routes.length > 0) {
      // Draw route glow/shadow first
      ctx.strokeStyle = 'rgba(74, 158, 255, 0.1)';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(74, 158, 255, 0.5)';
      ctx.shadowBlur = 4;
      
      mapData.routes.forEach(route => {
        let fromSystem, toSystem;
        
        if (route.fromSystemId && route.toSystemId) {
          fromSystem = systems.find(s => s.id === route.fromSystemId);
          toSystem = systems.find(s => s.id === route.toSystemId);
        } else if (route.from && route.to) {
          fromSystem = route.from;
          toSystem = route.to;
        }
        
        if (fromSystem && toSystem && fromSystem.coordinates && toSystem.coordinates) {
          const from = toScreen(fromSystem.coordinates);
          const to = toScreen(toSystem.coordinates);
          
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
        }
      });
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      
      // Draw main route lines
      ctx.strokeStyle = 'rgba(100, 180, 255, 0.4)';
      ctx.lineWidth = 1.5;
      
      mapData.routes.forEach(route => {
        let fromSystem, toSystem;
        
        if (route.fromSystemId && route.toSystemId) {
          fromSystem = systems.find(s => s.id === route.fromSystemId);
          toSystem = systems.find(s => s.id === route.toSystemId);
        } else if (route.from && route.to) {
          fromSystem = route.from;
          toSystem = route.to;
        }
        
        if (fromSystem && toSystem && fromSystem.coordinates && toSystem.coordinates) {
          const from = toScreen(fromSystem.coordinates);
          const to = toScreen(toSystem.coordinates);
          
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
        }
      });
    }

    // Draw systems with enhanced visuals
    systems.forEach(system => {
      if (!system.coordinates) return;
      
      const pos = toScreen(system.coordinates);
      // Handle both string ID and object formats
      const selectedId = typeof selectedSystem === 'string' ? selectedSystem : selectedSystem?.id;
      const hoveredId = typeof hoveredSystem === 'string' ? hoveredSystem : hoveredSystem?.id;
      const isSelected = selectedId === system.id;
      const isHovered = hoveredId === system.id;
      const isCurrent = currentCharacter?.currentPlanet && system.planets?.some(p => p.id === currentCharacter.currentPlanet);
      
      const baseRadius = isSelected || isCurrent ? 5 : isHovered ? 4 : 3;
      const outerRadius = baseRadius + 2;
      
      // Draw outer glow ring
      if (isSelected || isCurrent || isHovered) {
        const glowColor = isCurrent ? 'rgba(74, 222, 128, 0.4)' : isSelected ? 'rgba(74, 158, 255, 0.4)' : 'rgba(96, 165, 250, 0.3)';
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, outerRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Draw system core
      ctx.fillStyle = isCurrent ? '#4ade80' : isSelected ? '#4a9eff' : isHovered ? '#60a5fa' : '#94a3b8';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, baseRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw inner highlight
      if (baseRadius >= 4) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(pos.x - baseRadius * 0.3, pos.y - baseRadius * 0.3, baseRadius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Draw border
      ctx.strokeStyle = isCurrent ? '#22c55e' : isSelected ? '#2563eb' : isHovered ? '#3b82f6' : '#64748b';
      ctx.lineWidth = isSelected || isCurrent ? 2 : 1;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, baseRadius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw system name - always show labels for better visibility
      const nameY = pos.y - outerRadius - 8;
      let fontSize, textColor, showRegion;
      
      if (isSelected || isHovered || isCurrent) {
        fontSize = isSelected || isCurrent ? 13 : 11;
        textColor = '#ffffff';
        showRegion = true;
      } else {
        // Show all system names, but smaller and more subtle
        fontSize = Math.max(9, 10 / zoom); // Scale font size with zoom
        textColor = zoom > 0.8 ? '#cbd5e1' : '#94a3b8'; // More visible when zoomed
        showRegion = false;
      }
      
      // Only show label if it's large enough to be readable
      if (fontSize >= 8) {
        // Text shadow for readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        ctx.fillStyle = textColor;
        ctx.font = isSelected || isCurrent ? `bold ${fontSize}px sans-serif` : `${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(system.name, pos.x, nameY);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Region label for selected/hovered/current
        if (showRegion && system.region) {
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '9px sans-serif';
          ctx.fillText(`(${system.region})`, pos.x, nameY + 14);
        }
      }
    });
  }, [selectedSystem, hoveredSystem, currentCharacter, zoom, pan]);

  // Optimized galaxy map renderer (defined early so it can be used in useEffect)
  const renderGalaxyMapOptimized = useCallback(({ dirtyRects, needsFullRedraw, viewportCuller }) => {
    const canvas = canvasRef.current;
    if (!canvas || !mapData) return;

    const container = containerRef.current || canvas.parentElement;
    if (!container) return;

    const dpr = window.devicePixelRatio || 1;
    const containerWidth = container.clientWidth || container.offsetWidth || 800;
    const containerHeight = container.clientHeight || container.offsetHeight || 600;

    if (containerWidth <= 0 || containerHeight <= 0) return;

    // Update canvas dimensions if needed
    if (canvas.width !== containerWidth * dpr || canvas.height !== containerHeight * dpr) {
      canvas.width = containerWidth * dpr;
      canvas.height = containerHeight * dpr;
      canvas.style.width = `${containerWidth}px`;
      canvas.style.height = `${containerHeight}px`;
      needsFullRedraw = true; // Force full redraw on resize
    }

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const width = containerWidth;
    const height = containerHeight;

    try {
      // If full redraw needed or no dirty rects, render everything
      if (needsFullRedraw || !dirtyRects || dirtyRects.length === 0) {
        // Full render
        drawMapContent(ctx, width, height, mapData, selectedSystem, hoveredSystem, zoom, pan, viewMode);
      } else {
        // Partial render - only redraw dirty rectangles
        dirtyRects.forEach(rect => {
          ctx.save();
          
          // Clip to dirty rectangle
          const padding = 20;
          ctx.beginPath();
          ctx.rect(rect.x - padding, rect.y - padding, rect.width + padding * 2, rect.height + padding * 2);
          ctx.clip();
          
          // Clear the dirty area
          ctx.clearRect(rect.x - padding, rect.y - padding, rect.width + padding * 2, rect.height + padding * 2);
          
          // Render content in this area
          drawMapContent(ctx, width, height, mapData, selectedSystem, hoveredSystem, zoom, pan, viewMode);
          
          ctx.restore();
        });
      }
    } catch (error) {
      console.error('Error rendering galaxy map:', error);
    }
  }, [mapData, selectedSystem, hoveredSystem, zoom, pan, viewMode, drawMapContent]);

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

  // Start optimized rendering when map data loads
  useEffect(() => {
    if (mapData && canvasRef.current && containerRef.current) {
      markFullRedraw();
      requestRender(renderGalaxyMapOptimized);
    } else {
      stopRender();
    }

    return () => {
      stopRender();
    };
  }, [mapData, requestRender, stopRender, markFullRedraw, renderGalaxyMapOptimized]);

  // Mark dirty areas when selection changes
  useEffect(() => {
    if (mapData && canvasRef.current) {
      // Mark areas around selected/hovered systems as dirty
      if (selectedSystem || hoveredSystem) {
        const system = selectedSystem || hoveredSystem;
        if (system.coordinates) {
          markDirty(system.coordinates.x - 50, system.coordinates.y - 50, 100, 100);
        }
      }
    }
  }, [selectedSystem, hoveredSystem, viewMode, markDirty, mapData]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (mapData && canvasRef.current) {
        markFullRedraw();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mapData, markFullRedraw]);

  const loadMapData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await galaxyApi.getMap();
      
      // apiClient interceptor returns response.data, so response is already {success: true, data: {...}}
      if (!response || !response.success || !response.data) {
        console.error('Invalid response format:', response);
        throw new Error('Invalid response format from server');
      }
      
      const data = response.data;
      
      // Validate data structure
      if (!data.systems || !Array.isArray(data.systems) || data.systems.length === 0) {
        console.warn('No systems found in map data');
      }
      
      if (!data.routes || !Array.isArray(data.routes)) {
        console.warn('No routes found in map data');
      }
      
      setMapData(data);
      
      // Find current character's system
      if (currentCharacter?.currentPlanet) {
        try {
          const planetResponse = await galaxyApi.getPlanet(currentCharacter.currentPlanet);
          // apiClient interceptor returns response.data, so planetResponse is {success: true, data: {...}}
          if (planetResponse && planetResponse.success && planetResponse.data && planetResponse.data.system) {
            setSelectedSystem(planetResponse.data.system.id);
            loadSystemDetails(planetResponse.data.system.id);
          }
        } catch (planetErr) {
          console.warn('Could not load current planet system:', planetErr);
        }
      }
    } catch (err) {
      console.error('Failed to load galaxy map:', err);
      setError(`Failed to load galaxy map data: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Legacy drawMap for compatibility
  const drawMap = useCallback(() => {
    markFullRedraw();
  }, [markFullRedraw]);

  // Legacy drawMap function (kept for reference)
  const drawMapLegacy = () => {
    const canvas = canvasRef.current;
    if (!canvas || !mapData) return;

    const ctx = canvas.getContext('2d');
    
    // Get container dimensions
    const container = canvas.parentElement;
    if (!container) return;
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Set canvas dimensions (must match display size for proper rendering)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerWidth * dpr;
    canvas.height = containerHeight * dpr;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;
    ctx.scale(dpr, dpr);
    
    const width = containerWidth;
    const height = containerHeight;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height));
    gradient.addColorStop(0, '#1e293b');
    gradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Calculate bounds
    const systems = mapData.systems || [];
    if (systems.length === 0) {
      // Show message if no systems
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No systems found', width / 2, height / 2);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText('Check console for errors', width / 2, height / 2 + 25);
      return;
    }
    
    // Debug: Log system count
    if (systems.length > 0) {
      console.log(`Rendering ${systems.length} systems on canvas ${width}x${height}`);
    }

    const coords = systems.map(s => s.coordinates);
    const minX = Math.min(...coords.map(c => c.x));
    const maxX = Math.max(...coords.map(c => c.x));
    const minY = Math.min(...coords.map(c => c.y));
    const maxY = Math.max(...coords.map(c => c.y));

    const rangeX = maxX - minX || 100;
    const rangeY = maxY - minY || 100;
    const padding = 50;

    // Scale and translate coordinates
    const scaleX = (width - padding * 2) / rangeX;
    const scaleY = (height - padding * 2) / rangeY;
    const scale = Math.min(scaleX, scaleY) * zoom;

    const offsetX = (width - (maxX - minX) * scale) / 2 - minX * scale + pan.x;
    const offsetY = (height - (maxY - minY) * scale) / 2 - minY * scale + pan.y;

    const toScreen = (coord) => ({
      x: coord.x * scale + offsetX,
      y: coord.y * scale + offsetY
    });

    // Draw travel routes
    ctx.strokeStyle = 'rgba(74, 158, 255, 0.3)';
    ctx.lineWidth = 1;
    mapData.routes?.forEach(route => {
      const from = toScreen(route.from.coordinates);
      const to = toScreen(route.to.coordinates);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    });

    // Draw systems
    systems.forEach(system => {
      const pos = toScreen(system.coordinates);
      const isSelected = selectedSystem === system.id;
      const isHovered = hoveredSystem === system.id;
      const isCurrent = currentCharacter?.currentPlanet && 
        system.planets?.some(p => p.id === currentCharacter.currentPlanet);

      // System circle
      const radius = isSelected ? 12 : isHovered ? 10 : 8;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      
      if (isCurrent) {
        ctx.fillStyle = '#4ade80';
      } else if (isSelected) {
        ctx.fillStyle = '#4a9eff';
      } else if (isHovered) {
        ctx.fillStyle = '#60a5fa';
      } else {
        ctx.fillStyle = '#64748b';
      }
      ctx.fill();
      
      // System border
      ctx.strokeStyle = isCurrent ? '#22c55e' : (isSelected ? '#2563eb' : '#475569');
      ctx.lineWidth = isSelected || isCurrent ? 2 : 1;
      ctx.stroke();

      // System name - always show for better visibility
      ctx.fillStyle = '#ffffff';
      ctx.font = `${isSelected || isCurrent ? '13px' : '11px'} sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const nameY = pos.y - radius - 8;
      
      // Add text shadow for better readability
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      
      ctx.fillText(system.name, pos.x, nameY);
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      // Region label for selected/hovered systems
      if ((isSelected || isHovered || isCurrent) && system.region) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px sans-serif';
        ctx.fillText(`(${system.region})`, pos.x, nameY + 12);
      }
    });
    
    // Draw legend in corner
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let legendY = 20;
    
    ctx.fillText('Legend:', 20, legendY);
    legendY += 20;
    
    // Current location
    ctx.beginPath();
    ctx.arc(30, legendY + 5, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#4ade80';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Current Location', 45, legendY);
    legendY += 20;
    
    // Selected
    ctx.beginPath();
    ctx.arc(30, legendY + 5, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#4a9eff';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Selected System', 45, legendY);
    legendY += 20;
    
    // Normal
    ctx.beginPath();
    ctx.arc(30, legendY + 5, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#64748b';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Star System', 45, legendY);
    
    // System count
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.fillText(`${systems.length} systems`, 20, height - 30);

    // Draw planets if in planet view mode
    if (viewMode === 'planets' && selectedSystem) {
      const system = systems.find(s => s.id === selectedSystem);
      if (system?.planets) {
        system.planets.forEach(planet => {
          const systemPos = toScreen(system.coordinates);
          const offset = system.planets.indexOf(planet) * 20 - (system.planets.length - 1) * 10;
          const planetPos = {
            x: systemPos.x + offset,
            y: systemPos.y + 20
          };

          ctx.beginPath();
          ctx.arc(planetPos.x, planetPos.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = planet.id === selectedPlanet?.id ? '#fbbf24' : '#94a3b8';
          ctx.fill();

          if (planet.id === selectedPlanet?.id) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(planet.name, planetPos.x, planetPos.y - 8);
          }
        });
      }
    }
  };

  // Shared coordinate transformation function (matches drawMapContent exactly)
  const getCoordinateTransform = useCallback(() => {
    if (!mapData) return null;
    
    const systems = mapData.systems || [];
    const coords = systems.map(s => s.coordinates).filter(c => c);
    if (coords.length === 0) return null;
    
    const minX = Math.min(...coords.map(c => c.x));
    const maxX = Math.max(...coords.map(c => c.x));
    const minY = Math.min(...coords.map(c => c.y));
    const maxY = Math.max(...coords.map(c => c.y));
    
    const rangeX = maxX - minX || 100;
    const rangeY = maxY - minY || 100;
    const padding = 50;
    
    const container = containerRef.current || canvasRef.current?.parentElement;
    if (!container) return null;
    
    const containerWidth = container.clientWidth || container.offsetWidth || 800;
    const containerHeight = container.clientHeight || container.offsetHeight || 600;
    
    const scaleX = (containerWidth - padding * 2) / rangeX;
    const scaleY = (containerHeight - padding * 2) / rangeY;
    const scale = Math.min(scaleX, scaleY) * zoom;
    
    const offsetX = (containerWidth - (maxX - minX) * scale) / 2 - minX * scale + pan.x;
    const offsetY = (containerHeight - (maxY - minY) * scale) / 2 - minY * scale + pan.y;
    
    return {
      toScreen: (coord) => ({
        x: coord.x * scale + offsetX,
        y: coord.y * scale + offsetY
      }),
      scale
    };
  }, [mapData, zoom, pan]);

  const handleCanvasMouseDown = (e) => {
    if (!mapData) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const transform = getCoordinateTransform();
    if (!transform) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const { toScreen, scale } = transform;
    const systems = mapData.systems || [];
    
    // Click detection radius scales with zoom and system size
    const clickRadius = Math.max(12, 15 / scale);

    // Check if clicking on a system
    for (const system of systems) {
      if (!system.coordinates) continue;
      
      const pos = toScreen(system.coordinates);
      const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      if (distance < clickRadius) {
        // Clicked on a system, select it and don't start dragging
        setSelectedSystem(system.id);
        loadSystemDetails(system.id);
        return;
      }
    }

    // Not clicking on a system, start dragging
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleCanvasMouseMove = (e) => {
    if (!mapData) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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

    // Check for hover using the same coordinate transformation
    const transform = getCoordinateTransform();
    if (!transform) {
      setHoveredSystem(null);
      return;
    }

    const { toScreen, scale } = transform;
    const systems = mapData.systems || [];
    
    // Hover detection radius scales with zoom
    const hoverRadius = Math.max(10, 15 / scale);

    let found = false;
    for (const system of systems) {
      if (!system.coordinates) continue;
      
      const pos = toScreen(system.coordinates);
      const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      if (distance < hoverRadius) {
        setHoveredSystem(system.id);
        found = true;
        break;
      }
    }
    if (!found) {
      setHoveredSystem(null);
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleCanvasMouseLeave = () => {
    setIsDragging(false);
    setHoveredSystem(null);
  };


  const loadSystemDetails = async (systemId) => {
    try {
      const response = await galaxyApi.getSystem(systemId);
      // apiClient interceptor returns response.data, so response is {success: true, data: {...}}
      if (response && response.success && response.data) {
        setSelectedSystem(response.data);
      } else {
        // Fallback to system from mapData
        const system = mapData?.systems?.find(s => s.id === systemId);
        if (system) {
          setSelectedSystem(system);
        }
      }
    } catch (err) {
      console.error('Failed to load system details:', err);
      // Fallback to system from mapData
      const system = mapData?.systems?.find(s => s.id === systemId);
      if (system) {
        setSelectedSystem(system);
      }
    }
  };

  const loadPlanetDetails = async (planetId) => {
    try {
      const response = await galaxyApi.getPlanet(planetId);
      // apiClient interceptor returns response.data, so response is {success: true, data: {...}}
      if (response && response.success && response.data) {
        setSelectedPlanet(response.data);
        
        // Calculate travel cost if character is on a different planet
        if (currentCharacter && currentCharacter.currentPlanet && currentCharacter.currentPlanet !== planetId) {
          const costInfo = await calculateTravelCost(planetId);
          setTravelCost(costInfo);
        } else {
          setTravelCost(null);
        }
      }
    } catch (err) {
      console.error('Failed to load planet details:', err);
    }
  };

  const calculateTravelCost = async (planetId) => {
    if (!currentCharacter || !currentCharacter.currentPlanet) {
      return { cost: 0, time: 0 };
    }

    try {
      const response = await galaxyApi.calculateTravelCost(
        currentCharacter.currentPlanet,
        planetId
      );
      // apiClient interceptor returns response.data, so response is {success: true, data: {...}}
      if (response && response.success && response.data) {
        return response.data;
      }
      return { cost: 0, time: 0 };
    } catch (err) {
      console.error('Failed to calculate travel cost:', err);
      return { cost: 0, time: 0 };
    }
  };

  const handleTravelClick = async (planetId) => {
    if (!currentCharacter) return;

    // If already on this planet, just navigate to surface
    if (currentCharacter.currentPlanet === planetId) {
      navigate(`/game/planet/${planetId}`);
      return;
    }

    // Calculate travel cost
    const costInfo = await calculateTravelCost(planetId);
    setTravelCost(costInfo);
    setPendingTravel(planetId);
    setShowTravelConfirm(true);
  };

  const confirmTravel = async () => {
    if (!currentCharacter || !pendingTravel) return;

    // Emit tutorial event for travel initiated
    tutorialEventBus.emit(TUTORIAL_EVENTS.TRAVEL_INITIATED, {
      fromPlanetId: currentCharacter.currentPlanet,
      toPlanetId: pendingTravel,
      characterId: currentCharacter.id
    });

    setTravelLoading(true);
    try {
      const response = await galaxyApi.travelToPlanet(currentCharacter.id, pendingTravel);
      // apiClient interceptor returns response.data, so response is {success: true, data: {...}}
      if (response && response.success && response.data && response.data.character) {
        const updatedCharacter = new CharacterManager(response.data.character);
        setCurrentCharacter(updatedCharacter);
      } else {
        throw new Error('Invalid response from travel endpoint');
      }
      
      setShowTravelConfirm(false);
      setPendingTravel(null);
      setTravelCost(null);
      setSelectedPlanet(null);
      
      // Record planet discovery (first visit)
      const planetId = response?.data?.planet?.id || pendingTravel;
      if (currentCharacter?.id && planetId) {
        try {
          await recordDiscovery(
            currentCharacter.id,
            planetId,
            'poi',
            `planet_${planetId}`,
            {
              locationName: response?.data?.planet?.name || planetId,
              metadata: { type: 'planet_visit' }
            }
          );
        } catch (err) {
          console.warn('Failed to record planet discovery:', err);
        }
      }
      
      // Emit tutorial event for travel completed
      const destinationPlanetId = response?.data?.planet?.id || pendingTravel;
      tutorialEventBus.emit(TUTORIAL_EVENTS.TRAVEL_COMPLETED, {
        planetId: destinationPlanetId,
        characterId: currentCharacter.id
      });
      
      // Navigate to planet surface
      if (response && response.success && response.data && response.data.planet) {
        navigate(`/game/planet/${response.data.planet.id || pendingTravel}`);
      } else {
        navigate(`/game/planet/${pendingTravel}`);
      }
    } catch (err) {
      console.error('Failed to travel:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to travel to planet';
      alert(errorMessage);
    } finally {
      setTravelLoading(false);
    }
  };

  const cancelTravel = () => {
    setShowTravelConfirm(false);
    setPendingTravel(null);
    setTravelCost(null);
  };

  if (loading) {
    return (
      <div className="galaxy-map-container">
        <LoadingSpinner fullScreen message="Loading galaxy map..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="galaxy-map-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  const system = typeof selectedSystem === 'string' 
    ? mapData?.systems?.find(s => s.id === selectedSystem)
    : selectedSystem;

  return (
    <div className="galaxy-map-container" ref={containerRef}>
      <HUD />
      <div className="galaxy-map-header">
        <h1>Galaxy Map</h1>
        <div className="map-controls">
          <button onClick={() => setZoom(Math.min(zoom + 0.1, 2))}>+</button>
          <button onClick={() => setZoom(Math.max(zoom - 0.1, 0.5))}>-</button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reset</button>
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
            <option value="systems">Systems</option>
            <option value="planets">Planets</option>
          </select>
        </div>
      </div>

      <div className="galaxy-map-content">
        <div className="map-canvas-container" ref={containerRef}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseLeave}
            className="galaxy-map-canvas"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          />
        </div>

        <div className="map-sidebar">
          {mapData && mapData.systems && (
            <div className="map-stats">
              <p className="stats-text">
                <strong>{mapData.systems.length}</strong> star systems
                {mapData.routes && <span>, <strong>{mapData.routes.length}</strong> travel routes</span>}
              </p>
              <p className="stats-hint">
                <small>Star systems contain planets. Click a system to see its planets, then click a planet to travel.</small>
              </p>
            </div>
          )}
          
          {system ? (
            <div className="system-details">
              <h2>{system.name}</h2>
              <p className="system-region">{system.region || 'Unknown Region'}</p>
              
              {system.description && (
                <p className="system-description">{system.description}</p>
              )}

              <div className="system-info">
                <div className="info-row">
                  <span className="info-label">Faction:</span>
                  <span className="info-value">{system.factionControl || 'Independent'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Danger Level:</span>
                  <span className="info-value">{system.dangerLevel || 1}/10</span>
                </div>
                {system.economyType && (
                  <div className="info-row">
                    <span className="info-label">Economy:</span>
                    <span className="info-value">{system.economyType}</span>
                  </div>
                )}
                {system.population && (
                  <div className="info-row">
                    <span className="info-label">Population:</span>
                    <span className="info-value">{system.population}</span>
                  </div>
                )}
              </div>

              {system.planets && system.planets.length > 0 && (
                <div className="planets-list">
                  <h3>Planets in {system.name} ({system.planets.length})</h3>
                  <p className="planets-hint">Click a planet to view details and travel</p>
                  {system.planets.map(planet => (
                    <div
                      key={planet.id}
                      className={`planet-item ${planet.id === selectedPlanet?.id ? 'selected' : ''} ${currentCharacter?.currentPlanet === planet.id ? 'current' : ''}`}
                      onClick={() => {
                        setSelectedPlanet(planet);
                        loadPlanetDetails(planet.id);
                      }}
                    >
                      <div className="planet-name">{planet.name}</div>
                      <div className="planet-type">{planet.planetType}</div>
                      {currentCharacter?.currentPlanet === planet.id && (
                        <div className="current-badge">Current Location</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {system.outgoingRoutes && system.outgoingRoutes.length > 0 && (
                <div className="routes-list">
                  <h3>Travel Routes</h3>
                  <p className="planets-hint">Click a route to select that destination system</p>
                  {system.outgoingRoutes.map(route => (
                    <div 
                      key={route.id} 
                      className="route-item"
                      onClick={() => {
                        if (route.toSystem && route.toSystem.id) {
                          setSelectedSystem(route.toSystem.id);
                          loadSystemDetails(route.toSystem.id);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="route-destination">{route.toSystem.name}</div>
                      <div className="route-info">
                        <span>{route.travelTime}h</span>
                        <span>{route.cost} credits</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="system-details">
              <p>Click on a star system to view details</p>
            </div>
          )}

          {selectedPlanet && (
            <div className="planet-details">
              <h3>{selectedPlanet.name}</h3>
              <div className="planet-info">
                <div className="info-row">
                  <span className="info-label">Type:</span>
                  <span className="info-value">{selectedPlanet.planetType}</span>
                </div>
                {selectedPlanet.climate && (
                  <div className="info-row">
                    <span className="info-label">Climate:</span>
                    <span className="info-value">{selectedPlanet.climate}</span>
                  </div>
                )}
                {selectedPlanet.atmosphere && (
                  <div className="info-row">
                    <span className="info-label">Atmosphere:</span>
                    <span className="info-value">{selectedPlanet.atmosphere}</span>
                  </div>
                )}
                {selectedPlanet.population > 0 && (
                  <div className="info-row">
                    <span className="info-label">Population:</span>
                    <span className="info-value">{selectedPlanet.population.toLocaleString()}</span>
                  </div>
                )}
                {selectedPlanet.description && (
                  <p className="planet-description">{selectedPlanet.description}</p>
                )}
              </div>
              
              {currentCharacter && (
                <div className="planet-actions">
                  {currentCharacter.currentPlanet !== selectedPlanet.id ? (
                    <>
                      {travelCost && travelCost.cost > 0 && (
                        <div className="travel-cost-info">
                          <div className="cost-row">
                            <span>Travel Cost:</span>
                            <span className={currentCharacter.credits >= travelCost.cost ? 'sufficient' : 'insufficient'}>
                              {travelCost.cost} credits
                            </span>
                          </div>
                          {travelCost.time > 0 && (
                            <div className="cost-row">
                              <span>Travel Time:</span>
                              <span>{travelCost.time} hours</span>
                            </div>
                          )}
                          <div className="cost-row">
                            <span>Your Credits:</span>
                            <span>{currentCharacter.credits}</span>
                          </div>
                        </div>
                      )}
                      <button
                        className="travel-button"
                        onClick={() => handleTravelClick(selectedPlanet.id)}
                        disabled={travelLoading}
                      >
                        {travelLoading ? 'Traveling...' : `Travel to ${selectedPlanet.name}`}
                      </button>
                    </>
                  ) : (
                    <button
                      className="travel-button"
                      onClick={() => navigate(`/game/planet/${selectedPlanet.id}`)}
                    >
                      Explore {selectedPlanet.name}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showTravelConfirm && pendingTravel && travelCost && (
        <div className="travel-confirm-overlay">
          <div className="travel-confirm-dialog">
            <h2>Confirm Travel</h2>
            <div className="confirm-details">
              <p><strong>Destination:</strong> {selectedPlanet?.name}</p>
              <div className="cost-breakdown">
                <div className="cost-item">
                  <span>Travel Cost:</span>
                  <span className={currentCharacter?.credits >= travelCost.cost ? 'sufficient' : 'insufficient'}>
                    {travelCost.cost} credits
                  </span>
                </div>
                {travelCost.time > 0 && (
                  <div className="cost-item">
                    <span>Travel Time:</span>
                    <span>{travelCost.time} hours</span>
                  </div>
                )}
                <div className="cost-item">
                  <span>Your Credits:</span>
                  <span>{currentCharacter?.credits}</span>
                </div>
                {currentCharacter && currentCharacter.credits < travelCost.cost && (
                  <div className="insufficient-funds">
                    ⚠️ Insufficient credits for travel
                  </div>
                )}
              </div>
            </div>
            <div className="confirm-actions">
              <button
                className="confirm-button"
                onClick={confirmTravel}
                disabled={travelLoading || (currentCharacter && currentCharacter.credits < travelCost.cost)}
              >
                {travelLoading ? 'Traveling...' : 'Confirm Travel'}
              </button>
              <button
                className="cancel-button"
                onClick={cancelTravel}
                disabled={travelLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <TutorialOverlay />
    </div>
  );
}

