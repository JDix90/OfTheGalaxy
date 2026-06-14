/**
 * Golden-path instrumentation (development only).
 *
 * Records a timestamp each time the tutorial enters a new state so we can measure
 * actual pacing against the authored ~10-minute (600s) target in
 * content/tutorial/golden_path.json and spot where players stall or drop off.
 *
 * No-ops in production builds. In dev it logs each step delta to the console and
 * persists marks to localStorage (so a mid-tutorial reload doesn't lose the run).
 * Call `window.tutorialMetrics.report()` in the console for a per-step summary.
 */

const TARGET_SECONDS = 600;
const STORAGE_KEY = 'otg.tutorialMetrics.v1';
const isDev = !!(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV);

let marks = []; // [{ state, atMs, sinceStartMs }]

function _persist() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(marks));
    }
  } catch (_) { /* storage may be unavailable; non-fatal */ }
}

function _restore() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) marks = JSON.parse(raw) || [];
    }
  } catch (_) { marks = []; }
}

_restore();

/** Record entry into a tutorial state. Ignores repeats of the current state. */
function mark(state) {
  if (!isDev || !state) return;
  const now = Date.now();

  if (marks.length === 0) {
    marks = [{ state, atMs: now, sinceStartMs: 0 }];
    _persist();
    console.log(`[TutorialMetrics] start → ${state}`);
    return;
  }

  const last = marks[marks.length - 1];
  if (last.state === state) return;

  const startMs = marks[0].atMs;
  const entry = { state, atMs: now, sinceStartMs: now - startMs };
  marks.push(entry);
  _persist();

  const stepSec = ((now - last.atMs) / 1000).toFixed(1);
  const totalSec = (entry.sinceStartMs / 1000).toFixed(1);
  const overUnder = entry.sinceStartMs / 1000 > TARGET_SECONDS ? ' ⚠ over target' : '';
  console.log(`[TutorialMetrics] ${last.state} → ${state}  (+${stepSec}s · total ${totalSec}s / ${TARGET_SECONDS}s)${overUnder}`);
}

/** Per-step summary for the current/last run. */
function report() {
  if (marks.length === 0) return { marks: [], totalSeconds: 0, targetSeconds: TARGET_SECONDS, steps: [] };
  const steps = [];
  for (let i = 1; i < marks.length; i++) {
    steps.push({
      from: marks[i - 1].state,
      to: marks[i].state,
      deltaSeconds: +((marks[i].atMs - marks[i - 1].atMs) / 1000).toFixed(1)
    });
  }
  const totalSeconds = +((marks[marks.length - 1].atMs - marks[0].atMs) / 1000).toFixed(1);
  const summary = { totalSeconds, targetSeconds: TARGET_SECONDS, steps, marks };
  if (isDev) console.table(steps);
  return summary;
}

/** Clear the recorded run (e.g. when a fresh tutorial begins). */
function reset() {
  marks = [];
  _persist();
}

const tutorialMetrics = { mark, report, reset };

// Expose for quick console inspection in dev.
if (isDev && typeof window !== 'undefined') {
  window.tutorialMetrics = tutorialMetrics;
}

export default tutorialMetrics;
