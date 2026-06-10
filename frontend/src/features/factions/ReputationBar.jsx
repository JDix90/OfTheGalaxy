/**
 * Reputation Bar Component
 * Displays faction reputation with visual bar and tier indicator
 */

import React from 'react';
import './ReputationBar.css';

export default function ReputationBar({ reputation, tierInfo, factionName }) {
  // Calculate percentage for bar fill
  // Map reputation to 0-100% based on tier
  const getReputationPercentage = () => {
    const { min, max } = tierInfo;
    if (max === min) return 100;
    const range = max - min;
    const position = reputation - min;
    return Math.max(0, Math.min(100, (position / range) * 100));
  };

  const percentage = getReputationPercentage();

  return (
    <div className="reputation-bar-container">
      <div className="reputation-header">
        <span className="faction-name">{factionName}</span>
        <span className="reputation-value">{reputation}</span>
      </div>
      <div className="reputation-bar-wrapper">
        <div 
          className="reputation-bar-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: tierInfo.color
          }}
        />
      </div>
      <div className="reputation-footer">
        <span className="tier-label" style={{ color: tierInfo.color }}>
          {tierInfo.label}
        </span>
        <span className="tier-range">
          {tierInfo.min} - {tierInfo.max === 10000 ? '∞' : tierInfo.max}
        </span>
      </div>
    </div>
  );
}


