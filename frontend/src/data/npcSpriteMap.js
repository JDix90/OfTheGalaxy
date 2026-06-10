/**
 * NPC Sprite Mapping
 * Maps NPC types to their corresponding sprite filenames
 */

export const npcSpriteMap = {
  'kinrath': 'spr_npc_kinrath_128.png',
  'tusken_raider': 'spr_npc_tusken_raider_128.png',
  'tusken': 'spr_npc_tusken_raider_128.png',
  'wookiee': 'spr_npc_wookiee_128.png',
  'wookie': 'spr_npc_wookiee_128.png',
  'twilek': 'spr_npc_twilek_128.png',
  'twilek': 'spr_npc_twilek_128.png',
  'stormtrooper': 'spr_npc_stormtrooper_128.png',
  'storm_trooper': 'spr_npc_stormtrooper_128.png',
};

/**
 * Get NPC sprite filename
 * @param {string} npcType - NPC type
 * @returns {string|null} Sprite filename or null
 */
export function getNPCSpriteFilename(npcType) {
  if (!npcType) return null;
  return npcSpriteMap[npcType] || npcSpriteMap[npcType.toLowerCase()] || null;
}
