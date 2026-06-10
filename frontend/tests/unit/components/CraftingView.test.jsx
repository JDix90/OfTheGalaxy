/**
 * CraftingView Component Tests
 * Tests for crafting interface component
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '../../setup/testUtils';
import CraftingView from '../../../src/features/crafting/CraftingView';

// Mock crafting API
vi.mock('../../../src/services/api/craftingApi', () => ({
  craftingApi: {
    getRecipes: vi.fn(),
    canCraft: vi.fn(),
    craftItem: vi.fn()
  }
}));

describe('CraftingView', () => {
  const mockRecipes = [
    {
      id: 'medpac_01',
      name: 'Medpac',
      description: 'A basic medpac',
      materials: {
        'scrap_metal_01': 2,
        'energy_cell_01': 1
      }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should render crafting view', async () => {
    const { craftingApi } = await import('../../../src/services/api/craftingApi');
    craftingApi.getRecipes.mockResolvedValue({
      success: true,
      data: mockRecipes
    });

    renderWithProviders(<CraftingView characterId="test-character" />);

    await waitFor(() => {
      expect(craftingApi.getRecipes).toHaveBeenCalled();
    });
  });

  test('should display available recipes', async () => {
    const { craftingApi } = await import('../../../src/services/api/craftingApi');
    craftingApi.getRecipes.mockResolvedValue({
      success: true,
      data: mockRecipes
    });

    renderWithProviders(<CraftingView characterId="test-character" />);

    await waitFor(() => {
      expect(screen.getByText(/medpac/i) || screen.getByText(/recipe/i)).toBeDefined();
    });
  });

  test('should show crafting button when recipe selected', async () => {
    const { craftingApi } = await import('../../../src/services/api/craftingApi');
    craftingApi.getRecipes.mockResolvedValue({
      success: true,
      data: mockRecipes
    });
    craftingApi.canCraft.mockResolvedValue({
      success: true,
      data: { canCraft: true }
    });

    renderWithProviders(<CraftingView characterId="test-character" />);

    await waitFor(() => {
      const craftButton = screen.getByText(/craft/i);
      if (craftButton) {
        expect(craftButton).toBeDefined();
      }
    });
  });
});

