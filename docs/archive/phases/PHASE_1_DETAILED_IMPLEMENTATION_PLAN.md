# Phase 1: Detailed Implementation Plan
## Step-by-Step Task Breakdown

**Date:** December 2024  
**Status:** Implementation Ready  
**Estimated Duration:** 8-11 weeks  
**Team Size:** 1-2 developers

---

## Table of Contents

1. [Implementation Overview](#1-implementation-overview)
2. [Task 1: Diminishing Returns Curves](#2-task-1-diminishing-returns-curves)
3. [Task 2: Ability Scaling Formulas](#3-task-2-ability-scaling-formulas)
4. [Task 3: Success Check Formulas](#4-task-3-success-check-formulas)
5. [Task 4: Derived Stats System](#5-task-4-derived-stats-system)
6. [Task 5: UI Tooltips & Breakdowns](#6-task-5-ui-tooltips--breakdowns)
7. [Task 6: Cost Scaling for Attributes](#7-task-6-cost-scaling-for-attributes)
8. [Testing & Validation](#8-testing--validation)
9. [Implementation Timeline](#9-implementation-timeline)

---

## 1. Implementation Overview

### 1.1 Dependencies & Order

**Implementation Order:**
1. **Task 4: Derived Stats System** (Foundation - do first)
2. **Task 1: DR Curves** (Uses derived stats)
3. **Task 2: Ability Scaling** (Uses derived stats)
4. **Task 3: Success Checks** (Independent)
5. **Task 5: UI Tooltips** (Uses all above)
6. **Task 6: Cost Scaling** (Independent, optional)

**Why This Order:**
- Derived stats provide foundation for all calculations
- DR curves need derived stats to work with
- Ability scaling needs derived stats formulas
- UI tooltips need all systems to display correctly
- Cost scaling is independent and can be done anytime

### 1.2 File Structure

```
backend/src/
  utils/
    diminishingReturns.js          [NEW] - DR curve calculations
    abilityScaling.js              [NEW] - Ability scaling formulas
    successChecks.js               [NEW] - Success check formulas
    derivedStats.js                [NEW] - Derived stats calculations
    attributeScaling.js            [NEW] - Attribute cost/gain scaling
  data/
    derivedStats.json              [NEW] - Centralized formulas
  services/
    combatService.js               [MODIFY] - Use DR for crit, use derived stats
    craftingService.js             [MODIFY] - Use success checks, ability scaling
    characterService.js            [MODIFY] - Use attribute scaling

frontend/src/
  utils/
    diminishingReturns.js          [NEW] - DR calculations (shared)
    abilityScaling.js              [NEW] - Ability scaling (shared)
    successChecks.js               [NEW] - Success checks (shared)
    derivedStats.js                [NEW] - Derived stats (shared)
  components/
    tooltips/
      StatBreakdownTooltip.jsx     [NEW] - Hover breakdowns
      SuccessPreviewTooltip.jsx    [NEW] - Success previews
      UnlockDeltaTooltip.jsx       [NEW] - Unlock deltas
      DRCurveVisualization.jsx     [NEW] - Visual DR curves
  features/
    character/
      AttributeAllocationView.jsx  [MODIFY] - Add cost scaling display
      SkillTreeView.jsx            [MODIFY] - Add unlock deltas
```

---

## 2. Task 1: Diminishing Returns Curves

### 2.1 Overview

**Purpose:** Prevent single-stat dominance by applying diminishing returns to crit chance, dodge, and cooldown reduction.

**Time Estimate:** 1-2 weeks  
**Priority:** CRITICAL

### 2.2 Step-by-Step Implementation

#### Step 1.1: Create DR Utility Module

**File:** `backend/src/utils/diminishingReturns.js` [NEW]

**Purpose:** Centralized DR calculation functions

**Implementation:**
```javascript
/**
 * Diminishing Returns Utility
 * Applies power curve DR to prevent single-stat dominance
 */

/**
 * Apply diminishing returns using power curve
 * @param {number} raw - Raw value (before DR)
 * @param {number} cap - Maximum effective value
 * @param {number} threshold - Threshold for DR curve (higher = steeper curve)
 * @param {number} power - Power exponent (default 1.5, higher = steeper)
 * @returns {number} Effective value after DR
 */
function applyDR(raw, cap, threshold, power = 1.5) {
  if (raw <= 0) return 0;
  if (raw >= cap * 10) return cap; // Early exit for very high values
  
  const ratio = raw / (raw + threshold);
  const effective = cap * Math.pow(ratio, power);
  
  return Math.max(0, Math.min(cap, effective));
}

/**
 * Calculate critical hit chance with DR
 * @param {number} perception - Perception attribute value
 * @param {number} skillBonus - Flat crit bonus from skills (as percentage, e.g., 3 = 3%)
 * @param {number} itemBonus - Flat crit bonus from items (as percentage)
 * @returns {number} Effective crit chance (0-0.5, i.e., 0-50%)
 */
function calculateCritChance(perception, skillBonus = 0, itemBonus = 0) {
  // Base crit chance: 5%
  const baseCrit = 0.05;
  
  // Perception bonus: +1% per point above 10 (linear, no DR)
  const perceptionBonus = Math.max(0, (perception - 10) * 0.01);
  
  // Skill and item bonuses (flat additions)
  const flatBonus = (skillBonus + itemBonus) / 100;
  
  // Total raw crit chance
  const rawCrit = baseCrit + perceptionBonus + flatBonus;
  
  // Apply DR curve: cap at 50%, threshold 15, power 1.5
  return applyDR(rawCrit, 0.50, 0.15, 1.5);
}

/**
 * Calculate dodge/evasion chance with DR
 * @param {number} agility - Agility attribute value
 * @param {number} skillBonus - Flat dodge bonus from skills (as percentage)
 * @param {number} itemBonus - Flat dodge bonus from items (as percentage)
 * @returns {number} Effective dodge chance (0-0.6, i.e., 0-60%)
 */
function calculateDodgeChance(agility, skillBonus = 0, itemBonus = 0) {
  // Base dodge: 0% (no base dodge)
  const baseDodge = 0;
  
  // Agility bonus: +0.5% per point above 10
  const agilityBonus = Math.max(0, (agility - 10) * 0.005);
  
  // Skill and item bonuses
  const flatBonus = (skillBonus + itemBonus) / 100;
  
  // Total raw dodge
  const rawDodge = baseDodge + agilityBonus + flatBonus;
  
  // Apply DR curve: cap at 60%, threshold 12, power 1.5
  return applyDR(rawDodge, 0.60, 0.12, 1.5);
}

/**
 * Calculate cooldown reduction with DR
 * @param {number} rawCDR - Raw cooldown reduction (as percentage, e.g., 20 = 20%)
 * @returns {number} Effective CDR (0-0.4, i.e., 0-40%)
 */
function calculateCooldownReduction(rawCDR) {
  // Convert percentage to decimal
  const rawDecimal = rawCDR / 100;
  
  // Apply DR curve: cap at 40%, threshold 10, power 1.5
  return applyDR(rawDecimal, 0.40, 0.10, 1.5);
}

/**
 * Get DR curve preview (for UI display)
 * @param {number} cap - Maximum value
 * @param {number} threshold - Threshold
 * @param {number} power - Power exponent
 * @param {number} maxRaw - Maximum raw value to preview
 * @returns {Array} Array of {raw, effective} pairs
 */
function getDRCurvePreview(cap, threshold, power, maxRaw = 100) {
  const preview = [];
  for (let raw = 0; raw <= maxRaw; raw += 5) {
    const effective = applyDR(raw / 100, cap, threshold, power);
    preview.push({
      raw: raw,
      effective: effective * 100, // Convert to percentage
      percentage: (effective / cap) * 100 // Percentage of cap
    });
  }
  return preview;
}

module.exports = {
  applyDR,
  calculateCritChance,
  calculateDodgeChance,
  calculateCooldownReduction,
  getDRCurvePreview
};
```

**Testing:**
```javascript
// Test cases
const dr = require('./diminishingReturns');

// Test 1: Crit chance with low perception
const crit1 = dr.calculateCritChance(12, 0, 0); // Should be ~7% (5% base + 2% perception)
console.assert(crit1 > 0.06 && crit1 < 0.08, 'Low perception crit test failed');

// Test 2: Crit chance with high perception
const crit2 = dr.calculateCritChance(30, 10, 5); // Should be capped/DR'd
console.assert(crit2 <= 0.50, 'Crit cap test failed');

// Test 3: DR curve shape
const preview = dr.getDRCurvePreview(0.50, 0.15, 1.5, 100);
console.assert(preview.length > 0, 'DR preview test failed');
```

---

#### Step 1.2: Create Frontend DR Utility

**File:** `frontend/src/utils/diminishingReturns.js` [NEW]

**Purpose:** Shared DR calculations for frontend (same as backend)

**Implementation:**
- Copy the same functions from backend
- Export as ES6 modules instead of CommonJS
- Add JSDoc comments for IDE support

```javascript
/**
 * Diminishing Returns Utility (Frontend)
 * Shared calculations with backend
 */

export function applyDR(raw, cap, threshold, power = 1.5) {
  // Same implementation as backend
}

export function calculateCritChance(perception, skillBonus = 0, itemBonus = 0) {
  // Same implementation as backend
}

export function calculateDodgeChance(agility, skillBonus = 0, itemBonus = 0) {
  // Same implementation as backend
}

export function calculateCooldownReduction(rawCDR) {
  // Same implementation as backend
}

export function getDRCurvePreview(cap, threshold, power, maxRaw = 100) {
  // Same implementation as backend
}
```

---

#### Step 1.3: Update Combat Service to Use DR

**File:** `backend/src/services/combatService.js` [MODIFY]

**Location:** `buildPlayerCombatant()` method (around line 274)

**Current Code:**
```javascript
// Calculate base critical chance from perception
const baseCritChance = 0.05; // 5% base
const perceptionCritBonus = Math.max(0, ((stats.perception || 10) - 10) * 0.01);
const skillCritBonus = (passiveBonuses.combat.critChance || 0) / 100;
const finalCritChance = Math.min(0.50, baseCritChance + perceptionCritBonus + skillCritBonus);
```

**New Code:**
```javascript
const { calculateCritChance } = require('../utils/diminishingReturns');

// Calculate critical chance with DR
const perception = stats.perception || 10;
const skillCritBonus = passiveBonuses.combat.critChance || 0; // Already in percentage
const itemCritBonus = effectResults.luckStats?.critChance || 0; // From items/effects
const finalCritChance = calculateCritChance(perception, skillCritBonus, itemCritBonus);
```

**Also Update:** `calculateDamage()` method (around line 532)

**Current Code:**
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
// Use crit chance from combatant stats (already calculated with DR)
const criticalChance = attacker.stats.critChance || 0.05;
const criticalRoll = Math.random();
const isCritical = criticalRoll <= criticalChance;
```

---

#### Step 1.4: Add Dodge Calculation (If Not Exists)

**File:** `backend/src/services/combatService.js` [MODIFY]

**Location:** `buildPlayerCombatant()` method (after crit chance)

**New Code:**
```javascript
const { calculateDodgeChance } = require('../utils/diminishingReturns');

// Calculate dodge chance with DR
const agility = stats.agility || 10;
const skillDodgeBonus = passiveBonuses.combat.dodge || 0;
const itemDodgeBonus = effectResults.defenseStats?.dodge || 0;
const finalDodgeChance = calculateDodgeChance(agility, skillDodgeBonus, itemDodgeBonus);

// Add to stats object
stats: {
  // ... existing stats ...
  dodgeChance: finalDodgeChance,
  // ... rest of stats ...
}
```

---

#### Step 1.5: Update Frontend CharacterManager

**File:** `frontend/src/core/character/CharacterManager.js` [MODIFY]

**Location:** `getCritChance()` method (around line 93)

**Current Code:**
```javascript
getCritChance() {
  return 0.05 + (this.stats.perception * 0.01);
}
```

**New Code:**
```javascript
import { calculateCritChance } from '../../utils/diminishingReturns';
import { ProgressionSystem } from '../progression/ProgressionSystem';

getCritChance() {
  const perception = this.stats.perception || 10;
  
  // Get skill bonuses
  const progressionSystem = new ProgressionSystem(this);
  const passiveBonuses = progressionSystem.getPassiveBonuses();
  const skillCritBonus = passiveBonuses.combat.critChance || 0;
  
  // Item bonuses (if available)
  const itemCritBonus = 0; // TODO: Get from equipped items
  
  return calculateCritChance(perception, skillCritBonus, itemCritBonus);
}
```

---

### 2.3 Testing Requirements

**Unit Tests:**
- [ ] DR curve produces expected values
- [ ] Crit chance caps at 50%
- [ ] Dodge chance caps at 60%
- [ ] Low values produce expected results
- [ ] High values are properly DR'd

**Integration Tests:**
- [ ] Combat service uses DR for crit
- [ ] Frontend displays correct crit chance
- [ ] Crit chance matches between frontend and backend

**Manual Testing:**
- [ ] Test with various perception values (10, 15, 20, 25, 30)
- [ ] Test with skill bonuses
- [ ] Test with item bonuses
- [ ] Verify crit rate in actual combat

---

## 3. Task 2: Ability Scaling Formulas

### 3.1 Overview

**Purpose:** Prevent runaway power scaling with piecewise attribute scaling and multiplicative skill bonuses.

**Time Estimate:** 2-3 weeks  
**Priority:** CRITICAL

### 3.2 Step-by-Step Implementation

#### Step 2.1: Create Ability Scaling Utility

**File:** `backend/src/utils/abilityScaling.js` [NEW]

**Purpose:** Centralized ability scaling calculations

**Implementation:**
```javascript
/**
 * Ability Scaling Utility
 * Handles piecewise attribute scaling and multiplicative skill bonuses
 */

/**
 * Calculate piecewise attribute multiplier
 * @param {number} attribute - Attribute value
 * @param {number} baseAttribute - Base attribute (usually 10)
 * @param {Array} tiers - Array of {max, multiplier} tiers
 * @returns {number} Multiplier (e.g., 1.3 = +30%)
 */
function calculateAttributeMultiplier(attribute, baseAttribute = 10, tiers) {
  if (!tiers || tiers.length === 0) return 1.0;
  
  const bonus = attribute - baseAttribute;
  if (bonus <= 0) return 1.0;
  
  let multiplier = 1.0;
  let remaining = bonus;
  let lastMax = 0;
  
  for (const tier of tiers) {
    const tierRange = tier.max - lastMax;
    const tierBonus = Math.min(remaining, tierRange);
    
    multiplier += tierBonus * tier.multiplier;
    remaining -= tierBonus;
    
    if (remaining <= 0) break;
    lastMax = tier.max;
  }
  
  // If bonus exceeds all tiers, apply last tier's multiplier to remainder
  if (remaining > 0 && tiers.length > 0) {
    const lastTier = tiers[tiers.length - 1];
    multiplier += remaining * lastTier.multiplier;
  }
  
  return multiplier;
}

/**
 * Calculate healing with piecewise scaling
 * @param {number} baseHealing - Base healing amount
 * @param {number} intelligence - Intelligence attribute
 * @param {number} medicLevel - Field Medic skill level
 * @returns {number} Final healing amount
 */
function calculateHealing(baseHealing, intelligence, medicLevel) {
  // Piecewise intelligence scaling (2 tiers)
  const intTiers = [
    { max: 10, multiplier: 0.03 },  // +3% per point (0-10 above base)
    { max: Infinity, multiplier: 0.015 } // +1.5% per point (11+ above base)
  ];
  
  const intMultiplier = calculateAttributeMultiplier(intelligence, 10, intTiers);
  
  // Multiplicative skill bonus: +5% per level
  const skillMultiplier = 1 + (medicLevel * 0.05);
  
  // Final calculation: base * attribute * skill (multiplicative)
  return Math.floor(baseHealing * intMultiplier * skillMultiplier);
}

/**
 * Calculate damage with piecewise scaling
 * @param {number} baseDamage - Base damage amount
 * @param {number} strength - Strength attribute
 * @param {number} skillLevel - Combat skill level
 * @param {number} skillBonusPercent - Skill bonus as percentage (e.g., 10 = +10%)
 * @returns {number} Final damage amount
 */
function calculateDamage(baseDamage, strength, skillLevel, skillBonusPercent = 0) {
  // Piecewise strength scaling (2 tiers)
  const strTiers = [
    { max: 10, multiplier: 0.02 },  // +2% per point (0-10 above base)
    { max: Infinity, multiplier: 0.01 } // +1% per point (11+ above base)
  ];
  
  const strMultiplier = calculateAttributeMultiplier(strength, 10, strTiers);
  
  // Multiplicative skill bonus
  const skillMultiplier = 1 + (skillBonusPercent / 100);
  
  // Final calculation: base * attribute * skill (multiplicative)
  return Math.floor(baseDamage * strMultiplier * skillMultiplier);
}

/**
 * Calculate crafting success with piecewise scaling
 * @param {number} baseSuccess - Base success chance (0-1)
 * @param {number} intelligence - Intelligence attribute
 * @param {number} engineeringLevel - Engineering skill level
 * @param {number} difficulty - Difficulty modifier
 * @returns {number} Final success chance (0-1)
 */
function calculateCraftingSuccess(baseSuccess, intelligence, engineeringLevel, difficulty = 0) {
  // Piecewise intelligence scaling (2 tiers)
  const intTiers = [
    { max: 10, multiplier: 0.02 },  // +2% per point (0-10 above base)
    { max: Infinity, multiplier: 0.01 } // +1% per point (11+ above base)
  ];
  
  const intMultiplier = calculateAttributeMultiplier(intelligence, 10, intTiers);
  
  // Multiplicative skill bonus: +5% per level
  const skillMultiplier = 1 + (engineeringLevel * 0.05);
  
  // Final calculation: base * attribute * skill - difficulty
  const finalSuccess = baseSuccess * intMultiplier * skillMultiplier - difficulty;
  
  // Clamp to reasonable range
  return Math.max(0.1, Math.min(0.95, finalSuccess));
}

module.exports = {
  calculateAttributeMultiplier,
  calculateHealing,
  calculateDamage,
  calculateCraftingSuccess
};
```

---

#### Step 2.2: Update Crafting Service

**File:** `backend/src/services/craftingService.js` [MODIFY]

**Location:** `calculateCraftingBonuses()` method (around line 90)

**Current Code:**
```javascript
// Base success chance
let successChance = 50; // Base 50%

// Apply skill bonuses
if (engineeringLevel > 0) {
  successChance += engineeringLevel * 5; // +5% per engineering level
}

// Apply intelligence bonus
const intelligence = character.stats.intelligence || 10;
successChance += (intelligence - 10) * 2; // +2% per point above 10

// Cap at 95%
successChance = Math.min(95, Math.max(5, successChance));
```

**New Code:**
```javascript
const { calculateCraftingSuccess } = require('../utils/abilityScaling');

// Base success chance (as decimal)
const baseSuccess = 0.50; // 50%

// Get intelligence
const intelligence = character.stats.intelligence || 10;

// Calculate success with piecewise scaling
// Note: difficulty would come from recipe tier
const recipeDifficulty = recipe.difficulty || 0; // 0 = normal, 0.1 = hard, etc.
const successChance = calculateCraftingSuccess(
  baseSuccess,
  intelligence,
  engineeringLevel,
  recipeDifficulty
);

// Convert to percentage for return value
const successChancePercent = successChance * 100;
```

---

#### Step 2.3: Update Ability Service (If Exists)

**File:** `backend/src/services/abilityService.js` [MODIFY or CREATE]

**Purpose:** Handle ability scaling for healing and damage abilities

**Implementation:**
```javascript
const { calculateHealing, calculateDamage } = require('../utils/abilityScaling');

/**
 * Calculate ability effect with scaling
 * @param {Object} ability - Ability definition
 * @param {Object} character - Character object
 * @param {Object} context - Context (target, etc.)
 * @returns {Object} Calculated effect
 */
async function calculateAbilityEffect(ability, character, context = {}) {
  const baseValue = ability.baseValue || 0;
  const scalingAttribute = ability.scalingAttribute; // 'intelligence', 'strength', etc.
  const scalingSkill = ability.scalingSkill; // {tree: 'survival', skill: 'field_medic'}
  
  // Get attribute value
  const attributeValue = character.stats[scalingAttribute] || 10;
  
  // Get skill level
  const ProgressionSystem = require('../utils/progressionSystem').ProgressionSystem;
  const progressionSystem = new ProgressionSystem(character);
  const skillLevel = scalingSkill 
    ? progressionSystem.getSkillLevel(scalingSkill.tree, scalingSkill.skill)
    : 0;
  
  // Calculate based on ability type
  if (ability.type === 'heal') {
    const healing = calculateHealing(baseValue, attributeValue, skillLevel);
    return {
      type: 'heal',
      amount: healing,
      target: context.target || 'self'
    };
  } else if (ability.type === 'damage') {
    const skillBonus = ability.skillBonusPercent || 0;
    const damage = calculateDamage(baseValue, attributeValue, skillLevel, skillBonus);
    return {
      type: 'damage',
      amount: damage,
      target: context.target || 'enemy'
    };
  }
  
  // Default: return base value
  return {
    type: ability.type,
    amount: baseValue,
    target: context.target || 'self'
  };
}
```

---

### 3.3 Testing Requirements

**Unit Tests:**
- [ ] Piecewise scaling produces expected values
- [ ] Multiplicative bonuses work correctly
- [ ] Healing calculation matches expected values
- [ ] Damage calculation matches expected values
- [ ] Crafting success calculation matches expected values

**Integration Tests:**
- [ ] Crafting service uses new scaling
- [ ] Abilities use new scaling
- [ ] Frontend displays correct values

**Manual Testing:**
- [ ] Test healing with various intelligence values
- [ ] Test damage with various strength values
- [ ] Test crafting with various intelligence/engineering levels
- [ ] Verify scaling feels balanced

---

## 4. Task 3: Success Check Formulas

### 4.1 Overview

**Purpose:** Make skill checks feel fair and predictable with logistic functions and advantage system.

**Time Estimate:** 2 weeks  
**Priority:** CRITICAL

### 4.2 Step-by-Step Implementation

#### Step 3.1: Create Success Check Utility

**File:** `backend/src/utils/successChecks.js` [NEW]

**Purpose:** Centralized success check calculations

**Implementation:**
```javascript
/**
 * Success Check Utility
 * Handles logistic success functions and advantage system
 */

/**
 * Calculate success chance using logistic function
 * @param {number} skill - Skill level or skill value
 * @param {number} attribute - Attribute value
 * @param {number} difficulty - Difficulty modifier (higher = harder)
 * @param {number} toolBonus - Tool quality bonus
 * @param {number} k - Logistic curve steepness (default 0.35)
 * @returns {number} Success chance (0-1)
 */
function calculateSuccessChance(skill, attribute, difficulty, toolBonus = 0, k = 0.35) {
  // Raw value: skill + attribute - difficulty + tool bonus
  const raw = skill + attribute - difficulty + toolBonus;
  
  // Logistic function: 1 / (1 + e^(-k * raw))
  const logistic = 1 / (1 + Math.exp(-k * raw));
  
  // Clamp to [0.1, 0.95] to prevent impossible/easy checks
  return Math.max(0.1, Math.min(0.95, logistic));
}

/**
 * Roll for success (single roll)
 * @param {number} successChance - Success chance (0-1)
 * @returns {boolean} True if successful
 */
function rollForSuccess(successChance) {
  return Math.random() <= successChance;
}

/**
 * Roll for success with advantage (two rolls, keep best)
 * @param {number} successChance - Success chance (0-1)
 * @returns {boolean} True if successful
 */
function rollWithAdvantage(successChance) {
  const roll1 = Math.random();
  const roll2 = Math.random();
  const bestRoll = Math.min(roll1, roll2); // Lower is better for success
  return bestRoll <= successChance;
}

/**
 * Roll for success with disadvantage (two rolls, keep worst)
 * @param {number} successChance - Success chance (0-1)
 * @returns {boolean} True if successful
 */
function rollWithDisadvantage(successChance) {
  const roll1 = Math.random();
  const roll2 = Math.random();
  const worstRoll = Math.max(roll1, roll2); // Higher is worse for success
  return worstRoll <= successChance;
}

/**
 * Roll for success with best-of-3 (for expensive actions)
 * @param {number} successChance - Success chance (0-1)
 * @returns {boolean} True if at least one roll succeeds
 */
function rollBestOfThree(successChance) {
  const roll1 = Math.random() <= successChance;
  const roll2 = Math.random() <= successChance;
  const roll3 = Math.random() <= successChance;
  return roll1 || roll2 || roll3;
}

/**
 * Calculate lockpicking success
 * @param {number} lockpickingLevel - Lockpicking skill level
 * @param {number} agility - Agility attribute
 * @param {number} lockTier - Lock tier (1-5, higher = harder)
 * @param {number} toolQuality - Tool quality bonus (0-5)
 * @param {boolean} hasAdvantage - Whether player has advantage (master lockpicks, etc.)
 * @returns {Object} {success: boolean, chance: number, usedAdvantage: boolean}
 */
function attemptLockpick(lockpickingLevel, agility, lockTier, toolQuality = 0, hasAdvantage = false) {
  // Difficulty: base 10 + (tier * 5)
  const difficulty = 10 + (lockTier * 5);
  
  // Calculate success chance
  const chance = calculateSuccessChance(lockpickingLevel, agility, difficulty, toolQuality);
  
  // Roll with advantage if available
  const success = hasAdvantage 
    ? rollWithAdvantage(chance)
    : rollForSuccess(chance);
  
  return {
    success,
    chance,
    usedAdvantage: hasAdvantage
  };
}

/**
 * Calculate hacking success
 * @param {number} hackingLevel - Hacking skill level
 * @param {number} intelligence - Intelligence attribute
 * @param {number} terminalTier - Terminal tier (1-5)
 * @param {number} toolQuality - Tool quality bonus
 * @param {boolean} hasAdvantage - Whether player has advantage
 * @returns {Object} {success: boolean, chance: number, usedAdvantage: boolean}
 */
function attemptHack(hackingLevel, intelligence, terminalTier, toolQuality = 0, hasAdvantage = false) {
  // Difficulty: base 12 + (tier * 6)
  const difficulty = 12 + (terminalTier * 6);
  
  // Calculate success chance
  const chance = calculateSuccessChance(hackingLevel, intelligence, difficulty, toolQuality);
  
  // Roll with advantage if available
  const success = hasAdvantage 
    ? rollWithAdvantage(chance)
    : rollForSuccess(chance);
  
  return {
    success,
    chance,
    usedAdvantage: hasAdvantage
  };
}

/**
 * Calculate crafting success (uses ability scaling, but also logistic for final check)
 * @param {number} baseSuccess - Base success from ability scaling
 * @param {number} difficulty - Recipe difficulty modifier
 * @returns {Object} {success: boolean, chance: number}
 */
function attemptCraft(baseSuccess, difficulty = 0) {
  // Apply difficulty modifier
  const chance = Math.max(0.1, Math.min(0.95, baseSuccess - difficulty));
  
  // Roll for success
  const success = rollForSuccess(chance);
  
  return {
    success,
    chance
  };
}

module.exports = {
  calculateSuccessChance,
  rollForSuccess,
  rollWithAdvantage,
  rollWithDisadvantage,
  rollBestOfThree,
  attemptLockpick,
  attemptHack,
  attemptCraft
};
```

---

#### Step 3.2: Update Crafting Service to Use Success Checks

**File:** `backend/src/services/craftingService.js` [MODIFY]

**Location:** `craftItem()` method (around line 136)

**Current Code:**
```javascript
// Check success
const successRoll = Math.random() * 100;
const success = successRoll <= bonuses.successChance;
```

**New Code:**
```javascript
const { attemptCraft } = require('../utils/successChecks');

// Get recipe difficulty
const recipeDifficulty = recipe.difficulty || 0; // 0 = normal, 0.1 = hard, etc.

// Attempt craft with success check
const craftResult = attemptCraft(bonuses.successChance / 100, recipeDifficulty);
const success = craftResult.success;
```

---

#### Step 3.3: Create Lockpicking Service (If Not Exists)

**File:** `backend/src/services/lockpickingService.js` [NEW or MODIFY]

**Purpose:** Handle lockpicking attempts

**Implementation:**
```javascript
const { attemptLockpick } = require('../utils/successChecks');
const { ProgressionSystem } = require('../utils/progressionSystem');
const PlayerCharacter = require('../models/PlayerCharacter');

class LockpickingService {
  /**
   * Attempt to pick a lock
   * @param {string} characterId - Character UUID
   * @param {string} lockId - Lock ID
   * @param {number} lockTier - Lock tier (1-5)
   * @param {boolean} useAdvantage - Whether to use advantage (master lockpicks, etc.)
   * @returns {Promise<Object>} Lockpicking result
   */
  async attemptPickLock(characterId, lockId, lockTier, useAdvantage = false) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }
    
    const progressionSystem = new ProgressionSystem(character);
    
    // Get lockpicking skill level
    const lockpickingLevel = progressionSystem.getSkillLevel('stealth', 'lockpicking');
    
    // Get agility
    const agility = character.stats.agility || 10;
    
    // Check if lockpicking is unlocked
    if (lockpickingLevel <= 0) {
      return {
        success: false,
        chance: 0,
        reason: 'Lockpicking skill not unlocked'
      };
    }
    
    // Get tool quality (from equipped items or inventory)
    const toolQuality = 0; // TODO: Get from equipped lockpicks
    
    // Attempt lockpick
    const result = attemptLockpick(lockpickingLevel, agility, lockTier, toolQuality, useAdvantage);
    
    return {
      success: result.success,
      chance: result.chance,
      usedAdvantage: result.usedAdvantage,
      lockId,
      lockTier
    };
  }
}

module.exports = new LockpickingService();
```

---

#### Step 3.4: Create Hacking Service (If Not Exists)

**File:** `backend/src/services/hackingService.js` [NEW or MODIFY]

**Purpose:** Handle hacking attempts

**Implementation:**
```javascript
const { attemptHack } = require('../utils/successChecks');
const { ProgressionSystem } = require('../utils/progressionSystem');
const PlayerCharacter = require('../models/PlayerCharacter');

class HackingService {
  /**
   * Attempt to hack a terminal
   * @param {string} characterId - Character UUID
   * @param {string} terminalId - Terminal ID
   * @param {number} terminalTier - Terminal tier (1-5)
   * @param {boolean} useAdvantage - Whether to use advantage
   * @returns {Promise<Object>} Hacking result
   */
  async attemptHackTerminal(characterId, terminalId, terminalTier, useAdvantage = false) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }
    
    const progressionSystem = new ProgressionSystem(character);
    
    // Get hacking skill level
    const hackingLevel = progressionSystem.getSkillLevel('technical', 'hacking');
    
    // Get intelligence
    const intelligence = character.stats.intelligence || 10;
    
    // Check if hacking is unlocked
    if (hackingLevel <= 0) {
      return {
        success: false,
        chance: 0,
        reason: 'Hacking skill not unlocked'
      };
    }
    
    // Get tool quality
    const toolQuality = 0; // TODO: Get from equipped tools
    
    // Attempt hack
    const result = attemptHack(hackingLevel, intelligence, terminalTier, toolQuality, useAdvantage);
    
    return {
      success: result.success,
      chance: result.chance,
      usedAdvantage: result.usedAdvantage,
      terminalId,
      terminalTier
    };
  }
}

module.exports = new HackingService();
```

---

### 4.3 Testing Requirements

**Unit Tests:**
- [ ] Logistic function produces expected values
- [ ] Advantage system works correctly
- [ ] Best-of-3 works correctly
- [ ] Lockpicking calculations match expected values
- [ ] Hacking calculations match expected values

**Integration Tests:**
- [ ] Crafting service uses success checks
- [ ] Lockpicking service works end-to-end
- [ ] Hacking service works end-to-end

**Manual Testing:**
- [ ] Test lockpicking with various skill/attribute combinations
- [ ] Test hacking with various skill/attribute combinations
- [ ] Test advantage system
- [ ] Verify success rates feel fair

---

## 5. Task 4: Derived Stats System

### 5.1 Overview

**Purpose:** Centralize all derived stat calculations in JSON and utility functions.

**Time Estimate:** 1-2 weeks  
**Priority:** HIGH (Foundation for other tasks)

### 5.2 Step-by-Step Implementation

#### Step 4.1: Create Derived Stats JSON

**File:** `backend/src/data/derivedStats.json` [NEW]

**Purpose:** Centralized formulas for all derived stats

**Implementation:**
```json
{
  "combat": {
    "attackRating": {
      "formula": "weaponBase * (1 + advWeapons * 0.02) * (1 + strength * 0.01)",
      "description": "Attack Rating = Weapon Base × (1 + Advanced Weapons × 2%) × (1 + Strength × 1%)",
      "components": [
        {
          "name": "weaponBase",
          "source": "equipment",
          "description": "Base damage from equipped weapon"
        },
        {
          "name": "advWeapons",
          "source": "skill",
          "description": "Advanced Weapons skill level"
        },
        {
          "name": "strength",
          "source": "attribute",
          "description": "Strength attribute value"
        }
      ]
    },
    "defenseRating": {
      "formula": "armorBase * (1 + tacticalAwareness * 0.03) * (1 + endurance * 0.01)",
      "description": "Defense Rating = Armor Base × (1 + Tactical Awareness × 3%) × (1 + Endurance × 1%)",
      "components": [
        {
          "name": "armorBase",
          "source": "equipment",
          "description": "Base defense from equipped armor"
        },
        {
          "name": "tacticalAwareness",
          "source": "skill",
          "description": "Tactical Awareness skill level"
        },
        {
          "name": "endurance",
          "source": "attribute",
          "description": "Endurance attribute value"
        }
      ]
    },
    "critChance": {
      "formula": "applyDR(0.05 + (perception - 10) * 0.01 + advWeapons * 0.01, 0.50, 0.15, 1.5)",
      "description": "Crit Chance = DR(5% base + Perception bonus + Advanced Weapons bonus)",
      "usesDR": true,
      "drParams": {
        "cap": 0.50,
        "threshold": 0.15,
        "power": 1.5
      },
      "components": [
        {
          "name": "base",
          "value": 0.05,
          "description": "Base 5% crit chance"
        },
        {
          "name": "perception",
          "source": "attribute",
          "description": "Perception attribute value"
        },
        {
          "name": "advWeapons",
          "source": "skill",
          "description": "Advanced Weapons skill level"
        }
      ]
    }
  },
  "stealth": {
    "stealthPower": {
      "formula": "agility * 0.6 + basicStealth * 5",
      "description": "Stealth Power = Agility × 0.6 + Basic Stealth × 5",
      "components": [
        {
          "name": "agility",
          "source": "attribute",
          "description": "Agility attribute value"
        },
        {
          "name": "basicStealth",
          "source": "skill",
          "description": "Basic Stealth skill level"
        }
      ]
    }
  },
  "technical": {
    "techSuccess": {
      "formula": "logistic(intelligence + hacking - difficulty)",
      "description": "Tech Success = Logistic(Intelligence + Hacking - Difficulty)",
      "usesLogistic": true,
      "logisticParams": {
        "k": 0.35
      },
      "components": [
        {
          "name": "intelligence",
          "source": "attribute",
          "description": "Intelligence attribute value"
        },
        {
          "name": "hacking",
          "source": "skill",
          "description": "Hacking skill level"
        },
        {
          "name": "difficulty",
          "source": "context",
          "description": "Terminal/lock difficulty"
        }
      ]
    }
  }
}
```

---

#### Step 4.2: Create Derived Stats Utility

**File:** `backend/src/utils/derivedStats.js` [NEW]

**Purpose:** Calculate derived stats from JSON formulas

**Implementation:**
```javascript
const derivedStatsDefs = require('../data/derivedStats.json');
const { applyDR } = require('./diminishingReturns');
const { calculateSuccessChance } = require('./successChecks');

/**
 * Derived Stats Utility
 * Calculates derived stats from centralized formulas
 */

/**
 * Evaluate a formula with given variables
 * @param {string} formula - Formula string
 * @param {Object} variables - Variable values
 * @returns {number} Calculated value
 */
function evaluateFormula(formula, variables) {
  // Replace variables with values
  let evaluated = formula;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\b${key}\\b`, 'g');
    evaluated = evaluated.replace(regex, value);
  }
  
  // Evaluate (safe eval with only math operations)
  // Note: In production, use a proper expression evaluator library
  try {
    return Function('"use strict"; return (' + evaluated + ')')();
  } catch (error) {
    console.error('Formula evaluation error:', error, 'Formula:', formula, 'Variables:', variables);
    return 0;
  }
}

/**
 * Calculate a derived stat
 * @param {string} category - Stat category (combat, stealth, technical)
 * @param {string} statName - Stat name (attackRating, defenseRating, etc.)
 * @param {Object} context - Context with character, equipment, etc.
 * @returns {Object} {value: number, breakdown: Object}
 */
function calculateDerivedStat(category, statName, context) {
  const statDef = derivedStatsDefs[category]?.[statName];
  if (!statDef) {
    throw new Error(`Derived stat not found: ${category}.${statName}`);
  }
  
  const { character, equipment = {}, skills = {}, difficulty = 0 } = context;
  const stats = character.stats || {};
  
  // Build variables object
  const variables = {};
  
  // Process components
  const breakdown = {};
  for (const component of statDef.components || []) {
    let value = 0;
    
    if (component.source === 'attribute') {
      value = stats[component.name] || 10;
    } else if (component.source === 'skill') {
      value = skills[component.name] || 0;
    } else if (component.source === 'equipment') {
      value = equipment[component.name] || 0;
    } else if (component.source === 'context') {
      value = difficulty;
    } else if (component.value !== undefined) {
      value = component.value;
    }
    
    variables[component.name] = value;
    breakdown[component.name] = {
      value,
      description: component.description,
      source: component.source
    };
  }
  
  // Calculate value
  let calculatedValue = 0;
  
  if (statDef.usesDR) {
    // Use DR curve
    const rawValue = evaluateFormula(statDef.formula.replace('applyDR(', '').split(',')[0], variables);
    const drParams = statDef.drParams;
    calculatedValue = applyDR(rawValue, drParams.cap, drParams.threshold, drParams.power);
  } else if (statDef.usesLogistic) {
    // Use logistic function
    const rawValue = evaluateFormula(statDef.formula.replace('logistic(', '').replace(')', ''), variables);
    const k = statDef.logisticParams.k || 0.35;
    calculatedValue = calculateSuccessChance(
      variables.intelligence || 0,
      variables.hacking || 0,
      variables.difficulty || 0,
      0,
      k
    );
  } else {
    // Regular formula
    calculatedValue = evaluateFormula(statDef.formula, variables);
  }
  
  return {
    value: calculatedValue,
    breakdown,
    description: statDef.description,
    formula: statDef.formula
  };
}

/**
 * Calculate all combat derived stats
 * @param {Object} context - Context with character, equipment, skills
 * @returns {Object} All combat stats
 */
function calculateCombatStats(context) {
  const skills = context.skills || {};
  
  // Get skill levels
  const ProgressionSystem = require('./progressionSystem').ProgressionSystem;
  const progressionSystem = new ProgressionSystem(context.character);
  
  const skillLevels = {
    advWeapons: progressionSystem.getSkillLevel('combat', 'advanced_weapons'),
    tacticalAwareness: progressionSystem.getSkillLevel('combat', 'tactical_awareness')
  };
  
  const combatContext = {
    ...context,
    skills: { ...skills, ...skillLevels }
  };
  
  return {
    attackRating: calculateDerivedStat('combat', 'attackRating', combatContext),
    defenseRating: calculateDerivedStat('combat', 'defenseRating', combatContext),
    critChance: calculateDerivedStat('combat', 'critChance', combatContext)
  };
}

module.exports = {
  calculateDerivedStat,
  calculateCombatStats,
  getStatDefinition: (category, statName) => derivedStatsDefs[category]?.[statName]
};
```

---

#### Step 4.3: Update Combat Service to Use Derived Stats

**File:** `backend/src/services/combatService.js` [MODIFY]

**Location:** `buildPlayerCombatant()` method

**New Code:**
```javascript
const { calculateCombatStats } = require('../utils/derivedStats');

// ... existing code to get equipment, base stats, etc. ...

// Calculate derived stats
const combatStats = calculateCombatStats({
  character,
  equipment: {
    weaponBase: weaponDamage,
    armorBase: armorDefense
  },
  skills: {}
});

// Use derived stats
const finalAttack = combatStats.attackRating.value;
const finalDefense = combatStats.defenseRating.value;
const finalCritChance = combatStats.critChance.value;

// Store breakdowns for UI
const statBreakdowns = {
  attackRating: combatStats.attackRating.breakdown,
  defenseRating: combatStats.defenseRating.breakdown,
  critChance: combatStats.critChance.breakdown
};
```

---

### 5.3 Testing Requirements

**Unit Tests:**
- [ ] Formula evaluation works correctly
- [ ] Derived stats match expected values
- [ ] Breakdowns are accurate
- [ ] DR stats use DR curves
- [ ] Logistic stats use logistic functions

**Integration Tests:**
- [ ] Combat service uses derived stats
- [ ] Stats match between frontend and backend

**Manual Testing:**
- [ ] Verify stat calculations in game
- [ ] Check breakdowns are accurate
- [ ] Test with various character builds

---

## 6. Task 5: UI Tooltips & Breakdowns

### 6.1 Overview

**Purpose:** Provide transparent, explainable UI with hover breakdowns, success previews, and unlock deltas.

**Time Estimate:** 2-3 weeks  
**Priority:** HIGH

### 6.2 Step-by-Step Implementation

#### Step 5.1: Create Stat Breakdown Tooltip Component

**File:** `frontend/src/components/tooltips/StatBreakdownTooltip.jsx` [NEW]

**Purpose:** Display stat breakdown on hover

**Implementation:**
```javascript
import React from 'react';
import './StatBreakdownTooltip.css';

export default function StatBreakdownTooltip({ statName, breakdown, value, children }) {
  const [showTooltip, setShowTooltip] = React.useState(false);
  
  if (!breakdown || Object.keys(breakdown).length === 0) {
    return children;
  }
  
  return (
    <div 
      className="stat-breakdown-container"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <div className="stat-breakdown-tooltip">
          <div className="tooltip-header">
            <h4>{statName}</h4>
            <div className="tooltip-value">{value}</div>
          </div>
          <div className="tooltip-breakdown">
            {Object.entries(breakdown).map(([key, component]) => (
              <div key={key} className="breakdown-item">
                <span className="breakdown-label">{component.description || key}:</span>
                <span className="breakdown-value">
                  {component.value > 0 ? '+' : ''}{component.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**CSS:** `frontend/src/components/tooltips/StatBreakdownTooltip.css`
```css
.stat-breakdown-container {
  position: relative;
  display: inline-block;
}

.stat-breakdown-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  padding: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  min-width: 200px;
  color: var(--text-primary);
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.tooltip-header h4 {
  margin: 0;
  font-size: 1rem;
  color: var(--primary-color);
}

.tooltip-value {
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--text-primary);
}

.tooltip-breakdown {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
}

.breakdown-label {
  color: var(--text-secondary);
}

.breakdown-value {
  color: var(--text-primary);
  font-weight: bold;
}
```

---

#### Step 5.2: Create Success Preview Tooltip Component

**File:** `frontend/src/components/tooltips/SuccessPreviewTooltip.jsx` [NEW]

**Purpose:** Show success chance and "if you had X more" previews

**Implementation:**
```javascript
import React from 'react';
import { calculateSuccessChance } from '../../utils/successChecks';
import './SuccessPreviewTooltip.css';

export default function SuccessPreviewTooltip({ 
  currentChance, 
  skill, 
  attribute, 
  difficulty,
  children 
}) {
  const [showTooltip, setShowTooltip] = React.useState(false);
  
  // Calculate previews
  const previews = [
    {
      label: 'If skill +1',
      chance: calculateSuccessChance(skill + 1, attribute, difficulty)
    },
    {
      label: 'If attribute +1',
      chance: calculateSuccessChance(skill, attribute + 1, difficulty)
    },
    {
      label: 'If skill +3',
      chance: calculateSuccessChance(skill + 3, attribute, difficulty)
    }
  ];
  
  return (
    <div 
      className="success-preview-container"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <div className="success-preview-tooltip">
          <div className="tooltip-header">
            <h4>Success Chance</h4>
            <div className="current-chance">{Math.round(currentChance * 100)}%</div>
          </div>
          <div className="preview-list">
            {previews.map((preview, index) => (
              <div key={index} className="preview-item">
                <span className="preview-label">{preview.label}:</span>
                <span className="preview-value">
                  {Math.round(preview.chance * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

#### Step 5.3: Create Unlock Delta Tooltip Component

**File:** `frontend/src/components/tooltips/UnlockDeltaTooltip.jsx` [NEW]

**Purpose:** Show what's needed to unlock a skill

**Implementation:**
```javascript
import React from 'react';
import './UnlockDeltaTooltip.css';

export default function UnlockDeltaTooltip({ prerequisites, currentCharacter, children }) {
  const [showTooltip, setShowTooltip] = React.useState(false);
  
  if (!prerequisites) {
    return children;
  }
  
  // Calculate deltas
  const deltas = [];
  
  if (prerequisites.level) {
    const currentLevel = currentCharacter.level || 1;
    const needed = prerequisites.level - currentLevel;
    if (needed > 0) {
      deltas.push({
        type: 'level',
        needed,
        current: currentLevel,
        required: prerequisites.level
      });
    }
  }
  
  if (prerequisites.stats) {
    for (const [stat, required] of Object.entries(prerequisites.stats)) {
      const current = currentCharacter.stats?.[stat] || 10;
      const needed = required - current;
      if (needed > 0) {
        deltas.push({
          type: 'stat',
          stat,
          needed,
          current,
          required
        });
      }
    }
  }
  
  if (prerequisites.skills) {
    // Calculate skill deltas
    for (const [tree, skills] of Object.entries(prerequisites.skills)) {
      for (const [skillId, requiredLevel] of Object.entries(skills)) {
        const currentLevel = currentCharacter.getSkillLevel?.(tree, skillId) || 0;
        const needed = requiredLevel - currentLevel;
        if (needed > 0) {
          deltas.push({
            type: 'skill',
            tree,
            skillId,
            needed,
            current: currentLevel,
            required: requiredLevel
          });
        }
      }
    }
  }
  
  if (deltas.length === 0) {
    return children; // All prerequisites met
  }
  
  return (
    <div 
      className="unlock-delta-container"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <div className="unlock-delta-tooltip">
          <div className="tooltip-header">
            <h4>Requirements</h4>
          </div>
          <div className="delta-list">
            {deltas.map((delta, index) => (
              <div key={index} className="delta-item">
                {delta.type === 'level' && (
                  <>
                    <span className="delta-label">Level:</span>
                    <span className="delta-value">
                      {delta.current} / {delta.required} (need +{delta.needed})
                    </span>
                  </>
                )}
                {delta.type === 'stat' && (
                  <>
                    <span className="delta-label">{delta.stat}:</span>
                    <span className="delta-value">
                      {delta.current} / {delta.required} (need +{delta.needed})
                    </span>
                  </>
                )}
                {delta.type === 'skill' && (
                  <>
                    <span className="delta-label">{delta.skillId}:</span>
                    <span className="delta-value">
                      {delta.current} / {delta.required} (need +{delta.needed})
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

#### Step 5.4: Integrate Tooltips into Character Sheet

**File:** `frontend/src/features/menus/CharacterSheet.jsx` [MODIFY]

**Add tooltips to stat displays:**
```javascript
import StatBreakdownTooltip from '../../components/tooltips/StatBreakdownTooltip';

// In stat display section
<StatBreakdownTooltip
  statName="Attack Rating"
  breakdown={combatStats.attackRating.breakdown}
  value={combatStats.attackRating.value}
>
  <div className="stat-item">
    <span className="stat-name">Attack</span>
    <span className="stat-value">{combatStats.attackRating.value}</span>
  </div>
</StatBreakdownTooltip>
```

---

#### Step 5.5: Integrate Tooltips into Skill Tree View

**File:** `frontend/src/features/character/SkillTreeView.jsx` [MODIFY]

**Add unlock deltas:**
```javascript
import UnlockDeltaTooltip from '../../components/tooltips/UnlockDeltaTooltip';

// In skill card rendering
<UnlockDeltaTooltip
  prerequisites={skillDef.prerequisites}
  currentCharacter={currentCharacter}
>
  <div className={`skill-card ${status.status}`}>
    {/* Skill card content */}
  </div>
</UnlockDeltaTooltip>
```

---

### 6.3 Testing Requirements

**Unit Tests:**
- [ ] Tooltip components render correctly
- [ ] Breakdowns display accurate data
- [ ] Success previews calculate correctly
- [ ] Unlock deltas show correct requirements

**Integration Tests:**
- [ ] Tooltips appear on hover
- [ ] Tooltips position correctly
- [ ] Tooltips work in Character Sheet
- [ ] Tooltips work in Skill Tree View

**Manual Testing:**
- [ ] Test hover interactions
- [ ] Verify tooltip content is accurate
- [ ] Test on different screen sizes
- [ ] Verify accessibility (keyboard navigation)

---

## 7. Task 6: Cost Scaling for Attributes

### 7.1 Overview

**Purpose:** Prevent over-investment in single stats with cost scaling past soft cap.

**Time Estimate:** 1 week  
**Priority:** MEDIUM (Optional if time-constrained)

### 7.2 Step-by-Step Implementation

#### Step 6.1: Create Attribute Scaling Utility

**File:** `backend/src/utils/attributeScaling.js` [NEW]

**Purpose:** Handle attribute point costs and gain flattening

**Implementation:**
```javascript
/**
 * Attribute Scaling Utility
 * Handles cost scaling and gain flattening for attributes
 */

/**
 * Calculate attribute point cost
 * @param {number} current - Current attribute value
 * @param {number} softCap - Soft cap (default 50)
 * @returns {number} Cost in attribute points
 */
function getAttributePointCost(current, softCap = 50) {
  const baseCost = 1;
  if (current < softCap) return baseCost;
  
  const overSoft = current - softCap;
  const multiplier = 1 + (overSoft / 10); // Linear scaling
  return Math.ceil(baseCost * multiplier);
}

/**
 * Calculate attribute gain (with flattening past soft cap)
 * @param {number} current - Current attribute value
 * @param {number} baseGain - Base gain per point (usually 1)
 * @param {number} softCap - Soft cap (default 50)
 * @returns {number} Actual gain
 */
function getAttributeGain(current, baseGain = 1, softCap = 50) {
  if (current < softCap) return baseGain;
  
  const ratio = softCap / current;
  const flattenedGain = baseGain * Math.pow(ratio, 1.35);
  return Math.max(0.5, flattenedGain); // Minimum 0.5 gain
}

/**
 * Check if attribute can be increased
 * @param {number} current - Current attribute value
 * @param {number} availablePoints - Available attribute points
 * @param {number} hardCap - Hard cap (default 100)
 * @returns {Object} {canIncrease: boolean, cost: number, reason: string}
 */
function canIncreaseAttribute(current, availablePoints, hardCap = 100) {
  if (current >= hardCap) {
    return {
      canIncrease: false,
      cost: 0,
      reason: 'Attribute at hard cap (100)'
    };
  }
  
  const cost = getAttributePointCost(current);
  if (availablePoints < cost) {
    return {
      canIncrease: false,
      cost,
      reason: `Need ${cost} attribute point(s), have ${availablePoints}`
    };
  }
  
  return {
    canIncrease: true,
    cost,
    reason: null
  };
}

module.exports = {
  getAttributePointCost,
  getAttributeGain,
  canIncreaseAttribute
};
```

---

#### Step 6.2: Update Character Service

**File:** `backend/src/services/characterService.js` [MODIFY]

**Location:** `allocateAttributePoint()` method

**Add cost checking:**
```javascript
const { canIncreaseAttribute, getAttributeGain } = require('../utils/attributeScaling');

async allocateAttributePoint(characterId, attributeId) {
  const character = await PlayerCharacter.findByPk(characterId);
  if (!character) {
    throw new Error('Character not found');
  }
  
  // Check if can increase
  const current = character.stats[attributeId] || 10;
  const available = character.attributePoints || 0;
  const check = canIncreaseAttribute(current, available);
  
  if (!check.canIncrease) {
    throw new Error(check.reason);
  }
  
  // Calculate gain
  const gain = getAttributeGain(current);
  const newValue = current + gain;
  
  // Deduct cost
  character.attributePoints -= check.cost;
  character.stats[attributeId] = Math.min(100, newValue); // Cap at 100
  
  await character.save();
  
  return {
    success: true,
    newValue: character.stats[attributeId],
    cost: check.cost,
    remainingPoints: character.attributePoints
  };
}
```

---

#### Step 6.3: Update Frontend Attribute Allocation View

**File:** `frontend/src/features/character/AttributeAllocationView.jsx` [MODIFY]

**Add cost display:**
```javascript
import { getAttributePointCost } from '../../utils/attributeScaling';

// In attribute card rendering
const currentValue = currentCharacter.stats?.[attr.id] || 10;
const cost = getAttributePointCost(currentValue);
const canAfford = availablePoints >= cost;

<button
  className="allocate-button"
  onClick={() => handleAllocate(attr.id)}
  disabled={allocating || !canAfford || isAtCap}
  title={isAtCap ? 'Attribute at hard cap (100)' : !canAfford ? `Need ${cost} point(s)` : `Allocate ${cost} point(s) to ${attr.name}`}
>
  +1 ({cost} point{cost > 1 ? 's' : ''})
</button>
```

---

### 7.3 Testing Requirements

**Unit Tests:**
- [ ] Cost calculation works correctly
- [ ] Gain flattening works correctly
- [ ] Can increase check works correctly

**Integration Tests:**
- [ ] Character service uses cost scaling
- [ ] Frontend displays correct costs
- [ ] Allocation works with cost scaling

**Manual Testing:**
- [ ] Test attribute allocation at various levels
- [ ] Verify costs increase past soft cap
- [ ] Verify gains flatten past soft cap

---

## 8. Testing & Validation

### 8.1 Test Plan

**Unit Tests:**
- All utility functions
- All formula calculations
- Edge cases (0 values, caps, etc.)

**Integration Tests:**
- Service integrations
- Frontend-backend consistency
- End-to-end workflows

**Manual Testing:**
- Gameplay balance
- UI responsiveness
- Player experience

### 8.2 Validation Checklist

- [ ] DR curves prevent single-stat dominance
- [ ] Ability scaling doesn't break game
- [ ] Success checks feel fair
- [ ] Derived stats are transparent
- [ ] UI tooltips explain everything
- [ ] Cost scaling works correctly
- [ ] All calculations match between frontend and backend
- [ ] Performance is acceptable
- [ ] No regressions in existing systems

---

## 9. Implementation Timeline

### Week 1-2: Task 4 (Derived Stats) - Foundation
- Create derived stats JSON
- Create derived stats utility
- Update combat service
- Testing

### Week 3-4: Task 1 (DR Curves)
- Create DR utility
- Update combat service
- Update frontend
- Testing

### Week 5-7: Task 2 (Ability Scaling)
- Create ability scaling utility
- Update crafting service
- Update ability service
- Testing

### Week 8-9: Task 3 (Success Checks)
- Create success check utility
- Update crafting service
- Create lockpicking/hacking services
- Testing

### Week 10-12: Task 5 (UI Tooltips)
- Create tooltip components
- Integrate into Character Sheet
- Integrate into Skill Tree View
- Testing

### Week 13: Task 6 (Cost Scaling) - Optional
- Create attribute scaling utility
- Update character service
- Update frontend
- Testing

### Week 14-15: Buffer & Polish
- Bug fixes
- Performance optimization
- Final testing
- Documentation

---

## 10. Success Criteria

### Must Have (Launch Blockers):
- ✅ DR curves prevent single-stat dominance
- ✅ Ability scaling doesn't break game
- ✅ Success checks feel fair
- ✅ Derived stats are transparent
- ✅ UI tooltips explain everything

### Should Have (High Priority):
- ✅ Cost scaling for attributes
- ✅ Visual feedback for DR curves
- ✅ Success previews in UI

### Nice to Have (If Time Permits):
- ⚠️ Best-of-3 for expensive actions
- ⚠️ Status chips for active effects

---

**Document Version:** 1.0  
**Status:** Ready for Implementation  
**Next Steps:** Begin with Task 4 (Derived Stats) as foundation

