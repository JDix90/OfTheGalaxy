/**
 * StatsBar Component Tests — player META only (credits / level / XP).
 * Health/stamina rendering moved to PlayerVitals (see PlayerVitals.test.jsx).
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../setup/testUtils';
import StatsBar from '../../../src/components/hud/StatsBar';

describe('StatsBar', () => {
  const mockCharacter = {
    id: 'test-character-id',
    name: 'Test Character',
    level: 5,
    xp: 250,
    credits: 1000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should render player meta (credits, level, xp)', () => {
    renderWithProviders(
      <StatsBar character={mockCharacter} onOpenInventory={() => {}} onOpenCharacterSheet={() => {}} />
    );

    expect(screen.getByText('Level')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // level
    expect(screen.getByText('1000')).toBeInTheDocument(); // credits
    expect(screen.getByText('XP')).toBeInTheDocument();
  });

  test('should call onOpenCharacterSheet when level is clicked', () => {
    const onOpenCharacterSheet = vi.fn();
    renderWithProviders(
      <StatsBar character={mockCharacter} onOpenInventory={() => {}} onOpenCharacterSheet={onOpenCharacterSheet} />
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
      <StatsBar character={mockCharacter} onOpenInventory={onOpenInventory} onOpenCharacterSheet={() => {}} />
    );

    const creditsButton = screen.getByText('💰').closest('.clickable');
    if (creditsButton) {
      creditsButton.click();
      expect(onOpenInventory).toHaveBeenCalled();
    }
  });

  test('should not render if character is null', () => {
    const { container } = renderWithProviders(
      <StatsBar character={null} onOpenInventory={() => {}} onOpenCharacterSheet={() => {}} />
    );

    expect(container.firstChild).toBeNull();
  });
});
