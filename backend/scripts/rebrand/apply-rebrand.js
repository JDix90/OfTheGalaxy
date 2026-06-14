#!/usr/bin/env node
/**
 * apply-rebrand.js — Deterministic Star Wars -> "The Severed Reach" replacement.
 *
 * Usage (run from repo root or anywhere):
 *   node backend/scripts/rebrand/apply-rebrand.js --phase=display      [--write]
 *   node backend/scripts/rebrand/apply-rebrand.js --phase=identifiers  [--write]
 *   node backend/scripts/rebrand/apply-rebrand.js --rename-paths        [--write]
 *
 * Default is DRY RUN: prints per-file change counts, a token histogram, and a few
 * before/after samples. Add --write to apply.
 *
 * Algorithm: one left-to-right pass over each file using a single ordered-
 * alternation regex (keys sorted longest-first) wrapped in boundary lookarounds.
 * Ordered alternation + outer boundary yields longest-VALID match and never
 * re-scans replacement output, so there is no cascade and the op is idempotent.
 *   - display     boundary: (?<![A-Za-z]) ... (?![A-Za-z])     case-sensitive
 *   - identifiers boundary: (?<![A-Za-z0-9]) ... (?![A-Za-z0-9])
 */

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '../../..');
const MAP = JSON.parse(fs.readFileSync(path.join(__dirname, 'term-map.json'), 'utf8'));

const ROOTS = ['content', 'backend/src', 'backend/tests', 'backend/scripts', 'frontend/src', 'frontend/tests', 'PLANETS_EXPORT.json'];
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', 'build', '.git', 'migrations']);
const EXCLUDE_PATH_SUBSTR = ['backend/scripts/rebrand/']; // never edit our own tooling
const EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.md']);

function parseArgs() {
  const a = { phase: null, write: false, renamePaths: false, samples: 12 };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--phase=')) a.phase = arg.split('=')[1];
    else if (arg === '--write') a.write = true;
    else if (arg === '--rename-paths') a.renamePaths = true;
    else if (arg.startsWith('--samples=')) a.samples = parseInt(arg.split('=')[1], 10);
  }
  return a;
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function buildRegex(map, kind) {
  const keys = Object.keys(map).sort((x, y) => y.length - x.length || (x < y ? -1 : 1));
  const alt = keys.map(escapeRe).join('|');
  const b = kind === 'display' ? '[A-Za-z]' : '[A-Za-z0-9]';
  return new RegExp(`(?<!${b})(?:${alt})(?!${b})`, 'g');
}

function* walk(absRoot) {
  const st = fs.statSync(absRoot);
  if (st.isFile()) { yield absRoot; return; }
  for (const name of fs.readdirSync(absRoot)) {
    const p = path.join(absRoot, name);
    const rel = path.relative(REPO, p);
    if (EXCLUDE_PATH_SUBSTR.some(s => rel.includes(s))) continue;
    const s = fs.statSync(p);
    if (s.isDirectory()) {
      if (EXCLUDE_DIRS.has(name)) continue;
      yield* walk(p);
    } else if (EXTS.has(path.extname(name)) && !name.endsWith('.map')) {
      yield p;
    }
  }
}

function collectFiles() {
  const files = [];
  for (const r of ROOTS) {
    const abs = path.join(REPO, r);
    if (fs.existsSync(abs)) for (const f of walk(abs)) files.push(f);
  }
  return files;
}

function applyText(text, regex, map, hist) {
  let count = 0;
  const out = text.replace(regex, (m) => {
    const rep = map[m];
    if (rep === undefined) return m;
    count++; hist[m] = (hist[m] || 0) + 1;
    return rep;
  });
  return { out, count };
}

function runReplace(phase, write) {
  const map = MAP[phase];
  if (!map) { console.error(`Unknown phase: ${phase}`); process.exit(1); }
  const regex = buildRegex(map, phase);
  const files = collectFiles();
  const hist = {};
  const changedFiles = [];
  const samples = [];
  let totalHits = 0;

  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    const { out, count } = applyText(text, regex, map, hist);
    if (count > 0) {
      totalHits += count;
      changedFiles.push([path.relative(REPO, f), count]);
      if (samples.length < parseArgs().samples) {
        // capture first differing line for a sample
        const tl = text.split('\n'), ol = out.split('\n');
        for (let i = 0; i < tl.length; i++) {
          if (tl[i] !== ol[i]) { samples.push([path.relative(REPO, f), tl[i].trim(), ol[i].trim()]); break; }
        }
      }
      if (write) fs.writeFileSync(f, out);
    }
  }

  console.log(`\n=== phase: ${phase}  (${write ? 'WRITE' : 'DRY RUN'}) ===`);
  console.log(`files scanned: ${files.length}   files changed: ${changedFiles.length}   total replacements: ${totalHits}`);
  console.log(`\nTop replaced terms:`);
  Object.entries(hist).sort((a, b) => b[1] - a[1]).slice(0, 30)
    .forEach(([k, n]) => console.log(`  ${String(n).padStart(4)}  ${k} -> ${map[k]}`));
  console.log(`\nMost-changed files:`);
  changedFiles.sort((a, b) => b[1] - a[1]).slice(0, 20)
    .forEach(([f, n]) => console.log(`  ${String(n).padStart(4)}  ${f}`));
  console.log(`\nSample line diffs:`);
  samples.forEach(([f, a, b]) => {
    console.log(`  ${f}`);
    console.log(`    - ${a.slice(0, 160)}`);
    console.log(`    + ${b.slice(0, 160)}`);
  });
  if (!write) console.log(`\n(dry run — re-run with --write to apply)`);
}

function renamePaths(write) {
  const map = MAP.identifiers;
  const regex = buildRegex(map, 'identifiers');
  // Gather all paths under roots that are dirs or files, deepest first.
  const all = [];
  function rec(abs) {
    if (EXCLUDE_PATH_SUBSTR.some(s => path.relative(REPO, abs).includes(s))) return;
    const s = fs.statSync(abs);
    if (s.isDirectory()) {
      if (EXCLUDE_DIRS.has(path.basename(abs))) return;
      for (const n of fs.readdirSync(abs)) rec(path.join(abs, n));
      all.push([abs, true]);
    } else {
      all.push([abs, false]);
    }
  }
  for (const r of ROOTS) {
    const abs = path.join(REPO, r);
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) rec(abs);
  }
  // deepest first so children rename before parents
  all.sort((a, b) => b[0].length - a[0].length);
  const renames = [];
  for (const [abs] of all) {
    const dir = path.dirname(abs), base = path.basename(abs);
    const ext = path.extname(base);
    const stem = ext && !fs.statSync(abs).isDirectory() ? base.slice(0, -ext.length) : base;
    const newStem = stem.replace(regex, (m) => map[m] ?? m);
    if (newStem !== stem) {
      const newBase = fs.statSync(abs).isDirectory() ? newStem : newStem + ext;
      renames.push([abs, path.join(dir, newBase)]);
    }
  }
  console.log(`\n=== rename-paths  (${write ? 'WRITE' : 'DRY RUN'}) ===`);
  console.log(`${renames.length} path(s) to rename:`);
  for (const [from, to] of renames) {
    console.log(`  ${path.relative(REPO, from)}\n    -> ${path.relative(REPO, to)}`);
    if (write) fs.renameSync(from, to);
  }
  if (!write) console.log(`\n(dry run — re-run with --write to apply)`);
}

const args = parseArgs();
if (args.renamePaths) renamePaths(args.write);
else if (args.phase) runReplace(args.phase, args.write);
else { console.error('Specify --phase=display|identifiers or --rename-paths'); process.exit(1); }
