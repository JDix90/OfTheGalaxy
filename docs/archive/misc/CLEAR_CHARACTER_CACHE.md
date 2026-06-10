# Clear Character Cache - Quick Fix

## Problem
The frontend caches character data in browser localStorage. Even though the database has been updated, the browser is still showing old cached data.

## Quick Solution (30 seconds)

### Step 1: Open Browser Console
1. Press `F12` (or `Cmd+Option+I` on Mac) to open DevTools
2. Click on the **Console** tab

### Step 2: Clear the Cache
Copy and paste this command into the console and press Enter:

```javascript
localStorage.removeItem('character-storage');
location.reload();
```

That's it! The page will reload and fetch fresh character data from the backend.

## Alternative Methods

### Method 1: Application Tab (Visual)
1. Open DevTools (`F12`)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Expand **Local Storage**
4. Click on your domain (e.g., `http://localhost:5173`)
5. Find and delete the key: `character-storage`
6. Refresh the page (`F5`)

### Method 2: Hard Refresh
- **Windows/Linux:** `Ctrl + Shift + R`
- **Mac:** `Cmd + Shift + R`

This forces the browser to reload everything from the server.

### Method 3: Clear All Site Data
1. Open DevTools (`F12`)
2. Go to **Application** tab
3. Click **Clear storage** in the left sidebar
4. Check "Local storage"
5. Click **Clear site data**
6. Refresh the page

## Verification

After clearing the cache, check:
1. The top bar should show: **1,000,000 credits** (or your updated amount)
2. When clicking on Ryloth, "Your Credits" should show the updated amount
3. Travel should be enabled (cost is 650 credits)

## Current Database Status

✅ **Character:** Alyria  
✅ **Character ID:** `915e9d14-1bbc-4c49-9231-d143aeb38d45`  
✅ **Credits in Database:** 1,000,000 credits  
✅ **Current Planet:** Coruscant

## Why This Happens

The frontend uses Zustand state management with localStorage persistence for performance. This means:
- Character data is cached locally for faster loading
- When you update the database, the cache doesn't automatically update
- You need to clear the cache to see database changes

## Future Improvement

The GalaxyMap component now automatically reloads character data when it mounts, but you may still need to clear the cache if you're already on the page.



