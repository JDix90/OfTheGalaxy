# How to Refresh Character Credits in the Frontend

## Issue
The frontend caches character data in localStorage. After updating credits in the database, you need to refresh the character data in the browser.

## Solutions

### Solution 1: Refresh the Page (Easiest)
1. Press `F5` (Windows/Linux) or `Cmd+R` (Mac)
2. The character will reload from the backend with updated credits

### Solution 2: Navigate Away and Back
1. Click on a different page (e.g., "Quests" or "Factions")
2. Navigate back to "Game" → "Galaxy Map"
3. The character will reload automatically

### Solution 3: Change Character and Select Again
1. Click "Change Character" in the header
2. Select Alyria again
3. Character data will reload from backend

### Solution 4: Clear Browser Cache (If above don't work)
1. Open browser DevTools (F12)
2. Go to Application/Storage tab
3. Find "Local Storage" → your domain
4. Delete the `character-storage` key
5. Refresh the page

## Verification

After refreshing, check the Galaxy Map:
- Click on Ryloth system
- Check "Your Credits" in the travel confirmation dialog
- Should show: **2,000,250 credits** (or your updated amount)

## Technical Details

The frontend uses Zustand with persistence middleware, which caches character data in localStorage. The GalaxyMap component now automatically reloads character data when it mounts, but you may still need to refresh the page if you're already on the map.

## Current Status

✅ **Database Updated:** Alyria has 2,000,250 credits in the database
✅ **Frontend Auto-Reload:** GalaxyMap now reloads character on mount
⚠️ **Action Required:** Refresh the page to see updated credits



