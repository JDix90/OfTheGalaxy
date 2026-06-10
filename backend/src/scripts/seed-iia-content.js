/**
 * Seed Independent Investigators (IIA) Core Content
 * - Seeds main quest: iia_main_01_compound_investigation
 * - Seeds key NPCs required for that quest:
 *   - npc_mira_kess (from JSON)
 *   - npc_jax_riven (placeholder minimal NPC)
 *   - npc_coordinator_valen (placeholder quest giver)
 *
 * This keeps the database in sync enough for:
 * - Content validation (reference checks)
 * - Early in-game testing of the Compound 7-Alpha arc
 */

/* eslint-disable no-console */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize, Quest, NPC } = require('../models');

async function ensureNPC(npcData) {
  const existing = await NPC.findByPk(npcData.id);
  if (existing) {
    console.log(`NPC already exists: ${npcData.id}`);
    return existing;
  }

  const created = await NPC.create({
    id: npcData.id,
    name: npcData.name,
    species: npcData.species || 'human',
    occupation: npcData.occupation || null,
    factionId: npcData.factionId || null,
    location: npcData.location || {
      planet: null,
      area: null,
      x: 0,
      y: 0
    },
    npcType: npcData.npcType || 'generic',
    isCompanion: npcData.isCompanion || false,
    dialogue: npcData.dialogue || undefined,
    quests: npcData.quests || [],
    vendorInventory: npcData.vendorInventory || null,
    companionAbilities: npcData.companionAbilities || null,
    companionStats: npcData.companionStats || null,
    appearance: npcData.appearance || {},
    biography: npcData.biography || null,
    isAvailable: typeof npcData.isAvailable === 'boolean' ? npcData.isAvailable : true,
    personalityTraits: npcData.personalityTraits || undefined
  });

  console.log(`Created NPC: ${created.id}`);
  return created;
}

async function ensureQuest(questData) {
  const existing = await Quest.findByPk(questData.id);
  if (existing) {
    console.log(`Quest already exists: ${questData.id}`);
    return existing;
  }

  const created = await Quest.create({
    id: questData.id,
    factionId: questData.factionId,
    questType: questData.questType,
    title: questData.title,
    description: questData.description,
    shortDescription: questData.shortDescription,
    prerequisites: questData.prerequisites,
    objectives: questData.objectives,
    rewards: questData.rewards,
    questGiverId: questData.questGiverId,
    startLocation: questData.startLocation,
    estimatedTime: questData.estimatedTime,
    difficulty: questData.difficulty,
    isActive: typeof questData.isActive === 'boolean' ? questData.isActive : true,
    chainId: questData.chainId,
    chainOrder: questData.chainOrder
  });

  console.log(`Created Quest: ${created.id}`);
  return created;
}

async function seedIIAContent() {
  try {
    console.log('🚀 Seeding Independent Investigators (IIA) core content...');

    // Load quest JSON
    const questPath = path.join(
      __dirname,
      '../../..',
      'content',
      'factions',
      'independent_investigators',
      'main_quests',
      '01_compound_investigation.json'
    );
    const questJson = JSON.parse(fs.readFileSync(questPath, 'utf-8'));

    // Load Mira from JSON
    const miraPath = path.join(
      __dirname,
      '../../..',
      'content',
      'factions',
      'independent_investigators',
      'npcs',
      'mira_kess.json'
    );
    const miraJson = JSON.parse(fs.readFileSync(miraPath, 'utf-8'));

    // Coordinator Valen (minimal seed data)
    const coordinatorValen = {
      id: 'npc_coordinator_valen',
      name: 'Coordinator Valen',
      species: 'human',
      occupation: 'Alliance Coordinator',
      factionId: 'independent_investigators',
      location: {
        planet: 'chandrila',
        area: 'refugee_settlement',
        x: 90,
        y: 70
      },
      npcType: 'quest_giver',
      isCompanion: false,
      dialogue: {
        greeting: {
          stranger: 'Welcome. We can always use another set of eyes on these reports.',
          acquaintance: 'Back again? Good. We have more to uncover.',
          friend: 'I trust your judgment. These refugees need someone like you.',
          confidant: 'There are things the official reports will never say. That\'s why we need you.'
        },
        questRelated: {
          [questJson.id]:
            'These refugees from Compound 7-Alpha carry stories the Alliance never fully heard. Talk to Mira and Jax—start with their truths.'
        },
        general: [
          'The Alliance archives only tell part of the story. Survivors tell the rest.',
          'Every survivor from Compound 7-Alpha is a datapoint the Empire wanted erased.'
        ]
      },
      quests: [questJson.id],
      biography:
        'Coordinator Valen oversees Independent Investigators operations on Chandrila, focusing on refugee testimony and war crime documentation.',
      isAvailable: true
    };

    // Jax Riven (minimal seed data so objectives have a valid target)
    const jaxRiven = {
      id: 'npc_jax_riven',
      name: 'Jax Riven',
      species: 'human',
      occupation: 'Former Compound Resident',
      factionId: 'independent_investigators',
      location: {
        planet: 'chandrila',
        area: 'refugee_settlement',
        x: 140,
        y: 95
      },
      npcType: 'generic',
      isCompanion: false,
      dialogue: {
        greeting: {
          stranger: 'You want to talk about the compound? Make it quick.',
          acquaintance: 'You again. Fine. What do you need to know?',
          friend: 'If Valen trusts you, I guess I can too.',
          confidant: 'There are things I remember that I wish I could forget. But... maybe it\'s time.'
        },
        questRelated: {
          [questJson.id]:
            'I remember the day they brought me into 7-Alpha. The smell of disinfectant. The sound of the doors sealing behind me.'
        },
        general: [
          'Some nights I still wake up expecting to see those white walls.',
          'Mira and I don\'t always agree on what happened. Trauma does that.'
        ]
      },
      quests: [questJson.id],
      biography:
        'Jax Riven survived the intake and processing systems of Compound 7-Alpha. His fragmented memories form a crucial part of the investigation.',
      isAvailable: true
    };

    // Ensure NPCs
    await ensureNPC(miraJson);
    await ensureNPC(coordinatorValen);
    await ensureNPC(jaxRiven);

    // Ensure quest
    await ensureQuest(questJson);

    console.log('✅ IIA core content seeded successfully.');
  } catch (error) {
    console.error('✗ Failed to seed IIA content:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed.');
  }
}

if (require.main === module) {
  seedIIAContent();
}

module.exports = { seedIIAContent };




