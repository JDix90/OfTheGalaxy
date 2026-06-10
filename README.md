# Of the Galaxy: RPG Foundation

A browser-based, single-player open-world RPG. Players create a character,
explore a galaxy of planets, take quests from NPCs, fight turn-based battles,
collect loot, and progress — all backed by a Node/Express + PostgreSQL API and a
React + Canvas frontend.

> **Note on setting/IP:** the current content layer uses Star Wars planets,
> factions, and species explicitly. This is fine for internal development but is
> **not clearable for commercial release** without a license. A re-theme to an
> original universe is mostly a content-layer find/replace and is under
> discussion with the client. Avoid authoring large amounts of new Star-Wars-named
> content until that decision is made.

---

## Current status (verified June 2026)

This project was built in a first cycle (Nov 2025 – Feb 2026), paused, and is now
being resumed. The status below reflects what the **code actually does**, which
differs from some of the older "COMPLETE" claims in the archived docs.

### Works end-to-end ✅
- Character creation → quest acceptance → travel → turn-based combat → loot/XP →
  quest turn-in → level-up. The core loop is real and connected.
- Combat math, progression/XP curves, and derived-stat formulas are coherent
  (no negative HP, divide-by-zero, or runaway scaling).
- Galaxy map, planet surfaces, and sub-maps/dungeons render and are navigable.
- Inventory/equipment, factions, crafting, vendors, NPC dialogue (template +
  optional OpenAI), and procedural dungeon/NPC generation are implemented.

### Partial / in progress ⚠️
- **Save/Load:** saving works; restoring game state on the frontend is a stub
  (`SaveLoadView.jsx` TODO) — finish before any player-facing release.
- **Onboarding/tutorial:** fully designed in the archived docs, but largely
  unimplemented in code. Flagged by reviewers as the top churn risk.
- **Faction reputation:** tracked but not yet enforced as a quest/itemgate.
- **Dungeon generation:** functional; room-connectivity is validated but not
  yet auto-repaired on failure.
- **Companions / achievements:** backend scaffolding only.

### Known large refactors pending 🔧
- `frontend/src/pages/SubMapView.jsx` (~4,200 lines) and `PlanetSurface.jsx`
  (~2,900 lines) are god components and should be split.
- Test coverage is thin (~14 backend + 10 frontend test files). CI runs them but
  proves little until coverage grows.

### Security hardening done in this cycle 🔒
- Committed secrets removed from `.env`/`.env.example`; JWT secret rotated; a
  pre-commit secret guard added. **You must still revoke the old OpenAI key and
  rotate the DB password** — see [`SECURITY_ROTATION.md`](./SECURITY_ROTATION.md).
- IDOR holes closed: character/quest/combat endpoints now verify the
  authenticated user owns the target (`backend/src/middleware/ownership.js`).
- AI dialogue endpoint is now rate-limited and player input is sanitized/length-
  capped before reaching the model.
- Combat reward distribution (XP + credits + loot) is now atomic (DB
  transaction) with numeric-validation guards; quest-objective updates lock the
  row; quest start uses `findOrCreate` to avoid duplicate-progress races.

---

## Tech stack
- **Backend:** Node.js, Express, Sequelize ORM, PostgreSQL, JWT auth, OpenAI
  (`gpt-4o-mini`) for optional NPC dialogue.
- **Frontend:** React 18, Vite, Zustand, HTML5 Canvas rendering, axios.

## Quick start

### Prerequisites
Node.js ≥ 18, npm ≥ 9, PostgreSQL ≥ 14.

### Backend
```bash
cd backend
cp .env.example .env          # then fill in real values (see SECURITY_ROTATION.md)
npm install
npm run migrate
npm run seed
npm run dev                   # http://localhost:3001
```

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173
```

Open http://localhost:5173, create an account and a character, and start playing.

### Enable the secret guard (recommended, once this is a git repo)
```bash
git config core.hooksPath .githooks
```

---

## Project structure
```
backend/    Node/Express API (controllers → services → models, migrations, seeds)
frontend/   React/Vite app (pages, features, components, state, canvas utils)
content/    Game content JSON (faction quests, NPCs, planets, lore)
docs/       Current docs; docs/archive/ holds historical/superseded docs
scripts/    Dev/security tooling (e.g. check-secrets.sh)
```

## Documentation
Authoritative docs live at the repo root:
- [`GETTING_STARTED.md`](./GETTING_STARTED.md) — quick start
- [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) / [`TROUBLESHOOTING_POSTGRES.md`](./TROUBLESHOOTING_POSTGRES.md)
- [`TESTING_GUIDE.md`](./TESTING_GUIDE.md) / [`TESTING_QUICK_START.md`](./TESTING_QUICK_START.md)
- [`AUTH_SETUP_INSTRUCTIONS.md`](./AUTH_SETUP_INSTRUCTIONS.md) / [`AI_SETUP_INSTRUCTIONS.md`](./AI_SETUP_INSTRUCTIONS.md)
- [`SECURITY_ROTATION.md`](./SECURITY_ROTATION.md) — **read before deploying**
- [`CONSULTANT_HANDOFF_README.md`](./CONSULTANT_HANDOFF_README.md) — resume context

Historical design docs, phase records, and analyses are archived under
[`docs/archive/`](./docs/archive/) and are **not** authoritative — trust the code
and this README over them.

## Scripts
**Backend:** `npm run dev | migrate | seed | test`
**Frontend:** `npm run dev | build | test | test:e2e`

## License
Private project — all rights reserved. (Setting/IP re-theme pending; see note above.)
