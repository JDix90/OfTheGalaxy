# Stamina System Analysis

## Executive Summary

The Stamina system is a resource management mechanic that gates ability usage in combat. Currently, it's a **simplified system** with basic consumption and restoration mechanics, but it lacks depth, passive regeneration, and integration with core gameplay loops beyond combat abilities.

---

## Current Implementation

### 1. **Max Stamina Calculation**

**Backend (`PlayerCharacter.js`):**
- Starting: `100` stamina
- Per level: `+5` stamina (on level up)
- **No attribute scaling** (Endurance doesn't affect max stamina in backend)
- Formula: `100 + (level * 5)`

**Frontend (`CharacterManager.js`):**
- Formula: `100 + (endurance * 5) + (level * 3)`
- **⚠️ DISCREPANCY:** Frontend includes Endurance scaling, backend does not

**Level-up Behavior:**
- On level up, both `currentStamina` and `maxStamina` are set to the new maximum
- Full restore on level up

### 2. **Stamina Consumption**

**Combat Abilities:**
- All abilities have a `cost.stamina` property
- Stamina is checked before ability execution
- If insufficient stamina, ability is blocked with error message
- Stamina is deducted immediately upon ability use

**Example Ability Costs:**
- `field_heal`: 25 stamina
- `force_insight`: 20 stamina
- `weapon_mastery`: 25 stamina
- `armor_mastery`: 20 stamina
- `data_analysis_mastery`: 15 stamina
- `force_mastery`: 40 stamina
- `force_artifact_mastery`: 30 stamina

**Other Actions:**
- ❌ **No stamina cost for basic attacks**
- ❌ **No stamina cost for movement**
- ❌ **No stamina cost for non-combat actions** (crafting, lockpicking, etc.)

### 3. **Stamina Restoration**

**Rest Action (`characterService.rest`):**
- Full restore to `maxStamina`
- Available outside combat
- No cost or cooldown mentioned

**Consumable Items:**
- Various items restore stamina:
  - Basic Ration: +10 stamina
  - Stimpack: +25 stamina
  - Advanced Stimpack: +50 stamina
  - Quick Stimpack: +40 stamina
  - Emergency Stimpack: +100 stamina
  - Adrenaline Injection: +75 stamina
  - Medkit: +50 stamina
  - Survival Kit: +100 stamina
  - Emergency Medkit: +150 stamina

**Level Up:**
- Full restore on level up

**Passive Regeneration:**
- ❌ **NO passive stamina regeneration** (unlike health, which has `HealthRegenService`)
- Health regenerates at 1% per minute (0.5% per 30-second tick)
- Stamina has no equivalent system

### 4. **UI Display**

**StatsBar Component:**
- Visual bar showing current/max stamina
- Percentage-based fill
- Displays: `{currentStamina} / {maxStamina}`
- Color-coded (stamina-fill class)

**Ability Tooltips:**
- Show stamina cost in tooltips
- Display availability status (disabled if insufficient stamina)
- Error messages: "Not enough stamina (need X)"

**Combat UI:**
- Abilities show stamina cost in action menu
- Disabled state when insufficient stamina
- Cooldown and stamina cost displayed together

---

## System Integration

### ✅ **What Works Well**

1. **Clear Resource Gating:** Stamina effectively gates powerful abilities, preventing spam
2. **Visual Feedback:** UI clearly shows stamina levels and costs
3. **Item Integration:** Consumables provide meaningful stamina restoration
4. **Combat Balance:** Forces tactical decisions about ability usage

### ❌ **Issues & Gaps**

#### 1. **Calculation Inconsistency**
- **Problem:** Frontend calculates max stamina with Endurance, backend does not
- **Impact:** UI may show incorrect max stamina values
- **Severity:** Medium

#### 2. **No Passive Regeneration**
- **Problem:** Stamina doesn't regenerate over time (unlike health)
- **Impact:** Players must rely on items or rest, which can feel limiting
- **Severity:** High (affects gameplay flow)

#### 3. **Limited Integration**
- **Problem:** Stamina only affects combat abilities, not other actions
- **Impact:** Missed opportunity for resource management depth
- **Severity:** Medium

#### 4. **No Attribute Scaling (Backend)**
- **Problem:** Endurance doesn't affect max stamina in backend
- **Impact:** Endurance feels less valuable for stamina-focused builds
- **Severity:** Medium

#### 5. **No Stamina-Based Movement**
- **Problem:** Movement doesn't consume stamina
- **Impact:** No resource cost for exploration/tactical positioning
- **Severity:** Low (design choice)

#### 6. **Rest Action Undefined**
- **Problem:** Rest action exists but no details on where/when it can be used
- **Impact:** Unclear player expectations
- **Severity:** Low

---

## Recommendations

### **High Priority**

#### 1. **Fix Calculation Inconsistency**
- **Action:** Standardize max stamina calculation
- **Options:**
  - **Option A:** Backend uses Endurance scaling: `100 + (endurance * 5) + (level * 5)`
  - **Option B:** Frontend matches backend: `100 + (level * 5)`
- **Recommendation:** **Option A** (Endurance should affect stamina)

#### 2. **Implement Passive Stamina Regeneration**
- **Action:** Create `StaminaRegenService` similar to `HealthRegenService`
- **Formula:** 
  - Base: 1% of max stamina per minute (0.5% per 30-second tick)
  - Minimum: 1 stamina per tick
  - Can be modified by skills/items
- **Conditions:**
  - Only outside combat
  - Paused during certain activities (optional)
- **Benefits:**
  - Reduces reliance on consumables
  - Improves gameplay flow
  - Matches health regeneration pattern

#### 3. **Add Endurance Scaling to Backend**
- **Action:** Update `PlayerCharacter.addXP` to calculate max stamina with Endurance
- **Formula:** `100 + (endurance * 5) + (level * 5)`
- **Note:** This should be recalculated on attribute point allocation, not just level up

### **Medium Priority**

#### 4. **Expand Stamina Integration**
- **Action:** Consider stamina costs for:
  - **Sprinting/Fast Movement:** 1-2 stamina per tile
  - **Heavy Actions:** Lockpicking, hacking (optional, 5-10 stamina)
  - **Crafting Complex Items:** 10-20 stamina (optional)
- **Benefits:**
  - Adds resource management depth
  - Makes stamina more meaningful
  - Creates interesting trade-offs

#### 5. **Skill-Based Stamina Bonuses**
- **Action:** Add stamina-related passives to skill trees
- **Examples:**
  - Survival tree: "+10 max stamina per level"
  - Combat tree: "-10% stamina cost for combat abilities"
  - Stealth tree: "Stamina regenerates 50% faster"
- **Benefits:**
  - Build diversity
  - Skill tree value
  - Player agency

#### 6. **Stamina Regeneration Modifiers**
- **Action:** Allow items/skills to modify regeneration rate
- **Examples:**
  - "Stamina regenerates 25% faster"
  - "Stamina regenerates even in combat (at 50% rate)"
- **Benefits:**
  - Itemization depth
  - Build customization

### **Low Priority**

#### 7. **Rest Action Clarification**
- **Action:** Define rest mechanics
- **Questions:**
  - Where can players rest? (Safe zones, beds, campsites)
  - Does rest take time? (Real-time or game-time)
  - Are there rest restrictions? (Combat cooldown, location-based)
- **Recommendation:** Rest should be available in safe zones, take 30-60 seconds, and fully restore health/stamina

#### 8. **Stamina Visualization Enhancements**
- **Action:** Improve UI feedback
- **Examples:**
  - Show stamina regeneration rate in tooltip
  - Display "Stamina will regenerate in X seconds" message
  - Add visual indicator when stamina is regenerating
- **Benefits:**
  - Better player understanding
  - Reduced frustration

#### 9. **Stamina-Based Status Effects**
- **Action:** Add stamina-related debuffs
- **Examples:**
  - "Exhausted" (0 stamina): -50% movement speed, -25% accuracy
  - "Fatigued" (<25% stamina): -10% to all actions
- **Benefits:**
  - Consequences for poor stamina management
  - Strategic depth

---

## Proposed Formula Changes

### **Max Stamina (Unified)**
```
maxStamina = 100 + (endurance * 5) + (level * 5)
```

**Rationale:**
- Endurance should affect stamina (makes sense thematically)
- Level scaling provides progression
- Base 100 ensures all characters start with meaningful stamina

### **Stamina Regeneration (New)**
```
regenPerTick = max(1, floor(maxStamina * 0.005))  // 0.5% per 30-second tick
regenPerMinute = maxStamina * 0.01  // 1% per minute
```

**Modifiers:**
- Skills: +25% to +100% regeneration rate
- Items: +10% to +50% regeneration rate
- Status effects: Can modify regeneration

### **Stamina Cost Scaling (Optional)**
```
actualCost = baseCost * (1 - skillReduction)
```

**Example:**
- Base ability cost: 25 stamina
- Combat skill level 5: -10% stamina cost
- Actual cost: 22.5 stamina (rounded to 23)

---

## Comparison with Health System

| Aspect | Health | Stamina |
|--------|--------|---------|
| **Max Calculation** | `100 + (endurance * 10) + (level * 5)` | `100 + (level * 5)` ❌ |
| **Passive Regen** | ✅ Yes (1% per minute) | ❌ No |
| **Restoration Items** | ✅ Yes | ✅ Yes |
| **Attribute Scaling** | ✅ Endurance | ❌ None (backend) |
| **Level Scaling** | ✅ +5 per level | ✅ +5 per level |
| **Combat Integration** | ✅ Damage/healing | ✅ Ability costs |
| **UI Display** | ✅ Bar + numbers | ✅ Bar + numbers |

**Key Insight:** Stamina is treated as a "combat-only" resource, while health is a "core survival" resource. This creates an imbalance where stamina feels less integrated into the overall gameplay loop.

---

## Implementation Priority

### **Phase 1: Critical Fixes (Immediate)**
1. Fix max stamina calculation inconsistency
2. Add Endurance scaling to backend
3. Implement passive stamina regeneration

### **Phase 2: Enhancements (Post-Launch)**
4. Add stamina-related skill bonuses
5. Expand stamina integration (movement, actions)
6. Add regeneration modifiers (skills/items)

### **Phase 3: Polish (Future)**
7. Rest action clarification
8. UI visualization enhancements
9. Stamina-based status effects

---

## Conclusion

The Stamina system is **functional but shallow**. It successfully gates ability usage in combat but lacks the depth and integration seen in the health system. The primary issues are:

1. **Inconsistency** between frontend and backend calculations
2. **No passive regeneration**, creating reliance on consumables
3. **Limited integration** beyond combat abilities
4. **Missing attribute scaling** in backend

**Recommended Next Steps:**
1. Fix calculation inconsistency (unify with Endurance scaling)
2. Implement passive regeneration (mirror health system)
3. Add skill-based stamina bonuses (build diversity)
4. Consider expanding stamina costs to other actions (movement, crafting)

This will transform stamina from a "combat gate" into a **meaningful resource management system** that affects multiple gameplay loops and rewards strategic planning.

