/**
 * Quest List Component
 * Displays available quests from an NPC and allows accepting them
 */

import React, { useState, useEffect } from 'react';
import { questApi } from '../../services/api/questApi';
import { useQuestStore } from '../../state/questSlice';
import { useCharacterStore } from '../../state/characterSlice';
import MoralAlignmentBadge from './MoralAlignmentBadge';
import './QuestList.css';

const { loadActiveQuests } = useQuestStore.getState();

export default function QuestList({ npcId, npcName, onClose, onQuestAccepted }) {
  const { currentCharacter } = useCharacterStore();
  const { startQuest, loadActiveQuests } = useQuestStore();
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedQuest, setSelectedQuest] = useState(null);

  useEffect(() => {
    loadQuests();
  }, [npcId, currentCharacter?.id]);

  const loadQuests = async () => {
    if (!currentCharacter || !npcId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await questApi.getByNPC(npcId, currentCharacter.id);
      if (response.success) {
        setQuests(response.data || []);
      } else {
        setError('Failed to load quests');
      }
    } catch (err) {
      console.error('Error loading quests:', err);
      setError(err.message || 'Failed to load quests');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuest = async (questId) => {
    if (!currentCharacter) {
      alert('No character selected');
      return;
    }

    try {
      const response = await questApi.start(currentCharacter.id, questId);
      if (response.success) {
        // Use the store's startQuest to update state
        await startQuest(currentCharacter.id, questId);
        // Reload active quests to ensure they're in the store
        await loadActiveQuests(currentCharacter.id);
        alert('Quest accepted!');
        if (onQuestAccepted) {
          onQuestAccepted(response.data);
        }
        // Reload quests to update list
        loadQuests();
      } else {
        alert(response.error || 'Failed to accept quest');
      }
    } catch (err) {
      console.error('Error accepting quest:', err);
      alert(err.message || 'Failed to accept quest');
    }
  };

  const formatRewards = (rewards) => {
    if (!rewards) return 'None';
    
    const parts = [];
    if (rewards.xp) parts.push(`${rewards.xp} XP`);
    if (rewards.credits) parts.push(`${rewards.credits} credits`);
    if (rewards.reputation && Object.keys(rewards.reputation).length > 0) {
      const repParts = Object.entries(rewards.reputation).map(([faction, amount]) => 
        `${amount} ${faction.replace(/_/g, ' ')} rep`
      );
      parts.push(repParts.join(', '));
    }
    if (rewards.items && rewards.items.length > 0) {
      parts.push(`${rewards.items.length} item(s)`);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'None';
  };

  if (loading) {
    return (
      <div className="quest-list-modal">
        <div className="quest-list-content">
          <div className="quest-list-header">
            <h2>Available Quests</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <div className="quest-list-body">
            <p>Loading quests...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quest-list-modal">
        <div className="quest-list-content">
          <div className="quest-list-header">
            <h2>Available Quests</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <div className="quest-list-body">
            <p className="error-message">Error: {error}</p>
            <button onClick={loadQuests}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quest-list-modal" onClick={(e) => e.stopPropagation()}>
      <div className="quest-list-content">
        <div className="quest-list-header">
          <h2>Available Quests from {npcName}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="quest-list-body">
          {quests.length === 0 ? (
            <div className="no-quests">
              <p>No quests available from this NPC at the moment.</p>
              <p className="hint">Try talking to them or check back later!</p>
            </div>
          ) : (
            <div className="quests-container">
              {quests.map((quest) => (
                <div 
                  key={quest.id} 
                  className={`quest-item ${selectedQuest?.id === quest.id ? 'selected' : ''}`}
                  onClick={() => setSelectedQuest(quest)}
                >
                  <div className="quest-header">
                    <h3>{quest.title}</h3>
                    <div className="quest-badges">
                      <span className="quest-type-badge">{quest.questType}</span>
                      {quest.questType === 'mini' && (
                        <MoralAlignmentBadge 
                          alignment={quest.moralAlignment || quest.miniQuestData?.moralAlignment} 
                          size="small"
                        />
                      )}
                      {quest.objectives?.some(o => o.illegal) && (
                        <span className="illegal-badge" title="Illegal Activity">
                          🚨 Illegal
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="quest-description">
                    {quest.shortDescription || quest.description?.substring(0, 150) + '...'}
                  </p>
                  
                  {selectedQuest?.id === quest.id && (
                    <div className="quest-details">
                      <div className="quest-full-description">
                        <strong>Description:</strong>
                        <p>{quest.description}</p>
                      </div>
                      
                      {quest.objectives && quest.objectives.length > 0 && (
                        <div className="quest-objectives">
                          <strong>Objectives:</strong>
                          <ul>
                            {quest.objectives.map((obj, idx) => (
                              <li key={obj.id || idx}>{obj.description}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="quest-rewards">
                        <strong>Rewards:</strong>
                        <p>{formatRewards(quest.rewards)}</p>
                        {quest.questType === 'mini' && quest.miniQuestData?.relationshipBonus && (
                          <p className="relationship-bonus">
                            +{quest.miniQuestData.relationshipBonus} Relationship Bonus
                          </p>
                        )}
                      </div>
                      
                      {quest.miniQuestData?.consequences?.reputationChanges && 
                       Object.keys(quest.miniQuestData.consequences.reputationChanges).length > 0 && (
                        <div className="consequences-warning">
                          <span className="warning-icon">⚠️</span>
                          <span className="warning-text">
                            This quest will affect your reputation with factions
                          </span>
                        </div>
                      )}
                      
                      <button 
                        className="accept-quest-btn"
                        onClick={() => handleAcceptQuest(quest.id)}
                      >
                        Accept Quest
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


