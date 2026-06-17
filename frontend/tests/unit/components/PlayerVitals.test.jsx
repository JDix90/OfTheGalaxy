/**
 * PlayerVitals tests — the unified vitals readout. Covers the live-vs-store HP
 * source (the bug being fixed) and the stamina-status assertions relocated from
 * StatsBar.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, screen } from '../../setup/testUtils';
import PlayerVitals from '../../../src/components/hud/PlayerVitals';
import { useCharacterStore } from '../../../src/state/characterSlice';

const base = {
  id: 'c1', name: 'Test', level: 5,
  currentHealth: 75, maxHealth: 100,
  currentStamina: 50, maxStamina: 100,
};
const setChar = (extra = {}) => useCharacterStore.setState({ currentCharacter: { ...base, ...extra } });

describe('PlayerVitals', () => {
  beforeEach(() => setChar());
  afterEach(() => useCharacterStore.setState({ currentCharacter: null }));

  test('shows store HP and stamina when there is no live combat snapshot', () => {
    renderWithProviders(<PlayerVitals combat={null} />);
    expect(screen.getByText(/75 \/ 100/)).toBeInTheDocument();
    expect(screen.getByText(/50 \/ 100/)).toBeInTheDocument();
  });

  test('prefers the live world HP over the store, stamina still from store', () => {
    renderWithProviders(<PlayerVitals combat={{ hp: 30, maxHp: 140, dead: false }} />);
    expect(screen.getByText(/30 \/ 140/)).toBeInTheDocument(); // world HP wins (the desync fix)
    expect(screen.getByText(/50 \/ 100/)).toBeInTheDocument(); // stamina is never streamed
  });

  test('shows fatigued status when stamina is low', () => {
    setChar({ currentStamina: 20 });
    renderWithProviders(<PlayerVitals combat={null} />);
    expect(screen.getByText(/Fatigued/i)).toBeInTheDocument();
  });

  test('shows exhausted status at 0 stamina', () => {
    setChar({ currentStamina: 0 });
    renderWithProviders(<PlayerVitals combat={null} />);
    expect(screen.getAllByText(/Exhausted/i).length).toBeGreaterThan(0);
  });

  test('renders nothing without a character', () => {
    useCharacterStore.setState({ currentCharacter: null });
    const { container } = renderWithProviders(<PlayerVitals combat={null} />);
    expect(container.firstChild).toBeNull();
  });
});
