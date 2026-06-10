/**
 * Sub-Map Generator
 * Generates sub-map layouts using template system
 */

/**
 * Seeded random number generator for consistent generation
 */
function seededRandom(seed) {
  let value = seed;
  return function() {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

/**
 * Generate seed from string
 */
function getSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) || 12345;
}

/**
 * Generate sub-map ID
 */
function generateSubMapId(planetId, parentLocationId, type) {
  const base = `${planetId}_${parentLocationId}_${type}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return base;
}

/**
 * Generate city sub-map
 */
function generateCityMap(planet, parentLocationId, variant = 'medium', seed) {
  const random = seededRandom(seed);
  const size = variant === 'small' ? { width: 12, height: 12 } :
                variant === 'large' ? { width: 20, height: 20 } :
                variant === 'capital' ? { width: 25, height: 25 } :
                { width: 15, height: 15 };

  const zones = [];
  const buildings = [];
  const entryPoints = [];
  const exitPoints = [];
  const npcSpawnPoints = [];

  // Main entrance zone
  const entranceZone = {
    id: 'entrance',
    name: 'Main Entrance',
    type: 'entrance',
    bounds: { x: 0, y: Math.floor(size.height / 2), width: 2, height: 2 },
    connections: ['main_street']
  };
  zones.push(entranceZone);

  // Main street (horizontal)
  const mainStreet = {
    id: 'main_street',
    name: 'Main Street',
    type: 'street',
    bounds: { x: 2, y: Math.floor(size.height / 2) - 1, width: size.width - 4, height: 3 },
    connections: ['entrance', 'residential', 'commercial']
  };
  zones.push(mainStreet);

  // Entry point at entrance
  entryPoints.push({
    id: 'main_entrance',
    position: { x: 1, y: Math.floor(size.height / 2) },
    label: 'Main Entrance',
    fromParent: {
      locationId: parentLocationId,
      position: { x: 50, y: 50 }
    }
  });

  // Exit point (same as entry for now)
  exitPoints.push({
    id: 'main_exit',
    position: { x: 1, y: Math.floor(size.height / 2) },
    label: 'Exit to Surface',
    toParent: {
      locationId: parentLocationId,
      position: { x: 50, y: 50 }
    }
  });

  // Residential area
  const residentialZone = {
    id: 'residential',
    name: 'Residential District',
    type: 'residential',
    bounds: { x: 2, y: 0, width: Math.floor(size.width / 2) - 1, height: Math.floor(size.height / 2) - 1 },
    connections: ['main_street']
  };
  zones.push(residentialZone);

  // Commercial area
  const commercialZone = {
    id: 'commercial',
    name: 'Commercial District',
    type: 'commercial',
    bounds: { x: Math.floor(size.width / 2) + 1, y: 0, width: Math.floor(size.width / 2) - 2, height: Math.floor(size.height / 2) - 1 },
    connections: ['main_street']
  };
  zones.push(commercialZone);

  // Generate buildings in residential area
  const numResidentialBuildings = 4 + Math.floor(random() * 4);
  for (let i = 0; i < numResidentialBuildings; i++) {
    const buildingX = 3 + Math.floor(random() * (residentialZone.bounds.width - 2));
    const buildingY = 1 + Math.floor(random() * (residentialZone.bounds.height - 2));
    const buildingWidth = 2;
    const buildingHeight = 2;
    
    // Entrance on the side facing the street (south side)
    const entranceX = buildingX + Math.floor(buildingWidth / 2);
    const entranceY = buildingY + buildingHeight;
    
    buildings.push({
      id: `residential_${i}`,
      name: `Residence ${i + 1}`,
      type: 'residential',
      position: {
        x: buildingX,
        y: buildingY
      },
      size: { width: buildingWidth, height: buildingHeight },
      entrance: { x: entranceX, y: entranceY },
      collision: {
        doors: [
          {
            id: `door_residential_${i}`,
            position: { x: entranceX, y: entranceY },
            locked: Math.random() < 0.3, // 30% chance of being locked
            lockLevel: Math.random() < 0.3 ? 1 + Math.floor(random() * 3) : 0, // 1-3 if locked
            requiresKey: null,
            opensTo: `building_interior_${i}` // Interior submap ID (will be generated on entry)
          }
        ]
      }
    });
  }

  // Generate buildings in commercial area
  const numCommercialBuildings = 3 + Math.floor(random() * 3);
  for (let i = 0; i < numCommercialBuildings; i++) {
    const buildingX = commercialZone.bounds.x + 1 + Math.floor(random() * (commercialZone.bounds.width - 2));
    const buildingY = 1 + Math.floor(random() * (commercialZone.bounds.height - 2));
    const buildingWidth = 2;
    const buildingHeight = 2;
    
    // Entrance on the side facing the street (south side)
    const entranceX = buildingX + Math.floor(buildingWidth / 2);
    const entranceY = buildingY + buildingHeight;
    
    buildings.push({
      id: `commercial_${i}`,
      name: `Shop ${i + 1}`,
      type: 'commercial',
      position: {
        x: buildingX,
        y: buildingY
      },
      size: { width: buildingWidth, height: buildingHeight },
      entrance: { x: entranceX, y: entranceY },
      collision: {
        doors: [
          {
            id: `door_commercial_${i}`,
            position: { x: entranceX, y: entranceY },
            locked: false, // Shops are typically unlocked during business hours
            lockLevel: 0,
            requiresKey: null,
            opensTo: `building_interior_commercial_${i}` // Interior submap ID (will be generated on entry)
          }
        ]
      }
    });
  }

  // Add crafting bench to commercial area
  const craftingX = commercialZone.bounds.x + 1 + Math.floor(random() * (commercialZone.bounds.width - 2));
  const craftingY = 1 + Math.floor(random() * (commercialZone.bounds.height - 2));
  const craftingWidth = 2;
  const craftingHeight = 2;
  
  buildings.push({
    id: 'crafting_bench_1',
    name: 'Crafting Bench',
    type: 'crafting_bench',
    position: {
      x: craftingX,
      y: craftingY
    },
    size: { width: craftingWidth, height: craftingHeight },
    entrance: { x: craftingX + Math.floor(craftingWidth / 2), y: craftingY + craftingHeight },
    description: 'A workbench for crafting items from materials',
    collision: {
      doors: [] // Crafting bench is accessible from all sides (no doors)
    }
  });

  // NPC spawn points
  for (let i = 0; i < 5 + Math.floor(random() * 5); i++) {
    npcSpawnPoints.push({
      id: `npc_spawn_${i}`,
      position: {
        x: Math.floor(random() * size.width),
        y: Math.floor(random() * size.height)
      },
      npcIds: [],
      spawnChance: 0.7
    });
  }

  return {
    width: size.width,
    height: size.height,
    gridSize: 40, // pixels per grid unit
    zones,
    buildings,
    entryPoints,
    exitPoints,
    npcSpawnPoints,
    pointsOfInterest: []
  };
}

/**
 * Generate spaceport sub-map
 */
function generateSpaceportMap(planet, parentLocationId, variant = 'medium', seed) {
  const random = seededRandom(seed);
  const size = variant === 'small' ? { width: 10, height: 10 } :
                variant === 'large' ? { width: 15, height: 15 } :
                variant === 'military' ? { width: 18, height: 18 } :
                { width: 12, height: 12 };

  const zones = [];
  const buildings = [];
  const entryPoints = [];
  const exitPoints = [];
  const npcSpawnPoints = [];

  // Terminal building
  const terminalZone = {
    id: 'terminal',
    name: 'Terminal',
    type: 'terminal',
    bounds: { x: 0, y: 0, width: 6, height: size.height },
    connections: ['landing_pad_1', 'landing_pad_2']
  };
  zones.push(terminalZone);

  // Landing pads
  const pad1 = {
    id: 'landing_pad_1',
    name: 'Landing Pad 1',
    type: 'landing_pad',
    bounds: { x: 6, y: 2, width: 3, height: 3 },
    connections: ['terminal']
  };
  zones.push(pad1);

  const pad2 = {
    id: 'landing_pad_2',
    name: 'Landing Pad 2',
    type: 'landing_pad',
    bounds: { x: 6, y: size.height - 5, width: 3, height: 3 },
    connections: ['terminal']
  };
  zones.push(pad2);

  // Hangar bay
  const hangarZone = {
    id: 'hangar',
    name: 'Hangar Bay',
    type: 'hangar',
    bounds: { x: 9, y: 0, width: size.width - 9, height: Math.floor(size.height / 2) },
    connections: ['terminal']
  };
  zones.push(hangarZone);

  // Services area
  const servicesZone = {
    id: 'services',
    name: 'Services',
    type: 'services',
    bounds: { x: 9, y: Math.floor(size.height / 2), width: size.width - 9, height: size.height - Math.floor(size.height / 2) },
    connections: ['terminal']
  };
  zones.push(servicesZone);

  // Entry point
  entryPoints.push({
    id: 'main_entrance',
    position: { x: 1, y: Math.floor(size.height / 2) },
    label: 'Spaceport Entrance',
    fromParent: {
      locationId: parentLocationId,
      position: { x: 50, y: 50 }
    }
  });

  // Exit point
  exitPoints.push({
    id: 'main_exit',
    position: { x: 1, y: Math.floor(size.height / 2) },
    label: 'Exit to Surface',
    toParent: {
      locationId: parentLocationId,
      position: { x: 50, y: 50 }
    }
  });

  // NPC spawn points
  for (let i = 0; i < 3 + Math.floor(random() * 3); i++) {
    npcSpawnPoints.push({
      id: `npc_spawn_${i}`,
      position: {
        x: Math.floor(random() * size.width),
        y: Math.floor(random() * size.height)
      },
      npcIds: [],
      spawnChance: 0.6
    });
  }

  return {
    width: size.width,
    height: size.height,
    gridSize: 40,
    zones,
    buildings,
    entryPoints,
    exitPoints,
    npcSpawnPoints,
    pointsOfInterest: []
  };
}

/**
 * Generate hospital/medical center sub-map
 */
function generateHospitalMap(planet, parentLocationId, variant = 'medium', seed) {
  const random = seededRandom(seed);
  const size = variant === 'small' ? { width: 10, height: 10 } :
                variant === 'large' ? { width: 16, height: 16 } :
                { width: 12, height: 12 };

  const zones = [];
  const buildings = [];
  const entryPoints = [];
  const exitPoints = [];
  const npcSpawnPoints = [];

  // Reception/Lobby area (front entrance)
  const receptionZone = {
    id: 'reception',
    name: 'Reception Area',
    type: 'reception',
    bounds: { x: 0, y: Math.floor(size.height / 2) - 2, width: 4, height: 4 },
    connections: ['waiting_room', 'hallway']
  };
  zones.push(receptionZone);

  // Waiting room
  const waitingZone = {
    id: 'waiting_room',
    name: 'Waiting Room',
    type: 'waiting',
    bounds: { x: 4, y: Math.floor(size.height / 2) - 2, width: 4, height: 4 },
    connections: ['reception', 'hallway']
  };
  zones.push(waitingZone);

  // Main hallway (vertical)
  const hallwayZone = {
    id: 'hallway',
    name: 'Main Hallway',
    type: 'hallway',
    bounds: { x: 4, y: 0, width: 4, height: size.height },
    connections: ['reception', 'waiting_room', 'treatment_wing', 'surgery_wing']
  };
  zones.push(hallwayZone);

  // Treatment wing (left side)
  const treatmentZone = {
    id: 'treatment_wing',
    name: 'Treatment Wing',
    type: 'treatment',
    bounds: { x: 0, y: 0, width: 4, height: Math.floor(size.height / 2) - 2 },
    connections: ['hallway']
  };
  zones.push(treatmentZone);

  // Surgery/ICU wing (right side)
  const surgeryZone = {
    id: 'surgery_wing',
    name: 'Surgery Wing',
    type: 'surgery',
    bounds: { x: 8, y: 0, width: size.width - 8, height: Math.floor(size.height / 2) - 2 },
    connections: ['hallway']
  };
  zones.push(surgeryZone);

  // Patient rooms (upper area)
  const patientZone = {
    id: 'patient_rooms',
    name: 'Patient Rooms',
    type: 'patient',
    bounds: { x: 0, y: Math.floor(size.height / 2) + 2, width: size.width, height: size.height - Math.floor(size.height / 2) - 2 },
    connections: ['hallway']
  };
  zones.push(patientZone);

  // Entry point at reception
  entryPoints.push({
    id: 'main_entrance',
    position: { x: 1, y: Math.floor(size.height / 2) },
    label: 'Medical Center Entrance',
    fromParent: {
      locationId: parentLocationId,
      position: { x: 50, y: 50 }
    }
  });

  // Exit point (same as entry)
  exitPoints.push({
    id: 'main_exit',
    position: { x: 1, y: Math.floor(size.height / 2) },
    label: 'Exit to Surface',
    toParent: {
      locationId: parentLocationId,
      position: { x: 50, y: 50 }
    }
  });

  // Reception desk
  buildings.push({
    id: 'reception_desk',
    name: 'Reception Desk',
    type: 'reception',
    position: { x: 1, y: Math.floor(size.height / 2) - 1 },
    size: { width: 2, height: 1 },
    entrance: { x: 0, y: 0 }
  });

  // Treatment rooms (3-5 rooms)
  const numTreatmentRooms = 3 + Math.floor(random() * 3);
  for (let i = 0; i < numTreatmentRooms; i++) {
    buildings.push({
      id: `treatment_room_${i}`,
      name: `Treatment Room ${i + 1}`,
      type: 'treatment_room',
      position: {
        x: 1 + (i % 2) * 2,
        y: 1 + Math.floor(i / 2) * 2
      },
      size: { width: 2, height: 2 },
      entrance: { x: 0, y: 0 }
    });
  }

  // Surgery rooms (1-2 rooms)
  const numSurgeryRooms = 1 + Math.floor(random() * 2);
  for (let i = 0; i < numSurgeryRooms; i++) {
    buildings.push({
      id: `surgery_room_${i}`,
      name: `Surgery Room ${i + 1}`,
      type: 'surgery_room',
      position: {
        x: 9 + (i % 2) * 3,
        y: 1 + Math.floor(i / 2) * 3
      },
      size: { width: 2, height: 2 },
      entrance: { x: 0, y: 0 }
    });
  }

  // Patient rooms (4-6 rooms)
  const numPatientRooms = 4 + Math.floor(random() * 3);
  for (let i = 0; i < numPatientRooms; i++) {
    buildings.push({
      id: `patient_room_${i}`,
      name: `Patient Room ${i + 1}`,
      type: 'patient_room',
      position: {
        x: 1 + (i % 4) * 2,
        y: Math.floor(size.height / 2) + 3 + Math.floor(i / 4) * 2
      },
      size: { width: 2, height: 2 },
      entrance: { x: 0, y: 0 }
    });
  }

  // Medical staff spawn points
  // Ensure at least 1 vendor spawn point for medical facility
  npcSpawnPoints.push({
    id: 'medical_vendor',
    position: { x: 2, y: Math.floor(size.height / 2) },
    npcIds: [],
    spawnChance: 1.0,
    requiredType: 'vendor' // Mark this as requiring a vendor
  });
  
  npcSpawnPoints.push({
    id: 'reception_npc',
    position: { x: 1, y: Math.floor(size.height / 2) - 1 },
    npcIds: [],
    spawnChance: 1.0
  });

  for (let i = 0; i < 3 + Math.floor(random() * 3); i++) {
    npcSpawnPoints.push({
      id: `medical_staff_${i}`,
      position: {
        x: 2 + Math.floor(random() * (size.width - 4)),
        y: 2 + Math.floor(random() * (size.height - 4))
      },
      npcIds: [],
      spawnChance: 0.6
    });
  }

  return {
    width: size.width,
    height: size.height,
    gridSize: 40,
    zones,
    buildings,
    entryPoints,
    exitPoints,
    npcSpawnPoints,
    pointsOfInterest: [
      { id: 'reception', name: 'Reception Desk', type: 'reception', position: { x: 1, y: Math.floor(size.height / 2) - 1 } },
      { id: 'healing_station', name: 'Healing Station', type: 'healing', position: { x: 5, y: Math.floor(size.height / 2) } }
    ]
  };
}

/**
 * Generate market sub-map
 */
function generateMarketMap(planet, parentLocationId, variant = 'medium', seed) {
  const random = seededRandom(seed);
  const size = variant === 'small' ? { width: 8, height: 8 } :
                variant === 'large' ? { width: 12, height: 12 } :
                { width: 10, height: 10 };

  const zones = [];
  const buildings = [];
  const entryPoints = [];
  const exitPoints = [];
  const npcSpawnPoints = [];

  // Main market area
  const marketZone = {
    id: 'market_floor',
    name: 'Market Floor',
    type: 'market',
    bounds: { x: 1, y: 1, width: size.width - 2, height: size.height - 2 },
    connections: ['entrance']
  };
  zones.push(marketZone);

  // Entrance zone
  const entranceZone = {
    id: 'entrance',
    name: 'Market Entrance',
    type: 'entrance',
    bounds: { x: 0, y: Math.floor(size.height / 2), width: 1, height: 2 },
    connections: ['market_floor']
  };
  zones.push(entranceZone);

  // Entry point
  entryPoints.push({
    id: 'main_entrance',
    position: { x: 0, y: Math.floor(size.height / 2) },
    label: 'Market Entrance',
    fromParent: {
      locationId: parentLocationId,
      position: { x: 50, y: 50 }
    }
  });

  // Exit point
  exitPoints.push({
    id: 'main_exit',
    position: { x: 0, y: Math.floor(size.height / 2) },
    label: 'Exit',
    toParent: {
      locationId: parentLocationId,
      position: { x: 50, y: 50 }
    }
  });

  // Generate vendor stalls
  const numStalls = 4 + Math.floor(random() * 6);
  for (let i = 0; i < numStalls; i++) {
    const stallX = 2 + Math.floor(random() * (size.width - 4));
    const stallY = 2 + Math.floor(random() * (size.height - 4));
    const stallWidth = 1;
    const stallHeight = 1;
    
    // Entrance on one side (typically front)
    const entranceX = stallX + Math.floor(stallWidth / 2);
    const entranceY = stallY + stallHeight;
    
    buildings.push({
      id: `stall_${i}`,
      name: `Vendor Stall ${i + 1}`,
      type: 'vendor_stall',
      position: {
        x: stallX,
        y: stallY
      },
      size: { width: stallWidth, height: stallHeight },
      entrance: { x: entranceX, y: entranceY },
      collision: {
        doors: [
          {
            id: `door_stall_${i}`,
            position: { x: entranceX, y: entranceY },
            locked: false, // Vendor stalls are open
            lockLevel: 0,
            requiresKey: null,
            opensTo: null
          }
        ]
      }
    });
  }

  // Add crafting bench to market
  const craftingX = 2 + Math.floor(random() * (size.width - 4));
  const craftingY = 2 + Math.floor(random() * (size.height - 4));
  const craftingWidth = 2;
  const craftingHeight = 2;
  
  buildings.push({
    id: 'crafting_bench_market',
    name: 'Crafting Bench',
    type: 'crafting_bench',
    position: {
      x: craftingX,
      y: craftingY
    },
    size: { width: craftingWidth, height: craftingHeight },
    entrance: { x: craftingX + Math.floor(craftingWidth / 2), y: craftingY + craftingHeight },
    description: 'A workbench for crafting items from materials',
    collision: {
      doors: [] // Crafting bench is accessible from all sides (no doors)
    }
  });

  // NPC spawn points (vendors)
  for (let i = 0; i < numStalls; i++) {
    npcSpawnPoints.push({
      id: `vendor_spawn_${i}`,
      position: {
        x: 2 + Math.floor(random() * (size.width - 4)),
        y: 2 + Math.floor(random() * (size.height - 4))
      },
      npcIds: [],
      spawnChance: 0.8
    });
  }

  return {
    width: size.width,
    height: size.height,
    gridSize: 40,
    zones,
    buildings,
    entryPoints,
    exitPoints,
    npcSpawnPoints,
    pointsOfInterest: []
  };
}

/**
 * Main generator function
 */
async function generateSubMap({ planet, parentLocationId, parentLocationType, type }) {
  // Determine variant based on location size/importance
  let variant = 'medium';
  if (parentLocationType === 'capital' || parentLocationType === 'large') {
    variant = 'large';
  } else if (parentLocationType === 'small') {
    variant = 'small';
  }

  // Generate seed from planet and location
  const seedStr = `${planet.id}_${parentLocationId}_${type}`;
  const seed = getSeed(seedStr);

  // Generate sub-map ID
  const id = generateSubMapId(planet.id, parentLocationId, type);

  // Generate layout based on type
  let layout;
  switch (type) {
    case 'city':
      layout = generateCityMap(planet, parentLocationId, variant, seed);
      break;
    case 'spaceport':
      layout = generateSpaceportMap(planet, parentLocationId, variant, seed);
      break;
    case 'market':
      layout = generateMarketMap(planet, parentLocationId, variant, seed);
      break;
    case 'medical_center':
    case 'hospital':
      layout = generateHospitalMap(planet, parentLocationId, variant, seed);
      break;
    case 'settlement':
    case 'province':
      // Settlements and provinces use a simpler city-like layout
      layout = generateCityMap(planet, parentLocationId, 'small', seed);
      break;
    case 'dungeon':
      // Generate dungeon layout
      const { generateDungeonMap, getSeed } = require('../utils/dungeonGenerator');
      const dungeonSeedStr = `${planet.id}_${parentLocationId}_dungeon`;
      const dungeonSeed = getSeed(dungeonSeedStr);
      
      // Determine dungeon type from parentLocationType
      // For POIs, parentLocationType will be the POI type (danger, mine, etc.)
      // For non-POIs, parentLocationType might be the actual location type
      let dungeonType = 'danger'; // Default
      
      if (parentLocationType === 'mine') dungeonType = 'mine';
      else if (parentLocationType === 'underworld') dungeonType = 'underworld';
      else if (parentLocationType === 'cave') dungeonType = 'cave';
      else if (parentLocationType === 'ruins') dungeonType = 'ruins';
      else if (parentLocationType === 'fortress' || parentLocationType === 'base') dungeonType = 'fortress';
      else if (parentLocationType === 'danger') dungeonType = 'danger';
      // If parentLocationType is still 'poi' (shouldn't happen now, but fallback), default to 'danger'
      
      const dungeonLayout = generateDungeonMap(dungeonType, dungeonSeed);
      
      // Convert dungeon layout to submap format
      layout = {
        type: 'dungeon',
        dungeonType: dungeonType,
        designVariant: dungeonLayout.designVariant,
        algorithm: dungeonLayout.algorithm,
        size: {
          width: dungeonLayout.width,
          height: dungeonLayout.height
        },
        grid: dungeonLayout.grid,
        rooms: dungeonLayout.rooms,
        corridors: dungeonLayout.corridors,
        entrance: dungeonLayout.entrance,
        bossRoom: dungeonLayout.bossRoom,
        depthZones: dungeonLayout.depthZones,
        zones: [], // Dungeons don't use zones like cities
        buildings: [],
        entryPoints: [{
          id: 'dungeon_entrance',
          position: dungeonLayout.entrance,
          label: 'Dungeon Entrance',
          fromParent: {
            locationId: parentLocationId,
            position: { x: 50, y: 50 }
          }
        }],
        exitPoints: [{
          id: 'dungeon_exit',
          position: dungeonLayout.entrance,
          label: 'Exit Dungeon',
          toParent: {
            locationId: parentLocationId,
            position: { x: 50, y: 50 }
          }
        }],
        npcSpawnPoints: [], // Enemies will be placed separately
        pointsOfInterest: []
      };
      break;
    default:
      // Default to city layout for unknown types
      layout = generateCityMap(planet, parentLocationId, variant, seed);
  }

  // Generate metadata
  let metadata = {
    description: `${type} sub-map for ${parentLocationId} on ${planet.name}`,
    lore: `A ${type} location on ${planet.name}`,
    faction: planet.factionControl || null,
    dangerLevel: planet.dangerLevel || 1,
    restrictions: {}
  };

  // Add dungeon-specific metadata
  if (type === 'dungeon' && layout.dungeonType) {
    metadata = {
      ...metadata,
      dungeonType: layout.dungeonType,
      designVariant: layout.designVariant,
      algorithm: layout.algorithm,
      seed: getSeed(`${planet.id}_${parentLocationId}_dungeon`),
      difficulty: {
        baseLevel: planet.dangerLevel || 5,
        scalingFactor: 1.2
      },
      progress: {
        exploredCells: [],
        defeatedEnemies: [],
        collectedTreasure: [],
        lastVisit: null,
        cooldownResetTime: null
      }
    };
  }

  return {
    id,
    name: `${parentLocationId} ${type.charAt(0).toUpperCase() + type.slice(1)}`,
    type,
    template: variant,
    layout,
    metadata
  };
}

module.exports = {
  generateSubMap
};

