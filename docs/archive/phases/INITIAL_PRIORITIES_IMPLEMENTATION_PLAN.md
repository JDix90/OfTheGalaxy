# Initial Priorities Implementation Plan
## Technical Specifications, Quest Chains, Item Rarity, and Content Validation

**Date:** December 2024  
**Timeline:** 4-6 weeks  
**Priority:** High - Foundation for Content Expansion

---

## Overview

This document outlines the detailed implementation strategy for the four initial priorities identified in the Content Guide Review:

1. Create technical specifications (JSON schemas, data structures)
2. Implement quest chain system
3. Add item rarity system
4. Build content validation tools

These priorities form the foundation for successful content expansion and must be completed before large-scale content production begins.

---

## Priority 1: Create Technical Specifications

### 1.1 Objective
Define complete JSON schemas and data structures for all content types to ensure consistency, enable validation, and provide clear documentation for content creators.

### 1.2 Scope

#### Content Types to Document:
- Quest JSON structure
- Item JSON structure
- NPC JSON structure
- POI JSON structure
- Planet metadata structure
- Dialogue tree structure
- Choice tracking structure

### 1.3 Implementation Steps

#### Step 1.1: Quest JSON Schema (Week 1, Days 1-2)

**Deliverable:** `docs/schemas/quest-schema.json`

**Schema Definition:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "factionId", "questType", "title", "description", "objectives", "rewards"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^[a-z0-9_]+$",
      "description": "Unique quest identifier (e.g., 'iia_main_01_compound_investigation')"
    },
    "factionId": {
      "type": "string",
      "enum": ["independent_investigators", "new_republic", "imperial_remnant", "smugglers_guild", "jedi_seekers", "corporate_sector", "outer_rim_settlers"],
      "description": "Faction that owns this quest"
    },
    "questType": {
      "type": "string",
      "enum": ["main", "side", "dynamic", "companion", "repeatable"],
      "description": "Type of quest"
    },
    "title": {
      "type": "string",
      "maxLength": 200,
      "description": "Quest title displayed to player"
    },
    "description": {
      "type": "string",
      "description": "Full quest description"
    },
    "shortDescription": {
      "type": "string",
      "maxLength": 500,
      "description": "Brief quest summary"
    },
    "prerequisites": {
      "type": "object",
      "properties": {
        "level": { "type": "integer", "minimum": 1 },
        "reputation": {
          "type": "object",
          "additionalProperties": { "type": "integer" }
        },
        "completedQuests": {
          "type": "array",
          "items": { "type": "string" }
        },
        "items": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "objectives": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "type", "description"],
        "properties": {
          "id": { "type": "string" },
          "type": {
            "type": "string",
            "enum": ["interact", "discover", "collect", "defeat", "travel", "deliver", "custom"]
          },
          "description": { "type": "string" },
          "target": { "type": "string" },
          "count": { "type": "integer", "minimum": 1 },
          "evidenceId": { "type": "string" }
        }
      }
    },
    "rewards": {
      "type": "object",
      "properties": {
        "xp": { "type": "integer", "minimum": 0 },
        "credits": { "type": "integer", "minimum": 0 },
        "reputation": {
          "type": "object",
          "additionalProperties": { "type": "integer" }
        },
        "items": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["itemId", "quantity"],
            "properties": {
              "itemId": { "type": "string" },
              "quantity": { "type": "integer", "minimum": 1 }
            }
          }
        },
        "unlocks": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "questGiverId": { "type": "string" },
    "startLocation": {
      "type": "object",
      "properties": {
        "planet": { "type": "string" },
        "area": { "type": "string" }
      }
    },
    "estimatedTime": { "type": "integer", "minimum": 1 },
    "difficulty": {
      "type": "string",
      "enum": ["easy", "medium", "hard", "very_hard"]
    },
    "isActive": { "type": "boolean" },
    "chainId": { "type": "string" },
    "chainOrder": { "type": "integer", "minimum": 1 }
  }
}
```

**Files to Create:**
- `docs/schemas/quest-schema.json`
- `docs/schemas/quest-example.json` (using existing `01_compound_investigation.json`)

**Validation:**
- Test schema against existing quest files
- Update existing quests to match schema if needed

#### Step 1.2: Item JSON Schema (Week 1, Days 3-4)

**Deliverable:** `docs/schemas/item-schema.json`

**Schema Definition:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "name", "itemType", "rarity"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^[a-z0-9_]+$"
    },
    "name": {
      "type": "string",
      "maxLength": 200
    },
    "description": { "type": "string" },
    "itemType": {
      "type": "string",
      "enum": ["weapon", "armor", "equipment", "consumable", "resource", "quest_item", "junk"]
    },
    "rarity": {
      "type": "string",
      "enum": ["common", "uncommon", "rare", "epic", "legendary"]
    },
    "factionId": { "type": "string" },
    "minReputationTier": {
      "type": "string",
      "enum": ["neutral", "friendly", "trusted", "allied", "revered"]
    },
    "stats": {
      "type": "object",
      "properties": {
        "damage": { "type": "integer" },
        "accuracy": { "type": "integer", "minimum": 0, "maximum": 100 },
        "fireRate": { "type": "number" },
        "range": { "type": "integer" },
        "defense": { "type": "integer" },
        "resistance": {
          "type": "object",
          "properties": {
            "energy": { "type": "integer" },
            "physical": { "type": "integer" }
          }
        },
        "specialEffects": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "baseValue": { "type": "integer", "minimum": 0 },
    "weight": { "type": "number", "minimum": 0 },
    "stackSize": { "type": "integer", "minimum": 1 },
    "equipmentSlot": {
      "type": "string",
      "enum": ["weapon", "armor", "accessory", "tool"]
    },
    "icon": { "type": "string" },
    "metadata": { "type": "object" }
  }
}
```

**Files to Create:**
- `docs/schemas/item-schema.json`
- `docs/schemas/item-example.json`

#### Step 1.3: NPC JSON Schema (Week 1, Days 5)

**Deliverable:** `docs/schemas/npc-schema.json`

**Schema Definition:**
- Based on existing `mira_kess.json` structure
- Include all fields: location, dialogue, quests, companion abilities, etc.
- Define dialogue tree structure
- Define relationship tiers

**Files to Create:**
- `docs/schemas/npc-schema.json`
- `docs/schemas/npc-example.json` (using `mira_kess.json`)

#### Step 1.4: Choice Tracking Structure (Week 1, Day 6)

**Deliverable:** `docs/schemas/choice-tracking-schema.json`

**Purpose:** Define how player choices are stored and referenced

**Structure:**
```json
{
  "choiceId": "string",
  "questId": "string",
  "choiceText": "string",
  "selectedOption": "string",
  "timestamp": "datetime",
  "consequences": {
    "reputation": {},
    "unlocks": [],
    "blocks": [],
    "flags": []
  }
}
```

**Files to Create:**
- `docs/schemas/choice-tracking-schema.json`
- Update `QuestProgress` model documentation

#### Step 1.5: Documentation (Week 1, Day 7)

**Deliverable:** `docs/CONTENT_CREATION_GUIDE.md`

**Contents:**
- Overview of all schemas
- Quick reference guide
- Common patterns and examples
- Validation rules
- Best practices

### 1.4 Success Criteria
- ✅ All content types have complete JSON schemas
- ✅ Example files for each schema
- ✅ Documentation is clear and accessible
- ✅ Schemas validate against existing content

---

## Priority 2: Implement Quest Chain System

### 2.1 Objective
Enhance the existing quest system to fully support quest chains, including chain progression, prerequisites, and unlock mechanics.

### 2.2 Current State Analysis

**Existing Support:**
- ✅ `Quest` model has `chainId` and `chainOrder` fields
- ✅ Quest seeder can load quest files
- ✅ Quest service has basic quest management

**Missing Features:**
- ❌ Chain progression logic
- ❌ Automatic chain unlocking
- ❌ Chain completion tracking
- ❌ Chain validation

### 2.3 Implementation Steps

#### Step 2.1: Enhance Quest Service (Week 2, Days 1-3)

**File:** `backend/src/services/questService.js`

**New Methods to Add:**

1. **`getQuestChain(chainId)`**
   - Retrieve all quests in a chain
   - Order by `chainOrder`
   - Return chain metadata

2. **`getNextQuestInChain(characterId, chainId)`**
   - Find current quest in chain
   - Return next available quest
   - Check prerequisites

3. **`unlockNextInChain(characterId, completedQuestId)`**
   - Called when quest completes
   - Check if quest is part of chain
   - Unlock next quest in chain
   - Update character quest availability

4. **`validateQuestChain(chainId)`**
   - Validate chain structure
   - Check for gaps in chainOrder
   - Verify prerequisites chain correctly

**Code Structure:**
```javascript
class QuestService {
  // ... existing methods ...

  async getQuestChain(chainId) {
    const quests = await Quest.findAll({
      where: { chainId, isActive: true },
      order: [['chainOrder', 'ASC']]
    });
    return quests;
  }

  async getNextQuestInChain(characterId, chainId) {
    const chain = await this.getQuestChain(chainId);
    const characterQuests = await this.getCharacterQuests(characterId);
    const completedQuestIds = characterQuests
      .filter(q => q.status === 'completed')
      .map(q => q.questId);

    for (const quest of chain) {
      if (!completedQuestIds.includes(quest.id)) {
        const canStart = this.checkPrerequisites(quest, character, completedQuestIds);
        if (canStart) {
          return quest;
        }
        return null; // Can't start next quest yet
      }
    }
    return null; // Chain complete
  }

  async unlockNextInChain(characterId, completedQuestId) {
    const completedQuest = await Quest.findByPk(completedQuestId);
    if (!completedQuest || !completedQuest.chainId) {
      return; // Not part of a chain
    }

    const nextQuest = await this.getNextQuestInChain(characterId, completedQuest.chainId);
    if (nextQuest) {
      // Next quest is now available (prerequisites met)
      // Quest availability is checked dynamically, so no action needed
      // But we could emit an event or notification here
    }
  }

  async validateQuestChain(chainId) {
    const chain = await this.getQuestChain(chainId);
    const errors = [];

    // Check for gaps
    const orders = chain.map(q => q.chainOrder).sort((a, b) => a - b);
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i + 1) {
        errors.push(`Gap in chain order at position ${i + 1}`);
      }
    }

    // Check prerequisites chain correctly
    for (let i = 1; i < chain.length; i++) {
      const prevQuest = chain[i - 1];
      const currentQuest = chain[i];
      
      if (!currentQuest.prerequisites.completedQuests.includes(prevQuest.id)) {
        errors.push(`Quest ${currentQuest.id} does not require previous quest ${prevQuest.id}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
```

#### Step 2.2: Update Quest Completion Logic (Week 2, Day 4)

**File:** `backend/src/services/questService.js`

**Modify `completeQuest` method:**
```javascript
async completeQuest(characterId, questId) {
  // ... existing completion logic ...

  // Unlock next quest in chain
  await this.unlockNextInChain(characterId, questId);

  // ... rest of completion logic ...
}
```

#### Step 2.3: Add Chain Endpoints (Week 2, Day 5)

**File:** `backend/src/controllers/questController.js`

**New Endpoints:**
```javascript
// GET /api/quests/chains/:chainId
async getQuestChain(req, res, next) {
  const { chainId } = req.params;
  const chain = await questService.getQuestChain(chainId);
  res.json({ success: true, data: chain });
}

// GET /api/quests/chains/:chainId/next
async getNextInChain(req, res, next) {
  const { chainId } = req.params;
  const { characterId } = req.user; // or from params
  const nextQuest = await questService.getNextQuestInChain(characterId, chainId);
  res.json({ success: true, data: nextQuest });
}

// POST /api/quests/chains/:chainId/validate
async validateChain(req, res, next) {
  const { chainId } = req.params;
  const validation = await questService.validateQuestChain(chainId);
  res.json({ success: true, data: validation });
}
```

**File:** `backend/src/routes/questRoutes.js`

**Add Routes:**
```javascript
router.get('/chains/:chainId', questController.getQuestChain);
router.get('/chains/:chainId/next', authenticate, questController.getNextInChain);
router.post('/chains/:chainId/validate', questController.validateChain);
```

#### Step 2.4: Frontend Integration (Week 2, Days 6-7)

**Files to Update:**
- `frontend/src/services/api/questApi.js` - Add chain API methods
- `frontend/src/features/quests/QuestList.jsx` - Show chain progress
- `frontend/src/features/quests/QuestDetail.jsx` - Display chain info

**Features:**
- Display chain progress indicator
- Show "Next in Chain" button
- Display chain completion status

### 2.4 Success Criteria
- ✅ Quest chains can be retrieved and validated
- ✅ Next quest in chain unlocks automatically
- ✅ Chain progression is tracked
- ✅ Frontend displays chain information
- ✅ Existing quests work with new system

---

## Priority 3: Add Item Rarity System

### 3.1 Objective
Implement the five-tier rarity system (Common, Uncommon, Rare, Epic, Legendary) with database support, filtering, and visual indicators.

### 3.2 Current State Analysis

**Existing Support:**
- ✅ `PlayerInventory` model exists
- ✅ Equipment slots defined
- ✅ Item model structure exists

**Missing Features:**
- ❌ Rarity field in item model
- ❌ Faction requirement system
- ❌ Rarity-based filtering
- ❌ Visual rarity indicators

### 3.3 Implementation Steps

#### Step 3.1: Database Migration (Week 3, Day 1)

**File:** `backend/src/migrations/XXX-add-item-rarity.js`

**Migration:**
```javascript
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add rarity column
    await queryInterface.addColumn('items', 'rarity', {
      type: Sequelize.STRING(20),
      allowNull: true,
      defaultValue: 'common'
    });

    // Add faction requirement columns
    await queryInterface.addColumn('items', 'faction_id', {
      type: Sequelize.STRING(100),
      allowNull: true
    });

    await queryInterface.addColumn('items', 'min_reputation_tier', {
      type: Sequelize.STRING(50),
      allowNull: true
    });

    // Add constraint
    await queryInterface.addConstraint('items', {
      fields: ['rarity'],
      type: 'check',
      name: 'items_rarity_check',
      where: {
        rarity: {
          [Sequelize.Op.in]: ['common', 'uncommon', 'rare', 'epic', 'legendary']
        }
      }
    });

    // Update existing items to have rarity
    await queryInterface.sequelize.query(`
      UPDATE items 
      SET rarity = 'common' 
      WHERE rarity IS NULL
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('items', 'items_rarity_check');
    await queryInterface.removeColumn('items', 'rarity');
    await queryInterface.removeColumn('items', 'faction_id');
    await queryInterface.removeColumn('items', 'min_reputation_tier');
  }
};
```

#### Step 3.2: Update Item Model (Week 3, Day 2)

**File:** `backend/src/models/Item.js`

**Add Fields:**
```javascript
rarity: {
  type: DataTypes.STRING(20),
  allowNull: false,
  defaultValue: 'common',
  validate: {
    isIn: [['common', 'uncommon', 'rare', 'epic', 'legendary']]
  }
},
factionId: {
  type: DataTypes.STRING(100),
  field: 'faction_id'
},
minReputationTier: {
  type: DataTypes.STRING(50),
  field: 'min_reputation_tier',
  validate: {
    isIn: [['neutral', 'friendly', 'trusted', 'allied', 'revered', null]]
  }
}
```

#### Step 3.3: Enhance Inventory Service (Week 3, Days 3-4)

**File:** `backend/src/services/inventoryService.js`

**New Methods:**
```javascript
async getItemsByRarity(characterId, rarity) {
  const inventory = await this.getInventory(characterId);
  return inventory.items.filter(item => item.rarity === rarity);
}

async canEquipItem(characterId, itemId) {
  const item = await Item.findByPk(itemId);
  if (!item) return { canEquip: false, reason: 'Item not found' };

  // Check faction requirement
  if (item.factionId && item.minReputationTier) {
    const character = await PlayerCharacter.findByPk(characterId);
    const reputation = await FactionReputation.findOne({
      where: { characterId, factionId: item.factionId }
    });

    if (!reputation || !this.meetsReputationTier(reputation.tier, item.minReputationTier)) {
      return { 
        canEquip: false, 
        reason: `Requires ${item.minReputationTier} reputation with ${item.factionId}` 
      };
    }
  }

  return { canEquip: true };
}

meetsReputationTier(currentTier, requiredTier) {
  const tiers = ['neutral', 'friendly', 'trusted', 'allied', 'revered'];
  return tiers.indexOf(currentTier) >= tiers.indexOf(requiredTier);
}
```

#### Step 3.4: Add Rarity Filtering Endpoints (Week 3, Day 5)

**File:** `backend/src/controllers/inventoryController.js`

**New Endpoint:**
```javascript
// GET /api/inventory/:characterId/items?rarity=rare
async getInventory(req, res, next) {
  const { characterId } = req.params;
  const { rarity } = req.query;

  let inventory = await inventoryService.getInventory(characterId);
  
  if (rarity) {
    inventory.items = inventory.items.filter(item => item.rarity === rarity);
  }

  res.json({ success: true, data: inventory });
}
```

#### Step 3.5: Frontend Rarity Display (Week 3, Days 6-7)

**Files to Update:**
- `frontend/src/features/inventory/InventoryView.jsx` - Add rarity filter
- `frontend/src/features/inventory/ItemTooltip.jsx` - Display rarity with color
- `frontend/src/utils/itemRarity.js` - Rarity utilities

**Rarity Colors:**
```javascript
export const RARITY_COLORS = {
  common: '#9ca3af',      // Grey
  uncommon: '#10b981',    // Green
  rare: '#3b82f6',        // Blue
  epic: '#a855f7',        // Purple
  legendary: '#f97316'   // Orange
};

export const getRarityColor = (rarity) => RARITY_COLORS[rarity] || RARITY_COLORS.common;
```

### 3.4 Success Criteria
- ✅ Rarity field added to database and model
- ✅ Items can be filtered by rarity
- ✅ Faction requirements are checked
- ✅ Frontend displays rarity with colors
- ✅ Existing items have rarity assigned

---

## Priority 4: Build Content Validation Tools

### 4.1 Objective
Create automated validation tools to ensure content files meet schema requirements and maintain consistency.

### 4.2 Implementation Steps

#### Step 4.1: Create Validation Library (Week 4, Days 1-3)

**File:** `backend/src/utils/contentValidator.js`

**Features:**
- JSON schema validation using `ajv`
- Content file validation
- Reference validation (NPCs, quests, items)
- Consistency checks

**Structure:**
```javascript
const Ajv = require('ajv');
const fs = require('fs');
const path = require('path');

class ContentValidator {
  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    this.schemas = {};
    this.loadSchemas();
  }

  loadSchemas() {
    const schemasDir = path.join(__dirname, '../../docs/schemas');
    const schemaFiles = fs.readdirSync(schemasDir)
      .filter(f => f.endsWith('-schema.json'));

    for (const file of schemaFiles) {
      const schema = JSON.parse(fs.readFileSync(path.join(schemasDir, file), 'utf-8'));
      const schemaName = file.replace('-schema.json', '');
      this.schemas[schemaName] = schema;
      this.ajv.addSchema(schema, schemaName);
    }
  }

  validateQuest(questData) {
    const validate = this.ajv.getSchema('quest');
    const valid = validate(questData);
    return {
      valid,
      errors: validate.errors || []
    };
  }

  validateItem(itemData) {
    const validate = this.ajv.getSchema('item');
    const valid = validate(itemData);
    return {
      valid,
      errors: validate.errors || []
    };
  }

  validateNPC(npcData) {
    const validate = this.ajv.getSchema('npc');
    const valid = validate(npcData);
    return {
      valid,
      errors: validate.errors || []
    };
  }

  async validateReferences(contentType, contentData) {
    const errors = [];

    // Validate quest references
    if (contentType === 'quest') {
      // Check questGiverId exists
      if (contentData.questGiverId) {
        const npc = await NPC.findOne({ where: { id: contentData.questGiverId } });
        if (!npc) {
          errors.push(`Quest giver ${contentData.questGiverId} not found`);
        }
      }

      // Check prerequisite quests exist
      if (contentData.prerequisites?.completedQuests) {
        for (const questId of contentData.prerequisites.completedQuests) {
          const quest = await Quest.findByPk(questId);
          if (!quest) {
            errors.push(`Prerequisite quest ${questId} not found`);
          }
        }
      }

      // Check reward items exist
      if (contentData.rewards?.items) {
        for (const rewardItem of contentData.rewards.items) {
          const item = await Item.findByPk(rewardItem.itemId);
          if (!item) {
            errors.push(`Reward item ${rewardItem.itemId} not found`);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async validateContentFile(filePath, contentType) {
    const contentData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    // Schema validation
    let validation;
    switch (contentType) {
      case 'quest':
        validation = this.validateQuest(contentData);
        break;
      case 'item':
        validation = this.validateItem(contentData);
        break;
      case 'npc':
        validation = this.validateNPC(contentData);
        break;
      default:
        return { valid: false, errors: ['Unknown content type'] };
    }

    if (!validation.valid) {
      return validation;
    }

    // Reference validation
    const refValidation = await this.validateReferences(contentType, contentData);
    if (!refValidation.valid) {
      return refValidation;
    }

    return { valid: true, errors: [] };
  }
}

module.exports = new ContentValidator();
```

#### Step 4.2: Create CLI Tool (Week 4, Days 4-5)

**File:** `backend/src/scripts/validate-content.js`

**Usage:**
```bash
node backend/src/scripts/validate-content.js --type quest --file content/factions/independent_investigators/main_quests/01_compound_investigation.json
node backend/src/scripts/validate-content.js --type all --dir content/
```

**Implementation:**
```javascript
#!/usr/bin/env node

const contentValidator = require('../utils/contentValidator');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const typeIndex = args.indexOf('--type');
const fileIndex = args.indexOf('--file');
const dirIndex = args.indexOf('--dir');

if (typeIndex === -1) {
  console.error('Usage: validate-content.js --type <quest|item|npc|all> [--file <path>] [--dir <path>]');
  process.exit(1);
}

const contentType = args[typeIndex + 1];

async function validateFile(filePath, type) {
  console.log(`Validating ${filePath}...`);
  const result = await contentValidator.validateContentFile(filePath, type);
  
  if (result.valid) {
    console.log(`  ✓ Valid`);
    return true;
  } else {
    console.log(`  ✗ Invalid:`);
    result.errors.forEach(err => {
      console.log(`    - ${err.message || err}`);
    });
    return false;
  }
}

async function validateDirectory(dirPath, type) {
  const files = fs.readdirSync(dirPath, { recursive: true })
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(dirPath, f));

  let validCount = 0;
  let invalidCount = 0;

  for (const file of files) {
    const isValid = await validateFile(file, type);
    if (isValid) validCount++;
    else invalidCount++;
  }

  console.log(`\nValidation complete: ${validCount} valid, ${invalidCount} invalid`);
  return invalidCount === 0;
}

async function main() {
  if (fileIndex !== -1) {
    const filePath = args[fileIndex + 1];
    const isValid = await validateFile(filePath, contentType);
    process.exit(isValid ? 0 : 1);
  } else if (dirIndex !== -1) {
    const dirPath = args[dirIndex + 1];
    const isValid = await validateDirectory(dirPath, contentType);
    process.exit(isValid ? 0 : 1);
  } else {
    console.error('Must specify --file or --dir');
    process.exit(1);
  }
}

main();
```

#### Step 4.3: Add Pre-Commit Hook (Week 4, Day 6)

**File:** `.husky/pre-commit` (or `.git/hooks/pre-commit`)

**Script:**
```bash
#!/bin/sh
# Validate content files before commit

node backend/src/scripts/validate-content.js --type all --dir content/

if [ $? -ne 0 ]; then
  echo "Content validation failed. Please fix errors before committing."
  exit 1
fi
```

#### Step 4.4: Add CI Validation (Week 4, Day 7)

**File:** `.github/workflows/validate-content.yml` (if using GitHub)

**Workflow:**
```yaml
name: Validate Content

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: node backend/src/scripts/validate-content.js --type all --dir content/
```

### 4.4 Success Criteria
- ✅ Validation library validates all content types
- ✅ CLI tool can validate files and directories
- ✅ Pre-commit hook prevents invalid content
- ✅ CI validates content on push
- ✅ Clear error messages guide fixes

---

## Implementation Timeline

### Week 1: Technical Specifications
- Days 1-2: Quest schema
- Days 3-4: Item schema
- Day 5: NPC schema
- Day 6: Choice tracking schema
- Day 7: Documentation

### Week 2: Quest Chain System
- Days 1-3: Quest service enhancements
- Day 4: Update completion logic
- Day 5: Add endpoints
- Days 6-7: Frontend integration

### Week 3: Item Rarity System
- Day 1: Database migration
- Day 2: Update item model
- Days 3-4: Enhance inventory service
- Day 5: Add endpoints
- Days 6-7: Frontend display

### Week 4: Content Validation Tools
- Days 1-3: Validation library
- Days 4-5: CLI tool
- Day 6: Pre-commit hook
- Day 7: CI integration

### Week 5-6: Testing & Polish
- Test all systems
- Fix bugs
- Update documentation
- Create examples

---

## Dependencies

### Required Packages
```json
{
  "ajv": "^8.12.0",
  "ajv-formats": "^2.1.1"
}
```

### Required Files
- All schema files in `docs/schemas/`
- Example content files
- Validation scripts

---

## Success Metrics

1. **Technical Specifications**
   - ✅ 100% of content types have schemas
   - ✅ All schemas validate existing content
   - ✅ Documentation is complete

2. **Quest Chain System**
   - ✅ Chains can be created and validated
   - ✅ Chain progression works automatically
   - ✅ Frontend displays chain info

3. **Item Rarity System**
   - ✅ All items have rarity
   - ✅ Rarity filtering works
   - ✅ Faction requirements enforced

4. **Content Validation**
   - ✅ All content files validate
   - ✅ Validation runs automatically
   - ✅ Errors are clear and actionable

---

## Next Steps After Completion

1. Begin content creation using new schemas
2. Create quest chains for Compound 7-Alpha
3. Add rarity to existing items
4. Validate all existing content files

---

**Document Status:** Ready for Implementation  
**Estimated Completion:** 4-6 weeks  
**Priority:** High - Foundation for Content Expansion



