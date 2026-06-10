/**
 * Planet to Texture Mapping
 * Maps planet IDs to their corresponding base terrain texture filenames
 */

export const planetTextureMap = {
  // Desert Worlds
  'tatooine': 'tex_tatooine_dune_sea_base_2048.webp',
  'geonosis': 'tex_geonosis_desert_base_2048.webp',

  // Urban/Industrial Worlds
  'coruscant': 'tex_coruscant_cityscape_base_2048.webp',
  'nar_shaddaa': 'tex_nar_shaddaa_urban_base_2048.webp',
  'eriadu': 'tex_eriadu_industrial_base_2048.webp',
  'ord_mantell': 'tex_ord_mantell_junkyard_base_2048.webp',

  // Forest/Jungle Worlds
  'kashyyyk': 'tex_kashyyyk_forest_base_2048.webp',
  'yavin': 'tex_yavin_jungle_base_2048.webp',
  'yavin_4': 'tex_yavin_jungle_base_2048.webp',
  'chandrila': 'tex_chandrila_forest_base_2048.webp',
  'felucia': 'tex_felucia_fungal_base_2048.webp',

  // Grassland/Plains Worlds
  'dantooine': 'tex_dantooine_grasslands_base_2048.webp',
  'axxila': 'tex_axxila_plains_base_2048.webp',

  // Ice/Snow Worlds
  'hoth': 'tex_hoth_ice_plains_base_2048.webp',

  // Volcanic Worlds
  'mustafar': 'tex_mustafar_lava_fields_base_2048.webp',

  // Swamp/Dark Worlds
  'dathomir': 'tex_dathomir_swamp_base_2048.webp',

  // Ocean/Water Worlds
  'mon_cala': 'tex_mon_cala_ocean_base_2048.webp',
  'dac': 'tex_mon_cala_ocean_base_2048.webp', // Mon Cala is also known as Dac

  // Unique/Special Worlds
  'ryloth': 'tex_ryloth_twilight_base_2048.webp',
  'bespin': 'tex_bespin_cloud_city_base_2048.webp',
  'mandalore': 'tex_mandalore_wasteland_base_2048.webp',

  // Fallback mappings for planets without specific textures
  // These will use the closest matching texture
  'corellia': 'tex_chandrila_forest_base_2048.webp', // Similar temperate world
  'alderaan': 'tex_chandrila_forest_base_2048.webp', // Similar peaceful world
  'naboo': 'tex_chandrila_forest_base_2048.webp', // Similar forest world
  'endor': 'tex_kashyyyk_forest_base_2048.webp', // Similar forest world
  'jakku': 'tex_tatooine_dune_sea_base_2048.webp', // Similar desert world
  'ilum': 'tex_hoth_ice_plains_base_2048.webp', // Similar ice world
  'mygeeto': 'tex_hoth_ice_plains_base_2048.webp', // Similar ice world
  'sullust': 'tex_mustafar_lava_fields_base_2048.webp', // Similar volcanic world
  'utapau': 'tex_ryloth_twilight_base_2048.webp', // Similar rocky world
  'kamino': 'tex_mon_cala_ocean_base_2048.webp', // Similar ocean world
  'crait': 'tex_mandalore_wasteland_base_2048.webp', // Similar wasteland
  'jedha': 'tex_geonosis_desert_base_2048.webp', // Similar desert world
};

/**
 * Get texture metadata for a planet
 * @param {string} planetId - Planet ID
 * @returns {Object|null} Texture metadata or null
 */
export function getTextureMetadata(planetId) {
  const textureMetadata = {
    'tatooine': {
      filename: 'tex_tatooine_dune_sea_base_2048.webp',
      colorPalette: ['#C19A6B', '#D4A574'],
      description: 'Warm golden sand dunes'
    },
    'coruscant': {
      filename: 'tex_coruscant_cityscape_base_2048.webp',
      colorPalette: ['#6B7280', '#4D88FF'],
      description: 'Futuristic city surface'
    },
    'kashyyyk': {
      filename: 'tex_kashyyyk_forest_base_2048.webp',
      colorPalette: ['#228B22', '#3E2723'],
      description: 'Dense forest canopy'
    },
    'hoth': {
      filename: 'tex_hoth_ice_plains_base_2048.webp',
      colorPalette: ['#F0F8FF', '#B0E0E6'],
      description: 'Frozen ice plains'
    },
    'mustafar': {
      filename: 'tex_mustafar_lava_fields_base_2048.webp',
      colorPalette: ['#1C1C1C', '#FF6B35', '#DC143C'],
      description: 'Black obsidian with glowing lava'
    },
    'dantooine': {
      filename: 'tex_dantooine_grasslands_base_2048.webp',
      colorPalette: ['#C2B280', '#7B845B'],
      description: 'Rolling grasslands'
    },
    // Add more as needed
  };

  return textureMetadata[planetId] || textureMetadata[planetId?.toLowerCase()] || null;
}
