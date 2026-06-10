# Combat System Testing Guide

## 🎯 Quick Start Testing

This guide will help you test the combat system before we implement encounter triggers.

---

## Step 1: Run Database Migration

First, create the combat tables:

```bash
cd backend
npm run migrate
```

You should see:
```
✓ Database connection established successfully
✓ Migration tracking table ready
▶  Running 007-create-combat.js...
✓ Completed 007-create-combat.js
✓ All migrations completed successfully
```

---

## Step 2: Start the Servers

### Backend Server
```bash
cd backend
npm run dev
```

You should see:
```
✓ Database connection established successfully
✓ Server running on port 3001
```

### Frontend Server (in a new terminal)
```bash
cd frontend
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

---

## Step 3: Test Combat System

### Option A: Using the Test Button (Recommended)

I'll create a test button in the GameWorld page that allows you to start a combat encounter.

### Option B: Using Browser Console

1. **Open your browser** and navigate to `http://localhost:5173`
2. **Log in** and select/create a character
3. **Open browser console** (F12 or Cmd+Option+I)
4. **Run this command** to start a combat encounter:

```javascript
// Get your character ID
const characterId = window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.get(1)?.findFiberByHostInstance?.(document.querySelector('[data-reactroot]'))?.return?.memoizedState?.currentCharacter?.id;

// Or simpler - check the character store
import { useCharacterStore } from './state/characterSlice';
const character = useCharacterStore.getState().currentCharacter;
console.log('Character ID:', character?.id);

// Start combat (replace CHARACTER_ID with your actual character ID)
fetch('http://localhost:3001/api/combat/start', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
  },
  body: JSON.stringify({
    characterId: 'YOUR_CHARACTER_ID_HERE',
    encounterType: 'random',
    enemies: ['stormtrooper'] // Optional: specify enemy type
  })
})
.then(r => r.json())
.then(data => {
  console.log('Combat started:', data);
  // Navigate to combat view
  window.location.href = `/game/combat/${data.data.id}`;
});
```

### Option C: Using Postman/Insomnia

1. **POST** `http://localhost:3001/api/combat/start`
2. **Headers:**
   - `Content-Type: application/json`
   - `Authorization: Bearer YOUR_TOKEN`
3. **Body:**
```json
{
  "characterId": "YOUR_CHARACTER_ID",
  "encounterType": "random",
  "enemies": ["stormtrooper"]
}
```

4. **Response:** You'll get an encounter ID
5. **Navigate to:** `http://localhost:5173/game/combat/ENCOUNTER_ID`

---

## Step 4: Test Combat Flow

Once in the combat view, test:

1. **Turn Order** - Verify turn order is displayed correctly
2. **Combatant Display** - Check health/stamina bars update
3. **Target Selection** - Click on enemies to select them
4. **Attack Action** - Select target, click "Attack"
5. **Combat Log** - Verify actions appear in log
6. **Enemy Turn** - Wait for enemy AI to take turn
7. **Victory/Defeat** - Complete combat and verify rewards

---

## Step 5: Test Different Actions

- ✅ **Attack** - Select enemy, click Attack
- ✅ **Defend** - Click Defend (increases defense)
- ✅ **Use Item** - If you have consumables, test using them
- ✅ **Flee** - Test fleeing (30% base chance + speed bonus)

---

## Step 6: Verify Rewards

After winning combat:
- ✅ Check XP was awarded (check character stats)
- ✅ Check credits were awarded
- ✅ Check loot items were added to inventory
- ✅ Verify character health/stamina updates

---

## Troubleshooting

### "Character already has an active combat encounter"
- Solution: Complete or flee from the existing encounter first
- Or: Check database for active encounters and mark them as 'won' or 'lost'

### "Combat encounter not found"
- Solution: Make sure you're using the correct encounter ID
- Check backend logs for errors

### "Not your turn"
- Solution: Wait for your turn (check turn order indicator)
- Enemy turns are automatic

### Frontend not loading
- Check browser console for errors
- Verify backend is running on port 3001
- Check CORS settings in backend

---

## Quick Test Script

Save this as `test-combat.js` in the project root:

```javascript
// Quick combat test script
const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';
const TOKEN = 'YOUR_TOKEN_HERE'; // Get from localStorage or .env

async function testCombat() {
  try {
    // 1. Start encounter
    const startRes = await axios.post(
      `${API_BASE}/combat/start`,
      {
        characterId: 'YOUR_CHARACTER_ID',
        encounterType: 'random',
        enemies: ['stormtrooper']
      },
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const encounterId = startRes.data.data.id;
    console.log('✓ Combat started:', encounterId);

    // 2. Get encounter state
    const stateRes = await axios.get(
      `${API_BASE}/combat/${encounterId}`,
      {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
      }
    );

    const encounter = stateRes.data.data;
    const player = encounter.combatants.find(c => c.type === 'player');
    const enemy = encounter.combatants.find(c => c.type === 'enemy');

    console.log('✓ Encounter state loaded');
    console.log('  Player:', player.name, `(${player.stats.health}/${player.stats.maxHealth} HP)`);
    console.log('  Enemy:', enemy.name, `(${enemy.stats.health}/${enemy.stats.maxHealth} HP)`);

    // 3. Execute attack
    const attackRes = await axios.post(
      `${API_BASE}/combat/${encounterId}/action`,
      {
        combatantId: player.id,
        actionType: 'attack',
        targetId: enemy.id
      },
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✓ Attack executed:', attackRes.data.data.action);

    // 4. Check if combat is over
    if (attackRes.data.data.gameOver) {
      console.log('✓ Combat finished:', attackRes.data.data.status);
    }

  } catch (error) {
    console.error('✗ Test failed:', error.response?.data || error.message);
  }
}

testCombat();
```

Run with: `node test-combat.js`

---

## Expected Results

### Successful Combat Flow:
1. ✅ Encounter created with player + enemies
2. ✅ Turn order determined by speed
3. ✅ Player can select targets and execute actions
4. ✅ Enemy AI takes turns automatically
5. ✅ Health bars update in real-time
6. ✅ Combat log shows all actions
7. ✅ Victory screen shows rewards
8. ✅ Character stats update after combat

---

## Next Steps After Testing

Once you've verified the combat system works:
1. ✅ Report any bugs or issues
2. ✅ Test with different enemy types
3. ✅ Test with different character levels
4. ✅ Verify equipment affects combat stats
5. ✅ Test edge cases (flee, defeat, etc.)

Then we can proceed with:
- Week 5-6: Combat Integration (encounter triggers, random encounters)
- Week 7: POI Interactions
- Week 8: Fast Travel
- Week 9: Polish & Final Integration


