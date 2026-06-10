# How to Find Quests

## The Problem

You're seeing quest givers (NPCs with golden "Quest Giver" badge) but they show "No quests available". This happens because:

1. **Quests haven't been seeded into the database yet** - The quest JSON files exist but need to be loaded
2. **You're talking to procedurally generated NPCs** - These are randomly generated and don't have quests assigned
3. **You don't meet quest prerequisites** - Level, reputation, or completed quest requirements

## Solution: Seed the Quests

### Step 1: Run the Content Seeder

```bash
cd backend
node src/scripts/seed-phase1-content.js
```

This will:
- ✅ Seed all NPCs from content files (including quest givers)
- ✅ Seed all quests from content files  
- ✅ Link quests to their quest giver NPCs

### Step 2: Verify It Worked

You should see output like:
```
✓ NPCs seeded: X new NPCs
✓ Quests seeded: X new quests
```

## Where to Find Real Quest Givers

### On Ryloth:

1. **Keth Varr** (Twi'lek Informant) - `npc_twi_lek_informant`
   - **Location**: Lessu, the Capital City (submap)
   - **Quest**: "The Trail Begins"
   - **Requirements**: Level 3, 25 IIA reputation, completed first quest

2. **Elder Tala** (Village Elder) - `npc_village_elder`
   - **Location**: Tann Province (on planet surface)
   - **Quest**: "Village Liberation" 
   - **Requirements**: Level 4 only ✅ (Easiest to get!)

3. **Zara Vex** (Smuggler Contact) - `npc_smuggler_contact_ryloth`
   - **Location**: Lessu, the Capital City (cantina submap)
   - **Quest**: "Profitable Opportunity"
   - **Requirements**: Check quest file

### Important Notes:

- **Procedurally generated NPCs** (like "Beru Tarkin") are randomly created and **won't have quests**
- **Content file NPCs** (like "Keth Varr", "Elder Tala") are the ones with quests
- You need to **enter submaps** (cities, cantinas) to find some quest givers

## Quick Test Quest

**"Village Liberation"** is the easiest quest to test:
- **Quest Giver**: Elder Tala (`npc_village_elder`)
- **Location**: Ryloth → Tann Province (on planet surface, not in submap)
- **Requirements**: Level 4 only (no reputation or prerequisite quests needed)

## Troubleshooting

### If quests still don't show after seeding:

1. **Check backend console logs** - You'll see debug messages like:
   - `[Quest Service] Found X quests for NPC...`
   - `[Quest Service] Quest prerequisites not met...`

2. **Check your character level**:
   - Most quests require level 3-4+
   - "Village Liberation" requires level 4

3. **Check NPC ID matches**:
   - The NPC's `id` must match the quest's `questGiverId`
   - Procedurally generated NPCs have IDs like `ryloth_npc_10`
   - Content NPCs have IDs like `npc_village_elder`

4. **Check if you're in the right location**:
   - Some quest givers are in submaps (cities, cantinas)
   - You need to click "EXPLORE" or "Enter" on the POI to access them

## Next Steps

1. **Run the seeder** to load quests into database
2. **Go to Ryloth → Tann Province** (on planet surface)
3. **Find Elder Tala** (should be a quest giver NPC)
4. **Click Quest button** - Should see "Village Liberation" if you're level 4+

If it still doesn't work, check the backend console for the debug messages I added - they'll tell you exactly why quests aren't showing!



