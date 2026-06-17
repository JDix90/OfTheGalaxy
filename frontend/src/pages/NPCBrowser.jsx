/**
 * NPC Browser Page
 * Discover and browse NPCs by location, type, and relationship
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../state/characterSlice';
import { npcApi } from '../services/api/npcApi';
import { galaxyApi } from '../services/api/galaxyApi';
import ConversationView from '../features/dialogue/ConversationView';
import './NPCBrowser.css';

export default function NPCBrowser() {
  const navigate = useNavigate();
  const { currentCharacter } = useCharacterStore();
  const [npcs, setNpcs] = useState([]);
  const [filteredNPCs, setFilteredNPCs] = useState([]);
  const [selectedNPC, setSelectedNPC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('current'); // 'current' or 'all'
  const [currentPlanet, setCurrentPlanet] = useState(null);
  const [selectedSystem, setSelectedSystem] = useState('all');
  const [selectedPlanet, setSelectedPlanet] = useState('all');
  const [systems, setSystems] = useState([]);
  const [planets, setPlanets] = useState([]);
  const [filteredPlanets, setFilteredPlanets] = useState([]);

  useEffect(() => {
    if (viewMode === 'all') {
      loadSystemsAndPlanets();
    }
    loadNPCs();
  }, [currentCharacter, viewMode, selectedSystem, selectedPlanet]);

  useEffect(() => {
    filterNPCs();
  }, [npcs, filterType, searchQuery]);

  // Update filtered planets when system changes
  useEffect(() => {
    if (selectedSystem === 'all') {
      setFilteredPlanets(planets);
    } else {
      // Filter planets by system (handle both systemId and system_id)
      const systemPlanets = planets.filter(p => 
        (p.systemId === selectedSystem) || (p.system_id === selectedSystem)
      );
      setFilteredPlanets(systemPlanets);
      // Reset planet filter if current selection is not in new system
      if (selectedPlanet !== 'all' && !systemPlanets.find(p => p.id === selectedPlanet)) {
        setSelectedPlanet('all');
      }
    }
  }, [selectedSystem, planets, selectedPlanet]);

  const loadSystemsAndPlanets = async () => {
    try {
      const [systemsResponse, planetsResponse] = await Promise.all([
        galaxyApi.getSystems(),
        galaxyApi.getPlanets()
      ]);

      if (systemsResponse && systemsResponse.success && systemsResponse.data) {
        setSystems(Array.isArray(systemsResponse.data) ? systemsResponse.data : []);
      }

      if (planetsResponse && planetsResponse.success && planetsResponse.data) {
        const allPlanets = Array.isArray(planetsResponse.data) ? planetsResponse.data : [];
        // Ensure planets have systemId (handle both camelCase and snake_case)
        const normalizedPlanets = allPlanets.map(planet => ({
          ...planet,
          systemId: planet.systemId || planet.system_id || (planet.system?.id)
        }));
        setPlanets(normalizedPlanets);
        setFilteredPlanets(normalizedPlanets);
      }
    } catch (err) {
      console.error('Failed to load systems and planets:', err);
    }
  };

  const loadNPCs = async () => {
    try {
      setLoading(true);
      setError(null);

      if (viewMode === 'all') {
        // Load all NPCs with filters
        try {
          const filterOptions = {};
          if (selectedSystem !== 'all') {
            filterOptions.systemId = selectedSystem;
          }
          if (selectedPlanet !== 'all') {
            filterOptions.planetId = selectedPlanet;
          }
          
          const npcResponse = await npcApi.getAll(filterOptions);
          
          // apiClient interceptor returns response.data, so npcResponse is {success: true, data: [...]}
          if (npcResponse && npcResponse.success && npcResponse.data) {
            const allNPCs = Array.isArray(npcResponse.data) ? npcResponse.data : [];
            setNpcs(allNPCs);
            setCurrentPlanet(null); // Clear planet info for "all" mode
          } else {
            setNpcs([]);
          }
        } catch (err) {
          console.error('Failed to load all NPCs:', err);
          setNpcs([]);
          setError('Failed to load NPCs');
        }
      } else {
        // Load NPCs on current planet
        if (!currentCharacter?.currentPlanet) {
          setNpcs([]);
          setLoading(false);
          return;
        }

        const planetId = currentCharacter.currentPlanet;

        try {
          const npcResponse = await npcApi.getByLocation(planetId, 'surface');
          
          // apiClient interceptor returns response.data, so npcResponse is {success: true, data: [...]}
          if (npcResponse && npcResponse.success && npcResponse.data) {
            const existingNPCs = Array.isArray(npcResponse.data) ? npcResponse.data : [];
            
            // If no NPCs exist, generate them
            if (existingNPCs.length === 0) {
              console.log('No NPCs found, generating NPCs for planet...');
              try {
                const generateResponse = await npcApi.generateForPlanet(planetId);
                if (generateResponse && generateResponse.success && generateResponse.data) {
                  const generatedNPCs = Array.isArray(generateResponse.data) ? generateResponse.data : [];
                  setNpcs(generatedNPCs);
                  console.log(`Generated ${generateResponse.count || generatedNPCs.length} NPCs for planet`);
                } else {
                  setNpcs([]);
                }
              } catch (genError) {
                console.warn('Failed to generate NPCs:', genError);
                setNpcs([]);
              }
            } else {
              setNpcs(existingNPCs);
            }
          } else {
            setNpcs([]);
          }

          // Load planet info
          try {
            const planetResponse = await galaxyApi.getPlanet(planetId);
            if (planetResponse && planetResponse.success && planetResponse.data) {
              setCurrentPlanet(planetResponse.data);
            }
          } catch (planetErr) {
            console.warn('Failed to load planet info:', planetErr);
          }
        } catch (err) {
          console.error('Failed to load NPCs:', err);
          setNpcs([]);
          setError('Failed to load NPCs');
        }
      }
    } catch (err) {
      console.error('Failed to load NPCs:', err);
      setError('Failed to load NPCs');
    } finally {
      setLoading(false);
    }
  };

  const filterNPCs = () => {
    let filtered = [...npcs];

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(npc => npc.npcType === filterType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(npc =>
        npc.name.toLowerCase().includes(query) ||
        (npc.occupation && npc.occupation.toLowerCase().includes(query)) ||
        (npc.species && npc.species.toLowerCase().includes(query))
      );
    }

    setFilteredNPCs(filtered);
  };

  const getNPCTypeColor = (npcType) => {
    const colors = {
      quest_giver: '#fbbf24',
      vendor: '#34d399',
      companion: '#a78bfa',
      faction_leader: '#ef4444',
      random_encounter: '#60a5fa',
      generic: '#94a3b8'
    };
    return colors[npcType] || colors.generic;
  };

  const getNPCTypeLabel = (npcType) => {
    return npcType ? npcType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ') : 'Generic';
  };

  if (loading) {
    return (
      <div className="npc-browser-container">
        <div className="loading">Loading NPCs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="npc-browser-container">
        <div className="error">{error}</div>
        <button onClick={() => navigate('/game')}>Back to Game</button>
      </div>
    );
  }

  return (
    <div className="npc-browser-container">
      <div className="npc-browser-header">
        <div className="header-info">
          <h1>NPC Browser</h1>
          {viewMode === 'current' && currentPlanet && (
            <p className="location-info">On {currentPlanet.name}</p>
          )}
          {viewMode === 'all' && (
            <p className="location-info">All Planets</p>
          )}
        </div>
        <div className="header-actions">
          <button onClick={() => navigate('/game')} className="back-button">
            ← Back to Game
          </button>
        </div>
      </div>

      <div className="npc-browser-controls">
        <div className="view-mode-toggle">
          <button
            className={viewMode === 'current' ? 'active' : ''}
            onClick={() => setViewMode('current')}
          >
            Current Planet
          </button>
          <button
            className={viewMode === 'all' ? 'active' : ''}
            onClick={() => setViewMode('all')}
          >
            All NPCs
          </button>
        </div>

        <div className="filters">
          <input
            type="text"
            placeholder="Search NPCs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />

          {viewMode === 'all' && (
            <>
              <select
                value={selectedSystem}
                onChange={(e) => {
                  setSelectedSystem(e.target.value);
                  setSelectedPlanet('all'); // Reset planet when system changes
                }}
                className="filter-select"
              >
                <option value="all">All Systems</option>
                {systems.map(system => (
                  <option key={system.id} value={system.id}>
                    {system.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedPlanet}
                onChange={(e) => setSelectedPlanet(e.target.value)}
                className="filter-select"
                disabled={selectedSystem === 'all' && filteredPlanets.length === 0}
              >
                <option value="all">All Planets</option>
                {filteredPlanets.map(planet => (
                  <option key={planet.id} value={planet.id}>
                    {planet.name}
                  </option>
                ))}
              </select>
            </>
          )}

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="quest_giver">Quest Givers</option>
            <option value="vendor">Vendors</option>
            <option value="companion">Companions</option>
            <option value="faction_leader">Faction Leaders</option>
            <option value="random_encounter">Random Encounters</option>
            <option value="generic">Generic</option>
          </select>
        </div>
      </div>

      <div className="npc-browser-content">
        <div className="npc-list-container">
          <div className="npc-count">
            {filteredNPCs.length} NPC{filteredNPCs.length !== 1 ? 's' : ''} found
          </div>

          {filteredNPCs.length > 0 ? (
            <div className="npc-grid">
              {filteredNPCs.map(npc => (
                <div
                  key={npc.id}
                  className={`npc-card ${selectedNPC?.id === npc.id ? 'selected' : ''}`}
                  onClick={() => setSelectedNPC(npc)}
                >
                  <div className="npc-card-header">
                    <h3 className="npc-name">{npc.name}</h3>
                    <span
                      className="npc-type-badge"
                      style={{ backgroundColor: getNPCTypeColor(npc.npcType) }}
                    >
                      {getNPCTypeLabel(npc.npcType)}
                    </span>
                  </div>

                  <div className="npc-card-body">
                    {npc.occupation && (
                      <div className="npc-detail">
                        <span className="detail-label">Occupation:</span>
                        <span className="detail-value">{npc.occupation}</span>
                      </div>
                    )}

                    {npc.species && (
                      <div className="npc-detail">
                        <span className="detail-label">Species:</span>
                        <span className="detail-value">{npc.species}</span>
                      </div>
                    )}

                    {npc.location && (
                      <div className="npc-detail">
                        <span className="detail-label">Location:</span>
                        <span className="detail-value">
                          {npc.location.planet ? `${npc.location.planet}${npc.location.area ? ` - ${npc.location.area}` : ''}` : (npc.location.area || 'Unknown Area')}
                        </span>
                      </div>
                    )}

                    {npc.factionId && (
                      <div className="npc-detail">
                        <span className="detail-label">Faction:</span>
                        <span className="detail-value faction-name">
                          {npc.factionId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    )}

                    {npc.isCompanion && (
                      <div className="companion-badge">Recruitable Companion</div>
                    )}
                  </div>

                  <div className="npc-card-actions">
                    <button
                      className="talk-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNPC(npc);
                      }}
                    >
                      Talk
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-npcs">
              <p>No NPCs found matching your criteria.</p>
              {!currentCharacter?.currentPlanet && (
                <p className="hint">Travel to a planet to discover NPCs.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedNPC && (
        <ConversationView
          npc={selectedNPC}
          onClose={() => setSelectedNPC(null)}
        />
      )}
    </div>
  );
}

