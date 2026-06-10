/**
 * Minimap
 * Context-aware minimap (galaxy or planet surface)
 */

import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import './Minimap.css';

export default function Minimap({ character }) {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  if (!character) return null;

  // Determine context based on current route
  const isGalaxyMap = location.pathname.includes('/galaxy');
  const isPlanetSurface = location.pathname.includes('/planet/');
  const isSubMap = location.pathname.includes('/submap') || location.pathname.includes('/location/');

  if (!isVisible) {
    return (
      <button 
        className="minimap-toggle"
        onClick={() => setIsVisible(true)}
        title="Show Minimap (M)"
      >
        🗺️
      </button>
    );
  }

  return (
    <div className={`minimap ${isExpanded ? 'expanded' : ''}`}>
      <div className="minimap-header">
        <span className="minimap-title">
          {isGalaxyMap ? 'Galaxy Map' : isPlanetSurface ? 'Planet Map' : isSubMap ? 'Location Map' : 'Map'}
        </span>
        <div className="minimap-controls">
          <button 
            className="minimap-button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '−' : '+'}
          </button>
          <button 
            className="minimap-button"
            onClick={() => setIsVisible(false)}
            title="Hide Minimap (M)"
          >
            ×
          </button>
        </div>
      </div>
      <div className="minimap-content">
        {isGalaxyMap ? (
          <div className="minimap-placeholder">
            <p>Galaxy View</p>
            <p className="minimap-location">Current: {character.currentPlanet || 'Unknown'}</p>
          </div>
        ) : isPlanetSurface ? (
          <div className="minimap-placeholder">
            <p>Planet Surface</p>
            <p className="minimap-location">{character.currentPlanet || 'Unknown Planet'}</p>
          </div>
        ) : isSubMap ? (
          <div className="minimap-placeholder">
            <p>Location</p>
            <p className="minimap-location">{character.currentPlanet || 'Unknown'}</p>
          </div>
        ) : (
          <div className="minimap-placeholder">
            <p>No Map Available</p>
          </div>
        )}
      </div>
    </div>
  );
}


