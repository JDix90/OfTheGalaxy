/**
 * POI Coordinate Reconciliation Tool
 * Reconciles POI coordinates across all documents and creates single source of truth
 */

const fs = require('fs');
const path = require('path');

// Single source of truth for all POI coordinates (0-1000 internal format)
const POI_COORDINATES = {
  caldon: [
    { id: 'keeper_enclave_ruins', name: 'Keeper Enclave Ruins', x: 500, y: 500 },
    { id: 'venox_cave', name: 'Venox Cave', x: 200, y: 800 },
    { id: 'matale_estate', name: 'Matale Estate', x: 700, y: 300 },
    { id: 'sandral_estate', name: 'Sandral Estate', x: 300, y: 200 },
    { id: 'khoonda_settlement', name: 'Khoonda Settlement', x: 600, y: 700 }
  ],
  sytha: [
    { id: 'sythmar', name: 'Sythmar (Capital City)', x: 500, y: 500 },
    { id: 'bright_lands', name: 'The Bright Lands', x: 800, y: 500 },
    { id: 'nightlands', name: 'The Nightlands', x: 200, y: 500 },
    { id: 'sytheen_resistance_base', name: "Sytheen Uprising Base", x: 400, y: 600 },
    { id: 'dominion_garrison', name: 'Dominion Garrison', x: 600, y: 400 }
  ],
  solenne: [
    { id: 'hanna_city', name: 'Hanna City', x: 900, y: 500 }, // Using v2.0 spec (900, 500) as it's more recent
    { id: 'silver_sea', name: 'Silver Sea', x: 650, y: 500 },
    { id: 'gladean_state_park', name: 'Gladean State Park', x: 250, y: 500 },
    { id: 'concord_senate', name: 'Concord Assembly Building', x: 850, y: 400 }
  ],
  greld: [
    { id: 'greld_city', name: 'Greld City', x: 950, y: 500 },
    { id: 'vethan_estate', name: 'The Vethan Estate', x: 700, y: 300 },
    { id: 'carrion_plateau', name: 'The Carrion Plateau', x: 750, y: 800 },
    { id: 'seswenna_academy', name: 'Seswenna Sector Military Academy', x: 300, y: 600 }
  ],
  sinkport: [
    { id: 'refugee_sector', name: 'The Refugee Sector', x: 300, y: 700 },
    { id: 'red_light_sector', name: 'The Red Light Sector', x: 600, y: 400 },
    { id: 'vorr_palace', name: 'The Vorr Cartel Palace', x: 500, y: 500 },
    { id: 'undercity', name: 'The Undercity', x: 200, y: 950 },
    { id: 'spaceport', name: 'The Spaceport', x: 800, y: 800 }
  ],
  axxila: [
    { id: 'crystal_mines', name: 'The Crystal Mines', x: 500, y: 850 },
    { id: 'singing_caves', name: 'The Singing Caves', x: 800, y: 800 },
    { id: 'axxilan_capital', name: 'The Axxilan Capital', x: 850, y: 850 },
    { id: 'abandoned_mining_station', name: 'The Abandoned Mining Station', x: 100, y: 100 }
  ],
  mawthorn: [
    { id: 'nightsister_stronghold', name: 'The Nightsister Stronghold', x: 850, y: 800 },
    { id: 'gravox_graveyard', name: 'The Gravox Graveyard', x: 800, y: 200 },
    { id: 'singing_mountain_clan', name: "Singing Mountain Clan Village", x: 200, y: 800 },
    { id: 'cursed_swamp', name: 'The Cursed Swamp', x: 100, y: 100 }
  ],
  gravenmoor: [
    { id: 'greywell', name: 'Greywell Spaceport', x: 400, y: 600 },
    { id: 'dustreach', name: 'Dustreach', x: 300, y: 300 },
    { id: 'jabbas_palace', name: "Vorga's Palace", x: 700, y: 200 },
    { id: 'wyrm_dragon_graveyard', name: 'Dune Wyrm Graveyard', x: 800, y: 800 },
    { id: 'sunder_wastes', name: 'Sunder Wastes', x: 200, y: 500 },
    { id: 'anchorhead', name: 'Anchorhead', x: 500, y: 700 }
  ],
  centralis: [
    { id: 'concord_senate', name: 'Concord Assembly Building', x: 500, y: 500 },
    { id: 'keeper_temple_ruins', name: 'The Keeper Sanctum (Ruined)', x: 400, y: 400 },
    { id: 'underworld', name: 'The Underworld', x: 200, y: 975 },
    { id: 'dominion_palace', name: 'The Dominion Palace', x: 600, y: 300 },
    { id: 'galactic_museum', name: 'The Galactic Museum', x: 700, y: 600 }
  ],
  verdholm: [
    { id: 'kachirho', name: 'Kachirho (Tree City)', x: 500, y: 300 },
    { id: 'shadowlands', name: 'The Shadowlands', x: 500, y: 900 },
    { id: 'rwookrrorro', name: 'Rwookrrorro (Ursk Village)', x: 300, y: 400 },
    { id: 'origin_tree', name: 'The Origin Tree', x: 700, y: 500 }
  ],
  thessmar: [
    { id: 'coral_city', name: 'Coral City', x: 850, y: 800 },
    { id: 'kelp_forests', name: 'The Kelp Forests', x: 200, y: 700 },
    { id: 'abyssal_trench', name: 'The Abyssal Trench', x: 800, y: 200 },
    { id: 'dovrek_base', name: 'Dovrek Isolation League Base', x: 100, y: 100 }
  ],
  embervast: [
    { id: 'mining_facility', name: 'The Mining Facility', x: 850, y: 800 },
    { id: 'korrth_keep', name: "Korrth's Keep", x: 800, y: 200 },
    { id: 'lava_falls', name: 'The Lava Falls', x: 200, y: 600 },
    { id: 'obsidian_plains', name: 'The Obsidian Plains', x: 100, y: 100 }
  ],
  myssia: [
    { id: 'fungal_jungle', name: 'The Fungal Jungle', x: 500, y: 500 },
    { id: 'felucian_village', name: 'The Felucian Village', x: 200, y: 900 },
    { id: 'ancient_hollow_temple', name: 'The Ancient Hollow Temple', x: 800, y: 900 },
    { id: 'gravox_den', name: 'The Gravox Den', x: 100, y: 100 }
  ],
  ordwell: [
    { id: 'worlport', name: 'Worlport', x: 800, y: 850 },
    { id: 'scrapyard', name: 'The Scrapyard', x: 500, y: 500 },
    { id: 'umbra_hideout', name: 'The Umbra Hideout', x: 800, y: 200 },
    { id: 'junk_fields', name: 'The Junk Fields', x: 100, y: 100 }
  ],
  forgeline: [
    { id: 'kdy_command_center', name: 'KDY Command Center', x: 500, y: 200 },
    { id: 'black_market_shipyard', name: 'The Black Market Shipyard', x: 800, y: 800 },
    { id: 'resistance_safehouse', name: 'The Uprising Safehouse', x: 200, y: 900 },
    { id: 'abandoned_orbital_prison', name: 'The Abandoned Orbital Prison', x: 100, y: 100 }
  ],
  renqa: [
    { id: 'renai_spynet_hq', name: 'The Renai Spynet Headquarters', x: 500, y: 200 },
    { id: 'umbra_embassy', name: 'The Umbra Embassy', x: 800, y: 800 },
    { id: 'ancient_renai_temple', name: 'The Ancient Renai Temple', x: 200, y: 800 },
    { id: 'shadow_market', name: 'The Shadow Market', x: 100, y: 100 }
  ],
  drydock: [
    { id: 'coronet_spaceport', name: 'The Coronet City Spaceport', x: 500, y: 200 },
    { id: 'umbra_hq', name: 'The Umbra Headquarters', x: 800, y: 800 },
    { id: 'selonian_tunnels', name: 'The Selonian Tunnels', x: 200, y: 800 },
    { id: 'gold_dueling_pits', name: 'The Gold Dueling Pits', x: 100, y: 100 }
  ],
  yavin4: [
    { id: 'great_temple', name: 'The Great Temple', x: 500, y: 500 },
    { id: 'palace_woolamander', name: 'The Palace of the Woolamander', x: 200, y: 900 },
    { id: 'sunken_city', name: 'The Sunken City', x: 800, y: 900 },
    { id: 'dark_side_cave', name: 'The Torn Veil Cave', x: 100, y: 100 }
  ],
  rime: [
    { id: 'echo_base_ruins', name: 'Echo Base Ruins', x: 400, y: 600 },
    { id: 'primary_wampa_lair', name: 'Primary Wampa Lair', x: 800, y: 850 },
    { id: 'main_trench_line', name: 'Main Trench Line', x: 500, y: 500 },
    { id: 'executor_wreckage', name: '*Executor* Wreckage Field', x: 200, y: 800 }
  ],
  cirruan: [
    { id: 'carbon_freezing_chamber', name: 'The Carbon-Freezing Chamber', x: 500, y: 200 },
    { id: 'administrators_palace', name: "The Administrator's Palace", x: 200, y: 500 },
    { id: 'port_town_district', name: 'The Port Town District', x: 800, y: 800 },
    { id: 'floating_gardens', name: 'The Floating Gardens', x: 100, y: 100 }
  ],
  karrn: [
    { id: 'petranaki_arena', name: 'Petranaki Arena', x: 600, y: 400 },
    { id: 'stalgasin_hive', name: 'Stalgasin Hive', x: 300, y: 800 },
    { id: 'progate_temple', name: 'Progate Temple', x: 800, y: 200 },
    { id: 'primary_droid_foundry', name: 'Primary Droid Foundry', x: 850, y: 800 }
  ],
  veshkar: [
    { id: 'sundari', name: 'Sundari, the Capital City', x: 400, y: 875 },
    { id: 'mines_veshkar', name: 'The Mines of Veshkar', x: 900, y: 875 },
    { id: 'great_forge', name: 'The Great Forge', x: 800, y: 200 },
    { id: 'tomb_veshkar_great', name: 'The Tomb of Veshkar the Great', x: 100, y: 100 }
  ]
};

/**
 * Get all POIs for a planet
 */
function getPOIsForPlanet(planetId) {
  return POI_COORDINATES[planetId.toLowerCase()] || [];
}

/**
 * Get a specific POI by ID
 */
function getPOI(planetId, poiId) {
  const pois = getPOIsForPlanet(planetId);
  return pois.find(p => p.id === poiId);
}

/**
 * Validate POI coordinates
 */
function validatePOICoordinates(planetId) {
  const pois = getPOIsForPlanet(planetId);
  const errors = [];

  pois.forEach(poi => {
    if (poi.x < 0 || poi.x > 1000 || poi.y < 0 || poi.y > 1000) {
      errors.push(`POI ${poi.name} (${poi.id}): Coordinates out of range (${poi.x}, ${poi.y})`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    pois
  };
}

/**
 * Export POI coordinates to JSON
 */
function exportPOICoordinates(outputPath) {
  const data = {
    version: '1.0',
    generated: new Date().toISOString(),
    pois: POI_COORDINATES
  };

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`✅ POI coordinates exported to: ${outputPath}`);
}

/**
 * Generate coordinate conversion report
 */
function generateConversionReport() {
  console.log('\n📊 POI Coordinate Reconciliation Report\n');
  console.log('=' .repeat(60));

  let totalPOIs = 0;
  Object.keys(POI_COORDINATES).forEach(planetId => {
    const pois = POI_COORDINATES[planetId];
    totalPOIs += pois.length;
    console.log(`\n${planetId.toUpperCase()}: ${pois.length} POIs`);
    pois.forEach(poi => {
      console.log(`  • ${poi.name}: (${poi.x}, ${poi.y})`);
    });
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Total POIs: ${totalPOIs} across ${Object.keys(POI_COORDINATES).length} planets`);
  console.log('All coordinates in 0-1000 internal format\n');
}

// CLI usage
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'export') {
    const outputPath = process.argv[3] || 'backend/src/data/poi-coordinates.json';
    exportPOICoordinates(outputPath);
  } else if (command === 'report') {
    generateConversionReport();
  } else if (command === 'validate') {
    const planetId = process.argv[3];
    if (!planetId) {
      console.error('Usage: node reconcile-poi-coordinates.js validate <planet-id>');
      process.exit(1);
    }
    const result = validatePOICoordinates(planetId);
    if (result.valid) {
      console.log(`✅ All POI coordinates valid for ${planetId}`);
    } else {
      console.error(`❌ Validation errors for ${planetId}:`);
      result.errors.forEach(err => console.error(`  • ${err}`));
      process.exit(1);
    }
  } else {
    console.log('Usage:');
    console.log('  node reconcile-poi-coordinates.js export [output-path]');
    console.log('  node reconcile-poi-coordinates.js report');
    console.log('  node reconcile-poi-coordinates.js validate <planet-id>');
  }
}

module.exports = {
  POI_COORDINATES,
  getPOIsForPlanet,
  getPOI,
  validatePOICoordinates,
  exportPOICoordinates,
  generateConversionReport
};


