/**
 * Quest Tracker
 * Displays active quests and current objectives
 */

import React, { useState, useEffect, useRef } from 'react';
import { addTutorialTarget, TUTORIAL_TARGETS } from '../../services/tutorialTargetRegistry';
import './QuestTracker.css';

export default function QuestTracker({ quests = [] }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const trackerRef = useRef(null);

  // Add tutorial target
  useEffect(() => {
    if (trackerRef.current) {
      addTutorialTarget(trackerRef.current, TUTORIAL_TARGETS.HUD_QUEST_TRACKER);
    }
  }, []);

  if (!isVisible) {
    return (
      <button 
        className="quest-tracker-toggle"
        onClick={() => setIsVisible(true)}
        title="Show Quest Tracker (J)"
      >
        📜
      </button>
    );
  }

  // Limit to 3-5 most recent/important quests
  const displayedQuests = quests.slice(0, 5);

  const handleQuestClick = () => {
    // Dispatch custom event to open HUD quest log overlay instead of navigating
    window.dispatchEvent(new CustomEvent('hud:openQuestLog'));
  };

  return (
    <div ref={trackerRef} className={`quest-tracker ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="quest-tracker-header">
        <span className="quest-tracker-title">Active Quests</span>
        <div className="quest-tracker-controls">
          <button 
            className="quest-tracker-button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '+' : '−'}
          </button>
          <button 
            className="quest-tracker-button"
            onClick={() => setIsVisible(false)}
            title="Hide Quest Tracker (J)"
          >
            ×
          </button>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="quest-tracker-content">
          {displayedQuests.length > 0 ? (
            <div className="quest-list">
              {displayedQuests.map((questData, index) => {
                const quest = questData.quest || questData;
                const progress = questData.progress || {};
                const objectives = quest.objectives || [];
                const completedObjectives = progress.objectivesCompleted || {};
                
                // Find current objective (first incomplete)
                const currentObjective = objectives.find(obj => !completedObjectives[obj.id]);
                
                // Use a unique key combining quest ID and index to prevent duplicate key warnings
                const uniqueKey = quest.id ? `${quest.id}_${index}` : `quest_${index}`;
                
                return (
                  <div 
                    key={uniqueKey} 
                    className="quest-item"
                    onClick={handleQuestClick}
                    title="Click to open Quest Log"
                  >
                    <div className="quest-item-header">
                      <span className="quest-title">{quest.title || 'Untitled Quest'}</span>
                      <span className="quest-type">{quest.questType || 'quest'}</span>
                    </div>
                    {currentObjective && (
                      <div className="quest-objective">
                        <span className="objective-icon">→</span>
                        <span className="objective-text">{currentObjective.description || 'Complete objective'}</span>
                      </div>
                    )}
                    {!currentObjective && objectives.length > 0 && (
                      <div className="quest-objective completed">
                        <span className="objective-icon">✓</span>
                        <span className="objective-text">All objectives complete</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-quests">
              <p>No active quests</p>
              <button 
                className="view-quests-button"
                onClick={handleQuestClick}
              >
                View Quest Log
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


