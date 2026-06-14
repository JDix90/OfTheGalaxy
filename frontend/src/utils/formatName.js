/**
 * formatName — turn raw ids/keys into human-readable display text.
 *
 * Used as a safety net so snake_case / kebab-case / camelCase identifiers
 * (planet ids, faction ids, occupations, item ids, etc.) never leak into the UI
 * as raw text. Prefer a real `name` field from the data when one exists; fall
 * back to this when only an id is available.
 *
 *   formatDisplayName('solenne')            -> 'Solenne'
 *   formatDisplayName('commerce_league')   -> 'Commerce League'
 *   formatDisplayName('ship_parts_dealer')  -> 'Ship Parts Dealer'
 *   formatDisplayName('pulser_rifle_01')    -> 'Pulser Rifle 01'
 *   formatDisplayName('Hanna City Spaceport') -> 'Hanna City Spaceport' (unchanged)
 */

// Small words that read better lowercased mid-phrase.
const MINOR_WORDS = new Set(['the', 'of', 'and', 'a', 'an', 'to', 'in', 'on']);

export function formatDisplayName(value) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') return String(value);

  const raw = value.trim();
  if (!raw) return '';

  // Split snake_case / kebab-case and camelCase boundaries into words.
  const spaced = raw
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();

  const words = spaced.split(' ');
  return words
    .map((word, i) => {
      if (!word) return word;
      const lower = word.toLowerCase();
      // Keep all-uppercase acronyms / model codes (VK, L11) as-is.
      if (/^[A-Z0-9]{2,}$/.test(word)) return word;
      // Minor words stay lowercase unless first.
      if (i > 0 && MINOR_WORDS.has(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Prefer an explicit display name; fall back to formatting an id.
 *   displayName(planet.name, planet.id)
 */
export function displayName(name, fallbackId) {
  if (name && typeof name === 'string' && name.trim()) return name.trim();
  return formatDisplayName(fallbackId);
}

export default formatDisplayName;
