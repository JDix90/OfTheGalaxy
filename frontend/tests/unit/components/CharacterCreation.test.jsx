/**
 * Character Creation Component Tests
 * Tests for character creation flow
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '../../setup/testUtils';
import CharacterCreation from '../../../src/features/character-creation/CharacterCreation';
import { characterApi } from '../../../src/services/api/characterApi';

// Mock API
vi.mock('../../../src/services/api/characterApi', () => ({
  characterApi: {
    createCharacter: vi.fn()
  }
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('CharacterCreation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  test('should render character creation form', () => {
    renderWithProviders(<CharacterCreation />);
    
    expect(screen.getByText(/create character/i)).toBeInTheDocument();
  });

  test('should validate character name length', async () => {
    renderWithProviders(<CharacterCreation />);
    
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'A' } });
    fireEvent.blur(nameInput);
    
    await waitFor(() => {
      expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
    });
  });

  test('should allow valid character name', async () => {
    renderWithProviders(<CharacterCreation />);
    
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'Valid Name' } });
    fireEvent.blur(nameInput);
    
    await waitFor(() => {
      const errorMessage = screen.queryByText(/name must be at least 2 characters/i);
      expect(errorMessage).not.toBeInTheDocument();
    });
  });

  test('should proceed to next step when name is valid', async () => {
    renderWithProviders(<CharacterCreation />);
    
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Character' } });
    
    const nextButton = screen.getByText(/next/i);
    fireEvent.click(nextButton);
    
    // Should move to species selection
    await waitFor(() => {
      expect(screen.getByText(/select species/i)).toBeInTheDocument();
    });
  });

  test('should allow species selection', async () => {
    renderWithProviders(<CharacterCreation />);
    
    // Enter name and proceed
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Character' } });
    fireEvent.click(screen.getByText(/next/i));
    
    // Select species
    await waitFor(() => {
      const humanButton = screen.getByText(/human/i);
      fireEvent.click(humanButton);
    });
    
    // Should proceed to background selection
    await waitFor(() => {
      expect(screen.getByText(/select background/i)).toBeInTheDocument();
    });
  });

  test('should submit character creation', async () => {
    const mockCreateCharacter = vi.fn().mockResolvedValue({
      success: true,
      data: { 
        id: 'test-id', 
        name: 'Test Character',
        species: 'human',
        background: 'soldier'
      }
    });
    characterApi.createCharacter = mockCreateCharacter;

    renderWithProviders(<CharacterCreation />);
    
    // Fill form
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Character' } });
    fireEvent.click(screen.getByText(/next/i));
    
    // Select species
    await waitFor(() => {
      fireEvent.click(screen.getByText(/human/i));
    });
    
    // Select background
    await waitFor(() => {
      fireEvent.click(screen.getByText(/soldier/i));
    });
    
    // Allocate attributes (skip for now, just proceed)
    await waitFor(() => {
      const createButton = screen.getByText(/create character/i);
      if (createButton) {
        fireEvent.click(createButton);
      }
    });
    
    // Should call API
    await waitFor(() => {
      expect(mockCreateCharacter).toHaveBeenCalled();
    });
  });
});

