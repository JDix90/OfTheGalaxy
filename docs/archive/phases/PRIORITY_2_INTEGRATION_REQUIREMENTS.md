# Priority 2 Integration Requirements

**Date:** 2024  
**Status:** Planning → Implementation  
**Scope:** Combat System, Action System, Vendor Integration

---

## Overview

This document outlines the requirements for integrating Priority 2 enhancements (consumables, accessories, tools) into the game systems. These integrations are necessary to make the new items fully functional.

---

## Integration 1: Combat System - Temporary Effects

### Objective
Support temporary stat boosts, shields, and effect duration tracking in combat.

### Requirements

#### 1.1 Temporary Effect Types
- **Temporary Shields:** `temporaryShield` - Adds temporary HP that absorbs damage
- **Temporary Accuracy:** `temporaryAccuracy` - Increases accuracy for duration
- **Temporary Damage:** `temporaryDamage` - Increases damage output for duration
- **Temporary Stealth:** `temporaryStealth` - Increases stealth effectiveness for duration

#### 1.2 Effect Duration
- All temporary effects have a `duration` in seconds
- Effects expire after duration
- Duration should be tracked per combatant
- Effects should be removed when duration expires

#### 1.3 Implementation Details

**Backend Changes:**
- Update `combatService.js` to:
  - Track active temporary effects per combatant
  - Apply temporary stat bonuses in damage/accuracy calculations
  - Handle temporary shields (absorb damage before health)
  - Remove expired effects after each turn
  - Store effects in encounter metadata

**Frontend Changes:**
- Update `CombatView.jsx` to:
  - Display active temporary effects on combatant cards
  - Show effect duration countdown
  - Visual indicators for active effects (icons, colors)

**Data Structure:**
```javascript
combatant.temporaryEffects = [
  {
    type: 'shield' | 'accuracy' | 'damage' | 'stealth',
    value: number,
    duration: number, // seconds remaining
    source: 'item_id'
  }
]
```

#### 1.4 Acceptance Criteria
- [ ] Temporary shields absorb damage before health
- [ ] Temporary accuracy boosts apply to attack rolls
- [ ] Temporary damage boosts apply to damage calculations
- [ ] Temporary stealth boosts apply to stealth checks
- [ ] Effects expire after duration
- [ ] Effects display in UI
- [ ] Multiple effects can stack (if applicable)

---

## Integration 2: Combat System - Enhanced Consumables

### Objective
Support instant vs. gradual healing, faster use speeds, and full heal effects.

### Requirements

#### 2.1 Use Speed Types
- **Normal:** Standard use time (current behavior)
- **Fast:** Reduced use time (50% faster)
- **Instant:** No use time (immediate effect)

#### 2.2 Healing Types
- **Standard:** Restores fixed amount of health
- **Full Heal:** Restores health to maximum (999 or actual maxHealth)

#### 2.3 Implementation Details

**Backend Changes:**
- Update `combatService.js` `executeUseItem()` to:
  - Check `useSpeed` property
  - Handle instant healing (no turn delay)
  - Handle full heal flag
  - Support gradual healing over time (if needed)

**Frontend Changes:**
- Update `ActionMenu.jsx` to:
  - Display use speed in item tooltip
  - Show instant items with special indicator
  - Disable instant items if already used (if needed)

**Data Structure:**
```javascript
item.stats = {
  healthRestore: number,
  useSpeed: 'normal' | 'fast' | 'instant', // optional
  fullHeal: true // optional, for full heal items
}
```

#### 2.4 Acceptance Criteria
- [ ] Instant items apply immediately
- [ ] Fast items use less time
- [ ] Full heal items restore to max health
- [ ] Standard items work as before
- [ ] UI shows use speed information

---

## Integration 3: Action System - Tool Bonuses

### Objective
Apply tool bonuses to relevant actions (repair, hacking, medical, crafting).

### Requirements

#### 3.1 Tool Categories
- **Repair Tools:** Apply to repair actions
- **Slicing Tools:** Apply to hacking/slicing actions
- **Medical Tools:** Apply to medical/healing actions
- **Specialized Tools:** Apply to archaeology, mining, crafting actions

#### 3.2 Implementation Details

**Backend Changes:**
- Create `toolService.js` to:
  - Get equipped tool for character
  - Calculate tool bonus for action type
  - Return bonus value for action calculations

- Update action services to:
  - Check for equipped tools before action
  - Apply tool bonus to success rate
  - Display tool requirement in action results

**Action Services to Update:**
- `repairService.js` - Check for repair tools
- `hackingService.js` - Check for slicing tools
- `medicalService.js` - Check for medical tools
- `craftingService.js` - Check for crafting tools (if exists)
- `archaeologyService.js` - Check for archaeology tools (if exists)
- `miningService.js` - Check for mining tools (if exists)

**Data Structure:**
```javascript
toolBonus = {
  repair: number,
  hacking: number,
  medical: number,
  archaeology: number,
  mining: number,
  crafting: number
}
```

#### 3.3 Acceptance Criteria
- [ ] Repair tools improve repair success rate
- [ ] Slicing tools improve hacking success rate
- [ ] Medical tools improve medical action success rate
- [ ] Specialized tools improve specialized action success rate
- [ ] Tool bonuses are displayed in action results
- [ ] Actions show tool requirements in UI

---

## Integration 4: Vendor System - Item Stocking

### Objective
Ensure vendors stock appropriate items based on vendor type and faction.

### Requirements

#### 4.1 Vendor Types
- **Medical Vendors:** Stock medpacs, medical tools, medical scanners
- **Tech Vendors:** Stock datapads, scanners, slicing tools
- **Communication Vendors:** Stock comlinks
- **General Vendors:** Stock basic consumables, common tools
- **Faction Vendors:** Stock faction-appropriate items (already implemented)

#### 4.2 Implementation Details

**Backend Changes:**
- Update `npcGenerator.js` `generateVendorInventory()` to:
  - Check vendor type/submap type
  - Filter items by vendor category
  - Stock appropriate items for vendor type
  - Maintain faction filtering (already done)

**Vendor Categories:**
```javascript
const vendorCategories = {
  medical: ['medpac_*', 'medical_*', 'bacta_*'],
  tech: ['datapad_*', 'scanner_*', 'slicer_*'],
  communication: ['comlink_*'],
  general: ['stimpack_*', 'ration_*', 'repair_toolkit']
}
```

#### 4.3 Acceptance Criteria
- [ ] Medical vendors stock medpacs and medical tools
- [ ] Tech vendors stock datapads and scanners
- [ ] Communication vendors stock comlinks
- [ ] General vendors stock basic consumables
- [ ] Faction vendors stock faction items (already working)
- [ ] Vendors have appropriate item variety

---

## Integration 5: Frontend - Effect Display

### Objective
Display temporary effects, tool bonuses, and item information in UI.

### Requirements

#### 5.1 Combat View Updates
- Display active temporary effects on combatant cards
- Show effect duration countdown
- Visual indicators (icons, colors) for effects
- Show tool-equipped status (if applicable)

#### 5.2 Inventory View Updates
- Display tool bonuses in tooltip
- Show temporary effect information for consumables
- Display use speed information
- Show special effects for accessories

#### 5.3 Action View Updates
- Display tool bonus in action success rate
- Show tool requirement for actions
- Display tool-equipped indicator

#### 5.4 Implementation Details

**Components to Update:**
- `CombatView.jsx` - Effect display
- `CombatantDisplay.jsx` - Effect indicators
- `ItemTooltip.jsx` - Effect information
- `ActionMenu.jsx` - Use speed display
- Action result components - Tool bonus display

#### 5.5 Acceptance Criteria
- [ ] Temporary effects display in combat
- [ ] Effect duration shows countdown
- [ ] Tool bonuses display in tooltips
- [ ] Use speed information shows in UI
- [ ] Special effects display correctly

---

## Implementation Order

1. **Combat System - Temporary Effects** (Highest Priority)
   - Backend: Effect tracking and application
   - Frontend: Effect display

2. **Combat System - Enhanced Consumables** (High Priority)
   - Backend: Use speed and full heal support
   - Frontend: Use speed display

3. **Action System - Tool Bonuses** (Medium Priority)
   - Backend: Tool service and action integration
   - Frontend: Tool bonus display

4. **Vendor System - Item Stocking** (Medium Priority)
   - Backend: Vendor inventory filtering

5. **Frontend - Effect Display** (Low Priority - UI Polish)
   - Frontend: All UI updates

---

## Technical Considerations

### Performance
- Effect tracking should be lightweight
- Tool checks should be cached
- UI updates should not cause lag

### Data Persistence
- Temporary effects stored in encounter metadata
- Tool-equipped status stored in character inventory
- Effect expiration handled per turn

### Error Handling
- Graceful degradation if tool not equipped
- Fallback to base stats if effect expires
- Clear error messages for missing tools

---

## Testing Requirements

### Unit Tests
- Effect application logic
- Tool bonus calculations
- Effect expiration
- Use speed handling

### Integration Tests
- Combat with temporary effects
- Actions with tool bonuses
- Vendor inventory generation
- Effect display in UI

### Manual Testing
- Use all consumable types
- Equip all tool types
- Test all action types with tools
- Verify vendor stocking

---

## Success Metrics

- All temporary effects work correctly
- All consumable types function properly
- Tool bonuses apply to all relevant actions
- Vendors stock appropriate items
- UI displays all information clearly
- No performance degradation

---

**Status:** Ready for Implementation  
**Estimated Time:** 2-3 days  
**Priority:** High (blocks Priority 3)


