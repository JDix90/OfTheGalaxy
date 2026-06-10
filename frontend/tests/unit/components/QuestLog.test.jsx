/**
 * QuestLog Component Tests
 * Tests for quest log component
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '../../setup/testUtils';
import QuestLog from '../../../src/features/quests/QuestLog';

// Mock quest API
vi.mock('../../../src/services/api/questApi', () => ({
  questApi: {
    getActiveQuests: vi.fn(),
    getAvailableQuests: vi.fn(),
    startQuest: vi.fn(),
    completeQuest: vi.fn()
  }
}));

describe('QuestLog', () => {
  const mockQuests = [
    {
      id: 'quest-1',
      name: 'Test Quest 1',
      description: 'A test quest',
      status: 'active',
      objectives: [
        {
          id: 'obj1',
          type: 'interact',
          description: 'Talk to NPC',
          completed: false
        }
      ]
    },
    {
      id: 'quest-2',
      name: 'Test Quest 2',
      description: 'Another test quest',
      status: 'active',
      objectives: [
        {
          id: 'obj2',
          type: 'travel',
          description: 'Go to location',
          completed: true
        }
      ]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should render quest log', async () => {
    const { questApi } = await import('../../../src/services/api/questApi');
    questApi.getActiveQuests.mockResolvedValue({
      success: true,
      data: mockQuests
    });

    renderWithProviders(<QuestLog characterId="test-character" />);
    
    await waitFor(() => {
      expect(questApi.getActiveQuests).toHaveBeenCalled();
    });
  });

  test('should display active quests', async () => {
    const { questApi } = await import('../../../src/services/api/questApi');
    questApi.getActiveQuests.mockResolvedValue({
      success: true,
      data: mockQuests
    });

    renderWithProviders(<QuestLog characterId="test-character" />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Quest 1')).toBeInTheDocument();
      expect(screen.getByText('Test Quest 2')).toBeInTheDocument();
    });
  });

  test('should display quest objectives', async () => {
    const { questApi } = await import('../../../src/services/api/questApi');
    questApi.getActiveQuests.mockResolvedValue({
      success: true,
      data: mockQuests
    });

    renderWithProviders(<QuestLog characterId="test-character" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Talk to NPC/i)).toBeInTheDocument();
      expect(screen.getByText(/Go to location/i)).toBeInTheDocument();
    });
  });

  test('should show empty state when no quests', async () => {
    const { questApi } = await import('../../../src/services/api/questApi');
    questApi.getActiveQuests.mockResolvedValue({
      success: true,
      data: []
    });

    renderWithProviders(<QuestLog characterId="test-character" />);
    
    await waitFor(() => {
      expect(screen.getByText(/no active quests/i) || screen.getByText(/no quests/i)).toBeDefined();
    });
  });
});

