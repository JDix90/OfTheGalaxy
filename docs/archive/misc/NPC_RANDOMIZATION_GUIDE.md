# NPC Randomization Guide - Phase 2 Data

**Date:** December 2024  
**Purpose:** Randomize motivations, trust levels, and trust thresholds for diverse NPC conversations

---

## Problem

NPCs were showing identical:
- **Motivations:** All "Survival" with 50% urgency
- **Trust Levels:** All "Neutral" with 50/100
- **Trust Thresholds:** All the same (Share Secrets: 60, Request Favors: 50, Reveal Weaknesses: 70)

This resulted in repetitive, non-immersive conversations.

---

## Solution

### 1. Enhanced Randomization

**Trust Levels:**
- **Before:** 40-60 range (too narrow)
- **After:** 20-80 range (suspicious → neutral → trusting)

**Trust Thresholds:**
- **Share Secret:** 50-75 (some NPCs are more secretive)
- **Request Favor:** 30-60 (some NPCs are more willing to ask for help)
- **Reveal Weakness:** 60-85 (most NPCs are guarded)

**Motivation Urgency:**
- **Before:** 0.3-0.7 base range
- **After:** 0.2-0.9 base range (much more diverse)
- Additional variation based on goal type and location

---

## Files Modified

### 1. `backend/src/services/trustService.js`
- ✅ `initializeTrust()` - Now randomizes trust level (20-80) and thresholds
- ✅ `getDefaultTrust()` - Now accepts random function and randomizes values
- ✅ `meetsThreshold()` - Initializes trust if missing
- ✅ `buildTrustPrompt()` - Initializes trust if missing

### 2. `backend/src/services/motivationService.js`
- ✅ `calculateUrgency()` - Wider urgency range (0.2-0.9) with more variation

### 3. `backend/src/services/npcGenerator.js`
- ✅ Uses `initializeTrust()` with random function for new NPCs
- ✅ Properly randomizes trust system on NPC creation

### 4. `backend/src/scripts/randomizeNPCPhase2Data.js` (NEW)
- Script to randomize existing NPCs

---

## Usage

### Randomize Existing NPCs

Run the randomization script to update all existing NPCs:

```bash
node backend/src/scripts/randomizeNPCPhase2Data.js
```

This script will:
1. Find all available NPCs
2. Randomize motivations (urgency, immediate needs)
3. Randomize trust levels (20-80 range)
4. Randomize trust thresholds (per NPC)
5. Preserve trust factors (quests completed, etc.)

### New NPCs

New NPCs will automatically have randomized:
- Trust levels (20-80)
- Trust thresholds (varied per NPC)
- Motivation urgency (0.2-0.9)
- Goal types (based on occupation/faction)

---

## Randomization Details

### Trust Level Distribution

| Range | Tier | Description |
|-------|------|-------------|
| 0-20 | Very Suspicious | Doesn't trust at all |
| 20-40 | Cautious | Guarded, minimal sharing |
| 40-60 | Neutral | Standard trust, some sharing |
| 60-80 | Trusting | Comfortable sharing |
| 80-100 | Very Trusting | Complete trust |

### Trust Thresholds

**Share Secret:**
- Range: 50-75
- Meaning: Some NPCs are naturally secretive, others more open

**Request Favor:**
- Range: 30-60
- Meaning: Some NPCs are more willing to ask for help

**Reveal Weakness:**
- Range: 60-85
- Meaning: Most NPCs are guarded about vulnerabilities

### Motivation Urgency

**Base Range:** 0.2-0.9 (20%-90%)

**Modifiers:**
- Survival goals: +0.1-0.2
- Revenge goals: +0.15-0.25
- Knowledge goals: -0.1-0.2
- Wealth goals: -0.05-0.15
- Dangerous location: +0.15

**Final Range:** 0.0-1.0 (clamped)

---

## Expected Results

After running the script, NPCs will have:

✅ **Diverse Trust Levels:**
- Some NPCs will be suspicious (20-40)
- Some will be neutral (40-60)
- Some will be trusting (60-80)

✅ **Varied Trust Thresholds:**
- Some NPCs require higher trust to share secrets
- Some NPCs are more willing to ask for favors
- Different thresholds create unique interaction patterns

✅ **Diverse Motivations:**
- Different goal types (survival, wealth, knowledge, revenge, etc.)
- Varied urgency levels (20%-90%)
- Different immediate needs

✅ **More Immersive Conversations:**
- NPCs react differently based on trust
- Motivations drive varied dialogue
- Urgency affects quest offers and responses

---

## Testing

After running the script, test by:

1. **Check NPC Details Modal:**
   - Open NPC details for multiple NPCs
   - Verify trust levels vary (not all 50)
   - Verify thresholds are different
   - Verify urgency varies

2. **Test Conversations:**
   - Talk to NPCs with different trust levels
   - Verify suspicious NPCs are more guarded
   - Verify trusting NPCs are more open
   - Verify quest offers vary based on urgency

3. **Verify New NPCs:**
   - Generate new NPCs
   - Verify they have randomized values
   - Verify they're not all identical

---

## Notes

- **Seeded Randomization:** Uses NPC ID as seed for consistent randomization per NPC
- **Preserves Progress:** Trust factors (quests completed, etc.) are preserved
- **Backward Compatible:** Existing NPCs without trust system get initialized
- **Performance:** Script processes NPCs in batches, shows progress

---

## Troubleshooting

**Issue:** NPCs still show same values after running script
- **Solution:** Check console for errors, verify database connection

**Issue:** Trust levels seem too similar
- **Solution:** Verify script ran successfully, check that randomization is working

**Issue:** New NPCs still have default values
- **Solution:** Verify `npcGenerator.js` uses `initializeTrust()` with random function

---

**Status:** ✅ Ready to Use  
**Last Updated:** December 2024
