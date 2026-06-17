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

  // --- Populate a grand, furnished concourse + open hangar bays -----------------
  // Positions are PROPORTIONAL to the grid so every variant (small→military) reads the
  // same way. The terminal/concourse occupies the left; hangar bays sit on the right.
  const W = size.width, H = size.height;
  const gx = (fx) => Math.max(0, Math.min(W - 1, Math.round(W * fx)));
  const gy = (fy) => Math.max(0, Math.min(H - 1, Math.round(H * fy)));

  // Concourse storefronts (NPC vendors stand at these; not enterable — no authored interiors).
  // `stall`/`shop`/`cantina`/`reception` map to low storefront shapes in the 3D submap kit.
  buildings.push({ id: 'sp_parts', name: 'Ship Parts & Outfitters', type: 'stall', position: { x: gx(0.14), y: gy(0.16) }, size: { width: 2, height: 2 } });
  buildings.push({ id: 'sp_cantina', name: "Spacers' Cantina", type: 'cantina', position: { x: gx(0.14), y: gy(0.62) }, size: { width: 2, height: 2 } });
  buildings.push({ id: 'sp_customs', name: 'Port Authority', type: 'reception', position: { x: gx(0.32), y: gy(0.42) }, size: { width: 2, height: 1 } });
  buildings.push({ id: 'sp_services', name: 'Travel Services', type: 'shop', position: { x: gx(0.32), y: gy(0.72) }, size: { width: 2, height: 2 } });
  // Open hangar bays with docked ships (glTF hangar + parked craft via the 'landing_pad' kit).
  buildings.push({ id: 'sp_hangar_a', name: 'Hangar Bay A', type: 'landing_pad', position: { x: gx(0.70), y: gy(0.10) }, size: { width: 3, height: 3 } });
  buildings.push({ id: 'sp_hangar_b', name: 'Hangar Bay B', type: 'landing_pad', position: { x: gx(0.70), y: gy(0.60) }, size: { width: 3, height: 3 } });

  // Furniture / decoration / interactive props (rendered as typed boxes; emissive = glow).
  // Kept off the entrance spine + central lanes. These are visual-only (not added to the
  // collision map below) so they can't box the player in.
  const furniture = [
    // Waiting-area seating clusters (two lounges flanking the concourse).
    { id: 'seat_a1', type: 'chair', position: { x: gx(0.42), y: gy(0.26) }, size: { width: 1, height: 1 } },
    { id: 'seat_a2', type: 'chair', position: { x: gx(0.47), y: gy(0.26) }, size: { width: 1, height: 1 } },
    { id: 'seat_a3', type: 'bench', position: { x: gx(0.42), y: gy(0.32) }, size: { width: 2, height: 1 } },
    { id: 'seat_b1', type: 'chair', position: { x: gx(0.42), y: gy(0.74) }, size: { width: 1, height: 1 } },
    { id: 'seat_b2', type: 'chair', position: { x: gx(0.47), y: gy(0.74) }, size: { width: 1, height: 1 } },
    { id: 'seat_b3', type: 'bench', position: { x: gx(0.42), y: gy(0.80) }, size: { width: 2, height: 1 } },
    // Greenery to soften the concourse.
    { id: 'plant_1', type: 'plant', position: { x: gx(0.50), y: gy(0.48) }, size: { width: 1, height: 1 } },
    { id: 'plant_2', type: 'plant', position: { x: gx(0.22), y: gy(0.30) }, size: { width: 1, height: 1 } },
    { id: 'plant_3', type: 'plant', position: { x: gx(0.22), y: gy(0.70) }, size: { width: 1, height: 1 } },
    // Cargo near the hangars.
    { id: 'crate_1', type: 'crate', position: { x: gx(0.60), y: gy(0.30) }, size: { width: 1, height: 1 } },
    { id: 'crate_2', type: 'crate', position: { x: gx(0.62), y: gy(0.34) }, size: { width: 1, height: 1 } },
    { id: 'crate_3', type: 'crate', position: { x: gx(0.60), y: gy(0.72) }, size: { width: 1, height: 1 } },
  ];
  const decorations = [
    // Glowing departure/arrivals signage over the concourse.
    { id: 'sign_dep', type: 'sign', position: { x: gx(0.26), y: gy(0.34) }, size: { width: 1, height: 1 } },
    { id: 'sign_arr', type: 'sign', position: { x: gx(0.26), y: gy(0.60) }, size: { width: 1, height: 1 } },
  ];
  const interactiveElements = [
    // Self-serve info kiosks (glow; type 'terminal' is not treated as a collision obstacle).
    { id: 'kiosk_1', type: 'terminal', position: { x: gx(0.20), y: gy(0.48) }, size: { width: 1, height: 1 } },
    { id: 'kiosk_2', type: 'terminal', position: { x: gx(0.52), y: gy(0.52) }, size: { width: 1, height: 1 } },
  ];

  // NPC spawn points — a bustling concourse needs people at the shops, lounges, and gates.
  const spawnFracs = [
    [0.20, 0.20], [0.20, 0.66], [0.36, 0.46], [0.36, 0.74],   // near the storefronts
    [0.44, 0.30], [0.44, 0.78], [0.40, 0.52],                  // lounges + concourse center
    [0.62, 0.20], [0.62, 0.70], [0.55, 0.48],                  // toward the hangar gates
  ];
  spawnFracs.forEach(([fx, fy], i) => {
    npcSpawnPoints.push({ id: `npc_spawn_${i}`, position: { x: gx(fx), y: gy(fy) }, npcIds: [], spawnChance: 0.85 });
  });

  // Collision: wall ONLY the large structures (shops + hangars), leaving the concourse, lanes,
  // and prop areas freely walkable. (Building-only input keeps small props walk-through so the
  // player can never be boxed in by a chair or crate.)
  let collisionMap = null;
  try {
    const collisionMapService = require('./collisionMapService');
    collisionMap = collisionMapService.generateCollisionMap({ layoutData: { width: W, height: H, buildings } });
  } catch (e) {
    collisionMap = null; // degrade gracefully to an open (all-walkable) spaceport
  }

  return {
    width: size.width,
    height: size.height,
    gridSize: 40,
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
  generateSubMap
};

