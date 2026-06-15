/**
 * shared/sim/submap.mjs — runtime-neutral submap → sim adapter (Phase 5).
 *
 * Turns a submap's `layoutData` into `createSurfaceSim`-compatible mapData so BOTH the
 * client (prediction / single-player) and the authoritative server build the SAME
 * collision — essential for real-time dungeons where client prediction must track server
 * authority. Pure data; no three.js, no Node, no DOM.
 *
 * Submap collision sources:
 *   - dungeon `grid[y][x]`: 0=wall, 1=corridor, 2=room, 3=entrance, 4=boss (≥1 walkable)
 *   - city/spaceport `collisionMap.cells[y][x]`: 0=walk, 1=wall, 2=door(walk), 3=locked, 4=restricted
 *   - open (neither): all walkable in bounds
 * Non-square dungeon grids are padded to NxN (the pad is wall) so the square 0–100 sim fits.
 */

export const SUBMAP_SCALES = { dungeon: 1.2, collision: 0.85, open: 0.8 };

export function submapLayout(subMap) {
  return (subMap && (subMap.layoutData || subMap.layout)) || {};
}

export function submapDims(subMap) {
  const d = submapLayout(subMap);
  return { w: d.width || (d.size && d.size.width) || 12, h: d.height || (d.size && d.size.height) || 12 };
}

/**
 * Dimensions to use for grid→percent coordinate conversion so positions land on the SAME
 * cells the sim collides against. Dungeon grids are square-padded to N=max(w,h) in
 * submapToMapData, so their coords must convert with N (not the original w/h). City /
 * collision / open submaps map the original dims onto the full 0–100 space.
 */
export function submapCoordDims(subMap) {
  const d = submapLayout(subMap);
  if (Array.isArray(d.grid) && d.grid.length && Array.isArray(d.grid[0])) {
    const N = Math.max(d.grid[0].length, d.grid.length);
    return { w: N, h: N };
  }
  return submapDims(subMap);
}

/** @returns {{ mapData: object, scale: number, kind: 'dungeon'|'collision'|'open' }} */
export function submapToMapData(subMap) {
  const d = submapLayout(subMap);

  // Dungeon grid (square-padded; out-of-grid = wall).
  if (Array.isArray(d.grid) && d.grid.length && Array.isArray(d.grid[0])) {
    const h = d.grid.length;
    const w = d.grid[0].length;
    const N = Math.max(w, h);
    const tiles = [];
    for (let y = 0; y < N; y++) {
      const row = [];
      for (let x = 0; x < N; x++) {
        const c = (y < h && x < w) ? d.grid[y][x] : 0;
        row.push({ walkable: c !== 0, type: c === 0 ? 'building' : 'floor' });
      }
      tiles.push(row);
    }
    return { mapData: { tileMap: { gridSize: N, tileSize: 100 / N, tiles } }, scale: SUBMAP_SCALES.dungeon, kind: 'dungeon' };
  }

  // City / spaceport collision map.
  const cm = d.collisionMap;
  if (cm && Array.isArray(cm.cells) && cm.cells.length) {
    const res = cm.resolution || cm.cells.length;
    const tiles = cm.cells.map((row) => row.map((c) => ({
      walkable: c === 0 || c === 2,
      type: c === 1 ? 'building' : 'floor',
    })));
    return { mapData: { tileMap: { gridSize: res, tileSize: 100 / res, tiles } }, scale: SUBMAP_SCALES.collision, kind: 'collision' };
  }

  // Open submap (all walkable).
  return { mapData: {}, scale: SUBMAP_SCALES.open, kind: 'open' };
}

/** Build a sim for a submap given a createSurfaceSim implementation (client or server). */
export function createSubmapSimWith(subMap, createSurfaceSim) {
  const { mapData, scale } = submapToMapData(subMap);
  return createSurfaceSim(mapData, { scale });
}

/** Convert a submap grid/percent coordinate pair → 0–100 percent (grid → cell-center). */
export function submapToPct(x, y, w, h) {
  const px = x > w ? (x > 100 ? x / 10 : x) : ((x + 0.5) / w) * 100;
  const py = y > h ? (y > 100 ? y / 10 : y) : ((y + 0.5) / h) * 100;
  return { x: px, y: py };
}
