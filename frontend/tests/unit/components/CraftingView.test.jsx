/**
 * CraftingView Component Tests
 *
 * CraftingView reads currentCharacter from the character store and loads recipes
 * via craftingApi.getRecipes(currentCharacter.id) in an effect (only when a
 * character is present). These tests provide the character and mock the API.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, fireEvent } from '../../setup/testUtils';
import CraftingView from '../../../src/features/crafting/CraftingView';
import { useCharacterStore } from '../../../src/state/characterSlice';
import { useInventoryStore } from '../../../src/state/inventorySlice';
import { craftingApi } from '../../../src/services/api/craftingApi';

vi.mock('../../../src/state/characterSlice', () => ({ useCharacterStore: vi.fn() }));
vi.mock('../../../src/state/inventorySlice', () => ({ useInventoryStore: vi.fn() }));
vi.mock('../../../src/services/api/craftingApi', () => ({
  craftingApi: { getRecipes: vi.fn(), canCraft: vi.fn(), craftItem: vi.fn() }
}));

const mockRecipes = [
  {
    id: 'medpac_01',
    name: 'Medpac',
    description: 'A basic medpac',
    canCraft: true,
    difficulty: 0,
    result: { itemId: 'medpac', quantity: 1 },
    materials: { scrap_metal_01: 2, energy_cell_01: 1 }
  }
];

beforeEach(() => {
  vi.clearAllMocks();
  useCharacterStore.mockReturnValue({
    currentCharacter: { id: 'test-character', currentStamina: 100 },
    updateLocation: vi.fn(),
    loadCharacter: vi.fn(),
    setCurrentCharacter: vi.fn()
  });
  useInventoryStore.mockReturnValue({ loadInventory: vi.fn().mockResolvedValue(undefined), items: [] });
  craftingApi.getRecipes.mockResolvedValue({ success: true, data: mockRecipes });
  craftingApi.canCraft.mockResolvedValue({ success: true, data: { canCraft: true } });
});

describe('CraftingView', () => {
  test('loads recipes for the current character', async () => {
    renderWithProviders(<CraftingView />);
    await waitFor(() => expect(craftingApi.getRecipes).toHaveBeenCalledWith('test-character'));
  });

  test('displays available recipes', async () => {
    renderWithProviders(<CraftingView />);
    expect(await screen.findByText('Medpac')).toBeInTheDocument();
  });

  test('shows a craft button after a recipe is selected', async () => {
    renderWithProviders(<CraftingView />);
    fireEvent.click(await screen.findByText('Medpac'));
    expect(await screen.findByRole('button', { name: /craft item/i })).toBeInTheDocument();
  });
});
