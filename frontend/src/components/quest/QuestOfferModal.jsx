/**
 * Quest Offer Modal
 * Displays quest details when an NPC offers a quest
 */

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { questApi } from '../../services/api/questApi';
import { useQuestStore } from '../../state/questSlice';
import { useCharacterStore } from '../../state/characterSlice';
import { addTutorialTarget, TUTORIAL_TARGETS } from '../../services/tutorialTargetRegistry';
import { tutorialEventBus, TUTORIAL_EVENTS } from '../../services/tutorialEventBus';
import MoralAlignmentBadge from './MoralAlignmentBadge';
import './QuestOfferModal.css';

export default function QuestOfferModal({ isOpen, onClose, questId, npcName, onQuestAccepted }) {
  const [quest, setQuest] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [accepting, setAccepting] = React.useState(false);
  const { currentCharacter } = useCharacterStore();
  const { startQuest, loadActiveQuests } = useQuestStore();
  const modalRef = useRef(null);
  const acceptButtonRef = useRef(null);
  const declineButtonRef = useRef(null);

  // Add tutorial targets
  useEffect(() => {
    if (modalRef.current) {
      addTutorialTarget(modalRef.current, TUTORIAL_TARGETS.QUEST_OFFER_MODAL);
    }
    if (acceptButtonRef.current) {
      addTutorialTarget(acceptButtonRef.current, TUTORIAL_TARGETS.QUEST_ACCEPT_BUTTON);
    }
    if (declineButtonRef.current) {
      addTutorialTarget(declineButtonRef.current, TUTORIAL_TARGETS.QUEST_DECLINE_BUTTON);
    }
  }, [isOpen, quest]);

  React.useEffect(() => {
    if (isOpen && questId) {
      loadQuestDetails();
    }
  }, [isOpen, questId]);

  const loadQuestDetails = async () => {
    if (!questId) {
      console.warn('[QuestOfferModal] No questId provided');
      return;
    }
    
    console.log('[QuestOfferModal] Loading quest details for questId:', questId);
    setLoading(true);
    try {
      // Include characterId for character-specific quest customization (e.g., tutorial quests)
      const characterId = currentCharacter?.id;
      const response = await questApi.getById(questId, characterId);
      console.log('[QuestOfferModal] Quest API response:', response);
      
      if (response.success && response.data) {
        console.log('[QuestOfferModal] Quest loaded successfully:', response.data);
        setQuest(response.data);
      } else {
        console.error('[QuestOfferModal] Failed to load quest details:', response);
        alert(`Failed to load quest details: ${response.error || 'Unknown error'}`);
        onClose();
      }
    } catch (error) {
      console.error('[QuestOfferModal] Error loading quest details:', error);
      alert(`Error loading quest: ${error.message || 'Unknown error'}`);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!quest || !currentCharacter) return;

    setAccepting(true);
    try {
      const response = await questApi.start(currentCharacter.id, quest.id);
      if (response.success) {
        await startQuest(currentCharacter.id, quest.id);
        await loadActiveQuests(currentCharacter.id);
        
        // Emit tutorial event for quest accepted
        tutorialEventBus.emit(TUTORIAL_EVENTS.QUEST_ACCEPTED, {
          questId: quest.id,
          questTitle: quest.title,
          characterId: currentCharacter.id
        });
        
        if (onQuestAccepted) {
          onQuestAccepted(quest);
        }
        onClose();
      } else {
        alert(response.error || 'Failed to accept quest');
      }
    } catch (error) {
      console.error('Error accepting quest:', error);
      alert(error.message || 'Failed to accept quest');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = () => {
    onClose();
  };

  console.log('[QuestOfferModal] Render check:', { isOpen, questId, loading, quest: !!quest });
  
  if (!isOpen) {
    console.log('[QuestOfferModal] Modal not open, returning null');
    return null;
  }

  if (loading) {
    console.log('[QuestOfferModal] Loading quest details...');
    return createPortal(
      <div className="quest-offer-modal-overlay" onClick={onClose}>
        <div className="quest-offer-modal" onClick={(e) => e.stopPropagation()}>
          <div className="quest-offer-loading">Loading quest details...</div>
        </div>
      </div>,
      document.body
    );
  }

  if (!quest) {
    return null;
  }

  const dangerLevel = quest.dangerLevel || 1;
  const dangerColor = dangerLevel <= 3 ? '#22c55e' : dangerLevel <= 6 ? '#fbbf24' : '#ef4444';
  const dangerLabel = dangerLevel <= 3 ? 'Low' : dangerLevel <= 6 ? 'Moderate' : 'High';

  return createPortal(
    <div className="quest-offer-modal-overlay" onClick={onClose}>
      <div ref={modalRef} className="quest-offer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="quest-offer-header">
          <h2>Quest Offered</h2>
          <button className="quest-offer-close" onClick={onClose}>×</button>
        </div>

        <div className="quest-offer-content">
          <div className="quest-offer-title-section">
            <h3>{quest.title}</h3>
            <div className="quest-offer-badges">
              {quest.questType && (
                <span className="quest-type-badge">{quest.questType}</span>
              )}
              {quest.moralAlignment && (
                <MoralAlignmentBadge alignment={quest.moralAlignment} />
              )}
            </div>
          </div>

          {quest.description && (
            <div className="quest-offer-description">
              <strong>Description:</strong>
              <p>{quest.description}</p>
            </div>
          )}

          {quest.shortDescription && quest.shortDescription !== quest.description && (
            <div className="quest-offer-short-description">
              <p>{quest.shortDescription}</p>
            </div>
          )}

          {quest.objectives && quest.objectives.length > 0 && (
            <div className="quest-offer-objectives">
              <strong>Objectives:</strong>
              <ul>
                {quest.objectives.map((objective, index) => {
                  // Check if this is a tutorial quest and if move/talk objectives should be marked as completed
                  const isTutorialQuest = quest.questType === 'tutorial' || quest.id === 'tutorial_001_dockside_initiation';
                  const isPreCompleted = isTutorialQuest && (objective.id === 'tutorial_move' || objective.id === 'tutorial_talk');
                  
                  return (
                    <li 
                      key={objective.id || index}
                      className={isPreCompleted ? 'objective-completed' : ''}
                    >
                      {isPreCompleted && <span className="objective-check">✓</span>}
                      {objective.description || objective.type}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="quest-offer-danger">
            <strong>Danger Level:</strong>
            <div className="danger-level-display">
              <span 
                className="danger-level-badge"
                style={{ backgroundColor: dangerColor }}
              >
                {dangerLabel} ({dangerLevel}/10)
              </span>
            </div>
          </div>

          {quest.rewards && (
            <div className="quest-offer-rewards">
              <strong>Rewards:</strong>
              <div className="rewards-list">
                {quest.rewards.xp > 0 && (
                  <div className="reward-item">
                    <span className="reward-icon">⭐</span>
                    <span>{quest.rewards.xp} XP</span>
                  </div>
                )}
                {quest.rewards.credits > 0 && (
                  <div className="reward-item">
                    <span className="reward-icon">💰</span>
                    <span>{quest.rewards.credits} Credits</span>
                  </div>
                )}
                {quest.rewards.reputation && Object.keys(quest.rewards.reputation).length > 0 && (
                  <div className="reward-item">
                    <span className="reward-icon">🤝</span>
                    <span>Reputation: {Object.entries(quest.rewards.reputation).map(([faction, amount]) => 
                      `${faction.replace(/_/g, ' ')} +${amount}`
                    ).join(', ')}</span>
                  </div>
                )}
                {quest.rewards.items && quest.rewards.items.length > 0 && (
                  <div className="reward-item">
                    <span className="reward-icon">🎁</span>
                    <span>Items: {quest.rewards.items.length} item(s)</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {quest.miniQuestData?.relationshipBonus && (
            <div className="quest-offer-relationship-bonus">
              <strong>Relationship Bonus:</strong>
              <span>+{quest.miniQuestData.relationshipBonus} with {npcName || 'Quest Giver'}</span>
            </div>
          )}

          {quest.miniQuestData?.consequences?.reputationChanges && 
           Object.keys(quest.miniQuestData.consequences.reputationChanges).length > 0 && (
            <div className="quest-offer-consequences">
              <strong>Potential Consequences:</strong>
              <ul>
                {Object.entries(quest.miniQuestData.consequences.reputationChanges).map(([faction, change]) => (
                  <li key={faction} className={change < 0 ? 'negative' : 'positive'}>
                    {change > 0 ? '+' : ''}{change} reputation with {faction.replace(/_/g, ' ')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {quest.moralAlignment === 'criminal' && (
            <div className="quest-offer-warning">
              ⚠️ This quest involves illegal activities and may have severe consequences.
            </div>
          )}
        </div>

        <div className="quest-offer-actions">
          <button 
            ref={declineButtonRef}
            className="btn-decline"
            onClick={handleDecline}
            disabled={accepting}
          >
            Decline
          </button>
          <button 
            ref={acceptButtonRef}
            className="btn-accept"
            onClick={handleAccept}
            disabled={accepting}
          >
            {accepting ? 'Accepting...' : 'Accept Quest'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

