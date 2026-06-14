/**
 * LevelUpModal — celebratory modal shown when the player gains one or more levels
 * (detected by comparing pre/post-combat level). Surfaces the new level and the
 * points the player can now spend.
 */

import React from 'react';
import GameIcon from '../common/GameIcon';
import './LevelUpModal.css';

export default function LevelUpModal({ fromLevel, toLevel, skillPoints = 0, attributePoints = 0, onClose }) {
  const gained = Math.max(1, (toLevel || 0) - (fromLevel || 0));
  return (
    <div className="levelup-overlay" onClick={onClose}>
      <div className="levelup-modal" onClick={(e) => e.stopPropagation()}>
        <div className="levelup-burst"><GameIcon name="levelup" size={48} /></div>
        <h1 className="levelup-title">Level Up!</h1>
        <div className="levelup-levels">
          <span className="levelup-from">Lv {fromLevel}</span>
          <span className="levelup-arrow">→</span>
          <span className="levelup-to">Lv {toLevel}</span>
        </div>
        {gained > 1 && <p className="levelup-multi">{gained} levels gained!</p>}
        <div className="levelup-rewards">
          {skillPoints > 0 && (
            <div className="levelup-reward"><GameIcon name="skill" size={18} /> {skillPoints} skill point{skillPoints !== 1 ? 's' : ''} to spend</div>
          )}
          {attributePoints > 0 && (
            <div className="levelup-reward"><GameIcon name="attribute" size={18} /> {attributePoints} attribute point{attributePoints !== 1 ? 's' : ''} available</div>
          )}
          <div className="levelup-reward"><GameIcon name="health" size={18} /> Max Health &amp; Stamina increased</div>
        </div>
        <button className="btn-primary levelup-continue" onClick={onClose}>Continue</button>
      </div>
    </div>
  );
}
