#!/usr/bin/env node

/**
 * Content Validation CLI Tool
 * Validates content files against JSON schemas
 * 
 * Usage:
 *   node backend/src/scripts/validate-content.js --type quest --file path/to/quest.json
 *   node backend/src/scripts/validate-content.js --type all --dir content/
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const contentValidator = require('../utils/contentValidator');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const typeIndex = args.indexOf('--type');
const fileIndex = args.indexOf('--file');
const dirIndex = args.indexOf('--dir');

if (typeIndex === -1) {
  console.error('Usage: validate-content.js --type <quest|item|npc|choice|all> [--file <path>] [--dir <path>]');
  process.exit(1);
}

const contentType = args[typeIndex + 1];

const validTypes = ['quest', 'item', 'npc', 'choice', 'all'];
if (!validTypes.includes(contentType)) {
  console.error(`Invalid content type: ${contentType}`);
  console.error(`Valid types: ${validTypes.join(', ')}`);
  process.exit(1);
}

async function validateFile(filePath, type) {
  console.log(`\nValidating ${filePath}...`);
  const result = await contentValidator.validateContentFile(filePath, type);
  
  if (result.valid) {
    console.log(`  ✓ Valid`);
    return true;
  } else {
    console.log(`  ✗ Invalid:`);
    result.errors.forEach(err => {
      console.log(`    - ${err}`);
    });
    return false;
  }
}

async function validateDirectory(dirPath, type) {
  console.log(`\nValidating directory: ${dirPath}`);
  console.log(`Content type: ${type}`);
  
  if (type === 'all') {
    // Validate all types
    const types = ['quest', 'item', 'npc', 'choice'];
    let allValid = true;
    
    for (const t of types) {
      console.log(`\n--- Validating ${t} files ---`);
      const result = await contentValidator.validateDirectory(dirPath, t);
      
      console.log(`  Total files: ${result.totalFiles || 0}`);
      console.log(`  Valid: ${result.validCount || 0}`);
      console.log(`  Invalid: ${result.invalidCount || 0}`);
      
      if (result.results) {
        for (const fileResult of result.results) {
          if (!fileResult.valid) {
            console.log(`\n  ✗ ${fileResult.file}`);
            fileResult.errors.forEach(err => {
              console.log(`      - ${err}`);
            });
            allValid = false;
          }
        }
      }
      
      if (!result.valid) {
        allValid = false;
      }
    }
    
    return allValid;
  } else {
    const result = await contentValidator.validateDirectory(dirPath, type);
    
    console.log(`\nTotal files: ${result.totalFiles || 0}`);
    console.log(`Valid: ${result.validCount || 0}`);
    console.log(`Invalid: ${result.invalidCount || 0}`);
    
    if (result.results) {
      for (const fileResult of result.results) {
        if (!fileResult.valid) {
          console.log(`\n✗ ${fileResult.file}`);
          fileResult.errors.forEach(err => {
            console.log(`  - ${err}`);
          });
        }
      }
    }
    
    return result.valid;
  }
}

async function main() {
  try {
    if (fileIndex !== -1) {
      const filePath = args[fileIndex + 1];
      
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
      }
      
      // Determine type from file if not specified
      let type = contentType;
      if (type === 'all') {
        // Try to infer from file path
        if (filePath.includes('quest')) type = 'quest';
        else if (filePath.includes('npc')) type = 'npc';
        else if (filePath.includes('item')) type = 'item';
        else {
          console.error('Cannot infer content type from file path. Please specify --type');
          process.exit(1);
        }
      }
      
      const isValid = await validateFile(filePath, type);
      process.exit(isValid ? 0 : 1);
    } else if (dirIndex !== -1) {
      const dirPath = args[dirIndex + 1];
      
      if (!fs.existsSync(dirPath)) {
        console.error(`Directory not found: ${dirPath}`);
        process.exit(1);
      }
      
      const isValid = await validateDirectory(dirPath, contentType);
      process.exit(isValid ? 0 : 1);
    } else {
      console.error('Must specify --file or --dir');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { validateFile, validateDirectory };



