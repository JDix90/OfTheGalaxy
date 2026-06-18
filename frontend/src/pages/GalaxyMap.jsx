/**
 * Galaxy Map Page
 * Interactive galaxy map for navigation and travel
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import GalaxyScene3D, { GALAXY_COLORS } from '../components/galaxy/GalaxyScene3D';
import { useCharacterStore } from '../state/characterSlice';
import { useDiscoveryStore } from '../state/discoverySlice';
import { tutorialEventBus, TUTORIAL_EVENTS } from '../services/tutorialEventBus';
import TutorialOverlay from '../components/tutorial/TutorialOverlay';
import { galaxyApi } from '../services/api/galaxyApi';
import { CharacterManager } from '../core/character/CharacterManager';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PauseMenu from '../features/menus/PauseMenu';
import { formatDisplayName } from '../utils/formatName';
import './GalaxyMap.css';

export default function GalaxyMap() {
  const navigate = useNavigate();
  const location = useLocation();
  // Golden-path payoff: when the player enters from the tutorial closing choice,
  // we zoom toward their chosen destination world and flag it with a banner.
  const revealPlanet = location.state?.revealPlanet || null;
  const revealQuestTitle = location.state?.followOnQuestTitle || null;
  const [revealBanner, setRevealBanner] = useState(null); // { planetName, questTitle }
  const revealDoneRef = useRef(false);
  const { currentCharacter, setCurrentCharacter, loadCharacter } = useCharacterStore();
  const { recordDiscovery } = useDiscoveryStore();
  const [mapData, setMapData] = useState(null);
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [hoveredSystem, setHoveredSystem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [travelCost, setTravelCost] = useState(null);
  const [showTravelConfirm, setShowTravelConfirm] = useState(false);
  const [pendingTravel, setPendingTravel] = useState(null);
  const [travelLoading, setTravelLoading] = useState(false);
  const containerRef = useRef(null);
  const [isPauseMenuOpen, setIsPauseMenuOpen] = useState(false);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onPauseMenuToggle: () => setIsPauseMenuOpen(prev => !prev),
    onInventoryOpen: () => setIsPauseMenuOpen(true),
    onQuestLogOpen: () => setIsPauseMenuOpen(true),
    onMapOpen: () => {} // Already on map, do nothing
  });

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
  // Tutorial closing-choice reveal: once the map is loaded, select the
  // destination system and surface a one-time banner. The 3D scene flies the
  // camera to the world via its focusPlanetId prop. Runs exactly once.
  useEffect(() => {
    if (revealDoneRef.current || !revealPlanet || !mapData) return;
    const systems = mapData.systems || [];
    const sys = systems.find(s => (s.planets || []).some(p => p.id === revealPlanet || p.name?.toLowerCase() === revealPlanet));
    if (!sys || !sys.coordinates) return;
    revealDoneRef.current = true;
    const planet = (sys.planets || []).find(p => p.id === revealPlanet || p.name?.toLowerCase() === revealPlanet);
    setSelectedSystem(sys);
    setRevealBanner({
      planetName: planet?.name || formatDisplayName(revealPlanet),
      questTitle: revealQuestTitle
    });
  }, [mapData, revealPlanet, revealQuestTitle]);
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
      <div className="galaxy-map-header">
        <div className="galaxy-map-title">
          <h1>Galaxy Map</h1>
          <span className="galaxy-map-hint">Scroll to zoom · drag to rotate · click a system to inspect</span>
        </div>
        <div className="map-nav">
          <button className="map-nav-btn" onClick={() => setIsPauseMenuOpen(true)}>☰ Menu</button>
          <button
            className="map-nav-btn map-nav-primary"
            onClick={() => navigate(currentCharacter?.currentPlanet ? `/game/planet/${currentCharacter.currentPlanet}` : '/game')}
          >
            ← Return to surface
          </button>
        </div>
      </div>

      <div className="galaxy-map-content">
        <div className="map-canvas-container" ref={containerRef}>
          <GalaxyScene3D
            systems={mapData?.systems || []}
            routes={mapData?.routes || []}
            currentPlanetId={currentCharacter?.currentPlanet}
            selectedSystemId={typeof selectedSystem === 'string' ? selectedSystem : selectedSystem?.id}
            focusPlanetId={revealPlanet}
            onSelectSystem={(system) => { setSelectedSystem(system.id); loadSystemDetails(system.id); }}
            onHoverSystem={(system) => setHoveredSystem(system?.id || null)}
          />
          {revealBanner && (
            <div className="galaxy-reveal-banner" role="status">
              <div className="reveal-banner-eyebrow">The Reach is open to you</div>
              <div className="reveal-banner-title">Your destination: {revealBanner.planetName}</div>
              {revealBanner.questTitle && (
                <div className="reveal-banner-quest">“{revealBanner.questTitle}” is in your quest log.</div>
              )}
              <button className="reveal-banner-dismiss" onClick={() => setRevealBanner(null)}>Got it</button>
            </div>
          )}
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
              <div className="map-legend">
                <span className="legend-item"><span className="legend-dot" style={{ background: GALAXY_COLORS.current }} /> Current</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: GALAXY_COLORS.selected }} /> Selected</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: GALAXY_COLORS.default }} /> System</span>
                <span className="legend-item"><span className="legend-line" /> Fold-lane</span>
              </div>
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
                  <span className="info-value">{system.factionControl ? formatDisplayName(system.factionControl) : 'Independent'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Danger Level:</span>
                  <span className="info-value">{system.dangerLevel || 1}/10</span>
                </div>
                {system.economyType && (
                  <div className="info-row">
                    <span className="info-label">Economy:</span>
                    <span className="info-value">{formatDisplayName(system.economyType)}</span>
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
      <PauseMenu isOpen={isPauseMenuOpen} onClose={() => setIsPauseMenuOpen(false)} />
      <TutorialOverlay />
    </div>
  );
}

