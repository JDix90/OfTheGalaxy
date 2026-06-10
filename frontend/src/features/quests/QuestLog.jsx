/**
 * QuestLog Component
 * Display and manage active quests
 */

import React, { useEffect, useState } from 'react';
import { useQuestStore } from '../../state/questSlice';
import { useCharacterStore } from '../../state/characterSlice';
import './QuestLog.css';

export default function QuestLog() {
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
    if (currentCharacter) {
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
  }, [currentCharacter, loadActiveQuests, loadCompletedQuests]);

  if (!currentCharacter) {
    return (
      <div className="quest-log">
        <div className="quest-log-header">
          <h1>Quest Log</h1>
        </div>
        <div className="quest-log-content">
          <div className="empty-state">
            <p>Please select a character to view quests.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleAbandonQuest = async (questId) => {
    if (confirm('Are you sure you want to abandon this quest?')) {
      try {
        const characterId = currentCharacter.id || currentCharacter.toJSON?.()?.id;
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
            className={`quest-item ${selectedQuest?.id === quest.id ? 'selected' : ''}`}
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
                    width: `${(Object.keys(progress.objectivesCompleted).length / quest.objectives.length) * 100}%`
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

  return (
    <div className="quest-log">
      <div className="quest-log-header">
        <h1>Quest Log</h1>
        <div className="quest-tabs">
          <button
            className={`tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Active ({activeQuests.length})
          </button>
          <button
            className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed ({completedQuests.length})
          </button>
        </div>
      </div>

      <div className="quest-log-content">
        <div className="quest-log-sidebar">
          {error && (
            <div className="error-message" style={{ color: 'var(--danger-color)', padding: '1rem', marginBottom: '1rem' }}>
              Error: {error}
            </div>
          )}
          {isLoading ? (
            <div className="loading">Loading quests...</div>
          ) : (
            renderQuestList(activeTab === 'active' ? activeQuests : completedQuests)
          )}
        </div>

        <div className="quest-log-main">
          {renderQuestDetails()}
        </div>
      </div>
    </div>
  );
}
