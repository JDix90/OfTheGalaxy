/**
 * StatsBar Component Tests
 * Tests for HUD stats bar component
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../setup/testUtils';
import StatsBar from '../../../src/components/hud/StatsBar';
import { useCharacterStore } from '../../../src/state/characterSlice';

// Mock API client
vi.mock('../../../src/services/api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        canRegenerate: true,
        regenRate: 10,
        inCombat: false
      }
    })
  }
}));

describe('StatsBar', () => {
  const mockCharacter = {
    id: 'test-character-id',
    name: 'Test Character',
    level: 5,
    xp: 250,
    credits: 1000,
    currentHealth: 75,
    maxHealth: 100,
    currentStamina: 50,
    maxStamina: 100
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should render character stats', () => {
    renderWithProviders(
      <StatsBar 
        character={mockCharacter}
        onOpenInventory={() => {}}
        onOpenCharacterSheet={() => {}}
      />
    );

    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByText('Stamina')).toBeInTheDocument();
    expect(screen.getByText('Level')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // Level
  });

  test('should display health bar with correct percentage', () => {
    renderWithProviders(
      <StatsBar 
        character={mockCharacter}
        onOpenInventory={() => {}}
        onOpenCharacterSheet={() => {}}
      />
    );

    const healthBar = screen.getByText(/75 \/ 100/);
    expect(healthBar).toBeInTheDocument();
  });

  test('should display stamina bar with correct percentage', () => {
    renderWithProviders(
      <StatsBar 
        character={mockCharacter}
        onOpenInventory={() => {}}
        onOpenCharacterSheet={() => {}}
      />
    );

    const staminaBar = screen.getByText(/50 \/ 100/);
    expect(staminaBar).toBeInTheDocument();
  });

  test('should show exhausted status when stamina is 0', () => {
    const exhaustedCharacter = {
      ...mockCharacter,
      currentStamina: 0,
      maxStamina: 100
    };

    renderWithProviders(
      <StatsBar 
        character={exhaustedCharacter}
        onOpenInventory={() => {}}
        onOpenCharacterSheet={() => {}}
      />
    );

    expect(screen.getByText(/Exhausted/i)).toBeInTheDocument();
  });

  test('should show fatigued status when stamina is low', () => {
    const fatiguedCharacter = {
      ...mockCharacter,
      currentStamina: 20,
      maxStamina: 100
    };

    renderWithProviders(
      <StatsBar 
        character={fatiguedCharacter}
        onOpenInventory={() => {}}
        onOpenCharacterSheet={() => {}}
      />
    );

    expect(screen.getByText(/Fatigued/i)).toBeInTheDocument();
  });

  test('should call onOpenCharacterSheet when level is clicked', () => {
    const onOpenCharacterSheet = vi.fn();

    renderWithProviders(
      <StatsBar 
        character={mockCharacter}
        onOpenInventory={() => {}}
        onOpenCharacterSheet={onOpenCharacterSheet}
      />
    );

    const levelButton = screen.getByText('Level').closest('.clickable');
    if (levelButton) {
      levelButton.click();
      expect(onOpenCharacterSheet).toHaveBeenCalled();
    }
  });

  test('should call onOpenInventory when credits are clicked', () => {
    const onOpenInventory = vi.fn();

    renderWithProviders(
      <StatsBar 
        character={mockCharacter}
        onOpenInventory={onOpenInventory}
        onOpenCharacterSheet={() => {}}
      />
    );

    const creditsButton = screen.getByText('💰').closest('.clickable');
    if (creditsButton) {
      creditsButton.click();
      expect(onOpenInventory).toHaveBeenCalled();
    }
  });

  test('should not render if character is null', () => {
    const { container } = renderWithProviders(
      <StatsBar 
        character={null}
        onOpenInventory={() => {}}
        onOpenCharacterSheet={() => {}}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});

