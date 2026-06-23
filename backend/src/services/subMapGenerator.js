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
// Bump when the spaceport layout shape changes so getSubMapById can re-furnish older,
// already-persisted spaceport submaps in place (v1 = the original empty plaza).
// v4: props get a small SOLID collision footprint (no more giant invisible barriers around
// chairs/signs; the crowd stops clipping through props) — see collisionMapService._markPropFootprint.
const SPACEPORT_LAYOUT_VERSION = 4;

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

  // --- Populate a grand, organized concourse + open hangar bays -----------------
  // An ORGANIZED terminal: a clear central walkway runs from the entrance (left) toward the
  // hangar bays (right); storefronts line the top & bottom edges facing the walkway; the
  // hangars are grouped together on the right. Positions are proportional so every variant
  // (small→military) reads the same. The central spine (y ≈ 0.4–0.6) is kept clear.
  const W = size.width, H = size.height;
  const gx = (fx) => Math.max(0, Math.min(W - 1, Math.round(W * fx)));
  const gy = (fy) => Math.max(0, Math.min(H - 1, Math.round(H * fy)));

  // Storefronts line the concourse edges (NPC vendors stand at these; not enterable). Top row
  // and bottom row flank the central walkway so it reads as a terminal, not scattered boxes.
  buildings.push({ id: 'sp_parts', name: 'Ship Parts & Outfitters', type: 'stall', position: { x: gx(0.24), y: gy(0.14) }, size: { width: 2, height: 2 } });
  buildings.push({ id: 'sp_services', name: 'Travel Services', type: 'shop', position: { x: gx(0.46), y: gy(0.14) }, size: { width: 2, height: 2 } });
  buildings.push({ id: 'sp_cantina', name: "Spacers' Cantina", type: 'cantina', position: { x: gx(0.24), y: gy(0.78) }, size: { width: 2, height: 2 } });
  buildings.push({ id: 'sp_customs', name: 'Port Authority', type: 'reception', position: { x: gx(0.48), y: gy(0.80) }, size: { width: 2, height: 1 } });
  // Hangar bays grouped on the right, with docked ships (glTF hangar + parked craft).
  buildings.push({ id: 'sp_hangar_a', name: 'Hangar Bay A', type: 'landing_pad', position: { x: gx(0.78), y: gy(0.16) }, size: { width: 3, height: 3 } });
  buildings.push({ id: 'sp_hangar_b', name: 'Hangar Bay B', type: 'landing_pad', position: { x: gx(0.78), y: gy(0.62) }, size: { width: 3, height: 3 } });

  // Furniture / decoration / interactive props (visual-only; kept off the central spine + the
  // entrance, and NOT added to the collision map, so they can't box the player in).
  const furniture = [
    // Lounge seating tucked into the corners between the storefront rows and the hangars.
    { id: 'seat_a1', type: 'bench', position: { x: gx(0.34), y: gy(0.26) }, size: { width: 2, height: 1 } },
    { id: 'seat_a2', type: 'chair', position: { x: gx(0.34), y: gy(0.30) }, size: { width: 1, height: 1 } },
    { id: 'seat_b1', type: 'bench', position: { x: gx(0.34), y: gy(0.70) }, size: { width: 2, height: 1 } },
    { id: 'seat_b2', type: 'chair', position: { x: gx(0.40), y: gy(0.70) }, size: { width: 1, height: 1 } },
    // Greenery softening the concourse edges.
    { id: 'plant_1', type: 'plant', position: { x: gx(0.16), y: gy(0.30) }, size: { width: 1, height: 1 } },
    { id: 'plant_2', type: 'plant', position: { x: gx(0.16), y: gy(0.66) }, size: { width: 1, height: 1 } },
    { id: 'plant_3', type: 'plant', position: { x: gx(0.62), y: gy(0.40) }, size: { width: 1, height: 1 } },
    { id: 'plant_4', type: 'plant', position: { x: gx(0.62), y: gy(0.58) }, size: { width: 1, height: 1 } },
    // Cargo staged by the hangar gates.
    { id: 'crate_1', type: 'crate', position: { x: gx(0.68), y: gy(0.24) }, size: { width: 1, height: 1 } },
    { id: 'crate_2', type: 'crate', position: { x: gx(0.70), y: gy(0.28) }, size: { width: 1, height: 1 } },
    { id: 'crate_3', type: 'crate', position: { x: gx(0.68), y: gy(0.70) }, size: { width: 1, height: 1 } },
  ];
  const decorations = [
    // Glowing departure/arrivals signage flanking the walkway entrance.
    { id: 'sign_dep', type: 'sign', position: { x: gx(0.18), y: gy(0.44) }, size: { width: 1, height: 1 } },
    { id: 'sign_arr', type: 'sign', position: { x: gx(0.18), y: gy(0.56) }, size: { width: 1, height: 1 } },
  ];
  const interactiveElements = [
    // Self-serve info kiosks along the concourse (glow; 'terminal' is not a collision obstacle).
    { id: 'kiosk_1', type: 'terminal', position: { x: gx(0.34), y: gy(0.46) }, size: { width: 1, height: 1 } },
    { id: 'kiosk_2', type: 'terminal', position: { x: gx(0.52), y: gy(0.54) }, size: { width: 1, height: 1 } },
  ];

  // NPC spawn points — people at the storefronts, along the walkway, and by the hangar gates.
  const spawnFracs = [
    [0.26, 0.24], [0.48, 0.24],                 // in front of the top-row shops
    [0.26, 0.70], [0.48, 0.72],                 // in front of the bottom-row shops
    [0.30, 0.50], [0.42, 0.48], [0.54, 0.52],   // strolling the central walkway
    [0.66, 0.34], [0.66, 0.60],                 // toward the hangar gates
    [0.16, 0.50],                               // near the entrance
  ];
  spawnFracs.forEach(([fx, fy], i) => {
    npcSpawnPoints.push({ id: `npc_spawn_${i}`, position: { x: gx(fx), y: gy(fy) }, npcIds: [], spawnChance: 0.85 });
  });

  // Collision: wall the large structures (shops + hangars) AND give props a SMALL solid footprint
  // matching what's drawn (collisionMapService caps prop footprints to ~human scale), so the
  // concourse/lanes stay open, the player isn't boxed in by a chair, and the crowd no longer
  // clips through props (the server crowd collides via this same map).
  let collisionMap = null;
  try {
    const collisionMapService = require('./collisionMapService');
    collisionMap = collisionMapService.generateCollisionMap({ layoutData: { width: W, height: H, buildings, furniture, decorations, interactiveElements } });
  } catch (e) {
    collisionMap = null; // degrade gracefully to an open (all-walkable) spaceport
  }

  return {
    width: size.width,
    height: size.height,
    gridSize: 40,
    spaceportVersion: SPACEPORT_LAYOUT_VERSION,
    zones,
    buildings,
    furniture,
    decorations,
    interactiveElements,
    entryPoints,
    exitPoints,
    npcSpawnPoints,
    pointsOfInterest: [],
    ...(collisionMap ? { collisionMap } : {}),
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
 * Generate shantytown / slum sub-map: a DENSE, irregular cluster of small makeshift shacks
 * threaded by dirt lanes. Unlike the city generator (a handful of 2x2 residences in a tidy zone),
 * this packs many 1x1 "shack" buildings on a jittered grid so the district reads as a sprawling
 * informal settlement. Shacks are solid props (no interiors/doors) you weave between; the frontend
 * "shantytown" theme skins them as corrugated-roof shacks under a brown dust haze.
 */
function generateShantytownMap(planet, parentLocationId, variant = 'medium', seed) {
  const random = seededRandom(seed);
  const size = variant === 'small' ? { width: 16, height: 16 } :
                variant === 'large' ? { width: 22, height: 22 } :
                { width: 18, height: 18 };

  const zones = [];
  const buildings = [];
  const entryPoints = [];
  const exitPoints = [];
  const npcSpawnPoints = [];
  const pointsOfInterest = [];

  const midY = Math.floor(size.height / 2);

  // Entrance + a main dirt lane running across the settlement (kept clear of shacks so the player
  // can always get in and through).
  zones.push({ id: 'entrance', name: 'Settlement Edge', type: 'entrance', bounds: { x: 0, y: midY, width: 2, height: 2 }, connections: ['main_lane'] });
  zones.push({ id: 'main_lane', name: 'Dirt Lane', type: 'street', bounds: { x: 2, y: midY - 1, width: size.width - 3, height: 3 }, connections: ['entrance', 'shacks'] });
  zones.push({ id: 'shacks', name: 'Shanty Cluster', type: 'residential', bounds: { x: 1, y: 0, width: size.width - 2, height: size.height }, connections: ['main_lane'] });

  entryPoints.push({ id: 'main_entrance', position: { x: 1, y: midY }, label: 'Settlement Edge', fromParent: { locationId: parentLocationId, position: { x: 50, y: 50 } } });
  exitPoints.push({ id: 'main_exit', position: { x: 1, y: midY }, label: 'Exit to Surface', toParent: { locationId: parentLocationId, position: { x: 50, y: 50 } } });

  // Reserve the main lane (and a perpendicular cross-lane) so shacks never wall the player in.
  const laneRows = new Set([midY - 1, midY, midY + 1]);
  const crossX = Math.floor(size.width * 0.62);
  const isLane = (x, y) => laneRows.has(y) || x === crossX || x <= 1;

  // Pack shacks on a 2-cell-spaced grid with per-cell jitter + a few skips → dense but irregular,
  // with ~1-cell dirt gaps (alleys) between them. The low skip + larger grid keep it tightly packed.
  let n = 0;
  const MAX_SHACKS = variant === 'small' ? 28 : variant === 'large' ? 60 : 40;
  for (let gy = 0; gy < size.height - 1 && n < MAX_SHACKS; gy += 2) {
    for (let gx = 2; gx < size.width - 1 && n < MAX_SHACKS; gx += 2) {
      const x = Math.min(size.width - 2, gx + (random() < 0.4 ? 1 : 0));
      const y = Math.min(size.height - 2, gy + (random() < 0.4 ? 1 : 0));
      if (isLane(x, y) || isLane(x, y + 1)) continue;   // keep lanes walkable
      if (random() < 0.07) continue;                    // a few gaps / small yards
      buildings.push({
        id: `shack_${n}`,
        name: `Shack ${n + 1}`,
        type: 'shack',
        position: { x, y },
        size: { width: 1, height: 1 },
        entrance: { x, y: y + 1 },
        // Solid makeshift dwellings — no enterable interior (no doors).
        collision: { doors: [] }
      });
      n++;
    }
  }

  // A communal water tank as a focal landmark on the lane, plus a couple of resident spawn points.
  pointsOfInterest.push({ id: 'water_tank', name: 'Water Tank', type: 'landmark', position: { x: crossX, y: midY }, description: 'The settlement’s shared water tank.' });
  for (let i = 0; i < 6 + Math.floor(random() * 4); i++) {
    npcSpawnPoints.push({ id: `resident_${i}`, position: { x: 2 + Math.floor(random() * (size.width - 4)), y: Math.floor(random() * size.height) }, npcIds: [], spawnChance: 0.7 });
  }

  return { width: size.width, height: size.height, gridSize: 40, zones, buildings, entryPoints, exitPoints, npcSpawnPoints, pointsOfInterest };
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
    case 'shantytown':
      layout = generateShantytownMap(planet, parentLocationId, variant, seed);
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

  // Natural-language labels so generated names/descriptions don't surface raw
  // ids like "building_interior" / "medical_center_123" to the player.
  const titleCase = (s) => String(s).replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  // Generate metadata
  let metadata = {
    description: `${titleCase(type)} sub-map for ${titleCase(parentLocationId)} on ${planet.name}`,
    lore: `A ${titleCase(type)} location on ${planet.name}`,
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
    name: `${titleCase(parentLocationId)} ${titleCase(type)}`,
    type,
    template: variant,
    layout,
    metadata
  };
}

module.exports = {
  generateSubMap,
  generateSpaceportMap,
  generateShantytownMap,
  getSeed,
  SPACEPORT_LAYOUT_VERSION,
};

