/**
 * CombatView Component Tests
 *
 * CombatView reads the active encounter from the combat store (not props/API)
 * and orchestrates child components (TurnOrder, CombatantDisplay, ...). These
 * tests mock the stores and stub the heavy children to verify CombatView's
 * state handling and that it wires the encounter data through.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../setup/testUtils';
import CombatView from '../../../src/features/combat/CombatView';
import { useCombatStore } from '../../../src/state/combatSlice';
import { useCharacterStore } from '../../../src/state/characterSlice';

vi.mock('../../../src/state/combatSlice', () => ({ useCombatStore: vi.fn() }));
vi.mock('../../../src/state/characterSlice', () => ({ useCharacterStore: vi.fn() }));
vi.mock('../../../src/features/combat/CombatantDisplay', () => ({ default: ({ combatant }) => <div>{combatant?.name}</div> }));
vi.mock('../../../src/features/combat/TurnOrder', () => ({ default: () => <div>Turn Order</div> }));
vi.mock('../../../src/features/combat/ActionMenu', () => ({ default: () => <div>Action Menu</div> }));
vi.mock('../../../src/features/combat/CombatLog', () => ({ default: () => <div>Combat Log</div> }));
vi.mock('../../../src/features/combat/VictoryScreen', () => ({ default: () => <div>Victory</div> }));
vi.mock('../../../src/features/menus/PauseMenu', () => ({ default: () => null }));
// TutorialOverlay needs TutorialProvider + API; not under test here.
vi.mock('../../../src/components/tutorial/TutorialOverlay', () => ({ default: () => null }));

const mockEncounter = {
  id: 'encounter-1',
  characterId: 'character-1',
  encounterType: 'random',
  status: 'active',
  combatants: [
    { id: 'player-1', name: 'Test Character', type: 'player', stats: { health: 100, maxHealth: 100, stamina: 50, maxStamina: 50 } },
    { id: 'enemy-1', name: 'Stormtrooper', type: 'enemy', stats: { health: 80, maxHealth: 80, stamina: 40, maxStamina: 40 } }
  ],
  turnOrder: ['player-1', 'enemy-1'],
  currentTurn: 0
};

function setStores({ encounter = mockEncounter, isLoading = false, error = null } = {}) {
  useCharacterStore.mockReturnValue({ currentCharacter: { id: 'character-1', name: 'Test Character' } });
  useCombatStore.mockReturnValue({
    currentEncounter: encounter,
    isLoading,
    error,
    actionHistory: [],
    startEncounter: vi.fn().mockResolvedValue(undefined),
    getEncounter: vi.fn().mockResolvedValue(undefined),
    executeAction: vi.fn().mockResolvedValue(undefined),
    clearEncounter: vi.fn(),
    processTurn: vi.fn().mockResolvedValue(undefined)
  });
}

describe('CombatView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setStores();
  });

  test('renders the combat interface for an active encounter', () => {
    renderWithProviders(<CombatView />);
    expect(screen.getByRole('heading', { name: 'Combat' })).toBeInTheDocument();
    expect(screen.getByText('Exit Combat')).toBeInTheDocument();
  });

  test('displays the combatants from the encounter', () => {
    renderWithProviders(<CombatView />);
    expect(screen.getByText('Test Character')).toBeInTheDocument();
    expect(screen.getByText('Stormtrooper')).toBeInTheDocument();
  });

  test('renders the turn order', () => {
    renderWithProviders(<CombatView />);
    expect(screen.getByText('Turn Order')).toBeInTheDocument();
  });

  test('shows a no-encounter message when there is no active encounter', () => {
    setStores({ encounter: null });
    renderWithProviders(<CombatView />);
    expect(screen.getByText(/no active combat encounter/i)).toBeInTheDocument();
  });

  test('shows a loading state while the encounter loads', () => {
    setStores({ encounter: null, isLoading: true });
    renderWithProviders(<CombatView />);
    expect(screen.getByText(/loading combat/i)).toBeInTheDocument();
  });
});
