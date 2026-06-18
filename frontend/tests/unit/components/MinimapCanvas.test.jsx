/**
 * MinimapCanvas — the world→minimap coordinate transform (pure math).
 */

import { describe, test, expect } from 'vitest';
import { worldToMinimap } from '../../../src/components/hud/MinimapCanvas';

describe('worldToMinimap', () => {
  test('world origin maps to canvas center', () => {
    expect(worldToMinimap(0, 0, 100, 200)).toEqual([100, 100]);
  });

  test('north-west corner maps to top-left (north-up)', () => {
    expect(worldToMinimap(-100, -100, 100, 200)).toEqual([0, 0]);
  });

  test('south-east corner maps to bottom-right', () => {
    expect(worldToMinimap(100, 100, 100, 200)).toEqual([200, 200]);
  });

  test('half extent maps to the three-quarter point', () => {
    expect(worldToMinimap(50, 0, 100, 200)).toEqual([150, 100]);
  });
});
