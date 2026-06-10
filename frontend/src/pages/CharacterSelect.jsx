/**
 * CharacterSelect Page
 * Select or create a character
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../state/characterSlice';

export default function CharacterSelect() {
  const navigate = useNavigate();
  const { characters, currentCharacter, loadCharacters, setCurrentCharacter, deleteCharacter, isLoading } = useCharacterStore();

  useEffect(() => {
    loadCharacters().catch(error => {
      console.error('Failed to load characters:', error);
      // If auth error, show helpful message
      if (error.message && error.message.includes('Authentication')) {
        alert('Authentication required. Please check the browser console for instructions to set a test token.');
      }
    });
  }, [loadCharacters]);

  const handleSelectCharacter = (character) => {
    setCurrentCharacter(character);
    navigate('/game');
  };

  const handleCreateNew = () => {
    navigate('/character/create');
  };

  const handleDelete = async (characterId, e) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this character? This cannot be undone.')) {
      try {
        await deleteCharacter(characterId);
      } catch (error) {
        alert('Failed to delete character');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="character-select loading">
        <p>Loading characters...</p>
      </div>
    );
  }

  return (
    <div className="character-select">
      <div className="character-select-container">
        <h1>Select Character</h1>

        <div className="character-list">
          {characters.length === 0 ? (
            <div className="no-characters">
              <p>No characters found. Create your first character to begin.</p>
            </div>
          ) : (
            characters.map((char) => (
              <div
                key={char.id}
                className={`character-card ${currentCharacter?.id === char.id ? 'current' : ''}`}
                onClick={() => handleSelectCharacter(char)}
              >
                <div className="character-info">
                  <h3>{char.name}</h3>
                  <p className="character-details">
                    Level {char.level} {char.species} {char.background}
                  </p>
                  <p className="character-location">
                    {char.currentPlanet || 'Unknown Location'}
                  </p>
                </div>

                <div className="character-stats">
                  <div className="stat">
                    <span className="stat-label">XP</span>
                    <span className="stat-value">{char.xp}/{char.xpToNextLevel}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Health</span>
                    <span className="stat-value">{char.currentHealth}/{char.maxHealth}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => handleDelete(char.id, e)}
                  className="btn-delete"
                  title="Delete character"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        <div className="character-select-actions">
          <button onClick={handleCreateNew} className="btn-primary">
            Create New Character
          </button>
          <button onClick={() => navigate('/')} className="btn-secondary">
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
