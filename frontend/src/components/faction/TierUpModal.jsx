/**
 * TierUpModal — celebratory (or sobering) modal shown when the player's standing
 * with a faction crosses a tier boundary. Promotion glows in the new tier color;
 * a demotion reads as a warning. Driven by gameEventBus REP_CHANGED events via
 * ReputationHost.
 */

import React from 'react';
import { getTierInfo, tierDirection } from '../../utils/factionTiers';
import './TierUpModal.css';

export default function TierUpModal({ factionName, factionId, oldTier, newTier, onClose }) {
  const dir = tierDirection(oldTier, newTier);
  const promoted = dir >= 0;
  const newInfo = getTierInfo(newTier);
  const oldInfo = getTierInfo(oldTier);
  const accent = newInfo.color;

  return (
    <div className="tierup-overlay" onClick={onClose}>
      <div
        className={`tierup-modal ${promoted ? 'tierup-promote' : 'tierup-demote'}`}
        style={{ '--tier-accent': accent }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tierup-burst">{promoted ? '🤝' : '⚠'}</div>
        <p className="tierup-eyebrow">{promoted ? 'Standing Improved' : 'Standing Damaged'}</p>
        <h2 className="tierup-faction">{factionName || factionId}</h2>
        <div className="tierup-tiers">
          <span className="tierup-from" style={{ color: oldInfo.color }}>{oldInfo.label}</span>
          <span className="tierup-arrow">→</span>
          <span className="tierup-to" style={{ color: newInfo.color }}>{newInfo.label}</span>
        </div>
        <p className="tierup-flavor">
          {promoted
            ? `You are now ${newInfo.label} with the ${factionName || factionId}.`
            : `You have fallen to ${newInfo.label} with the ${factionName || factionId}.`}
        </p>
        <button className="btn-primary tierup-continue" onClick={onClose}>Continue</button>
      </div>
    </div>
  );
}
