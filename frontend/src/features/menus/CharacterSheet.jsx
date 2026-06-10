/**
 * Character Sheet
 * Displays character stats, skills, and attributes
 */

import React, { useState, useMemo } from 'react';
import { useCharacterStore } from '../../state/characterSlice';
import AbilitiesPanel from '../abilities/AbilitiesPanel';
import AttributeAllocationView from '../character/AttributeAllocationView';
import SkillTreeView from '../character/SkillTreeView';
import StatBreakdownTooltip from '../../components/tooltips/StatBreakdownTooltip';
import { calculateCharacterCombatStats, formatStatBreakdown } from '../../utils/combatStatsCalculator';
import { ProgressionSystem } from '../../core/progression/ProgressionSystem';
import './CharacterSheet.css';

export default function CharacterSheet() {
  const { currentCharacter } = useCharacterStore();
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate combat stats for overview (must be before early return)
  const combatStats = useMemo(() => {
    if (!currentCharacter) return null;
    return calculateCharacterCombatStats(currentCharacter);
  }, [currentCharacter]);

  // Check if there are points to allocate (must be before early return)
  const hasAttributePoints = useMemo(() => {
    return (currentCharacter?.attributePoints || 0) > 0;
  }, [currentCharacter]);

  const hasSkillPoints = useMemo(() => {
    return (currentCharacter?.skillPoints || 0) > 0;
  }, [currentCharacter]);

  // Calculate stamina bonuses (must be before early return)
  const staminaBonuses = useMemo(() => {
    if (!currentCharacter) return null;
    const progressionSystem = new ProgressionSystem(currentCharacter);
    const passiveBonuses = progressionSystem.getPassiveBonuses();
    return {
      maxStaminaBonus: passiveBonuses.other?.maxStamina || 0,
      regenBonus: passiveBonuses.other?.staminaRegenBonus || 0,
      costReduction: passiveBonuses.other?.staminaCostReduction || 0
    };
  }, [currentCharacter]);

  if (!currentCharacter) {
    return <div className="character-sheet">No character selected</div>;
  }

  const stats = currentCharacter.stats || {};
  const skills = currentCharacter.skills || {};
  const abilities = currentCharacter.abilities || [];

  if (!combatStats) {
    return <div className="character-sheet">Loading character stats...</div>;
  }

  return (
    <div className="character-sheet">
      <div className="character-header">
        <h3>{currentCharacter.name}</h3>
        <div className="character-basic-info">
          <span>Level {currentCharacter.level || 1}</span>
          <span>{currentCharacter.species || 'Unknown'}</span>
          <span>{currentCharacter.background || 'Unknown'}</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="character-sheet-tabs">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab-button ${activeTab === 'attributes' ? 'active' : ''} ${hasAttributePoints ? 'has-points' : ''}`}
          onClick={() => setActiveTab('attributes')}
        >
          Attributes {hasAttributePoints && <span className="points-badge">{currentCharacter.attributePoints}</span>}
        </button>
        <button
          className={`tab-button ${activeTab === 'skills' ? 'active' : ''} ${hasSkillPoints ? 'has-points' : ''}`}
          onClick={() => setActiveTab('skills')}
        >
          Skills {hasSkillPoints && <span className="points-badge">{currentCharacter.skillPoints}</span>}
        </button>
        <button
          className={`tab-button ${activeTab === 'abilities' ? 'active' : ''}`}
          onClick={() => setActiveTab('abilities')}
        >
          Abilities
        </button>
      </div>

      {/* Tab Content */}
      <div className="character-sheet-content">
        {activeTab === 'overview' && (
          <div className="character-content">
            <div className="character-section">
              <h4>Combat Stats</h4>
              <div className="combat-stats-grid">
                <StatBreakdownTooltip
                  statName="Attack Rating"
                  value={Math.floor(combatStats.attackRating.value)}
                  breakdown={formatStatBreakdown(combatStats.attackRating)}
                  formatValue={(v) => Math.floor(v)}
                >
                  <div className="combat-stat-item">
                    <span className="stat-name">Attack Rating</span>
                    <span className="stat-value">{Math.floor(combatStats.attackRating.value)}</span>
                  </div>
                </StatBreakdownTooltip>
                
                <StatBreakdownTooltip
                  statName="Defense Rating"
                  value={Math.floor(combatStats.defenseRating.value)}
                  breakdown={formatStatBreakdown(combatStats.defenseRating)}
                  formatValue={(v) => Math.floor(v)}
                >
                  <div className="combat-stat-item">
                    <span className="stat-name">Defense Rating</span>
                    <span className="stat-value">{Math.floor(combatStats.defenseRating.value)}</span>
                  </div>
                </StatBreakdownTooltip>
                
                <StatBreakdownTooltip
                  statName="Crit Chance"
                  value={combatStats.critChance.value}
                  breakdown={formatStatBreakdown(combatStats.critChance)}
                  formatValue={(v) => (v * 100).toFixed(1) + '%'}
                >
                  <div className="combat-stat-item">
                    <span className="stat-name">Crit Chance</span>
                    <span className="stat-value">{(combatStats.critChance.value * 100).toFixed(1)}%</span>
                  </div>
                </StatBreakdownTooltip>
                
                <StatBreakdownTooltip
                  statName="Dodge Chance"
                  value={combatStats.dodgeChance.value}
                  breakdown={formatStatBreakdown(combatStats.dodgeChance)}
                  formatValue={(v) => (v * 100).toFixed(1) + '%'}
                >
                  <div className="combat-stat-item">
                    <span className="stat-name">Dodge Chance</span>
                    <span className="stat-value">{(combatStats.dodgeChance.value * 100).toFixed(1)}%</span>
                  </div>
                </StatBreakdownTooltip>
              </div>
            </div>

            <div className="character-section">
              <h4>Attributes</h4>
              <div className="stats-grid">
                {Object.entries(stats).map(([stat, value]) => (
                  <div key={stat} className="stat-item">
                    <span className="stat-name">{stat.charAt(0).toUpperCase() + stat.slice(1)}</span>
                    <span className="stat-value">{value || 10}</span>
                  </div>
                ))}
              </div>
              {hasAttributePoints && (
                <div className="allocation-prompt">
                  <p>You have {currentCharacter.attributePoints} attribute point{currentCharacter.attributePoints !== 1 ? 's' : ''} to allocate!</p>
                  <button onClick={() => setActiveTab('attributes')} className="prompt-button">
                    Allocate Points
                  </button>
                </div>
              )}
            </div>

            <div className="character-section">
              <h4>Skills</h4>
              <div className="skills-list">
                {Object.entries(skills).map(([tree, treeSkills]) => (
                  <div key={tree} className="skill-tree">
                    <h5>{tree.charAt(0).toUpperCase() + tree.slice(1)}</h5>
                    {treeSkills && Object.keys(treeSkills).length > 0 ? (
                      <div className="skill-items">
                        {Object.entries(treeSkills).map(([skillId, skillData]) => (
                          <div key={skillId} className="skill-item">
                            <span className="skill-name">{skillId}</span>
                            <span className="skill-level">{skillData.level || 0}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-skills">No skills in this tree</p>
                    )}
                  </div>
                ))}
              </div>
              {hasSkillPoints && (
                <div className="allocation-prompt">
                  <p>You have {currentCharacter.skillPoints} skill point{currentCharacter.skillPoints !== 1 ? 's' : ''} to allocate!</p>
                  <button onClick={() => setActiveTab('skills')} className="prompt-button">
                    Allocate Points
                  </button>
                </div>
              )}
            </div>

            <div className="character-section">
              <h4>Stamina</h4>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-name">Current Stamina</span>
                  <span className="stat-value">{currentCharacter.currentStamina || 0} / {currentCharacter.maxStamina || 100}</span>
                </div>
                {staminaBonuses && (
                  <>
                    {staminaBonuses.maxStaminaBonus > 0 && (
                      <div className="stat-item">
                        <span className="stat-name">Max Stamina Bonus</span>
                        <span className="stat-value">+{staminaBonuses.maxStaminaBonus} (skills)</span>
                      </div>
                    )}
                    {staminaBonuses.regenBonus > 0 && (
                      <div className="stat-item">
                        <span className="stat-name">Regen Bonus</span>
                        <span className="stat-value">+{staminaBonuses.regenBonus}%</span>
                      </div>
                    )}
                    {staminaBonuses.costReduction > 0 && (
                      <div className="stat-item">
                        <span className="stat-name">Cost Reduction</span>
                        <span className="stat-value">-{staminaBonuses.costReduction}%</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="character-section">
              <h4>Resources</h4>
              <div className="resources-list">
                <div className="resource-item">
                  <span className="resource-label">Credits:</span>
                  <span className="resource-value">{currentCharacter.credits || 0}</span>
                </div>
                <div className="resource-item">
                  <span className="resource-label">XP:</span>
                  <span className="resource-value">{currentCharacter.xp || 0}</span>
                </div>
                <div className="resource-item">
                  <span className="resource-label">Skill Points:</span>
                  <span className="resource-value">{currentCharacter.skillPoints || 0}</span>
                </div>
                <div className="resource-item">
                  <span className="resource-label">Attribute Points:</span>
                  <span className="resource-value">{currentCharacter.attributePoints || 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attributes' && (
          <div className="tab-content">
            <AttributeAllocationView />
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="tab-content">
            <SkillTreeView />
          </div>
        )}

        {activeTab === 'abilities' && (
          <div className="tab-content">
            <div className="character-section">
              <AbilitiesPanel abilities={abilities} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


