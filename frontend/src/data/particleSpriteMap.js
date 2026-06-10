/**
 * Particle Sprite Mapping
 * Maps particle effect types to their corresponding sprite filenames
 */

export const particleSpriteMap = {
  'sand': 'spr_particle_sand_64.png',
  'mist': 'spr_particle_mist_64.png',
  'ice_crystal': 'spr_particle_ice_crystal_64.png',
  'ice': 'spr_particle_ice_crystal_64.png',
  'snow': 'spr_particle_ice_crystal_64.png',
  'ember': 'spr_particle_ember_64.png',
  'embers': 'spr_particle_ember_64.png',
  'pollen': 'spr_particle_pollen_64.png',
  'spores': 'spr_particle_pollen_64.png',
};

/**
 * Get particle sprite filename
 * @param {string} particleType - Particle type
 * @returns {string|null} Sprite filename or null
 */
export function getParticleSpriteFilename(particleType) {
  if (!particleType) return null;
  return particleSpriteMap[particleType] || particleSpriteMap[particleType.toLowerCase()] || null;
}

/**
 * Planet to particle effect mapping
 * Determines which particle effect should be used for each planet
 */
export const planetParticleMap = {
  // Desert worlds - sand particles
  'tatooine': 'sand',
  'geonosis': 'sand',
  'jakku': 'sand',

  // Forest/jungle worlds - mist particles
  'dantooine': 'mist',
  'kashyyyk': 'mist',
  'chandrila': 'mist',
  'yavin': 'pollen',
  'yavin_4': 'pollen',

  // Ice worlds - ice crystals
  'hoth': 'ice_crystal',
  'ilum': 'ice_crystal',
  'mygeeto': 'ice_crystal',

  // Volcanic worlds - embers
  'mustafar': 'ember',
  'sullust': 'ember',

  // Alien worlds - pollen/spores
  'felucia': 'pollen',
};

/**
 * Get particle type for a planet
 * @param {string} planetId - Planet ID
 * @returns {string|null} Particle type or null
 */
export function getParticleTypeForPlanet(planetId) {
  if (!planetId) return null;
  return planetParticleMap[planetId] || planetParticleMap[planetId.toLowerCase()] || null;
}
