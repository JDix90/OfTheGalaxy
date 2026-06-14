/**
 * CharacterCreation Component Tests
 *
 * CharacterCreation is a 5-step wizard (species -> background -> attributes ->
 * appearance -> name & confirm) that calls characterStore.createCharacter at the
 * end. The step sub-components are stubbed so these tests exercise the wizard's
 * own navigation, gating, and completion rather than each step's internals.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '../../setup/testUtils';
import CharacterCreation from '../../../src/features/character-creation/CharacterCreation';
import { useCharacterStore } from '../../../src/state/characterSlice';
import { galaxyApi } from '../../../src/services/api/galaxyApi';

vi.mock('../../../src/state/characterSlice', () => ({ useCharacterStore: vi.fn() }));
vi.mock('../../../src/services/api/galaxyApi', () => ({ galaxyApi: { getPlanet: vi.fn() } }));

// Stub each step: selection steps expose a button that reports a choice via onUpdate.
vi.mock('../../../src/features/character-creation/steps/SpeciesSelection', () => ({
  default: ({ onUpdate }) => <button onClick={() => onUpdate({ species: 'human' })}>Pick Species</button>
}));
vi.mock('../../../src/features/character-creation/steps/BackgroundSelection', () => ({
  default: ({ onUpdate }) => <button onClick={() => onUpdate({ background: 'soldier' })}>Pick Background</button>
}));
vi.mock('../../../src/features/character-creation/steps/AttributeAllocation', () => ({
  default: () => <div>Attributes Step</div>
}));
vi.mock('../../../src/features/character-creation/steps/AppearanceCustomization', () => ({
  default: () => <div>Appearance Step</div>
}));
vi.mock('../../../src/features/character-creation/steps/NameAndConfirm', () => ({
  default: ({ onUpdate }) => <button onClick={() => onUpdate({ name: 'Test Character' })}>Set Name</button>
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

let createCharacter;

beforeEach(() => {
  vi.clearAllMocks();
  createCharacter = vi.fn().mockResolvedValue({ id: 'new-id', name: 'Test Character', currentPlanet: 'gravenmoor' });
  useCharacterStore.mockReturnValue({ createCharacter, isLoading: false });
  galaxyApi.getPlanet.mockResolvedValue({ success: true, data: { name: 'Gravenmoor', mapData: {} } });
});

describe('CharacterCreation', () => {
  test('starts on the species step', () => {
    renderWithProviders(<CharacterCreation />);
    expect(screen.getByRole('heading', { name: 'Choose Species' })).toBeInTheDocument();
  });

  test('disables Next until a species is chosen, then advances to background', () => {
    renderWithProviders(<CharacterCreation />);
    const next = screen.getByRole('button', { name: 'Next' });
    expect(next).toBeDisabled();

    fireEvent.click(screen.getByText('Pick Species'));
    expect(next).toBeEnabled();

    fireEvent.click(next);
    expect(screen.getByRole('heading', { name: 'Choose Background' })).toBeInTheDocument();
  });

  test('walks through all steps and submits the character', async () => {
    renderWithProviders(<CharacterCreation />);

    fireEvent.click(screen.getByText('Pick Species'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    fireEvent.click(screen.getByText('Pick Background'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    // Attributes can always proceed.
    fireEvent.click(screen.getByRole('button', { name: 'Next' })); // attributes -> confirm

    // Final step: set the name, then Create Character becomes enabled.
    fireEvent.click(screen.getByText('Set Name'));
    fireEvent.click(screen.getByRole('button', { name: /create character/i }));

    await waitFor(() => expect(createCharacter).toHaveBeenCalled());
    expect(createCharacter).toHaveBeenCalledWith(
      expect.objectContaining({ species: 'human', background: 'soldier', name: 'Test Character' })
    );
  });
});
