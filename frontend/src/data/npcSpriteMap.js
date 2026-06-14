/**
 * NPC Sprite Mapping
 * Maps NPC types to their corresponding sprite filenames
 */

export const npcSpriteMap = {
  'venox': 'spr_npc_venox_128.png',
  'dune_nomad_raider': 'spr_npc_dune_nomad_raider_128.png',
  'dune_nomad': 'spr_npc_dune_nomad_raider_128.png',
  'ursk': 'spr_npc_ursk_128.png',
  'wookie': 'spr_npc_ursk_128.png',
  'sytheen': 'spr_npc_sytheen_128.png',
  'sytheen': 'spr_npc_sytheen_128.png',
  'ironclad': 'spr_npc_ironclad_128.png',
  'storm_trooper': 'spr_npc_ironclad_128.png',
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
