/**
 * RelationshipPips — a slim 4-segment standing indicator that reuses the 3D
 * nameplate's visual language instead of a "0/100" progress bar. The active
 * tier's pip fills with the tier colour; a subtle inner fill shows progress
 * within the current tier. Animates on change.
 */

import React from 'react';
import { RELATIONSHIP_TIERS, getRelationshipTier, getRelationshipColor } from '../dialogueUtils';

const TIER_BOUNDS = { stranger: [0, 15], acquaintance: [15, 40], friend: [40, 70], confidant: [70, 100] };

export default function RelationshipPips({ level = 0 }) {
  const tier = getRelationshipTier(level);
  const color = getRelationshipColor(level);
  const tierIndex = RELATIONSHIP_TIERS.indexOf(tier);
  const [lo, hi] = TIER_BOUNDS[tier];
  const within = Math.max(0, Math.min(1, (level - lo) / (hi - lo))) * 100;

  return (
    <div className="cv-pips" title={`${tier} · ${Math.round(level)}/100`} aria-label={`Relationship: ${tier}`}>
      {RELATIONSHIP_TIERS.map((t, i) => (
        <span key={t} className="cv-pip">
          <span
            className="cv-pip-fill"
            style={{
              width: i < tierIndex ? '100%' : i === tierIndex ? `${within}%` : '0%',
              background: i <= tierIndex ? color : 'transparent',
            }}
          />
        </span>
      ))}
    </div>
  );
}
