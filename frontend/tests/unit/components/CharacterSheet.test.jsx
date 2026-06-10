/**
 * CharacterSheet Component Tests
 * Tests for character sheet display and interactions
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '../../setup/testUtils';
import CharacterSheet from '../../../src/features/menus/CharacterSheet';

// Mock character store
const mockCharacter = {
  id: 'test-character-id',
  name: 'Test Character',
  level: 5,
  xp: 250,
  credits: 1000,
  currentHealth: 75,
  maxHealth: 100,
  currentStamina: 50,
  maxStamina: 100,
  stats: {
    strength: 14,
    agility: 12,
    endurance: 13,
    perception: 15,
    intelligence: 11,
    charisma: 10
  },
  skills: {
    combat: {
      basic_combat: { level: 2 }
    },
    technical: {
      engineering: { level: 3 }
    }
  }
};

describe('CharacterSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should render character sheet with overview tab', () => {
    renderWithProviders(<CharacterSheet character={mockCharacter} />);

    expect(screen.getByText(/character sheet/i) || screen.getByText(/overview/i)).toBeDefined();
  });

  test('should display character stats', () => {
    renderWithProviders(<CharacterSheet character={mockCharacter} />);

    expect(screen.getByText(/level/i)).toBeDefined();
    expect(screen.getByText(/5/i)).toBeDefined(); // Level
  });

  test('should display health and stamina', () => {
    renderWithProviders(<CharacterSheet character={mockCharacter} />);

    expect(screen.getByText(/health/i) || screen.getByText(/75/i)).toBeDefined();
    expect(screen.getByText(/stamina/i) || screen.getByText(/50/i)).toBeDefined();
  });

  test('should switch to attributes tab', async () => {
    renderWithProviders(<CharacterSheet character={mockCharacter} />);

    const attributesTab = screen.getByText(/attributes/i);
    if (attributesTab) {
      attributesTab.click();

      await waitFor(() => {
        expect(screen.getByText(/strength/i) || screen.getByText(/agility/i)).toBeDefined();
      });
    }
  });

  test('should switch to skills tab', async () => {
    renderWithProviders(<CharacterSheet character={mockCharacter} />);

    const skillsTab = screen.getByText(/skills/i);
    if (skillsTab) {
      skillsTab.click();

      await waitFor(() => {
        expect(screen.getByText(/combat/i) || screen.getByText(/technical/i)).toBeDefined();
      });
    }
  });

  test('should display attribute values', () => {
    renderWithProviders(<CharacterSheet character={mockCharacter} />);

    const attributesTab = screen.getByText(/attributes/i);
    if (attributesTab) {
      attributesTab.click();

      // Should show strength value
      expect(screen.getByText(/14/i) || screen.getByText(/strength/i)).toBeDefined();
    }
  });
});

