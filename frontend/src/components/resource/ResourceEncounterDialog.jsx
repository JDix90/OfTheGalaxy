/**
 * Resource Encounter Dialog Component
 * Displays when a resource is found while exploring a submap
 */

import React from 'react';
import './ResourceEncounterDialog.css';

export default function ResourceEncounterDialog({ 
  isOpen, 
  onHarvest, 
  onLeave, 
  resource
}) {
  if (!isOpen || !resource) return null;

  const rarityColors = {
    'common': '#9ca3af',
    'uncommon': '#34d399',
    'rare': '#60a5fa',
    'epic': '#a78bfa',
    'legendary': '#fbbf24'
  };

  const rarityColor = rarityColors[resource.rarity] || '#9ca3af';

  return (
    <div className="resource-encounter-dialog-overlay">
      <div className="resource-encounter-dialog">
        <div className="resource-encounter-dialog-header">
          <h2>💎 Resource Found!</h2>
        </div>
        
        <div className="resource-encounter-dialog-content">
          <div className="resource-info">
            <div 
              className="resource-name" 
              style={{ color: rarityColor }}
            >
              {resource.name}
            </div>
            <div className="resource-rarity" style={{ color: rarityColor }}>
              {resource.rarity?.charAt(0).toUpperCase() + resource.rarity?.slice(1)}
            </div>
            <p className="resource-description">{resource.description}</p>
            {resource.baseValue > 0 && (
              <div className="resource-value">
                Value: {resource.baseValue} credits
              </div>
            )}
          </div>
        </div>

        <div className="resource-encounter-dialog-actions">
          <button 
            onClick={onHarvest} 
            className="btn-primary btn-harvest"
          >
            ⛏️ Harvest
          </button>
          <button 
            onClick={onLeave} 
            className="btn-secondary btn-leave"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}



