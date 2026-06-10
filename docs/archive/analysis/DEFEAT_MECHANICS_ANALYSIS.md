# Player Defeat Mechanics - Analysis & Recommendations

## Current State

When a player's health reaches 0 in combat:
- Combat encounter ends with status `'lost'`
- Character's `currentHealth` is set to `0`
- No respawn/revival logic currently implemented
- Player remains at the location where they were defeated

## Design Considerations

### 1. Player Experience
- **Frustration Level**: Too harsh = players quit, too lenient = no challenge
- **Narrative Consistency**: Should make sense in the Star Wars universe
- **Progression Preservation**: Don't want to lose too much progress
- **Location Context**: Where they were defeated matters (safe vs. dangerous planet)

### 2. Star Wars Lore
- **Medical Facilities**: Bacta tanks, medical droids, field medics
- **Spaceports**: Usually have basic medical facilities
- **Cities**: Major cities have hospitals/medical centers
- **Faction Bases**: Often have medical bays
- **Remote Locations**: May require evacuation to nearest safe location

### 3. Game Balance
- **Punishment**: Should there be a penalty? (credits, items, time)
- **Recovery Cost**: Free healing vs. paid medical services
- **Distance Travel**: How far should they be moved?

## Option Analysis

### Option 1: Medical Center on Current Planet ⭐ **RECOMMENDED**
**Mechanism:**
- Spawn at nearest Medical Center on the planet they were defeated on
- If no Medical Center exists, spawn at Spaceport (which has basic medical facilities)
- Health restored to 50% (or full, depending on balance)
- Small credit cost (e.g., 100-500 credits) for medical services

**Pros:**
- ✅ Thematically appropriate (medical facilities in Star Wars)
- ✅ Keeps player in same area (doesn't break immersion)
- ✅ Can add Medical Center as a new location type
- ✅ Allows for future medical gameplay (healing items, medical NPCs)
- ✅ Not too punishing (stays on same planet)

**Cons:**
- ⚠️ Requires implementing Medical Center locations
- ⚠️ If defeated in dangerous area, might immediately encounter enemies again

**Implementation:**
1. Add "Medical Center" as a location type (similar to cities, markets, POIs)
2. Generate at least one Medical Center per planet (in major cities or near spaceports)
3. Create Medical Center sub-map template (medical bay, reception, recovery rooms)
4. On defeat: Find nearest Medical Center → Spawn there → Restore health → Charge credits

---

### Option 2: Spaceport on Current Planet
**Mechanism:**
- Always spawn at Spaceport on current planet
- Health restored to 25-50%
- Free (spaceports have basic medical facilities)

**Pros:**
- ✅ Simple implementation (spaceports already exist)
- ✅ Thematically appropriate (spaceports have medical facilities)
- ✅ Safe location (spaceports are usually secure)

**Cons:**
- ⚠️ Less interesting than dedicated Medical Centers
- ⚠️ Might be too far from where player was exploring
- ⚠️ Less room for future medical gameplay expansion

---

### Option 3: Main Planet of System
**Mechanism:**
- Spawn at Spaceport on the "main" planet of the current star system
- Health restored to full
- Free transport (evacuation)

**Pros:**
- ✅ Very safe (main planets are usually secure)
- ✅ Gives player a "reset" if they were in a dangerous area
- ✅ Thematically appropriate (medical evacuation)

**Cons:**
- ⚠️ Can be very far from where player was (breaks immersion)
- ⚠️ Might lose exploration progress
- ⚠️ Requires defining "main planet" for each system

---

### Option 4: Last Safe Location
**Mechanism:**
- Track "last safe location" (spaceport, city, medical center)
- Spawn at last visited safe location
- Health restored to 50%
- Small credit cost

**Pros:**
- ✅ Most player-friendly
- ✅ Rewards exploration (visiting safe locations)
- ✅ Flexible (works with any safe location type)

**Cons:**
- ⚠️ Requires tracking "safe locations"
- ⚠️ Might be on a different planet
- ⚠️ More complex implementation

---

### Option 5: Character's Home Planet
**Mechanism:**
- Spawn at starting planet (e.g., Chandrila)
- Health restored to full
- Free (returning home for recovery)

**Pros:**
- ✅ Very safe
- ✅ Thematically appropriate (returning home)
- ✅ Simple implementation

**Cons:**
- ⚠️ Can be very far (breaks immersion)
- ⚠️ Very punishing (loses all exploration progress)
- ⚠️ Not ideal for open-world exploration game

---

## Recommended Approach: **Option 1 (Medical Center on Current Planet)**

### Implementation Plan

#### Phase 1: Medical Center Locations
1. **Add Medical Center to Location Types**
   - New location type: `medical_center`
   - Generate at least one per planet (in major cities or near spaceports)
   - Can be a POI or a city building

2. **Medical Center Sub-Map Template**
   - Template type: `medical_center`
   - Components:
     - Reception area
     - Medical bay (bacta tanks, medical droids)
     - Recovery rooms
     - Medical vendor (healing items, medical supplies)
   - NPCs: Medical droids, doctors, nurses

3. **Planet Map Generation**
   - Modify `planetMapGenerator` to include Medical Centers
   - Place in major cities or near spaceports
   - Ensure at least one per planet

#### Phase 2: Defeat Handling
1. **Combat Service Enhancement**
   - When combat ends with status `'lost'`:
     - Find nearest Medical Center on current planet
     - If none exists, use Spaceport as fallback
     - Update character location to Medical Center
     - Restore health (50% or configurable)
     - Charge medical fee (100-500 credits, or free if broke)
     - Save character state

2. **Frontend Defeat Screen**
   - Show defeat message
   - Display: "You have been defeated and evacuated to [Medical Center Name]"
   - Show medical fee charged
   - Button: "Continue" (returns to planet surface at Medical Center)

#### Phase 3: Medical Center Gameplay (Future)
1. **Medical Services**
   - Full health restoration (for credits)
   - Stamina restoration
   - Status effect removal
   - Medical supplies vendor

2. **Medical NPCs**
   - Doctors who provide healing services
   - Medical droids (2-1B, FX-7)
   - Quest givers (medical-related quests)

3. **Medical Items**
   - Bacta patches
   - Medpacs
   - Stim packs

---

## Implementation Details

### Medical Center Location Priority
1. **First Choice**: Medical Center in nearest major city
2. **Second Choice**: Medical Center near spaceport
3. **Fallback**: Spaceport itself (has basic medical facilities)

### Health Restoration
- **Option A**: Restore to 50% (encourages using medical services)
- **Option B**: Restore to 25% (more challenging)
- **Option C**: Restore to full (most player-friendly)

**Recommendation**: Start with 50% - balanced and encourages medical gameplay

### Medical Fee
- **Base Cost**: 100 credits
- **Scaling**: +50 credits per level (e.g., Level 3 = 200 credits)
- **Free if Broke**: If player has < 100 credits, free treatment (charity/emergency care)

### Location Update
```javascript
// In combatService.js - endEncounter method
if (status === 'lost') {
  const character = await PlayerCharacter.findByPk(encounter.characterId);
  if (character) {
    // Find nearest medical center
    const medicalCenter = await findNearestMedicalCenter(character.currentPlanet);
    
    // Update location
    character.currentLocation = {
      x: medicalCenter.x,
      y: medicalCenter.y,
      area: 'medical_center',
      subMapId: medicalCenter.subMapId || null
    };
    
    // Restore health (50%)
    character.currentHealth = Math.floor(character.maxHealth * 0.5);
    
    // Charge medical fee
    const medicalFee = calculateMedicalFee(character.level);
    character.credits = Math.max(0, character.credits - medicalFee);
    
    await character.save();
  }
}
```

---

## Alternative: Hybrid Approach

If Medical Centers are too complex initially, use **Option 2 (Spaceport)** as a temporary solution, then upgrade to Medical Centers later.

**Temporary Implementation:**
- Spawn at Spaceport on current planet
- Restore health to 50%
- Free (spaceport medical facilities)
- Later: Upgrade to Medical Centers when ready

---

## Questions to Consider

1. **Should there be a death penalty beyond medical fees?**
   - Item loss? (Probably not - too harsh)
   - XP loss? (Probably not - too harsh)
   - Time penalty? (Maybe - respawn delay?)

2. **Should Medical Centers be discoverable locations?**
   - Yes - adds to exploration
   - Players can fast-travel to them once discovered

3. **Should there be different Medical Center tiers?**
   - Basic (spaceports): 25% health, free
   - Standard (cities): 50% health, 100 credits
   - Advanced (major cities): 75% health, 200 credits
   - Elite (faction bases): 100% health, 500 credits

4. **What about defeat in space/space combat?**
   - Future consideration
   - Might need different handling (evacuation to nearest planet)

---

## Recommendation Summary

**Primary Recommendation**: **Option 1 - Medical Center on Current Planet**

**Why:**
- Thematically appropriate (Star Wars medical facilities)
- Good balance (not too harsh, not too lenient)
- Room for future expansion (medical gameplay)
- Keeps player in same area (doesn't break immersion)
- Adds interesting new location type to explore

**Implementation Priority:**
1. **High**: Basic defeat handling (spawn at spaceport, restore 50% health)
2. **Medium**: Medical Center locations and sub-maps
3. **Low**: Advanced medical gameplay (services, NPCs, items)

**Quick Start**: Implement spaceport respawn first, then add Medical Centers as enhancement.


