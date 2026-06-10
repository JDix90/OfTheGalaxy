/**
 * Save/Load View
 * Save and load game slots
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../../state/characterSlice';
import { useInventoryStore } from '../../state/inventorySlice';
import { useQuestStore } from '../../state/questSlice';
import { saveApi } from '../../services/api/saveApi';
import SaveSlot from './SaveSlot';
import { notify } from '../../components/hud/NotificationCenter';
import './SaveLoadView.css';

export default function SaveLoadView({ mode = 'load', onClose }) {
  const navigate = useNavigate();
  const { currentCharacter, loadCharacter } = useCharacterStore();
  const loadInventory = useInventoryStore((s) => s.loadInventory);
  const loadActiveQuests = useQuestStore((s) => s.loadActiveQuests);
  const loadAvailableQuests = useQuestStore((s) => s.loadAvailableQuests);
  const [saveSlots, setSaveSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSaveSlots();
  }, []);

  const loadSaveSlots = async () => {
    try {
      setLoading(true);
      const response = await saveApi.getSaveSlots();
      if (response.success) {
        setSaveSlots(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load save slots:', error);
      notify('Failed to load save slots', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (slotNumber, saveName) => {
    if (!currentCharacter) {
      notify('No character selected', 'error');
      return;
    }

    try {
      setSaving(true);
      const response = await saveApi.createSave(currentCharacter.id, slotNumber, saveName);
      if (response.success) {
        notify(`Game saved to slot ${slotNumber}`, 'success');
        await loadSaveSlots();
        if (onClose) {
          setTimeout(() => onClose(), 1000);
        }
      }
    } catch (error) {
      console.error('Failed to save:', error);
      notify('Failed to save game', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = async (slotNumber) => {
    try {
      setLoading(true);
      // Restore applies the saved snapshot back to the live game state on the
      // server, then we rehydrate the local stores from the now-restored data.
      const response = await saveApi.restoreSave(slotNumber);
      if (response.success) {
        const characterId = response.data?.characterId;
        if (!characterId) {
          throw new Error('Restore did not return a character');
        }

        // Pull the restored state back into the client stores.
        await loadCharacter(characterId);
        await Promise.all([
          loadInventory(characterId),
          loadActiveQuests(characterId),
          loadAvailableQuests(characterId)
        ]);

        notify(`Game loaded from slot ${slotNumber}`, 'success');

        if (onClose) onClose();
        navigate('/game');
      }
    } catch (error) {
      console.error('Failed to load:', error);
      notify(error.message || 'Failed to load game', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (slotNumber) => {
    if (!window.confirm(`Are you sure you want to delete save slot ${slotNumber}?`)) {
      return;
    }

    try {
      const response = await saveApi.deleteSave(slotNumber);
      if (response.success) {
        notify(`Save slot ${slotNumber} deleted`, 'success');
        await loadSaveSlots();
      }
    } catch (error) {
      console.error('Failed to delete save:', error);
      notify('Failed to delete save', 'error');
    }
  };

  if (loading && saveSlots.length === 0) {
    return (
      <div className="save-load-view">
        <div className="loading">Loading save slots...</div>
      </div>
    );
  }

  return (
    <div className="save-load-view">
      <h3>{mode === 'save' ? 'Save Game' : 'Load Game'}</h3>
      <div className="save-slots">
        {[1, 2, 3, 4, 5].map(slotNumber => {
          const slot = saveSlots.find(s => s.slotNumber === slotNumber);
          return (
            <SaveSlot
              key={slotNumber}
              slotNumber={slotNumber}
              save={slot}
              mode={mode}
              onSave={handleSave}
              onLoad={handleLoad}
              onDelete={handleDelete}
              saving={saving}
            />
          );
        })}
      </div>
    </div>
  );
}

