/**
 * CharacterSelector Component
 * Dropdown/modal for switching between characters
 */

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../state/characterSlice';
import './CharacterSelector.css';

export default function CharacterSelector({ isOpen, onClose, triggerRef }) {
  const navigate = useNavigate();
  const { characters, currentCharacter, loadCharacters, setCurrentCharacter, isLoading } = useCharacterStore();
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const selectorRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadCharacters().catch(error => {
        console.error('Failed to load characters:', error);
      });
    }
  }, [isOpen, loadCharacters]);

  // Position the selector relative to the trigger element
  useEffect(() => {
    if (isOpen && triggerRef?.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  }, [isOpen, triggerRef]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        selectorRef.current &&
        !selectorRef.current.contains(event.target) &&
        triggerRef?.current &&
        !triggerRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose, triggerRef]);

  const handleSelectCharacter = (character) => {
    setCurrentCharacter(character);
    onClose();
    // Navigate to game page to refresh state
    navigate('/game');
  };

  const handleCreateNew = () => {
    onClose();
    navigate('/character/create');
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={selectorRef}
      className="character-selector"
      style={{ top: `${position.top}px`, right: `${position.right}px` }}
    >
      <div className="character-selector-header">
        <h3>Switch Character</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="character-selector-content">
        {isLoading ? (
          <div className="character-selector-loading">
            <p>Loading characters...</p>
          </div>
        ) : characters.length === 0 ? (
          <div className="character-selector-empty">
            <p>No characters found.</p>
          </div>
        ) : (
          <div className="character-selector-list">
            {characters.map((char) => (
              <div
                key={char.id}
                className={`character-selector-item ${
                  currentCharacter?.id === char.id ? 'active' : ''
                }`}
                onClick={() => handleSelectCharacter(char)}
              >
                <div className="character-selector-item-info">
                  <div className="character-selector-item-name">{char.name}</div>
                  <div className="character-selector-item-details">
                    Level {char.level} • {char.species} • {char.background}
                  </div>
                  <div className="character-selector-item-location">
                    {char.currentPlanet || 'Unknown Location'}
                  </div>
                </div>
                {currentCharacter?.id === char.id && (
                  <div className="character-selector-item-badge">Current</div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="character-selector-actions">
          <button 
            className="btn-primary btn-full-width" 
            onClick={handleCreateNew}
          >
            + Create New Character
          </button>
        </div>
      </div>
    </div>
  );
}

