/**
 * Save Slot Component
 * Individual save slot display
 */

import React, { useState } from 'react';
import './SaveSlot.css';

export default function SaveSlot({ slotNumber, save, mode, onSave, onLoad, onDelete, saving }) {
  const [saveName, setSaveName] = useState(save?.saveName || '');
  const [isEditing, setIsEditing] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatPlaytime = (seconds) => {
    if (!seconds) return '0h 0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const handleSaveClick = () => {
    if (mode === 'save') {
      if (isEditing || !save) {
        onSave(slotNumber, saveName || `Save ${slotNumber}`);
        setIsEditing(false);
      } else {
        setIsEditing(true);
      }
    } else {
      if (save) {
        onLoad(slotNumber);
      }
    }
  };

  return (
    <div className={`save-slot ${save ? 'filled' : 'empty'}`}>
      <div className="save-slot-header">
        <h4>Slot {slotNumber}</h4>
        {save && mode === 'load' && (
          <button
            className="delete-button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(slotNumber);
            }}
            title="Delete Save"
          >
            🗑️
          </button>
        )}
      </div>

      {save ? (
        <div className="save-slot-content">
          {isEditing && mode === 'save' ? (
            <div className="save-name-input">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder={`Save ${slotNumber}`}
                autoFocus
                onBlur={() => setIsEditing(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveClick();
                  } else if (e.key === 'Escape') {
                    setIsEditing(false);
                    setSaveName(save.saveName || '');
                  }
                }}
              />
            </div>
          ) : (
            <div className="save-info">
              <div className="save-name">{save.saveName || `Save ${slotNumber}`}</div>
              {save.character && (
                <div className="save-character">
                  <span className="character-name">{save.character.name}</span>
                  <span className="character-level">Level {save.character.level || 1}</span>
                </div>
              )}
              <div className="save-meta">
                <div className="save-date">
                  <span className="meta-label">Saved:</span>
                  <span className="meta-value">{formatDate(save.updatedAt || save.createdAt)}</span>
                </div>
                {save.playtime > 0 && (
                  <div className="save-playtime">
                    <span className="meta-label">Playtime:</span>
                    <span className="meta-value">{formatPlaytime(save.playtime)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="save-slot-content empty">
          <p>Empty Slot</p>
        </div>
      )}

      <div className="save-slot-actions">
        {mode === 'save' ? (
          <button
            className="save-button"
            onClick={handleSaveClick}
            disabled={saving}
          >
            {saving ? 'Saving...' : save ? (isEditing ? 'Confirm' : 'Overwrite') : 'Save'}
          </button>
        ) : (
          <button
            className="load-button"
            onClick={handleSaveClick}
            disabled={!save || saving}
          >
            {saving ? 'Loading...' : 'Load'}
          </button>
        )}
      </div>
    </div>
  );
}


