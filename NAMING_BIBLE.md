# Naming Bible — Of the Galaxy: The Severed Reach

**Status:** ✅ EXECUTED (2026-06-13). Source rename complete across content,
backend, frontend, scripts, and tests (zero residual SW terms). DB migration
written (`backend/src/migrations/017-rebrand-severed-reach.js`) — run it in CI /
a privileged DB to migrate stored player data. Validation: 35 backend logic +
24 frontend util + 8 component tests pass; gameplay-sim clean with balance intact.

Tooling: `backend/scripts/rebrand/{build-term-map.js, term-map.json, apply-rebrand.js}`.

### Execution addendum — names finalized during the pass
Items found in the live codebase that weren't in the original tables:
- **Sequel/underworld factions:** First Order → **the Ascendancy** (`first_order`→`ascendancy`),
  Resistance → **the Uprising** (`resistance`→`uprising`, handled surgically — collides
  with the combat stat "resistance"), Black Sun → **the Umbra** (`black_sun`→`umbra`),
  Crimson Dawn → **the Scarlet Tide** (`crimson_dawn`→`scarlet_tide`),
  Separatists → **Secessionists** (`separatist(s)`→`secession`).
- **Cities/regions:** Lessu (Ryloth's capital) → **Sythmar** (`lessu`→`sythmar`),
  Jundland Wastes → **Sunder Wastes** (`jundland`→`sunder`).
- **Travel:** `route_type` enum value `hyperlane` → **`foldlane`** (model `isIn` +
  migration 002 default aligned).
- **Article fixes:** "an Imperial" → "a Dominion", "a stormtrooper" → "an ironclad".
- Kept on purpose: `forceAlignment`/`forceSensitive` (internal, generic), `Credits`,
  `Human`, galactic region names, the combat stat "resistance".
- Fixed a pre-existing malformed JSON surfaced by the pass
  (`drift_cartel/main_quests/01_wyrm_legend.json`).

**Goal:** Replace all Star Wars IP with an original, legally-clean universe while
preserving the game's tone (galaxy-spanning space-opera RPG), every archetype
(desert world, city-world, ice world, forest moon, warrior clan, crime syndicate,
mystic order), and all mechanics. The replacement is **1:1** so the swap is
deterministic.

---

## 0. The setting (new universe)

**Title: _Of the Galaxy: The Severed Reach_**

The **Severed Reach** is a vast, post-collapse galaxy threaded by **foldspace** —
collapsed lanes that allow faster-than-light travel. A unifying field of living
energy called **the Veil** runs through all things; a rare few can sense and
channel it. Centuries ago a galactic union was severed by war; today its reformed
successor (**the Concord**) contests power with an authoritarian successor-state
(**the Iron Dominion**), while crime broods, clans war, and Veil-touched are hunted
or revered. Same beats, original names.

Tone, factions' *roles*, planet *archetypes*, and species *niches* are all
preserved — only the names change.

---

## 1. The Veil & the mystic orders  (replaces the Force / Jedi / Sith)

| Star Wars term | New term | Type | Notes |
|---|---|---|---|
| The Force | **the Veil** | lore/display | the living energy field |
| Force-sensitive | **Veil-touched** | display | |
| Light side | **the Woven Veil** | display | the intact, healthy field |
| Dark side | **the Torn Veil** | display | corruption / severance |
| Jedi / Jedi Order | **Keepers / the Keeper Order** | display + `factionId` | `jedi_seekers`→`keeper_seekers`, `jedi_scholars`→`keeper_scholars` |
| Sith | **the Hollow** | display + `factionId` | those severed from — or hollowed of — the Veil |
| Lightsaber | **arcblade** | display + `itemId` | `lightsaber*`→`arcblade*` |
| Jedi Temple (POI) | **Keeper Sanctum** | display + POI id | derives from planet rename |
| "Using the Force" | **reading / drawing the Veil** | display | NPC dialogue flavor |

## 2. Major factions  (`backend/src/config/factionProfiles.js` + content `factionId`s)

| Star Wars | New name | `factionId` change |
|---|---|---|
| Galactic Republic | **the Old Concord** | `galactic_republic`→`old_concord` |
| New Republic | **the Concord** | `new_republic`→`concord` |
| Republic Military | **Concord Vanguard** | `republic_military`→`concord_vanguard` |
| Galactic Empire | **the Iron Dominion** | `galactic_empire`→`iron_dominion` |
| Imperial Remnant | **Dominion Remnant** | `imperial_remnant`→`dominion_remnant` |
| Stormtrooper | **Ironclad Legionnaire** | enemy template `stormtrooper`→`ironclad` (+ `ironclad_sergeant`) |
| Rebel Alliance | **the Free Worlds** | `rebel_alliance`→`free_worlds` |
| Mandalorians | **the Ironkin (Clan Veshk)** | `mandalorians`→`ironkin` |
| Hutts (crime species) | **the Vorr** | `hutts`→`vorr`; "Grakka the Hutt"→"Grakka the Vorr" |
| Smugglers Guild/Alliance | **the Drift Cartel** | `smugglers_guild`→`drift_cartel`, `smugglers_alliance`→`drift_alliance` |
| Bounty Hunters | **the Tally** | `bounty_hunters`→`the_tally` |
| **Already generic — KEEP** | corporate_sector, outer_rim_settlers, independent_investigators, diplomatic_corps, medical_corps, pilots_guild, tech_guild | no change |

## 3. Species  (NPC generation, character creation — display + species keys)

| Star Wars | New species | niche preserved |
|---|---|---|
| Human | **Human** (keep — generic) | baseline |
| Twi'lek | **Sytheen** | graceful, tendrilled; homeworld Sytha |
| Wookiee | **Ursk** | tall, fur-covered, forest-world (Verdholm) |
| Zabrak | **Karnaki** | horned, hardy |
| Chiss | **Vorne** | blue-skinned, cold-world tacticians; homeworld Vornhal |
| Rodian | **Skarn** | reptilian, big-eyed hunters; homeworld Vashqa |
| Mirialan | **Jeharu** | tattooed ascetics, Veil-inclined |
| Togruta | **Sethari** | montral'd pack-hunters |
| Ewok | **Brindle** | small forest-dwellers (Verdance moon) |
| Bothan | **Renai** | spies/information brokers; homeworld Renqa |
| Gungan | **Marrow** | amphibious |
| Sullustan | **Dell** | subterranean pilots; homeworld Pyrren |
| Trandoshan | **Skrag** | reptilian trackers |

## 4. Planets, moons & systems  (FULL — all 88 seeded bodies)

The galaxy seeder (`backend/src/seeds/galaxySeeder.js`) populates **88 bodies**
across the galaxy map — every one is clickable, so every one is renamed here.
Names are matched to each world's actual archetype (type + climate). Bodies with
authored content (★) or map data (☆) are flagged.

### Core Worlds

| Star Wars | New name | `planetId` | Archetype |
|---|---|---|---|
| Coruscant ★ | **Centralis** | `coruscant`→`centralis` | ecumenopolis / capital |
| Corellia | **Drydock** | `corellia`→`drydock` | shipyards, industrial |
| Drall | **Brae** | `drall`→`brae` | Drydock-system sibling, terrestrial |
| Selonia | **Mereth** | `selonia`→`mereth` | Drydock-system sibling, ocean |
| Alderaan | **Caelmore** | `alderaan`→`caelmore` | peaceful, tragic history |
| Chandrila *(START world)* ☆ | **Solenne** | `chandrila`→`solenne` | temperate safe hub |
| Kuat | **Forgeline** | `kuat`→`forgeline` | orbital shipyards |
| Brentaal | **Tradewell** | `brentaal`→`tradewell` | trade hub |
| Commenor | **Coriane** | `commenor`→`coriane` | trade |
| Ansion | **Greyfield** | `ansion`→`greyfield` | agricultural |

### Colonies

| Star Wars | New name | `planetId` | Archetype |
|---|---|---|---|
| Eriadu | **Greld** | `eriadu`→`greld` | industrial (Dominion) |
| Fondor | **Anvret** | `fondor`→`anvret` | shipyards |
| Rendili | **Dolmark** | `rendili`→`dolmark` | industrial |

### Inner Rim

| Star Wars | New name | `planetId` | Archetype |
|---|---|---|---|
| Mon Cala | **Thessmar** | `mon_cala`→`thessmar` | ocean |
| Dac | **Dorrun** | `dac`→`dorrun` | ocean (Thessmar's deeps) |
| Rodia | **Vashqa** | `rodia`→`vashqa` | jungle; Skarn homeworld |
| Sullust | **Pyrren** | `sullust`→`pyrren` | volcanic; Dell homeworld |
| Bothawui | **Renqa** | `bothawui`→`renqa` | temperate; Renai homeworld (spies) |
| Ithor | **Greenholt** | `ithor`→`greenholt` | jungle, agricultural |

### Mid Rim

| Star Wars | New name | `planetId` | Archetype |
|---|---|---|---|
| Naboo ☆ | **Eloria** | `naboo`→`eloria` | idyllic, lakes |
| Kashyyyk ☆ | **Verdholm** | `kashyyyk`→`verdholm` | forest; Ursk homeworld |
| Ryloth ★ | **Sytha** | `ryloth`→`sytha` | arid; Sytheen homeworld |
| Geonosis | **Karrn** | `geonosis`→`karrn` | desert, insectoid hives |
| Utapau | **Casmer** | `utapau`→`casmer` | arid sinkholes |
| Felucia | **Myssia** | `felucia`→`myssia` | fungal jungle (high danger) |
| Mygeeto | **Glaiv** | `mygeeto`→`glaiv` | ice mining (Dominion) |
| Saleucami | **Saldon** | `saleucami`→`saldon` | temperate, agricultural |
| Cato Neimoidia | **Vexhold** | `cato_neimoidia`→`vexhold` | temperate trade |
| Malastare | **Dustram** | `malastare`→`dustram` | arid mining |
| Onderon | **Veluron** | `onderon`→`veluron` | jungle |
| Dxun | **Drask** | `dxun`→`drask` | jungle "demon-moon" |
| Dantooine ★ | **Caldon** | `dantooine`→`caldon` | grasslands, old Order ties |
| Ryloth Expansion | **Sytha Reach** | `ryloth_expansion`→`sytha_reach` | arid frontier |

### Expansion Region

| Star Wars | New name | `planetId` | Archetype |
|---|---|---|---|
| Taris | **Highspire** | `taris`→`highspire` | urban |
| Telos | **Tellan** | `telos`→`tellan` | temperate |

### Outer Rim

| Star Wars | New name | `planetId` | Archetype |
|---|---|---|---|
| Tatooine ★ | **Gravenmoor** | `tatooine`→`gravenmoor` | twin-sun desert |
| Nar Shaddaa ★ | **Sinkport** | `nar_shaddaa`→`sinkport` | crime moon (Vorr territory) |
| Hoth ☆ | **Rime** | `hoth`→`rime` | ice world |
| Bespin ☆ | **Cirruan** | `bespin`→`cirruan` | gas giant / sky-mining |
| Endor ☆ | **Verdance** | `endor`→`verdance` | forest moon; Brindle homeworld |
| Mandalore | **Veshkar** | `mandalore`→`veshkar` | Ironkin homeworld |
| Concord Dawn | **Dawnmark** | `concord_dawn`→`dawnmark` | Ironkin secondary, arid |
| Dathomir | **Mawthorn** | `dathomir`→`mawthorn` | jungle (very high danger) |
| Mustafar ☆ | **Embervast** | `mustafar`→`embervast` | volcanic |
| Scarif | **Coralsec** | `scarif`→`coralsec` | tropical Dominion vault-world |
| Jakku | **Talveen** | `jakku`→`talveen` | desert wreckage |
| Geonosis Outer | **Karrn Outer** | `geonosis_outer`→`karrn_outer` | desert |
| Ryloth Outer | **Sytha Verge** | `ryloth_outer`→`sytha_verge` | arid frontier |
| Kamino | **Tethys** | `kamino`→`tethys` | ocean; clone/research |
| Dagobah | **Mirefen** | `dagobah`→`mirefen` | jungle swamp |
| Yavin 4 | **Selvora IV** | `yavin_4`→`selvora_4` | jungle; hidden base |
| Yavin Prime | **Selvora** | `yavin_prime`→`selvora_prime` | gas giant |
| Ord Mantell | **Ordwell** | `ord_mantell`→`ordwell` | temperate junk/trade |
| Ryloth Deep | **Sytha Deep** | `ryloth_deep`→`sytha_deep` | arid frontier |
| Ryloth Wild | **Sytha Wilds** | `ryloth_wild`→`sytha_wilds` | arid wilds |

### Wild Space / Unknown Regions

| Star Wars | New name | `planetId` | Archetype |
|---|---|---|---|
| Exegol | **Nyxar** | `exegol`→`nyxar` | barren; **the Hollow** stronghold |
| Ilum | **Kthala** | `ilum`→`kthala` | ice; arcblade-crystal source (Keeper lore) |
| Ahch-To | **Esh-Vael** | `ahch_to`→`esh_vael` | ocean; first Keeper Sanctum |
| Ryloth Unknown | **Sytha Fringe** | `ryloth_unknown`→`sytha_fringe` | arid |
| Csilla | **Vornhal** | `csilla`→`vornhal` | ice; Vorne homeworld |
| Naporar | **Naveth** | `naporar`→`naveth` | temperate; Vorne secondary |

### Moons (parent-derived; ids follow the new parent)

| Star Wars | New name | `planetId` |
|---|---|---|
| Coruscant Moon | Centralis Moon | `coruscant_moon`→`centralis_moon` |
| Kuat Moon | Forgeline Moon | `kuat_moon`→`forgeline_moon` |
| Kuat II | Forgeline II | `kuat_2`→`forgeline_2` |
| Naboo Moon | Eloria Moon | `naboo_moon`→`eloria_moon` |
| Alderaan Moon I | Caelmore Moon I | `alderaan_moon_1`→`caelmore_moon_1` |
| Mon Cala Moon | Thessmar Moon | `mon_cala_moon`→`thessmar_moon` |
| Rodia Moon | Vashqa Moon | `rodia_moon`→`vashqa_moon` |
| Sullust Moon | Pyrren Moon | `sullust_moon`→`pyrren_moon` |
| Bothawui Moon | Renqa Moon | `bothawui_moon`→`renqa_moon` |
| Geonosis Moon | Karrn Moon | `geonosis_moon`→`karrn_moon` |
| Utapau Moon | Casmer Moon | `utapau_moon`→`casmer_moon` |
| Felucia Moon | Myssia Moon | `felucia_moon`→`myssia_moon` |
| Mygeeto Moon | Glaiv Moon | `mygeeto_moon`→`glaiv_moon` |
| Saleucami Moon | Saldon Moon | `saleucami_moon`→`saldon_moon` |
| Cato Neimoidia Moon | Vexhold Moon | `cato_neimoidia_moon`→`vexhold_moon` |
| Malastare Moon | Dustram Moon | `malastare_moon`→`dustram_moon` |
| Tatooine Moon | Gravenmoor Moon | `tatooine_moon`→`gravenmoor_moon` |
| Hoth Moon | Rime Moon | `hoth_moon`→`rime_moon` |
| Bespin Moon I | Cirruan Moon I | `bespin_moon_1`→`cirruan_moon_1` |
| Endor Moon | Verdance Moon | `endor_moon`→`verdance_moon` |
| Kamino Moon | Tethys Moon | `kamino_moon`→`tethys_moon` |
| Dagobah Moon | Mirefen Moon | `dagobah_moon`→`mirefen_moon` |
| Yavin 8 | Selvora VIII | `yavin_8`→`selvora_8` |
| Ord Mantell Moon | Ordwell Moon | `ord_mantell_moon`→`ordwell_moon` |
| Nar Shaddaa Moon | Sinkport Moon | `nar_shaddaa_moon`→`sinkport_moon` |
| Ilum Moon | Kthala Moon | `ilum_moon`→`kthala_moon` |
| Ahch-To Moon | Esh-Vael Moon | `ahch_to_moon`→`esh_vael_moon` |

### Systems

Each `*_system` body derives its id and display name from its **primary planet's
new name** (e.g. `coruscant_system` / "Coruscant System" → `centralis_system` /
"Centralis System"; `corellia_system` → `drydock_system`; the six Ryloth systems →
`sytha_*_system`; `chiss_space_system` / "Chiss Space System" → `vorne_reaches_system`
/ "Vorne Reaches System"). The `term-map.json` lists each system explicitly so the
rename + DB migration stay deterministic — no inference at runtime.

*Sub-location POI ids derive from the planet + faction renames automatically
(e.g. `coruscant_jedi_temple` → `centralis_keeper_sanctum`).*

*Navmeshes (`backend/src/data/navmeshes/`) are named after planetId — rename the
files alongside the id change: `tatooine_navmesh.json`→`gravenmoor_navmesh.json`,
`hoth_navmesh.json`→`rime_navmesh.json`, `dantooine_navmesh.json`→`caldon_navmesh.json`,
`nar_shaddaa_navmesh.json`→`sinkport_navmesh.json`.*

## 5. Weapons & tech

| Star Wars | New term | Type |
|---|---|---|
| Blaster (pistol/rifle) | **pulser** (pulse pistol / pulse rifle) | display + `itemId` (`blaster_*`→`pulser_*`) |
| Lightsaber | **arcblade** | display + `itemId` (`lightsaber*`→`arcblade*`) |
| Specific models (DL-44, E-11, etc.) | original model codes (e.g. **VK-7**, **L-11**) | `itemId` |
| Vibroblade | **shock-blade** | display + `itemId` |
| Hyperspace / hyperlane | **foldspace / fold-lanes** | display |
| Galactic Senate | **the Concord Assembly** | display |
| Credits (currency) | **Credits** (keep — generic) | no change |

---

## 6. Execution plan

**Two layers, validated after each:**

1. **Display strings** (names, descriptions, dialogue, lore text) — find/replace
   across `content/`, `backend/src/data/`, `frontend/src/data/`, and UI copy.
   Safe, reversible, no DB migration. Run the test suites + gameplay sim to
   confirm nothing broke.
2. **Identifiers** (`factionId`, `planetId`, `itemId`, species keys, enemy
   template keys) — a coordinated rename across code + seed/content JSON **plus a
   DB migration** that rewrites stored keys in `faction_reputation.faction_id`,
   `player_characters.current_planet`, `discoveries.planet_id`, save-slot JSON,
   and inventory `item_id`. Wrap the migration in a transaction; provide a
   down-migration. Test against a seeded DB in CI.
3. **Scrub the public repo** — the rename commit clears SW terms going forward.
   Prior commits still contain them; a full history rewrite is optional and
   separate from this execution.

**Mechanical safety:** a generated `term-map.json` (SW→new, longest-match-first,
word-boundary-aware) drives the replacement so it's deterministic and reviewable
as a single diff. Identifiers and display strings get separate maps so the
DB migration can target only the id changes.

---

### Pending trademark check
Before launch, commission a trademark search on the coined names. Notable: the
universe title (**The Severed Reach**), the orders (**Keepers**, **the Hollow**),
factions (**Iron Dominion**, **Drift Cartel**, **the Tally**, **Ironkin**,
**Ironclad Legionnaire**), the 13 species, and all 88 body names. "Credits" and
"Human" are kept precisely because they are generic.

**Avoided collision (caught during scoping):** "Halcyon" is used by Star Wars
(*Galactic Starcruiser Halcyon*) — the start world was renamed **Solenne** instead.
Re-scan the final coined list for any other franchise overlaps before launch.
