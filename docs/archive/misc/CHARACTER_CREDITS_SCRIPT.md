# Character Credits Management Script

## Quick Reference

### Add Credits to Character

```bash
cd /Users/jefe/Downloads/of-the-galaxy-rpg-foundation
node backend/src/scripts/add-credits-to-character.js [characterName] [amount]
```

### Examples

**Add 1,000,000 credits to Alyria (default):**
```bash
node backend/src/scripts/add-credits-to-character.js Alyria 1000000
```

**Add 500,000 credits to a different character:**
```bash
node backend/src/scripts/add-credits-to-character.js "Character Name" 500000
```

**Just use defaults (Alyria, 1,000,000):**
```bash
node backend/src/scripts/add-credits-to-character.js
```

## Current Status

✅ **Alyria** now has **1,000,250 credits** - ready for testing!

## Features

- Case-insensitive character name matching
- Shows current credits before adding
- Displays new balance after update
- Lists available characters if character not found
- Handles database connection errors gracefully

## Use Cases

- Testing travel costs
- Testing item purchases
- Testing quest rewards
- General gameplay testing



