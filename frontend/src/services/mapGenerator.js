/**
 * Procedural Planet Map Generator
 * Generates lore-accurate, detailed 2D maps for Star Wars planets
 * Based on canonical Star Wars lore and planet characteristics
 */

// Star Wars lore data for planet types and characteristics
const PLANET_LORE = {
  // Core Worlds
  centralis: {
    type: 'urban_sprawl',
    cities: [
      { name: 'Central Spire', type: 'capital', size: 'huge', importance: 10 },
      { name: 'Nightrun District', type: 'entertainment', size: 'large', importance: 8 },
      { name: 'Lowmarket', type: 'industrial', size: 'large', importance: 7 },
      { name: 'Assembly District', type: 'government', size: 'large', importance: 9 },
      { name: 'Keeper Sanctum', type: 'temple', size: 'medium', importance: 10 }
    ],
    pois: [
      { name: 'Concord Assembly Building', type: 'government', importance: 10 },
      { name: 'Keeper Sanctum', type: 'temple', importance: 10 },
      { name: 'Nightrun Entertainment District', type: 'entertainment', importance: 8 },
      { name: 'Lowmarket Markets', type: 'market', importance: 7 },
      { name: 'Centralis Underworld', type: 'danger', importance: 6 }
    ]
  },
  
  eloria: {
    type: 'temperate_plains',
    cities: [
      { name: 'Theed', type: 'capital', size: 'large', importance: 9 },
      { name: 'Otoh Gunga', type: 'underwater', size: 'medium', importance: 8 },
      { name: 'Kaadara', type: 'city', size: 'medium', importance: 6 },
      { name: 'Deeja Peak', type: 'settlement', size: 'small', importance: 4 }
    ],
    pois: [
      { name: 'Theed Royal Palace', type: 'palace', importance: 10 },
      { name: 'Otoh Gunga', type: 'city', importance: 8 },
      { name: 'Eloria Plains', type: 'landscape', importance: 5 },
      { name: 'Eloria Swamp', type: 'wilderness', importance: 4 },
      { name: 'Eloria Spaceport', type: 'spaceport', importance: 9 }
    ],
    regions: [
      { name: 'Lake Paonga', type: 'water', size: 'large' },
      { name: 'Plains of Eloria', type: 'grassland', size: 'large' },
      { name: 'Swamp of Eloria', type: 'swamp', size: 'medium' }
    ]
  },
  
  gravenmoor: {
    type: 'desert',
    cities: [
      { name: 'Greywell', type: 'spaceport', size: 'large', importance: 9 },
      { name: 'Dustreach', type: 'settlement', size: 'medium', importance: 7 },
      { name: 'Mos Entha', type: 'settlement', size: 'small', importance: 5 },
      { name: 'Anchorhead', type: 'settlement', size: 'small', importance: 4 },
      { name: 'Bestine', type: 'settlement', size: 'medium', importance: 6 }
    ],
    pois: [
      { name: 'Greywell Cantina', type: 'cantina', importance: 9 },
      { name: 'Dustreach Podracing Arena', type: 'arena', importance: 8 },
      { name: "Vorga's Palace", type: 'palace', importance: 10 },
      { name: 'Marn Homestead', type: 'homestead', importance: 7 },
      { name: 'Devourer Pit', type: 'danger', importance: 8 }
    ],
    regions: [
      { name: 'Sunder Wastes', type: 'desert', size: 'huge' },
      { name: 'Dune Sea', type: 'desert', size: 'huge' },
      { name: 'Dune Nomad Territory', type: 'danger', size: 'large' }
    ]
  },
  
  verdholm: {
    type: 'jungle',
    cities: [
      { name: 'Kachirho', type: 'city', size: 'large', importance: 9 },
      { name: 'Rwookrrorro', type: 'city', size: 'medium', importance: 7 },
      { name: 'Thikkiiana', type: 'city', size: 'medium', importance: 6 }
    ],
    pois: [
      { name: 'Kachirho Tree City', type: 'city', importance: 9 },
      { name: 'Shadowlands', type: 'danger', importance: 8 },
      { name: 'Wroshyr Grove', type: 'landscape', importance: 6 }
    ],
    regions: [
      { name: 'Shadowlands', type: 'jungle', size: 'huge' },
      { name: 'Wroshyr Trees', type: 'forest', size: 'huge' }
    ]
  },
  
  rime: {
    type: 'ice',
    cities: [
      { name: 'Echo Base', type: 'base', size: 'medium', importance: 9 }
    ],
    pois: [
      { name: 'Echo Base', type: 'base', importance: 10 },
      { name: 'Wampa Cave', type: 'danger', importance: 6 },
      { name: 'Ridgeback Territory', type: 'wilderness', importance: 4 }
    ],
    regions: [
      { name: 'Ice Plains', type: 'ice', size: 'huge' },
      { name: 'Frozen Wasteland', type: 'ice', size: 'huge' }
    ]
  },
  
  cirruan: {
    type: 'gas_giant',
    cities: [
      { name: 'Cloud City', type: 'city', size: 'large', importance: 10 }
    ],
    pois: [
      { name: 'Cloud City', type: 'city', importance: 10 },
      { name: 'Tibanna Gas Mines', type: 'industrial', importance: 8 },
      { name: 'Cloud City Casino', type: 'entertainment', importance: 7 }
    ]
  },
  
  verdance: {
    type: 'forest',
    cities: [
      { name: 'Bright Tree Village', type: 'village', size: 'medium', importance: 8 }
    ],
    pois: [
      { name: 'Bright Tree Village', type: 'village', importance: 8 },
      { name: 'Brindle Village', type: 'village', importance: 7 },
      { name: 'Death Star II Wreckage', type: 'wreckage', importance: 9 }
    ],
    regions: [
      { name: 'Forest Moon', type: 'forest', size: 'huge' }
    ]
  },
  
  embervast: {
    type: 'volcanic',
    cities: [
      { name: 'Embervast Mining Facility', type: 'industrial', size: 'medium', importance: 8 }
    ],
    pois: [
      { name: 'Korrth\'s Castle', type: 'fortress', importance: 10 },
      { name: 'Mining Facility', type: 'industrial', importance: 8 },
      { name: 'Lava Rivers', type: 'danger', importance: 7 }
    ],
    regions: [
      { name: 'Lava Fields', type: 'volcanic', size: 'huge' },
      { name: 'Volcanic Wasteland', type: 'volcanic', size: 'huge' }
    ]
  }
};

/**
 * Generate procedural map data for a planet
 * @param {Object} planet - Planet data from database
 * @returns {Object} Generated map data
 */
export function generateProceduralMap(planet) {
  const planetName = planet.name?.toLowerCase().replace(/\s+/g, '');
  const loreData = PLANET_LORE[planetName];
  
  // If we have specific lore data, use it
  if (loreData) {
    return generateFromLore(planet, loreData);
  }
  
  // Otherwise, generate based on planet characteristics
  return generateFromCharacteristics(planet);
}

/**
 * Generate map from specific Star Wars lore data
 */
function generateFromLore(planet, loreData) {
  const mapData = {
    terrain: loreData.type,
    mapLayout: {
      type: planet.planetType || 'terrestrial',
      locations: [],
      regions: loreData.regions || []
    },
    pointsOfInterest: [],
    markets: [],
    pathways: []
  };

  // Generate city locations
  const cities = loreData.cities || [];
  cities.forEach((city, index) => {
    const angle = (index / Math.max(cities.length, 1)) * Math.PI * 2;
    const radius = 20 + (city.importance / 10) * 15;
    const x = 50 + Math.cos(angle) * radius;
    const y = 50 + Math.sin(angle) * radius;
    
    mapData.mapLayout.locations.push({
      name: city.name,
      x: Math.max(10, Math.min(90, x)),
      y: Math.max(10, Math.min(90, y)),
      type: city.type,
      size: city.size,
      description: `${city.name} - ${getCityDescription(city.type)}`
    });
  });

  // Generate POIs near cities
  const pois = loreData.pois || [];
  pois.forEach((poi, index) => {
    // Find nearest city or place randomly
    const cityIndex = index % cities.length;
    const city = mapData.mapLayout.locations[cityIndex];
    const offsetX = (Math.random() - 0.5) * 15;
    const offsetY = (Math.random() - 0.5) * 15;
    
    mapData.pointsOfInterest.push({
      name: poi.name,
      x: Math.max(5, Math.min(95, city.x + offsetX)),
      y: Math.max(5, Math.min(95, city.y + offsetY)),
      type: poi.type,
      description: getPOIDescription(poi.type, poi.name)
    });
  });

  // Generate markets in major cities
  mapData.mapLayout.locations
    .filter(loc => loc.size === 'large' || loc.size === 'huge' || loc.type === 'capital')
    .forEach((city, index) => {
      mapData.markets.push({
        name: `${city.name} Market`,
        x: city.x + (Math.random() - 0.5) * 5,
        y: city.y + (Math.random() - 0.5) * 5,
        type: 'general',
        description: `Marketplace in ${city.name}`
      });
    });

  // Generate pathways between major locations
  mapData.pathways = generatePathways(mapData.mapLayout.locations);

  // Generate spaceport building (2x2 grid square)
  const spaceport = generateSpaceport(mapData.mapLayout.locations);
  mapData.spaceport = spaceport;

  return mapData;
}

/**
 * Generate map from planet characteristics when no specific lore exists
 */
function generateFromCharacteristics(planet) {
  const terrainType = getTerrainFromPlanetType(planet.planetType, planet.climate, planet.name);
  const population = planet.population || 0;
  const hasMajorCities = population > 1000000;
  const cityCount = hasMajorCities ? Math.min(5, Math.floor(Math.log10(population || 1))) : 1;

  const mapData = {
    terrain: terrainType,
    mapLayout: {
      type: planet.planetType || 'terrestrial',
      locations: [],
      regions: []
    },
    pointsOfInterest: [],
    markets: [],
    pathways: []
  };

  // Generate cities based on population
  for (let i = 0; i < cityCount; i++) {
    const angle = (i / cityCount) * Math.PI * 2;
    const radius = 15 + i * 10;
    const x = 50 + Math.cos(angle) * radius;
    const y = 50 + Math.sin(angle) * radius;
    
    const citySize = i === 0 ? 'large' : i === 1 ? 'medium' : 'small';
    const cityType = i === 0 ? 'capital' : 'city';
    
    mapData.mapLayout.locations.push({
      name: `${planet.name} City ${i + 1}`,
      x: Math.max(10, Math.min(90, x)),
      y: Math.max(10, Math.min(90, y)),
      type: cityType,
      size: citySize,
      description: `${citySize === 'large' ? 'Capital' : 'Major'} city on ${planet.name}`
    });
  }

  // Generate POIs
  const poiCount = Math.min(5, cityCount + 2);
  for (let i = 0; i < poiCount; i++) {
    const cityIndex = i % cityCount;
    const city = mapData.mapLayout.locations[cityIndex];
    const offsetX = (Math.random() - 0.5) * 20;
    const offsetY = (Math.random() - 0.5) * 20;
    
    const poiTypes = ['spaceport', 'market', 'landscape', 'wilderness'];
    const poiType = poiTypes[i % poiTypes.length];
    
    mapData.pointsOfInterest.push({
      name: `${planet.name} ${poiType.charAt(0).toUpperCase() + poiType.slice(1)} ${i + 1}`,
      x: Math.max(5, Math.min(95, city.x + offsetX)),
      y: Math.max(5, Math.min(95, city.y + offsetY)),
      type: poiType,
      description: `${poiType} on ${planet.name}`
    });
  }

  // Generate markets
  mapData.mapLayout.locations
    .filter(loc => loc.size === 'large' || loc.size === 'medium')
    .forEach((city, index) => {
      mapData.markets.push({
        name: `${city.name} Market`,
        x: city.x + (Math.random() - 0.5) * 5,
        y: city.y + (Math.random() - 0.5) * 5,
        type: 'general',
        description: `Marketplace in ${city.name}`
      });
    });

  // Generate pathways
  mapData.pathways = generatePathways(mapData.mapLayout.locations);

  // Generate spaceport building (2x2 grid square)
  const spaceport = generateSpaceport(mapData.mapLayout.locations);
  mapData.spaceport = spaceport;

  return mapData;
}

/**
 * Generate pathways between locations
 */
function generatePathways(locations) {
  const pathways = [];
  
  if (!locations || locations.length === 0) {
    return pathways;
  }
  
  // Connect major cities (large/huge/capital) or all cities if no major ones
  const majorLocations = locations.filter(
    loc => loc.size === 'large' || loc.size === 'huge' || loc.type === 'capital'
  );
  
  // If no major locations, use all locations
  const locationsToConnect = majorLocations.length >= 2 ? majorLocations : locations;
  
  // Need at least 2 locations to create pathways
  if (locationsToConnect.length < 2) {
    return pathways;
  }
  
  for (let i = 0; i < locationsToConnect.length; i++) {
    for (let j = i + 1; j < locationsToConnect.length; j++) {
      const loc1 = locationsToConnect[i];
      const loc2 = locationsToConnect[j];
      
      if (!loc1 || !loc2 || !loc1.x || !loc1.y || !loc2.x || !loc2.y) {
        continue;
      }
      
      const dx = loc1.x - loc2.x;
      const dy = loc1.y - loc2.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Connect if within reasonable distance (up to 80% of map)
      if (distance < 80) {
        pathways.push({
          from: { x: loc1.x, y: loc1.y },
          to: { x: loc2.x, y: loc2.y },
          distance: distance
        });
      }
    }
  }
  
  return pathways;
}

/**
 * Get terrain type from planet characteristics
 * Uses lore-accurate mapping for Star Wars planets
 */
function getTerrainFromPlanetType(planetType, climate, planetName = '') {
  const name = planetName.toLowerCase();
  
  // Lore-accurate mapping for specific planets
  const specificPlanets = {
    'centralis': 'urban_sprawl',
    'gravenmoor': 'desert',
    'karrn': 'desert',
    'talveen': 'desert',
    'verdholm': 'jungle',
    'myssia': 'jungle',
    'verdance': 'forest',
    'eloria': 'tropical_forest',
    'coralsec': 'tropical_ocean',
    'tethys': 'ocean',
    'mon cala': 'ocean',
    'dorrun': 'ocean',
    'rime': 'ice',
    'kthala': 'ice',
    'glaiv': 'ice',
    'embervast': 'lava_field',
    'pyrren': 'volcanic',
    'mirefen': 'swamp',
    'casmer': 'canyon',
    'sytha': 'arid_plains',
    'cirruan': 'gas_giant',
    'crait': 'barren',
    'jedha': 'barren',
    'drydock': 'temperate_plains',
    'caelmore': 'temperate_plains',
    'solenne': 'temperate_plains'
  };
  
  if (specificPlanets[name]) {
    return specificPlanets[name];
  }
  
  // Generic mapping based on planet type and climate
  const terrainMap = {
    urban: 'urban_sprawl',
    desert: 'desert',
    jungle: 'jungle',
    ocean: climate === 'tropical' ? 'tropical_ocean' : 'ocean',
    ice: 'ice',
    volcanic: 'volcanic',
    barren: 'barren',
    terrestrial: {
      temperate: 'temperate_plains',
      arid: 'arid_plains',
      tropical: 'tropical_forest',
      frozen: 'tundra',
      variable: 'varied_terrain'
    },
    gas_giant: 'gas_giant'
  };
  
  if (terrainMap[planetType]) {
    if (typeof terrainMap[planetType] === 'object') {
      return terrainMap[planetType][climate] || 'temperate_plains';
    }
    return terrainMap[planetType];
  }
  
  return 'temperate_plains';
}

/**
 * Get city description based on type
 */
function getCityDescription(type) {
  const descriptions = {
    capital: 'Capital city and seat of government',
    city: 'Major population center',
    settlement: 'Small settlement',
    village: 'Rural village',
    underwater: 'Underwater city',
    base: 'Military or research base',
    industrial: 'Industrial center',
    entertainment: 'Entertainment district'
  };
  return descriptions[type] || 'Settlement';
}

/**
 * Get POI description
 */
function getPOIDescription(type, name) {
  const descriptions = {
    palace: 'Royal or government palace',
    spaceport: 'Spaceport and landing facility',
    market: 'Trading market',
    cantina: 'Cantina and gathering place',
    arena: 'Arena for competitions',
    fortress: 'Military fortress',
    temple: 'Religious or Keeper temple',
    danger: 'Dangerous area',
    landscape: 'Notable landscape feature',
    wilderness: 'Wilderness area',
    wreckage: 'Crash site or wreckage',
    base: 'Military or research base'
  };
  return descriptions[type] || `${type} on planet`;
}

/**
 * Generate a spaceport building (2x2 grid square) and return spawn position
 */
function generateSpaceport(locations) {
  // Find a good location for the spaceport (prefer near a major city)
  let spaceportX, spaceportY;
  
  if (locations && locations.length > 0) {
    // Find the first major city or use the first city
    const majorCity = locations.find(loc => 
      loc.size === 'large' || loc.size === 'huge' || loc.type === 'capital'
    ) || locations[0];
    
    // Place spaceport near the city (within 10% of map)
    const offsetX = (Math.random() - 0.5) * 10;
    const offsetY = (Math.random() - 0.5) * 10;
    spaceportX = Math.max(5, Math.min(95, majorCity.x + offsetX));
    spaceportY = Math.max(5, Math.min(95, majorCity.y + offsetY));
  } else {
    // No cities, place randomly but not at edges
    spaceportX = 20 + Math.random() * 60;
    spaceportY = 20 + Math.random() * 60;
  }
  
  // Calculate spawn position (adjacent to spaceport, one of 4 directions)
  const directions = [
    { x: 0, y: -3 },  // North
    { x: 3, y: 0 },   // East
    { x: 0, y: 3 },   // South
    { x: -3, y: 0 }   // West
  ];
  const spawnDir = directions[Math.floor(Math.random() * directions.length)];
  const spawnX = Math.max(2, Math.min(98, spaceportX + spawnDir.x));
  const spawnY = Math.max(2, Math.min(98, spaceportY + spawnDir.y));
  
  return {
    x: spaceportX,
    y: spaceportY,
    spawnX: spawnX,
    spawnY: spawnY,
    size: 2 // 2x2 grid squares
  };
}

