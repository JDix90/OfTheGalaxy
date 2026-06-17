/**
 * Fast Travel Menu Component
 * Menu for selecting fast travel destinations
 */

import React, { useState, useEffect } from 'react';
import { useCharacterStore } from '../../state/characterSlice';
import fastTravelApi from '../../services/api/fastTravelApi';
import { characterApi } from '../../services/api/characterApi';
import { notify } from '../hud/NotificationCenter';
import './FastTravelMenu.css';

export default function FastTravelMenu({ planet, isOpen, onClose }) {
  const { currentCharacter, setCurrentCharacter } = useCharacterStore();
  const [fastTravelPoints, setFastTravelPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [traveling, setTraveling] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);

  useEffect(() => {
    if (isOpen && currentCharacter && planet) {
      loadFastTravelPoints();
    }
  }, [isOpen, currentCharacter, planet]);

  const loadFastTravelPoints = async () => {
    if (!currentCharacter || !planet) return;

    setLoading(true);
    try {
      const response = await fastTravelApi.getPoints(currentCharacter.id, planet.id);
      const points = response.data?.data || [];
      setFastTravelPoints(points);
    } catch (error) {
      console.error('Failed to load fast travel points:', error);
      notify({
        type: 'error',
        title: 'Error',
        message: 'Failed to load fast travel points'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTravel = async (point) => {
    if (!currentCharacter || !planet || traveling) return;

    setTraveling(true);
    try {
      const result = await fastTravelApi.travel(
        currentCharacter.id,
        planet.id,
        point.id || point.name
      );

      if (result.data?.success) {
        notify({
          type: 'success',
          title: 'Fast Travel',
          message: `Traveled to ${point.name}`
        });

        // Reload character to get updated location
        const charResponse = await characterApi.getById(currentCharacter.id);
        const updatedCharacter = charResponse.data || charResponse;
        setCurrentCharacter(updatedCharacter);

        onClose();
      }
    } catch (error) {
      console.error('Failed to fast travel:', error);
      notify({
        type: 'error',
        title: 'Travel Failed',
        message: error.message || 'Failed to fast travel'
      });
    } finally {
      setTraveling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fast-travel-menu-overlay" onClick={onClose}>
      <div className="fast-travel-menu" onClick={(e) => e.stopPropagation()}>
        <div className="fast-travel-header">
          <h2>Fast Travel</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="fast-travel-content">
          {loading ? (
            <div className="loading">Loading fast travel points...</div>
          ) : fastTravelPoints.length === 0 ? (
            <div className="no-points">
              <p>No fast travel points discovered yet.</p>
              <p className="hint">Discover spaceports and other locations to unlock fast travel.</p>
            </div>
          ) : (
            <div className="points-list">
              {fastTravelPoints.map((point, index) => {
                const cost = 50 + (currentCharacter?.level || 1) * 5; // Calculate cost
                return (
                  <div
                    key={index}
                    className={`point-item ${selectedPoint === point ? 'selected' : ''}`}
                    onClick={() => setSelectedPoint(point)}
                  >
                    <div className="point-info">
                      <div className="point-name">{point.name}</div>
                      {point.description && (
                        <div className="point-description">{point.description}</div>
                      )}
                    </div>
                    <div className="point-actions">
                      <div className="point-cost">{cost} credits</div>
                      <button
                        className="travel-btn"
                        onClick={() => handleTravel(point)}
                        disabled={traveling || (currentCharacter?.credits || 0) < cost}
                      >
                        {traveling ? 'Traveling...' : 'Travel'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {currentCharacter && (
          <div className="fast-travel-footer">
            <div className="credits-display">
              Credits: {currentCharacter.credits}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


