/**
 * Quest Log Overlay Component
 * Modal overlay for quest log management
 */

import React, { useEffect, useState } from 'react';
import { useQuestStore } from '../../state/questSlice';
import { useCharacterStore } from '../../state/characterSlice';
import './QuestLogOverlay.css';

export default function QuestLogOverlay({ isOpen, onClose }) {
  const { currentCharacter } = useCharacterStore();
  const {
    activeQuests,
    completedQuests,
    loadActiveQuests,
    loadCompletedQuests,
    abandonQuest,
    isLoading,
    error
  } = useQuestStore();

  const [activeTab, setActiveTab] = useState('active');
  const [selectedQuest, setSelectedQuest] = useState(null);

  useEffect(() => {
    if (isOpen && currentCharacter) {
      const characterId = currentCharacter.id || currentCharacter.toJSON?.()?.id;
      if (characterId) {
        loadActiveQuests(characterId).catch(err => {
          console.error('Failed to load active quests:', err);
        });
        loadCompletedQuests(characterId).catch(err => {
          console.error('Failed to load completed quests:', err);
        });
      }
    }
  }, [isOpen, currentCharacter, loadActiveQuests, loadCompletedQuests]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAbandonQuest = async (questId) => {
    if (confirm('Are you sure you want to abandon this quest?')) {
      try {
        const characterId = currentCharacter?.id || currentCharacter?.toJSON?.()?.id;
        if (characterId) {
          await abandonQuest(characterId, questId);
          setSelectedQuest(null);
        }
      } catch (error) {
        console.error('Failed to abandon quest:', error);
        alert('Failed to abandon quest: ' + error.message);
      }
    }
  };

  const renderQuestList = (quests) => {
    if (quests.length === 0) {
      return (
        <div className="empty-state">
          <p>No {activeTab} quests</p>
        </div>
      );
    }

    return (
      <div className="quest-list">
        {quests.map(({ quest, progress }) => (
          <div
            key={quest.id}
            className={`quest-item ${selectedQuest?.quest?.id === quest.id ? 'selected' : ''}`}
            onClick={() => setSelectedQuest({ quest, progress })}
          >
            <div className="quest-header">
              <h4>{quest.title}</h4>
              {quest.factionId && (
                <span className="quest-faction">{quest.factionId}</span>
              )}
            </div>
            <p className="quest-short-desc">{quest.shortDescription}</p>
            {progress && (
              <div className="quest-progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${(Object.keys(progress.objectivesCompleted || {}).length / quest.objectives.length) * 100}%`
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderQuestDetails = () => {
    if (!selectedQuest) {
      return (
        <div className="quest-details-empty">
          <p>Select a quest to view details</p>
        </div>
      );
    }

    const { quest, progress } = selectedQuest;

    return (
      <div className="quest-details">
        <h2>{quest.title}</h2>
        
        <div className="quest-meta">
          {quest.factionId && (
            <span className="meta-item">
              <strong>Faction:</strong> {quest.factionId}
            </span>
          )}
          {quest.difficulty && (
            <span className="meta-item">
              <strong>Difficulty:</strong> {quest.difficulty}
            </span>
          )}
          {quest.estimatedTime && (
            <span className="meta-item">
              <strong>Est. Time:</strong> {quest.estimatedTime} min
            </span>
          )}
        </div>

        <div className="quest-description">
          <p>{quest.description}</p>
        </div>

        <div className="quest-objectives">
          <h3>Objectives</h3>
          {quest.objectives.map((objective) => {
            const isComplete = progress?.objectivesCompleted?.[objective.id];
            const currentProgress = progress?.objectiveProgress?.[objective.id] || 0;
            const target = objective.count || 1;
            const showProgress = objective.count && objective.count > 1;
            
            return (
              <div key={objective.id} className={`objective ${isComplete ? 'completed' : ''}`}>
                <span className="objective-checkbox">
                  {isComplete ? '✓' : '○'}
                </span>
                <span className="objective-text">
                  {objective.description}
                  {showProgress && !isComplete && (
                    <span className="objective-progress"> ({currentProgress}/{target})</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {quest.rewards && (
          <div className="quest-rewards">
            <h3>Rewards</h3>
            <ul>
              {quest.rewards.xp && <li>XP: {quest.rewards.xp}</li>}
              {quest.rewards.credits && <li>Credits: {quest.rewards.credits}</li>}
              {quest.rewards.items && quest.rewards.items.length > 0 && (
                <li>Items: {quest.rewards.items.join(', ')}</li>
              )}
            </ul>
          </div>
        )}

        {activeTab === 'active' && (
          <div className="quest-actions">
            <button
              onClick={() => handleAbandonQuest(quest.id)}
              className="btn-danger"
            >
              Abandon Quest
            </button>
          </div>
        )}
      </div>
    );
  };

  const currentQuests = activeTab === 'active' ? activeQuests : completedQuests;

  return (
    <div className="quest-log-overlay" onClick={onClose}>
      <div className="quest-log-overlay-content" onClick={(e) => e.stopPropagation()}>
        <div className="quest-log-overlay-header">
          <div className="header-info">
            <h2>Quest Log</h2>
            <div className="quest-stats">
              <span>Active: {activeQuests.length}</span>
              <span>Completed: {completedQuests.length}</span>
            </div>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="quest-log-overlay-tabs">
          <button
            className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('active');
              setSelectedQuest(null);
            }}
          >
            📜 Active ({activeQuests.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('completed');
              setSelectedQuest(null);
            }}
          >
            ✓ Completed ({completedQuests.length})
          </button>
        </div>

        {isLoading ? (
          <div className="quest-log-loading">Loading quests...</div>
        ) : (
          <div className="quest-log-overlay-body">
            <div className="quest-log-sidebar">
              {error && (
                <div className="error-message">
                  Error: {error}
                </div>
              )}
              {renderQuestList(currentQuests)}
            </div>

            <div className="quest-log-main">
              {renderQuestDetails()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

