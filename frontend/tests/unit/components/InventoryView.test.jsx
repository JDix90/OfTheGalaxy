/**
 * InventoryView Component Tests
 *
 * InventoryView takes no props: it reads currentCharacter from the character
 * store and items/equipped from the inventory store, then renders InventoryGrid
 * and EquipmentPanel. These tests drive it through those stores.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../setup/testUtils';
import InventoryView from '../../../src/features/inventory/InventoryView';
import { useCharacterStore } from '../../../src/state/characterSlice';
import { useInventoryStore } from '../../../src/state/inventorySlice';

vi.mock('../../../src/state/characterSlice', () => ({ useCharacterStore: vi.fn() }));
vi.mock('../../../src/state/inventorySlice', () => ({ useInventoryStore: vi.fn() }));
// Stub presentational children so we can assert the data they receive.
vi.mock('../../../src/features/inventory/InventoryGrid', () => ({
  default: ({ items }) => <div data-testid="grid">{items.map((i) => <div key={i.id}>{i.itemId}</div>)}</div>
}));
vi.mock('../../../src/features/inventory/EquipmentPanel', () => ({
  default: ({ equipped }) => <div data-testid="equipped">{equipped.map((e) => <div key={e.id}>{e.itemId}</div>)}</div>
}));

const items = [
  { id: 'inv-1', itemId: 'item-1', quantity: 5, equipped: false },
  { id: 'inv-2', itemId: 'item-2', quantity: 1, equipped: false }
];
const equipped = [
  { id: 'inv-3', itemId: 'weapon-1', quantity: 1, equipped: true, equipmentSlot: 'weapon' }
];

function setStores({ currentCharacter = { id: 'test-character' }, itemList = items, equippedList = equipped } = {}) {
  useCharacterStore.mockReturnValue({ currentCharacter });
  useInventoryStore.mockReturnValue({
    items: itemList,
    equipped: equippedList,
    setBonuses: [],
    loadInventory: vi.fn().mockResolvedValue(undefined),
    loading: false,
    error: null
  });
}

describe('InventoryView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setStores();
  });

  test('renders the inventory header', () => {
    renderWithProviders(<InventoryView />);
    expect(screen.getByRole('heading', { name: /inventory/i })).toBeInTheDocument();
  });

  test('passes inventory items to the grid', () => {
    renderWithProviders(<InventoryView />);
    expect(screen.getByText('item-1')).toBeInTheDocument();
    expect(screen.getByText('item-2')).toBeInTheDocument();
  });

  test('passes equipped items to the equipment panel', () => {
    renderWithProviders(<InventoryView />);
    expect(screen.getByText('weapon-1')).toBeInTheDocument();
  });

  test('shows "No character selected" when there is no character', () => {
    setStores({ currentCharacter: null });
    renderWithProviders(<InventoryView />);
    expect(screen.getByText(/no character selected/i)).toBeInTheDocument();
  });
});
