# Phase 1: Launch Priorities
## Focused Implementation Plan for Pre-Launch

**Date:** December 2024  
**Status:** Recommended Pre-Launch Focus  
**Rationale:** Ship a balanced, functional core system; enhance with player feedback post-launch

---

## Executive Summary

**Decision: Focus on Phase 1 Only Before Launch**

This approach is **highly recommended** for the following reasons:

1. ✅ **Critical Balance Issues** - Phase 1 fixes fundamental problems that could break the game
2. ✅ **No Content Debt** - Phase 1 doesn't require extensive content authoring
3. ✅ **Player Feedback** - Post-launch phases can be informed by actual player behavior
4. ✅ **Reduced Risk** - Smaller scope = higher quality, fewer bugs
5. ✅ **Faster Time to Market** - Ship sooner, iterate based on real data

---

## Refined Phase 1: Core Balance & Transparency

### What Phase 1 Includes

#### 1.1 Diminishing Returns Curves (CRITICAL)

**Why:** Prevents single-stat dominance and exploits

**Implementation:**
- Apply DR to: Crit Chance, Dodge/Evasion, Cooldown Reduction
- Use power curve formula (simpler than exponential)
- Keep linear scaling for: Damage, Defense, Health (more predictable)

**Formula:**
```javascript
// Power curve: easier to understand
function applyDR(raw, cap, threshold, power = 1.5) {
  if (raw <= 0) return 0;
  const ratio = raw / (raw + threshold);
  return cap * Math.pow(ratio, power);
}

// Crit Chance Example
// raw = 20, cap = 0.5, threshold = 15
// effective = 0.5 * (20/35)^1.5 ≈ 0.22 (22%)
```

**Scope:**
- ✅ Crit chance (Perception + skills)
- ✅ Dodge/evasion (Agility + skills)
- ⚠️ Cooldown reduction (if implemented)
- ❌ Skip: Damage, Defense (keep linear)

**Time Estimate:** 1-2 weeks

---

#### 1.2 Ability Scaling Formulas (CRITICAL)

**Why:** Prevents runaway power scaling

**Implementation:**
- Piecewise attribute scaling (2-3 tiers, not 5+)
- Multiplicative skill bonuses
- Clear stacking order

**Formula:**
```javascript
// Field Heal example
function calculateHealing(base, intelligence, medicLevel) {
  const intBonus = intelligence - 10;
  let intMultiplier = 1.0;
  
  // Piecewise: 2 tiers only
  if (intBonus > 0) {
    if (intBonus <= 10) {
      intMultiplier += intBonus * 0.03; // +3% per point (0-10)
    } else {
      intMultiplier += 0.30 + (intBonus - 10) * 0.015; // +1.5% per point (11+)
    }
  }
  
  // Multiplicative skill bonus
  const skillMultiplier = 1 + (medicLevel * 0.05);
  
  return Math.floor(base * intMultiplier * skillMultiplier);
}
```

**Scope:**
- ✅ All healing abilities
- ✅ Damage abilities (if they scale with attributes)
- ✅ Crafting success rates
- ✅ Lockpicking success rates

**Time Estimate:** 2-3 weeks

---

#### 1.3 Success Check Formulas (CRITICAL)

**Why:** Makes skill checks feel fair and predictable

**Implementation:**
- Logistic function for success rates
- Clamp to [0.1, 0.95]
- Advantage system (two rolls, keep best) for prepared actions

**Formula:**
```javascript
// Logistic success function
function calculateSuccessChance(skill, attribute, difficulty, toolBonus = 0) {
  const raw = skill + attribute - difficulty + toolBonus;
  const logistic = 1 / (1 + Math.exp(-raw * 0.35)); // k=0.35
  return Math.max(0.1, Math.min(0.95, logistic));
}

// Advantage: two rolls, keep best
function rollWithAdvantage(successChance) {
  const roll1 = Math.random();
  const roll2 = Math.random();
  const bestRoll = Math.min(roll1, roll2); // Lower is better
  return bestRoll <= successChance;
}
```

**Scope:**
- ✅ Crafting checks
- ✅ Lockpicking checks
- ✅ Hacking checks
- ✅ Dialogue checks (if implemented)
- ⚠️ Best-of-3: Only for legendary/elite actions (optional)

**Time Estimate:** 2 weeks

---

#### 1.4 Derived Stats System (HIGH)

**Why:** Transparent, explainable calculations

**Implementation:**
- Define AR, DR, CC, TS formulas
- Centralize in JSON file
- Use for all calculations

**Derived Stats:**
```javascript
// Attack Rating
AR = weaponBase * (1 + advWeapons * 0.02) * (1 + strength * 0.01)

// Defense Rating
DR = armorBase * (1 + tacticalAwareness * 0.03) * (1 + endurance * 0.01)

// Crit Chance (with DR)
CC = applyDR(perception * 0.01 + advWeapons * 0.01, 0.5, 15, 1.5)

// Tech Success (logistic)
TS = logistic(intelligence + hacking - difficulty)
```

**Scope:**
- ✅ Combat stats (AR, DR, CC)
- ✅ Tech success (TS)
- ✅ Stealth power
- ✅ All derived stats centralized

**Time Estimate:** 1-2 weeks

---

#### 1.5 UI Tooltips & Breakdowns (HIGH)

**Why:** Critical for player understanding and trust

**Implementation:**
- Hover breakdowns for all key stats
- Success previews ("52% (58% if AGI +1)")
- Unlock deltas ("Need PER +3 or Lv 8")
- Show DR curves visually

**UI Elements:**
```
[Lockpicking: 65%]
Hover shows:
  Base: 50%
  + Lockpicking (3): +15%
  + Agility (14): +0%
  - Lock Difficulty: -0%
  = 65%

If Agility +1: 66%
If Lockpicking +1: 70%
```

**Scope:**
- ✅ All derived stats (AR, DR, CC, TS)
- ✅ Success chances (crafting, lockpicking, hacking)
- ✅ Skill prerequisites
- ✅ Attribute effects
- ⚠️ Status chips (defer to Phase 2 if time-constrained)

**Time Estimate:** 2-3 weeks

---

#### 1.6 Cost Scaling for Attributes (MEDIUM)

**Why:** Prevents over-investment in single stats

**Implementation:**
- Soft cap at 50 (already exists)
- Cost scaling past soft cap
- Gain flattening

**Formula:**
```javascript
// Simplified cost scaling
function getAttributePointCost(current, softCap = 50) {
  const baseCost = 1;
  if (current < softCap) return baseCost;
  
  const overSoft = current - softCap;
  const multiplier = 1 + (overSoft / 10); // Linear, easy to understand
  return Math.ceil(baseCost * multiplier);
}

// Gain flattening
function getAttributeGain(current, baseGain, softCap = 50) {
  if (current < softCap) return baseGain;
  const ratio = softCap / current;
  return baseGain * Math.pow(ratio, 1.35);
}
```

**Scope:**
- ✅ Attribute point costs
- ✅ Gain calculations
- ✅ UI display of costs

**Time Estimate:** 1 week

---

### What Phase 1 Does NOT Include

❌ **Branch Traits** - Defer to Phase 2 (post-launch)  
❌ **Mastery Signatures** - Defer to Phase 2 (post-launch)  
❌ **World Tags** - Defer to Phase 3 (requires content work)  
❌ **Synergy Map** - Defer to Phase 2 (can add based on player feedback)  
❌ **Loadouts** - Defer to Phase 3 (nice to have)  
❌ **Item Augments** - Defer to Phase 3 (content work)  
❌ **Telemetry Dashboards** - Defer to Phase 4 (basic tracking only)  
❌ **Prestige System** - Defer to Phase 4 (endgame content)

---

## Phase 1 Timeline

### Total Estimate: 8-11 weeks

**Week 1-2:** DR Curves
- Implement power curve formula
- Apply to crit, dodge, CDR
- Add visual feedback in UI

**Week 3-5:** Ability Scaling
- Piecewise attribute scaling
- Multiplicative skill bonuses
- Update all ability calculations

**Week 6-7:** Success Checks
- Logistic functions
- Advantage system
- Update crafting, lockpicking, hacking

**Week 8-9:** Derived Stats
- Centralize formulas in JSON
- Implement AR, DR, CC, TS
- Update all calculations

**Week 10-12:** UI Tooltips
- Hover breakdowns
- Success previews
- Unlock deltas
- Visual DR curves

**Week 13:** Cost Scaling (if time permits)
- Attribute point costs
- Gain flattening
- UI display

**Buffer:** 1-2 weeks for testing and polish

---

## Post-Launch Enhancement Plan

### Phase 2: Build Identity (3-4 months post-launch)

**Add:**
- Branch traits at levels 3 and 6
- Mastery signatures at levels 6-10
- Basic synergy map (5-10 key synergies)

**Why Post-Launch:**
- Can see what builds players actually use
- Can design branch traits based on player behavior
- Less risky to add new systems when core is stable

---

### Phase 3: Synergies & World (6+ months post-launch)

**Add:**
- World tags (Dark, High-ground initially)
- Expanded synergy map
- Loadouts (one initially)
- Item augments

**Why Post-Launch:**
- Requires extensive content work
- Can prioritize based on player feedback
- World tags need content authoring

---

### Phase 4: Polish & Telemetry (9+ months post-launch)

**Add:**
- Advanced telemetry dashboards
- Full world tag system
- Prestige system
- A/B testing infrastructure

**Why Post-Launch:**
- Nice-to-have features
- Can be added based on player needs
- Requires infrastructure investment

---

## Benefits of This Approach

### 1. **Faster Time to Market**
- Ship in 3-4 months instead of 6-9 months
- Get player feedback sooner
- Start generating revenue earlier

### 2. **Reduced Risk**
- Smaller scope = fewer bugs
- Easier to test and balance
- Less chance of breaking existing systems

### 3. **Player-Informed Development**
- See what builds players actually use
- Design Phase 2 features based on real data
- Prioritize based on player needs, not assumptions

### 4. **No Content Debt**
- Phase 1 doesn't require extensive content work
- Can focus on core systems
- Content work can happen in parallel

### 5. **Iterative Improvement**
- Ship solid foundation
- Add features based on feedback
- Continuous improvement model

---

## Risks & Mitigations

### Risk 1: Players May Want More Features

**Mitigation:**
- Clear communication about post-launch roadmap
- Regular updates on Phase 2 progress
- Community feedback channels

### Risk 2: Phase 1 May Feel "Incomplete"

**Mitigation:**
- Ensure Phase 1 is polished and functional
- Focus on quality over quantity
- Make core systems feel great

### Risk 3: Post-Launch Phases May Be Delayed

**Mitigation:**
- Plan Phase 2 during Phase 1 development
- Have clear priorities for Phase 2
- Allocate resources early

---

## Success Criteria for Phase 1

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

## Recommendation

**✅ STRONGLY RECOMMEND: Focus on Phase 1 Only Before Launch**

This approach:
- Ships a balanced, functional game
- Reduces risk and complexity
- Enables player-informed development
- Provides clear post-launch roadmap
- Faster time to market

**Key Success Factor:**
Make Phase 1 **polished and complete**, not rushed. Better to ship a solid Phase 1 than a half-finished Phase 1+2.

---

**Document Version:** 1.0  
**Status:** Recommended Pre-Launch Strategy  
**Next Steps:** Finalize Phase 1 scope, create detailed task breakdown

