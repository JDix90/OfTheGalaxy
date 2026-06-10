# Comprehensive Testing Guide - Phase 1 & Phase 2 Features

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Planet Data Testing](#planet-data-testing)
4. [NPC Testing](#npc-testing)
5. [Quest System Testing](#quest-system-testing)
6. [Quest Chain Testing](#quest-chain-testing)
7. [Item System Testing](#item-system-testing)
8. [Faction-Specific Testing](#faction-specific-testing)
9. [Integration Testing](#integration-testing)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### 1. Database Setup
Before testing, ensure the database is seeded with Phase 1 and Phase 2 content:

```bash
cd /Users/jefe/Downloads/of-the-galaxy-rpg-foundation
node backend/src/scripts/seed-phase1-content.js
```

**Expected Output:**
- ✓ NPCs seeded: 20+ new NPCs
- ✓ Items seeded: 40+ items
- ✓ Quests seeded: 20+ new quests
- ✓ Planets updated: 4 planets

### 2. Server Startup
Ensure both backend and frontend servers are running:

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 3. Character Creation
Create a new character or use an existing one. Note your character ID for testing.

---

## Initial Setup

### Step 1: Verify Database Content
**Action:** Check that content was seeded correctly

**Backend Console Check:**
- Look for successful seeding messages
- Verify no errors during seeding

**Database Verification (Optional):**
```sql
-- Check NPCs
SELECT COUNT(*) FROM npcs WHERE faction_id IN ('independent_investigators', 'smugglers_guild', 'jedi_seekers', 'new_republic', 'imperial_remnant', 'outer_rim_settlers');

-- Check Quests
SELECT COUNT(*) FROM quests WHERE faction_id IN ('independent_investigators', 'smugglers_guild', 'jedi_seekers', 'new_republic', 'imperial_remnant', 'outer_rim_settlers');

-- Check Items
SELECT COUNT(*) FROM items WHERE item_type = 'quest_item';
```

**Expected Result:** 
- NPCs: 20+ records
- Quests: 20+ records
- Items: 40+ quest items

---

## Planet Data Testing

### Test 1: Planet POIs Display
**Location:** Galaxy Map → Select Planet → Planet Surface

**Steps:**
1. Navigate to Galaxy Map
2. Click on **Ryloth**
3. Land on the planet surface
4. Check the planet map

**Expected Results:**
- ✅ Planet map displays correctly
- ✅ POIs are visible on the map:
  - Ryloth: Lessu Capital, Syndicate Mines, Tann Province, Lessu Cantina, Refugee Settlement
  - Tatooine: Mos Eisley, Jabba's Palace, Lars Homestead, Beggar's Canyon, Jundland Wastes, Cantina
  - Dantooine: Jedi Enclave Ruins, Kinrath Cave, Abandoned Rebel Base, Settlement
  - Coruscant: Jedi Temple, Senate Building, Underworld Sector, Galactic City

**Verification:**
- POI names appear on map
- POI icons are visible
- Clicking POIs shows interaction menu

### Test 2: POI Interaction Menu
**Location:** Planet Surface → Click on POI

**Steps:**
1. Click on a POI (e.g., "Lessu, the Capital City" on Ryloth)
2. Verify interaction menu appears
3. Check available actions

**Expected Results:**
- ✅ Modal/menu appears with POI name and description
- ✅ Available actions shown (Enter, Investigate, etc.)
- ✅ Actions are appropriate for POI type

**Test Different POI Types:**
- **City/Spaceport:** Should have "Enter" option
- **Wilderness/Danger:** Should have "Investigate" option
- **Cantina:** Should have "Enter" option
- **Mine:** Should have "Enter" and "Investigate" options

### Test 3: Entering POIs (Sub-Maps)
**Location:** Planet Surface → POI → Click "Enter"

**Steps:**
1. Click on a POI with "Enter" option
2. Click "Enter" button
3. Verify sub-map loads

**Expected Results:**
- ✅ Navigation to sub-map occurs
- ✅ Sub-map displays correctly
- ✅ Player icon appears on sub-map
- ✅ NPCs are visible (if applicable)
- ✅ Layout matches POI type (city, spaceport, cantina, etc.)

**Test POIs:**
- Ryloth: Lessu Capital (city), Lessu Cantina (cantina)
- Tatooine: Mos Eisley (spaceport), Mos Eisley Cantina (cantina)
- Dantooine: Settlement (city)
- Coruscant: Galactic City (city)

### Test 4: POI Investigation
**Location:** Planet Surface → POI → Click "Investigate"

**Steps:**
1. Click on a POI
2. Click "Investigate" button
3. Verify investigation modal appears

**Expected Results:**
- ✅ Investigation modal opens
- ✅ Lore-accurate description displayed
- ✅ POI name and type shown
- ✅ Modal can be closed

### Test 5: Planet Resources
**Location:** Planet Surface → Check Resources

**Steps:**
1. Navigate to planet surface
2. Check if resources are accessible (may require inventory or resource gathering)

**Expected Results:**
- ✅ Resources are defined for each planet:
  - Ryloth: Ryll Spice, Doonium
  - Tatooine: Krayt Dragon Pearl, Bantha Hide, Dragon Bones
  - Dantooine: Dantari Crystals, Kinrath Eggs
  - Coruscant: Political Favors, Information

---

## NPC Testing

### Test 6: NPC Spawning
**Location:** Sub-Maps (Cities, Cantinas, etc.)

**Steps:**
1. Enter a sub-map (e.g., Lessu Capital on Ryloth)
2. Check for NPCs on the map
3. Verify NPC positions

**Expected Results:**
- ✅ NPCs appear on sub-map
- ✅ NPCs are not clustered in one corner
- ✅ NPC positions match their location data
- ✅ NPC names/identifiers visible on hover

**Test Locations:**
- **Ryloth - Lessu:** Keth Varr (Twi'lek Informant), Zara Vex (Smuggler Contact)
- **Ryloth - Tann Province:** Lira Tann (Refugee Leader), Elder Tala (Village Elder)
- **Tatooine - Mos Eisley:** Owen Lars (Old Farmer), Rex Danner (Race Organizer)
- **Dantooine - Settlement:** Master Kira Voss (Jedi Seeker), Commander Elena Rost (NR Intel)

### Test 7: NPC Dialogue
**Location:** Sub-Map → Click on NPC

**Steps:**
1. Click on an NPC
2. Verify dialogue menu appears
3. Check dialogue options

**Expected Results:**
- ✅ Dialogue menu opens
- ✅ NPC name and appearance shown
- ✅ Greeting dialogue displayed (based on relationship level)
- ✅ Quest-related dialogue available (if NPC has quests)
- ✅ General dialogue options available

**Test NPCs:**
- **Quest Givers:** Should show quest dialogue
- **Companions:** Should show companion dialogue
- **Generic NPCs:** Should show general dialogue

### Test 8: NPC Quest Offering
**Location:** Sub-Map → NPC → Dialogue

**Steps:**
1. Talk to a quest giver NPC
2. Check for quest offer
3. Accept quest if available

**Expected Results:**
- ✅ Quest giver offers quest
- ✅ Quest details displayed (title, description, objectives)
- ✅ Quest can be accepted
- ✅ Quest appears in quest log

**Test Quest Givers:**
- **Keth Varr (Ryloth):** "The Trail Begins" quest
- **Lira Tann (Ryloth):** "Refugee Liberation" quest
- **Owen Lars (Tatooine):** "The Krayt Dragon Legend" quest
- **Master Kira Voss (Dantooine):** "The Enclave's Call" quest
- **Commander Elena Rost (Dantooine):** "The Abandoned Base" quest
- **Marcus Vale (Coruscant):** "Whispers of Corruption" quest

### Test 9: NPC Companion Recruitment
**Location:** Sub-Map → Companion NPC

**Steps:**
1. Find a companion NPC (e.g., Kara "Stalker" Vex on Tatooine)
2. Talk to them
3. Check for companion recruitment option

**Expected Results:**
- ✅ Companion recruitment dialogue available
- ✅ Companion can be recruited
- ✅ Companion appears in companion list
- ✅ Companion stats/abilities visible

**Test Companions:**
- **Kara "Stalker" Vex (Tatooine):** Hunter companion for krayt dragon quest
- **Jax Riven (Chandrila):** Combat companion from Compound 7-Alpha quest

---

## Quest System Testing

### Test 10: Quest Availability
**Location:** Quest Log / NPC Dialogue

**Steps:**
1. Check quest log for available quests
2. Verify quests are listed correctly
3. Check quest prerequisites

**Expected Results:**
- ✅ Available quests shown in quest log
- ✅ Quest details displayed (title, description, difficulty)
- ✅ Prerequisites checked (level, reputation, completed quests)
- ✅ Locked quests shown but not available

**Test Quest Availability:**
- **Starting Quest:** "Echoes from Compound 7-Alpha" (should be available at level 1)
- **Chain Quests:** Should unlock after completing previous quest
- **Faction Quests:** Should require appropriate reputation

### Test 11: Starting a Quest
**Location:** NPC Dialogue → Accept Quest

**Steps:**
1. Talk to quest giver
2. Accept quest
3. Verify quest starts

**Expected Results:**
- ✅ Quest added to active quests
- ✅ Quest objectives displayed
- ✅ Quest progress tracked
- ✅ Quest appears in quest log

**Test Starting Quests:**
- Start "Echoes from Compound 7-Alpha" (IIA)
- Start "The Krayt Dragon Legend" (Smugglers Guild)
- Start "The Enclave's Call" (Jedi Seekers)

### Test 12: Quest Objectives - Interact
**Location:** Quest → Objective: "Speak with [NPC]"

**Steps:**
1. Start a quest with "interact" objective
2. Navigate to target NPC
3. Talk to NPC
4. Verify objective completion

**Expected Results:**
- ✅ Objective marked as complete
- ✅ Quest progress updated
- ✅ Next objective unlocked (if applicable)

**Test Interact Objectives:**
- "Speak with Mira Kess" (Compound 7-Alpha quest)
- "Speak with Keth Varr" (Trail Begins quest)
- "Speak with Master Kira Voss" (Enclave Call quest)

### Test 13: Quest Objectives - Travel
**Location:** Quest → Objective: "Travel to [Location]"

**Steps:**
1. Start a quest with "travel" objective
2. Navigate to target location
3. Verify objective completion

**Expected Results:**
- ✅ Objective completes when player reaches location
- ✅ Location matches quest requirement (planet, area)
- ✅ Quest progress updated

**Test Travel Objectives:**
- "Travel to Ryloth" (Trail Begins quest)
- "Travel to the Syndicate Mines" (Mines Investigation quest)
- "Travel to the Jedi Enclave" (Enclave Call quest)

### Test 14: Quest Objectives - Collect
**Location:** Quest → Objective: "Collect [Item]"

**Steps:**
1. Start a quest with "collect" objective
2. Obtain required item (from NPC, loot, quest reward)
3. Verify objective completion

**Expected Results:**
- ✅ Item added to inventory
- ✅ Objective marked complete when item count reached
- ✅ Progress tracked (e.g., "3/5 items collected")

**Test Collect Objectives:**
- "Obtain the foreman's datapad" (Mines Investigation)
- "Collect Dantari crystals" (Kinrath Crystals quest)
- "Recover Rebel intelligence datapads" (Abandoned Base quest)

### Test 15: Quest Objectives - Defeat
**Location:** Quest → Objective: "Defeat [Enemy]"

**Steps:**
1. Start a quest with "defeat" objective
2. Engage in combat with target enemy
3. Defeat enemy
4. Verify objective completion

**Expected Results:**
- ✅ Enemy defeated
- ✅ Objective marked complete
- ✅ Count tracked (e.g., "3/5 enemies defeated")
- ✅ Quest progress updated

**Test Defeat Objectives:**
- "Defeat syndicate thugs" (Refugee Liberation quest)
- "Defeat Vorak Kresh" (Syndicate Exposure quest)
- "Defeat the legendary krayt dragon" (Dragon Hunt quest)

### Test 16: Quest Objectives - Discover
**Location:** Quest → Objective: "Discover [Evidence]"

**Steps:**
1. Start a quest with "discover" objective
2. Investigate/interact with target location/NPC
3. Verify evidence discovered
4. Check objective completion

**Expected Results:**
- ✅ Evidence discovered
- ✅ Objective marked complete
- ✅ Evidence added to quest log/notes

**Test Discover Objectives:**
- "Learn about the connection between Tann Province and Compound 7-Alpha"
- "Discover evidence linking the mines to Compound 7-Alpha"
- "Investigate the Enclave ruins"

### Test 17: Quest Objectives - Custom
**Location:** Quest → Objective: "Custom" type

**Steps:**
1. Start a quest with "custom" objective
2. Perform required action (negotiation, choice, etc.)
3. Verify objective completion

**Expected Results:**
- ✅ Custom objective handled correctly
- ✅ Objective completes when action performed
- ✅ Player choices tracked

**Test Custom Objectives:**
- "Secure transport for refugees" (Refugee Liberation)
- "Negotiate the price for information" (Underworld Connection)
- "Choose how to use the crystals" (Kinrath Crystals)

### Test 18: Quest Completion
**Location:** Quest → Complete all objectives

**Steps:**
1. Complete all quest objectives
2. Verify quest completion
3. Check rewards distribution

**Expected Results:**
- ✅ All objectives marked complete
- ✅ Quest status changes to "completed"
- ✅ Rewards distributed:
  - XP added to character
  - Credits added to inventory
  - Reputation updated
  - Items added to inventory
  - Next quests unlocked

**Test Quest Completion:**
- Complete "Echoes from Compound 7-Alpha"
- Verify "The Trail Begins" unlocks
- Check rewards received

### Test 19: Quest Rewards
**Location:** Quest Completion

**Steps:**
1. Complete a quest
2. Verify all rewards received
3. Check inventory for items

**Expected Results:**
- ✅ XP added to character level/experience
- ✅ Credits added to character balance
- ✅ Reputation updated with factions
- ✅ Items added to inventory
- ✅ Quest items properly flagged

**Test Reward Items:**
- "Ryll Spice Sample" (Trail Begins reward)
- "Mine Foreman's Datapad" (Mines Investigation reward)
- "Krayt Dragon Pearl" (Dragon Hunt reward - legendary)
- "Jedi Artifact" (Ruined Temple reward - legendary)

---

## Quest Chain Testing

### Test 20: Quest Chain Progression - IIA
**Location:** Complete Compound 7-Alpha chain

**Steps:**
1. Start with "Echoes from Compound 7-Alpha" (Chandrila)
2. Complete quest
3. Verify "The Trail Begins" unlocks
4. Travel to Ryloth
5. Complete "The Trail Begins"
6. Verify "Mines Investigation" unlocks
7. Complete "Mines Investigation"
8. Verify "Refugee Liberation" unlocks
9. Complete "Refugee Liberation"
10. Verify "Syndicate Exposure" unlocks
11. Complete "Syndicate Exposure"

**Expected Results:**
- ✅ Each quest unlocks the next in sequence
- ✅ Quest chain order maintained
- ✅ Prerequisites checked (level, reputation, items)
- ✅ Story continuity maintained
- ✅ All rewards received

**Chain Order:**
1. `iia_main_01_compound_investigation` (Chandrila)
2. `iia_ryloth_01_trail_begins` (Ryloth)
3. `iia_ryloth_02_mines_investigation` (Ryloth)
4. `iia_ryloth_03_refugee_liberation` (Ryloth)
5. `iia_ryloth_04_syndicate_exposure` (Ryloth)

### Test 21: Quest Chain Progression - Smugglers Guild
**Location:** Complete Krayt Dragon chain

**Steps:**
1. Start "The Krayt Dragon Legend" (Tatooine)
2. Complete quest
3. Verify "Preparing for the Hunt" unlocks
4. Complete preparation quest
5. Verify "The Dragon Hunt" unlocks
6. Complete dragon hunt

**Expected Results:**
- ✅ Quest chain progresses correctly
- ✅ Companion recruitment works (Kara Vex)
- ✅ Legendary rewards received (Krayt Dragon Pearl)

**Chain Order:**
1. `sg_tatooine_01_krayt_legend`
2. `sg_tatooine_02_preparation`
3. `sg_tatooine_03_dragon_hunt`

### Test 22: Quest Chain Progression - Jedi Seekers
**Location:** Complete Enclave chain

**Steps:**
1. Start "The Enclave's Call" (Dantooine)
2. Complete quest
3. Verify "The Kinrath Cave" unlocks
4. Complete crystal quest

**Expected Results:**
- ✅ Force-related quests work correctly
- ✅ Crystal collection works
- ✅ Lightsaber crystal reward received

**Chain Order:**
1. `js_dantooine_01_enclave_call`
2. `js_dantooine_02_kinrath_crystals`

### Test 23: Quest Chain Progression - New Republic
**Location:** Complete Corruption chain

**Steps:**
1. Start "Whispers of Corruption" (Coruscant)
2. Complete quest
3. Verify "Underworld Connections" unlocks
4. Complete underworld quest
5. Verify "Exposing the Senate" unlocks
6. Complete exposure quest

**Expected Results:**
- ✅ Political quest chain works
- ✅ Evidence collection works
- ✅ Senate confrontation works

**Chain Order:**
1. `nr_coruscant_01_whispers`
2. `nr_coruscant_03_underworld_connection`
3. `nr_coruscant_04_senate_exposure`

---

## Item System Testing

### Test 24: Quest Item Rewards
**Location:** Quest Completion

**Steps:**
1. Complete a quest that rewards items
2. Check inventory
3. Verify items received

**Expected Results:**
- ✅ Items added to inventory
- ✅ Item properties correct (name, description, rarity)
- ✅ Quest items properly flagged
- ✅ Item stats displayed correctly

**Test Quest Items:**
- Common: Ryll Spice Sample, Krayt Report
- Uncommon: Mine Foreman's Datapad, Corruption Evidence
- Rare: Refugee Leader's Gratitude, Championship Trophy
- Epic: Custom Swoop Bike, Jedi Teaching
- Legendary: Krayt Dragon Pearl, Jedi Artifact

### Test 25: Item Rarity Display
**Location:** Inventory

**Steps:**
1. Open inventory
2. Check item rarity colors
3. Verify rarity filtering

**Expected Results:**
- ✅ Items display with rarity colors:
  - Common: Gray
  - Uncommon: Green
  - Rare: Blue
  - Epic: Purple
  - Legendary: Orange/Gold
- ✅ Rarity filter works
- ✅ Items sorted by rarity

### Test 26: Item Usage
**Location:** Inventory → Use Item

**Steps:**
1. Obtain a usable quest item
2. Attempt to use item
3. Verify item behavior

**Expected Results:**
- ✅ Quest items can be used appropriately
- ✅ Items with permanent abilities grant abilities
- ✅ Items with stats provide stat bonuses
- ✅ Items can be equipped (if equipment)

**Test Usable Items:**
- Jedi Teaching (grants permanent ability)
- Artifact Power (grants permanent ability)
- Krayt Dragon Pearl (equip as accessory)
- Lightsaber Crystal (quest item for construction)

---

## Faction-Specific Testing

### Test 27: Independent Investigators Alliance
**Location:** Ryloth, Chandrila

**Steps:**
1. Build reputation with IIA
2. Complete Compound 7-Alpha chain
3. Verify faction-specific content

**Expected Results:**
- ✅ IIA reputation increases with quest completion
- ✅ Refugee-focused quests available
- ✅ Investigation-themed content
- ✅ Faction-specific rewards

### Test 28: Smugglers Guild
**Location:** Tatooine, Ryloth

**Steps:**
1. Build reputation with Smugglers Guild
2. Complete Krayt Dragon chain
3. Complete spice trade quests

**Expected Results:**
- ✅ Smuggler reputation increases
- ✅ Profit-focused quests available
- ✅ Trade route quests work
- ✅ Smuggler badge reward received

### Test 29: Jedi Seekers
**Location:** Dantooine, Coruscant

**Steps:**
1. Build reputation with Jedi Seekers
2. Complete Enclave chain
3. Complete Temple quest

**Expected Results:**
- ✅ Jedi Seeker reputation increases
- ✅ Force-related quests available
- ✅ Artifact recovery quests work
- ✅ Lightsaber-related rewards

### Test 30: New Republic
**Location:** Coruscant, Dantooine

**Steps:**
1. Build reputation with New Republic
2. Complete Corruption chain
3. Complete Rebel Base chain

**Expected Results:**
- ✅ New Republic reputation increases
- ✅ Political quests available
- ✅ Intelligence recovery quests work
- ✅ Commendation rewards received

---

## Integration Testing

### Test 31: Cross-Planet Quest Progression
**Location:** Multiple Planets

**Steps:**
1. Start quest on one planet (Chandrila)
2. Complete objective requiring travel to another planet (Ryloth)
3. Verify quest progress maintained
4. Complete quest on new planet

**Expected Results:**
- ✅ Quest progress persists across planets
- ✅ Objectives update correctly
- ✅ Travel objectives complete when arriving
- ✅ Quest chain continues across planets

**Test Cross-Planet Chain:**
- Compound 7-Alpha: Starts on Chandrila, continues on Ryloth

### Test 32: Multiple Active Quests
**Location:** Quest Log

**Steps:**
1. Start multiple quests from different factions
2. Verify all quests tracked
3. Complete objectives from different quests
4. Verify progress tracked separately

**Expected Results:**
- ✅ Multiple quests can be active simultaneously
- ✅ Quest progress tracked independently
- ✅ Quest log displays all active quests
- ✅ No conflicts between quests

### Test 33: Quest Prerequisites
**Location:** Quest Availability

**Steps:**
1. Check quest availability without prerequisites
2. Verify quest locked
3. Meet prerequisites (level, reputation, completed quests)
4. Verify quest unlocks

**Expected Results:**
- ✅ Prerequisites properly checked
- ✅ Locked quests not available
- ✅ Quests unlock when prerequisites met
- ✅ Level requirements enforced
- ✅ Reputation requirements enforced
- ✅ Completed quest requirements enforced

### Test 34: NPC-Quest Integration
**Location:** NPC Dialogue → Quest

**Steps:**
1. Talk to NPC who gives quest
2. Accept quest
3. Complete quest objectives involving same NPC
4. Return to NPC
5. Complete quest

**Expected Results:**
- ✅ NPC offers quest correctly
- ✅ NPC dialogue updates based on quest progress
- ✅ Quest completion recognized by NPC
- ✅ NPC provides rewards

---

## Troubleshooting

### Issue 1: NPCs Not Spawning
**Symptoms:** NPCs don't appear on sub-maps

**Checks:**
1. Verify NPCs seeded in database
2. Check NPC location data (planet, area, coordinates)
3. Verify sub-map loaded correctly
4. Check console for errors

**Solutions:**
- Re-run seeder script
- Verify NPC location matches sub-map
- Check NPC `isAvailable` flag

### Issue 2: Quests Not Unlocking
**Symptoms:** Next quest in chain doesn't unlock

**Checks:**
1. Verify previous quest completed
2. Check quest prerequisites (level, reputation, items)
3. Verify quest chain linking (`chainId`, `chainOrder`)
4. Check quest `isActive` flag

**Solutions:**
- Complete all objectives of previous quest
- Meet all prerequisites
- Verify quest chain configuration

### Issue 3: Quest Objectives Not Completing
**Symptoms:** Objective doesn't mark as complete

**Checks:**
1. Verify objective type handled correctly
2. Check objective target matches (NPC ID, location, item ID)
3. Verify quest progress tracking
4. Check console for errors

**Solutions:**
- Verify objective target IDs match
- Check quest service handles objective type
- Verify quest progress updates

### Issue 4: Items Not Received
**Symptoms:** Quest rewards items not in inventory

**Checks:**
1. Verify quest completion
2. Check reward items exist in database
3. Verify inventory system working
4. Check console for errors

**Solutions:**
- Verify item IDs in quest rewards
- Check items seeded in database
- Verify inventory API working

### Issue 5: POIs Not Displaying
**Symptoms:** POIs don't appear on planet map

**Checks:**
1. Verify planet data updated in database
2. Check POI data structure
3. Verify planet map rendering
4. Check console for errors

**Solutions:**
- Re-run seeder script
- Verify POI JSON structure
- Check planet map component

---

## Testing Checklist

### Phase 1 Features
- [ ] Planet POIs display correctly
- [ ] POI interaction menu works
- [ ] Entering POIs loads sub-maps
- [ ] POI investigation shows lore
- [ ] Planet resources defined
- [ ] NPCs spawn on sub-maps
- [ ] NPC dialogue works
- [ ] NPC quest offering works
- [ ] Companion recruitment works
- [ ] Quest items in inventory
- [ ] Item rarity display works

### Phase 2 Features
- [ ] Quest availability checking works
- [ ] Starting quests works
- [ ] Interact objectives complete
- [ ] Travel objectives complete
- [ ] Collect objectives complete
- [ ] Defeat objectives complete
- [ ] Discover objectives complete
- [ ] Custom objectives complete
- [ ] Quest completion works
- [ ] Quest rewards distributed
- [ ] Quest chains progress correctly
- [ ] Quest prerequisites enforced
- [ ] Multiple active quests work
- [ ] Cross-planet quests work

### Integration
- [ ] NPC-Quest integration works
- [ ] Item-Quest integration works
- [ ] Planet-Quest integration works
- [ ] Faction reputation updates
- [ ] Quest unlocks work correctly

---

## Success Criteria

All tests should pass with:
- ✅ No console errors
- ✅ All features functional
- ✅ Content displays correctly
- ✅ Quest progression smooth
- ✅ Rewards distributed correctly
- ✅ Integration points working

---

## Notes

- **Character Level:** Some quests require specific levels. Use character leveling or adjust prerequisites for testing.
- **Reputation:** Some quests require faction reputation. Complete faction quests to build reputation.
- **Database:** Ensure database is properly seeded before testing.
- **Server Logs:** Monitor backend console for errors during testing.
- **Browser Console:** Monitor frontend console for errors during testing.

---

## Next Steps After Testing

1. **Document Issues:** Record any bugs or issues found
2. **Fix Critical Issues:** Address blocking issues immediately
3. **Update Content:** Refine quest descriptions, NPC dialogue based on testing
4. **Performance Testing:** Test with multiple quests, NPCs, items
5. **User Experience:** Gather feedback on quest flow and difficulty

---

**Last Updated:** Phase 1 & Phase 2 Implementation
**Version:** 1.0



