/**
 * InventoryView Component Tests
 * Tests for inventory management component
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '../../setup/testUtils';
import InventoryView from '../../../src/features/inventory/InventoryView';

// Mock inventory API
vi.mock('../../../src/services/api/inventoryApi', () => ({
  inventoryApi: {
    getInventory: vi.fn(),
    equipItem: vi.fn(),
    unequipItem: vi.fn(),
    removeItem: vi.fn()
  }
}));

describe('InventoryView', () => {
  const mockInventory = {
    items: [
      {
        id: 'inv-1',
        itemId: 'item-1',
        quantity: 5,
        equipped: false
      },
      {
        id: 'inv-2',
        itemId: 'item-2',
        quantity: 1,
        equipped: false
      }
    ],
    equipped: [
      {
        id: 'inv-3',
        itemId: 'weapon-1',
        quantity: 1,
        equipped: true,
        equipmentSlot: 'weapon'
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should render inventory view', async () => {
    const { inventoryApi } = await import('../../../src/services/api/inventoryApi');
    inventoryApi.getInventory.mockResolvedValue({
      success: true,
      data: mockInventory
    });

    renderWithProviders(<InventoryView characterId="test-character" />);
    
    await waitFor(() => {
      expect(inventoryApi.getInventory).toHaveBeenCalled();
    });
  });

  test('should display inventory items', async () => {
    const { inventoryApi } = await import('../../../src/services/api/inventoryApi');
    inventoryApi.getInventory.mockResolvedValue({
      success: true,
      data: mockInventory
    });

    renderWithProviders(<InventoryView characterId="test-character" />);
    
    await waitFor(() => {
      // Should show inventory items
      expect(screen.getByText(/inventory/i) || screen.getByText(/items/i)).toBeDefined();
    });
  });

  test('should display equipped items', async () => {
    const { inventoryApi } = await import('../../../src/services/api/inventoryApi');
    inventoryApi.getInventory.mockResolvedValue({
      success: true,
      data: mockInventory
    });

    renderWithProviders(<InventoryView characterId="test-character" />);
    
    await waitFor(() => {
      // Should show equipped section
      expect(screen.getByText(/equipped/i) || screen.getByText(/weapon/i)).toBeDefined();
    });
  });
});

