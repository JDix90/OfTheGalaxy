/**
 * CombatToasts — reward re-syncs the character.
 *
 * Real-time combat lives in the net layer and never touches the character store, so a kill's XP /
 * credits / level (granted + persisted server-side) never reached the HUD's StatsBar — it stayed
 * stale until a full reload. CombatToasts now refetches the character when a reward toast drains.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import CombatToasts from '../../../src/components/hud/CombatToasts';
import { useCharacterStore } from '../../../src/state/characterSlice';

vi.mock('../../../src/state/characterSlice', () => ({ useCharacterStore: { getState: vi.fn() } }));

// A fake net world whose drainToasts yields the given toasts once, then nothing.
const worldWithToasts = (toasts) => {
  let given = false;
  return { current: { drainToasts: () => { if (given) return []; given = true; return toasts; } } };
};

describe('CombatToasts reward → character refresh', () => {
  let loadCharacter;
  beforeEach(() => {
    vi.useFakeTimers();
    loadCharacter = vi.fn().mockResolvedValue({});
    useCharacterStore.getState.mockReturnValue({ currentCharacter: { id: 'c1' }, loadCharacter });
  });
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  test('a reward toast refetches the current character', () => {
    const world = worldWithToasts([{ id: 1, at: Date.now(), kind: 'reward', xp: 25, credits: 10 }]);
    render(<CombatToasts world={world} />);
    act(() => { vi.advanceTimersByTime(250); });
    expect(loadCharacter).toHaveBeenCalledWith('c1');
  });

  test('a death toast does NOT refetch the character', () => {
    const world = worldWithToasts([{ id: 2, at: Date.now(), kind: 'death', fee: 50 }]);
    render(<CombatToasts world={world} />);
    act(() => { vi.advanceTimersByTime(250); });
    expect(loadCharacter).not.toHaveBeenCalled();
  });

  test('a reward already seen is not refetched twice', () => {
    const world = worldWithToasts([{ id: 3, at: Date.now(), kind: 'reward', xp: 5 }]);
    render(<CombatToasts world={world} />);
    act(() => { vi.advanceTimersByTime(250); }); // first drain → refetch
    act(() => { vi.advanceTimersByTime(250); }); // second tick drains nothing
    expect(loadCharacter).toHaveBeenCalledTimes(1);
  });
});
