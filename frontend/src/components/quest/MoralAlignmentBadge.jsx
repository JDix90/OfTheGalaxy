/**
 * Moral Alignment Badge Component
 * Displays a badge indicating the moral alignment of a mini-quest
 */

import React from 'react';
import './MoralAlignmentBadge.css';

export default function MoralAlignmentBadge({ alignment, size = 'normal' }) {
  if (!alignment || alignment === 'neutral') return null;

  const alignmentConfig = {
    altruistic: {
      icon: '💝',
      label: 'Altruistic',
      className: 'altruistic'
    },
    neutral: {
      icon: '📋',
      label: 'Neutral',
      className: 'neutral'
    },
    deceptive: {
      icon: '🎭',
      label: 'Deceptive',
      className: 'deceptive'
    },
    criminal: {
      icon: '⚔️',
      label: 'Criminal',
      className: 'criminal'
    }
  };

  const config = alignmentConfig[alignment] || alignmentConfig.neutral;

  return (
    <span className={`moral-alignment-badge ${config.className} ${size}`}>
      <span className="badge-icon">{config.icon}</span>
      <span className="badge-label">{config.label}</span>
    </span>
  );
}








