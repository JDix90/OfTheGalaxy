/**
 * dialogueUtils — pure helpers shared by the dialogue store and the
 * ConversationView components. No React, no side effects.
 */

// Relationship tiers (thresholds match the backend: 15 / 40 / 70).
export const RELATIONSHIP_TIERS = ['stranger', 'acquaintance', 'friend', 'confidant'];

export function getRelationshipTier(level = 0) {
  if (level < 15) return 'stranger';
  if (level < 40) return 'acquaintance';
  if (level < 70) return 'friend';
  return 'confidant';
}

// Accent colour per tier — echoes the 3D nameplate vocabulary.
export function getRelationshipColor(level = 0) {
  if (level < 15) return '#7c8aa6';
  if (level < 40) return '#4a9eff';
  if (level < 70) return '#4ade80';
  return '#fbbf24';
}

// Faction id → display name (ported verbatim from the legacy interface).
const FACTION_DISPLAY_NAMES = {
  old_concord: 'Old Concord',
  iron_dominion: 'Iron Dominion',
  free_worlds: 'Free Worlds',
  concord: 'Concord',
  ascendancy: 'Ascendancy',
  uprising: 'Uprising',
  keeper_order: 'Keeper Order',
  hollow: 'Hollow',
  ironkin: 'Ironkin',
  vorr: 'Vorr',
  umbra: 'Umbra',
  scarlet_tide: 'Scarlet Tide',
  independent: 'Independent',
  neutral: 'Neutral',
  smugglers: 'Smugglers',
  the_tally: 'Bounty Hunters',
  commerce_league: 'Commerce League',
  secession: 'Secessionists',
  vorne_ascendancy: 'Vorne Ascendancy',
  hesperan_consortium: 'Hesperan Consortium',
};

export function getFactionDisplayName(factionId) {
  if (!factionId) return 'Unaffiliated';
  return (
    FACTION_DISPLAY_NAMES[factionId] ||
    factionId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

// Tier-appropriate default greeting when an NPC has no authored line.
export function getGreeting(npc, level = 0) {
  const tier = getRelationshipTier(level);
  if (npc?.dialogue?.greeting?.[tier]) return npc.dialogue.greeting[tier];
  const defaults = {
    stranger: `Hello. I don't believe we've met.`,
    acquaintance: `Oh, hello again.`,
    friend: `Good to see you, friend.`,
    confidant: `My dear friend, welcome.`,
  };
  return defaults[tier];
}

let _seq = 0;
export function makeMessageId(sender) {
  _seq += 1;
  return `${sender}_${Date.now()}_${_seq}`;
}

/**
 * Normalise a raw history message (server shape varies: it may carry
 * {sender,text} or the older {player}/{npc} split) into the canonical
 * { id, sender, text, ts } the store uses everywhere.
 */
export function normalizeMessage(raw) {
  if (!raw) return null;
  const sender = raw.sender || (raw.player ? 'player' : 'npc');
  const text = raw.text || raw.player || raw.npc || '';
  if (!text) return null;
  const ts = raw.timestamp ? new Date(raw.timestamp).getTime() : Date.now();
  return { id: raw.id || makeMessageId(sender), sender, text, ts };
}

/**
 * A suggested response can be a bare string or { text, icon, action }.
 * Normalise to an object and derive a short intent label for known actions
 * (honest: we only tag what the backend actually told us, no invented tone).
 */
const ACTION_LABELS = {
  accept_quest: 'Accept',
  quest_details: 'Ask',
  open_vendor: 'Trade',
  ready_for_combat: 'Ready',
  not_ready: 'Wait',
};

export function normalizeSuggestion(raw) {
  if (raw == null) return null;
  const obj = typeof raw === 'string' ? { text: raw } : { ...raw, text: raw.text || '' };
  if (!obj.text) return null;
  // Backend-authored `tone` wins; 'Neutral' renders no chip (keeps plain choices
  // clean). Fall back to an action-derived label when there's no meaningful tone.
  const tone = obj.tone && obj.tone !== 'Neutral' ? obj.tone : null;
  obj.label = tone || obj.label || (obj.action ? ACTION_LABELS[obj.action] : null) || null;
  return obj;
}
