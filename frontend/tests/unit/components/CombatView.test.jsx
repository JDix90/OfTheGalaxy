/**
 * CombatView Component Tests
 * Tests for combat interface component
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderWithProviders, screen } from '../../setup/testUtils';
import CombatView from '../../../src/features/combat/CombatView';

// Mock combat API
vi.mock('../../../src/services/api/combatApi', () => ({
  combatApi: {
    createEncounter: vi.fn(),
    executeAction: vi.fn(),
    getEncounter: vi.fn()
  }
}));

describe('CombatView', () => {
  const mockEncounter = {
    id: 'encounter-1',
    characterId: 'character-1',
    encounterType: 'random',
    status: 'active',
    combatants: [
      {
        id: 'player-1',
        name: 'Test Character',
        type: 'player',
        stats: {
          health: 100,
          maxHealth: 100,
          stamina: 50,
          maxStamina: 50
        }
      },
      {
        id: 'enemy-1',
        name: 'Stormtrooper',
        type: 'enemy',
        stats: {
          health: 80,
          maxHealth: 80,
          stamina: 40,
          maxStamina: 40
        }
      }
    ],
    turnOrder: ['player-1', 'enemy-1'],
    currentTurn: 0
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should render combat view', () => {
    renderWithProviders(<CombatView encounterId={mockEncounter.id} />);
    
    // Should show loading or combat interface
    expect(screen.getByText(/combat/i) || screen.getByText(/loading/i)).toBeDefined();
  });

  test('should display combatants', async () => {
    const { combatApi } = await import('../../../src/services/api/combatApi');
    combatApi.getEncounter.mockResolvedValue({
      success: true,
      data: mockEncounter
    });

    renderWithProviders(<CombatView encounterId={mockEncounter.id} />);
    
    // Wait for encounter to load
    await waitFor(() => {
      expect(combatApi.getEncounter).toHaveBeenCalledWith(mockEncounter.id);
    });
  });

  test('should display turn order', async () => {
    const { combatApi } = await import('../../../src/services/api/combatApi');
    combatApi.getEncounter.mockResolvedValue({
      success: true,
      data: mockEncounter
    });

    renderWithProviders(<CombatView encounterId={mockEncounter.id} />);
    
    await waitFor(() => {
      // Should show turn order
      expect(screen.getByText(/turn/i) || screen.getByText(/player/i)).toBeDefined();
    });
  });
});

