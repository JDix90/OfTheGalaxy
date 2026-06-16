/**
 * Phase 7 — the frontend COMBAT_3D_ONLY flag that gates the legacy turn-based fallback.
 * Default ON (3D-only); VITE_COMBAT_3D_ONLY=false restores the fallback (reversible escape hatch).
 */
import { describe, test, expect, vi, afterEach } from 'vitest';
import { isCombat3DOnly, COMBAT_OFFLINE_MESSAGE } from '../../../src/config/combat';

describe('isCombat3DOnly (Phase 7 retire-turn-based flag)', () => {
  afterEach(() => vi.unstubAllEnvs());

  test('defaults to true (3D-only ON) when the env var is unset', () => {
    expect(isCombat3DOnly()).toBe(true);
  });

  test('VITE_COMBAT_3D_ONLY="false" restores the turn-based fallback', () => {
    vi.stubEnv('VITE_COMBAT_3D_ONLY', 'false');
    expect(isCombat3DOnly()).toBe(false);
  });

  test('any other value keeps 3D-only ON', () => {
    vi.stubEnv('VITE_COMBAT_3D_ONLY', 'true');
    expect(isCombat3DOnly()).toBe(true);
  });

  test('exposes a user-facing offline message', () => {
    expect(typeof COMBAT_OFFLINE_MESSAGE).toBe('string');
    expect(COMBAT_OFFLINE_MESSAGE.length).toBeGreaterThan(0);
  });
});
