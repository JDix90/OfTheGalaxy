/**
 * Content Validator
 * Validates content files against JSON schemas and checks references
 */

const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');

class ContentValidator {
  constructor() {
    this.ajv = new Ajv({ 
      allErrors: true,
      verbose: true,
      strict: false
    });
    addFormats(this.ajv);
    this.schemas = {};
    this.loadSchemas();
  }

  /**
   * Load all JSON schemas from docs/schemas directory
   */
  loadSchemas() {
    // Schemas are at project root: docs/schemas
    const schemasDir = path.join(__dirname, '../../../docs/schemas');
    
    if (!fs.existsSync(schemasDir)) {
      console.warn(`Schemas directory not found: ${schemasDir}`);
      return;
    }

    const schemaFiles = fs.readdirSync(schemasDir)
      .filter(f => f.endsWith('-schema.json'));

    for (const file of schemaFiles) {
      try {
        const schemaPath = path.join(schemasDir, file);
        const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
        const schemaName = file.replace('-schema.json', '');
        this.schemas[schemaName] = schema;
        this.ajv.addSchema(schema, schemaName);
        console.log(`Loaded schema: ${schemaName}`);
      } catch (error) {
        console.error(`Error loading schema ${file}:`, error.message);
      }
    }
  }

  /**
   * Validate quest data against schema
   */
  validateQuest(questData) {
    const validate = this.ajv.getSchema('quest');
    if (!validate) {
      return {
        valid: false,
        errors: ['Quest schema not loaded']
      };
    }

    const valid = validate(questData);
    return {
      valid,
      errors: validate.errors || []
    };
  }

  /**
   * Validate item data against schema
   */
  validateItem(itemData) {
    const validate = this.ajv.getSchema('item');
    if (!validate) {
      return {
        valid: false,
        errors: ['Item schema not loaded']
      };
    }

    const valid = validate(itemData);
    return {
      valid,
      errors: validate.errors || []
    };
  }

  /**
   * Validate NPC data against schema
   */
  validateNPC(npcData) {
    const validate = this.ajv.getSchema('npc');
    if (!validate) {
      return {
        valid: false,
        errors: ['NPC schema not loaded']
      };
    }

    const valid = validate(npcData);
    return {
      valid,
      errors: validate.errors || []
    };
  }

  /**
   * Validate choice tracking data against schema
   */
  validateChoice(choiceData) {
    const validate = this.ajv.getSchema('choice-tracking');
    if (!validate) {
      return {
        valid: false,
        errors: ['Choice tracking schema not loaded']
      };
    }

    const valid = validate(choiceData);
    return {
      valid,
      errors: validate.errors || []
    };
  }

  /**
   * Validate references in content (NPCs, quests, items)
   */
  async validateReferences(contentType, contentData) {
    const errors = [];
    const { Quest, NPC, Item } = require('../models');

    try {
      // Validate quest references
      if (contentType === 'quest') {
        // Check questGiverId exists
        if (contentData.questGiverId) {
          const npc = await NPC.findOne({ where: { id: contentData.questGiverId } });
          if (!npc) {
            errors.push(`Quest giver NPC '${contentData.questGiverId}' not found`);
          }
        }

        // Check prerequisite quests exist
        if (contentData.prerequisites?.completedQuests) {
          for (const questId of contentData.prerequisites.completedQuests) {
            const quest = await Quest.findByPk(questId);
            if (!quest) {
              errors.push(`Prerequisite quest '${questId}' not found`);
            }
          }
        }

        // Check reward items exist
        if (contentData.rewards?.items) {
          for (const rewardItem of contentData.rewards.items) {
            // Check in database first
            const dbItem = await Item.findByPk(rewardItem.itemId);
            if (!dbItem) {
              // Check in data file
              const { getItemDefinition } = require('../data/items');
              const fileItem = getItemDefinition(rewardItem.itemId);
              if (!fileItem) {
                errors.push(`Reward item '${rewardItem.itemId}' not found`);
              }
            }
          }
        }

        // Check unlocks exist
        if (contentData.rewards?.unlocks) {
          for (const questId of contentData.rewards.unlocks) {
            const quest = await Quest.findByPk(questId);
            if (!quest) {
              errors.push(`Unlocked quest '${questId}' not found`);
            }
          }
        }

        // Check objective targets (NPCs, items, etc.)
        if (contentData.objectives) {
          for (const objective of contentData.objectives) {
            if (objective.target && objective.type === 'interact') {
              const npc = await NPC.findOne({ where: { id: objective.target } });
              if (!npc) {
                errors.push(`Objective target NPC '${objective.target}' not found`);
              }
            }
          }
        }
      }

      // Validate NPC references
      if (contentType === 'npc') {
        // Check quest references
        if (contentData.quests) {
          for (const questId of contentData.quests) {
            const quest = await Quest.findByPk(questId);
            if (!quest) {
              errors.push(`NPC quest reference '${questId}' not found`);
            }
          }
        }

        // Check vendor inventory items
        if (contentData.vendorInventory) {
          for (const itemId of contentData.vendorInventory) {
            const dbItem = await Item.findByPk(itemId);
            if (!dbItem) {
              const { getItemDefinition } = require('../data/items');
              const fileItem = getItemDefinition(itemId);
              if (!fileItem) {
                errors.push(`Vendor item '${itemId}' not found`);
              }
            }
          }
        }
      }

      // Validate item references
      if (contentType === 'item') {
        // Check faction exists (if specified)
        if (contentData.factionId) {
          const { getFactionList } = require('../data/factionList');
          const factions = getFactionList();
          const faction = factions.find(f => f.id === contentData.factionId);
          if (!faction) {
            errors.push(`Faction '${contentData.factionId}' not found`);
          }
        }
      }
    } catch (error) {
      errors.push(`Error validating references: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate a content file
   */
  async validateContentFile(filePath, contentType) {
    try {
      // Read and parse JSON
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
        case 'choice':
          validation = this.validateChoice(contentData);
          break;
        default:
          return {
            valid: false,
            errors: [`Unknown content type: ${contentType}`]
          };
      }

      if (!validation.valid) {
        return {
          valid: false,
          errors: validation.errors.map(err => {
            return `${err.instancePath || 'root'}: ${err.message}`;
          })
        };
      }

      // Reference validation
      const refValidation = await this.validateReferences(contentType, contentData);
      if (!refValidation.valid) {
        return {
          valid: false,
          errors: refValidation.errors
        };
      }

      return {
        valid: true,
        errors: []
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        return {
          valid: false,
          errors: [`Invalid JSON: ${error.message}`]
        };
      }
      return {
        valid: false,
        errors: [`Error reading file: ${error.message}`]
      };
    }
  }

  /**
   * Validate all content files in a directory
   */
  async validateDirectory(dirPath, contentType) {
    const results = [];
    
    if (!fs.existsSync(dirPath)) {
      return {
        valid: false,
        errors: [`Directory not found: ${dirPath}`],
        results: []
      };
    }

    const files = this.findContentFiles(dirPath, contentType);
    
    for (const file of files) {
      const result = await this.validateContentFile(file, contentType);
      results.push({
        file,
        ...result
      });
    }

    const validCount = results.filter(r => r.valid).length;
    const invalidCount = results.filter(r => !r.valid).length;

    return {
      valid: invalidCount === 0,
      totalFiles: files.length,
      validCount,
      invalidCount,
      results
    };
  }

  /**
   * Find content files in directory
   */
  findContentFiles(dirPath, contentType) {
    const files = [];
    
    function walkDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          files.push(fullPath);
        }
      }
    }
    
    walkDir(dirPath);
    return files;
  }
}

module.exports = new ContentValidator();

