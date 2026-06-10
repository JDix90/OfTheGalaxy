import React, { useState, useMemo } from 'react';
import { useCharacterStore } from '../../state/characterSlice';
import { characterApi } from '../../services/api/characterApi';
import { SKILL_DEFINITIONS } from '../../data/skills';
import { ProgressionSystem } from '../../core/progression/ProgressionSystem';
import SuccessPreviewTooltip from '../../components/tooltips/SuccessPreviewTooltip';
import { calculateLockpickChance, calculateHackChance, getSuccessPreviews } from '../../utils/successChecks';
import './SkillTreeView.css';

export default function SkillTreeView() {
  const { currentCharacter, loadCharacter } = useCharacterStore();
  const [selectedTree, setSelectedTree] = useState('combat');
  const [allocating, setAllocating] = useState(false);
  const [error, setError] = useState(null);

  const skillTrees = [
    { id: 'combat', name: 'Combat', icon: '⚔️' },
    { id: 'stealth', name: 'Stealth', icon: '🥷' },
    { id: 'diplomacy', name: 'Diplomacy', icon: '🤝' },
    { id: 'technical', name: 'Technical', icon: '🔧' },
    { id: 'survival', name: 'Survival', icon: '🌿' }
  ];

  const handleAllocateSkill = async (tree, skillId) => {
    if (allocating || !currentCharacter) return;
    
    // Check prerequisites using ProgressionSystem
    const progressionSystem = new ProgressionSystem(currentCharacter);
    const canUnlock = progressionSystem.canUnlockSkill(tree, skillId);
    
    if (!canUnlock.can) {
      setError(`Cannot unlock: ${canUnlock.reason}`);
      return;
    }
    
    setAllocating(true);
    setError(null);
    
    try {
      const response = await characterApi.allocateSkill(currentCharacter.id, tree, skillId);
      
      if (response.success) {
        // Reload character to get updated data
        await loadCharacter(currentCharacter.id);
      } else {
        throw new Error(response.message || 'Failed to allocate skill point');
      }
    } catch (error) {
      console.error('Failed to allocate skill point:', error);
      setError(error.message || 'Failed to allocate skill point');
    } finally {
      setAllocating(false);
    }
  };

  const getSkillStatus = (tree, skillId) => {
    if (!currentCharacter) return { status: 'unknown', level: 0 };
    
    const progressionSystem = new ProgressionSystem(currentCharacter);
    
    // Use ProgressionSystem's safe getSkillLevel method
    const currentLevel = progressionSystem.getSkillLevel(tree, skillId);
    
    const skillDef = SKILL_DEFINITIONS[tree]?.[skillId];
    if (!skillDef) return { status: 'unknown', level: 0 };
    
    const canUnlock = progressionSystem.canUnlockSkill(tree, skillId);
    
    if (currentLevel >= (skillDef.maxLevel || 5)) {
      return { status: 'maxed', level: currentLevel };
    }
    
    if (currentLevel > 0) {
      return { status: 'unlocked', level: currentLevel, canUpgrade: canUnlock.can };
    }
    
    return { status: canUnlock.can ? 'available' : 'locked', level: 0, reason: canUnlock.reason };
  };

  if (!currentCharacter) {
    return (
      <div className="skill-tree-view">
        <p>No character selected</p>
      </div>
    );
  }

  const availablePoints = currentCharacter.skillPoints || 0;
  const currentTreeSkills = SKILL_DEFINITIONS[selectedTree] || {};

  return (
    <div className="skill-tree-view">
      <div className="header">
        <h3>Skill Trees</h3>
        <div className="points-counter">
          Skill Points: <span className="points-value">{availablePoints}</span>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="tree-tabs">
        {skillTrees.map(tree => (
          <button
            key={tree.id}
            className={`tree-tab ${selectedTree === tree.id ? 'active' : ''}`}
            onClick={() => setSelectedTree(tree.id)}
          >
            <span className="tree-icon">{tree.icon}</span>
            <span className="tree-name">{tree.name}</span>
          </button>
        ))}
      </div>

      <div className="skills-list">
        {Object.entries(currentTreeSkills).map(([skillId, skillDef]) => {
          const status = getSkillStatus(selectedTree, skillId);
          const currentLevel = status.level;
          const maxLevel = skillDef.maxLevel || 5;
          
          // Calculate success previews for relevant skills
          const successPreviews = useMemo(() => {
            if (!currentCharacter) return [];
            
            const stats = currentCharacter.stats || {};
            
            // Lockpicking skill
            if (selectedTree === 'stealth' && skillId === 'lockpicking') {
              const agility = stats.agility || 10;
              const currentChance = calculateLockpickChance(currentLevel, agility, 1, 0);
              return getSuccessPreviews(currentChance, currentLevel, agility, 15); // Tier 1 lock
            }
            
            // Hacking skill
            if (selectedTree === 'technical' && skillId === 'hacking') {
              const intelligence = stats.intelligence || 10;
              const currentChance = calculateHackChance(currentLevel, intelligence, 1, 0);
              return getSuccessPreviews(currentChance, currentLevel, intelligence, 18); // Tier 1 terminal
            }
            
            return [];
          }, [currentCharacter, selectedTree, skillId, currentLevel]);
          
          const hasSuccessPreview = successPreviews.length > 0;
          const currentSuccessChance = hasSuccessPreview 
            ? (selectedTree === 'stealth' && skillId === 'lockpicking'
                ? calculateLockpickChance(currentLevel, currentCharacter.stats?.agility || 10, 1, 0)
                : selectedTree === 'technical' && skillId === 'hacking'
                  ? calculateHackChance(currentLevel, currentCharacter.stats?.intelligence || 10, 1, 0)
                  : 0)
            : 0;
          
          return (
            <div key={skillId} className={`skill-card ${status.status}`}>
              <div className="skill-header">
                <h4>{skillDef.name}</h4>
                <span className="skill-level">
                  {currentLevel > 0 ? `${currentLevel}/${maxLevel}` : `0/${maxLevel}`}
                </span>
              </div>
              
              <p className="skill-description">{skillDef.description}</p>
              
              {hasSuccessPreview && (
                <SuccessPreviewTooltip
                  currentChance={currentSuccessChance}
                  previews={successPreviews}
                  label={skillId === 'lockpicking' ? 'Lockpicking Success' : 'Hacking Success'}
                >
                  <div className="success-preview-badge">
                    {skillId === 'lockpicking' ? '🔓' : '💻'} Success: {(currentSuccessChance * 100).toFixed(1)}% (Tier 1)
                  </div>
                </SuccessPreviewTooltip>
              )}
              
              {skillDef.prerequisites && (
                <div className="prerequisites">
                  <h5>Requires:</h5>
                  <ul>
                    {skillDef.prerequisites.level && (
                      <li>Level {skillDef.prerequisites.level}</li>
                    )}
                    {skillDef.prerequisites.stats && Object.entries(skillDef.prerequisites.stats).map(([stat, value]) => (
                      <li key={stat}>{stat.charAt(0).toUpperCase() + stat.slice(1)} {value}</li>
                    ))}
                    {skillDef.prerequisites.skills && Object.entries(skillDef.prerequisites.skills).map(([prereqTree, prereqSkills]) => (
                      Object.entries(prereqSkills).map(([prereqSkillId, prereqLevel]) => {
                        const prereqSkillDef = SKILL_DEFINITIONS[prereqTree]?.[prereqSkillId];
                        const prereqSkillName = prereqSkillDef?.name || prereqSkillId;
                        return (
                          <li key={`${prereqTree}-${prereqSkillId}`}>{prereqSkillName} level {prereqLevel}</li>
                        );
                      })
                    ))}
                  </ul>
                </div>
              )}
              
              {skillDef.passives && (
                <div className="passive-bonuses">
                  <h5>Bonuses:</h5>
                  <ul>
                    {Object.entries(skillDef.passives).map(([bonus, value]) => {
                      const bonusName = bonus.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
                      const bonusValue = bonus.includes('damage') || bonus.includes('defense') || bonus.includes('crit') || bonus.includes('accuracy') 
                        ? `+${value}%` 
                        : `+${value}`;
                      return (
                        <li key={bonus}>{bonusValue} {bonusName} per level</li>
                      );
                    })}
                  </ul>
                </div>
              )}
              
              <div className="skill-actions">
                {status.status === 'available' && availablePoints > 0 && (
                  <button
                    className="unlock-button"
                    onClick={() => handleAllocateSkill(selectedTree, skillId)}
                    disabled={allocating}
                  >
                    Unlock (1 Skill Point)
                  </button>
                )}
                {status.status === 'unlocked' && status.canUpgrade && availablePoints > 0 && (
                  <button
                    className="upgrade-button"
                    onClick={() => handleAllocateSkill(selectedTree, skillId)}
                    disabled={allocating}
                  >
                    Upgrade to {currentLevel + 1}/{maxLevel} (1 Skill Point)
                  </button>
                )}
                {status.status === 'maxed' && (
                  <span className="maxed-indicator">Max Level Reached</span>
                )}
                {status.status === 'locked' && (
                  <span className="locked-reason">{status.reason}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

