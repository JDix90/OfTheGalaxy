import { describe, test, expect } from 'vitest';
import { createSubmapSim, buildSubmapProps } from '../../src/components/submap3d/submapData';
import { getSubmapTheme } from '../../src/components/submap3d/submapThemes';

const B = (id, type, x, y, w = 2, h = 2) => ({ id, name: id, type, position: { x, y }, size: { width: w, height: h } });
const F = (id, type, x, y) => ({ id, type, position: { x, y }, size: { width: 1, height: 1 } });
const sm = (type, layout) => ({ id: `t_${type}`, type, layoutData: { width: 12, height: 12, ...layout } });

describe('buildSubmapProps — themed dressing', () => {
  test('clinics get a biobed per treatment/patient/surgery room (zone-derived, no furniture[])', () => {
    const subMap = sm('medical_center', {
      buildings: [B('t0', 'treatment_room', 1, 1), B('t1', 'treatment_room', 4, 1), B('p0', 'patient_room', 1, 8), B('s0', 'surgery_room', 8, 1), B('rec', 'reception', 1, 5, 2, 1)],
    });
    const sim = createSubmapSim(subMap);
    const { themed } = buildSubmapProps(subMap, sim, getSubmapTheme(subMap));
    expect(themed.filter((p) => p.semantic === 'biobed').length).toBe(4); // 2 treatment + 1 patient + 1 surgery
    expect(themed.some((p) => p.semantic === 'terminal')).toBe(true);      // reception desk
    themed.forEach((p) => { expect(Number.isFinite(p.wx)).toBe(true); expect(Number.isFinite(p.wz)).toBe(true); });
  });

  test('markets get a stall + produce crate per vendor stall', () => {
    const subMap = sm('market', { buildings: [B('v0', 'vendor_stall', 2, 2, 1, 1), B('v1', 'vendor_stall', 5, 2, 1, 1)] });
    const sim = createSubmapSim(subMap);
    const { themed } = buildSubmapProps(subMap, sim, getSubmapTheme(subMap));
    expect(themed.filter((p) => p.semantic === 'counterCanopy').length).toBe(2);
    expect(themed.filter((p) => p.semantic === 'crate').length).toBe(2);
  });

  test('mapped furniture becomes a themed prop; unmapped stays a box', () => {
    const subMap = sm('medical_center', { buildings: [], furniture: [F('bed', 'bed', 3, 3), F('tbl', 'table', 5, 5)] });
    const sim = createSubmapSim(subMap);
    const { themed, boxes } = buildSubmapProps(subMap, sim, getSubmapTheme(subMap));
    expect(themed.some((p) => p.semantic === 'biobed')).toBe(true); // bed → biobed
    expect(boxes.some((b) => b.type === 'table')).toBe(true);        // table → box fallback
    expect(themed.some((p) => p.semantic === 'table')).toBe(false);
  });

  test('industrial scatters pipes/barrels on walkable edge cells', () => {
    const subMap = sm('industrial', { buildings: [B('g', 'facility', 5, 5, 2, 2)] });
    const sim = createSubmapSim(subMap);
    const { themed } = buildSubmapProps(subMap, sim, getSubmapTheme(subMap));
    const scat = themed.filter((p) => p.semantic === 'pipe' || p.semantic === 'barrel');
    expect(scat.length).toBeGreaterThan(0);
  });

  test('a home keeps plain box furniture (residential maps almost nothing)', () => {
    const subMap = { id: 'home', type: 'building_interior', layoutData: { width: 10, height: 10, buildings: [], furniture: [F('bed', 'bed', 2, 2), F('shelf', 'shelf', 7, 2)] } };
    const sim = createSubmapSim(subMap);
    const { themed, boxes } = buildSubmapProps(subMap, sim, getSubmapTheme(subMap));
    expect(boxes.length).toBe(2);          // bed + shelf stay boxes
    expect(themed.length).toBe(0);
  });

  test('no sim → empty', () => {
    expect(buildSubmapProps(sm('market', {}), null, getSubmapTheme({ type: 'market' }))).toEqual({ themed: [], boxes: [] });
  });
});
