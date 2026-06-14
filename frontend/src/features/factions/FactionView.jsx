/**
 * Faction View Component
 * Main view for displaying and managing faction reputations
 */

import React, { useEffect, useState } from 'react';
import { useCharacterStore } from '../../state/characterSlice';
import { useFactionStore } from '../../state/factionSlice';
import FactionCard from './FactionCard';
import { MAJOR_FACTIONS, NEUTRAL_TIER_INFO } from '../../data/majorFactions';
import { formatDisplayName } from '../../utils/formatName';
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

  // Build the FULL major-faction roster, merging in any standings the player has
  // actually earned. Factions the player hasn't dealt with show as Neutral / 0,
  // so the screen always communicates the galaxy's political landscape.
  const repById = new Map(reputations.map((r) => [r.factionId, r]));
  const rosterCards = MAJOR_FACTIONS.map((f) => {
    const tracked = repById.get(f.id);
    if (tracked) {
      return { ...tracked, factionName: tracked.factionName || f.name };
    }
    return {
      factionId: f.id,
      factionName: f.name,
      reputation: 0,
      tier: 'neutral',
      tierInfo: NEUTRAL_TIER_INFO
    };
  });
  // Keep any earned standings with factions outside the curated roster.
  const extraCards = reputations
    .filter((r) => !MAJOR_FACTIONS.some((f) => f.id === r.factionId))
    .map((r) => ({
      ...r,
      factionName: r.factionName || formatDisplayName(r.factionId),
      tierInfo: r.tierInfo || NEUTRAL_TIER_INFO
    }));
  const allFactions = [...rosterCards, ...extraCards];

  // Sort the full roster
  const sortedReputations = [...allFactions].sort((a, b) => {
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

