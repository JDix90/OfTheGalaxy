/**
 * Faction View Component
 * Main view for displaying and managing faction reputations
 */

import React, { useEffect, useState } from 'react';
import { useCharacterStore } from '../../state/characterSlice';
import { useFactionStore } from '../../state/factionSlice';
import FactionCard from './FactionCard';
import './FactionView.css';

export default function FactionView() {
  const { currentCharacter } = useCharacterStore();
  const { reputations, isLoading, error, loadReputations } = useFactionStore();
  const [sortBy, setSortBy] = useState('reputation'); // 'reputation', 'name', 'tier'

  useEffect(() => {
    if (currentCharacter?.id) {
      loadReputations(currentCharacter.id).catch(err => {
        console.error('Failed to load faction reputations:', err);
      });
    }
  }, [currentCharacter?.id, loadReputations]);

  if (!currentCharacter) {
    return (
      <div className="faction-view">
        <div className="faction-view-error">
          <p>No character selected. Please create or select a character first.</p>
        </div>
      </div>
    );
  }

  // Sort reputations
  const sortedReputations = [...reputations].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.factionName || '').localeCompare(b.factionName || '');
      case 'tier':
        const tierOrder = ['hated', 'hostile', 'unfriendly', 'neutral', 'friendly', 'honored', 'exalted'];
        return tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
      case 'reputation':
      default:
        return b.reputation - a.reputation;
    }
  });

  return (
    <div className="faction-view">
      <div className="faction-view-header">
        <h1>Faction Reputation</h1>
        <div className="faction-controls">
          <label htmlFor="sort-select">Sort by:</label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="reputation">Reputation</option>
            <option value="name">Name</option>
            <option value="tier">Tier</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="faction-view-error">
          <p>Error: {error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="faction-view-loading">
          <p>Loading faction reputations...</p>
        </div>
      ) : sortedReputations.length === 0 ? (
        <div className="faction-view-empty">
          <p>No faction reputations found. Reputation will be tracked as you interact with NPCs from different factions.</p>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Tip: Talk to NPCs to start building reputation with their factions!
          </p>
        </div>
      ) : (
        <div className="faction-grid">
          {sortedReputations.map((reputation) => (
            <FactionCard key={reputation.factionId} reputation={reputation} />
          ))}
        </div>
      )}
    </div>
  );
}

