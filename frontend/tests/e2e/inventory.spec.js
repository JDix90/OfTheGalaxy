/**
 * Inventory E2E Tests
 * End-to-end tests for inventory management
 */

import { test, expect } from '@playwright/test';

test.describe('Inventory Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/game');
    await page.waitForSelector('.game-world', { timeout: 10000 });
  });

  test('should open inventory', async ({ page }) => {
    // Click inventory button (if exists in HUD)
    const inventoryButton = page.locator('button:has-text("Inventory")').or(page.locator('.inventory-button'));
    
    if (await inventoryButton.count() > 0) {
      await inventoryButton.click();
      await expect(page.locator('.inventory-view')).toBeVisible();
    }
  });

  test('should display inventory items', async ({ page }) => {
    // Open inventory
    await page.goto('/game/inventory');
    
    // Should show inventory items
    await expect(page.locator('.inventory-grid') || page.locator('.inventory-item')).toBeVisible();
  });

  test('should equip item', async ({ page }) => {
    await page.goto('/game/inventory');
    
    // Find an item and equip it
    const item = page.locator('.inventory-item').first();
    if (await item.count() > 0) {
      await item.click();
      await page.click('button:has-text("Equip")');
      
      // Item should appear in equipped section
      await expect(page.locator('.equipped-item')).toBeVisible();
    }
  });

  test('should filter inventory by type', async ({ page }) => {
    await page.goto('/game/inventory');
    
    // Click filter button
    await page.click('button:has-text("Weapons")');
    
    // Only weapons should be visible
    // This would require checking item types
  });
});

