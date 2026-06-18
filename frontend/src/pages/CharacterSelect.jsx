/**
 * CharacterSelect Page
 * Select or create a character
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../state/characterSlice';
import { formatDisplayName } from '../utils/formatName';
import './CharacterSelect.css';

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
    // Home is the 3D planet surface for anyone past the brand-new-character
    // tutorial; new characters go to /game, which runs the spaceport onboarding
    // redirect. (Matches GameWorld's isNewCharacter definition.)
    const isNew = character?.level === 1 && !character?.tutorialCompleted;
    if (!isNew && character?.currentPlanet) {
      navigate(`/game/planet/${character.currentPlanet}`);
    } else {
      navigate('/game');
    }
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
              <div className="no-characters-icon">🧑‍🚀</div>
              <h2>Begin your journey</h2>
              <p>You don't have any characters yet. Create one to set out into the Severed Reach.</p>
              <button onClick={handleCreateNew} className="btn-primary btn-large">
                Create Your First Character
              </button>
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
                    Level {char.level} · {formatDisplayName(char.species)} {formatDisplayName(char.background)}
                  </p>
                  <p className="character-location">
                    {char.currentPlanet ? formatDisplayName(char.currentPlanet) : 'Unknown Location'}
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
