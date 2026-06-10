/**
 * Stats Bar
 * Displays player health, stamina, credits, and level
 */

import React, { useState, useEffect, useRef } from 'react';
import './StatsBar.css';
import { useCharacterStore } from '../../state/characterSlice';
import { apiClient } from '../../services/api/client';
import { getActiveStaminaStatusEffects, getStaminaStatusColor, getStaminaWarning } from '../../utils/staminaStatusEffects';
import { addTutorialTarget, TUTORIAL_TARGETS } from '../../services/tutorialTargetRegistry';

export default function StatsBar({ character, onOpenInventory, onOpenCharacterSheet }) {
  const [regenInfo, setRegenInfo] = useState(null);
  const [healingAnimation, setHealingAnimation] = useState(false);
  const [staminaAnimation, setStaminaAnimation] = useState(false);
  const [healingAmount, setHealingAmount] = useState(0);
  const [staminaAmount, setStaminaAmount] = useState(0);
  const previousHealthRef = useRef(character?.currentHealth || 0);
  const previousStaminaRef = useRef(character?.currentStamina || 0);
  const { currentCharacter } = useCharacterStore();
  const healthStaminaRef = useRef(null);
  const creditsLevelXpRef = useRef(null);
  const levelDisplayRef = useRef(null);

  // Detect health/stamina changes and trigger animations
  useEffect(() => {
    if (!character) {
      previousHealthRef.current = 0;
      previousStaminaRef.current = 0;
      return;
    }

    const currentHealth = character.currentHealth || 0;
    const currentStamina = character.currentStamina || 0;
    const previousHealth = previousHealthRef.current;
    const previousStamina = previousStaminaRef.current;

    // Check if health increased (healing)
    if (currentHealth > previousHealth && previousHealth > 0) {
      const amount = currentHealth - previousHealth;
      setHealingAmount(amount);
      setHealingAnimation(true);
      setTimeout(() => setHealingAnimation(false), 1500); // Animation duration
    }

    // Check if stamina increased (restoration)
    if (currentStamina > previousStamina && previousStamina > 0) {
      const amount = currentStamina - previousStamina;
      setStaminaAmount(amount);
      setStaminaAnimation(true);
      setTimeout(() => setStaminaAnimation(false), 1500); // Animation duration
    }

    // Update previous values
    previousHealthRef.current = currentHealth;
    previousStaminaRef.current = currentStamina;
  }, [character?.currentHealth, character?.currentStamina]);

  useEffect(() => {
    if (!character?.id) return;

    const fetchRegenInfo = async () => {
      try {
        const data = await apiClient.get(`/stamina-regen/${character.id}/status`);
        setRegenInfo(data.data);
      } catch (error) {
        // Silently fail - regeneration info is not critical
        console.debug('Failed to fetch stamina regen info:', error.message);
      }
    };

    fetchRegenInfo();
    const interval = setInterval(fetchRegenInfo, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [character?.id]);

  // Add tutorial targets
  useEffect(() => {
    if (healthStaminaRef.current) {
      addTutorialTarget(healthStaminaRef.current, TUTORIAL_TARGETS.HUD_HEALTH_STAMINA);
    }
    if (creditsLevelXpRef.current) {
      addTutorialTarget(creditsLevelXpRef.current, TUTORIAL_TARGETS.HUD_CREDITS_LEVEL_XP);
    }
    if (levelDisplayRef.current) {
      addTutorialTarget(levelDisplayRef.current, TUTORIAL_TARGETS.HUD_LEVEL_DISPLAY);
    }
  }, [character]);

  if (!character) return null;

  const healthPercent = character.maxHealth > 0 
    ? (character.currentHealth / character.maxHealth) * 100 
    : 0;
  
  const staminaPercent = character.maxStamina > 0 
    ? (character.currentStamina / character.maxStamina) * 100 
    : 0;

  // Get active stamina status effects
  const statusEffects = getActiveStaminaStatusEffects(character);
  const staminaStatusColor = getStaminaStatusColor(staminaPercent);
  const staminaWarning = getStaminaWarning(staminaPercent);

  const calculateTimeToFull = (current, max, regenRate) => {
    if (!regenRate || regenRate <= 0 || current >= max) return null;
    const remaining = max - current;
    const minutes = remaining / regenRate;
    return minutes;
  };

  const timeToFull = regenInfo?.canRegenerate 
    ? calculateTimeToFull(character.currentStamina, character.maxStamina, regenInfo.regenRate)
    : null;

  return (
    <div className="stats-bar">
      <div className="stats-left">
        <div className="stat-group" ref={healthStaminaRef}>
          <div className="stat-item health">
            <div className="stat-label">Health</div>
            <div className="stat-bar-container">
              <div 
                className={`stat-bar-fill health-fill ${healingAnimation ? 'healing' : ''}`}
                style={{ width: `${healthPercent}%` }}
              />
              <div className="stat-bar-text">
                {character.currentHealth || 0} / {character.maxHealth || 0}
              </div>
              {healingAnimation && healingAmount > 0 && (
                <div className="healing-effect">
                  <span className="healing-text">+{healingAmount}</span>
                </div>
              )}
            </div>
          </div>
          
          <div 
            className={`stat-item stamina stamina-${staminaStatusColor}`}
            title={
              staminaWarning || 
              (regenInfo?.canRegenerate
                ? `Regenerating ${regenInfo.regenRate}/min. ${timeToFull ? `Full in ${timeToFull.toFixed(1)} min.` : ''}`
                : regenInfo?.inCombat
                ? 'Stamina regeneration paused during combat'
                : 'Stamina')
            }
          >
            <div className="stat-label">
              Stamina
              {statusEffects.length > 0 && (
                <span className="status-effect-badge" title={statusEffects.map(e => e.description).join('\n')}>
                  {statusEffects[0].icon} {statusEffects[0].name}
                </span>
              )}
              {regenInfo?.canRegenerate && !statusEffects.some(e => e.id === 'exhausted') && (
                <span className="regen-indicator" title={`Regenerating ${regenInfo.regenRate}/min`}>
                  ↻ {regenInfo.regenRate}/min
                </span>
              )}
            </div>
            <div className="stat-bar-container">
              <div 
                className={`stat-bar-fill stamina-fill stamina-${staminaStatusColor} ${regenInfo?.canRegenerate && !statusEffects.some(e => e.id === 'exhausted') ? 'regenerating' : ''} ${staminaAnimation ? 'restoring' : ''}`}
                style={{ width: `${staminaPercent}%` }}
              />
              <div className="stat-bar-text">
                {character.currentStamina || 0} / {character.maxStamina || 0}
                {staminaPercent < 25 && (
                  <span className="stamina-percent"> ({staminaPercent.toFixed(0)}%)</span>
                )}
              </div>
              {staminaAnimation && staminaAmount > 0 && (
                <div className="healing-effect stamina-healing">
                  <span className="healing-text">+{staminaAmount}</span>
                </div>
              )}
            </div>
            {staminaWarning && (
              <div className="stamina-warning">
                {staminaWarning}
              </div>
            )}
            {timeToFull && regenInfo?.canRegenerate && !statusEffects.some(e => e.id === 'exhausted') && (
              <div className="regen-timer">
                Full in {timeToFull.toFixed(1)} min
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="stats-right" ref={creditsLevelXpRef}>
        <div 
          className={`stat-item credits ${onOpenInventory ? 'clickable' : ''}`}
          onClick={onOpenInventory}
          title={onOpenInventory ? "Click to open Inventory" : undefined}
        >
          <span className="stat-icon">💰</span>
          <span className="stat-value">{character.credits || 0}</span>
        </div>
        
        <div 
          ref={levelDisplayRef}
          className={`stat-item level ${onOpenCharacterSheet ? 'clickable' : ''}`}
          onClick={onOpenCharacterSheet}
          title={onOpenCharacterSheet ? "Click to open Character Sheet" : undefined}
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


