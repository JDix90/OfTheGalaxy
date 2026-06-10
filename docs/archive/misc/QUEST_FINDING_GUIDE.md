# Quest Finding Guide

## Issue: No Quests Available

If you're seeing "No quests available from this NPC at the moment" for quest givers, it's likely because:

1. **Quests haven't been seeded into the database yet**
2. **The NPC you're talking to is procedurally generated** (not a quest giver from content files)
3. **You don't meet the quest prerequisites** (level, reputation, completed quests)

## Solution: Seed Quests into Database

### Step 1: Run the Quest Seeder

The quests exist in JSON files but need to be loaded into the database. Run:

```bash
cd backend
node src/scripts/seed-phase1-content.js
```

This will:
- Seed all NPCs from content files (including quest givers)
- Seed all quests from content files
- Link quests to their quest giver NPCs

### Step 2: Verify Quests Were Seeded

After running the seeder, you should see output like:
```
✓ Quests seeded: X new quests
```

## Where to Find Quest Givers

### Ryloth Quest Givers

1. **Twi'lek Informant (Keth Varr)** - `npc_twi_lek_informant`
   - **Location**: Lessu, the Capital City
   - **Quest**: "The Trail Begins" (`iia_ryloth_01_trail_begins`)
   - **Prerequisites**: Level 3, 25 Independent Investigators reputation, completed "Echoes from Compound 7-Alpha"

2. **Zara Vex (Smuggler Contact)** - `npc_smuggler_contact_ryloth`
   - **Location**: Lessu, the Capital City (cantina)
   - **Quest**: "Profitable Opportunity" (`sg_ryloth_01_profitable_opportunity`)
   - **Prerequisites**: Check quest file for requirements

3. **Village Elder (Elder Tala)** - `npc_village_elder` or `npc_twi_lek_village_elder`
   - **Location**: Tann Province
   - **Quest**: "Village Liberation" (`ryloth_side_01_village_liberation`)
   - **Prerequisites**: Level 4

### Tatooine Quest Givers

1. **Old Moisture Farmer** - `npc_old_farmer`
   - **Location**: Mos Eisley Spaceport
   - **Quest**: "Krayt Legend" (`sg_tatooine_01_krayt_legend`)
   - **Prerequisites**: Check quest file

2. **Race Organizer** - `npc_race_organizer`
   - **Location**: Mos Eisley Spaceport
   - **Quest**: "Race Registration" (`sg_tatooine_race_01_registration`)
   - **Prerequisites**: Check quest file

### Dantooine Quest Givers

1. **Jedi Seeker Mentor** - `npc_jedi_seeker_mentor`
   - **Location**: Jedi Enclave area
   - **Quest**: "Enclave Call" (`js_dantooine_01_enclave_call`)
   - **Prerequisites**: Check quest file

2. **New Republic Intel Officer** - `npc_nr_intel_officer`
   - **Location**: Abandoned Rebel Base area
   - **Quest**: "Abandoned Base" (`nr_dantooine_01_abandoned_base`)
   - **Prerequisites**: Check quest file

### Coruscant Quest Givers

1. **Senator Aide** - `npc_senator_aide`
   - **Location**: Galactic Senate Building
   - **Quest**: "Coruscant Whispers" (`nr_coruscant_01_whispers`)
   - **Prerequisites**: Check quest file

## Quest Prerequisites

Most quests have prerequisites that must be met:

### Common Prerequisites:
- **Level**: Character must be at least level X
- **Reputation**: Must have X reputation with a faction
- **Completed Quests**: Must have completed specific quests first
- **Items**: Must have specific items (rare)

### Example Prerequisites:

**"The Trail Begins"** requires:
- Level 3
- 25 reputation with Independent Investigators
- Completed "Echoes from Compound 7-Alpha"

**"Village Liberation"** requires:
- Level 4
- No reputation requirements
- No prerequisite quests

## Starter Quests (No Prerequisites)

These quests should be available immediately:

1. **"Echoes from Compound 7-Alpha"** (`iia_main_01_compound_investigation`)
   - **Quest Giver**: Coordinator Valen (`npc_coordinator_valen`)
   - **Location**: Chandrila (refugee settlement)
   - **Prerequisites**: Level 1 only

2. **"Village Liberation"** (`ryloth_side_01_village_liberation`)
   - **Quest Giver**: Village Elder (`npc_village_elder`)
   - **Location**: Ryloth, Tann Province
   - **Prerequisites**: Level 4 only

## Troubleshooting

### If quests still don't show:

1. **Check if NPC exists in database**:
   - The NPC must have `npcType: 'quest_giver'`
   - The NPC must have the correct `id` matching `questGiverId` in quest

2. **Check quest prerequisites**:
   - Your character level must meet the requirement
   - Your faction reputation must meet the requirement
   - You must have completed prerequisite quests

3. **Check quest status**:
   - Quest must have `isActive: true`
   - Quest must not already be active or completed

4. **Check NPC location**:
   - Make sure you're on the correct planet
   - Make sure you're in the correct area/submap
   - Some quest givers are in submaps (cities, cantinas, etc.)

## Quick Test

To quickly test if quests are working:

1. **Run the seeder**:
   ```bash
   cd backend
   node src/scripts/seed-phase1-content.js
   ```

2. **Find a quest giver**:
   - Go to Ryloth
   - Enter "Lessu, the Capital City" submap
   - Look for NPCs with golden "Quest Giver" badge

3. **Check prerequisites**:
   - Make sure your character is at least level 4
   - Try talking to the Village Elder in Tann Province

## Note on Procedurally Generated NPCs

NPCs generated by the system (like "Beru Tarkin") are **not** quest givers from the content files. They're randomly generated and won't have quests assigned to them.

To find quests, you need to:
- **Use NPCs from the content files** (seeded NPCs)
- **Or** ensure procedurally generated quest givers have quests assigned (this would require additional implementation)



