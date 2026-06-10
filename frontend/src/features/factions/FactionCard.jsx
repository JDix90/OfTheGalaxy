/**
 * Faction Card Component
 * Displays a single faction with reputation information
 */

import React from 'react';
import ReputationBar from './ReputationBar';
import './FactionCard.css';

export default function FactionCard({ reputation }) {
  const {
    factionId,
    factionName,
    reputation: repValue,
    tier,
    tierInfo
  } = reputation;

  return (
    <div className="faction-card">
      <div className="faction-card-header">
        <h3 className="faction-title">{factionName}</h3>
        <span className={`tier-badge tier-${tier}`} style={{ backgroundColor: tierInfo.color }}>
          {tierInfo.label}
        </span>
      </div>
      <ReputationBar
        reputation={repValue}
        tierInfo={tierInfo}
        factionName={factionName}
      />
    </div>
  );
}


