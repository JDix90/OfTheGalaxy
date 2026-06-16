/**
 * factionNames — resolve a faction id to its natural-language display name.
 *
 * Some faction ids don't title-case cleanly (e.g. `the_tally` is the Bounty
 * Hunters, `secession` reads as "Secessionists"), so we keep an explicit roster
 * and fall back to formatDisplayName for anything not listed. Use this anywhere a
 * factionId would otherwise be shown raw.
 */
import { formatDisplayName } from './formatName';

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
  hesperan_consortium: 'Hesperan Consortium'
};

export function getFactionDisplayName(factionId) {
  if (!factionId) return 'Unaffiliated';
  return FACTION_DISPLAY_NAMES[factionId] || formatDisplayName(factionId);
}

export default getFactionDisplayName;
