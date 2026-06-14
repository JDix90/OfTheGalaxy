'use strict';

/**
 * 017-rebrand-severed-reach.js
 *
 * Rewrites all stored Star Wars identifiers to "The Severed Reach" originals so the
 * database matches the renamed code/content. Idempotent and transactional.
 *
 * It loads the SAME identifier map the source rename used
 * (backend/scripts/rebrand/term-map.json) and applies the SAME longest-match
 * transform to every id-bearing column and to JSONB blobs (save slots, NPC/quest
 * locations, conversation context). This guarantees stored data lines up exactly
 * with the renamed planet/faction/item/species/quest identifiers.
 *
 * Notes
 *  - The faction id "resistance" was handled surgically in source (it collides with
 *    the combat stat "resistance"), so it is supplemented here for faction columns.
 *  - down() applies a best-effort inverse. The rename is intentionally lossy for a
 *    few many-to-one tokens (e.g. mandalorian/mandalorians -> ironkin), so a perfect
 *    restore of those is not guaranteed; everything else round-trips.
 */

const path = require('path');
const fs = require('fs');

function loadIdMap() {
  const p = path.resolve(__dirname, '../../scripts/rebrand/term-map.json');
  const map = JSON.parse(fs.readFileSync(p, 'utf8')).identifiers;
  // Faction-only supplement (see header note).
  map['resistance'] = 'uprising';
  return map;
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function buildTransform(map) {
  const keys = Object.keys(map).sort((a, b) => b.length - a.length || (a < b ? -1 : 1));
  const re = new RegExp(`(?<![A-Za-z0-9])(?:${keys.map(escapeRe).join('|')})(?![A-Za-z0-9])`, 'g');
  return (val) => (typeof val === 'string' ? val.replace(re, (m) => (map[m] !== undefined ? map[m] : m)) : val);
}

function invert(map) {
  const inv = {};
  for (const [k, v] of Object.entries(map)) if (!(v in inv)) inv[v] = k; // first wins (best-effort)
  return inv;
}

// Deep-transform every string value AND object key in a JSON blob.
function deepTransform(node, t) {
  if (Array.isArray(node)) return node.map((n) => deepTransform(n, t));
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[t(k)] = deepTransform(v, t);
    return out;
  }
  return t(node);
}

// Scalar string columns: [table, [columns...]]
const SCALAR_COLUMNS = [
  ['player_characters', ['current_planet', 'species']],
  ['faction_reputation', ['faction_id']],
  ['discoveries', ['planet_id', 'location_id']],
  ['poi_interactions', ['planet_id']],
  ['player_inventory', ['item_id']],
  ['quest_progress', ['quest_id']],
  // Seeded tables (reseeded from content, but migrated too for safety/idempotency):
  ['planets', ['id', 'system_id']],
  ['star_systems', ['id']],
  ['travel_routes', ['from_system_id', 'to_system_id', 'route_type']],
  ['npcs', ['id', 'faction_id', 'species']],
  ['quests', ['id', 'faction_id']],
  ['items', ['id', 'faction_id']],
  ['sub_maps', ['planet_id', 'parent_location_id']],
];

// JSONB columns to deep-transform: [table, column]
const JSONB_COLUMNS = [
  ['save_slots', 'save_data'],
  ['npcs', 'location'],
  ['quests', 'start_location'],
  ['quests', 'mini_quest_data'],
];

async function tableExists(qi, table) {
  const [rows] = await qi.sequelize.query(
    `SELECT to_regclass(:t) AS reg`, { replacements: { t: `public.${table}` } }
  );
  return rows && rows[0] && rows[0].reg;
}

async function columnExists(qi, table, column) {
  const [rows] = await qi.sequelize.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = :table AND column_name = :column LIMIT 1`,
    { replacements: { table, column } }
  );
  return rows && rows.length > 0;
}

async function migrateScalars(qi, t, transaction) {
  for (const [table, columns] of SCALAR_COLUMNS) {
    if (!(await tableExists(qi, table))) continue;
    for (const column of columns) {
      if (!(await columnExists(qi, table, column))) continue;
      const [rows] = await qi.sequelize.query(
        `SELECT DISTINCT "${column}" AS v FROM "${table}" WHERE "${column}" IS NOT NULL`,
        { transaction }
      );
      for (const { v } of rows) {
        const nv = t(v);
        if (nv !== v) {
          await qi.sequelize.query(
            `UPDATE "${table}" SET "${column}" = :nv WHERE "${column}" = :v`,
            { replacements: { nv, v }, transaction }
          );
        }
      }
    }
  }
}

async function migrateJsonb(qi, t, transaction) {
  for (const [table, column] of JSONB_COLUMNS) {
    if (!(await tableExists(qi, table)) || !(await columnExists(qi, table, column))) continue;
    // Use a primary key for targeted updates; all these tables have an "id" pk.
    const [rows] = await qi.sequelize.query(
      `SELECT id, "${column}" AS blob FROM "${table}" WHERE "${column}" IS NOT NULL`,
      { transaction }
    );
    for (const row of rows) {
      let parsed = row.blob;
      if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch { continue; } }
      const next = deepTransform(parsed, t);
      const a = JSON.stringify(parsed), b = JSON.stringify(next);
      if (a !== b) {
        await qi.sequelize.query(
          `UPDATE "${table}" SET "${column}" = :b ::jsonb WHERE id = :id`,
          { replacements: { b, id: row.id }, transaction }
        );
      }
    }
  }
}

module.exports = {
  async up(queryInterface) {
    const map = loadIdMap();
    const t = buildTransform(map);
    await queryInterface.sequelize.transaction(async (transaction) => {
      await migrateScalars(queryInterface, t, transaction);
      await migrateJsonb(queryInterface, t, transaction);
    });
  },

  async down(queryInterface) {
    const inv = invert(loadIdMap());
    const t = buildTransform(inv);
    await queryInterface.sequelize.transaction(async (transaction) => {
      await migrateScalars(queryInterface, t, transaction);
      await migrateJsonb(queryInterface, t, transaction);
    });
  },
};
