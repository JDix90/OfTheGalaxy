/**
 * ItemTooltip — render + on-screen positioning.
 *
 * Regression guard: the detail panel must ALWAYS render when an item is hovered/clicked (an earlier
 * positioning rewrite gated it behind a "measured yet?" visibility flag that could get stuck hidden,
 * so the panel never appeared). Also checks the clamp/flip keeps the panel on-screen near an edge.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import ItemTooltip from '../../../src/features/inventory/ItemTooltip';
import { useSettingsStore } from '../../../src/state/settingsSlice';
import { useInventoryStore } from '../../../src/state/inventorySlice';
import { useCharacterStore } from '../../../src/state/characterSlice';

vi.mock('../../../src/state/settingsSlice', () => ({ useSettingsStore: vi.fn() }));
vi.mock('../../../src/state/inventorySlice', () => ({ useInventoryStore: vi.fn() }));
vi.mock('../../../src/state/characterSlice', () => ({ useCharacterStore: vi.fn() }));

const ITEM = { itemId: 'medpac_01', name: 'Medpac', type: 'consumable', stats: { healthRestore: 50 }, rarity: 'common', description: 'Restores health.' };

describe('ItemTooltip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.mockReturnValue(true); // tooltips enabled
    useInventoryStore.mockReturnValue({ equipItem: vi.fn(), useItem: vi.fn(), unequipItem: vi.fn() });
    useCharacterStore.mockReturnValue({ currentCharacter: { id: 'c1' } });
  });

  test('renders the detail panel for a hovered item and is never stuck hidden', () => {
    const { container } = render(<ItemTooltip item={ITEM} position={{ x: 100, y: 100 }} />);
    const panel = container.querySelector('.item-tooltip');
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveTextContent('Medpac');
    expect(panel.style.visibility).not.toBe('hidden'); // the regression: panel must not be gated invisible
  });

  test('renders nothing when tooltips are disabled in settings', () => {
    useSettingsStore.mockReturnValue(false);
    const { container } = render(<ItemTooltip item={ITEM} position={{ x: 100, y: 100 }} />);
    expect(container.querySelector('.item-tooltip')).toBeNull();
  });

  test('flips to the left of the cursor and stays on-screen near the right edge', () => {
    // jsdom has no layout engine, so stub the measured box + viewport for the clamp math.
    const wSpy = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(350);
    const hSpy = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(200);
    const origW = window.innerWidth, origH = window.innerHeight;
    window.innerWidth = 600; window.innerHeight = 800;
    try {
      const { container } = render(<ItemTooltip item={ITEM} position={{ x: 580, y: 100 }} />);
      const panel = container.querySelector('.item-tooltip');
      const left = parseFloat(panel.style.left);
      expect(left).toBeLessThan(580);                 // flipped to the left of the cursor
      expect(left).toBeGreaterThanOrEqual(12);        // respects the left margin
      expect(left + 350).toBeLessThanOrEqual(600 - 11); // right edge stays on-screen (within margin)
    } finally {
      wSpy.mockRestore(); hSpy.mockRestore();
      window.innerWidth = origW; window.innerHeight = origH;
    }
  });
});
