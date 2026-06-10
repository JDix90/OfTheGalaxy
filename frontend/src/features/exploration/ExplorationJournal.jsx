/**
 * Exploration Journal Component
 * Displays player's exploration discoveries and statistics
 */

import React, { useState, useEffect } from 'react';
import { useCharacterStore } from '../../state/characterSlice';
import { useDiscoveryStore } from '../../state/discoverySlice';
import achievementApi from '../../services/api/achievementApi';
import './ExplorationJournal.css';

export default function ExplorationJournal() {
  const { currentCharacter } = useCharacterStore();
  const { discoveries, stats, isLoading, error, loadDiscoveries, loadStats } = useDiscoveryStore();
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'byPlanet', 'byType', 'stats', 'achievements'
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [achievementStats, setAchievementStats] = useState(null);
  const [loadingAchievements, setLoadingAchievements] = useState(false);

  useEffect(() => {
    if (currentCharacter?.id) {
      loadDiscoveries(currentCharacter.id);
      loadStats(currentCharacter.id);
      loadAchievements();
    }
  }, [currentCharacter?.id, loadDiscoveries, loadStats]);

  const loadAchievements = async () => {
    if (!currentCharacter?.id) return;

    setLoadingAchievements(true);
    try {
      const [achievementsResponse, statsResponse] = await Promise.all([
        achievementApi.getAchievements(currentCharacter.id),
        achievementApi.getStats(currentCharacter.id)
      ]);

      setAchievements(achievementsResponse.data?.data || []);
      setAchievementStats(statsResponse.data?.data || null);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    } finally {
      setLoadingAchievements(false);
    }
  };

  if (!currentCharacter) {
    return (
      <div className="exploration-journal">
        <div className="journal-error">
          <p>No character selected. Please create or select a character first.</p>
        </div>
      </div>
    );
  }

  // Get unique planets and types from discoveries
  const uniquePlanets = [...new Set(discoveries.map(d => d.planetId))];
  const uniqueTypes = [...new Set(discoveries.map(d => d.locationType))];

  // Filter discoveries based on active tab
  let filteredDiscoveries = discoveries;
  if (activeTab === 'byPlanet' && selectedPlanet) {
    filteredDiscoveries = discoveries.filter(d => d.planetId === selectedPlanet);
  } else if (activeTab === 'byType' && selectedType) {
    filteredDiscoveries = discoveries.filter(d => d.locationType === selectedType);
  }

  // Group discoveries by planet
  const discoveriesByPlanet = {};
  discoveries.forEach(discovery => {
    if (!discoveriesByPlanet[discovery.planetId]) {
      discoveriesByPlanet[discovery.planetId] = [];
    }
    discoveriesByPlanet[discovery.planetId].push(discovery);
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLocationTypeLabel = (type) => {
    const labels = {
      poi: 'Point of Interest',
      city: 'City',
      landmark: 'Landmark',
      hidden_location: 'Hidden Location',
      scannable_object: 'Scannable Object',
      fast_travel_point: 'Fast Travel Point',
      sub_map: 'Location'
    };
    return labels[type] || type;
  };

  return (
    <div className="exploration-journal">
      <div className="journal-header">
        <h1>Exploration Journal</h1>
        <div className="journal-subtitle">
          Track your discoveries across the galaxy
        </div>
      </div>

      {error && (
        <div className="journal-error">
          <p>Error: {error}</p>
        </div>
      )}

      {isLoading && discoveries.length === 0 ? (
        <div className="journal-loading">
          <p>Loading discoveries...</p>
        </div>
      ) : (
        <>
          {/* Statistics Summary */}
          {stats && (
            <div className="journal-stats">
              <div className="stat-card">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total Discoveries</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.firstDiscoveries}</div>
                <div className="stat-label">First Discoveries</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{Object.keys(stats.byPlanet || {}).length}</div>
                <div className="stat-label">Planets Explored</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{Object.keys(stats.byType || {}).length}</div>
                <div className="stat-label">Location Types</div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="journal-tabs">
            <button
              className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('all');
                setSelectedPlanet(null);
                setSelectedType(null);
              }}
            >
              All Discoveries
            </button>
            <button
              className={`tab-button ${activeTab === 'byPlanet' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('byPlanet');
                setSelectedType(null);
              }}
            >
              By Planet
            </button>
            <button
              className={`tab-button ${activeTab === 'byType' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('byType');
                setSelectedPlanet(null);
              }}
            >
              By Type
            </button>
            <button
              className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              Statistics
            </button>
            <button
              className={`tab-button ${activeTab === 'achievements' ? 'active' : ''}`}
              onClick={() => setActiveTab('achievements')}
            >
              Achievements
            </button>
          </div>

          {/* Content */}
          <div className="journal-content">
            {activeTab === 'stats' && stats ? (
              <div className="stats-view">
                <div className="stats-section">
                  <h3>Discoveries by Type</h3>
                  <div className="type-breakdown">
                    {Object.entries(stats.byType || {}).map(([type, count]) => (
                      <div key={type} className="type-item">
                        <span className="type-name">{getLocationTypeLabel(type)}</span>
                        <span className="type-count">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="stats-section">
                  <h3>Discoveries by Planet</h3>
                  <div className="planet-breakdown">
                    {Object.entries(stats.byPlanet || {}).map(([planetId, count]) => (
                      <div key={planetId} className="planet-item">
                        <span className="planet-name">{planetId}</span>
                        <span className="planet-count">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : activeTab === 'byPlanet' ? (
              <div className="planet-view">
                <div className="planet-filter">
                  <label>Filter by Planet:</label>
                  <select
                    value={selectedPlanet || ''}
                    onChange={(e) => setSelectedPlanet(e.target.value || null)}
                  >
                    <option value="">All Planets</option>
                    {uniquePlanets.map(planetId => (
                      <option key={planetId} value={planetId}>{planetId}</option>
                    ))}
                  </select>
                </div>

                {Object.entries(discoveriesByPlanet).map(([planetId, planetDiscoveries]) => (
                  (!selectedPlanet || selectedPlanet === planetId) && (
                    <div key={planetId} className="planet-group">
                      <h3>{planetId}</h3>
                      <div className="discoveries-list">
                        {planetDiscoveries.map(discovery => (
                          <div key={discovery.id} className="discovery-item">
                            <div className="discovery-header">
                              <span className="discovery-name">
                                {discovery.locationName || discovery.locationId}
                              </span>
                              {discovery.firstDiscovery && (
                                <span className="first-discovery-badge">First Discovery!</span>
                              )}
                            </div>
                            <div className="discovery-details">
                              <span className="discovery-type">{getLocationTypeLabel(discovery.locationType)}</span>
                              <span className="discovery-date">{formatDate(discovery.discoveredAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            ) : activeTab === 'byType' ? (
              <div className="type-view">
                <div className="type-filter">
                  <label>Filter by Type:</label>
                  <select
                    value={selectedType || ''}
                    onChange={(e) => setSelectedType(e.target.value || null)}
                  >
                    <option value="">All Types</option>
                    {uniqueTypes.map(type => (
                      <option key={type} value={type}>{getLocationTypeLabel(type)}</option>
                    ))}
                  </select>
                </div>

                <div className="discoveries-list">
                  {filteredDiscoveries.map(discovery => (
                    <div key={discovery.id} className="discovery-item">
                      <div className="discovery-header">
                        <span className="discovery-name">
                          {discovery.locationName || discovery.locationId}
                        </span>
                        {discovery.firstDiscovery && (
                          <span className="first-discovery-badge">First Discovery!</span>
                        )}
                      </div>
                      <div className="discovery-details">
                        <span className="discovery-planet">{discovery.planetId}</span>
                        <span className="discovery-type">{getLocationTypeLabel(discovery.locationType)}</span>
                        <span className="discovery-date">{formatDate(discovery.discoveredAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeTab === 'achievements' ? (
              <div className="achievements-view">
                {loadingAchievements ? (
                  <div className="journal-loading">
                    <p>Loading achievements...</p>
                  </div>
                ) : (
                  <>
                    {achievementStats && (
                      <div className="achievement-stats">
                        <div className="stat-card">
                          <div className="stat-value">{achievementStats.completed}/{achievementStats.total}</div>
                          <div className="stat-label">Completed</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-value">{Math.round(achievementStats.progress)}%</div>
                          <div className="stat-label">Progress</div>
                        </div>
                      </div>
                    )}

                    <div className="achievements-list">
                      {achievements.length > 0 ? (
                        achievements.map(achievement => (
                          <div
                            key={achievement.id}
                            className={`achievement-item ${achievement.completed ? 'completed' : ''}`}
                          >
                            <div className="achievement-header">
                              <span className="achievement-name">{achievement.achievementName}</span>
                              {achievement.completed && (
                                <span className="achievement-badge">✓ Completed</span>
                              )}
                            </div>
                            <div className="achievement-progress">
                              <div className="progress-bar">
                                <div
                                  className="progress-fill"
                                  style={{
                                    width: `${(achievement.progress / achievement.target) * 100}%`
                                  }}
                                />
                              </div>
                              <span className="progress-text">
                                {achievement.progress} / {achievement.target}
                              </span>
                            </div>
                            {achievement.completed && achievement.rewards && (
                              <div className="achievement-rewards">
                                {achievement.rewards.xp > 0 && (
                                  <span className="reward">+{achievement.rewards.xp} XP</span>
                                )}
                                {achievement.rewards.credits > 0 && (
                                  <span className="reward">+{achievement.rewards.credits} credits</span>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="no-achievements">
                          <p>No achievements yet. Start exploring and fighting to unlock achievements!</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="discoveries-list">
                {filteredDiscoveries.length > 0 ? (
                  filteredDiscoveries.map(discovery => (
                    <div key={discovery.id} className="discovery-item">
                      <div className="discovery-header">
                        <span className="discovery-name">
                          {discovery.locationName || discovery.locationId}
                        </span>
                        {discovery.firstDiscovery && (
                          <span className="first-discovery-badge">First Discovery!</span>
                        )}
                      </div>
                      <div className="discovery-details">
                        <span className="discovery-planet">{discovery.planetId}</span>
                        <span className="discovery-type">{getLocationTypeLabel(discovery.locationType)}</span>
                        <span className="discovery-date">{formatDate(discovery.discoveredAt)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-discoveries">
                    <p>No discoveries yet. Start exploring to record your first discovery!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

