/**
 * NPC Details Modal Component
 * Displays Phase 1 & Phase 2 NPC enhancement information: Personality, Faction, Emotional State, Memories, Motivations, and Trust
 */

import React from 'react';
import { createPortal } from 'react-dom';
import './NPCDetailsModal.css';

// Faction display names
const getFactionDisplayName = (factionId) => {
  if (!factionId) return 'Unaffiliated';
  
  const displayNames = {
    'old_concord': 'Old Concord',
    'iron_dominion': 'Iron Dominion',
    'free_worlds': 'Free Worlds',
    'concord': 'Concord',
    'ascendancy': 'Ascendancy',
    'uprising': 'Uprising',
    'keeper_order': 'Keeper Order',
    'hollow': 'Hollow',
    'ironkin': 'Ironkin',
    'vorr': 'Vorr',
    'vorr_cartel': 'Vorr Cartel',
    'umbra': 'Umbra',
    'scarlet_tide': 'Scarlet Tide',
    'independent': 'Independent',
    'neutral': 'Neutral',
    'smugglers': 'Smugglers',
    'the_tally': 'Bounty Hunters',
    'commerce_league': 'Commerce League',
    'secession': 'Secessionists',
    'vorne_ascendancy': 'Vorne Ascendancy',
    'hesperan_consortium': 'Hesperan Consortium'
  };

  return displayNames[factionId] || factionId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Get personality trait description
const getPersonalityTraitLabel = (trait, value) => {
  const labels = {
    openness: value > 70 ? 'Curious & Open' : value < 30 ? 'Traditional & Resistant' : 'Balanced',
    extraversion: value > 70 ? 'Outgoing & Sociable' : value < 30 ? 'Reserved & Introverted' : 'Balanced',
    agreeableness: value > 70 ? 'Warm & Cooperative' : value < 30 ? 'Competitive & Skeptical' : 'Balanced',
    conscientiousness: value > 70 ? 'Organized & Reliable' : value < 30 ? 'Spontaneous & Flexible' : 'Balanced',
    neuroticism: value > 70 ? 'Anxious & Reactive' : value < 30 ? 'Calm & Stable' : 'Balanced',
    forceAlignment: value > 70 ? 'Veil-Aligned' : value < 30 ? 'Veil-Distant' : 'Neutral',
    authorityRespect: value > 70 ? 'Respectful of Authority' : value < 30 ? 'Rebellious' : 'Neutral',
    riskTolerance: value > 70 ? 'Bold & Risk-Taking' : value < 30 ? 'Cautious & Risk-Averse' : 'Balanced',
    directness: value > 70 ? 'Direct & Straightforward' : value < 30 ? 'Subtle & Indirect' : 'Balanced'
  };
  return labels[trait] || 'Unknown';
};

// Get emotion display name
const getEmotionDisplayName = (emotion) => {
  const emotions = {
    neutral: 'Neutral',
    happy: 'Happy',
    satisfied: 'Satisfied',
    grateful: 'Grateful',
    proud: 'Proud',
    angry: 'Angry',
    betrayed: 'Betrayed',
    sad: 'Sad',
    fearful: 'Fearful',
    surprised: 'Surprised',
    offended: 'Offended',
    appreciative: 'Appreciative'
  };
  return emotions[emotion] || emotion.charAt(0).toUpperCase() + emotion.slice(1);
};

// Get emotion color
const getEmotionColor = (emotion, intensity) => {
  const colors = {
    neutral: '#6b7280',
    happy: '#10b981',
    satisfied: '#34d399',
    grateful: '#22c55e',
    proud: '#fbbf24',
    angry: '#ef4444',
    betrayed: '#dc2626',
    sad: '#3b82f6',
    fearful: '#8b5cf6',
    surprised: '#f59e0b',
    offended: '#f97316',
    appreciative: '#14b8a6'
  };
  return colors[emotion] || '#6b7280';
};

// Format memory event type
const formatMemoryEvent = (eventType) => {
  const events = {
    quest_completed: 'Quest Completed',
    quest_failed: 'Quest Failed',
    player_helped: 'You Helped Them',
    player_betrayed: 'You Betrayed Them',
    player_gift: 'You Gave a Gift',
    player_respect: 'You Showed Respect',
    player_insult: 'You Insulted Them',
    conversation_positive: 'Positive Conversation',
    conversation_negative: 'Negative Conversation',
    trade_completed: 'Trade Completed',
    trade_failed: 'Trade Failed'
  };
  return events[eventType] || eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default function NPCDetailsModal({ isOpen, onClose, npc, characterId }) {
  if (!isOpen || !npc) return null;

  const personalityProfile = npc.personalityProfile || {};
  const emotionalState = npc.emotionalState || {};
  const memory = npc.memory || {};
  const motivations = npc.motivations || {};
  const trustSystem = npc.trustSystem || {};
  
  // Get significant memories for this character
  const significantMemories = memory.episodes?.filter(ep => 
    ep.participants?.includes(characterId)
  ).sort((a, b) => (b.significance || 0) - (a.significance || 0)).slice(0, 5) || [];

  // Get player knowledge
  const playerKnowledge = memory.playerKnowledge || {};
  const knownTraits = playerKnowledge.traits || [];
  const knownFacts = playerKnowledge.knownFacts || [];

  // Get trust tier
  const getTrustTier = (trustLevel) => {
    if (trustLevel < 20) return { name: 'Distrustful', color: '#ef4444' };
    if (trustLevel < 40) return { name: 'Cautious', color: '#f59e0b' };
    if (trustLevel < 60) return { name: 'Neutral', color: '#6b7280' };
    if (trustLevel < 80) return { name: 'Trusting', color: '#10b981' };
    return { name: 'Very Trusting', color: '#22c55e' };
  };

  const trustLevel = trustSystem.trustLevel || 50;
  const trustTier = getTrustTier(trustLevel);

  // Use portal to render modal at document body level, not constrained by parent containers
  const modalContent = (
    <div className="npc-details-modal-overlay" onClick={onClose}>
      <div className="npc-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="npc-details-modal-header">
          <div className="npc-details-header-content">
            <div className="npc-details-avatar">
              <span>{npc.name.charAt(0)}</span>
            </div>
            <div className="npc-details-header-info">
              <h2>{npc.name}</h2>
              <div className="npc-details-meta">
                {npc.occupation && <span className="npc-meta-badge">{npc.occupation}</span>}
                {npc.species && <span className="npc-meta-badge">{npc.species}</span>}
                {npc.factionId && (
                  <span className="npc-meta-badge faction-badge">
                    {getFactionDisplayName(npc.factionId)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button className="npc-details-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="npc-details-modal-content">
          {/* Personality Section */}
          <div className="npc-details-section">
            <h3 className="npc-details-section-title">
              <span className="section-icon">🧠</span>
              Personality Profile
            </h3>
            <div className="personality-traits-grid">
              {Object.entries(personalityProfile).filter(([key]) => 
                !['currentMood', 'stressLevel', 'fatigueLevel'].includes(key)
              ).map(([trait, value]) => (
                <div key={trait} className="personality-trait-item">
                  <div className="trait-header">
                    <span className="trait-name">{trait.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="trait-value">{Math.round(value)}/100</span>
                  </div>
                  <div className="trait-bar">
                    <div 
                      className="trait-fill" 
                      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                    />
                  </div>
                  <div className="trait-label">{getPersonalityTraitLabel(trait, value)}</div>
                </div>
              ))}
            </div>
            {Object.keys(personalityProfile).length === 0 && (
              <p className="no-data">No personality profile available</p>
            )}
          </div>

          {/* Faction Section */}
          {npc.factionId && (
            <div className="npc-details-section">
              <h3 className="npc-details-section-title">
                <span className="section-icon">🏛️</span>
                Faction Affiliation
              </h3>
              <div className="faction-info">
                <div className="faction-name">{getFactionDisplayName(npc.factionId)}</div>
                {npc.factionId && (
                  <div className="faction-description">
                    This NPC is affiliated with the {getFactionDisplayName(npc.factionId)}.
                    Their dialogue and behavior are influenced by their faction's values and beliefs.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Emotional State Section */}
          <div className="npc-details-section">
            <h3 className="npc-details-section-title">
              <span className="section-icon">😊</span>
              Emotional State
            </h3>
            {emotionalState.primaryEmotion ? (
              <div className="emotional-state-info">
                <div className="emotion-display">
                  <div 
                    className="emotion-badge"
                    style={{ 
                      backgroundColor: getEmotionColor(emotionalState.primaryEmotion, emotionalState.emotionIntensity),
                      opacity: 0.2,
                      borderColor: getEmotionColor(emotionalState.primaryEmotion, emotionalState.emotionIntensity)
                    }}
                  >
                    <span className="emotion-name">
                      {getEmotionDisplayName(emotionalState.primaryEmotion)}
                    </span>
                    <span className="emotion-intensity">
                      {Math.round((emotionalState.emotionIntensity || 0) * 100)}% intensity
                    </span>
                  </div>
                </div>
                {emotionalState.recentEvents && emotionalState.recentEvents.length > 0 && (
                  <div className="recent-emotional-events">
                    <h4>Recent Emotional Events</h4>
                    <ul>
                      {emotionalState.recentEvents.slice(-3).map((event, idx) => (
                        <li key={idx}>
                          <span className="event-type">{formatMemoryEvent(event.type)}</span>
                          <span className="event-time">
                            {new Date(event.timestamp).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="no-data">Emotional state: Neutral</p>
            )}
          </div>

          {/* Memory Section */}
          <div className="npc-details-section">
            <h3 className="npc-details-section-title">
              <span className="section-icon">💭</span>
              Shared Memories
            </h3>
            {significantMemories.length > 0 ? (
              <div className="memories-list">
                {significantMemories.map((memory, idx) => (
                  <div key={idx} className="memory-item">
                    <div className="memory-header">
                      <span className="memory-event">{formatMemoryEvent(memory.eventType)}</span>
                      <span className="memory-significance">
                        {Math.round((memory.significance || 0) * 100)}% significant
                      </span>
                    </div>
                    {memory.eventData && (
                      <div className="memory-details">
                        {memory.eventData.message && (
                          <p className="memory-text">"{memory.eventData.message.substring(0, 100)}..."</p>
                        )}
                      </div>
                    )}
                    <div className="memory-timestamp">
                      {new Date(memory.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No significant shared memories yet</p>
            )}

            {/* Player Knowledge */}
            {(knownTraits.length > 0 || knownFacts.length > 0) && (
              <div className="player-knowledge">
                <h4>What They Know About You</h4>
                {knownTraits.length > 0 && (
                  <div className="knowledge-section">
                    <strong>Traits:</strong>
                    <div className="knowledge-tags">
                      {knownTraits.map((trait, idx) => (
                        <span key={idx} className="knowledge-tag">{trait}</span>
                      ))}
                    </div>
                  </div>
                )}
                {knownFacts.length > 0 && (
                  <div className="knowledge-section">
                    <strong>Facts:</strong>
                    <ul>
                      {knownFacts.map((fact, idx) => (
                        <li key={idx}>{fact}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Phase 2: Motivations Section */}
          {motivations.primaryGoal && (
            <div className="npc-details-section">
              <h3 className="npc-details-section-title">
                <span className="section-icon">🎯</span>
                Motivations
              </h3>
              <div className="motivations-info">
                <div className="primary-goal">
                  <h4>Primary Goal</h4>
                  <p className="goal-description">{motivations.primaryGoal.description}</p>
                  <div className="goal-meta">
                    <span className="goal-type">{motivations.primaryGoal.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    <span className="goal-urgency">
                      Urgency: {Math.round((motivations.primaryGoal.urgency || 0) * 100)}%
                    </span>
                  </div>
                  <div className="urgency-bar">
                    <div 
                      className="urgency-fill"
                      style={{ 
                        width: `${Math.min(100, Math.max(0, (motivations.primaryGoal.urgency || 0) * 100))}%`,
                        backgroundColor: motivations.primaryGoal.urgency > 0.7 ? '#ef4444' : 
                                         motivations.primaryGoal.urgency > 0.4 ? '#f59e0b' : '#10b981'
                      }}
                    />
                  </div>
                </div>

                {motivations.immediateNeeds && motivations.immediateNeeds.length > 0 && (
                  <div className="immediate-needs">
                    <h4>Immediate Needs</h4>
                    <ul>
                      {motivations.immediateNeeds.map((need, idx) => (
                        <li key={idx}>
                          <span className="need-description">{need.description}</span>
                          <span className="need-urgency">
                            {Math.round((need.urgency || 0) * 100)}% urgent
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {motivations.fears && motivations.fears.length > 0 && (
                  <div className="fears">
                    <h4>Fears</h4>
                    <div className="fears-tags">
                      {motivations.fears.map((fear, idx) => (
                        <span key={idx} className="fear-tag">
                          {fear.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {motivations.values && motivations.values.length > 0 && (
                  <div className="values">
                    <h4>Core Values</h4>
                    <div className="values-list">
                      {motivations.values.slice(0, 5).map((value, idx) => (
                        <div key={idx} className="value-item">
                          <span className="value-name">{value.name || value}</span>
                          {value.importance && (
                            <span className="value-importance">
                              {Math.round((value.importance || 0) * 100)}%
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Phase 2: Trust System Section */}
          <div className="npc-details-section">
            <h3 className="npc-details-section-title">
              <span className="section-icon">🤝</span>
              Trust Level
            </h3>
            <div className="trust-info">
              <div className="trust-display">
                <div 
                  className="trust-badge"
                  style={{ 
                    backgroundColor: `${trustTier.color}20`,
                    borderColor: trustTier.color
                  }}
                >
                  <span className="trust-tier">{trustTier.name}</span>
                  <span className="trust-level">{Math.round(trustLevel)}/100</span>
                </div>
                <div className="trust-bar">
                  <div 
                    className="trust-fill"
                    style={{ 
                      width: `${Math.min(100, Math.max(0, trustLevel))}%`,
                      backgroundColor: trustTier.color
                    }}
                  />
                </div>
              </div>

              {trustSystem.trustFactors && (
                <div className="trust-factors">
                  <h4>Trust Factors</h4>
                  <div className="trust-factors-grid">
                    <div className="trust-factor-item">
                      <span className="factor-label">Quests Completed</span>
                      <span className="factor-value">{trustSystem.trustFactors.questsCompleted || 0}</span>
                    </div>
                    <div className="trust-factor-item">
                      <span className="factor-label">Quests Failed</span>
                      <span className="factor-value negative">{trustSystem.trustFactors.questsFailed || 0}</span>
                    </div>
                    <div className="trust-factor-item">
                      <span className="factor-label">Help Provided</span>
                      <span className="factor-value">{trustSystem.trustFactors.helpProvided || 0}</span>
                    </div>
                    <div className="trust-factor-item">
                      <span className="factor-label">Harm Caused</span>
                      <span className="factor-value negative">{trustSystem.trustFactors.harmCaused || 0}</span>
                    </div>
                  </div>
                </div>
              )}

              {trustSystem.thresholds && (
                <div className="trust-thresholds">
                  <h4>Trust Thresholds</h4>
                  <div className="thresholds-list">
                    <div className="threshold-item">
                      <span className="threshold-name">Share Secrets</span>
                      <span className={`threshold-status ${trustLevel >= (trustSystem.thresholds.shareSecret || 60) ? 'met' : 'not-met'}`}>
                        {trustLevel >= (trustSystem.thresholds.shareSecret || 60) ? '✓' : '✗'} {trustSystem.thresholds.shareSecret || 60}
                      </span>
                    </div>
                    <div className="threshold-item">
                      <span className="threshold-name">Request Favors</span>
                      <span className={`threshold-status ${trustLevel >= (trustSystem.thresholds.requestFavor || 50) ? 'met' : 'not-met'}`}>
                        {trustLevel >= (trustSystem.thresholds.requestFavor || 50) ? '✓' : '✗'} {trustSystem.thresholds.requestFavor || 50}
                      </span>
                    </div>
                    <div className="threshold-item">
                      <span className="threshold-name">Reveal Weaknesses</span>
                      <span className={`threshold-status ${trustLevel >= (trustSystem.thresholds.revealWeakness || 70) ? 'met' : 'not-met'}`}>
                        {trustLevel >= (trustSystem.thresholds.revealWeakness || 70) ? '✓' : '✗'} {trustSystem.thresholds.revealWeakness || 70}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="npc-details-modal-footer">
          <button className="npc-details-close-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );

  // Render modal using portal to escape parent container constraints
  return createPortal(modalContent, document.body);
}

