/**
 * Planet to Texture Mapping
 * Maps planet IDs to their corresponding base terrain texture filenames
 */

export const planetTextureMap = {
  // Desert Worlds
  'gravenmoor': 'tex_gravenmoor_dune_sea_base_2048.webp',
  'karrn': 'tex_karrn_desert_base_2048.webp',

  // Urban/Industrial Worlds
  'centralis': 'tex_centralis_cityscape_base_2048.webp',
  'sinkport': 'tex_sinkport_urban_base_2048.webp',
  'greld': 'tex_greld_industrial_base_2048.webp',
  'ordwell': 'tex_ordwell_junkyard_base_2048.webp',

  // Forest/Jungle Worlds
  'verdholm': 'tex_verdholm_forest_base_2048.webp',
  'selvora': 'tex_selvora_jungle_base_2048.webp',
  'selvora_4': 'tex_selvora_jungle_base_2048.webp',
  'solenne': 'tex_solenne_forest_base_2048.webp',
  'myssia': 'tex_myssia_fungal_base_2048.webp',

  // Grassland/Plains Worlds
  'caldon': 'tex_caldon_grasslands_base_2048.webp',
  'axxila': 'tex_axxila_plains_base_2048.webp',

  // Ice/Snow Worlds
  'rime': 'tex_rime_ice_plains_base_2048.webp',

  // Volcanic Worlds
  'embervast': 'tex_embervast_lava_fields_base_2048.webp',

  // Swamp/Dark Worlds
  'mawthorn': 'tex_mawthorn_swamp_base_2048.webp',

  // Ocean/Water Worlds
  'thessmar': 'tex_thessmar_ocean_base_2048.webp',
  'dorrun': 'tex_thessmar_ocean_base_2048.webp', // Thessmar is also known as Dorrun

  // Unique/Special Worlds
  'sytha': 'tex_sytha_twilight_base_2048.webp',
  'cirruan': 'tex_cirruan_cloud_city_base_2048.webp',
  'veshkar': 'tex_veshkar_wasteland_base_2048.webp',

  // Fallback mappings for planets without specific textures
  // These will use the closest matching texture
  'drydock': 'tex_solenne_forest_base_2048.webp', // Similar temperate world
  'caelmore': 'tex_solenne_forest_base_2048.webp', // Similar peaceful world
  'eloria': 'tex_solenne_forest_base_2048.webp', // Similar forest world
  'verdance': 'tex_verdholm_forest_base_2048.webp', // Similar forest world
  'talveen': 'tex_gravenmoor_dune_sea_base_2048.webp', // Similar desert world
  'kthala': 'tex_rime_ice_plains_base_2048.webp', // Similar ice world
  'glaiv': 'tex_rime_ice_plains_base_2048.webp', // Similar ice world
  'pyrren': 'tex_embervast_lava_fields_base_2048.webp', // Similar volcanic world
  'casmer': 'tex_sytha_twilight_base_2048.webp', // Similar rocky world
  'tethys': 'tex_thessmar_ocean_base_2048.webp', // Similar ocean world
  'crait': 'tex_veshkar_wasteland_base_2048.webp', // Similar wasteland
  'jedha': 'tex_karrn_desert_base_2048.webp', // Similar desert world
};

/**
 * Get texture metadata for a planet
 * @param {string} planetId - Planet ID
 * @returns {Object|null} Texture metadata or null
 */
export function getTextureMetadata(planetId) {
  const textureMetadata = {
    'gravenmoor': {
      filename: 'tex_gravenmoor_dune_sea_base_2048.webp',
      colorPalette: ['#C19A6B', '#D4A574'],
      description: 'Warm golden sand dunes'
    },
    'centralis': {
      filename: 'tex_centralis_cityscape_base_2048.webp',
      colorPalette: ['#6B7280', '#4D88FF'],
      description: 'Futuristic city surface'
    },
    'verdholm': {
      filename: 'tex_verdholm_forest_base_2048.webp',
      colorPalette: ['#228B22', '#3E2723'],
      description: 'Dense forest canopy'
    },
    'rime': {
      filename: 'tex_rime_ice_plains_base_2048.webp',
      colorPalette: ['#F0F8FF', '#B0E0E6'],
      description: 'Frozen ice plains'
    },
    'embervast': {
      filename: 'tex_embervast_lava_fields_base_2048.webp',
      colorPalette: ['#1C1C1C', '#FF6B35', '#DC143C'],
      description: 'Black obsidian with glowing lava'
    },
    'caldon': {
      filename: 'tex_caldon_grasslands_base_2048.webp',
      colorPalette: ['#C2B280', '#7B845B'],
      description: 'Rolling grasslands'
    },
    // Add more as needed
  };

  return textureMetadata[planetId] || textureMetadata[planetId?.toLowerCase()] || null;
}
