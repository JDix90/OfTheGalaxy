/**
 * POI Sprite Mapping
 * Maps POI types to their corresponding sprite filenames
 */

export const poiSpriteMap = {
  // Primary mappings
  'spaceport': 'spr_poi_mos_eisley_128.png',
  'temple': 'spr_poi_jedi_temple_128.png',
  'ruins': 'spr_poi_enclave_ruins_128.png',
  'garrison': 'spr_poi_imperial_garrison_128.png',
  'rebel_base': 'spr_poi_rebel_base_128.png',
  'settlement': 'spr_poi_settlement_128.png',
  'cave': 'spr_poi_cave_128.png',
  'landing_zone': 'spr_poi_landing_zone_128.png',
  'cantina': 'spr_poi_cantina_128.png',
  'factory': 'spr_poi_factory_128.png',

  // Alternative/fallback mappings
  'jedi_temple': 'spr_poi_jedi_temple_128.png',
  'sith_temple': 'spr_poi_jedi_temple_128.png',
  'enclave': 'spr_poi_enclave_ruins_128.png',
  'enclave_ruins': 'spr_poi_enclave_ruins_128.png',
  'imperial_base': 'spr_poi_imperial_garrison_128.png',
  'military_base': 'spr_poi_imperial_garrison_128.png',
  'fortress': 'spr_poi_imperial_garrison_128.png',
  'outpost': 'spr_poi_settlement_128.png',
  'village': 'spr_poi_settlement_128.png',
  'town': 'spr_poi_settlement_128.png',
  'city': 'spr_poi_settlement_128.png',
  'tavern': 'spr_poi_cantina_128.png',
  'bar': 'spr_poi_cantina_128.png',
  'industrial': 'spr_poi_factory_128.png',
  'mine': 'spr_poi_factory_128.png',
  'facility': 'spr_poi_factory_128.png',
  'wreckage': 'spr_poi_enclave_ruins_128.png',
  'crash_site': 'spr_poi_enclave_ruins_128.png',
  'landing_pad': 'spr_poi_landing_zone_128.png',
  'spaceport_building': 'spr_poi_mos_eisley_128.png',
  'mos_eisley': 'spr_poi_mos_eisley_128.png',
  'mos_espa': 'spr_poi_mos_eisley_128.png',
  'base': 'spr_poi_rebel_base_128.png',
  'hideout': 'spr_poi_rebel_base_128.png',
  'lair': 'spr_poi_cave_128.png',
  'den': 'spr_poi_cave_128.png',
  
  // Medical and service facilities
  'medical_center': 'spr_poi_settlement_128.png',
  'medical': 'spr_poi_settlement_128.png',
  'hospital': 'spr_poi_settlement_128.png',
  'clinic': 'spr_poi_settlement_128.png',
  
  // Market and trade
  'market': 'spr_poi_cantina_128.png',
  'bazaar': 'spr_poi_cantina_128.png',
  'trading_post': 'spr_poi_cantina_128.png',
};

/**
 * Get POI sprite filename
 * @param {string} poiType - POI type
 * @returns {string|null} Sprite filename or null
 */
export function getPOISpriteFilename(poiType) {
  if (!poiType) return null;
  return poiSpriteMap[poiType] || poiSpriteMap[poiType.toLowerCase()] || null;
}
