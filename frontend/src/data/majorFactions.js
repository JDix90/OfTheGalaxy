/**
 * The major galactic factions a player builds standing with.
 *
 * The Factions screen always shows this full roster (even at Neutral / 0) so a
 * new player can read the political landscape of the galaxy, rather than seeing
 * only the one or two factions they happen to have interacted with.
 */
export const MAJOR_FACTIONS = [
  { id: 'concord', name: 'The Concord', blurb: 'The reformed galactic union striving to hold the peace.' },
  { id: 'iron_dominion', name: 'The Iron Dominion', blurb: 'An authoritarian successor-state hungry to reclaim the galaxy.' },
  { id: 'keeper_order', name: 'The Keeper Order', blurb: 'Guardians who maintain the balance of the Veil.' },
  { id: 'hollow', name: 'The Hollow', blurb: 'Those who severed themselves from the Veil.' },
  { id: 'free_worlds', name: 'The Free Worlds', blurb: 'A loose alliance of independent systems.' },
  { id: 'ironkin', name: 'The Ironkin', blurb: 'Honor-bound warrior clans of Veshkar.' },
  { id: 'vorr', name: 'The Vorr', blurb: 'The crime syndicate that rules the Sprawl.' },
  { id: 'drift_cartel', name: 'The Drift Cartel', blurb: 'Smugglers and fixers who move anything for a price.' },
  { id: 'the_tally', name: 'The Tally', blurb: 'The galaxy-spanning guild of bounty hunters.' },
  { id: 'commerce_league', name: 'The Commerce League', blurb: 'A powerful mercantile bloc that profits from every war.' },
  { id: 'corporate_sector', name: 'The Corporate Sector', blurb: 'Corporate worlds governed by boardrooms, not senates.' }
];

export const NEUTRAL_TIER_INFO = { min: 0, max: 100, color: '#6b7280', label: 'Neutral' };

export default MAJOR_FACTIONS;
