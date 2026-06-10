import React from 'react';
import CharacterSheet from '../menus/CharacterSheet';
import './CharacterSheetOverlay.css';

export default function CharacterSheetOverlay({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="character-sheet-overlay" onClick={onClose}>
      <div className="character-sheet-overlay-content" onClick={(e) => e.stopPropagation()}>
        <div className="character-sheet-overlay-header">
          <h2>Character Sheet</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="character-sheet-overlay-body">
          <CharacterSheet />
        </div>
      </div>
    </div>
  );
}

