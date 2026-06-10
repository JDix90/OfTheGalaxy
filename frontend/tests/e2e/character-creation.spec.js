/**
 * Character Creation E2E Tests
 * End-to-end tests for character creation flow
 */

import { test, expect } from '@playwright/test';

test.describe('Character Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to character creation page
    // Note: This assumes authentication is handled separately
    await page.goto('/character-creation');
  });

  test('should complete character creation flow', async ({ page }) => {
    // Step 1: Enter character name
    await page.fill('input[name="name"]', 'E2E Test Character');
    await page.click('button:has-text("Next")');

    // Step 2: Select species
    await expect(page.locator('text=Select Species')).toBeVisible();
    await page.click('button:has-text("Human")');
    await page.click('button:has-text("Next")');

    // Step 3: Select background
    await expect(page.locator('text=Select Background')).toBeVisible();
    await page.click('button:has-text("Soldier")');
    await page.click('button:has-text("Next")');

    // Step 4: Allocate attributes (skip for now - default allocation)
    await page.click('button:has-text("Next")');

    // Step 5: Customize appearance (skip for now)
    await page.click('button:has-text("Next")');

    // Step 6: Confirm and create
    await expect(page.locator('text=Name & Confirm')).toBeVisible();
    await page.click('button:has-text("Create Character")');

    // Should redirect to game
    await expect(page).toHaveURL(/\/game/);
  });

  test('should validate character name', async ({ page }) => {
    // Try to proceed with invalid name
    await page.fill('input[name="name"]', 'A'); // Too short
    await page.click('button:has-text("Next")');

    // Should show validation error
    await expect(page.locator('text=Name must be at least 2 characters')).toBeVisible();
  });

  test('should allow navigation between steps', async ({ page }) => {
    // Enter name and proceed
    await page.fill('input[name="name"]', 'Test Character');
    await page.click('button:has-text("Next")');

    // Go back
    await page.click('button:has-text("Back")');

    // Should be back on name step
    await expect(page.locator('input[name="name"]')).toBeVisible();
  });
});

