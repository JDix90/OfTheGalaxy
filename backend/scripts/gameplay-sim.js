/**
 * Gameplay simulation harness.
 *
 * Drives the REAL shipped game logic (combat resolution, enemy scaling, derived
 * stats, progression, item/economy data) to measure how the game actually plays:
 * progression pacing, combat time-to-kill, win rates, difficulty curve, economy.
 *
 * Pure-logic only (no DB). Run:  node scripts/gameplay-sim.js
 */

const { calculateCombatStats } = require('../src/utils/derivedStats');
const enemy = require('../src/data/enemyTemplates');
const { getItemDefinition } = require('../src/data/items');
const combat = require('../src/services/combatService'); // singleton; calculateDamage is pure

const TRIALS = 4000;
const r2 = (n) => Math.round(n * 100) / 100;

// ---------- formulas mirrored from the models (PlayerCharacter) ----------
const xpToNext = (level) => Math.floor(100 * Math.pow(level, 1.25));
const maxHealthAt = (level, end) => 100 + (end - 10) * 10 + (level - 1) * 5;

// ---------- build a faithful player combatant ----------
function makePlayer({ level, stats, weaponId, armorId }) {
  const weapon = weaponId ? getItemDefinition(weaponId) : null;
  const armor = armorId ? getItemDefinition(armorId) : null;
  const weaponBase = weapon?.stats?.damage ?? 10;
  const armorBase = armor?.stats?.defense ?? 0;
  const character = { level, stats, skills: {}, abilities: [] };
  const cs = calculateCombatStats({ character, equipment: { weaponBase, armorBase } });
  // per-level accuracy growth, mirrors combatService.buildPlayerCombatant
  const baseAcc = weapon?.stats?.accuracy ?? (70 + Math.floor((stats.perception || 10) / 2));
  const accuracy = baseAcc + Math.min(8, level * 0.5);
  const maxHealth = maxHealthAt(level, stats.endurance || 10);
  return {
    name: 'Player', type: 'player', statusEffects: [],
    stats: {
      attack: Math.floor(cs.attackRating.value),
      defense: Math.floor(cs.defenseRating.value),
      accuracy,
      critChance: cs.critChance.value,
      dodgeChance: cs.dodgeChance.value,
      health: maxHealth, maxHealth
    },
    _derived: { attack: Math.floor(cs.attackRating.value), defense: Math.floor(cs.defenseRating.value), crit: r2(cs.critChance.value), dodge: r2(cs.dodgeChance.value), acc: accuracy, hp: maxHealth }
  };
}

function makeEnemy(templateId, level, difficulty = 'moderate') {
  const scaled = enemy.scaleEnemyForLevel(enemy.getEnemyTemplate(templateId), level, difficulty);
  return {
    name: scaled.name, type: 'enemy', statusEffects: [],
    stats: { ...scaled.stats, critChance: 0.05, dodgeChance: Math.min(0.15, Math.max(0, ((scaled.stats.speed || 10) - 10) * 0.01)), health: scaled.stats.health, maxHealth: scaled.stats.maxHealth },
    xpReward: scaled.xpReward, creditsReward: scaled.creditsReward,
    _t: { hp: scaled.stats.health, atk: scaled.stats.attack, def: scaled.stats.defense, acc: scaled.stats.accuracy }
  };
}

// ---------- simulate one fight (player acts first each round) ----------
function simulateFight(playerProto, enemyProto) {
  const p = JSON.parse(JSON.stringify(playerProto));
  const e = JSON.parse(JSON.stringify(enemyProto));
  let turns = 0, dmgDealt = 0, dmgTaken = 0, hits = 0, swings = 0, crits = 0;
  while (p.stats.health > 0 && e.stats.health > 0 && turns < 100) {
    turns++;
    const a = combat.calculateDamage(p, e); swings++;
    if (a.hit) { hits++; if (a.critical) crits++; }
    e.stats.health -= a.damage; dmgDealt += a.damage;
    if (e.stats.health <= 0) break;
    const b = combat.calculateDamage(e, p);
    p.stats.health -= b.damage; dmgTaken += b.damage;
  }
  return { win: e.stats.health <= 0 && p.stats.health > 0, turns, dmgDealt, dmgTaken, hits, swings, crits, hpLeft: Math.max(0, p.stats.health) };
}

function runMatrix(label, playerProto, enemyProto) {
  let wins = 0, turns = 0, taken = 0, hits = 0, swings = 0, crits = 0, hpLeft = 0;
  for (let i = 0; i < TRIALS; i++) {
    const s = simulateFight(playerProto, enemyProto);
    if (s.win) wins++;
    turns += s.turns; taken += s.dmgTaken; hits += s.hits; swings += s.swings; crits += s.crits; hpLeft += s.hpLeft;
  }
  return {
    label,
    winRate: r2((wins / TRIALS) * 100),
    avgTurns: r2(turns / TRIALS),
    avgDmgTakenPct: r2((taken / TRIALS) / playerProto.stats.maxHealth * 100),
    hitRate: r2((hits / swings) * 100),
    critRate: r2((crits / Math.max(1, hits)) * 100),
    avgHpLeftPct: r2((hpLeft / TRIALS) / playerProto.stats.maxHealth * 100)
  };
}

// ===================== 1. PROGRESSION CURVE =====================
console.log('\n========== 1. PROGRESSION CURVE ==========');
console.log('Lvl | XP to next | Cumulative | MaxHP(end13)');
let cum = 0;
const cumByLevel = { 1: 0 };
for (let L = 1; L <= 20; L++) {
  const next = xpToNext(L);
  console.log(`${String(L).padStart(3)} | ${String(next).padStart(10)} | ${String(cum).padStart(10)} | ${maxHealthAt(L, 13)}`);
  cum += next; cumByLevel[L + 1] = cum;
}

// ===================== 2. PLAYER POWER BY LEVEL =====================
console.log('\n========== 2. PLAYER DERIVED STATS (naive vs optimized build) ==========');
// naive: starter pistol + light armor, modest attributes; optimized: upgrade gear + invest STR/END
function naiveStats(L) { return { strength: 13, agility: 11, endurance: 13, perception: 12, intelligence: 10, charisma: 10 }; }
function optStats(L) { const inv = Math.floor((L - 1) / 3) * 2; return { strength: 13 + inv, agility: 11, endurance: 13 + inv, perception: 12, intelligence: 10, charisma: 10 }; }
const naiveGear = { weaponId: 'blaster_pistol_01', armorId: 'armor_light_01' };
const optGearByLevel = (L) => L >= 12 ? { weaponId: 'blaster_rifle_01', armorId: 'armor_heavy_01' } : L >= 6 ? { weaponId: 'blaster_rifle_01', armorId: 'armor_medium_01' } : { weaponId: 'blaster_pistol_01', armorId: 'armor_light_01' };
console.log('Lvl | naive ATK/DEF/crit/acc/HP        | optimized ATK/DEF/crit/acc/HP');
for (const L of [1, 3, 5, 8, 12, 16, 20]) {
  const n = makePlayer({ level: L, stats: naiveStats(L), ...naiveGear })._derived;
  const o = makePlayer({ level: L, stats: optStats(L), ...optGearByLevel(L) })._derived;
  console.log(`${String(L).padStart(3)} | ${n.attack}/${n.defense}/${n.crit}/${n.acc}/${n.hp}`.padEnd(36) + ` | ${o.attack}/${o.defense}/${o.crit}/${o.acc}/${o.hp}`);
}

// ===================== 3. COMBAT: MATCHED-LEVEL DIFFICULTY CURVE =====================
console.log('\n========== 3. MATCHED-LEVEL FIGHTS vs Stormtrooper (moderate) ==========');
console.log('Build    | Lvl | win% | avgTurns | dmgTaken% | hit% | crit% | avgHPleft%');
for (const [buildName, statFn, gearFn] of [['naive', naiveStats, () => naiveGear], ['optimized', optStats, optGearByLevel]]) {
  for (const L of [1, 3, 5, 8, 12, 16, 20]) {
    const player = makePlayer({ level: L, stats: statFn(L), ...gearFn(L) });
    const foe = makeEnemy('stormtrooper', L, 'moderate');
    const m = runMatrix('', player, foe);
    console.log(`${buildName.padEnd(8)} | ${String(L).padStart(3)} | ${String(m.winRate).padStart(4)} | ${String(m.avgTurns).padStart(8)} | ${String(m.avgDmgTakenPct).padStart(9)} | ${String(m.hitRate).padStart(4)} | ${String(m.critRate).padStart(5)} | ${m.avgHpLeftPct}`);
  }
}

// ===================== 4. ENEMY VARIETY @ L5 (optimized build) =====================
console.log('\n========== 4. ENEMY VARIETY @ Player L5 (optimized build, moderate) ==========');
const p5 = makePlayer({ level: 5, stats: optStats(5), ...optGearByLevel(5) });
console.log('Enemy                | win% | avgTurns | dmgTaken% | avgHPleft%');
for (const id of ['wild_animal', 'stormtrooper', 'pirate', 'syndicate_thug', 'droid_security', 'bounty_hunter', 'pirate_captain', 'stormtrooper_sergeant']) {
  const tmpl = enemy.getEnemyTemplate(id);
  if (!tmpl) { console.log(`${id} (missing)`); continue; }
  const foe = makeEnemy(id, 5, 'moderate');
  const m = runMatrix('', p5, foe);
  console.log(`${tmpl.name.padEnd(20)} | ${String(m.winRate).padStart(4)} | ${String(m.avgTurns).padStart(8)} | ${String(m.avgDmgTakenPct).padStart(9)} | ${m.avgHpLeftPct}`);
}

// ===================== 5. OVER/UNDER-LEVELED (optimized L10) =====================
console.log('\n========== 5. PLAYER L10 vs MISMATCHED ENEMY LEVELS (Stormtrooper) ==========');
const p10 = makePlayer({ level: 10, stats: optStats(10), ...optGearByLevel(10) });
console.log('EnemyLvl | win% | avgTurns | dmgTaken% | avgHPleft%');
for (const eL of [5, 8, 10, 13, 16, 20]) {
  const foe = makeEnemy('stormtrooper', eL, 'moderate');
  const m = runMatrix('', p10, foe);
  console.log(`${String(eL).padStart(8)} | ${String(m.winRate).padStart(4)} | ${String(m.avgTurns).padStart(8)} | ${String(m.avgDmgTakenPct).padStart(9)} | ${m.avgHpLeftPct}`);
}

// ===================== 6. ECONOMY =====================
console.log('\n========== 6. ECONOMY: credits/fight vs item prices ==========');
for (const L of [1, 5, 10]) {
  const foe = makeEnemy('stormtrooper', L, 'moderate');
  console.log(`L${L} stormtrooper: ${foe.creditsReward} credits, ${foe.xpReward} XP per kill`);
}
const sampleItems = ['blaster_pistol_01', 'blaster_rifle_01', 'armor_light_01', 'armor_medium_01', 'armor_heavy_01'];
for (const id of sampleItems) {
  const it = getItemDefinition(id);
  if (it) console.log(`  ${id.padEnd(22)} value=${it.value ?? it.price ?? '?'}  dmg=${it.stats?.damage ?? '-'} def=${it.stats?.defense ?? '-'}`);
}

// ===================== 7. FIGHTS-TO-LEVEL pacing =====================
console.log('\n========== 7. PACING: fights-to-next-level (moderate stormtrooper) ==========');
console.log('Lvl | xpToNext | xp/kill | kills to level');
for (const L of [1, 3, 5, 8, 12, 16]) {
  const xpKill = makeEnemy('stormtrooper', L, 'moderate').xpReward;
  console.log(`${String(L).padStart(3)} | ${String(xpToNext(L)).padStart(8)} | ${String(xpKill).padStart(7)} | ${(xpToNext(L) / xpKill).toFixed(1)}`);
}

console.log('\n(simulation complete)\n');
