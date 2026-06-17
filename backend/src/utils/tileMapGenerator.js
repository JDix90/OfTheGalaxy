/**
 * Tile Map Generator
 * Creates tile-based maps for planets (like Pokemon/Zelda style)
 * Each tile is either walkable or an obstacle
 */

// ---- deterministic helpers for the medina (urban) generator ----
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash2(x, y, seed) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2246822519)) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return h >>> 0;
}
// Building "use" mix for an urban block — weighted toward residences + shops, the bulk of a city,
// with fewer bars/restaurants/civic. Deterministic from the block hash.
function pickBuildingCategory(hh) {
  const r = ((hh & 0xffff) / 0xffff) * 100;
  if (r < 32) return 'apartment';   // residential towers — the bulk + the skyline
  if (r < 52) return 'shop';        // storefronts lining the alleys
  if (r < 66) return 'warehouse';   // squat industrial/storage
  if (r < 76) return 'market';      // open market halls (near the souks)
  if (r < 85) return 'restaurant';
  if (r < 93) return 'bar';
  return 'civic';                   // halls/offices
}
// Height (storeys) by use: apartments rise into towers, civic mid-rise, commercial low.
function buildingHeightFor(category, hh) {
  const r = ((hh >>> 8) & 0xff) / 255;
  switch (category) {
    case 'apartment': return 3 + Math.round(r * 2); // 3–5
    case 'civic': return 2 + Math.round(r * 2);     // 2–4
    case 'warehouse': return 1 + Math.round(r);     // 1–2
    default: return 1 + (r < 0.4 ? 0 : 1);          // shop/market/bar/restaurant 1–2
  }
}
// Carve a straight (L-shaped) walkable corridor between two tiles — used to rescue marooned pockets.
function carveLine(tiles, gridSize, x0, y0, x1, y1) {
  const set = (x, y) => { if (x >= 0 && y >= 0 && x < gridSize && y < gridSize && !tiles[y][x].walkable) tiles[y][x] = { type: 'street', walkable: true, visual: 'street' }; };
  let x = x0, y = y0;
  while (x !== x1) { set(x, y); x += x1 > x ? 1 : -1; }
  while (y !== y1) { set(x, y); y += y1 > y ? 1 : -1; }
  set(x1, y1);
}
// Flood the walkable network from a central seed; carve straight stubs so every `mustReach`
// tile is connected. Guarantees POI pockets aren't sealed off inside the building mass.
function connectWalkable(tiles, gridSize, mustReach) {
  const inB = (x, y) => x >= 0 && y >= 0 && x < gridSize && y < gridSize;
  const nearestWalkable = (cx, cy) => {
    for (let r = 0; r < gridSize; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx, y = cy + dy; if (inB(x, y) && tiles[y][x].walkable) return { x, y };
    }
    return null;
  };
  const flood = (seed) => {
    const seen = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
    if (!seed) return seen;
    const q = [seed]; seen[seed.y][seed.x] = true;
    while (q.length) {
      const { x, y } = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (inB(nx, ny) && !seen[ny][nx] && tiles[ny][nx].walkable) { seen[ny][nx] = true; q.push({ x: nx, y: ny }); }
      }
    }
    return seen;
  };
  const seedTile = nearestWalkable(gridSize >> 1, gridSize >> 1);
  let seen = flood(seedTile);
  const nearestSeen = (cx, cy) => {
    for (let r = 1; r < gridSize; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx, y = cy + dy; if (inB(x, y) && seen[y][x]) return { x, y };
    }
    return seedTile;
  };
  for (const m of mustReach) {
    if (!inB(m.x, m.y) || (seen[m.y] && seen[m.y][m.x])) continue;
    const tgt = nearestSeen(m.x, m.y);
    if (tgt) { carveLine(tiles, gridSize, m.x, m.y, tgt.x, tgt.y); seen = flood(seedTile); }
  }
}

// ---- per-terrain settlements (Stage 3) ----
// A building-use mix + max storeys + style per biome, so each settlement reads in-character: a
// low desert outpost, a forest hamlet, ocean docks, an ice dome-colony, a volcanic mining camp,
// a barren scrap town. Weights are over building categories shared with the urban renderer.
const SETTLEMENT_PROFILES = {
  desert:   { style: 'outpost',     maxStorey: 2, weights: { apartment: 26, shop: 22, market: 14, bar: 12, warehouse: 18, civic: 8 } },
  forest:   { style: 'hamlet',      maxStorey: 3, weights: { apartment: 34, shop: 20, market: 12, bar: 8,  warehouse: 16, civic: 10 } },
  ocean:    { style: 'docks',       maxStorey: 2, weights: { apartment: 24, shop: 18, market: 16, bar: 10, warehouse: 26, civic: 6 } },
  ice:      { style: 'dome_colony', maxStorey: 2, weights: { apartment: 30, shop: 18, market: 10, bar: 8,  warehouse: 24, civic: 10 } },
  volcanic: { style: 'mining_camp', maxStorey: 2, weights: { apartment: 20, shop: 16, market: 8,  bar: 12, warehouse: 36, civic: 8 } },
  barren:   { style: 'scrap_town',  maxStorey: 2, weights: { apartment: 22, shop: 20, market: 8,  bar: 14, warehouse: 30, civic: 6 } },
};

function pickWeighted(weights, r) {
  let total = 0; for (const k in weights) total += weights[k];
  let t = r * total;
  for (const k in weights) { t -= weights[k]; if (t <= 0) return k; }
  return Object.keys(weights)[0];
}

/**
 * Carve a bounded settlement — a street grid of use-tagged buildings around a central market plaza
 * — into an existing terrain tilemap, around the spaceport/first POI, sized by the planet's
 * population. The surrounding terrain (rocks/trees/water) is left intact outside the radius, and the
 * outskirts fade into open lots so it doesn't read as a hard disc. Deterministic (seeded) so the
 * cached + regenerated grids agree and the NPC ecology lines up with what's drawn.
 * @returns the same tileMap (mutated), now flagged `settlement` with a biome `style`.
 */
function placeSettlement(tileMap, planet, mapData, biomeKey) {
  if (!tileMap || !Array.isArray(tileMap.tiles)) return tileMap;
  const tiles = tileMap.tiles, gridSize = tileMap.gridSize, tileSize = tileMap.tileSize || 2;
  const profile = SETTLEMENT_PROFILES[biomeKey] || SETTLEMENT_PROFILES.desert;
  const pois = (mapData && mapData.pointsOfInterest) || [];
  const seed = Math.abs(((mapData && mapData.seed) | 0) ||
    pois.reduce((s, p) => s + Math.floor((p.x || 0) * 31 + (p.y || 0) * 17), gridSize * 101)) || 4242;
  const rng = mulberry32(seed);

  // Population → town radius (tiles). A megacity sprawls; an outpost is a tight cluster.
  const pop = Number(planet && planet.population) || 0;
  const tier = pop <= 0 ? 0.2 : Math.max(0.12, Math.min(1, (Math.log10(pop) - 4) / 6));
  const radius = Math.round(5 + tier * 15); // 6..20

  // Centre near the spaceport (where the player spawns), else the first POI, else map centre.
  let cx = gridSize >> 1, cy = gridSize >> 1;
  const sp = mapData && mapData.spaceport;
  if (sp && Number.isFinite(sp.x)) { cx = Math.floor(sp.x / tileSize); cy = Math.floor(sp.y / tileSize); }
  else if (pois[0] && Number.isFinite(pois[0].x)) { cx = Math.floor(pois[0].x / tileSize); cy = Math.floor(pois[0].y / tileSize); }
  cx = Math.max(radius + 1, Math.min(gridSize - radius - 2, cx));
  cy = Math.max(radius + 1, Math.min(gridSize - radius - 2, cy));

  const inB = (x, y) => x >= 0 && y >= 0 && x < gridSize && y < gridSize;
  const STREET = 2, PITCH = 5; // 3-tile blocks separated by 2-wide streets
  const x0 = cx - radius, y0 = cy - radius;
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (!inB(x, y)) continue;
      const dist = Math.hypot(x - cx, y - cy);
      if (dist > radius) continue;                 // outside town → leave terrain untouched
      const lx = ((x - x0) % PITCH + PITCH) % PITCH, ly = ((y - y0) % PITCH + PITCH) % PITCH;
      if (lx < STREET || ly < STREET) { tiles[y][x] = { type: 'street', walkable: true, visual: 'street' }; continue; }
      const edge = dist / radius;
      const bh = hash2(Math.floor((x - x0) / PITCH), Math.floor((y - y0) / PITCH), seed);
      if (edge > 0.55 && ((bh & 0xff) / 255) < (edge - 0.55) * 1.6) { tiles[y][x] = { type: 'street', walkable: true, visual: 'street' }; continue; } // thinned outskirts
      const cat = pickWeighted(profile.weights, ((bh >>> 8) & 0xffff) / 0xffff);
      const baseH = cat === 'apartment' ? 2 : 1;
      const h = Math.min(profile.maxStorey, baseH + (((bh >>> 24) & 0xff) / 255 < 0.4 ? 0 : 1));
      const blk = Math.floor((y - y0) / PITCH) * 1000 + Math.floor((x - x0) / PITCH);
      tiles[y][x] = { type: 'building', walkable: false, visual: 'building', category: cat, height: h, style: (h * 7) % 5, block: blk };
    }
  }

  // Central market plaza (the souk square).
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = cx + dx, y = cy + dy; if (inB(x, y)) tiles[y][x] = { type: 'plaza', walkable: true, visual: 'plaza' }; }

  // POI pockets + connectivity: clear a walkable pocket at each POI/centre/spaceport, then flood-fill
  // and carve stubs so nothing is sealed off (esp. important when the town meets impassable terrain).
  const anchors = pois.map(p => ({ x: Math.floor((p.x ?? 50) / tileSize), y: Math.floor((p.y ?? 50) / tileSize) }));
  anchors.push({ x: cx, y: cy });
  if (sp && Number.isFinite(sp.x)) anchors.push({ x: Math.floor(sp.x / tileSize), y: Math.floor(sp.y / tileSize) });
  anchors.forEach(a => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = a.x + dx, y = a.y + dy; if (inB(x, y) && !tiles[y][x].walkable) tiles[y][x] = { type: 'plaza', walkable: true, visual: 'plaza' }; } });
  connectWalkable(tiles, gridSize, anchors);

  // Market stalls around the square's RIM (after connectivity, so the pocket pass can't erase them
  // and a single small obstacle in an open square can't seal anything).
  let placed = 0;
  for (const [sx, sy] of [[cx - 2, cy], [cx + 2, cy], [cx, cy - 2], [cx, cy + 2], [cx - 2, cy - 2], [cx + 2, cy + 2]]) {
    if (placed >= 3) break;
    if (inB(sx, sy) && tiles[sy][sx].walkable && rng() < 0.85) { tiles[sy][sx] = { type: 'stall', walkable: false, visual: 'stall', stallStyle: (rng() * 4) | 0 }; placed++; }
  }

  tileMap.settlement = true;
  tileMap.style = profile.style;
  return tileMap;
}

/**
 * Generate a tile map for an urban planet — a dense, maze-like medina.
 * The whole map starts as buildings; a braided maze of narrow alleys is carved through it,
 * with souk plazas, market stalls, and a walkable pocket around every POI. Building tiles carry
 * a `height` (storeys) + `style` so the 3D surface can draw varied, crowded rooftops.
 * @param {Object} mapData - Planet map data with POIs and districts
 * @param {number} tileSize - Size of each tile as percentage (default 2% = 50x50 grid)
 * @returns {Object} Tile map with walkable/obstacle information
 */
function generateUrbanTileMap(mapData, tileSize = 2, planet = {}) {
  const gridSize = Math.floor(100 / tileSize); // 50x50 grid for 2% tiles
  const tiles = [];
  const tileMap = { gridSize, tileSize, tiles, style: 'medina', settlement: true };

  const pois = mapData.pointsOfInterest || [];
  // Deterministic per-planet RNG so a planet always regenerates the same medina.
  let seed = Math.abs((mapData.seed | 0) ||
    pois.reduce((s, p) => s + Math.floor((p.x || 0) * 31 + (p.y || 0) * 17), gridSize * 101)) || 12345;
  const rng = mulberry32(seed);

  // Rooftop access (stairs + bridges) scales with population — a sprawling capital is a vertical
  // playground; a small/rural urban world has only a few ways up (or nearly none).
  const pop = Number(planet && planet.population) || 0;
  const popTier = pop <= 0 ? 0.5 : Math.max(0.15, Math.min(1, (Math.log10(pop) - 4) / 6));
  const accessFactor = 0.2 + 0.8 * popTier;

  // 1) Solid block of buildings to start.
  for (let y = 0; y < gridSize; y++) {
    tiles[y] = [];
    for (let x = 0; x < gridSize; x++) tiles[y][x] = { type: 'building', walkable: false, visual: 'building' };
  }
  const inB = (x, y) => x >= 0 && y >= 0 && x < gridSize && y < gridSize;
  const carve = (x, y, type = 'street') => { if (inB(x, y)) tiles[y][x] = { type, walkable: true, visual: type }; };

  // 2) Braided maze of alleys on a cell lattice (recursive backtracker + a few extra loops).
  const STREET = 2, WALL = 2, PITCH = STREET + WALL, margin = 1;
  const cellsX = Math.floor((gridSize - margin * 2 - STREET) / PITCH) + 1;
  const cellsY = Math.floor((gridSize - margin * 2 - STREET) / PITCH) + 1;
  const originOf = (i, j) => ({ ox: margin + i * PITCH, oy: margin + j * PITCH });
  const carveCell = (i, j) => { const { ox, oy } = originOf(i, j); for (let dy = 0; dy < STREET; dy++) for (let dx = 0; dx < STREET; dx++) carve(ox + dx, oy + dy); };
  const carvePassage = (i, j, ni, nj) => {
    const { ox, oy } = originOf(i, j);
    if (ni > i) for (let dy = 0; dy < STREET; dy++) for (let g = 0; g < WALL; g++) carve(ox + STREET + g, oy + dy);
    else if (ni < i) for (let dy = 0; dy < STREET; dy++) for (let g = 1; g <= WALL; g++) carve(ox - g, oy + dy);
    else if (nj > j) for (let dx = 0; dx < STREET; dx++) for (let g = 0; g < WALL; g++) carve(ox + dx, oy + STREET + g);
    else for (let dx = 0; dx < STREET; dx++) for (let g = 1; g <= WALL; g++) carve(ox + dx, oy - g);
  };
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const visited = Array.from({ length: cellsY }, () => Array(cellsX).fill(false));
  const stack = [[0, 0]]; visited[0][0] = true; carveCell(0, 0);
  while (stack.length) {
    const [ci, cj] = stack[stack.length - 1];
    const open = DIRS.map(([dx, dy]) => [ci + dx, cj + dy]).filter(([ni, nj]) => ni >= 0 && nj >= 0 && ni < cellsX && nj < cellsY && !visited[nj][ni]);
    if (open.length) { const [ni, nj] = open[(rng() * open.length) | 0]; visited[nj][ni] = true; carveCell(ni, nj); carvePassage(ci, cj, ni, nj); stack.push([ni, nj]); }
    else stack.pop();
  }
  // Braid: extra passages create loops/through-routes (less labyrinth, more bustling medina).
  for (let cj = 0; cj < cellsY; cj++) for (let ci = 0; ci < cellsX; ci++) {
    if (rng() < 0.14) {
      const opts = DIRS.map(([dx, dy]) => [ci + dx, cj + dy]).filter(([ni, nj]) => ni >= 0 && nj >= 0 && ni < cellsX && nj < cellsY);
      if (opts.length) { const [ni, nj] = opts[(rng() * opts.length) | 0]; carvePassage(ci, cj, ni, nj); }
    }
  }

  // 3) Souk plazas: open a few cells into wider market squares.
  const plazas = [];
  const plazaCount = 2 + ((rng() * 3) | 0);
  for (let p = 0; p < plazaCount; p++) {
    const ci = (rng() * cellsX) | 0, cj = (rng() * cellsY) | 0;
    const { ox, oy } = originOf(ci, cj);
    for (let dy = -1; dy <= STREET; dy++) for (let dx = -1; dx <= STREET; dx++) {
      const x = ox + dx, y = oy + dy;
      if (x >= margin && y >= margin && x < gridSize - margin && y < gridSize - margin) carve(x, y, 'plaza');
    }
    plazas.push({ x: ox + (STREET >> 1), y: oy + (STREET >> 1) });
  }

  // 4) POIs + spaceport: carve a walkable pocket so each structure sits in the open and stays enterable.
  const anchors = pois.map(p => ({ x: Math.floor((p.x ?? 50) / tileSize), y: Math.floor((p.y ?? 50) / tileSize) }));
  if (mapData.spaceport && Number.isFinite(mapData.spaceport.x)) {
    anchors.push({ x: Math.floor(mapData.spaceport.x / tileSize), y: Math.floor(mapData.spaceport.y / tileSize) });
  }
  anchors.forEach(a => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) carve(a.x + dx, a.y + dy, 'plaza'); });

  // 5) Guarantee every pocket connects to the alley network (carve straight stubs if marooned).
  connectWalkable(tiles, gridSize, anchors);

  // 6) Tag each building BLOCK with a coherent use (`category`) + a category-driven height + style,
  // so the city reads as varied real buildings — apartment towers, shops, markets, bars, etc.,
  // not a uniform maze. Per super-block (deterministic) so each block is one coherent building.
  for (let y = 0; y < gridSize; y++) for (let x = 0; x < gridSize; x++) {
    const t = tiles[y][x];
    if (t.type !== 'building') continue;
    const sbx = Math.floor((x - margin) / PITCH), sby = Math.floor((y - margin) / PITCH);
    const hh = hash2(sbx, sby, seed);
    t.category = pickBuildingCategory(hh);
    t.height = buildingHeightFor(t.category, hh);
    t.style = (hh >>> 16) % 5;
    t.block = sby * 1000 + sbx; // block id → lets the NPC ecology place one shopkeeper per building
  }

  // 7) Stairwells: convert some street-adjacent building EDGE tiles into stairs up to the roof, so
  // the rooftops are reachable (walkable upper level). A stair keeps its building's height, so
  // ascending onto the adjacent roof of the same block is a flush step. Stairs stay ground-walkable
  // (a notch off the alley), so they don't change the ground maze's connectivity.
  const stairCandidates = [];
  for (let y = 1; y < gridSize - 1; y++) for (let x = 1; x < gridSize - 1; x++) {
    const t = tiles[y][x];
    if (t.type !== 'building') continue;
    let hasGround = false, hasRoof = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = tiles[y + dy] && tiles[y + dy][x + dx];
      if (!n) continue;
      if (n.walkable && (n.type === 'street' || n.type === 'plaza')) hasGround = true;
      if (n.type === 'building' && n.height === t.height) hasRoof = true; // a flush roof to climb onto
    }
    if (hasGround && hasRoof) stairCandidates.push({ x, y, h: t.height });
  }
  if (stairCandidates.length) {
    const target = Math.round(Math.min(20, Math.max(6, stairCandidates.length * 0.06)) * accessFactor);
    const p = target / stairCandidates.length;
    for (const c of stairCandidates) {
      if (rng() < p) tiles[c.y][c.x] = { type: 'stair', walkable: true, visual: 'stair', height: c.h };
    }
  }

  // 7.5) Rooftop bridges: span a 2-wide alley between two SAME-HEIGHT building roofs so the flush
  // roof network reconnects across the city. A 'bridge' tile stays ground-walkable (you pass under
  // it) and becomes a roof deck at the buildings' height (you cross it) — see the sim's isRoofTile.
  const bridgePlans = [];
  for (let y = 1; y < gridSize - 1; y++) for (let x = 1; x < gridSize - 1; x++) {
    const t = tiles[y][x];
    if (t.type !== 'building' || !t.height) continue;
    for (const [dx, dy] of [[1, 0], [0, 1]]) { // +x/+y only so each gap is considered once
      const c1 = tiles[y + dy] && tiles[y + dy][x + dx];
      const c2 = tiles[y + 2 * dy] && tiles[y + 2 * dy][x + 2 * dx];
      const far = tiles[y + 3 * dy] && tiles[y + 3 * dy][x + 3 * dx];
      const street = (c) => c && c.walkable && (c.type === 'street' || c.type === 'plaza');
      if (street(c1) && street(c2) && far && far.type === 'building' && far.height === t.height) {
        bridgePlans.push({ cells: [[x + dx, y + dy], [x + 2 * dx, y + 2 * dy]], h: t.height });
      }
    }
  }
  if (bridgePlans.length) {
    const bridged = new Set();
    const target = Math.round(Math.min(22, Math.max(4, bridgePlans.length * 0.2)) * accessFactor);
    const stride = Math.max(1, Math.floor(bridgePlans.length / target));
    let placed = 0;
    for (let i = 0; i < bridgePlans.length && placed < target; i += stride) {
      const plan = bridgePlans[i];
      if (plan.cells.some(([cx, cy]) => bridged.has(cx + ',' + cy))) continue;
      for (const [cx, cy] of plan.cells) { tiles[cy][cx] = { type: 'bridge', walkable: true, visual: 'bridge', height: plan.h }; bridged.add(cx + ',' + cy); }
      placed++;
    }
  }

  // 8) Market stalls at plaza corners (small obstacles; the plaza centre stays passable).
  plazas.forEach(pl => {
    [[pl.x - 1, pl.y - 1], [pl.x + 1, pl.y - 1], [pl.x - 1, pl.y + 1], [pl.x + 1, pl.y + 1]].forEach(([sx, sy]) => {
      if (inB(sx, sy) && tiles[sy][sx].walkable && rng() < 0.7) {
        tiles[sy][sx] = { type: 'stall', walkable: false, visual: 'stall', stallStyle: (rng() * 4) | 0 };
      }
    });
  });

  return tileMap;
}

/**
 * Create a building (obstacle) at tile coordinates
 */
function createBuilding(tileMap, centerX, centerY, width, height) {
  const halfWidth = Math.floor(width / 2);
  const halfHeight = Math.floor(height / 2);
  
  for (let y = centerY - halfHeight; y <= centerY + halfHeight; y++) {
    for (let x = centerX - halfWidth; x <= centerX + halfWidth; x++) {
      if (x >= 0 && x < tileMap.gridSize && y >= 0 && y < tileMap.gridSize) {
        tileMap.tiles[y][x] = {
          type: 'building',
          walkable: false,
          visual: 'building'
        };
      }
    }
  }
}

/**
 * Create a plaza (walkable open area) at tile coordinates
 */
function createPlaza(tileMap, centerX, centerY, width, height) {
  const halfWidth = Math.floor(width / 2);
  const halfHeight = Math.floor(height / 2);
  
  for (let y = centerY - halfHeight; y <= centerY + halfHeight; y++) {
    for (let x = centerX - halfWidth; x <= centerX + halfWidth; x++) {
      if (x >= 0 && x < tileMap.gridSize && y >= 0 && y < tileMap.gridSize) {
        const existing = tileMap.tiles[y][x];
        if (existing.type !== 'building') {
          tileMap.tiles[y][x] = {
            type: 'plaza',
            walkable: true,
            visual: 'plaza'
          };
        }
      }
    }
  }
}

/**
 * Create a street connecting two POIs
 */
function createStreet(tileMap, fromPOI, toPOI, width) {
  const fromX = Math.floor(fromPOI.x / tileMap.tileSize);
  const fromY = Math.floor(fromPOI.y / tileMap.tileSize);
  const toX = Math.floor(toPOI.x / tileMap.tileSize);
  const toY = Math.floor(toPOI.y / tileMap.tileSize);

  // Use Bresenham-like algorithm to create street
  const dx = Math.abs(toX - fromX);
  const dy = Math.abs(toY - fromY);
  const sx = fromX < toX ? 1 : -1;
  const sy = fromY < toY ? 1 : -1;
  let err = dx - dy;

  let x = fromX;
  let y = fromY;

  while (true) {
    // Create street tiles around current position
    const halfWidth = Math.floor(width / 2);
    for (let wy = -halfWidth; wy <= halfWidth; wy++) {
      for (let wx = -halfWidth; wx <= halfWidth; wx++) {
        const tx = x + wx;
        const ty = y + wy;
        if (tx >= 0 && tx < tileMap.gridSize && ty >= 0 && ty < tileMap.gridSize) {
          const existing = tileMap.tiles[ty][tx];
          if (existing.type !== 'building') {
            tileMap.tiles[ty][tx] = {
              type: width >= 3 ? 'main_street' : 'alley',
              walkable: true,
              visual: width >= 3 ? 'main_street' : 'alley'
            };
          }
        }
      }
    }

    if (x === toX && y === toY) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

/**
 * Create alleys around buildings (narrow pathways)
 */
function createAlleys(tileMap) {
  // Find building clusters and create narrow alleys between them
  for (let y = 1; y < tileMap.gridSize - 1; y++) {
    for (let x = 1; x < tileMap.gridSize - 1; x++) {
      const tile = tileMap.tiles[y][x];
      
      // If surrounded by buildings, make it an alley
      if (tile.type === 'open') {
        const neighbors = [
          tileMap.tiles[y - 1][x],
          tileMap.tiles[y + 1][x],
          tileMap.tiles[y][x - 1],
          tileMap.tiles[y][x + 1]
        ];
        
        const buildingCount = neighbors.filter(n => n.type === 'building').length;
        if (buildingCount >= 2) {
          tile.type = 'alley';
          tile.visual = 'alley';
        }
      }
    }
  }
}

/**
 * Check if a coordinate (0-100) is walkable
 */
function isWalkable(tileMap, x, y) {
  const tileX = Math.floor(x / tileMap.tileSize);
  const tileY = Math.floor(y / tileMap.tileSize);
  
  if (tileX < 0 || tileX >= tileMap.gridSize || tileY < 0 || tileY >= tileMap.gridSize) {
    return false;
  }
  
  return tileMap.tiles[tileY][tileX].walkable;
}

/**
 * Get tile type at coordinates
 */
function getTileType(tileMap, x, y) {
  const tileX = Math.floor(x / tileMap.tileSize);
  const tileY = Math.floor(y / tileMap.tileSize);
  
  if (tileX < 0 || tileX >= tileMap.gridSize || tileY < 0 || tileY >= tileMap.gridSize) {
    return 'out_of_bounds';
  }
  
  return tileMap.tiles[tileY][tileX].type;
}

/**
 * Generate a tile map for a desert planet
 */
function generateDesertTileMap(mapData, tileSize = 2) {
  const gridSize = Math.floor(100 / tileSize);
  const tileMap = {
    gridSize: gridSize,
    tileSize: tileSize,
    tiles: []
  };

  // Initialize all tiles as open terrain (walkable)
  for (let y = 0; y < gridSize; y++) {
    tileMap.tiles[y] = [];
    for (let x = 0; x < gridSize; x++) {
      tileMap.tiles[y][x] = {
        type: 'open',
        walkable: true,
        visual: 'terrain'
      };
    }
  }

  const pois = mapData.pointsOfInterest || [];
  
  // Place rocks (5-10% of map, random)
  const rockCount = Math.floor((gridSize * gridSize) * 0.08);
  for (let i = 0; i < rockCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    const size = Math.random() < 0.7 ? 1 : 2; // 70% small, 30% large
    createObstacle(tileMap, x, y, size, size, 'rock');
  }

  // Place sand dunes (10-15% of map)
  const duneCount = Math.floor((gridSize * gridSize) * 0.12);
  for (let i = 0; i < duneCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    tileMap.tiles[y][x].type = 'sand_dune';
    tileMap.tiles[y][x].walkable = true; // Difficult but walkable
    tileMap.tiles[y][x].visual = 'sand_dune';
  }

  // Create canyons (2-3 major canyons)
  const canyonCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < canyonCount; i++) {
    const startX = Math.floor(Math.random() * gridSize);
    const startY = Math.floor(Math.random() * gridSize);
    const endX = Math.floor(Math.random() * gridSize);
    const endY = Math.floor(Math.random() * gridSize);
    createCanyon(tileMap, startX, startY, endX, endY);
  }

  // Place oases near settlements
  const settlements = pois.filter(p => p.type === 'settlement' || p.type === 'city');
  settlements.forEach(settlement => {
    const tileX = Math.floor(settlement.x / tileSize);
    const tileY = Math.floor(settlement.y / tileSize);
    createOasis(tileMap, tileX, tileY, 2, 2);
  });

  // Create settlements (smaller buildings than urban)
  pois.forEach(poi => {
    if (poi.type !== 'city' && poi.type !== 'settlement' && poi.type !== 'landscape' && poi.type !== 'wilderness') {
      const tileX = Math.floor(poi.x / tileSize);
      const tileY = Math.floor(poi.y / tileSize);
      const size = poi.type === 'spaceport' ? 2 : 1;
      createObstacle(tileMap, tileX, tileY, size, size, 'building');
    }
  });

  // Create roads connecting settlements
  const spaceport = pois.find(p => p.type === 'spaceport');
  if (spaceport) {
    settlements.forEach(settlement => {
      createPath(tileMap, spaceport, settlement, 3); // 3 tiles wide (road)
    });
  }

  // Create trails between nearby POIs
  for (let i = 0; i < pois.length; i++) {
    for (let j = i + 1; j < pois.length; j++) {
      const poi1 = pois[i];
      const poi2 = pois[j];
      const distance = Math.sqrt(Math.pow(poi1.x - poi2.x, 2) + Math.pow(poi1.y - poi2.y, 2));
      if (distance < 25 && distance > 5) {
        createPath(tileMap, poi1, poi2, 1); // 1 tile wide (trail)
      }
    }
  }

  return tileMap;
}

/**
 * Generate a tile map for a forest/jungle planet
 */
function generateForestTileMap(mapData, tileSize = 2) {
  const gridSize = Math.floor(100 / tileSize);
  const tileMap = {
    gridSize: gridSize,
    tileSize: tileSize,
    tiles: []
  };

  // Initialize all tiles as open terrain
  for (let y = 0; y < gridSize; y++) {
    tileMap.tiles[y] = [];
    for (let x = 0; x < gridSize; x++) {
      tileMap.tiles[y][x] = {
        type: 'open',
        walkable: true,
        visual: 'terrain'
      };
    }
  }

  const pois = mapData.pointsOfInterest || [];

  // Place dense tree clusters (20-30% of map)
  const clusterCount = Math.floor((gridSize * gridSize) * 0.25);
  for (let i = 0; i < clusterCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    const size = Math.random() < 0.5 ? 1 : 2;
    createObstacle(tileMap, x, y, size, size, 'tree');
  }

  // Place scattered individual trees (10-15% of map)
  const treeCount = Math.floor((gridSize * gridSize) * 0.12);
  for (let i = 0; i < treeCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    if (tileMap.tiles[y][x].type === 'open') {
      tileMap.tiles[y][x] = {
        type: 'tree',
        walkable: false,
        visual: 'tree'
      };
    }
  }

  // Create clearings around POIs
  pois.forEach(poi => {
    const tileX = Math.floor(poi.x / tileSize);
    const tileY = Math.floor(poi.y / tileSize);
    createClearing(tileMap, tileX, tileY, 3, 3);
  });

  // Place swamps in low-lying areas (5-10% of map)
  const swampCount = Math.floor((gridSize * gridSize) * 0.07);
  for (let i = 0; i < swampCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    tileMap.tiles[y][x].type = 'swamp';
    tileMap.tiles[y][x].walkable = true; // Difficult but walkable
    tileMap.tiles[y][x].visual = 'swamp';
  }

  // Create trails between POIs
  const majorPOIs = pois.filter(p => p.type === 'city' || p.type === 'spaceport' || p.type === 'base');
  for (let i = 0; i < majorPOIs.length; i++) {
    for (let j = i + 1; j < majorPOIs.length; j++) {
      createPath(tileMap, majorPOIs[i], majorPOIs[j], 1); // 1 tile wide (trail)
    }
  }

  return tileMap;
}

/**
 * Generate a tile map for an ocean planet
 */
function generateOceanTileMap(mapData, tileSize = 2) {
  const gridSize = Math.floor(100 / tileSize);
  const tileMap = {
    gridSize: gridSize,
    tileSize: tileSize,
    tiles: []
  };

  // Initialize all tiles as water (impassable)
  for (let y = 0; y < gridSize; y++) {
    tileMap.tiles[y] = [];
    for (let x = 0; x < gridSize; x++) {
      tileMap.tiles[y][x] = {
        type: 'water',
        walkable: false,
        visual: 'water'
      };
    }
  }

  const pois = mapData.pointsOfInterest || [];

  // Create main island (20-30% of map)
  const mainIslandX = Math.floor(gridSize * 0.5);
  const mainIslandY = Math.floor(gridSize * 0.5);
  const islandSize = Math.floor(gridSize * 0.25);
  createIsland(tileMap, mainIslandX, mainIslandY, islandSize, islandSize);

  // Create 2-3 secondary islands (5-10% each)
  const secondaryIslandCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < secondaryIslandCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    const size = Math.floor(gridSize * 0.08);
    createIsland(tileMap, x, y, size, size);
  }

  // Create channels between islands (navigable water)
  const islands = findIslands(tileMap);
  for (let i = 0; i < islands.length; i++) {
    for (let j = i + 1; j < islands.length; j++) {
      createChannel(tileMap, islands[i], islands[j], 2); // 2 tiles wide
    }
  }

  // Place POIs on islands
  pois.forEach(poi => {
    const tileX = Math.floor(poi.x / tileSize);
    const tileY = Math.floor(poi.y / tileSize);
    if (tileMap.tiles[tileY] && tileMap.tiles[tileY][tileX] && tileMap.tiles[tileY][tileX].type === 'island') {
      const size = poi.type === 'spaceport' ? 2 : 1;
      createObstacle(tileMap, tileX, tileY, size, size, 'building');
    }
  });

  return tileMap;
}

/**
 * Generate a tile map for an ice/snow planet
 */
function generateIceTileMap(mapData, tileSize = 2) {
  const gridSize = Math.floor(100 / tileSize);
  const tileMap = {
    gridSize: gridSize,
    tileSize: tileSize,
    tiles: []
  };

  // Initialize all tiles as open terrain
  for (let y = 0; y < gridSize; y++) {
    tileMap.tiles[y] = [];
    for (let x = 0; x < gridSize; x++) {
      tileMap.tiles[y][x] = {
        type: 'open',
        walkable: true,
        visual: 'terrain'
      };
    }
  }

  const pois = mapData.pointsOfInterest || [];

  // Create ice cliffs (2-3 major barriers)
  const cliffCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < cliffCount; i++) {
    const startX = Math.floor(Math.random() * gridSize);
    const startY = Math.floor(Math.random() * gridSize);
    const endX = Math.floor(Math.random() * gridSize);
    const endY = Math.floor(Math.random() * gridSize);
    createCanyon(tileMap, startX, startY, endX, endY); // Reuse canyon logic for cliffs
  }

  // Place crevasses (3-5 dangerous areas)
  const crevasseCount = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < crevasseCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    createObstacle(tileMap, x, y, 1, 2, 'crevasse');
  }

  // Place snow drifts (10-15% of map)
  const driftCount = Math.floor((gridSize * gridSize) * 0.12);
  for (let i = 0; i < driftCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    tileMap.tiles[y][x].type = 'snow_drift';
    tileMap.tiles[y][x].walkable = true; // Difficult but walkable
    tileMap.tiles[y][x].visual = 'snow_drift';
  }

  // Create frozen lakes (2-3 large areas)
  const lakeCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < lakeCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    createClearing(tileMap, x, y, 4, 4); // Use clearing logic for lakes
    // Mark as frozen lake
    for (let ly = y - 2; ly <= y + 2; ly++) {
      for (let lx = x - 2; lx <= x + 2; lx++) {
        if (lx >= 0 && lx < gridSize && ly >= 0 && ly < gridSize) {
          if (tileMap.tiles[ly][lx].type === 'clearing') {
            tileMap.tiles[ly][lx].type = 'frozen_lake';
            tileMap.tiles[ly][lx].visual = 'frozen_lake';
          }
        }
      }
    }
  }

  // Create bases (buildings)
  pois.forEach(poi => {
    if (poi.type === 'base' || poi.type === 'spaceport') {
      const tileX = Math.floor(poi.x / tileSize);
      const tileY = Math.floor(poi.y / tileSize);
      createObstacle(tileMap, tileX, tileY, 2, 2, 'building');
    }
  });

  // Create ice roads connecting bases
  const bases = pois.filter(p => p.type === 'base' || p.type === 'spaceport');
  for (let i = 0; i < bases.length; i++) {
    for (let j = i + 1; j < bases.length; j++) {
      createPath(tileMap, bases[i], bases[j], 2); // 2 tiles wide (ice road)
    }
  }

  return tileMap;
}

/**
 * Generate a tile map for a volcanic planet
 */
function generateVolcanicTileMap(mapData, tileSize = 2) {
  const gridSize = Math.floor(100 / tileSize);
  const tileMap = {
    gridSize: gridSize,
    tileSize: tileSize,
    tiles: []
  };

  // Initialize all tiles as open terrain
  for (let y = 0; y < gridSize; y++) {
    tileMap.tiles[y] = [];
    for (let x = 0; x < gridSize; x++) {
      tileMap.tiles[y][x] = {
        type: 'open',
        walkable: true,
        visual: 'terrain'
      };
    }
  }

  const pois = mapData.pointsOfInterest || [];

  // Create lava flows (3-5 major barriers)
  const lavaFlowCount = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < lavaFlowCount; i++) {
    const startX = Math.floor(Math.random() * gridSize);
    const startY = Math.floor(Math.random() * gridSize);
    const endX = Math.floor(Math.random() * gridSize);
    const endY = Math.floor(Math.random() * gridSize);
    createLavaFlow(tileMap, startX, startY, endX, endY);
  }

  // Place volcanic vents (5-10 dangerous areas)
  const ventCount = 5 + Math.floor(Math.random() * 6);
  for (let i = 0; i < ventCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    createObstacle(tileMap, x, y, 1, 1, 'volcanic_vent');
  }

  // Place unstable ground around vents (10-15% of map)
  const unstableCount = Math.floor((gridSize * gridSize) * 0.12);
  for (let i = 0; i < unstableCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    if (tileMap.tiles[y][x].type === 'open') {
      tileMap.tiles[y][x].type = 'unstable_ground';
      tileMap.tiles[y][x].walkable = true; // Difficult but walkable
      tileMap.tiles[y][x].visual = 'unstable_ground';
    }
  }

  // Create safe zones around POIs
  pois.forEach(poi => {
    const tileX = Math.floor(poi.x / tileSize);
    const tileY = Math.floor(poi.y / tileSize);
    createClearing(tileMap, tileX, tileY, 3, 3); // Safe zone
  });

  // Create bases
  pois.forEach(poi => {
    if (poi.type === 'base' || poi.type === 'industrial') {
      const tileX = Math.floor(poi.x / tileSize);
      const tileY = Math.floor(poi.y / tileSize);
      createObstacle(tileMap, tileX, tileY, 2, 2, 'building');
    }
  });

  // Create safe paths between safe zones
  const safeZones = pois.filter(p => p.type === 'base' || p.type === 'spaceport');
  for (let i = 0; i < safeZones.length; i++) {
    for (let j = i + 1; j < safeZones.length; j++) {
      createPath(tileMap, safeZones[i], safeZones[j], 1); // 1 tile wide (safe path)
    }
  }

  return tileMap;
}

/**
 * Generate a tile map for a barren/desolate planet
 */
function generateBarrenTileMap(mapData, tileSize = 2) {
  const gridSize = Math.floor(100 / tileSize);
  const tileMap = {
    gridSize: gridSize,
    tileSize: tileSize,
    tiles: []
  };

  // Initialize all tiles as open terrain (most of map is walkable)
  for (let y = 0; y < gridSize; y++) {
    tileMap.tiles[y] = [];
    for (let x = 0; x < gridSize; x++) {
      tileMap.tiles[y][x] = {
        type: 'open',
        walkable: true,
        visual: 'terrain'
      };
    }
  }

  const pois = mapData.pointsOfInterest || [];

  // Place craters (5-10% of map)
  const craterCount = Math.floor((gridSize * gridSize) * 0.07);
  for (let i = 0; i < craterCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    const size = Math.random() < 0.7 ? 1 : 2;
    createObstacle(tileMap, x, y, size, size, 'crater');
  }

  // Place rock formations (5-10% of map)
  const rockCount = Math.floor((gridSize * gridSize) * 0.07);
  for (let i = 0; i < rockCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    const size = Math.random() < 0.6 ? 1 : (Math.random() < 0.8 ? 2 : 3);
    createObstacle(tileMap, x, y, size, size, 'rock');
  }

  // Place ruins (3-5% of map)
  const ruinCount = Math.floor((gridSize * gridSize) * 0.04);
  for (let i = 0; i < ruinCount; i++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    if (tileMap.tiles[y][x].type === 'open') {
      tileMap.tiles[y][x].type = 'ruin';
      tileMap.tiles[y][x].walkable = true; // Difficult but walkable
      tileMap.tiles[y][x].visual = 'ruin';
    }
  }

  // Create sparse settlements
  pois.forEach(poi => {
    if (poi.type !== 'landscape' && poi.type !== 'wilderness') {
      const tileX = Math.floor(poi.x / tileSize);
      const tileY = Math.floor(poi.y / tileSize);
      const size = poi.type === 'spaceport' ? 2 : 1;
      createObstacle(tileMap, tileX, tileY, size, size, 'building');
    }
  });

  // Create roads connecting settlements
  const settlements = pois.filter(p => p.type === 'settlement' || p.type === 'city' || p.type === 'spaceport');
  for (let i = 0; i < settlements.length; i++) {
    for (let j = i + 1; j < settlements.length; j++) {
      createPath(tileMap, settlements[i], settlements[j], 2); // 2 tiles wide (road)
    }
  }

  return tileMap;
}

// Helper functions for all planet types

function createObstacle(tileMap, centerX, centerY, width, height, type) {
  const halfWidth = Math.floor(width / 2);
  const halfHeight = Math.floor(height / 2);
  
  for (let y = centerY - halfHeight; y <= centerY + halfHeight; y++) {
    for (let x = centerX - halfWidth; x <= centerX + halfWidth; x++) {
      if (x >= 0 && x < tileMap.gridSize && y >= 0 && y < tileMap.gridSize) {
        tileMap.tiles[y][x] = {
          type: type,
          walkable: false,
          visual: type
        };
      }
    }
  }
}

function createClearing(tileMap, centerX, centerY, width, height) {
  const halfWidth = Math.floor(width / 2);
  const halfHeight = Math.floor(height / 2);
  
  for (let y = centerY - halfHeight; y <= centerY + halfHeight; y++) {
    for (let x = centerX - halfWidth; x <= centerX + halfWidth; x++) {
      if (x >= 0 && x < tileMap.gridSize && y >= 0 && y < tileMap.gridSize) {
        const existing = tileMap.tiles[y][x];
        if (existing.type !== 'building' && existing.type !== 'rock' && existing.type !== 'tree') {
          tileMap.tiles[y][x] = {
            type: 'clearing',
            walkable: true,
            visual: 'clearing'
          };
        }
      }
    }
  }
}

function createCanyon(tileMap, startX, startY, endX, endY) {
  const dx = Math.abs(endX - startX);
  const dy = Math.abs(endY - startY);
  const sx = startX < endX ? 1 : -1;
  const sy = startY < endY ? 1 : -1;
  let err = dx - dy;

  let x = startX;
  let y = startY;

  while (true) {
    if (x >= 0 && x < tileMap.gridSize && y >= 0 && y < tileMap.gridSize) {
      tileMap.tiles[y][x] = {
        type: 'canyon',
        walkable: false,
        visual: 'canyon'
      };
    }

    if (x === endX && y === endY) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

function createOasis(tileMap, centerX, centerY, width, height) {
  const halfWidth = Math.floor(width / 2);
  const halfHeight = Math.floor(height / 2);
  
  for (let y = centerY - halfHeight; y <= centerY + halfHeight; y++) {
    for (let x = centerX - halfWidth; x <= centerX + halfWidth; x++) {
      if (x >= 0 && x < tileMap.gridSize && y >= 0 && y < tileMap.gridSize) {
        tileMap.tiles[y][x] = {
          type: 'oasis',
          walkable: true,
          visual: 'oasis'
        };
      }
    }
  }
}

function createPath(tileMap, fromPOI, toPOI, width) {
  const fromX = Math.floor(fromPOI.x / tileMap.tileSize);
  const fromY = Math.floor(fromPOI.y / tileMap.tileSize);
  const toX = Math.floor(toPOI.x / tileMap.tileSize);
  const toY = Math.floor(toPOI.y / tileMap.tileSize);

  const dx = Math.abs(toX - fromX);
  const dy = Math.abs(toY - fromY);
  const sx = fromX < toX ? 1 : -1;
  const sy = fromY < toY ? 1 : -1;
  let err = dx - dy;

  let x = fromX;
  let y = fromY;

  while (true) {
    const halfWidth = Math.floor(width / 2);
    for (let wy = -halfWidth; wy <= halfWidth; wy++) {
      for (let wx = -halfWidth; wx <= halfWidth; wx++) {
        const tx = x + wx;
        const ty = y + wy;
        if (tx >= 0 && tx < tileMap.gridSize && ty >= 0 && ty < tileMap.gridSize) {
          const existing = tileMap.tiles[ty][tx];
          if (existing.type !== 'building' && existing.type !== 'rock' && existing.type !== 'tree' && 
              existing.type !== 'canyon' && existing.type !== 'lava_flow' && existing.type !== 'crevasse') {
            tileMap.tiles[ty][tx] = {
              type: width >= 3 ? 'road' : 'trail',
              walkable: true,
              visual: width >= 3 ? 'road' : 'trail'
            };
          }
        }
      }
    }

    if (x === toX && y === toY) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

function createIsland(tileMap, centerX, centerY, width, height) {
  const halfWidth = Math.floor(width / 2);
  const halfHeight = Math.floor(height / 2);
  
  for (let y = centerY - halfHeight; y <= centerY + halfHeight; y++) {
    for (let x = centerX - halfWidth; x <= centerX + halfWidth; x++) {
      if (x >= 0 && x < tileMap.gridSize && y >= 0 && y < tileMap.gridSize) {
        // Create organic island shape (ellipse)
        const dx = (x - centerX) / halfWidth;
        const dy = (y - centerY) / halfHeight;
        if (dx * dx + dy * dy <= 1) {
          tileMap.tiles[y][x] = {
            type: 'island',
            walkable: true,
            visual: 'island'
          };
        }
      }
    }
  }
}

function findIslands(tileMap) {
  const islands = [];
  const visited = new Set();
  
  for (let y = 0; y < tileMap.gridSize; y++) {
    for (let x = 0; x < tileMap.gridSize; x++) {
      if (tileMap.tiles[y][x].type === 'island' && !visited.has(`${x},${y}`)) {
        // Find island center (simple: use first tile)
        islands.push({ x, y });
        // Mark connected tiles as visited (simple flood fill)
        floodFill(tileMap, x, y, visited);
      }
    }
  }
  
  return islands;
}

function floodFill(tileMap, startX, startY, visited) {
  const stack = [[startX, startY]];
  
  while (stack.length > 0) {
    const [x, y] = stack.pop();
    const key = `${x},${y}`;
    
    if (visited.has(key)) continue;
    if (x < 0 || x >= tileMap.gridSize || y < 0 || y >= tileMap.gridSize) continue;
    if (tileMap.tiles[y][x].type !== 'island') continue;
    
    visited.add(key);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}

function createChannel(tileMap, fromIsland, toIsland, width) {
  const fromX = fromIsland.x;
  const fromY = fromIsland.y;
  const toX = toIsland.x;
  const toY = toIsland.y;

  const dx = Math.abs(toX - fromX);
  const dy = Math.abs(toY - fromY);
  const sx = fromX < toX ? 1 : -1;
  const sy = fromY < toY ? 1 : -1;
  let err = dx - dy;

  let x = fromX;
  let y = fromY;

  while (true) {
    const halfWidth = Math.floor(width / 2);
    for (let wy = -halfWidth; wy <= halfWidth; wy++) {
      for (let wx = -halfWidth; wx <= halfWidth; wx++) {
        const tx = x + wx;
        const ty = y + wy;
        if (tx >= 0 && tx < tileMap.gridSize && ty >= 0 && ty < tileMap.gridSize) {
          if (tileMap.tiles[ty][tx].type === 'water') {
            tileMap.tiles[ty][tx] = {
              type: 'channel',
              walkable: true,
              visual: 'channel'
            };
          }
        }
      }
    }

    if (x === toX && y === toY) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

function createLavaFlow(tileMap, startX, startY, endX, endY) {
  const dx = Math.abs(endX - startX);
  const dy = Math.abs(endY - startY);
  const sx = startX < endX ? 1 : -1;
  const sy = startY < endY ? 1 : -1;
  let err = dx - dy;

  let x = startX;
  let y = startY;

  while (true) {
    if (x >= 0 && x < tileMap.gridSize && y >= 0 && y < tileMap.gridSize) {
      tileMap.tiles[y][x] = {
        type: 'lava_flow',
        walkable: false,
        visual: 'lava_flow'
      };
    }

    if (x === endX && y === endY) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

/**
 * Generate tile map based on planet type
 */
// Bump when a generator's output shape changes so cached planet.tileMap grids regenerate.
// v2: urban planets become a dense maze-like medina (height/style-tagged buildings + stalls).
// v3: medina gains 'stair' tiles → walkable rooftops (multi-level traversal).
// v4: building blocks tagged with a use `category` (apartment/shop/market/bar/...) + use-driven heights.
// v5: building blocks carry a `block` id + tileMap.settlement flag (for the stationed-NPC ecology).
// v6: every biome gets a fitting built-up settlement (per-terrain layout/population/bustle).
// v7: medina gains rooftop 'bridge' tiles (cross same-height roofs over the alleys).
// v8: rooftop access (stairs+bridges) scales with population (rural = fewer).
const TILEMAP_VERSION = 8;

function generateTileMapByPlanetType(planet, mapData, tileSize = 2) {
  const tm = _dispatchTileMapByPlanetType(planet, mapData, tileSize);
  if (tm && typeof tm === 'object') tm.version = TILEMAP_VERSION;
  return tm;
}

function _dispatchTileMapByPlanetType(planet, mapData, tileSize = 2) {
  const planetType = planet.planetType || planet.type;
  const terrain = mapData.terrain;

  // Urban planets
  if (planetType === 'urban' || terrain === 'urban_sprawl') {
    return generateUrbanTileMap(mapData, tileSize, planet);
  }

  // Desert planets — natural terrain with a built-up outpost settlement around the spaceport.
  if (planetType === 'desert' || terrain === 'desert') {
    return placeSettlement(generateDesertTileMap(mapData, tileSize), planet, mapData, 'desert');
  }

  // Forest/Jungle planets — a hamlet among the trees.
  if (planetType === 'jungle' || planetType === 'forest' || terrain === 'jungle' || terrain === 'forest') {
    return placeSettlement(generateForestTileMap(mapData, tileSize), planet, mapData, 'forest');
  }

  // Ocean planets — a dock town on the platforms.
  if (planetType === 'ocean' || terrain === 'ocean') {
    return placeSettlement(generateOceanTileMap(mapData, tileSize), planet, mapData, 'ocean');
  }

  // Ice/Snow planets — a hardy dome colony.
  if (planetType === 'ice' || terrain === 'ice') {
    return placeSettlement(generateIceTileMap(mapData, tileSize), planet, mapData, 'ice');
  }

  // Volcanic planets — an industrial mining camp.
  if (planetType === 'volcanic' || terrain === 'volcanic') {
    return placeSettlement(generateVolcanicTileMap(mapData, tileSize), planet, mapData, 'volcanic');
  }

  // Barren planets — a sparse scrap town.
  if (planetType === 'barren' || terrain === 'barren' || terrain === 'wasteland') {
    return placeSettlement(generateBarrenTileMap(mapData, tileSize), planet, mapData, 'barren');
  }

  // Default: use urban for unknown types (fallback)
  console.warn(`[Tile Map] Unknown planet type: ${planetType}, terrain: ${terrain}, using urban generator`);
  return generateUrbanTileMap(mapData, tileSize, planet);
}

module.exports = {
  generateUrbanTileMap,
  generateDesertTileMap,
  generateForestTileMap,
  generateOceanTileMap,
  generateIceTileMap,
  generateVolcanicTileMap,
  generateBarrenTileMap,
  generateTileMapByPlanetType,
  TILEMAP_VERSION,
  isWalkable,
  getTileType
};

