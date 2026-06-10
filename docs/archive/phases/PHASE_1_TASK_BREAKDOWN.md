# Phase 1: Critical Fixes - Detailed Task Breakdown

**Duration:** Weeks 1-2  
**Priority:** CRITICAL - Must be completed before any other enhancements  
**Status:** Ready for Implementation

---

## Overview

Phase 1 focuses on making the core progression system functional by fixing four critical issues that prevent players from experiencing meaningful character progression. These fixes are essential for a playable game loop.

### Objectives

1. ✅ **Apply Skill Passive Bonuses** - Make skills provide mechanical benefits
2. ✅ **Create Point Allocation UIs** - Allow players to spend attribute and skill points
3. ✅ **Auto-Unlock Item Abilities** - Ensure item abilities are automatically unlocked
4. ✅ **Apply Perception Critical Chance** - Make Perception attribute affect critical hit chance

---

## Task 1.1: Apply Skill Passive Bonuses

**Priority:** CRITICAL  
**Estimated Time:** 2-3 days  
**Dependencies:** None  
**Risk Level:** Medium

### Objective

Integrate skill passive bonuses into all relevant game systems so that investing in skills provides meaningful mechanical benefits.

### Current State

- ✅ `ProgressionSystem.getPassiveBonuses()` exists in frontend (`frontend/src/core/progression/ProgressionSystem.js`)
- ❌ Passive bonuses are **NOT applied** in combat or any gameplay systems
- ❌ No backend equivalent of `ProgressionSystem` exists
- ❌ `combatService.buildPlayerCombatant()` does not use skill bonuses

### Implementation Steps

#### Step 1.1.1: Create Backend ProgressionSystem Utility

**File:** `backend/src/utils/progressionSystem.js` (NEW)

**Purpose:** Port the passive bonus calculation logic to backend so it can be used in combat and other services.

**Implementation:**

```javascript
/**
 * Progression System Utility
 * Calculates passive bonuses from character skills
 */

const { getSkillDefinition } = require('../data/skills');

class ProgressionSystem {
  constructor(character) {
    this.character = character;
  }

  /**
   * Get passive bonuses from skills
   * @returns {Object} Passive bonuses grouped by category
   */
  getPassiveBonuses() {
    const bonuses = {
      stats: {},
      combat: {},
      other: {}
    };

    // Ensure skills object exists
    const skills = this.character.skills || {};
    
    for (const [tree, treeSkills] of Object.entries(skills)) {
      if (!treeSkills || typeof treeSkills !== 'object') continue;
      
      for (const [skillId, skillData] of Object.entries(treeSkills)) {
        if (!skillData || typeof skillData !== 'object') continue;
        
        const skillLevel = skillData.level || 0;
        if (skillLevel <= 0) continue;

        const skillDef = getSkillDefinition(tree, skillId);
        if (!skillDef || !skillDef.passives) continue;

        // Apply passive bonuses based on skill level
        for (const [bonusType, bonusValue] of Object.entries(skillDef.passives)) {
          const scaledValue = bonusValue * skillLevel;
          
          // Categorize bonuses
          if (['strength', 'agility', 'intelligence', 'charisma', 'perception', 'endurance'].includes(bonusType)) {
            bonuses.stats[bonusType] = (bonuses.stats[bonusType] || 0) + scaledValue;
          } else if (bonusType.includes('damage') || bonusType.includes('defense') || 
                     bonusType.includes('accuracy') || bonusType.includes('crit')) {
            bonuses.combat[bonusType] = (bonuses.combat[bonusType] || 0) + scaledValue;
          } else {
            bonuses.other[bonusType] = (bonuses.other[bonusType] || 0) + scaledValue;
          }
        }
      }
    }

    return bonuses;
  }

  /**
   * Get skill level for a specific skill
   * @param {string} tree - Skill tree name
   * @param {string} skillId - Skill ID
   * @returns {number} Skill level (0 if not unlocked)
   */
  getSkillLevel(tree, skillId) {
    const skills = this.character.skills || {};
    const treeSkills = skills[tree] || {};
    const skillData = treeSkills[skillId];
    return skillData?.level || 0;
  }
}

module.exports = { ProgressionSystem };
```

**Dependencies:**
- Need to verify `getSkillDefinition` exists in `backend/src/data/skills.js`
- If not, create it or use skill definitions directly

**Testing:**
- Unit test: Create mock character with skills, verify bonuses are calculated correctly
- Test with empty skills object
- Test with invalid skill data
- Test with multiple skills in different trees

---

#### Step 1.1.2: Integrate Passive Bonuses into Combat System

**File:** `backend/src/services/combatService.js`

**Location:** `buildPlayerCombatant()` method (around line 162)

**Changes Required:**

1. **Import ProgressionSystem:**
   ```javascript
   const { ProgressionSystem } = require('../utils/progressionSystem');
   ```

2. **Calculate passive bonuses after base stats but before final calculations:**
   ```javascript
   async buildPlayerCombatant(character) {
     // ... existing code to get equipped items and calculate base stats ...
     
     // Calculate skill passive bonuses
     const progressionSystem = new ProgressionSystem(character);
     const passiveBonuses = progressionSystem.getPassiveBonuses();
     
     // Apply passive bonuses to base stats
     let modifiedAttack = baseAttack + weaponDamage;
     let modifiedDefense = baseDefense + armorDefense;
     let modifiedAccuracy = finalAccuracy;
     let modifiedSpeed = baseSpeed;
     
     // Apply combat bonuses from skills
     if (passiveBonuses.combat.damage) {
       // damage is typically a percentage (e.g., +10% = 10)
       modifiedAttack = Math.floor(modifiedAttack * (1 + (passiveBonuses.combat.damage / 100)));
     }
     
     if (passiveBonuses.combat.defense) {
       // defense is typically a percentage
       modifiedDefense = Math.floor(modifiedDefense * (1 + (passiveBonuses.combat.defense / 100)));
     }
     
     if (passiveBonuses.combat.accuracy) {
       // accuracy is typically a flat bonus
       modifiedAccuracy = Math.min(100, modifiedAccuracy + passiveBonuses.combat.accuracy);
     }
     
     if (passiveBonuses.combat.speed) {
       // speed is typically a flat bonus
       modifiedSpeed += passiveBonuses.combat.speed;
     }
     
     // Apply stat bonuses from skills
     if (passiveBonuses.stats.strength) {
       // Strength affects attack
       modifiedAttack += Math.floor(passiveBonuses.stats.strength * 0.5);
     }
     if (passiveBonuses.stats.agility) {
       // Agility affects accuracy and speed
       modifiedAccuracy += Math.floor(passiveBonuses.stats.agility * 0.5);
       modifiedSpeed += Math.floor(passiveBonuses.stats.agility * 0.3);
     }
     if (passiveBonuses.stats.endurance) {
       // Endurance affects defense
       modifiedDefense += Math.floor(passiveBonuses.stats.endurance * 0.3);
     }
     
     // Use modified stats for special effects calculation
     const effectResults = specialEffectsService.applyEffects(equippedItems, {
       attack: modifiedAttack,
       defense: modifiedDefense,
       speed: modifiedSpeed,
       accuracy: modifiedAccuracy,
       forcePower: stats.forcePower || 0,
       perception: stats.perception || 0,
       intelligence: stats.intelligence || 0,
       charisma: stats.charisma || 0
     });
     
     // ... rest of existing code ...
   }
   ```

3. **Store passive bonuses in combatant for reference:**
   ```javascript
   return {
     // ... existing fields ...
     passiveBonuses: passiveBonuses, // Store for debugging/reference
     // ... rest of existing fields ...
   };
   ```

**Testing:**
- Integration test: Create character with skills, enter combat, verify stats are modified
- Test with no skills (should work as before)
- Test with multiple combat skills
- Test with stat bonus skills
- Verify bonuses stack correctly with equipment and special effects

---

#### Step 1.1.3: Integrate Passive Bonuses into Crafting System

**File:** `backend/src/services/craftingService.js` (if exists, otherwise create)

**Purpose:** Apply technical skill bonuses to crafting success, quality, and costs.

**Implementation:**

```javascript
// In calculateCraftingSuccess() or similar method
const { ProgressionSystem } = require('../utils/progressionSystem');

async calculateCraftingSuccess(characterId, recipeId, materials) {
  const character = await PlayerCharacter.findByPk(characterId);
  if (!character) {
    throw new Error('Character not found');
  }
  
  const progressionSystem = new ProgressionSystem(character);
  const passiveBonuses = progressionSystem.getPassiveBonuses();
  
  // Get engineering skill level
  const engineeringLevel = progressionSystem.getSkillLevel('technical', 'engineering');
  
  // Base success chance
  let successChance = 50; // Base 50%
  
  // Apply skill bonuses
  if (engineeringLevel > 0) {
    successChance += engineeringLevel * 5; // +5% per engineering level
  }
  
  // Apply intelligence bonus
  const intelligence = character.stats.intelligence || 10;
  successChance += (intelligence - 10) * 2; // +2% per point above 10
  
  // Apply passive bonuses if any
  if (passiveBonuses.other.craftingSuccess) {
    successChance += passiveBonuses.other.craftingSuccess;
  }
  
  // Cap at 95% (never 100% to maintain some risk)
  successChance = Math.min(95, Math.max(5, successChance));
  
  // Calculate material cost reduction
  const materialCostReduction = engineeringLevel * 0.05; // -5% per level
  
  // Calculate quality bonus
  const qualityBonus = engineeringLevel * 0.02; // +2% quality per level
  
  return {
    successChance,
    materialCostReduction,
    qualityBonus
  };
}
```

**Testing:**
- Test crafting with different engineering levels
- Test with no engineering skill
- Verify cost reduction and quality bonuses apply

---

#### Step 1.1.4: Integrate Passive Bonuses into Dialogue System

**File:** `backend/src/services/dialogueService.js` (if exists, otherwise create)

**Purpose:** Apply diplomacy skill bonuses to dialogue success chances and unlock dialogue options.

**Implementation:**

```javascript
// In getDialogueOptions() or similar method
const { ProgressionSystem } = require('../utils/progressionSystem');

async getDialogueOptions(characterId, dialogueId) {
  const character = await PlayerCharacter.findByPk(characterId);
  if (!character) {
    throw new Error('Character not found');
  }
  
  const progressionSystem = new ProgressionSystem(character);
  const passiveBonuses = progressionSystem.getPassiveBonuses();
  
  // Get diplomacy skill levels
  const persuasionLevel = progressionSystem.getSkillLevel('diplomacy', 'persuasion');
  const intimidationLevel = progressionSystem.getSkillLevel('diplomacy', 'intimidation');
  
  // Base dialogue options
  const options = [
    { id: 'neutral', text: '[Neutral Response]' }
  ];
  
  // Unlock persuasion option if skill level is high enough
  if (persuasionLevel >= 3) {
    options.push({
      id: 'persuade',
      text: '[Persuade]',
      skillRequired: { tree: 'diplomacy', skill: 'persuasion', level: 3 }
    });
  }
  
  // Unlock intimidation option if skill level is high enough
  if (intimidationLevel >= 3) {
    options.push({
      id: 'intimidate',
      text: '[Intimidate]',
      skillRequired: { tree: 'diplomacy', skill: 'intimidation', level: 3 }
    });
  }
  
  return options;
}

// In calculateDialogueSuccess() or similar method
async calculateDialogueSuccess(characterId, optionId, difficulty = 50) {
  const character = await PlayerCharacter.findByPk(characterId);
  const progressionSystem = new ProgressionSystem(character);
  
  let skillLevel = 0;
  let attributeBonus = 0;
  
  if (optionId === 'persuade') {
    skillLevel = progressionSystem.getSkillLevel('diplomacy', 'persuasion');
    attributeBonus = (character.stats.charisma || 10) - 10; // +1% per charisma point above 10
  } else if (optionId === 'intimidate') {
    skillLevel = progressionSystem.getSkillLevel('diplomacy', 'intimidation');
    attributeBonus = (character.stats.strength || 10) - 10; // +1% per strength point above 10
  }
  
  // Base success chance
  let successChance = difficulty; // Start with difficulty as base
  
  // Apply skill bonus (+10% per skill level)
  successChance += skillLevel * 10;
  
  // Apply attribute bonus (+2% per attribute point above 10)
  successChance += attributeBonus * 2;
  
  // Cap between 5% and 95%
  successChance = Math.min(95, Math.max(5, successChance));
  
  return successChance;
}
```

**Testing:**
- Test dialogue with different persuasion/intimidation levels
- Test with no diplomacy skills
- Verify dialogue options unlock correctly
- Test success chance calculation

---

#### Step 1.1.5: Integrate Passive Bonuses into Exploration System

**File:** `backend/src/services/explorationService.js` (if exists, otherwise create)

**Purpose:** Apply survival/perception skill bonuses to discovery chances and hidden location detection.

**Implementation:**

```javascript
// In checkHiddenLocation() or similar method
const { ProgressionSystem } = require('../utils/progressionSystem');

async checkHiddenLocation(characterId, locationId) {
  const character = await PlayerCharacter.findByPk(characterId);
  if (!character) {
    throw new Error('Character not found');
  }
  
  const progressionSystem = new ProgressionSystem(character);
  
  // Get survival skill level
  const survivalLevel = progressionSystem.getSkillLevel('survival', 'basic_survival');
  
  // Get perception attribute
  const perception = character.stats.perception || 10;
  
  // Base discovery chance
  let discoveryChance = 20; // Base 20%
  
  // Apply skill bonus (+5% per survival level)
  discoveryChance += survivalLevel * 5;
  
  // Apply perception bonus (+2% per perception point above 10)
  discoveryChance += (perception - 10) * 2;
  
  // Cap at 90%
  discoveryChance = Math.min(90, Math.max(10, discoveryChance));
  
  // Roll for discovery
  const roll = Math.random() * 100;
  const discovered = roll <= discoveryChance;
  
  return {
    discovered,
    discoveryChance,
    roll
  };
}
```

**Testing:**
- Test exploration with different survival levels
- Test with different perception values
- Verify discovery chances are calculated correctly

---

### Acceptance Criteria

- [ ] Backend `ProgressionSystem` utility created and tested
- [ ] Passive bonuses applied in combat (damage, defense, accuracy, speed)
- [ ] Passive bonuses applied in crafting (success chance, cost reduction, quality)
- [ ] Passive bonuses applied in dialogue (option unlocks, success chances)
- [ ] Passive bonuses applied in exploration (discovery chances)
- [ ] All existing functionality still works (no regressions)
- [ ] Unit tests pass for all new code
- [ ] Integration tests verify bonuses are applied correctly

---

### Testing Checklist

- [ ] **Unit Tests:**
  - [ ] Test `ProgressionSystem.getPassiveBonuses()` with various skill configurations
  - [ ] Test with empty skills object
  - [ ] Test with invalid skill data
  - [ ] Test bonus calculation accuracy

- [ ] **Integration Tests:**
  - [ ] Create character with combat skills, enter combat, verify stats
  - [ ] Create character with technical skills, attempt crafting, verify bonuses
  - [ ] Create character with diplomacy skills, attempt dialogue, verify options
  - [ ] Create character with survival skills, attempt exploration, verify discovery

- [ ] **Regression Tests:**
  - [ ] Combat works without skills (baseline)
  - [ ] Crafting works without skills (baseline)
  - [ ] Dialogue works without skills (baseline)
  - [ ] Exploration works without skills (baseline)

---

### Risk Mitigation

**Risk:** Breaking existing combat balance
- **Mitigation:** Test thoroughly with and without skills, ensure baseline behavior unchanged

**Risk:** Performance impact of calculating bonuses
- **Mitigation:** Cache bonuses if needed, only calculate when character/skills change

**Risk:** Skill definitions missing or incorrect
- **Mitigation:** Add validation and fallback behavior, log warnings for missing definitions

---

## Task 1.2: Create Point Allocation UIs

**Priority:** CRITICAL  
**Estimated Time:** 3-4 days  
**Dependencies:** None  
**Risk Level:** Low

### Objective

Create functional UI components that allow players to allocate their earned attribute and skill points.

### Current State

- ✅ Backend API endpoints exist (`allocateAttribute`, `allocateSkill`)
- ❌ No frontend UI for attribute point allocation
- ❌ No frontend UI for skill point allocation
- ❌ Players cannot spend points they earn from leveling

### Implementation Steps

#### Step 1.2.1: Create Attribute Allocation Component

**File:** `frontend/src/features/character/AttributeAllocationView.jsx` (NEW)

**Purpose:** Display attributes and allow players to allocate attribute points.

**Implementation:**

```jsx
import React, { useState } from 'react';
import { useCharacterStore } from '../../state/characterSlice';
import { characterApi } from '../../services/api/characterApi';
import './AttributeAllocationView.css';

export default function AttributeAllocationView() {
  const { currentCharacter, setCurrentCharacter } = useCharacterStore();
  const [allocating, setAllocating] = useState(false);
  const [error, setError] = useState(null);

  const attributes = [
    { 
      id: 'strength', 
      name: 'Strength', 
      icon: '💪', 
      description: 'Physical power and melee damage',
      effects: ['Melee damage', 'Carry weight', 'Physical actions']
    },
    { 
      id: 'agility', 
      name: 'Agility', 
      icon: '🏃', 
      description: 'Speed, reflexes, and ranged accuracy',
      effects: ['Ranged accuracy', 'Dodge chance', 'Movement speed']
    },
    { 
      id: 'intelligence', 
      name: 'Intelligence', 
      icon: '🧠', 
      description: 'Problem-solving and technical skills',
      effects: ['Crafting success', 'Hacking success', 'Ability effectiveness']
    },
    { 
      id: 'charisma', 
      name: 'Charisma', 
      icon: '💬', 
      description: 'Persuasion and social influence',
      effects: ['Dialogue success', 'Vendor discounts', 'Faction reputation']
    },
    { 
      id: 'perception', 
      name: 'Perception', 
      icon: '👁️', 
      description: 'Awareness and critical hit chance',
      effects: ['Critical hit chance', 'Hidden location discovery', 'Trap detection']
    },
    { 
      id: 'endurance', 
      name: 'Endurance', 
      icon: '❤️', 
      description: 'Health, stamina, and resilience',
      effects: ['Max health', 'Max stamina', 'Environmental resistance']
    }
  ];

  const handleAllocate = async (attributeId) => {
    if (allocating || !currentCharacter || currentCharacter.attributePoints <= 0) return;
    
    setAllocating(true);
    setError(null);
    
    try {
      const response = await characterApi.allocateAttribute(currentCharacter.id, attributeId);
      
      if (response.success) {
        // Update character in store
        setCurrentCharacter(response.data);
      } else {
        throw new Error(response.message || 'Failed to allocate attribute point');
      }
    } catch (error) {
      console.error('Failed to allocate attribute point:', error);
      setError(error.message || 'Failed to allocate attribute point');
    } finally {
      setAllocating(false);
    }
  };

  if (!currentCharacter) {
    return (
      <div className="attribute-allocation-view">
        <p>No character selected</p>
      </div>
    );
  }

  const availablePoints = currentCharacter.attributePoints || 0;

  return (
    <div className="attribute-allocation-view">
      <div className="header">
        <h3>Attribute Points</h3>
        <div className="points-counter">
          Available: <span className="points-value">{availablePoints}</span>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="attributes-grid">
        {attributes.map(attr => {
          const currentValue = currentCharacter.stats?.[attr.id] || 10;
          const isAtCap = currentValue >= 100;
          const isAtSoftCap = currentValue >= 50;
          
          return (
            <div 
              key={attr.id} 
              className={`attribute-card ${isAtCap ? 'capped' : ''} ${isAtSoftCap ? 'soft-capped' : ''}`}
            >
              <div className="attribute-header">
                <span className="attribute-icon">{attr.icon}</span>
                <div className="attribute-info">
                  <h4>{attr.name}</h4>
                  <p className="attribute-description">{attr.description}</p>
                </div>
              </div>
              
              <div className="attribute-value">
                <span className="current-value">{currentValue}</span>
                {isAtSoftCap && !isAtCap && (
                  <span className="soft-cap-warning">(Soft Cap: 50% effectiveness)</span>
                )}
                {isAtCap && (
                  <span className="hard-cap-warning">(Hard Cap Reached)</span>
                )}
              </div>

              <div className="attribute-effects">
                <strong>Effects:</strong>
                <ul>
                  {attr.effects.map((effect, index) => (
                    <li key={index}>{effect}</li>
                  ))}
                </ul>
              </div>
              
              <button
                className="allocate-button"
                onClick={() => handleAllocate(attr.id)}
                disabled={allocating || availablePoints <= 0 || isAtCap}
                title={isAtCap ? 'Attribute at hard cap (100)' : availablePoints <= 0 ? 'No attribute points available' : `Allocate 1 point to ${attr.name}`}
              >
                +1
              </button>
            </div>
          );
        })}
      </div>

      {availablePoints > 0 && (
        <div className="allocation-hint">
          <p>Click the +1 button next to an attribute to allocate a point.</p>
        </div>
      )}
    </div>
  );
}
```

**CSS File:** `frontend/src/features/character/AttributeAllocationView.css` (NEW)

```css
.attribute-allocation-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.attribute-allocation-view .header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.attribute-allocation-view .header h3 {
  margin: 0;
  font-size: 24px;
}

.points-counter {
  font-size: 18px;
  font-weight: bold;
}

.points-value {
  color: #4CAF50;
  font-size: 24px;
}

.error-message {
  background-color: #f44336;
  color: white;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.attributes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.attribute-card {
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background-color: #fff;
  transition: all 0.3s ease;
}

.attribute-card:hover {
  border-color: #4CAF50;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.attribute-card.soft-capped {
  border-color: #ff9800;
}

.attribute-card.capped {
  border-color: #f44336;
  opacity: 0.7;
}

.attribute-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.attribute-icon {
  font-size: 32px;
}

.attribute-info h4 {
  margin: 0;
  font-size: 18px;
}

.attribute-description {
  margin: 5px 0 0 0;
  color: #666;
  font-size: 14px;
}

.attribute-value {
  margin: 15px 0;
  font-size: 32px;
  font-weight: bold;
  text-align: center;
}

.soft-cap-warning {
  display: block;
  font-size: 12px;
  color: #ff9800;
  margin-top: 5px;
}

.hard-cap-warning {
  display: block;
  font-size: 12px;
  color: #f44336;
  margin-top: 5px;
}

.attribute-effects {
  margin: 15px 0;
  font-size: 14px;
}

.attribute-effects ul {
  margin: 5px 0;
  padding-left: 20px;
}

.allocate-button {
  width: 100%;
  padding: 10px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.allocate-button:hover:not(:disabled) {
  background-color: #45a049;
}

.allocate-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.allocation-hint {
  margin-top: 20px;
  padding: 10px;
  background-color: #e3f2fd;
  border-radius: 4px;
  text-align: center;
  color: #1976d2;
}
```

**Testing:**
- Test UI renders correctly
- Test attribute point allocation
- Test error handling
- Test disabled states (no points, at cap)
- Test character state updates

---

#### Step 1.2.2: Create Skill Tree View Component

**File:** `frontend/src/features/character/SkillTreeView.jsx` (NEW)

**Purpose:** Display skill trees and allow players to allocate skill points.

**Implementation:**

```jsx
import React, { useState } from 'react';
import { useCharacterStore } from '../../state/characterSlice';
import { characterApi } from '../../services/api/characterApi';
import { SKILL_DEFINITIONS } from '../../data/skills';
import { ProgressionSystem } from '../../core/progression/ProgressionSystem';
import './SkillTreeView.css';

export default function SkillTreeView() {
  const { currentCharacter, setCurrentCharacter } = useCharacterStore();
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
        setCurrentCharacter(response.data);
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
    const currentLevel = currentCharacter?.skills?.[tree]?.[skillId]?.level || 0;
    const skillDef = SKILL_DEFINITIONS[tree]?.[skillId];
    if (!skillDef) return { status: 'unknown', level: 0 };
    
    const progressionSystem = new ProgressionSystem(currentCharacter);
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
          
          return (
            <div key={skillId} className={`skill-card ${status.status}`}>
              <div className="skill-header">
                <h4>{skillDef.name}</h4>
                <span className="skill-level">
                  {currentLevel > 0 ? `${currentLevel}/${maxLevel}` : `0/${maxLevel}`}
                </span>
              </div>
              
              <p className="skill-description">{skillDef.description}</p>
              
              {skillDef.prerequisites && (
                <div className="prerequisites">
                  <strong>Requires:</strong>
                  {skillDef.prerequisites.level && (
                    <span> Level {skillDef.prerequisites.level}</span>
                  )}
                  {skillDef.prerequisites.stats && Object.entries(skillDef.prerequisites.stats).map(([stat, value]) => (
                    <span key={stat}> {stat} {value}</span>
                  ))}
                  {skillDef.prerequisites.skills && skillDef.prerequisites.skills.map((prereq, index) => (
                    <span key={index}> {prereq.skill} level {prereq.level}</span>
                  ))}
                </div>
              )}
              
              {skillDef.passives && (
                <div className="passive-bonuses">
                  <strong>Bonuses:</strong>
                  {Object.entries(skillDef.passives).map(([bonus, value]) => (
                    <span key={bonus}> +{value}{bonus.includes('%') ? '' : '%'} {bonus} per level</span>
                  ))}
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
```

**Note:** This assumes `ProgressionSystem.canUnlockSkill()` exists. If not, implement it or use prerequisite checking logic directly.

**CSS File:** `frontend/src/features/character/SkillTreeView.css` (NEW)

```css
.skill-tree-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.skill-tree-view .header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.tree-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 2px solid #ddd;
}

.tree-tab {
  padding: 10px 20px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.tree-tab:hover {
  background-color: #f5f5f5;
}

.tree-tab.active {
  border-bottom-color: #4CAF50;
  font-weight: bold;
}

.tree-icon {
  font-size: 20px;
}

.skills-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.skill-card {
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background-color: #fff;
}

.skill-card.available {
  border-color: #4CAF50;
}

.skill-card.locked {
  border-color: #ccc;
  opacity: 0.6;
}

.skill-card.maxed {
  border-color: #2196F3;
}

.skill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.skill-header h4 {
  margin: 0;
  font-size: 18px;
}

.skill-level {
  font-weight: bold;
  color: #666;
}

.skill-description {
  margin: 10px 0;
  color: #666;
  font-size: 14px;
}

.prerequisites, .passive-bonuses {
  margin: 10px 0;
  font-size: 14px;
  color: #555;
}

.skill-actions {
  margin-top: 15px;
}

.unlock-button, .upgrade-button {
  width: 100%;
  padding: 10px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.unlock-button:hover:not(:disabled),
.upgrade-button:hover:not(:disabled) {
  background-color: #45a049;
}

.unlock-button:disabled,
.upgrade-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.maxed-indicator, .locked-reason {
  display: block;
  padding: 10px;
  text-align: center;
  color: #666;
  font-size: 14px;
  font-style: italic;
}
```

**Testing:**
- Test UI renders correctly
- Test skill point allocation
- Test prerequisite checking
- Test error handling
- Test disabled states
- Test character state updates

---

#### Step 1.2.3: Integrate Allocation Views into Character Sheet

**File:** `frontend/src/features/character/CharacterSheet.jsx` (or wherever character UI is)

**Purpose:** Add tabs or sections for attribute and skill allocation.

**Implementation:**

```jsx
// Add tabs or sections
import AttributeAllocationView from './AttributeAllocationView';
import SkillTreeView from './SkillTreeView';

// In component:
const [activeTab, setActiveTab] = useState('overview');

// In render:
<div className="character-sheet-tabs">
  <button onClick={() => setActiveTab('overview')}>Overview</button>
  <button onClick={() => setActiveTab('attributes')}>Attributes</button>
  <button onClick={() => setActiveTab('skills')}>Skills</button>
  {/* ... other tabs ... */}
</div>

<div className="character-sheet-content">
  {activeTab === 'overview' && <CharacterOverview />}
  {activeTab === 'attributes' && <AttributeAllocationView />}
  {activeTab === 'skills' && <SkillTreeView />}
  {/* ... other tabs ... */}
</div>
```

**Testing:**
- Test tab navigation
- Test views render correctly
- Test state persistence

---

### Acceptance Criteria

- [ ] Attribute allocation UI created and functional
- [ ] Skill tree UI created and functional
- [ ] Both UIs integrated into character sheet
- [ ] Points can be allocated successfully
- [ ] Character state updates correctly after allocation
- [ ] Error handling works correctly
- [ ] Disabled states work correctly (no points, prerequisites not met, etc.)
- [ ] UI is responsive and user-friendly

---

### Testing Checklist

- [ ] **Unit Tests:**
  - [ ] Test attribute allocation component renders
  - [ ] Test skill tree component renders
  - [ ] Test prerequisite checking logic

- [ ] **Integration Tests:**
  - [ ] Test allocating attribute points
  - [ ] Test allocating skill points
  - [ ] Test character state updates
  - [ ] Test API calls work correctly

- [ ] **UI/UX Tests:**
  - [ ] Test on different screen sizes
  - [ ] Test error messages display correctly
  - [ ] Test disabled states are clear
  - [ ] Test tooltips and hints

---

## Task 1.3: Auto-Unlock Item Abilities

**Priority:** CRITICAL  
**Estimated Time:** 1 day  
**Dependencies:** None  
**Risk Level:** Low

### Objective

Ensure that when a player equips an item that grants an ability, that ability is automatically unlocked and added to their ability list.

### Current State

- ✅ `inventoryService.equipItem()` already has ability unlock code (lines 144-162)
- ✅ Frontend `inventorySlice.js` already handles ability unlock notifications (lines 82-102)
- ⚠️ **Needs Verification:** Ensure the system works end-to-end

### Implementation Steps

#### Step 1.3.1: Verify Backend Implementation

**File:** `backend/src/services/inventoryService.js`

**Current Code (lines 144-162):**
```javascript
// Check if item unlocks a permanent ability
let abilityUnlocked = null;
const itemDef = itemDefinitions[itemId];
if (itemDef && itemDef.stats?.permanentAbility) {
  try {
    const abilityService = require('./abilityService');
    const unlockResult = await abilityService.unlockAbility(characterId, itemId);
    if (unlockResult.success) {
      console.log(`[Inventory Service] Unlocked ability "${unlockResult.ability}" for character ${characterId} from item ${itemId}`);
      abilityUnlocked = {
        ability: unlockResult.ability,
        message: unlockResult.message
      };
    }
  } catch (error) {
    console.error('[Inventory Service] Failed to unlock ability:', error);
    // Don't fail equipment if ability unlock fails
  }
}
```

**Verification Tasks:**
1. Check if `abilityService.unlockAbility()` exists and works correctly
2. Verify `itemDefinitions[itemId]` is accessible (may need to use `getItemDefinition()`)
3. Test with an item that has `stats.permanentAbility`
4. Verify ability is added to character's abilities array

**Potential Issues:**
- `itemDefinitions` may not be imported correctly
- `abilityService.unlockAbility()` may not exist or work correctly
- Ability may not be persisted to character

**Fixes (if needed):**

```javascript
// Replace itemDefinitions[itemId] with:
const { getItemDefinition } = require('../data/items');
const itemDef = getItemDefinition(itemId);

// Verify abilityService exists and works:
const abilityService = require('./abilityService');
// Check if unlockAbility method exists
if (!abilityService.unlockAbility) {
  console.error('[Inventory Service] abilityService.unlockAbility not found');
  // May need to implement or fix abilityService
}
```

**Testing:**
- Test equipping item with `permanentAbility`
- Verify ability is added to character.abilities
- Verify notification is sent to frontend
- Test error handling (ability unlock fails)

---

#### Step 1.3.2: Verify Frontend Implementation

**File:** `frontend/src/state/inventorySlice.js`

**Current Code (lines 82-102):**
```javascript
// Check if ability was unlocked
if (response.data?.abilityUnlocked) {
  const abilityInfo = response.data.abilityUnlocked;
  const abilityName = abilityInfo.ability.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  notify(
    `✨ Ability Unlocked: ${abilityName}`,
    'success',
    6000
  );
  
  // Reload character to get updated abilities
  const { useCharacterStore } = await import('./characterSlice');
  const characterStore = useCharacterStore.getState();
  if (characterStore.currentCharacter?.id === characterId && characterStore.loadCharacter) {
    try {
      await characterStore.loadCharacter(characterId);
    } catch (err) {
      console.warn('[Inventory] Failed to reload character after ability unlock:', err);
    }
  }
}
```

**Verification Tasks:**
1. Verify `notify` function exists and works
2. Verify character reload works correctly
3. Test notification displays correctly
4. Verify ability appears in ability list after unlock

**Testing:**
- Test equipping item with ability
- Verify notification appears
- Verify character reloads
- Verify ability appears in ability list

---

#### Step 1.3.3: Test End-to-End

**Test Cases:**

1. **Equip Item with Ability:**
   - Equip an item that has `stats.permanentAbility`
   - Verify ability is unlocked
   - Verify notification appears
   - Verify ability appears in ability list

2. **Equip Item without Ability:**
   - Equip an item without `permanentAbility`
   - Verify no error occurs
   - Verify no notification appears

3. **Error Handling:**
   - Test with invalid item
   - Test with ability service failure
   - Verify equipment still succeeds even if ability unlock fails

---

### Acceptance Criteria

- [ ] Items with `permanentAbility` automatically unlock abilities when equipped
- [ ] Ability is added to character's abilities array
- [ ] Notification is shown to player
- [ ] Ability appears in ability list
- [ ] Equipment succeeds even if ability unlock fails (graceful degradation)
- [ ] No errors occur when equipping items without abilities

---

### Testing Checklist

- [ ] **Unit Tests:**
  - [ ] Test `equipItem()` with item that has ability
  - [ ] Test `equipItem()` with item without ability
  - [ ] Test error handling

- [ ] **Integration Tests:**
  - [ ] Equip item with ability, verify unlock
  - [ ] Verify ability appears in character data
  - [ ] Verify notification appears
  - [ ] Test ability unlock failure doesn't break equipment

---

## Task 1.4: Apply Perception Critical Chance

**Priority:** HIGH  
**Estimated Time:** 1 day  
**Dependencies:** None  
**Risk Level:** Low

### Objective

Make the Perception attribute affect critical hit chance in combat, replacing the hardcoded 5% base critical chance.

### Current State

- ❌ Critical chance is hardcoded to 5% in `calculateDamage()` (line 571)
- ❌ Perception attribute does not affect critical chance
- ✅ Perception is stored in character stats and combatant stats

### Implementation Steps

#### Step 1.4.1: Update calculateDamage Method

**File:** `backend/src/services/combatService.js`

**Location:** `calculateDamage()` method (around line 532)

**Current Code (lines 570-576):**
```javascript
// Critical hit chance (5% base, modified by luck bonus if present)
let criticalChance = 0.05;
if (attacker.luckModifiers && attacker.luckModifiers.luckBonus) {
  criticalChance += attacker.luckModifiers.luckBonus;
}
const criticalRoll = Math.random();
const isCritical = criticalRoll <= criticalChance;
```

**New Code:**
```javascript
// Critical hit chance calculation
// Base: 5%
// Perception: +1% per point above 10 (e.g., 15 perception = +5% = 10% total)
// Luck modifiers: Additional bonus from items/effects
const baseCritChance = 0.05; // 5% base

// Get perception from attacker stats
const perception = attacker.stats.perception || 10;
const perceptionBonus = Math.max(0, (perception - 10) * 0.01); // +1% per point above 10

// Apply luck modifiers if present
let luckBonus = 0;
if (attacker.luckModifiers && attacker.luckModifiers.luckBonus) {
  luckBonus = attacker.luckModifiers.luckBonus;
}

// Calculate final critical chance (cap at 50% to prevent overpowered builds)
const finalCritChance = Math.min(0.50, baseCritChance + perceptionBonus + luckBonus);

const criticalRoll = Math.random();
const isCritical = criticalRoll <= finalCritChance;
```

**Testing:**
- Test with different perception values (10, 15, 20, 25, 30)
- Test with luck modifiers
- Test critical chance cap (50%)
- Verify critical hits occur at expected rates

---

#### Step 1.4.2: Update buildPlayerCombatant Method (Optional)

**File:** `backend/src/services/combatService.js`

**Purpose:** Store calculated critical chance in combatant stats for reference/debugging.

**Location:** `buildPlayerCombatant()` method (around line 235)

**Add to stats object:**
```javascript
stats: {
  // ... existing stats ...
  critChance: baseCritChance + perceptionBonus, // Store for reference
  // ... rest of stats ...
}
```

**Note:** This is optional but helpful for debugging and UI display.

---

### Acceptance Criteria

- [ ] Critical chance is calculated from Perception attribute
- [ ] Base critical chance is 5%
- [ ] Each point of Perception above 10 adds 1% critical chance
- [ ] Critical chance is capped at 50%
- [ ] Luck modifiers still apply
- [ ] Critical hits occur at expected rates in testing

---

### Testing Checklist

- [ ] **Unit Tests:**
  - [ ] Test critical chance calculation with different perception values
  - [ ] Test critical chance cap (50%)
  - [ ] Test luck modifiers still work

- [ ] **Integration Tests:**
  - [ ] Enter combat with different perception values
  - [ ] Verify critical hits occur at expected rates
  - [ ] Test with luck modifiers

- [ ] **Balance Tests:**
  - [ ] Verify critical chance feels balanced
  - [ ] Test with max perception (should be capped at 50%)

---

## Phase 1 Summary

### Timeline

- **Week 1:**
  - Days 1-2: Task 1.1 (Apply Skill Passive Bonuses)
  - Days 3-4: Task 1.2 (Create Point Allocation UIs)
  - Day 5: Task 1.3 (Auto-Unlock Item Abilities) + Task 1.4 (Apply Perception Critical Chance)

- **Week 2:**
  - Days 1-2: Testing and bug fixes
  - Days 3-4: Integration testing
  - Day 5: Final review and documentation

### Dependencies

- None - All tasks can be worked on independently

### Risk Assessment

- **Task 1.1:** Medium risk - Touches multiple systems, needs thorough testing
- **Task 1.2:** Low risk - New UI components, isolated changes
- **Task 1.3:** Low risk - Mostly verification, code already exists
- **Task 1.4:** Low risk - Simple calculation change

### Success Metrics

- [ ] All four tasks completed
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] No regressions in existing functionality
- [ ] Players can allocate points successfully
- [ ] Skills provide mechanical benefits
- [ ] Item abilities unlock automatically
- [ ] Perception affects critical chance

---

## Next Steps After Phase 1

Once Phase 1 is complete, proceed to **Phase 2: Core Gameplay Loop** which includes:
- Revised attribute progression
- Species & background bonuses
- Milestone rewards
- Skills in non-combat systems

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Status:** Ready for Implementation

