# Feature Plans — Roadmap Items 15–17

Design + implementation plans for the three "future opportunity" features identified in the UX review. Each plan is grounded in what the codebase **already has** vs. what is **net-new**, then broken into shippable phases with concrete files, effort, risk, dependencies, and success criteria.

Status: **planning only** — nothing here is implemented yet.

---

## 15 — Relationship / Reputation with Visible Consequences

**The one-liner:** the plumbing is already deep; the player just can't *see* or *feel* it. Turn invisible numbers into visible, motivating consequences.

### What already exists (don't rebuild)
- **Per-NPC relationships** — `NPCRelationship` model with tiers (Stranger → Acquaintance → Friend → Confidant), `relationshipLevel` (0–100), `increaseRelationship()`. The "Stranger 0/100" meter already renders in dialogue. Relationship already nudges vendor prices (`relationshipBonus` in `vendorService.calculatePrice`) and dialogue greetings (`greeting.stranger/acquaintance/friend/confidant`).
- **Per-faction reputation** — `FactionReputation` model + `factionService`, tiers (neutral/friendly/trusted/allied/revered), `checkPrerequisites(reputationMap)` already gates quests, `minReputationTier` already gates vendor items.
- **NPC psychology layer** — `emotionalStateService`, `memoryService`, `motivationService`, `trustService` all exist and feed dialogue.
- **Full faction roster screen** (just built, #10).

### The gaps (why it doesn't *land* today)
1. `factionBonus` in pricing is a **hardcoded placeholder (= 0)** — faction rep does nothing to prices.
2. Consequences are **silent** — rep/relationship change with no notification, no tier-up moment.
3. Gates are **hidden, not teased** — a rep-locked item/quest just doesn't appear, so the player never learns the system or sets a goal.
4. **No cross-faction politics** — helping the Concord doesn't anger the Iron Dominion; there's no allies/rivals matrix.
5. NPC behavior barely changes with standing beyond a dialogue-tier swap.

### Vision
Standing is a **currency you watch grow and spend.** Prices drop, dialogue opens, quests unlock, doors that were closed visibly open — and every gain costs something with a rival. The player always knows *where they stand, what it's getting them, and what it's costing them*.

### Phased plan

**Phase A — Wire & surface the existing levers (highest ROI, low risk).**
- Implement `factionBonus` in `vendorService.calculatePrice`/`calculateSellPrice`: map the buyer's `FactionReputation` tier → discount (e.g. friendly −3%, trusted −6%, allied −10%), capped.
- **Price breakdown UI** in `TradingView`: show "Base 300 · Faction −6% · Relationship −5% = 268" so the discount is legible.
- **Reputation-change toasts** (reuse the toast component built for #8): "Concord +3 → Friendly" on every rep/relationship delta; emit from `factionService`/`NPCRelationship.increaseRelationship`.
- **Tier-up celebration** — a small modal when crossing a tier ("You are now *Trusted* with the Concord — new wares unlocked").
- Files: `backend/src/services/vendorService.js`, `factionService.js`, `models/NPCRelationship.js`; `frontend/.../trading/TradingView.jsx`, a shared `<RepToast/>` + `<TierUpModal/>`, `state/factionSlice.js`.

**Phase B — Teasing locks instead of hidden gates.**
- Vendor items / quests / dialogue options that are rep-gated render in a **locked state** with the requirement ("🔒 Requires *Friendly* with the Keeper Order") instead of disappearing.
- Faction card (`FactionCard`) gains an **"unlocks" track**: at each tier, what you gain (discounts, wares, quests, access). Reuse `majorFactions.js` to attach tier rewards.
- Files: `TradingView.jsx`, `QuestLog`, `DialogueInterface.jsx`, `FactionCard.jsx`, `majorFactions.js`.

**Phase C — Cross-faction politics (net-new).**
- New data file `backend/src/data/factionRelations.js`: an allies/rivals matrix (e.g. Concord ↔ Iron Dominion = hostile; Keeper Order ↔ Hollow = hostile; Drift Cartel ↔ the Tally = rivals).
- New `factionService.applyReputationChange(characterId, factionId, delta)` that **ripples**: gaining with A loses a fraction with A's rivals. Route all rep changes through it.
- Surface it: "The Iron Dominion will remember this." Hostile-faction NPCs refuse trade / give worst prices / are flagged attackable.
- Files: `data/factionRelations.js`, `factionService.js`, `npcService.js` (service refusal), combat targeting flags.

**Phase D — Relationship depth (longer arc).**
- Lean on the existing `memoryService`/`trustService`: NPCs reference past player choices in dialogue; key NPCs have loyalty arcs; companion recruitment gated on relationship tier.
- Optional: a "Known Characters" screen mirroring the Factions screen, showing relationship tiers + remembered facts.

### Effort / Risk
- A: ~2–3 days, low risk (wiring + UI). B: ~2 days, low. C: ~3–4 days, medium (touches rep flow broadly — guard with the existing transaction patterns). D: ongoing.

### Success criteria
A new player, within one session, (1) sees a price drop attributable to rep, (2) gets a visible tier-up, (3) sees at least one teased lock they want to open, and (4) experiences one "you angered the other side" moment.

---

## 16 — Authored 10-Minute Golden-Path Onboarding

**The one-liner:** the tutorial is mechanically complete but narratively hollow. Wrap the existing 8-step skeleton in an authored story with a hook, a memorable guide, and a payoff.

### What already exists
- **Dockside Initiation** tutorial quest — 8 objectives (move → talk → fight a training opponent → loot → heal → sell → open galaxy map → return). Now background-neutral and coherent (#5).
- **Tutorial state machine** — `tutorialStateMachine.js` (67 states), reactive `TutorialOverlay`, per-background guide NPC config in `tutorialService.getTutorialConfigForBackground`.
- The **galaxy-map reveal** is already the strongest "wow" beat in the game.

### The gaps
- No story **hook** — the player has no reason to care in the first 60 seconds.
- The guide is a **prop**, not a character ("your dockside contact").
- No **emotional payoff** or first meaningful **choice**.
- Pacing isn't tuned to ~10 minutes; no authored copy.

### Vision
A scripted ~10-minute first session that teaches every core system *through* a small, self-contained story — and ends by handing the player a clear thread to pull, plus a faction-flavored first choice. Lore-anchored to the rebrand (the Veil, the Severed Reach, Concord vs. Iron Dominion).

### Beat sheet (target timings)
1. **0:00 Cold open** — arrival on Solenne (Hanna City Spaceport); 2 lines of world-setting (the galaxy is severed; foldspace lanes barely hold).
2. **1:00 Meet the guide** — author **Dockmaster Jax** fully: a name, a voice, a problem ("a Dominion patrol drone slipped its leash on the dock"). Teaches *move + talk*.
3. **2:30 First threat** — the drone (the existing "training opponent") attacks; teaches *combat*, with the guide narrating.
4. **4:00 Aftermath** — loot the wreck, *use a medpac* (now "Regen Patch"); the guide reacts to how you fought (ties to #15 relationship).
5. **5:30 Economic beat** — sell salvage / buy one item at Jax's stall; teaches *trade* + shows the price-breakdown from #15.
6. **7:00 The hook deepens** — the drone carried a fragment of a Veil-resonance signal; Jax can't read it — "you'll want someone off-world for that."
7. **8:00 Payoff: galaxy-map reveal** — *open the galaxy map, pick a destination*; the reveal lands as the emotional high.
8. **9:00 First real choice** — two follow-on threads (e.g. take the fragment to a Keeper contact on Caldon vs. a Drift Cartel buyer on Sinkport) that set a faction lean and a Phase-1 main-quest hook.

### Phased plan
- **Phase A — Author the content.** Write Jax as a character (dialogue across relationship tiers), the cold-open lines, per-beat narration, and the closing two-choice fork. Store as authored content (`content/factions/.../npcs/dockmaster_jax.json`, a `content/tutorial/golden_path.json` script). Keep the existing state machine as the skeleton; map authored copy onto states.
- **Phase B — Wire the branch + payoff.** Implement the closing choice as a real branch that creates the first main-quest thread (reuse `questDependencyService`). Make the galaxy-map reveal a deliberate beat (brief focus/zoom on the reveal).
- **Phase C — Pace & polish.** Tune timings, ensure every tooltip anchors to its target (builds on the #5 anchoring + #12 highlighted-guide marker), add a clean **Skip** for returning players, and a one-screen recap at the end ("Here's what you can do now").
- **Phase D — Instrument.** Log step timestamps to a dev metric so the ~10-min target and drop-off points are measurable.

### Effort / Risk
~4–6 days, mostly **writing + wiring** (low technical risk — the systems exist). The creative bar (good dialogue, a memorable guide) is the real cost. Best done *after* #15 Phase A so the relationship beat in step 4 pays off, and after #17 Phase A so the combat/loot beats have juice.

### Success criteria
A first-time player reaches the galaxy-map reveal and accepts a follow-on quest in ~8–12 minutes, can name the guide, and can state their immediate goal when asked.

---

## 17 — Game-Feel Pass (Juice, Audio, Level-Up & Loot Drama)

**The one-liner:** the systems work but don't *feel* good. Add the feedback layer that makes every action satisfying. Audio is fully greenfield (no system exists today).

### What already exists
- Turn-based combat with a **text Combat Log**, static **VictoryScreen**, crit/dodge logic, HP/stamina bars.
- **Item rarity** (`getRarityColor`/`getRarityBorderColor`) and item sets/special effects — color exists, drama doesn't.
- **No audio at all** (no lib, no `Audio`/`AudioContext` usage, no audio settings section).

### Vision
Every hit, crit, dodge, level-up, and rare drop produces a small, satisfying burst of feedback — visual *and* audible — without hurting the canvas-render performance budget. Fully toggleable for accessibility.

### Phased plan

**Phase A — Visual juice (no external assets, lowest risk, highest felt impact).**
- **Floating damage numbers** over combatant cards; crits bigger + gold + a brief screen-shake; misses show a grey "miss"/whiff; dodges show "✨ dodged".
- **Hit reactions** — flash/shake the struck combatant card; tween HP bars instead of snapping.
- **Level-up modal** — animate the stat increases, surface any new ability/skill point, fanfare styling (reuse the VictoryScreen aesthetic).
- **Loot rarity reveal** — drop card with a rarity glow/particle and a "Rare!"/"Epic!" banner; rarity color already available.
- **Micro-feedback** — discovery flourish (builds on the First-Discovery badge), equip/purchase pulses (pairs with the #8 toast).
- Files: `features/combat/CombatView.jsx` + `CombatLog.jsx` + new `DamageNumber`/`FloatingText` component, `VictoryScreen.jsx`, a new `LevelUpModal`, `InventorySlot`/`ItemTooltip`, small CSS keyframe utilities. Pure CSS/JS animation; respects a `prefers-reduced-motion` flag.

**Phase B — Audio system (net-new; has an asset/licensing dependency).**
- Add a lightweight audio manager — **Howler.js** (or a thin Web Audio wrapper) — singleton service `frontend/src/services/audioManager.js` with `play(sfxId)`, channel volumes, and preloading.
- New **audio settings section** in `settingsSlice` (master / SFX / music sliders, mute) + a Settings UI panel.
- Wire SFX to events via the existing event buses (`tutorialEventBus` pattern): hit / crit / miss / dodge / level-up / loot-by-rarity / UI click / purchase / travel / discovery.
- Ambient loops per location archetype (spaceport hum, market chatter, ice wind) + light combat stinger/music.
- **Dependency:** royalty-free/CC0 audio assets must be sourced and license-cleared (e.g. Kenney, Freesound CC0, or commissioned). Flag this as a procurement task — code can ship with a silent/placeholder pack first.

**Phase C — Polish & accessibility.**
- `prefers-reduced-motion` + an explicit "Reduce motion / screen shake" toggle; audio sliders; "juice intensity" setting.
- Performance guard: damage-number/particle pooling so the canvas maps + combat keep frame budget; cap concurrent effects.

### Effort / Risk
- A: ~3–5 days, low risk, big perceived-quality jump — **do this first.**
- B: ~3–4 days code + **separate asset-sourcing track** (the long pole; start procurement early).
- C: ~2 days.

### Success criteria
Landing a crit, leveling up, and getting a rare drop each produce a distinct, satisfying multi-sensory beat; everything is toggleable; no measurable FPS regression on the sub-map/combat screens.

---

## Recommended sequencing

These reinforce each other, so order matters:

1. **#17 Phase A (visual juice)** first — fastest path to "this feels like a real game," and it makes the onboarding's combat/loot beats land.
2. **#15 Phase A + B (wire & surface standing)** next — cheap, high-ROI, and it gives the onboarding its relationship beat.
3. **#16 (authored golden path)** — now the 10-minute story can show off juicy combat *and* visible standing.
4. **#15 Phase C (faction politics)** and **#17 Phase B (audio)** — larger, parallelizable tracks; start audio asset procurement early since it's the long pole.
5. **#15 Phase D, #17 Phase C** — depth + polish.

**Cross-cutting reuse:** the toast component (#8), the tutorial event buses, the rarity/format utilities, and `majorFactions.js` are leveraged across all three — build shared `<Toast/>`, `<FloatingText/>`, and an `audioManager` once and reuse.
