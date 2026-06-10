# Stamina System Enhancements - Requirements & Implementation Plan

## Document Overview

This document provides comprehensive requirements and step-by-step implementation plans for enhancing the Stamina system. The enhancements are organized by priority (High, Medium, Low) and include detailed technical specifications, code examples, testing requirements, and integration points.

**Last Updated:** 2024
**Status:** Planning Phase
**Estimated Total Implementation Time:** 3-4 weeks (phased approach)

---

## Table of Contents

1. [High Priority Enhancements](#high-priority-enhancements)
   - [1.1 Fix Max Stamina Calculation Inconsistency](#11-fix-max-stamina-calculation-inconsistency)
   - [1.2 Implement Passive Stamina Regeneration](#12-implement-passive-stamina-regeneration)
   - [1.3 Add Endurance Scaling to Backend](#13-add-endurance-scaling-to-backend)
2. [Medium Priority Enhancements](#medium-priority-enhancements)
   - [2.1 Expand Stamina Integration](#21-expand-stamina-integration)
   - [2.2 Skill-Based Stamina Bonuses](#22-skill-based-stamina-bonuses)
   - [2.3 Stamina Regeneration Modifiers](#23-stamina-regeneration-modifiers)
3. [Low Priority Enhancements](#low-priority-enhancements)
   - [3.1 Rest Action Clarification](#31-rest-action-clarification)
   - [3.2 UI Visualization Enhancements](#32-ui-visualization-enhancements)
   - [3.3 Stamina-Based Status Effects](#33-stamina-based-status-effects)
4. [Implementation Timeline](#implementation-timeline)
5. [Testing Strategy](#testing-strategy)
6. [Risk Assessment](#risk-assessment)

---

## High Priority Enhancements

### 1.1 Fix Max Stamina Calculation Inconsistency

#### Requirements

**Problem Statement:**
- Backend calculates max stamina as: `100 + (level * 5)`
- Frontend calculates max stamina as: `100 + (endurance * 5) + (level * 3)`
- This inconsistency causes UI to display incorrect values and potential gameplay issues

**Requirements:**
1. Unify max stamina calculation across frontend and backend
2. Include Endurance attribute in calculation (thematically appropriate)
3. Ensure calculation is consistent on level up and attribute allocation
4. Maintain backward compatibility with existing characters

**Acceptance Criteria:**
- ✅ Backend and frontend use identical formula
- ✅ Max stamina updates correctly on level up
- ✅ Max stamina updates correctly on attribute point allocation
- ✅ Existing characters migrate correctly
- ✅ UI displays accurate max stamina values

#### Implementation Plan

**Step 1: Define Unified Formula**

**Formula:**
```javascript
maxStamina = 100 + (endurance * 5) + (level * 5)
```

**Rationale:**
- Base 100 ensures all characters start with meaningful stamina
- Endurance * 5 provides attribute scaling (thematically appropriate)
- Level * 5 provides progression (matches health system pattern)

**Files to Modify:**
- `backend/src/models/PlayerCharacter.js`
- `frontend/src/core/character/CharacterManager.js`

---

**Step 2: Update Backend Model**

**File:** `backend/src/models/PlayerCharacter.js`

**Changes:**

1. **Add method to calculate max stamina:**
```javascript
PlayerCharacter.prototype.getMaxStamina = function() {
  const endurance = this.stats?.endurance || 10;
  return 100 + (endurance * 5) + (this.level * 5);
};
```

2. **Update `addXP` method to use new calculation:**
```javascript
PlayerCharacter.prototype.addXP = async function(amount) {
  this.xp += amount;
  const leveledUp = [];
  
  while (this.canLevelUp()) {
    this.xp -= this.getXPForNextLevel();
    this.level += 1;
    this.skillPoints += 1;
    
    // Award attribute points every 3 levels (updated from Phase 1)
    if (this.level % 3 === 0) {
      this.attributePoints += 2;
    }
    
    // Award specialization points every 5 levels
    if (this.level % 5 === 0) {
      this.specializationPoints += 1;
    }
    
    // Update max health and stamina using calculated values
    this.maxHealth = this.getMaxHealth();
    this.maxStamina = this.getMaxStamina();
    
    // Restore to new maximums
    this.currentHealth = this.maxHealth;
    this.currentStamina = this.maxStamina;
    
    leveledUp.push(this.level);
  }
  
  await this.save();
  return leveledUp;
};
```

3. **Add method to recalculate max stamina (for attribute changes):**
```javascript
PlayerCharacter.prototype.recalculateMaxStamina = function() {
  const newMax = this.getMaxStamina();
  const oldMax = this.maxStamina;
  this.maxStamina = newMax;
  
  // If current stamina exceeds new max, cap it
  if (this.currentStamina > newMax) {
    this.currentStamina = newMax;
  }
  
  // If max increased, optionally restore some stamina proportionally
  // (Optional: maintain percentage instead of absolute value)
  if (newMax > oldMax) {
    const staminaPercent = this.currentStamina / oldMax;
    this.currentStamina = Math.floor(newMax * staminaPercent);
  }
  
  return this.maxStamina;
};
```

**Testing:**
- Unit test: `getMaxStamina()` with various endurance/level combinations
- Integration test: Level up updates max stamina correctly
- Integration test: Attribute allocation updates max stamina correctly

---

**Step 3: Update Character Service**

**File:** `backend/src/services/characterService.js`

**Changes:**

1. **Update `allocateAttributePoint` to recalculate max stamina:**
```javascript
async allocateAttributePoint(characterId, attributeId) {
  const character = await PlayerCharacter.findByPk(characterId);
  if (!character) {
    throw new Error('Character not found');
  }
  
  // ... existing allocation logic ...
  
  // If Endurance was increased, recalculate max stamina
  if (attributeId === 'endurance') {
    character.recalculateMaxStamina();
  }
  
  character.changed('stats', true);
  await character.save();
  
  return {
    success: true,
    newValue: character.stats[attributeId],
    cost: check.cost,
    remainingPoints: character.attributePoints,
    maxStamina: character.maxStamina // Include in response
  };
}
```

**Testing:**
- Integration test: Allocating Endurance updates max stamina
- Integration test: Allocating other attributes doesn't affect max stamina

---

**Step 4: Update Frontend CharacterManager**

**File:** `frontend/src/core/character/CharacterManager.js`

**Changes:**

1. **Update `getMaxStamina` method:**
```javascript
getMaxStamina() {
  const endurance = this.stats?.endurance || 10;
  return 100 + (endurance * 5) + (this.level * 5);
}
```

**Note:** This should now match the backend calculation exactly.

**Testing:**
- Unit test: `getMaxStamina()` matches backend calculation
- Visual test: UI displays correct max stamina values

---

**Step 5: Create Migration Script (Optional)**

**File:** `backend/src/migrations/fixMaxStaminaCalculation.js`

**Purpose:** Update existing characters to use new max stamina calculation

**Script:**
```javascript
const { PlayerCharacter } = require('../models');

async function migrateMaxStamina() {
  const characters = await PlayerCharacter.findAll();
  
  for (const character of characters) {
    const endurance = character.stats?.endurance || 10;
    const newMax = 100 + (endurance * 5) + (character.level * 5);
    
    // Only update if different
    if (character.maxStamina !== newMax) {
      const oldMax = character.maxStamina;
      character.maxStamina = newMax;
      
      // Maintain percentage of stamina
      const staminaPercent = character.currentStamina / oldMax;
      character.currentStamina = Math.floor(newMax * staminaPercent);
      
      await character.save();
      console.log(`Updated character ${character.id}: ${oldMax} -> ${newMax} stamina`);
    }
  }
  
  console.log(`Migration complete. Updated ${characters.length} characters.`);
}

module.exports = migrateMaxStamina;
```

**Testing:**
- Test on development database with sample characters
- Verify stamina percentages are maintained
- Verify no data loss occurs

---

**Step 6: Update API Responses**

**Files:** All API endpoints that return character data

**Changes:**
- Ensure `maxStamina` is always included in character responses
- Ensure calculation is done server-side (backend is source of truth)

**Testing:**
- API test: Character endpoints return correct max stamina
- Integration test: Frontend receives and displays correct values

---

**Implementation Checklist:**
- [ ] Add `getMaxStamina()` method to PlayerCharacter model
- [ ] Update `addXP()` to use new calculation
- [ ] Add `recalculateMaxStamina()` method
- [ ] Update `allocateAttributePoint()` to recalculate on Endurance changes
- [ ] Update frontend `CharacterManager.getMaxStamina()`
- [ ] Create migration script (optional)
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Test with existing characters
- [ ] Update API documentation

**Estimated Time:** 4-6 hours

---

### 1.2 Implement Passive Stamina Regeneration

#### Requirements

**Problem Statement:**
- Stamina does not regenerate passively (unlike health)
- Players must rely on consumables or rest, creating frustrating gameplay
- Health has `HealthRegenService` but stamina has no equivalent

**Requirements:**
1. Create `StaminaRegenService` similar to `HealthRegenService`
2. Implement passive regeneration outside combat
3. Allow skills/items to modify regeneration rate
4. Provide clear UI feedback about regeneration

**Acceptance Criteria:**
- ✅ Stamina regenerates passively outside combat
- ✅ Regeneration rate is configurable
- ✅ Skills/items can modify regeneration
- ✅ UI shows regeneration status
- ✅ Regeneration pauses during combat

#### Implementation Plan

**Step 1: Create StaminaRegenService**

**File:** `backend/src/services/staminaRegenService.js`

**Structure:**
```javascript
/**
 * Stamina Regeneration Service
 * Handles time-based automatic stamina regeneration
 */

const { PlayerCharacter, CombatEncounter } = require('../models');
const { ProgressionSystem } = require('../utils/progressionSystem');

class StaminaRegenService {
  /**
   * Process stamina regeneration for a character
   * @param {string} characterId - Character UUID
   * @returns {Promise<Object>} Regeneration result
   */
  async processRegeneration(characterId) {
    const character = await PlayerCharacter.findByPk(characterId);
    
    if (!character) {
      throw new Error('Character not found');
    }

    // Check if character is in combat
    const inCombat = await this.isInCombat(characterId);
    if (inCombat) {
      return {
        regenerated: false,
        reason: 'in_combat',
        message: 'Cannot regenerate stamina during combat'
      };
    }

    // Check if character is at full stamina
    if (character.currentStamina >= character.maxStamina) {
      return {
        regenerated: false,
        reason: 'full_stamina',
        message: 'Character is already at full stamina'
      };
    }

    // Calculate regeneration amount
    const regenAmount = await this.calculateRegenAmount(character);
    const oldStamina = character.currentStamina;
    const newStamina = Math.min(character.maxStamina, character.currentStamina + regenAmount);
    
    character.currentStamina = newStamina;
    await character.save();

    return {
      regenerated: true,
      amount: newStamina - oldStamina,
      oldStamina,
      newStamina,
      maxStamina: character.maxStamina,
      regenRate: await this.getRegenRate(character) // For UI display
    };
  }

  /**
   * Check if character is in active combat
   * @param {string} characterId - Character UUID
   * @returns {Promise<boolean>} True if in combat
   */
  async isInCombat(characterId) {
    const activeCombat = await CombatEncounter.findOne({
      where: {
        characterId,
        status: 'active'
      }
    });

    return !!activeCombat;
  }

  /**
   * Calculate regeneration amount per tick
   * @param {Object} character - Character object
   * @returns {Promise<number>} Stamina points to regenerate
   */
  async calculateRegenAmount(character) {
    // Base regeneration: 1% of max stamina per minute
    // With regeneration tick every 30 seconds, that's 0.5% per tick
    const baseRegenPercent = 0.005; // 0.5% per tick (30 seconds)
    const baseRegen = Math.floor(character.maxStamina * baseRegenPercent);

    // Get regeneration modifiers from skills/items
    const regenModifier = await this.getRegenModifier(character);
    const modifiedRegen = Math.floor(baseRegen * regenModifier);

    // Minimum 1 stamina per tick
    return Math.max(1, modifiedRegen);
  }

  /**
   * Get regeneration rate modifier from skills/items
   * @param {Object} character - Character object
   * @returns {Promise<number>} Multiplier (1.0 = base, 1.5 = 50% faster, etc.)
   */
  async getRegenModifier(character) {
    let modifier = 1.0;

    // Check skill bonuses
    const progressionSystem = new ProgressionSystem(character);
    const passiveBonuses = progressionSystem.getPassiveBonuses();
    
    // Example: Survival tree could have stamina regen bonus
    // const survivalLevel = progressionSystem.getSkillLevel('survival', 'field_medic');
    // modifier += survivalLevel * 0.05; // +5% per level

    // Check equipped items (TODO: implement when item system supports this)
    // const equippedItems = await getEquippedItems(character.id);
    // for (const item of equippedItems) {
    //   if (item.stats?.staminaRegenBonus) {
    //     modifier += item.stats.staminaRegenBonus;
    //   }
    // }

    return modifier;
  }

  /**
   * Get current regeneration rate (for UI display)
   * @param {Object} character - Character object
   * @returns {Promise<number>} Stamina per minute
   */
  async getRegenRate(character) {
    const regenPerTick = await this.calculateRegenAmount(character);
    return regenPerTick * 2; // 2 ticks per minute = per minute rate
  }

  /**
   * Process regeneration for all active characters
   * This would be called periodically (e.g., every 30 seconds)
   * @returns {Promise<Array>} Array of regeneration results
   */
  async processAllRegeneration() {
    // Get all characters that are not at full stamina
    const characters = await PlayerCharacter.findAll({
      where: {
        currentStamina: {
          [require('sequelize').Op.lt]: require('sequelize').col('max_stamina')
        }
      }
    });

    const results = [];
    for (const character of characters) {
      try {
        const result = await this.processRegeneration(character.id);
        results.push({
          characterId: character.id,
          ...result
        });
      } catch (error) {
        console.error(`Failed to process stamina regeneration for character ${character.id}:`, error);
        results.push({
          characterId: character.id,
          regenerated: false,
          error: error.message
        });
      }
    }

    return results;
  }
}

module.exports = new StaminaRegenService();
```

**Testing:**
- Unit test: `calculateRegenAmount()` with various max stamina values
- Unit test: `getRegenModifier()` with skills/items
- Integration test: `processRegeneration()` updates character
- Integration test: Regeneration pauses during combat

---

**Step 2: Create Background Job/Scheduler**

**File:** `backend/src/jobs/staminaRegenJob.js`

**Purpose:** Periodically call `staminaRegenService.processAllRegeneration()`

**Options:**

**Option A: Using node-cron**
```javascript
const cron = require('node-cron');
const staminaRegenService = require('../services/staminaRegenService');

// Run every 30 seconds
cron.schedule('*/30 * * * * *', async () => {
  try {
    await staminaRegenService.processAllRegeneration();
  } catch (error) {
    console.error('Stamina regeneration job failed:', error);
  }
});
```

**Option B: Using setInterval (simpler)**
```javascript
const staminaRegenService = require('../services/staminaRegenService');

// Run every 30 seconds
setInterval(async () => {
  try {
    await staminaRegenService.processAllRegeneration();
  } catch (error) {
    console.error('Stamina regeneration job failed:', error);
  }
}, 30000); // 30 seconds
```

**Integration:**
- Add to `backend/src/server.js` or `backend/src/app.js`
- Ensure it starts with the server
- Handle graceful shutdown

**Testing:**
- Integration test: Job runs periodically
- Integration test: Multiple characters regenerate correctly
- Performance test: Job doesn't block server

---

**Step 3: Add API Endpoint for Regeneration Status**

**File:** `backend/src/controllers/characterController.js`

**New Endpoint:**
```javascript
/**
 * Get stamina regeneration status
 * GET /api/characters/:id/stamina-regen
 */
async getStaminaRegenStatus(req, res) {
  try {
    const { id } = req.params;
    const staminaRegenService = require('../services/staminaRegenService');
    
    const character = await PlayerCharacter.findByPk(id);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const regenRate = await staminaRegenService.getRegenRate(character);
    const inCombat = await staminaRegenService.isInCombat(id);
    const isFull = character.currentStamina >= character.maxStamina;

    res.json({
      regenRate, // Stamina per minute
      inCombat,
      isFull,
      canRegenerate: !inCombat && !isFull,
      nextRegenIn: inCombat || isFull ? null : 30 // seconds until next tick
    });
  } catch (error) {
    console.error('Error getting stamina regen status:', error);
    res.status(500).json({ error: 'Failed to get stamina regen status' });
  }
}
```

**Route:**
```javascript
// In backend/src/routes/characterRoutes.js
router.get('/:id/stamina-regen', characterController.getStaminaRegenStatus);
```

**Testing:**
- API test: Endpoint returns correct regeneration status
- Integration test: Status updates correctly based on combat state

---

**Step 4: Update Frontend UI**

**File:** `frontend/src/components/hud/StatsBar.jsx`

**Changes:**

1. **Add regeneration indicator:**
```jsx
import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../state/characterSlice';
import api from '../../utils/api';

export default function StatsBar({ character, onOpenInventory, onOpenCharacterSheet }) {
  const [regenInfo, setRegenInfo] = useState(null);
  const { currentCharacter } = useCharacterStore();

  useEffect(() => {
    if (!character?.id) return;

    const fetchRegenInfo = async () => {
      try {
        const response = await api.get(`/characters/${character.id}/stamina-regen`);
        setRegenInfo(response.data);
      } catch (error) {
        console.error('Failed to fetch stamina regen info:', error);
      }
    };

    fetchRegenInfo();
    const interval = setInterval(fetchRegenInfo, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [character?.id]);

  const staminaPercent = character.maxStamina > 0 
    ? (character.currentStamina / character.maxStamina) * 100 
    : 0;

  return (
    <div className="stats-bar">
      {/* ... existing code ... */}
      
      <div className="stat-item stamina">
        <div className="stat-label">
          Stamina
          {regenInfo?.canRegenerate && (
            <span className="regen-indicator" title={`Regenerating ${regenInfo.regenRate}/min`>
              ↻ {regenInfo.regenRate}/min
            </span>
          )}
        </div>
        <div className="stat-bar-container">
          <div 
            className="stat-bar-fill stamina-fill" 
            style={{ width: `${staminaPercent}%` }}
          />
          <div className="stat-bar-text">
            {character.currentStamina || 0} / {character.maxStamina || 0}
          </div>
        </div>
      </div>
      
      {/* ... rest of component ... */}
    </div>
  );
}
```

**File:** `frontend/src/components/hud/StatsBar.css`

**Add styles:**
```css
.regen-indicator {
  font-size: 0.75em;
  color: var(--success-color);
  margin-left: 0.5em;
  opacity: 0.8;
}

.regen-indicator::before {
  content: "↻ ";
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

**Testing:**
- Visual test: Regeneration indicator appears when regenerating
- Integration test: Indicator updates correctly based on combat state

---

**Step 5: Add Skill Bonuses (Optional - Can be Phase 2)**

**File:** `backend/src/data/skills.js`

**Add stamina regen bonuses to skills:**
```javascript
survival: {
  field_medic: {
    name: 'Field Medic',
    description: 'Medical training and field experience',
    maxLevel: 5,
    passives: {
      staminaRegenBonus: 0.05 // +5% per level
    }
  },
  // ... other skills
}
```

**Update ProgressionSystem:**
```javascript
// In getPassiveBonuses()
if (bonusType === 'staminaRegenBonus') {
  bonuses.other.staminaRegenBonus = (bonuses.other.staminaRegenBonus || 0) + scaledValue;
}
```

**Update StaminaRegenService:**
```javascript
async getRegenModifier(character) {
  let modifier = 1.0;
  const progressionSystem = new ProgressionSystem(character);
  const passiveBonuses = progressionSystem.getPassiveBonuses();
  
  // Add stamina regen bonus from skills
  if (passiveBonuses.other?.staminaRegenBonus) {
    modifier += passiveBonuses.other.staminaRegenBonus / 100; // Convert % to multiplier
  }
  
  return modifier;
}
```

**Testing:**
- Unit test: Skill bonuses apply correctly
- Integration test: Higher skill levels = faster regeneration

---

**Implementation Checklist:**
- [ ] Create `StaminaRegenService` class
- [ ] Implement `processRegeneration()` method
- [ ] Implement `calculateRegenAmount()` method
- [ ] Implement `getRegenModifier()` method
- [ ] Create background job/scheduler
- [ ] Add API endpoint for regen status
- [ ] Update frontend UI with regeneration indicator
- [ ] Add skill bonuses (optional)
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Test regeneration in various scenarios
- [ ] Performance testing

**Estimated Time:** 8-10 hours

---

### 1.3 Add Endurance Scaling to Backend

#### Requirements

**Problem Statement:**
- Backend doesn't use Endurance in max stamina calculation
- This makes Endurance less valuable for stamina-focused builds
- Inconsistent with health system (which uses Endurance)

**Requirements:**
1. Update backend to include Endurance in max stamina calculation
2. Ensure calculation updates on attribute allocation
3. Maintain consistency with frontend

**Acceptance Criteria:**
- ✅ Backend uses Endurance in max stamina calculation
- ✅ Max stamina updates when Endurance changes
- ✅ Calculation matches frontend

#### Implementation Plan

**Note:** This is partially covered in Section 1.1, but this section focuses specifically on ensuring Endurance scaling works correctly.

**Step 1: Verify getMaxStamina Uses Endurance**

**File:** `backend/src/models/PlayerCharacter.js`

**Ensure method exists:**
```javascript
PlayerCharacter.prototype.getMaxStamina = function() {
  const endurance = this.stats?.endurance || 10;
  return 100 + (endurance * 5) + (this.level * 5);
};
```

**Step 2: Ensure Attribute Allocation Updates Max Stamina**

**File:** `backend/src/services/characterService.js`

**Verify `allocateAttributePoint` includes:**
```javascript
// If Endurance was increased, recalculate max stamina
if (attributeId === 'endurance') {
  character.recalculateMaxStamina();
}
```

**Step 3: Add Validation**

**File:** `backend/src/models/PlayerCharacter.js`

**Add validation to ensure Endurance is always considered:**
```javascript
// In model definition, add hook
PlayerCharacter.afterUpdate(async (character) => {
  // If stats.endurance changed, recalculate max stamina
  if (character.changed('stats')) {
    const oldEndurance = character.previous('stats')?.endurance;
    const newEndurance = character.stats?.endurance;
    
    if (oldEndurance !== newEndurance) {
      character.recalculateMaxStamina();
      await character.save();
    }
  }
});
```

**Testing:**
- Unit test: `getMaxStamina()` includes Endurance
- Integration test: Allocating Endurance updates max stamina
- Integration test: Max stamina calculation is consistent

---

**Implementation Checklist:**
- [ ] Verify `getMaxStamina()` uses Endurance
- [ ] Ensure attribute allocation updates max stamina
- [ ] Add validation hooks
- [ ] Write tests
- [ ] Verify consistency with frontend

**Estimated Time:** 2-3 hours (mostly covered in 1.1)

---

## Medium Priority Enhancements

### 2.1 Expand Stamina Integration

#### Requirements

**Problem Statement:**
- Stamina only affects combat abilities
- No stamina cost for movement, lockpicking, crafting, etc.
- Missed opportunity for resource management depth

**Requirements:**
1. Add stamina costs for movement actions (sprinting)
2. Optionally add stamina costs for skill checks (lockpicking, hacking)
3. Optionally add stamina costs for crafting
4. Provide clear UI feedback for stamina costs

**Acceptance Criteria:**
- ✅ Sprinting consumes stamina
- ✅ Optional: Skill checks consume stamina
- ✅ Optional: Crafting consumes stamina
- ✅ UI shows stamina costs before actions
- ✅ Actions are blocked if insufficient stamina

#### Implementation Plan

**Step 1: Add Sprinting Mechanic**

**File:** `backend/src/services/movementService.js` (or create if doesn't exist)

**Add sprinting:**
```javascript
const { PlayerCharacter } = require('../models');

class MovementService {
  /**
   * Move character with optional sprinting
   * @param {string} characterId - Character UUID
   * @param {number} deltaX - X movement
   * @param {number} deltaY - Y movement
   * @param {boolean} sprinting - Whether character is sprinting
   * @returns {Promise<Object>} Movement result
   */
  async moveCharacter(characterId, deltaX, deltaY, sprinting = false) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    // Calculate movement cost
    const baseCost = 1; // 1 stamina per tile
    const sprintCost = sprinting ? 2 : 0; // +2 stamina if sprinting
    const totalCost = baseCost + sprintCost;

    // Check stamina
    if (character.currentStamina < totalCost) {
      throw new Error(`Not enough stamina. Need ${totalCost}, have ${character.currentStamina}`);
    }

    // Deduct stamina
    character.currentStamina = Math.max(0, character.currentStamina - totalCost);

    // Update location
    character.currentLocation.x += deltaX;
    character.currentLocation.y += deltaY;

    await character.save();

    return {
      success: true,
      newLocation: character.currentLocation,
      staminaCost: totalCost,
      remainingStamina: character.currentStamina
    };
  }
}

module.exports = new MovementService();
```

**API Endpoint:**
```javascript
// In backend/src/controllers/characterController.js
async moveCharacter(req, res) {
  try {
    const { id } = req.params;
    const { deltaX, deltaY, sprinting } = req.body;
    
    const movementService = require('../services/movementService');
    const result = await movementService.moveCharacter(id, deltaX, deltaY, sprinting);
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
```

**Frontend Integration:**
```javascript
// In movement handler
const handleMove = async (deltaX, deltaY, sprinting) => {
  try {
    const response = await api.post(`/characters/${characterId}/move`, {
      deltaX,
      deltaY,
      sprinting
    });
    
    // Update character state
    updateCharacter(response.data.character);
    
    // Show stamina cost feedback
    if (response.data.staminaCost > 0) {
      showNotification(`-${response.data.staminaCost} Stamina`);
    }
  } catch (error) {
    if (error.message.includes('stamina')) {
      showError('Not enough stamina to move!');
    }
  }
};
```

**Testing:**
- Unit test: Movement deducts stamina correctly
- Integration test: Sprinting costs more stamina
- Integration test: Movement blocked with insufficient stamina

---

**Step 2: Add Stamina Cost to Skill Checks (Optional)**

**File:** `backend/src/services/lockpickingService.js`

**Add stamina cost:**
```javascript
async attemptLockpick(characterId, lockId, lockTier, toolQuality = 0, hasAdvantage = false) {
  const character = await PlayerCharacter.findByPk(characterId);
  if (!character) throw new Error('Character not found');

  // Stamina cost based on lock tier
  const staminaCost = 5 + (lockTier * 2); // 5 base + 2 per tier

  // Check stamina
  if (character.currentStamina < staminaCost) {
    throw new Error(`Not enough stamina. Need ${staminaCost}, have ${character.currentStamina}`);
  }

  // Deduct stamina (even if attempt fails)
  character.currentStamina = Math.max(0, character.currentStamina - staminaCost);

  // ... existing lockpicking logic ...

  await character.save();

  return {
    success: result.success,
    chance: result.chance,
    staminaCost,
    remainingStamina: character.currentStamina,
    // ... other return values
  };
}
```

**Similar changes for:**
- `hackingService.js`
- `craftingService.js` (optional)

**Testing:**
- Unit test: Skill checks deduct stamina
- Integration test: Higher tier = more stamina cost
- Integration test: Failed attempts still cost stamina

---

**Step 3: Add Stamina Cost to Crafting (Optional)**

**File:** `backend/src/services/craftingService.js`

**Add stamina cost:**
```javascript
async craftItem(characterId, recipeId, quantity = 1) {
  const character = await PlayerCharacter.findByPk(characterId);
  if (!character) throw new Error('Character not found');

  const recipe = getRecipeDefinition(recipeId);
  if (!recipe) throw new Error('Recipe not found');

  // Stamina cost based on recipe difficulty
  const staminaCost = 10 + (recipe.difficulty * 5); // 10 base + 5 per difficulty
  const totalCost = staminaCost * quantity;

  // Check stamina
  if (character.currentStamina < totalCost) {
    throw new Error(`Not enough stamina. Need ${totalCost}, have ${character.currentStamina}`);
  }

  // Deduct stamina
  character.currentStamina = Math.max(0, character.currentStamina - totalCost);

  // ... existing crafting logic ...

  await character.save();

  return {
    success: true,
    items: craftedItems,
    staminaCost: totalCost,
    remainingStamina: character.currentStamina
  };
}
```

**Testing:**
- Unit test: Crafting deducts stamina
- Integration test: Higher difficulty = more stamina cost
- Integration test: Quantity multiplies cost

---

**Step 4: Update UI to Show Stamina Costs**

**File:** `frontend/src/features/crafting/CraftingView.jsx`

**Add stamina cost display:**
```jsx
const recipeStaminaCost = 10 + (recipe.difficulty * 5);

<button
  className="craft-button"
  onClick={() => handleCraft(selectedRecipe)}
  disabled={!selectedRecipe.canCraft || crafting || currentCharacter.currentStamina < recipeStaminaCost}
  title={`Craft Item (Cost: ${recipeStaminaCost} Stamina)`}
>
  {crafting ? 'Crafting...' : `Craft Item (${recipeStaminaCost} ⚡)`}
</button>
```

**Similar updates for:**
- Movement controls (show sprint stamina cost)
- Lockpicking UI
- Hacking UI

**Testing:**
- Visual test: Stamina costs displayed correctly
- Integration test: Actions disabled with insufficient stamina

---

**Implementation Checklist:**
- [ ] Add sprinting mechanic with stamina cost
- [ ] Add stamina cost to lockpicking (optional)
- [ ] Add stamina cost to hacking (optional)
- [ ] Add stamina cost to crafting (optional)
- [ ] Update UI to show stamina costs
- [ ] Write tests
- [ ] Balance stamina costs

**Estimated Time:** 6-8 hours

---

### 2.2 Skill-Based Stamina Bonuses

#### Requirements

**Problem Statement:**
- No skills affect stamina (max or regeneration)
- Missed opportunity for build diversity
- Skills should provide meaningful stamina benefits

**Requirements:**
1. Add stamina-related passives to skill trees
2. Implement max stamina bonuses
3. Implement stamina cost reduction
4. Implement regeneration rate bonuses

**Acceptance Criteria:**
- ✅ Skills provide stamina bonuses
- ✅ Bonuses scale with skill level
- ✅ Bonuses apply correctly in calculations
- ✅ UI shows skill bonuses

#### Implementation Plan

**Step 1: Define Skill Bonuses**

**File:** `backend/src/data/skills.js`

**Add stamina bonuses:**
```javascript
const SKILL_DEFINITIONS = {
  survival: {
    field_medic: {
      name: 'Field Medic',
      description: 'Medical training and field experience',
      maxLevel: 5,
      passives: {
        staminaRegenBonus: 5, // +5% per level
        maxStamina: 10 // +10 max stamina per level
      }
    },
    endurance_training: {
      name: 'Endurance Training',
      description: 'Physical conditioning and stamina building',
      maxLevel: 5,
      passives: {
        maxStamina: 15, // +15 max stamina per level
        staminaCostReduction: 2 // -2% stamina cost per level
      }
    }
  },
  combat: {
    basic_combat: {
      name: 'Basic Combat',
      description: 'Fundamental combat training',
      maxLevel: 5,
      passives: {
        damage: 2,
        staminaCostReduction: 3 // -3% stamina cost for combat abilities per level
      }
    }
  },
  stealth: {
    basic_stealth: {
      name: 'Basic Stealth',
      description: 'Fundamental stealth techniques',
      maxLevel: 5,
      passives: {
        stealthBonus: 5,
        staminaRegenBonus: 3 // +3% stamina regen per level (stealthy characters recover faster)
      }
    }
  }
  // ... other skills
};
```

**Step 2: Update ProgressionSystem**

**File:** `backend/src/utils/progressionSystem.js`

**Update `getPassiveBonuses()`:**
```javascript
getPassiveBonuses() {
  const bonuses = { stats: {}, combat: {}, other: {} };
  const skills = this.character.skills || {};
  
  for (const [tree, treeSkills] of Object.entries(skills)) {
    if (!treeSkills || typeof treeSkills !== 'object') continue;
    for (const [skillId, skillData] of Object.entries(treeSkills)) {
      if (!skillData || typeof skillData !== 'object') continue;
      const skillLevel = skillData.level || 0;
      if (skillLevel <= 0) continue;

      const skillDef = getSkillDefinition(tree, skillId);
      if (!skillDef || !skillDef.passives) continue;

      for (const [bonusType, bonusValue] of Object.entries(skillDef.passives)) {
        const scaledValue = bonusValue * skillLevel;
        
        // Categorize bonuses
        if (['strength', 'agility', 'intelligence', 'charisma', 'perception', 'endurance'].includes(bonusType)) {
          bonuses.stats[bonusType] = (bonuses.stats[bonusType] || 0) + scaledValue;
        } else if (bonusType.includes('damage') || bonusType.includes('defense') || 
                   bonusType.includes('accuracy') || bonusType.includes('crit')) {
          bonuses.combat[bonusType] = (bonuses.combat[bonusType] || 0) + scaledValue;
        } else if (bonusType === 'maxStamina') {
          bonuses.other.maxStamina = (bonuses.other.maxStamina || 0) + scaledValue;
        } else if (bonusType === 'staminaRegenBonus') {
          bonuses.other.staminaRegenBonus = (bonuses.other.staminaRegenBonus || 0) + scaledValue;
        } else if (bonusType === 'staminaCostReduction') {
          bonuses.other.staminaCostReduction = (bonuses.other.staminaCostReduction || 0) + scaledValue;
        } else {
          bonuses.other[bonusType] = (bonuses.other[bonusType] || 0) + scaledValue;
        }
      }
    }
  }
  return bonuses;
}
```

**Step 3: Apply Max Stamina Bonuses**

**File:** `backend/src/models/PlayerCharacter.js`

**Update `getMaxStamina()`:**
```javascript
PlayerCharacter.prototype.getMaxStamina = function() {
  const endurance = this.stats?.endurance || 10;
  const baseMax = 100 + (endurance * 5) + (this.level * 5);
  
  // Add skill bonuses
  const { ProgressionSystem } = require('../utils/progressionSystem');
  const progressionSystem = new ProgressionSystem(this);
  const passiveBonuses = progressionSystem.getPassiveBonuses();
  const skillBonus = passiveBonuses.other?.maxStamina || 0;
  
  return baseMax + skillBonus;
};
```

**Step 4: Apply Stamina Cost Reduction**

**File:** `backend/src/services/combatService.js`

**Update `executeAbility()`:**
```javascript
// Get stamina cost reduction from skills
const progressionSystem = new ProgressionSystem(character);
const passiveBonuses = progressionSystem.getPassiveBonuses();
const costReduction = passiveBonuses.other?.staminaCostReduction || 0;

// Calculate actual cost
const baseCost = abilityDef.cost?.stamina || 0;
const actualCost = Math.max(1, Math.floor(baseCost * (1 - costReduction / 100)));

// Check stamina
if (combatant.stats.stamina < actualCost) {
  throw new Error(`Not enough stamina. Need ${actualCost}, have ${combatant.stats.stamina}`);
}

// Deduct stamina
combatant.stats.stamina = Math.max(0, combatant.stats.stamina - actualCost);
```

**Step 5: Apply Regeneration Bonuses**

**File:** `backend/src/services/staminaRegenService.js`

**Update `getRegenModifier()`:**
```javascript
async getRegenModifier(character) {
  let modifier = 1.0;
  const progressionSystem = new ProgressionSystem(character);
  const passiveBonuses = progressionSystem.getPassiveBonuses();
  
  // Add stamina regen bonus from skills
  if (passiveBonuses.other?.staminaRegenBonus) {
    modifier += passiveBonuses.other.staminaRegenBonus / 100; // Convert % to multiplier
  }
  
  return modifier;
}
```

**Step 6: Update UI to Show Bonuses**

**File:** `frontend/src/features/character/CharacterSheet.jsx`

**Add stamina bonuses display:**
```jsx
const progressionSystem = new ProgressionSystem(currentCharacter);
const passiveBonuses = progressionSystem.getPassiveBonuses();
const maxStaminaBonus = passiveBonuses.other?.maxStamina || 0;
const regenBonus = passiveBonuses.other?.staminaRegenBonus || 0;
const costReduction = passiveBonuses.other?.staminaCostReduction || 0;

<div className="character-section">
  <h4>Stamina</h4>
  <div className="stats-grid">
    <div className="stat-item">
      <span className="stat-name">Max Stamina</span>
      <span className="stat-value">
        {currentCharacter.maxStamina}
        {maxStaminaBonus > 0 && (
          <span className="stat-bonus">+{maxStaminaBonus} (skills)</span>
        )}
      </span>
    </div>
    {regenBonus > 0 && (
      <div className="stat-item">
        <span className="stat-name">Regen Bonus</span>
        <span className="stat-value">+{regenBonus}%</span>
      </div>
    )}
    {costReduction > 0 && (
      <div className="stat-item">
        <span className="stat-name">Cost Reduction</span>
        <span className="stat-value">-{costReduction}%</span>
      </div>
    )}
  </div>
</div>
```

**Testing:**
- Unit test: Skill bonuses apply correctly
- Integration test: Max stamina includes skill bonuses
- Integration test: Cost reduction applies to abilities
- Integration test: Regeneration bonus applies

---

**Implementation Checklist:**
- [ ] Define stamina bonuses in skill definitions
- [ ] Update ProgressionSystem to categorize bonuses
- [ ] Apply max stamina bonuses in getMaxStamina()
- [ ] Apply cost reduction in combat service
- [ ] Apply regeneration bonuses in stamina regen service
- [ ] Update UI to show bonuses
- [ ] Write tests
- [ ] Balance bonus values

**Estimated Time:** 6-8 hours

---

### 2.3 Stamina Regeneration Modifiers

#### Requirements

**Problem Statement:**
- Regeneration rate is fixed (no modifiers from items/skills)
- Limited customization options
- No way to enhance regeneration through gear

**Requirements:**
1. Allow items to modify regeneration rate
2. Allow skills to modify regeneration (covered in 2.2)
3. Provide clear UI feedback

**Acceptance Criteria:**
- ✅ Items can modify regeneration rate
- ✅ Modifiers stack correctly
- ✅ UI shows regeneration modifiers

#### Implementation Plan

**Step 1: Add Item Stat for Regeneration**

**File:** `backend/src/data/items.js`

**Add stamina regen bonus to items:**
```javascript
{
  id: 'stamina_booster',
  name: 'Stamina Booster',
  type: 'consumable',
  description: 'Increases stamina regeneration rate by 25% for 10 minutes',
  stats: {
    staminaRegenBonus: 25 // +25% regeneration rate
  }
},
{
  id: 'endurance_armor',
  name: 'Endurance Armor',
  type: 'armor',
  description: 'Armor designed for extended operations',
  stats: {
    defense: 15,
    staminaRegenBonus: 10 // +10% regeneration rate (permanent while equipped)
  }
}
```

**Step 2: Update StaminaRegenService**

**File:** `backend/src/services/staminaRegenService.js`

**Update `getRegenModifier()` to check equipped items:**
```javascript
async getRegenModifier(character) {
  let modifier = 1.0;
  const progressionSystem = new ProgressionSystem(character);
  const passiveBonuses = progressionSystem.getPassiveBonuses();
  
  // Add stamina regen bonus from skills
  if (passiveBonuses.other?.staminaRegenBonus) {
    modifier += passiveBonuses.other.staminaRegenBonus / 100;
  }
  
  // Add stamina regen bonus from equipped items
  const inventoryService = require('./inventoryService');
  const equippedItems = await inventoryService.getEquippedItems(character.id);
  
  for (const item of equippedItems) {
    if (item.stats?.staminaRegenBonus) {
      modifier += item.stats.staminaRegenBonus / 100;
    }
  }
  
  // Add temporary bonuses (from consumables)
  // TODO: Implement temporary effect system
  
  return modifier;
}
```

**Step 3: Add Temporary Effect System (Optional)**

**File:** `backend/src/services/effectService.js` (create if doesn't exist)

**Structure:**
```javascript
class EffectService {
  /**
   * Apply temporary stamina regen bonus
   * @param {string} characterId - Character UUID
   * @param {number} bonus - Bonus percentage
   * @param {number} duration - Duration in seconds
   */
  async applyStaminaRegenBonus(characterId, bonus, duration) {
    // Store in character's active effects
    // Effects expire after duration
  }
}
```

**Step 4: Update UI**

**File:** `frontend/src/components/hud/StatsBar.jsx`

**Show regeneration modifiers:**
```jsx
{regenInfo && (
  <div className="regen-details">
    <span className="regen-rate">{regenInfo.regenRate}/min</span>
    {regenInfo.modifier > 1.0 && (
      <span className="regen-modifier">
        (+{Math.round((regenInfo.modifier - 1) * 100)}% from items/skills)
      </span>
    )}
  </div>
)}
```

**Testing:**
- Unit test: Item bonuses apply correctly
- Integration test: Multiple items stack correctly
- Integration test: Temporary effects expire correctly

---

**Implementation Checklist:**
- [ ] Add stamina regen bonus to item stats
- [ ] Update StaminaRegenService to check items
- [ ] Implement temporary effect system (optional)
- [ ] Update UI to show modifiers
- [ ] Write tests
- [ ] Balance modifier values

**Estimated Time:** 4-6 hours

---

## Low Priority Enhancements

### 3.1 Rest Action Clarification

#### Requirements

**Problem Statement:**
- Rest action exists but mechanics are undefined
- Unclear where/when rest is available
- No time cost or restrictions

**Requirements:**
1. Define rest mechanics clearly
2. Specify where rest is available
3. Add time cost/restrictions
4. Provide UI feedback

#### Implementation Plan

**Step 1: Define Rest Mechanics**

**File:** `backend/src/services/characterService.js`

**Update `rest()` method:**
```javascript
/**
 * Rest (restore health and stamina)
 * @param {string} characterId - Character UUID
 * @param {Object} options - Rest options (location, duration)
 * @returns {Promise<Object>} Rest result
 */
async rest(characterId, options = {}) {
  const character = await PlayerCharacter.findByPk(characterId);
  
  if (!character) {
    throw new Error('Character not found');
  }

  // Check if character is in combat
  const combatService = require('./combatService');
  const inCombat = await combatService.isInCombat(characterId);
  if (inCombat) {
    throw new Error('Cannot rest during combat');
  }

  // Check if in safe zone (optional)
  const location = character.currentLocation;
  const isSafeZone = this.isSafeZone(location);
  if (!isSafeZone && !options.allowUnsafeRest) {
    throw new Error('Can only rest in safe zones');
  }

  // Restore health and stamina
  character.currentHealth = character.maxHealth;
  character.currentStamina = character.maxStamina;

  await character.save();

  return {
    success: true,
    restoredHealth: character.maxHealth - (character.currentHealth - character.maxHealth),
    restoredStamina: character.maxStamina - (character.currentStamina - character.maxStamina),
    location: location
  };
}

/**
 * Check if location is a safe zone
 * @param {Object} location - Location object
 * @returns {boolean} True if safe zone
 */
isSafeZone(location) {
  // Define safe zones (landing zones, cities, etc.)
  const safeZones = ['landing_zone', 'city', 'outpost', 'space_station'];
  return safeZones.includes(location.area);
}
```

**Step 2: Add API Endpoint**

**File:** `backend/src/controllers/characterController.js`

```javascript
/**
 * Rest character
 * POST /api/characters/:id/rest
 */
async rest(req, res) {
  try {
    const { id } = req.params;
    const { allowUnsafeRest } = req.body;
    
    const characterService = require('../services/characterService');
    const result = await characterService.rest(id, { allowUnsafeRest });
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
```

**Step 3: Add UI**

**File:** `frontend/src/features/character/CharacterSheet.jsx`

**Add rest button:**
```jsx
<button
  className="rest-button"
  onClick={handleRest}
  disabled={resting || inCombat}
  title="Rest to restore health and stamina (only in safe zones)"
>
  {resting ? 'Resting...' : 'Rest'}
</button>
```

**Testing:**
- Integration test: Rest works in safe zones
- Integration test: Rest blocked in combat
- Integration test: Rest blocked in unsafe zones (unless allowed)

---

**Implementation Checklist:**
- [ ] Define rest mechanics
- [ ] Add safe zone checking
- [ ] Add API endpoint
- [ ] Add UI button
- [ ] Write tests

**Estimated Time:** 3-4 hours

---

### 3.2 UI Visualization Enhancements

#### Requirements

**Problem Statement:**
- Limited visual feedback about stamina regeneration
- No indication of regeneration rate
- No timers or predictions

**Requirements:**
1. Show regeneration rate in UI
2. Display time until full stamina
3. Add visual indicators for regeneration

#### Implementation Plan

**Step 1: Add Regeneration Timer**

**File:** `frontend/src/components/hud/StatsBar.jsx`

**Add timer calculation:**
```jsx
const calculateTimeToFull = (current, max, regenRate) => {
  if (regenRate <= 0 || current >= max) return null;
  const remaining = max - current;
  const minutes = remaining / regenRate;
  return minutes;
};

const timeToFull = regenInfo?.canRegenerate 
  ? calculateTimeToFull(character.currentStamina, character.maxStamina, regenInfo.regenRate)
  : null;
```

**Step 2: Add Visual Indicators**

**File:** `frontend/src/components/hud/StatsBar.css`

**Add animations:**
```css
.stamina-fill.regenerating {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.regen-timer {
  font-size: 0.75em;
  color: var(--text-secondary);
  margin-top: 0.25em;
}
```

**Step 3: Add Tooltip**

**File:** `frontend/src/components/hud/StatsBar.jsx`

**Add detailed tooltip:**
```jsx
<div 
  className="stat-item stamina"
  title={
    regenInfo?.canRegenerate
      ? `Regenerating ${regenInfo.regenRate}/min. Full in ${timeToFull?.toFixed(1)} minutes.`
      : regenInfo?.inCombat
      ? 'Stamina regeneration paused during combat'
      : 'Stamina'
  }
>
  {/* ... existing code ... */}
</div>
```

**Testing:**
- Visual test: Timer displays correctly
- Integration test: Timer updates in real-time
- Visual test: Animations work correctly

---

**Implementation Checklist:**
- [ ] Add regeneration timer
- [ ] Add visual indicators
- [ ] Add tooltips
- [ ] Write tests

**Estimated Time:** 2-3 hours

---

### 3.3 Stamina-Based Status Effects

#### Requirements

**Problem Statement:**
- No consequences for running out of stamina
- No debuffs for low stamina
- No strategic depth from stamina management

**Requirements:**
1. Add exhaustion debuff at 0 stamina
2. Add fatigue debuff at low stamina
3. Apply debuffs in combat

#### Implementation Plan

**Step 1: Define Status Effects**

**File:** `backend/src/data/statusEffects.js`

**Add stamina-based effects:**
```javascript
const STATUS_EFFECTS = {
  exhausted: {
    id: 'exhausted',
    name: 'Exhausted',
    description: 'Completely out of stamina. Movement and actions are severely impaired.',
    effects: {
      movementSpeed: -50, // -50% movement speed
      accuracy: -25, // -25% accuracy
      staminaRegenBonus: -50 // -50% regeneration rate
    },
    duration: null, // Until stamina > 0
    condition: (character) => character.currentStamina === 0
  },
  fatigued: {
    id: 'fatigued',
    name: 'Fatigued',
    description: 'Low on stamina. Actions are less effective.',
    effects: {
      accuracy: -10, // -10% accuracy
      damage: -5 // -5% damage
    },
    duration: null, // Until stamina > 25%
    condition: (character) => {
      const staminaPercent = (character.currentStamina / character.maxStamina) * 100;
      return staminaPercent < 25 && staminaPercent > 0;
    }
  }
};
```

**Step 2: Apply Status Effects**

**File:** `backend/src/services/combatService.js`

**Check and apply status effects:**
```javascript
// In buildPlayerCombatant()
const staminaPercent = (character.currentStamina / character.maxStamina) * 100;

if (staminaPercent === 0) {
  // Apply exhausted debuff
  combatant.statusEffects = combatant.statusEffects || [];
  combatant.statusEffects.push('exhausted');
} else if (staminaPercent < 25) {
  // Apply fatigued debuff
  combatant.statusEffects = combatant.statusEffects || [];
  combatant.statusEffects.push('fatigued');
}
```

**Step 3: Update UI**

**File:** `frontend/src/components/hud/StatsBar.jsx`

**Show status effects:**
```jsx
{character.currentStamina === 0 && (
  <div className="status-effect exhausted">
    ⚠️ Exhausted
  </div>
)}
{character.currentStamina > 0 && (character.currentStamina / character.maxStamina) < 0.25 && (
  <div className="status-effect fatigued">
    ⚠️ Fatigued
  </div>
)}
```

**Testing:**
- Unit test: Status effects apply correctly
- Integration test: Debuffs affect combat stats
- Integration test: Effects clear when stamina recovers

---

**Implementation Checklist:**
- [ ] Define status effects
- [ ] Apply effects in combat
- [ ] Update UI to show effects
- [ ] Write tests

**Estimated Time:** 4-5 hours

---

## Implementation Timeline

### Phase 1: High Priority (Week 1)
- **Day 1-2:** Fix max stamina calculation inconsistency (1.1)
- **Day 3-4:** Implement passive stamina regeneration (1.2)
- **Day 5:** Add Endurance scaling to backend (1.3)
- **Day 6-7:** Testing and bug fixes

### Phase 2: Medium Priority (Week 2)
- **Day 1-2:** Expand stamina integration (2.1)
- **Day 3-4:** Skill-based stamina bonuses (2.2)
- **Day 5:** Stamina regeneration modifiers (2.3)
- **Day 6-7:** Testing and balance adjustments

### Phase 3: Low Priority (Week 3-4)
- **Week 3:** Rest action clarification (3.1), UI enhancements (3.2)
- **Week 4:** Status effects (3.3), final polish

**Total Estimated Time:** 3-4 weeks

---

## Testing Strategy

### Unit Tests
- Max stamina calculation with various inputs
- Regeneration amount calculation
- Skill bonus application
- Status effect application

### Integration Tests
- Level up updates max stamina
- Attribute allocation updates max stamina
- Regeneration works outside combat
- Regeneration pauses during combat
- Skill bonuses apply correctly
- Item bonuses apply correctly

### Performance Tests
- Regeneration job doesn't block server
- Multiple characters regenerate simultaneously
- No memory leaks in background jobs

### User Acceptance Tests
- UI displays correct values
- Regeneration feels balanced
- Skill bonuses are meaningful
- Status effects are clear

---

## Risk Assessment

### High Risk
- **Calculation inconsistency:** Could cause data corruption
  - **Mitigation:** Thorough testing, migration script
- **Performance:** Background job could slow server
  - **Mitigation:** Optimize queries, use job queue

### Medium Risk
- **Balance:** Stamina costs might be too high/low
  - **Mitigation:** Playtesting, iterative adjustments
- **Complexity:** Too many modifiers could confuse players
  - **Mitigation:** Clear UI, tooltips, documentation

### Low Risk
- **UI polish:** Minor visual issues
  - **Mitigation:** User testing, iterative improvements

---

## Conclusion

This document provides a comprehensive roadmap for enhancing the Stamina system. The phased approach allows for incremental improvements while maintaining system stability. Priority should be given to High Priority enhancements (Phase 1) as they address critical issues and provide the foundation for future enhancements.

**Next Steps:**
1. Review and approve requirements
2. Begin Phase 1 implementation
3. Iterate based on testing feedback
4. Proceed to Phase 2 and 3 as time permits

