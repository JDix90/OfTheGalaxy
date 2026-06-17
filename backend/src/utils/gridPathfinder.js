/**
 * gridPathfinder — shortest path on a square walkability grid.
 *
 * Breadth-first (4-directional, uniform cost) so the route never cuts a diagonal corner through a
 * building — it matches the collision-slide movement (axis-aligned) used by enemies/crowd. The grid
 * is small (≤ ~50×50) and searches are throttled by the caller, so BFS is plenty fast and avoids the
 * heap bookkeeping of A*.
 */

/**
 * @param {(x:number,y:number)=>boolean} isWalkable  tile-walkability test
 * @param {number} gridSize  grid is gridSize×gridSize
 * @param {{x:number,y:number}} start  start tile
 * @param {{x:number,y:number}} goal   goal tile (if blocked, routes to its nearest walkable neighbour)
 * @returns {Array<{x:number,y:number}>|null}  tiles AFTER start through goal, [] if already there, null if unreachable
 */
function findPath(isWalkable, gridSize, start, goal) {
  const W = gridSize;
  const inB = (x, y) => x >= 0 && y >= 0 && x < W && y < W;
  if (!inB(start.x, start.y) || !inB(goal.x, goal.y)) return null;
  if (start.x === goal.x && start.y === goal.y) return [];

  // A goal tile that's itself a wall (shouldn't happen for a player, but be safe): aim for the
  // nearest walkable neighbour instead so we still close the distance.
  if (!isWalkable(goal.x, goal.y)) {
    const adj = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dy]) => ({ x: goal.x + dx, y: goal.y + dy }))
      .find((n) => inB(n.x, n.y) && isWalkable(n.x, n.y));
    if (!adj) return null;
    goal = adj;
    if (start.x === goal.x && start.y === goal.y) return [];
  }

  const idx = (x, y) => y * W + x;
  const came = new Int32Array(W * W).fill(-1);
  const seen = new Uint8Array(W * W);
  const startI = idx(start.x, start.y), goalI = idx(goal.x, goal.y);
  const q = [startI];
  seen[startI] = 1;
  let head = 0, found = false;
  while (head < q.length) {
    const ci = q[head++];
    if (ci === goalI) { found = true; break; }
    const cx = ci % W, cy = (ci / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (!inB(nx, ny)) continue;
      const ni = idx(nx, ny);
      if (seen[ni] || !isWalkable(nx, ny)) continue;
      seen[ni] = 1; came[ni] = ci; q.push(ni);
    }
  }
  if (!found) return null;

  const path = [];
  for (let c = goalI; c !== startI; c = came[c]) {
    path.push({ x: c % W, y: (c / W) | 0 });
    if (came[c] < 0) break; // defensive (should always reach start)
  }
  path.reverse();
  return path;
}

module.exports = { findPath };
