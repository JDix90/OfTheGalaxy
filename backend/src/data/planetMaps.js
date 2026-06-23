/**
 * Planet Map Data
 * Lore-accurate terrain, POIs, cities, and markets for Star Wars planets
 * Each planet gets unique map data based on canonical Star Wars lore
 */

const planetMaps = {
  // ========== CORE WORLDS ==========
  centralis: {
    terrain: 'urban_sprawl',
    mapLayout: {
      type: 'urban',
      districts: [
        { name: 'Central Spire', x: 50, y: 50, type: 'capital', size: 'large' },
        { name: 'Nightrun District', x: 30, y: 40, type: 'entertainment', size: 'medium' },
        { name: 'Lowmarket', x: 70, y: 60, type: 'industrial', size: 'medium' },
        { name: 'Assembly District', x: 50, y: 30, type: 'government', size: 'large' },
        { name: 'Keeper Sanctum', x: 40, y: 20, type: 'temple', size: 'medium' }
      ]
    },
    pointsOfInterest: [
      { name: 'Concord Assembly Building', x: 50, y: 30, type: 'government', description: 'The seat of galactic government' },
      { name: 'Keeper Sanctum', x: 40, y: 20, type: 'temple', description: 'Ancient Keeper stronghold' },
      { name: 'Nightrun Entertainment District', x: 30, y: 40, type: 'entertainment', description: 'Nightlife and entertainment hub' },
      { name: 'Lowmarket Markets', x: 70, y: 60, type: 'market', description: 'Major trading district' },
      { name: 'Centralis Underworld', x: 20, y: 80, type: 'danger', description: 'Dangerous lower levels' },
      { name: 'Central Spire Spaceport', x: 50, y: 50, type: 'spaceport', description: 'Main spaceport and landing facility' },
      { name: 'Central Spire Medical Center', x: 48, y: 52, type: 'medical_center', description: 'State-of-the-art medical facility' },
      { name: 'Assembly District Medical Bay', x: 52, y: 32, type: 'medical_center', description: 'Government medical facility' }
    ],
    markets: [
      { name: 'Central Spire Market', x: 50, y: 50, type: 'general', description: 'General goods and services' },
      { name: 'Lowmarket Bazaar', x: 70, y: 60, type: 'trade', description: 'Intergalactic trading hub' },
      { name: 'Nightrun Street Vendors', x: 30, y: 40, type: 'street', description: 'Local vendors and crafts' }
    ],
    fastTravelPoints: [
      { id: 'galactic_city_spaceport', name: 'Central Spire Spaceport', x: 50, y: 50, type: 'spaceport', description: 'Main spaceport' },
      { id: 'senate_district', name: 'Assembly District', x: 50, y: 30, type: 'government', description: 'Government district' }
    ],
    medicalCenters: [
      { name: 'Central Spire Medical Center', x: 48, y: 52, type: 'medical_center', description: 'State-of-the-art medical facility' },
      { name: 'Assembly District Medical Bay', x: 52, y: 32, type: 'medical_center', description: 'Government medical facility' }
    ]
  },

  eloria: {
    terrain: 'temperate_plains',
    mapLayout: {
      type: 'terrestrial',
      regions: [
        { name: 'Theed', x: 50, y: 40, type: 'capital', size: 'large', description: 'Royal capital city' },
        { name: 'Otoh Gunga', x: 30, y: 70, type: 'underwater', size: 'medium', description: 'Marrow underwater city' },
        { name: 'Lake Paonga', x: 30, y: 70, type: 'water', size: 'large', description: 'Vast freshwater lake' },
        { name: 'Plains of Eloria', x: 60, y: 50, type: 'grassland', size: 'large', description: 'Rolling green plains' },
        { name: 'Swamp of Eloria', x: 20, y: 80, type: 'swamp', size: 'medium', description: 'Marshland region' }
      ]
    },
    pointsOfInterest: [
      { name: 'Theed Royal Palace', x: 50, y: 40, type: 'palace', description: 'Royal residence and government center' },
      { name: 'Otoh Gunga', x: 30, y: 70, type: 'city', description: 'Marrow underwater city' },
      { name: 'Eloria Plains', x: 60, y: 50, type: 'landscape', description: 'Beautiful rolling plains' },
      { name: 'Eloria Swamp', x: 20, y: 80, type: 'wilderness', description: 'Dense marshland' },
      { name: 'Eloria Spaceport', x: 55, y: 45, type: 'spaceport', description: 'Main landing facility' }
    ],
    markets: [
      { name: 'Theed Market Square', x: 50, y: 40, type: 'general', description: 'Royal city marketplace' },
      { name: 'Marrow Trading Post', x: 30, y: 70, type: 'specialty', description: 'Marrow goods and crafts' }
    ],
    medicalCenters: [
      { name: 'Theed Medical Center', x: 48, y: 42, type: 'medical_center', description: 'Royal medical facility' }
    ]
  },

  gravenmoor: {
    terrain: 'desert',
    mapLayout: {
      type: 'desert',
      settlements: [
        { name: 'Greywell', x: 40, y: 50, type: 'spaceport', size: 'large', description: 'Wretched hive of scum and villainy' },
        { name: 'Dustreach', x: 60, y: 40, type: 'settlement', size: 'medium', description: 'Podracing hub' },
        { name: 'Anchorhead', x: 30, y: 60, type: 'settlement', size: 'small', description: 'Moisture farming community' },
        { name: 'Sunder Wastes', x: 50, y: 70, type: 'desert', size: 'large', description: 'Dangerous desert region' },
        { name: 'Dune Sea', x: 70, y: 80, type: 'desert', size: 'huge', description: 'Endless sand dunes' }
      ]
    },
    pointsOfInterest: [
      { name: 'Greywell Cantina', x: 40, y: 50, type: 'cantina', description: 'Famous watering hole' },
      { name: 'Dustreach Podracing Arena', x: 60, y: 40, type: 'arena', description: 'Podracing track' },
      { name: 'Vorga\'s Palace', x: 25, y: 30, type: 'palace', description: 'Vorr crime lord stronghold' },
      { name: 'Marn Homestead', x: 35, y: 55, type: 'homestead', description: 'Moisture farm' },
      { name: 'Devourer Pit', x: 20, y: 25, type: 'danger', description: 'Ancient creature pit' },
      { name: 'The Dust Warren', x: 46, y: 62, type: 'shantytown', description: 'A sprawling shanty settlement of corrugated shacks clinging to the dust hills' },
      { name: 'Greywell Medical Facility', x: 42, y: 52, type: 'medical_center', description: 'Basic medical services' }
    ],
    markets: [
      { name: 'Greywell Market', x: 40, y: 50, type: 'general', description: 'Black market goods' },
      { name: 'Vorga\'s Trading Post', x: 25, y: 30, type: 'criminal', description: 'Vorr-controlled market' },
      { name: 'Dustreach Bazaar', x: 60, y: 40, type: 'trade', description: 'Podracing parts and supplies' }
    ],
    medicalCenters: [
      { name: 'Greywell Medical Facility', x: 42, y: 52, type: 'medical_center', description: 'Basic medical services' }
    ]
  },

  verdholm: {
    terrain: 'jungle',
    mapLayout: {
      type: 'jungle',
      locations: [
        { name: 'Kachirho', x: 50, y: 50, type: 'city', size: 'large', description: 'Ursk tree city' },
        { name: 'Rwookrrorro', x: 30, y: 35, type: 'city', size: 'medium', description: 'Ursk settlement' },
        { name: 'Shadowlands', x: 25, y: 75, type: 'jungle', size: 'huge', description: 'Dangerous lower levels' },
        { name: 'Wroshyr Trees', x: 65, y: 45, type: 'forest', size: 'huge', description: 'Massive ancient trees' }
      ]
    },
    pointsOfInterest: [
      { name: 'Kachirho Tree City', x: 50, y: 50, type: 'city', description: 'Ursk capital city in the trees' },
      { name: 'Shadowlands', x: 25, y: 75, type: 'danger', description: 'Dark, dangerous jungle floor' },
      { name: 'Wroshyr Grove', x: 70, y: 40, type: 'landscape', description: 'Ancient tree grove' }
    ],
    markets: [
      { name: 'Kachirho Trading Post', x: 52, y: 48, type: 'general', description: 'Ursk goods and crafts' }
    ]
  },

  rime: {
    terrain: 'ice',
    mapLayout: {
      type: 'ice',
      locations: [
        { name: 'Echo Base', x: 50, y: 50, type: 'base', size: 'medium', description: 'Free Worlds base' },
        { name: 'Ice Plains', x: 50, y: 50, type: 'ice', size: 'huge', description: 'Frozen wasteland' },
        { name: 'Wampa Cave', x: 30, y: 40, type: 'cave', size: 'small', description: 'Dangerous creature lair' }
      ]
    },
    pointsOfInterest: [
      { name: 'Echo Base', x: 50, y: 50, type: 'base', description: 'Hidden Rebel base' },
      { name: 'Wampa Territory', x: 30, y: 40, type: 'danger', description: 'Ice creature hunting grounds' }
    ],
    markets: []
  },

  cirruan: {
    terrain: 'gas_giant',
    mapLayout: {
      type: 'gas_giant',
      locations: [
        { name: 'Cloud City', x: 50, y: 50, type: 'city', size: 'large', description: 'Floating mining city' },
        { name: 'Tibanna Gas Mines', x: 70, y: 30, type: 'mine', size: 'medium', description: 'Gas extraction facilities' }
      ]
    },
    pointsOfInterest: [
      { name: 'Cloud City', x: 50, y: 50, type: 'city', description: 'Floating city in the clouds' },
      { name: 'Carbonite Freezing Chamber', x: 45, y: 55, type: 'facility', description: 'Carbonite processing' },
      { name: 'Tibanna Gas Refinery', x: 70, y: 30, type: 'industrial', description: 'Gas processing facility' }
    ],
    markets: [
      { name: 'Cloud City Market', x: 55, y: 48, type: 'general', description: 'Luxury goods and services' }
    ]
  },

  verdance: {
    terrain: 'forest',
    mapLayout: {
      type: 'forest',
      locations: [
        { name: 'Brindle Village', x: 50, y: 50, type: 'village', size: 'medium', description: 'Brindle tree village' },
        { name: 'Forest', x: 50, y: 50, type: 'forest', size: 'huge', description: 'Dense forest moon' }
      ]
    },
    pointsOfInterest: [
      { name: 'Brindle Village', x: 50, y: 50, type: 'village', description: 'Brindle settlement' },
      { name: 'Death Star II Wreckage', x: 40, y: 30, type: 'wreckage', description: 'Destroyed battle station' }
    ],
    markets: [
      { name: 'Brindle Trading Post', x: 50, y: 50, type: 'specialty', description: 'Brindle crafts and goods' }
    ]
  },

  embervast: {
    terrain: 'volcanic',
    mapLayout: {
      type: 'volcanic',
      locations: [
        { name: 'Mining Facility', x: 50, y: 50, type: 'mine', size: 'medium', description: 'Lava mining operation' },
        { name: 'Lava Rivers', x: 50, y: 50, type: 'lava', size: 'huge', description: 'Rivers of molten rock' },
        { name: 'Volcanic Plains', x: 40, y: 60, type: 'volcanic', size: 'large', description: 'Barren volcanic landscape' }
      ]
    },
    pointsOfInterest: [
      { name: 'Mining Facility', x: 50, y: 50, type: 'industrial', description: 'Lava mining operation' },
      { name: 'Lava Falls', x: 60, y: 40, type: 'landscape', description: 'Spectacular lava cascade' },
      { name: 'Korrth\'s Castle', x: 30, y: 30, type: 'fortress', description: 'Hollow Lord stronghold' }
    ],
    markets: [
      { name: 'Mining Outpost Market', x: 50, y: 50, type: 'industrial', description: 'Mining equipment and supplies' }
    ]
  },

  // ========== OUTER RIM - SMUGGLER'S MOON ==========
  sinkport: {
    terrain: 'urban_sprawl',
    mapLayout: {
      type: 'urban',
      districts: [
        { name: 'Sinkport City', x: 50, y: 50, type: 'capital', size: 'large', description: 'The main urban center of the Smuggler\'s Moon' },
        { name: 'Entertainment District', x: 35, y: 40, type: 'entertainment', size: 'large', description: 'Neon-lit district of casinos, clubs, and vices' },
        { name: 'Upper Levels', x: 70, y: 30, type: 'residential', size: 'medium', description: 'Wealthy districts where the elite reside' },
        { name: 'Lower Levels', x: 15, y: 75, type: 'industrial', size: 'large', description: 'Dangerous underbelly of the moon' },
        { name: 'Commercial District', x: 50, y: 60, type: 'commercial', size: 'medium', description: 'Trading and business hub' }
      ]
    },
    pointsOfInterest: [
      { name: 'Sinkport City Spaceport', x: 48, y: 48, type: 'spaceport', description: 'Main spaceport where ships from across the galaxy dock' },
      { name: 'Sinkport City', x: 50, y: 50, type: 'city', description: 'The sprawling urban center of the Smuggler\'s Moon' },
      { name: 'Sinkport City Medical Center', x: 52, y: 48, type: 'medical_center', description: 'Main medical facility' },
      { name: 'The Entertainment District', x: 30, y: 35, type: 'entertainment', description: 'Neon-soaked district of casinos and nightlife' },
      { name: 'Umbra Casino', x: 28, y: 34, type: 'entertainment', description: 'Opulent casino owned by the Umbra crime syndicate' },
      { name: 'The Red Light District', x: 32, y: 36, type: 'entertainment', description: 'District where every vice is available for a price' },
      { name: 'Vorr Palace Complex', x: 75, y: 25, type: 'palace', description: 'Massive complex controlled by the Vorr Cartel' },
      { name: 'The Velvet Room', x: 72, y: 28, type: 'cantina', description: 'Upscale cantina where the wealthy and powerful gather' },
      { name: 'The Data Vault', x: 68, y: 30, type: 'base', description: 'Information broker\'s headquarters where secrets are bought and sold' },
      { name: 'Bounty Hunter\'s Guild Hall', x: 60, y: 42, type: 'base', description: 'Official headquarters of the Bounty Hunter\'s Guild' },
      { name: 'Wyrm\'s Arsenal', x: 55, y: 52, type: 'market', description: 'Well-stocked weapons dealer with connections to every major arms manufacturer' },
      { name: 'Tech Bazaar', x: 50, y: 54, type: 'market', description: 'Bustling market specializing in technology, droids, and cybernetics' },
      { name: 'Stellar Ship Chandlery', x: 45, y: 56, type: 'market', description: 'Massive ship parts and equipment dealer' },
      { name: 'The Lower Levels', x: 15, y: 75, type: 'danger', description: 'Dark, dangerous underbelly of Sinkport' },
      { name: 'The Smuggler\'s Den', x: 20, y: 72, type: 'cantina', description: 'Notorious cantina where smugglers and outlaws gather' },
      { name: 'The Black Market', x: 18, y: 68, type: 'market', description: 'Illegal trading hub for contraband and stolen goods' },
      { name: 'The Spice Den', x: 22, y: 70, type: 'cantina', description: 'Seedy establishment where spice is consumed openly' },
      { name: 'The Pit', x: 25, y: 73, type: 'arena', description: 'Underground fighting arena where gladiators battle for credits' },
      { name: 'Smuggler\'s Landing', x: 17, y: 76, type: 'spaceport', description: 'Unofficial landing zone in the lower levels' },
      { name: 'Back Alley Clinic', x: 19, y: 69, type: 'medical_center', description: 'Discrete lower-level clinic' },
      { name: 'Gang Territory', x: 10, y: 80, type: 'danger', description: 'Section controlled by rival gangs with constant turf wars' }
    ],
    markets: [
      { name: 'Sinkport City Market', x: 50, y: 50, type: 'general', description: 'General goods and services market' },
      { name: 'The Black Market', x: 25, y: 65, type: 'black_market', description: 'Illegal trading hub for contraband' },
      { name: 'Wyrm\'s Arsenal', x: 55, y: 55, type: 'weapons', description: 'Weapons and combat equipment dealer' },
      { name: 'Stellar Ship Chandlery', x: 45, y: 60, type: 'ship_parts', description: 'Ship parts and equipment' },
      { name: 'Tech Bazaar', x: 50, y: 58, type: 'technology', description: 'Technology, droids, and cybernetics' },
      { name: 'Entertainment District Vendors', x: 35, y: 40, type: 'street', description: 'Street vendors selling various goods' }
    ],
    fastTravelPoints: [
      { id: 'sinkport_spaceport', name: 'Sinkport City Spaceport', x: 48, y: 52, type: 'spaceport', description: 'Main spaceport' },
      { id: 'entertainment_district', name: 'Entertainment District', x: 35, y: 40, type: 'entertainment', description: 'Casinos and nightlife hub' },
      { id: 'vorr_palace', name: 'Vorr Palace Complex', x: 70, y: 30, type: 'palace', description: 'Vorr Cartel headquarters' }
    ],
    medicalCenters: [
      { name: 'Sinkport City Medical Center', x: 52, y: 48, type: 'medical_center', description: 'Main medical facility' },
      { name: 'Back Alley Clinic', x: 22, y: 69, type: 'medical_center', description: 'Discrete lower-level clinic' }
    ]
  },

  // Add more planets as needed...
  // Each planet should have terrain, mapLayout, pointsOfInterest, and markets
};

/**
 * Resolve POI overlaps by adjusting positions
 * This is a local copy of the function from galaxyController to avoid circular dependencies
 */
function resolvePOIOverlaps(pois) {
  if (!pois || pois.length === 0) return pois;
  
  // Filter out POIs without valid coordinates
  const validPOIs = pois.filter(poi => {
    const hasValidCoords = typeof poi.x === 'number' && typeof poi.y === 'number' && 
                           !isNaN(poi.x) && !isNaN(poi.y) &&
                           poi.x >= 0 && poi.x <= 100 &&
                           poi.y >= 0 && poi.y <= 100;
    if (!hasValidCoords) {
      console.warn(`[POI Overlap] Skipping POI ${poi.name || poi.id} with invalid coordinates: x=${poi.x}, y=${poi.y}`);
    }
    return hasValidCoords;
  });
  
  if (validPOIs.length === 0) return pois;
  
  // POI priority order (higher priority POIs keep their positions)
  const priorityOrder = {
    'spaceport': 10,
    'city': 9,
    'capital': 9,
    'medical_center': 8,
    'government': 7,
    'temple': 7,
    'base': 6,
    'fortress': 6,
    'market': 5,
    'cantina': 4,
    'entertainment': 4,
    'industrial': 3,
    'settlement': 3,
    'village': 3,
    'wilderness': 2,
    'landscape': 2,
    'province': 2,
    'danger': 1,
    'unknown': 0
  };
  
  const getPriority = (poi) => {
    return priorityOrder[poi.type] || priorityOrder['unknown'];
  };
  
  // Sort POIs by priority (highest first)
  const sortedPOIs = [...validPOIs].sort((a, b) => getPriority(b) - getPriority(a));
  
  // Minimum distance between POIs (15% of map to prevent sprite overlap)
  const minDistance = 15;
  
  const resolved = [];
  const occupiedPositions = [];
  
  for (const poi of sortedPOIs) {
    if (!poi) continue;
    
    let finalX = typeof poi.x === 'number' && !isNaN(poi.x) ? poi.x : 50;
    let finalY = typeof poi.y === 'number' && !isNaN(poi.y) ? poi.y : 50;
    
    finalX = Math.max(0, Math.min(100, finalX));
    finalY = Math.max(0, Math.min(100, finalY));
    
    // Check for overlaps
    const hasOverlap = occupiedPositions.some(occupied => {
      if (!occupied || typeof occupied.x !== 'number' || typeof occupied.y !== 'number') {
        return false;
      }
      const dx = occupied.x - finalX;
      const dy = occupied.y - finalY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < minDistance;
    });
    
    if (hasOverlap) {
      // Find a new position
      let foundPosition = false;
      const spiralOffsets = [
        { x: 0, y: -minDistance },
        { x: minDistance, y: 0 },
        { x: 0, y: minDistance },
        { x: -minDistance, y: 0 },
        { x: minDistance * 0.7, y: -minDistance * 0.7 },
        { x: minDistance * 0.7, y: minDistance * 0.7 },
        { x: -minDistance * 0.7, y: minDistance * 0.7 },
        { x: -minDistance * 0.7, y: -minDistance * 0.7 },
        { x: 0, y: -minDistance * 1.5 },
        { x: minDistance * 1.5, y: 0 },
        { x: 0, y: minDistance * 1.5 },
        { x: -minDistance * 1.5, y: 0 }
      ];
      
      for (const offset of spiralOffsets) {
        const testX = Math.max(5, Math.min(95, poi.x + offset.x));
        const testY = Math.max(5, Math.min(95, poi.y + offset.y));
        
        const stillOverlaps = occupiedPositions.some(occupied => {
          if (!occupied || typeof occupied.x !== 'number' || typeof occupied.y !== 'number') {
            return false;
          }
          const dx = occupied.x - testX;
          const dy = occupied.y - testY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance < minDistance;
        });
        
        if (!stillOverlaps) {
          finalX = testX;
          finalY = testY;
          foundPosition = true;
          break;
        }
      }
      
      if (!foundPosition) {
        const angle = Math.random() * Math.PI * 2;
        const radius = minDistance + (Math.random() * minDistance);
        finalX = Math.max(5, Math.min(95, poi.x + Math.cos(angle) * radius));
        finalY = Math.max(5, Math.min(95, poi.y + Math.sin(angle) * radius));
      }
    }
    
    const resolvedPOI = { ...poi };
    resolvedPOI.x = finalX;
    resolvedPOI.y = finalY;
    resolved.push(resolvedPOI);
    
    occupiedPositions.push({ x: finalX, y: finalY });
  }
  
  return resolved;
}

/**
 * Get map data for a planet
 * Falls back to generated data if no specific map exists
 */
function getPlanetMapData(planet) {
  const planetId = planet.id || planet.name?.toLowerCase().replace(/\s+/g, '_');
  const specificMap = planetMaps[planetId];

  if (specificMap) {
    // Ensure Medical Centers are in pointsOfInterest for rendering
    const mapData = { ...specificMap };
    if (mapData.medicalCenters && mapData.medicalCenters.length > 0) {
      // Initialize pointsOfInterest if it doesn't exist
      if (!mapData.pointsOfInterest) {
        mapData.pointsOfInterest = [];
      }
      
      // Add Medical Centers to pointsOfInterest if not already present
      mapData.medicalCenters.forEach(medicalCenter => {
        const exists = mapData.pointsOfInterest.some(
          poi => poi.name === medicalCenter.name && poi.type === 'medical_center'
        );
        if (!exists) {
          mapData.pointsOfInterest.push({
            name: medicalCenter.name,
            x: medicalCenter.x,
            y: medicalCenter.y,
            type: 'medical_center',
            description: medicalCenter.description
          });
        }
      });
    }
    
    // Generate spaceport property if not present (for frontend compatibility)
    if (!mapData.spaceport) {
      const spaceportPOI = mapData.pointsOfInterest?.find(poi => poi.type === 'spaceport');
      if (spaceportPOI) {
        // Calculate spawn position adjacent to spaceport
        const directions = [
          { x: 0, y: -3 },  // North
          { x: 3, y: 0 },   // East
          { x: 0, y: 3 },   // South
          { x: -3, y: 0 }   // West
        ];
        const spawnDir = directions[Math.floor(Math.random() * directions.length)];
        mapData.spaceport = {
          x: spaceportPOI.x,
          y: spaceportPOI.y,
          spawnX: Math.max(2, Math.min(98, spaceportPOI.x + spawnDir.x)),
          spawnY: Math.max(2, Math.min(98, spaceportPOI.y + spawnDir.y)),
          size: 2
        };
      } else if (mapData.mapLayout?.locations && mapData.mapLayout.locations.length > 0) {
        // Generate spaceport from first major city
        const majorCity = mapData.mapLayout.locations.find(loc => 
          loc.size === 'large' || loc.size === 'huge' || loc.type === 'capital'
        ) || mapData.mapLayout.locations[0];
        
        const offsetX = (Math.random() - 0.5) * 10;
        const offsetY = (Math.random() - 0.5) * 10;
        const spaceportX = Math.max(5, Math.min(95, majorCity.x + offsetX));
        const spaceportY = Math.max(5, Math.min(95, majorCity.y + offsetY));
        
        const directions = [
          { x: 0, y: -3 },  // North
          { x: 3, y: 0 },   // East
          { x: 0, y: 3 },   // South
          { x: -3, y: 0 }   // West
        ];
        const spawnDir = directions[Math.floor(Math.random() * directions.length)];
        
        mapData.spaceport = {
          x: spaceportX,
          y: spaceportY,
          spawnX: Math.max(2, Math.min(98, spaceportX + spawnDir.x)),
          spawnY: Math.max(2, Math.min(98, spaceportY + spawnDir.y)),
          size: 2
        };
      }
    }
    
    // Resolve POI overlaps across ALL location types (POIs, markets, medical centers) together
    // This ensures no overlaps between any map elements
    const allLocationPOIs = [];
    
    // Collect all POIs with their source array for later restoration
    if (mapData.pointsOfInterest) {
      mapData.pointsOfInterest.forEach(poi => {
        allLocationPOIs.push({ ...poi, _source: 'pointsOfInterest' });
      });
    }
    if (mapData.markets) {
      mapData.markets.forEach(poi => {
        allLocationPOIs.push({ ...poi, _source: 'markets' });
      });
    }
    if (mapData.medicalCenters) {
      mapData.medicalCenters.forEach(poi => {
        allLocationPOIs.push({ ...poi, _source: 'medicalCenters' });
      });
    }
    
    // Resolve overlaps across all POIs together
    if (allLocationPOIs.length > 1) {
      try {
        const resolvedAll = resolvePOIOverlaps(allLocationPOIs);
        
        // Restore POIs to their original arrays with resolved positions
        if (mapData.pointsOfInterest) {
          mapData.pointsOfInterest = resolvedAll
            .filter(poi => poi._source === 'pointsOfInterest')
            .map(poi => {
              const { _source, ...rest } = poi;
              return rest;
            });
        }
        if (mapData.markets) {
          mapData.markets = resolvedAll
            .filter(poi => poi._source === 'markets')
            .map(poi => {
              const { _source, ...rest } = poi;
              return rest;
            });
        }
        if (mapData.medicalCenters) {
          mapData.medicalCenters = resolvedAll
            .filter(poi => poi._source === 'medicalCenters')
            .map(poi => {
              const { _source, ...rest } = poi;
              return rest;
            });
        }
      } catch (error) {
        console.error(`[Planet Maps] Error resolving all POI overlaps for ${planetId}:`, error);
      }
    } else if (allLocationPOIs.length === 1) {
      // Single POI, just remove the _source flag
      const poi = allLocationPOIs[0];
      const { _source, ...rest } = poi;
      if (poi._source === 'pointsOfInterest' && mapData.pointsOfInterest) {
        mapData.pointsOfInterest[0] = rest;
      } else if (poi._source === 'markets' && mapData.markets) {
        mapData.markets[0] = rest;
      } else if (poi._source === 'medicalCenters' && mapData.medicalCenters) {
        mapData.medicalCenters[0] = rest;
      }
    }
    
    return mapData;
  }

  // Generate default map based on planet type
  const generatedMap = generateDefaultMap(planet);
  
  // Resolve POI overlaps in generated maps too
  if (generatedMap.pointsOfInterest && generatedMap.pointsOfInterest.length > 0) {
    try {
      generatedMap.pointsOfInterest = resolvePOIOverlaps(generatedMap.pointsOfInterest);
    } catch (error) {
      console.error(`[Planet Maps] Error resolving POI overlaps for generated map ${planetId}:`, error);
    }
  }
  
  return generatedMap;
}

/**
 * Generate a default map layout based on planet properties
 * Uses intelligent distribution to spread POIs across the map in narratively sensible ways
 */
function generateDefaultMap(planet) {
  const mapLayout = {
    type: planet.planetType || 'terrestrial',
    locations: []
  };

  // Helper function to get a seeded random for consistent placement
  const seed = (planet.id || planet.name || 'default').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seededRandom = (index) => {
    const x = Math.sin(seed + index) * 10000;
    return x - Math.floor(x);
  };

  // Helper function to check if a position is too close to existing locations
  const isTooClose = (x, y, existingLocations, minDistance = 8) => {
    return existingLocations.some(loc => {
      const dx = loc.x - x;
      const dy = loc.y - y;
      return Math.sqrt(dx * dx + dy * dy) < minDistance;
    });
  };

  // Helper function to find a good position (spread across map, not clustered)
  const findGoodPosition = (existingLocations, preferredRegion = null, minDistance = 8) => {
    let attempts = 0;
    let x, y;
    
    do {
      if (preferredRegion) {
        // Place in preferred region (e.g., edges for spaceports, center for cities)
        switch (preferredRegion) {
          case 'edge':
            // Place near map edges (for spaceports/landing zones)
            const edge = Math.floor(seededRandom(attempts) * 4); // 0-3 for N, E, S, W
            if (edge === 0) { // North
              x = 10 + seededRandom(attempts + 1) * 80;
              y = 5 + seededRandom(attempts + 2) * 10;
            } else if (edge === 1) { // East
              x = 85 + seededRandom(attempts + 1) * 10;
              y = 10 + seededRandom(attempts + 2) * 80;
            } else if (edge === 2) { // South
              x = 10 + seededRandom(attempts + 1) * 80;
              y = 85 + seededRandom(attempts + 2) * 10;
            } else { // West
              x = 5 + seededRandom(attempts + 1) * 10;
              y = 10 + seededRandom(attempts + 2) * 80;
            }
            break;
          case 'center':
            // Place in central region (for major cities)
            x = 30 + seededRandom(attempts + 1) * 40;
            y = 30 + seededRandom(attempts + 2) * 40;
            break;
          case 'remote':
            // Place in remote areas (for wilderness/landscape POIs)
            const corner = Math.floor(seededRandom(attempts) * 4);
            if (corner === 0) { // NW
              x = 5 + seededRandom(attempts + 1) * 25;
              y = 5 + seededRandom(attempts + 2) * 25;
            } else if (corner === 1) { // NE
              x = 70 + seededRandom(attempts + 1) * 25;
              y = 5 + seededRandom(attempts + 2) * 25;
            } else if (corner === 2) { // SW
              x = 5 + seededRandom(attempts + 1) * 25;
              y = 70 + seededRandom(attempts + 2) * 25;
            } else { // SE
              x = 70 + seededRandom(attempts + 1) * 25;
              y = 70 + seededRandom(attempts + 2) * 25;
            }
            break;
          default:
            // Random placement
            x = 10 + seededRandom(attempts + 1) * 80;
            y = 10 + seededRandom(attempts + 2) * 80;
        }
      } else {
        // Even distribution across map
        x = 10 + seededRandom(attempts + 1) * 80;
        y = 10 + seededRandom(attempts + 2) * 80;
      }
      
      // Clamp to valid range
      x = Math.max(5, Math.min(95, x));
      y = Math.max(5, Math.min(95, y));
      
      attempts++;
    } while (isTooClose(x, y, existingLocations, minDistance) && attempts < 50);
    
    return { x, y };
  };

  const allLocations = [];

  // Add cities as locations - distribute across map, prefer central regions
  if (planet.majorCities && planet.majorCities.length > 0) {
    planet.majorCities.forEach((city, index) => {
      const pos = findGoodPosition(allLocations, 'center', 12);
      const cityLoc = {
        name: city,
        x: pos.x,
        y: pos.y,
        type: 'city',
        size: index === 0 ? 'large' : 'medium', // First city is larger
        description: `Major city on ${planet.name}`
      };
      mapLayout.locations.push(cityLoc);
      allLocations.push(cityLoc);
    });
  }

  // Generate POIs based on planet type - spread across map
  const pointsOfInterest = [];
  
  // Spaceports - place near edges (for landing zones) but near cities
  if (planet.majorCities && planet.majorCities.length > 0) {
    planet.majorCities.forEach((city, index) => {
      // Find the city location
      const cityLoc = mapLayout.locations.find(loc => loc.name === city);
      if (cityLoc) {
        // Place spaceport near city but towards an edge
        const edgeDir = Math.floor(seededRandom(index * 10) * 4);
        let spaceportX, spaceportY;
        
        if (edgeDir === 0) { // North
          spaceportX = cityLoc.x + (seededRandom(index * 10 + 1) - 0.5) * 8;
          spaceportY = Math.max(5, cityLoc.y - 8 - seededRandom(index * 10 + 2) * 5);
        } else if (edgeDir === 1) { // East
          spaceportX = Math.min(95, cityLoc.x + 8 + seededRandom(index * 10 + 1) * 5);
          spaceportY = cityLoc.y + (seededRandom(index * 10 + 2) - 0.5) * 8;
        } else if (edgeDir === 2) { // South
          spaceportX = cityLoc.x + (seededRandom(index * 10 + 1) - 0.5) * 8;
          spaceportY = Math.min(95, cityLoc.y + 8 + seededRandom(index * 10 + 2) * 5);
        } else { // West
          spaceportX = Math.max(5, cityLoc.x - 8 - seededRandom(index * 10 + 1) * 5);
          spaceportY = cityLoc.y + (seededRandom(index * 10 + 2) - 0.5) * 8;
        }
        
        spaceportX = Math.max(5, Math.min(95, spaceportX));
        spaceportY = Math.max(5, Math.min(95, spaceportY));
        
        const spaceportPOI = {
          name: `${city} Spaceport`,
          x: spaceportX,
          y: spaceportY,
          type: 'spaceport',
          description: `Main landing facility in ${city}`
        };
        pointsOfInterest.push(spaceportPOI);
        allLocations.push(spaceportPOI);
      }
    });
  }

  // Generate markets - place near cities
  const markets = [];
  if (planet.population > 0 && planet.majorCities && planet.majorCities.length > 0) {
    planet.majorCities.slice(0, Math.min(3, planet.majorCities.length)).forEach((city, index) => {
      const cityLoc = mapLayout.locations.find(loc => loc.name === city);
      if (cityLoc) {
        // Place market near city center
        const offsetX = (seededRandom(index * 20) - 0.5) * 6;
        const offsetY = (seededRandom(index * 20 + 1) - 0.5) * 6;
        const market = {
          name: `${city} Market`,
          x: Math.max(5, Math.min(95, cityLoc.x + offsetX)),
          y: Math.max(5, Math.min(95, cityLoc.y + offsetY)),
          type: 'general',
          description: `Marketplace in ${city}`
        };
        markets.push(market);
        allLocations.push(market);
      }
    });
  }

  // Generate fast travel points (spaceports) - same as spaceport POIs
  const fastTravelPoints = [];
  pointsOfInterest.filter(poi => poi.type === 'spaceport').forEach(spaceport => {
    fastTravelPoints.push({
      id: `spaceport_${spaceport.name.toLowerCase().replace(/\s+/g, '_')}`,
      name: spaceport.name,
      x: spaceport.x,
      y: spaceport.y,
      type: 'spaceport',
      description: `Fast travel point: ${spaceport.name}`
    });
  });

  // Generate Medical Centers - place in major cities
  const medicalCenters = [];
  if (planet.majorCities && planet.majorCities.length > 0) {
    planet.majorCities.slice(0, Math.min(2, planet.majorCities.length)).forEach((city, index) => {
      const cityLoc = mapLayout.locations.find(loc => loc.name === city);
      if (cityLoc) {
        // Place medical center in city, offset from center
        const offsetX = (seededRandom(index * 30) - 0.5) * 5;
        const offsetY = (seededRandom(index * 30 + 1) - 0.5) * 5;
        const medicalCenter = {
          name: `${city} Medical Center`,
          x: Math.max(5, Math.min(95, cityLoc.x + offsetX)),
          y: Math.max(5, Math.min(95, cityLoc.y + offsetY)),
          type: 'medical_center',
          description: `Medical facility in ${city}`
        };
        medicalCenters.push(medicalCenter);
        pointsOfInterest.push(medicalCenter);
        allLocations.push(medicalCenter);
      }
    });
  } else {
    // If no cities, add a Medical Center at a distributed location
    const pos = findGoodPosition(allLocations, null, 10);
    const medicalCenter = {
      name: `${planet.name} Medical Center`,
      x: pos.x,
      y: pos.y,
      type: 'medical_center',
      description: `Medical facility on ${planet.name}`
    };
    medicalCenters.push(medicalCenter);
    pointsOfInterest.push(medicalCenter);
    allLocations.push(medicalCenter);
  }

  // Generate spaceport property (for frontend compatibility)
  let spaceport = null;
  const spaceportPOI = pointsOfInterest.find(poi => poi.type === 'spaceport');
  if (spaceportPOI) {
    // Calculate spawn position adjacent to spaceport
    const directions = [
      { x: 0, y: -3 },  // North
      { x: 3, y: 0 },   // East
      { x: 0, y: 3 },   // South
      { x: -3, y: 0 }   // West
    ];
    const spawnDir = directions[Math.floor(Math.random() * directions.length)];
    spaceport = {
      x: spaceportPOI.x,
      y: spaceportPOI.y,
      spawnX: Math.max(2, Math.min(98, spaceportPOI.x + spawnDir.x)),
      spawnY: Math.max(2, Math.min(98, spaceportPOI.y + spawnDir.y)),
      size: 2
    };
  } else if (mapLayout.locations && mapLayout.locations.length > 0) {
    // Generate spaceport from first major city if no spaceport POI exists
    const majorCity = mapLayout.locations.find(loc => 
      loc.size === 'large' || loc.size === 'huge' || loc.type === 'capital'
    ) || mapLayout.locations[0];
    
    const offsetX = (Math.random() - 0.5) * 10;
    const offsetY = (Math.random() - 0.5) * 10;
    const spaceportX = Math.max(5, Math.min(95, majorCity.x + offsetX));
    const spaceportY = Math.max(5, Math.min(95, majorCity.y + offsetY));
    
    const directions = [
      { x: 0, y: -3 },  // North
      { x: 3, y: 0 },   // East
      { x: 0, y: 3 },   // South
      { x: -3, y: 0 }   // West
    ];
    const spawnDir = directions[Math.floor(Math.random() * directions.length)];
    
    spaceport = {
      x: spaceportX,
      y: spaceportY,
      spawnX: Math.max(2, Math.min(98, spaceportX + spawnDir.x)),
      spawnY: Math.max(2, Math.min(98, spaceportY + spawnDir.y)),
      size: 2
    };
  }

  return {
    terrain: getTerrainType(planet.planetType, planet.climate),
    mapLayout,
    pointsOfInterest,
    markets,
    fastTravelPoints,
    medicalCenters,
    spaceport
  };
}

/**
 * Get terrain type based on planet type and climate
 */
function getTerrainType(planetType, climate) {
  const terrainMap = {
    terrestrial: {
      temperate: 'temperate_plains',
      arid: 'arid_plains',
      tropical: 'tropical_forest',
      frozen: 'tundra',
      variable: 'varied_terrain'
    },
    desert: {
      arid: 'desert',
      temperate: 'arid_plains',
      variable: 'desert'
    },
    jungle: {
      tropical: 'jungle',
      temperate: 'temperate_forest',
      variable: 'jungle'
    },
    ocean: {
      temperate: 'ocean',
      tropical: 'tropical_ocean',
      frozen: 'ice_ocean',
      variable: 'ocean'
    },
    ice: {
      frozen: 'ice',
      variable: 'ice'
    },
    volcanic: {
      variable: 'volcanic',
      temperate: 'volcanic'
    },
    urban: {
      temperate: 'urban_sprawl',
      variable: 'urban_sprawl'
    },
    gas_giant: {
      variable: 'gas_giant'
    },
    barren: {
      variable: 'barren',
      arid: 'barren'
    }
  };

  return terrainMap[planetType]?.[climate] || terrainMap[planetType]?.['variable'] || 'terrestrial_plains';
}

module.exports = {
  planetMaps,
  getPlanetMapData,
  generateDefaultMap,
  getTerrainType
};

