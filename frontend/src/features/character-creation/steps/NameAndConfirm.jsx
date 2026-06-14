/**
 * NameAndConfirm Component
 * Step 5: Name character and confirm creation
 */

import React from 'react';

export default function NameAndConfirm({ characterData, onUpdate }) {
  const handleNameChange = (e) => {
    onUpdate({ name: e.target.value });
  };

  const handleGenderChange = (e) => {
    onUpdate({ 
      appearance: {
        ...characterData.appearance,
        gender: e.target.value
      }
    });
  };

  const getSpeciesName = (id) => {
    const species = {
      human: 'Human',
      sytheen: "Sytheen",
      skarn: 'Skarn',
      ursk: 'Ursk',
      karnaki: 'Karnaki',
      sethari: 'Sethari',
      jeharu: 'Jeharu',
      vorne: 'Vorne'
    };
    return species[id] || id;
  };

  const getBackgroundName = (id) => {
    const backgrounds = {
      smuggler: 'Smuggler',
      scholar: 'Scholar',
      soldier: 'Soldier',
      medic: 'Medic',
      engineer: 'Engineer',
      diplomat: 'Diplomat',
      pilot: 'Pilot'
    };
    return backgrounds[id] || id;
  };

  return (
    <div className="name-and-confirm">
      <p className="step-description">
        Give your character a name and review your choices before finalizing.
      </p>

      <div className="name-input-section">
        <label htmlFor="character-name">Character Name</label>
        <input
          id="character-name"
          type="text"
          value={characterData.name}
          onChange={handleNameChange}
          placeholder="Enter character name..."
          maxLength={50}
          className="name-input"
          autoFocus
        />
        <p className="input-hint">
          {characterData.name.length}/50 characters
          {characterData.name.length < 2 && ' (minimum 2 characters)'}
        </p>
      </div>

      <div className="gender-selection-section">
        <label htmlFor="character-gender">Gender</label>
        <div className="gender-options">
          <label className={`gender-option ${characterData.appearance?.gender === 'male' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="gender"
              value="male"
              checked={characterData.appearance?.gender === 'male'}
              onChange={handleGenderChange}
            />
            <span>Male</span>
          </label>
          <label className={`gender-option ${characterData.appearance?.gender === 'female' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="gender"
              value="female"
              checked={characterData.appearance?.gender === 'female'}
              onChange={handleGenderChange}
            />
            <span>Female</span>
          </label>
          <label className={`gender-option ${characterData.appearance?.gender === 'non-binary' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="gender"
              value="non-binary"
              checked={characterData.appearance?.gender === 'non-binary'}
              onChange={handleGenderChange}
            />
            <span>Non-binary</span>
          </label>
          <label className={`gender-option ${characterData.appearance?.gender === 'other' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="gender"
              value="other"
              checked={characterData.appearance?.gender === 'other'}
              onChange={handleGenderChange}
            />
            <span>Other</span>
          </label>
        </div>
      </div>

      <div className="character-summary">
        <h3>Character Summary</h3>

        <div className="summary-section">
          <h4>Basic Information</h4>
          <div className="summary-row">
            <span className="summary-label">Name:</span>
            <span className="summary-value">{characterData.name || '(Not set)'}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Species:</span>
            <span className="summary-value">{getSpeciesName(characterData.species)}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Background:</span>
            <span className="summary-value">{getBackgroundName(characterData.background)}</span>
          </div>
          {characterData.appearance?.gender && (
            <div className="summary-row">
              <span className="summary-label">Gender:</span>
              <span className="summary-value">
                {characterData.appearance.gender
                  .split('-')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join('-')}
              </span>
            </div>
          )}
        </div>

        <div className="summary-section">
          <h4>Attributes</h4>
          {Object.entries(characterData.stats).map(([attr, value]) => (
            <div key={attr} className="summary-row">
              <span className="summary-label">{attr.charAt(0).toUpperCase() + attr.slice(1)}:</span>
              <span className="summary-value">{value}</span>
            </div>
          ))}
        </div>

        <div className="summary-note">
          <p>
            <strong>Ready to begin your journey?</strong>
          </p>
          <p>
            Once you create your character, you'll start on your background's home planet 
            and can begin exploring the galaxy, completing quests, and building relationships 
            with NPCs across the 86-planet system.
          </p>
        </div>
      </div>
    </div>
  );
}
