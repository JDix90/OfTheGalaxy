/**
 * CharacterSheet Component Tests
 *
 * CharacterSheet reads currentCharacter from the character store (it does not
 * take a character prop). The overview tab shows attributes, skills, stamina and
 * resources; the Attributes/Skills tabs mount sub-components (stubbed here).
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '../../setup/testUtils';
import CharacterSheet from '../../../src/features/menus/CharacterSheet';
import { useCharacterStore } from '../../../src/state/characterSlice';

vi.mock('../../../src/state/characterSlice', () => ({ useCharacterStore: vi.fn() }));
vi.mock('../../../src/features/character/AttributeAllocationView', () => ({ default: () => <div>Attribute Allocation</div> }));
vi.mock('../../../src/features/character/SkillTreeView', () => ({ default: () => <div>Skill Tree</div> }));
vi.mock('../../../src/features/abilities/AbilitiesPanel', () => ({ default: () => <div>Abilities Panel</div> }));

const mockCharacter = {
  id: 'test-character-id',
  name: 'Test Character',
  level: 5,
  xp: 250,
  credits: 1000,
  species: 'human',
  background: 'soldier',
  currentHealth: 75,
  maxHealth: 100,
  currentStamina: 50,
  maxStamina: 100,
  attributePoints: 0,
  skillPoints: 0,
  stats: { strength: 14, agility: 12, endurance: 13, perception: 15, intelligence: 11, charisma: 10 },
  skills: { combat: { basic_combat: { level: 2 } }, technical: { engineering: { level: 3 } } },
  abilities: []
};

describe('CharacterSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCharacterStore.mockReturnValue({ currentCharacter: mockCharacter });
  });

  test('renders the character header with name and level', () => {
    renderWithProviders(<CharacterSheet />);
    expect(screen.getByRole('heading', { name: 'Test Character' })).toBeInTheDocument();
    expect(screen.getByText(/Level 5/)).toBeInTheDocument();
  });

  test('displays attribute names and values in the overview', () => {
    renderWithProviders(<CharacterSheet />);
    expect(screen.getByText('Strength')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
  });

  test('displays stamina and resources', () => {
    renderWithProviders(<CharacterSheet />);
    expect(screen.getByText('Current Stamina')).toBeInTheDocument();
    expect(screen.getByText('50 / 100')).toBeInTheDocument();
    expect(screen.getByText('Credits:')).toBeInTheDocument();
  });

  test('switches to the Attributes tab', () => {
    renderWithProviders(<CharacterSheet />);
    fireEvent.click(screen.getByRole('button', { name: /attributes/i }));
    expect(screen.getByText('Attribute Allocation')).toBeInTheDocument();
  });

  test('switches to the Skills tab', () => {
    renderWithProviders(<CharacterSheet />);
    fireEvent.click(screen.getByRole('button', { name: /^skills/i }));
    expect(screen.getByText('Skill Tree')).toBeInTheDocument();
  });

  test('shows "No character selected" when there is no character', () => {
    useCharacterStore.mockReturnValue({ currentCharacter: null });
    renderWithProviders(<CharacterSheet />);
    expect(screen.getByText(/no character selected/i)).toBeInTheDocument();
  });
});
