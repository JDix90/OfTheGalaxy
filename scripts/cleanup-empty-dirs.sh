#!/bin/bash

# Cleanup Script: Remove Empty Directories
# This script removes empty directories that were created as scaffolding but never populated

echo "🧹 Cleaning up empty directories..."
echo ""

# Frontend empty directories
echo "Removing frontend empty directories..."
rm -rf frontend/src/core/inventory
rm -rf frontend/src/core/save
rm -rf frontend/src/features/exploration
rm -rf frontend/src/features/factions
rm -rf frontend/src/services/character
rm -rf frontend/src/services/faction
rm -rf frontend/src/services/npc
rm -rf frontend/src/services/quest
rm -rf frontend/src/ui/hud
rm -rf frontend/src/ui/menus
rm -rf frontend/src/ui/modals
rm -rf frontend/src/ui/shared
rm -rf frontend/src/hooks

# Backend empty directories
echo "Removing backend empty directories..."
rm -rf backend/src/data/factions
rm -rf backend/src/data/items
# Note: Keeping backend/src/data/npcs/ in case we want to add static NPC files later

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Note: backend/src/data/npcs/ was kept in case you want to add static NPC JSON files later."
echo "If you don't plan to use it, you can manually delete it with:"
echo "  rm -rf backend/src/data/npcs"


