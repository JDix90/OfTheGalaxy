/**
 * QuestLog Component Tests
 *
 * QuestLog reads `currentCharacter` from the character store and quests from the
 * quest store (shape: [{ quest, progress }]); it renders quest.title and shows
 * objectives in the details panel only after a quest is selected. These tests
 * drive the component through its stores rather than the API layer.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '../../setup/testUtils';
import QuestLog from '../../../src/features/quests/QuestLog';
import { useCharacterStore } from '../../../src/state/characterSlice';
import { useQuestStore } from '../../../src/state/questSlice';

vi.mock('../../../src/state/characterSlice', () => ({ useCharacterStore: vi.fn() }));
vi.mock('../../../src/state/questSlice', () => ({ useQuestStore: vi.fn() }));

const activeQuests = [
  {
    quest: {
      id: 'quest-1',
      title: 'Test Quest 1',
      shortDescription: 'A test quest',
      description: 'A test quest',
      objectives: [{ id: 'obj1', description: 'Talk to NPC' }]
    },
    progress: { objectivesCompleted: {}, objectiveProgress: {} }
  },
  {
    quest: {
      id: 'quest-2',
      title: 'Test Quest 2',
      shortDescription: 'Another test quest',
      description: 'Another test quest',
      objectives: [{ id: 'obj2', description: 'Go to location' }]
    },
    progress: { objectivesCompleted: { obj2: true }, objectiveProgress: {} }
  }
];

function setStores({ currentCharacter = { id: 'test-character' }, quests = activeQuests, completed = [], isLoading = false } = {}) {
  useCharacterStore.mockReturnValue({ currentCharacter });
  useQuestStore.mockReturnValue({
    activeQuests: quests,
    completedQuests: completed,
    loadActiveQuests: vi.fn().mockResolvedValue(undefined),
    loadCompletedQuests: vi.fn().mockResolvedValue(undefined),
    abandonQuest: vi.fn().mockResolvedValue(undefined),
    isLoading,
    error: null
  });
}

describe('QuestLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setStores();
  });

  test('renders the quest log header with active tab count', () => {
    renderWithProviders(<QuestLog />);
    expect(screen.getByText('Quest Log')).toBeInTheDocument();
    expect(screen.getByText(/Active \(2\)/)).toBeInTheDocument();
  });

  test('displays active quests by title', () => {
    renderWithProviders(<QuestLog />);
    expect(screen.getByText('Test Quest 1')).toBeInTheDocument();
    expect(screen.getByText('Test Quest 2')).toBeInTheDocument();
  });

  test('shows quest objectives after a quest is selected', () => {
    renderWithProviders(<QuestLog />);
    fireEvent.click(screen.getByText('Test Quest 1'));
    expect(screen.getByText(/Talk to NPC/i)).toBeInTheDocument();
  });

  test('shows an empty state when there are no active quests', () => {
    setStores({ quests: [] });
    renderWithProviders(<QuestLog />);
    expect(screen.getByText(/no active quests/i)).toBeInTheDocument();
  });

  test('prompts to select a character when none is set', () => {
    setStores({ currentCharacter: null });
    renderWithProviders(<QuestLog />);
    expect(screen.getByText(/select a character/i)).toBeInTheDocument();
  });
});
