import { describe, test, expect } from 'vitest';
import { createSubmapSim, buildSubmapProps, buildSubmapSignage } from '../../src/components/submap3d/submapData';
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

describe('buildSubmapSignage — diegetic zone signs', () => {
  const Z = (id, name, x, y, width, height) => ({ id, name, bounds: { x, y, width, height } });

  test('one world-positioned sign per named zone, deduped, whole-floor zones skipped', () => {
    const subMap = sm('medical_center', {
      zones: [
        Z('a', 'Reception', 0, 5, 4, 3),
        Z('b', 'Treatment Wing', 0, 0, 7, 4),
        Z('b2', 'Treatment Wing', 8, 0, 4, 4),  // duplicate name → deduped
        Z('c', 'Whole Floor', 0, 0, 12, 12),     // 100% area → skipped
        { id: 'd', bounds: { x: 1, y: 1, width: 2, height: 2 } }, // no name → skipped
      ],
    });
    const sim = createSubmapSim(subMap);
    const signs = buildSubmapSignage(subMap, sim, getSubmapTheme(subMap));
    expect(signs.map((s) => s.label).sort()).toEqual(['Reception', 'Treatment Wing']);
    signs.forEach((s) => { expect(Number.isFinite(s.wx)).toBe(true); expect(Number.isFinite(s.wz)).toBe(true); });
  });

  test('caps at 12 signs', () => {
    const zones = [];
    for (let i = 0; i < 20; i++) zones.push(Z(`z${i}`, `Zone ${i}`, (i % 10), Math.floor(i / 10), 1, 1));
    const subMap = sm('city', { zones });
    const sim = createSubmapSim(subMap);
    expect(buildSubmapSignage(subMap, sim, getSubmapTheme(subMap)).length).toBe(12);
  });

  test('no zones → no signs', () => {
    const subMap = sm('market', { buildings: [] });
    const sim = createSubmapSim(subMap);
    expect(buildSubmapSignage(subMap, sim, getSubmapTheme(subMap))).toEqual([]);
  });
});
