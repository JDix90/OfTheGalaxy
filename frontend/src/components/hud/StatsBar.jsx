/**
 * StatsBar — player META (credits, level, XP), top-right.
 *
 * Health/stamina moved to PlayerVitals (the bottom action cluster), which reads
 * the live world source — this component no longer renders vitals, so the
 * top-left no longer shows a stale, duplicate health bar.
 */

import React, { useEffect, useRef } from 'react';
import './StatsBar.css';
import { addTutorialTarget, TUTORIAL_TARGETS } from '../../services/tutorialTargetRegistry';

export default function StatsBar({ character, onOpenInventory, onOpenCharacterSheet }) {
  const creditsLevelXpRef = useRef(null);
  const levelDisplayRef = useRef(null);

  useEffect(() => {
    if (creditsLevelXpRef.current) addTutorialTarget(creditsLevelXpRef.current, TUTORIAL_TARGETS.HUD_CREDITS_LEVEL_XP);
    if (levelDisplayRef.current) addTutorialTarget(levelDisplayRef.current, TUTORIAL_TARGETS.HUD_LEVEL_DISPLAY);
  }, [character]);

  if (!character) return null;

  return (
    <div className="stats-bar">
      <div className="stats-right" ref={creditsLevelXpRef}>
        <div
          className={`stat-item credits ${onOpenInventory ? 'clickable' : ''}`}
          onClick={onOpenInventory}
          title={onOpenInventory ? 'Click to open Inventory' : undefined}
        >
          <span className="stat-icon">💰</span>
          <span className="stat-value">{character.credits || 0}</span>
        </div>

        <div
          ref={levelDisplayRef}
          className={`stat-item level ${onOpenCharacterSheet ? 'clickable' : ''}`}
          onClick={onOpenCharacterSheet}
          title={onOpenCharacterSheet ? 'Click to open Character Sheet' : undefined}
          data-tutorial-target={TUTORIAL_TARGETS.HUD_LEVEL_DISPLAY}
        >
          <span className="stat-label">Level</span>
          <span className="stat-value">{character.level || 1}</span>
        </div>

        {character.xp !== undefined && (
          <div className="stat-item xp">
            <span className="stat-label">XP</span>
            <span className="stat-value">{character.xp || 0}</span>
          </div>
        )}
      </div>
    </div>
  );
}
