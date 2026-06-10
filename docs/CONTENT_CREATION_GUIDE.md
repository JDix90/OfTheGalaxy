# Content Creation Guide
## Technical Specifications and Best Practices

**Version:** 1.0  
**Last Updated:** December 2024  
**Purpose:** Guide for content creators working with Of the Galaxy content files

---

## Table of Contents

1. [Overview](#overview)
2. [Quest Creation](#quest-creation)
3. [NPC Creation](#npc-creation)
4. [Item Creation](#item-creation)
5. [Choice Tracking](#choice-tracking)
6. [Validation](#validation)
7. [Best Practices](#best-practices)
8. [Common Patterns](#common-patterns)

---

## Overview

This guide provides technical specifications for creating content files in Of the Galaxy. All content files use JSON format and must conform to the schemas defined in `docs/schemas/`.

### Content File Locations

- **Quests:** `content/factions/{factionId}/main_quests/` or `side_quests/`
- **NPCs:** `content/factions/{factionId}/npcs/`
- **Items:** `backend/src/data/items.js` (or future JSON files)
- **Dialogue:** Embedded in NPC files or quest files

### Schema Files

All schemas are located in `docs/schemas/`:
- `quest-schema.json` - Quest structure
- `npc-schema.json` - NPC structure
- `item-schema.json` - Item structure
- `choice-tracking-schema.json` - Choice tracking structure

---

## Quest Creation

### File Structure

Quests are JSON files following the `quest-schema.json` format.

**Example Location:** `content/factions/independent_investigators/main_quests/01_compound_investigation.json`

### Required Fields

- `id` - Unique identifier (lowercase, underscores, no spaces)
- `factionId` - Faction that owns the quest
- `questType` - Type: `main`, `side`, `dynamic`, `companion`, or `repeatable`
- `title` - Quest title (max 200 characters)
- `description` - Full quest description
- `objectives` - Array of objectives (minimum 1)
- `rewards` - Reward structure

### Quest ID Naming Convention

Format: `{faction_abbrev}_{type}_{number}_{descriptive_name}`

Examples:
- `iia_main_01_compound_investigation` (Independent Investigators Alliance, main quest 1)
- `nr_side_05_diplomatic_mission` (New Republic, side quest 5)
- `sg_repeatable_01_bounty_hunt` (Smugglers' Guild, repeatable quest 1)

### Objectives

Each objective must have:
- `id` - Unique identifier within the quest
- `type` - One of: `interact`, `discover`, `collect`, `defeat`, `travel`, `deliver`, `custom`, `clear_dungeon`, `defeat_boss`, `reach_depth`
- `description` - What the player must do

**Objective Types:**

1. **interact** - Talk to an NPC
   ```json
   {
     "id": "meet_npc",
     "type": "interact",
     "description": "Speak with NPC Name",
     "target": "npc_id"
   }
   ```

2. **discover** - Discover evidence or location
   ```json
   {
     "id": "find_evidence",
     "type": "discover",
     "description": "Find the hidden datapad",
     "evidenceId": "evidence_datapad_01"
   }
   ```

3. **collect** - Collect items
   ```json
   {
     "id": "collect_items",
     "type": "collect",
     "description": "Collect 5 power cells",
     "target": "power_cell",
     "count": 5
   }
   ```

4. **defeat** - Defeat enemies
   ```json
   {
     "id": "defeat_pirates",
     "type": "defeat",
     "description": "Defeat the pirate gang",
     "target": "pirate_gang_01",
     "count": 3
   }
   ```

5. **travel** - Travel to location
   ```json
   {
     "id": "go_to_planet",
     "type": "travel",
     "description": "Travel to Tatooine",
     "location": {
       "planet": "tatooine",
       "area": "mos_eisley"
     }
   }
   ```

### Quest Chains

To create a quest chain:

1. Set `chainId` to a shared identifier (e.g., `"iia_main_chain"`)
2. Set `chainOrder` to the quest's position (1, 2, 3, etc.)
3. Add previous quest ID to `prerequisites.completedQuests` for quests after the first

**Example Chain:**
```json
// Quest 1
{
  "id": "iia_main_01_compound_investigation",
  "chainId": "iia_main_chain",
  "chainOrder": 1,
  "rewards": {
    "unlocks": ["iia_main_02_deeper_investigation"]
  }
}

// Quest 2
{
  "id": "iia_main_02_deeper_investigation",
  "chainId": "iia_main_chain",
  "chainOrder": 2,
  "prerequisites": {
    "completedQuests": ["iia_main_01_compound_investigation"]
  }
}
```

### Rewards

Rewards structure:
```json
{
  "rewards": {
    "xp": 500,
    "credits": 200,
    "reputation": {
      "independent_investigators": 25
    },
    "items": [
      {
        "itemId": "blaster_pistol_01",
        "quantity": 1
      }
    ],
    "unlocks": ["quest_id_02"]
  }
}
```

---

## NPC Creation

### File Structure

NPCs are JSON files following the `npc-schema.json` format.

**Example Location:** `content/factions/independent_investigators/npcs/mira_kess.json`

### Required Fields

- `id` - Unique identifier (format: `npc_{name}`)
- `name` - NPC name
- `species` - Species type
- `location` - Where NPC is located (must include `planet`)

### NPC ID Naming Convention

Format: `npc_{first_name}_{last_name}` or `npc_{descriptive_name}`

Examples:
- `npc_mira_kess`
- `npc_coordinator_valen`
- `npc_jax_riven`

### Location

Location must specify at least the planet:
```json
{
  "location": {
    "planet": "chandrila",
    "area": "refugee_settlement",
    "x": 120,
    "y": 85
  }
}
```

### Dialogue Structure

Dialogue is organized by relationship tier:
```json
{
  "dialogue": {
    "greeting": {
      "stranger": "Initial greeting for unknown players",
      "acquaintance": "Greeting after first interaction",
      "friend": "Greeting for friendly relationship",
      "confidant": "Greeting for close relationship"
    },
    "questRelated": {
      "quest_id_01": "Dialogue specific to this quest"
    },
    "general": [
      "General dialogue line 1",
      "General dialogue line 2"
    ]
  }
}
```

### Companion NPCs

To make an NPC a companion:
```json
{
  "npcType": "companion",
  "isCompanion": true,
  "companionAbilities": {
    "combat": ["ability1", "ability2"],
    "utility": ["ability3", "ability4"]
  },
  "companionStats": {
    "health": 80,
    "damage": 15,
    "defense": 10,
    "specialization": "stealth"
  }
}
```

---

## Item Creation

### File Structure

Items can be defined in `backend/src/data/items.js` or future JSON files following `item-schema.json`.

### Required Fields

- `id` - Unique identifier
- `name` - Item name
- `itemType` - Type: `weapon`, `armor`, `equipment`, `consumable`, `resource`, `quest_item`, or `junk`
- `rarity` - Rarity: `common`, `uncommon`, `rare`, `epic`, or `legendary`

### Item ID Naming Convention

Format: `{type}_{subtype}_{number}` or descriptive name

Examples:
- `blaster_pistol_01`
- `armor_light_01`
- `medpac_standard`

### Rarity Guidelines

- **Common (Grey):** Basic items, found everywhere
- **Uncommon (Green):** Better quality, quest rewards
- **Rare (Blue):** Specialized items, boss drops
- **Epic (Purple):** Mastercraft items, end-of-questline rewards
- **Legendary (Orange):** Unique named items, faction arc completion rewards

### Faction Items

To make an item faction-specific:
```json
{
  "factionId": "independent_investigators",
  "minReputationTier": "trusted",
  "rarity": "rare"
}
```

### Item Stats

Stats vary by item type:

**Weapons:**
```json
{
  "stats": {
    "damage": 25,
    "accuracy": 75,
    "range": 30,
    "fireRate": 2.5
  }
}
```

**Armor:**
```json
{
  "stats": {
    "defense": 20,
    "mobility": 0,
    "resistance": {
      "energy": 10,
      "physical": 5
    }
  }
}
```

---

## Choice Tracking

### Structure

Choices are stored in `QuestProgress.choices` as an array of choice objects.

### Choice Object

```json
{
  "choiceId": "unique_choice_id",
  "questId": "quest_id",
  "choiceText": "What choice was presented?",
  "selectedOption": "Option the player chose",
  "availableOptions": ["Option 1", "Option 2", "Option 3"],
  "timestamp": "2024-12-01T10:30:00Z",
  "consequences": {
    "reputation": {
      "faction_id": 5
    },
    "unlocks": ["quest_id"],
    "blocks": ["quest_id"],
    "flags": {
      "story_flag": true
    }
  }
}
```

### Using Choices in Quests

Choices should be tracked when:
- Player makes a dialogue choice
- Player chooses a quest path
- Player makes a moral decision

Reference choices in later quests via `prerequisites` or story flags.

---

## Validation

### Before Committing

Always validate your content files:

```bash
# Validate a single file
node backend/src/scripts/validate-content.js --type quest --file content/factions/.../quest.json

# Validate all content
node backend/src/scripts/validate-content.js --type all --dir content/
```

### Validation Checks

1. **Schema Validation** - File matches JSON schema
2. **Reference Validation** - All referenced IDs exist:
   - Quest giver NPC exists
   - Prerequisite quests exist
   - Reward items exist
   - Objective targets exist

### Common Validation Errors

1. **Missing Required Field** - Check schema for required fields
2. **Invalid Enum Value** - Check allowed values in schema
3. **Reference Not Found** - Ensure referenced IDs exist
4. **Invalid Format** - Check ID patterns and data types

---

## Best Practices

### Naming Conventions

1. **Use lowercase with underscores** for IDs
2. **Be descriptive** but concise
3. **Use consistent prefixes** (e.g., `npc_`, `quest_`, `item_`)
4. **Number sequentially** for similar items

### Quest Design

1. **Clear Objectives** - Each objective should be unambiguous
2. **Reasonable Prerequisites** - Don't create circular dependencies
3. **Meaningful Rewards** - Rewards should match quest difficulty
4. **Chain Logic** - Ensure quest chains flow logically

### NPC Design

1. **Unique Personalities** - Each NPC should feel distinct
2. **Relationship Tiers** - Dialogue should reflect relationship progression
3. **Quest Integration** - NPCs should feel connected to quests
4. **Location Accuracy** - Ensure NPCs are placed in appropriate locations

### Item Design

1. **Balance Stats** - Items should be balanced for their rarity
2. **Faction Identity** - Faction items should reflect faction themes
3. **Clear Descriptions** - Players should understand item purpose
4. **Appropriate Pricing** - Follow rarity pricing guidelines

---

## Common Patterns

### Quest Chain Pattern

```json
// First quest in chain
{
  "id": "faction_main_01_start",
  "chainId": "faction_main_chain",
  "chainOrder": 1,
  "rewards": {
    "unlocks": ["faction_main_02_continue"]
  }
}

// Subsequent quests
{
  "id": "faction_main_02_continue",
  "chainId": "faction_main_chain",
  "chainOrder": 2,
  "prerequisites": {
    "completedQuests": ["faction_main_01_start"]
  }
}
```

### Companion NPC Pattern

```json
{
  "id": "npc_companion_name",
  "npcType": "companion",
  "isCompanion": true,
  "companionAbilities": {
    "combat": ["ability1", "ability2"],
    "utility": ["ability3"]
  },
  "companionStats": {
    "health": 80,
    "damage": 15,
    "defense": 10,
    "specialization": "combat"
  }
}
```

### Faction Item Pattern

```json
{
  "id": "faction_item_name",
  "factionId": "faction_id",
  "minReputationTier": "trusted",
  "rarity": "rare",
  "stats": {
    "specialEffects": ["faction_bonus"]
  }
}
```

---

## Quick Reference

### Quest Types
- `main` - Main faction storyline quest
- `side` - Optional side quest
- `dynamic` - Dynamically generated quest
- `companion` - Companion-specific quest
- `repeatable` - Can be repeated multiple times

### Objective Types
- `interact` - Talk to NPC
- `discover` - Find evidence/location
- `collect` - Gather items
- `defeat` - Defeat enemies
- `travel` - Go to location
- `deliver` - Deliver item to NPC
- `custom` - Custom objective type

### Item Types
- `weapon` - Combat weapon
- `armor` - Protective gear
- `equipment` - Utility equipment
- `consumable` - Single-use item
- `resource` - Crafting material
- `quest_item` - Quest-specific item
- `junk` - Sellable items

### Rarity Tiers
- `common` - Grey
- `uncommon` - Green
- `rare` - Blue
- `epic` - Purple
- `legendary` - Orange

---

## Getting Help

If you encounter issues:

1. Check the schema files in `docs/schemas/`
2. Review example files in `docs/schemas/`
3. Run validation tools
4. Check existing content files for patterns
5. Consult the Content Guide from consultants

---

**Remember:** All content must be validated before committing. Use the validation tools to ensure quality and consistency.


