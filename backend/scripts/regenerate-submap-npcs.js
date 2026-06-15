/**
 * regenerate-submap-npcs.js — reseed procedurally-generated submap NPCs for a planet.
 *
 * Why: submap NPCs are persisted + shared across characters, and `generateSubMapNPCs` does
 * NOT regenerate when a submap already has NPCs. So stale rows (e.g. pre-rebrand "Star Wars"
 * names, or a tutorial NPC that was wrongly relocated into every facility) stick around. This
 * tool clears ONLY the procedural NPCs (ids matching `<submapId>_npc_<n>`) — it never touches
 * the tutorial NPC (`npc_tutorial_*`) or authored content NPCs — then regenerates each submap
 * with the current type/faction-aware generator so each facility gets fitting NPCs.
 *
 * It also relocates the onboarding tutorial NPC back onto the planet's spaceport submap (its
 * correct home), undoing the old "Jax follows you everywhere" bug for existing saves.
 *
 *   node scripts/regenerate-submap-npcs.js [planetId]   (default: sinkport)
 */

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const { Sequelize } = require('sequelize');
const { sequelize, SubMap, NPC } = require('../src/models');
const npcGenerator = require('../src/services/npcGenerator');
const { Planet } = require('../src/models');

const PROC_NPC_RE = /_npc_\d+$/; // procedural submap NPC id suffix

async function main() {
  const planetId = process.argv[2] || 'sinkport';
  const planet = await Planet.findByPk(planetId);
  if (!planet) throw new Error(`Planet not found: ${planetId}`);

  const subMaps = await SubMap.findAll({ where: { planetId } });
  const spaceport = subMaps.find((s) => s.type === 'spaceport');

  console.log(`\n=== Regenerating submap NPCs for ${planetId} (faction: ${planet.factionControl || 'none'}) ===`);
  console.log(`Found ${subMaps.length} submaps; spaceport: ${spaceport ? spaceport.id : 'none'}\n`);

  // 1) Relocate the tutorial NPC back to the spaceport IF it drifted into one of THIS planet's
  //    own non-spaceport submaps (the old "Jax follows you into the clinic" bug). We only touch
  //    tutorial NPCs whose current submap belongs to this planet, so running the script for one
  //    planet never yanks a tutorial NPC off another planet's spaceport.
  if (spaceport) {
    const planetSubMapIds = new Set(subMaps.map((s) => s.id));
    const tutorialNPCs = await NPC.findAll({
      where: { id: { [Sequelize.Op.like]: 'npc_tutorial_%' } },
    });
    for (const t of tutorialNPCs) {
      const sid = t.location && t.location.subMapId;
      if (sid && sid !== spaceport.id && planetSubMapIds.has(sid)) {
        await t.update({
          location: { planet: planetId, area: 'submap', subMapId: spaceport.id, x: 4, y: 6 },
        });
        console.log(`Relocated tutorial NPC ${t.id} (${t.name}) -> spaceport ${spaceport.id}`);
      }
    }
  }

  // 2) Per submap: drop procedural NPCs, then regenerate.
  for (const sm of subMaps) {
    if (sm.type === 'dungeon') continue;

    const before = await NPC.findBySubMap(sm.id);
    const procIds = before.filter((n) => PROC_NPC_RE.test(n.id)).map((n) => n.id);
    if (procIds.length) {
      await NPC.destroy({ where: { id: procIds } });
    }

    const generated = await npcGenerator.generateSubMapNPCs(sm, planet);
    const after = await NPC.findBySubMap(sm.id);

    console.log(`\n## ${sm.id}  [type=${sm.type} tmpl=${sm.template}]`);
    console.log(`   cleared ${procIds.length} procedural, generated ${generated.length}, now ${after.length} total`);
    after
      .sort((a, b) => (a.npcType || '').localeCompare(b.npcType || ''))
      .forEach((n) =>
        console.log(`   - ${n.name} | type=${n.npcType} | occ=${n.occupation} | faction=${n.factionId}`)
      );
  }

  await sequelize.close();
  console.log('\nDone.');
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  console.error(e.stack);
  process.exit(1);
});
