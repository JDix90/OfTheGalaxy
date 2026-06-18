import { describe, test, expect } from 'vitest';
import { getSubmapTheme, resolveThemeKey, SUBMAP_THEMES } from '../../src/components/submap3d/submapThemes';

const key = (type, parentLocationType) => resolveThemeKey({ type, parentLocationType });

describe('submap theme resolution', () => {
  test('clinics get their own surgical theme (not the generic civic category)', () => {
    expect(key('medical_center')).toBe('clinic');
    expect(key('hospital')).toBe('clinic');
  });

  test('direct submap-type overrides', () => {
    expect(key('spaceport')).toBe('spaceport');
    expect(key('market')).toBe('market');
    expect(key('city')).toBe('settlement');
    expect(key('settlement')).toBe('settlement');
    expect(key('government')).toBe('civic');
    expect(key('temple')).toBe('civic');
    expect(key('dungeon')).toBe('danger');
  });

  test('falls back to the POI category of the type', () => {
    expect(key('mine')).toBe('industrial');      // getPoiCategory(mine) = industrial
    expect(key('factory')).toBe('industrial');
    expect(key('ruins')).toBe('danger');
    expect(key('cantina')).toBe('market');         // getPoiCategory(cantina) = market
  });

  test('building interiors are cozy residential by default', () => {
    expect(key('building_interior')).toBe('residential');
    expect(key('building_interior', 'home')).toBe('residential');
  });

  test('building interiors borrow an industrial/danger mood from their parent POI', () => {
    expect(key('building_interior', 'mine')).toBe('industrial');
    expect(key('building_interior', 'ruins')).toBe('danger');
  });

  test('unknown type falls back to the parent POI category, then default', () => {
    expect(key('whatever', 'market')).toBe('market'); // parent tiebreak
    expect(key('whatever', 'mystery')).toBe('default');
    expect(key('')).toBe('default');
    expect(key(undefined)).toBe('default');
  });

  test('getSubmapTheme returns a full theme (palette + lighting with a mode)', () => {
    const clinic = getSubmapTheme({ type: 'medical_center' });
    expect(clinic.key).toBe('clinic');
    expect(clinic.lighting.mode).toBe('enclosed');
    expect(clinic.palette.floor).toMatch(/^#/);
    const market = getSubmapTheme({ type: 'market' });
    expect(market.lighting.mode).toBe('open');
  });

  test('every theme entry is well-formed (palette keys + a lighting mode)', () => {
    for (const [k, t] of Object.entries(SUBMAP_THEMES)) {
      expect(t.key).toBe(k);
      for (const p of ['floor', 'wall', 'accent', 'emissive', 'trim']) expect(t.palette[p]).toMatch(/^#/);
      expect(['enclosed', 'open']).toContain(t.lighting.mode);
    }
  });
});
