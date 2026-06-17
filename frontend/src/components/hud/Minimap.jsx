/**
 * Minimap — a collapsible bottom-right shell. The 3D pages pass a data-fed
 * <MinimapCanvas/> as children (a real top-down map); 2D pages get the location
 * label fallback. When the global HUD mounts <Minimap/> (no children) on a 3D
 * route, it stands down so the page's data-fed minimap is the only one.
 *
 * children may be a render-prop `({ expanded }) => node` so the canvas can resize.
 */

import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { formatDisplayName } from '../../utils/formatName';
import './Minimap.css';

const RE_3D = ['/game/planet/', '/game/planet3d/', '/game/location/', '/game/submap/'];

export default function Minimap({ character, children, title }) {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const path = location.pathname;
  const is3dRoute = RE_3D.some((r) => path.includes(r));

  // No scene data + on a 3D route → the page renders the data-fed map; stand down.
  if (!children && is3dRoute) return null;
  if (!children && !character) return null;

  const isGalaxyMap = path.includes('/galaxy');
  const isSubMap = path.includes('/submap') || path.includes('/location/');
  const heading = title || (children ? 'Map'
    : isGalaxyMap ? 'Galaxy Map' : isSubMap ? 'Location Map' : 'Planet Map');

  if (!isVisible) {
    return (
      <button className="minimap-toggle" onClick={() => setIsVisible(true)} title="Show Minimap (M)">🗺️</button>
    );
  }

  return (
    <div className={`minimap ${isExpanded ? 'expanded' : ''}`}>
      <div className="minimap-header">
        <span className="minimap-title">{heading}</span>
        <div className="minimap-controls">
          <button className="minimap-button" onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? 'Collapse' : 'Expand'}>
            {isExpanded ? '−' : '+'}
          </button>
          <button className="minimap-button" onClick={() => setIsVisible(false)} title="Hide Minimap (M)">×</button>
        </div>
      </div>
      <div className="minimap-content">
        {children ? (
          typeof children === 'function' ? children({ expanded: isExpanded }) : children
        ) : (
          <div className="minimap-placeholder">
            <p>{isGalaxyMap ? 'Galaxy View' : isSubMap ? 'Location' : 'Planet Surface'}</p>
            <p className="minimap-location">
              {character?.currentPlanet ? formatDisplayName(character.currentPlanet) : 'Unknown'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
