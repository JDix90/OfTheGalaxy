/**
 * Faction reputation tier metadata (color + label), mirroring the backend
 * factionService.getTierInfo / calculateTier ladder. Single frontend source of
 * truth for rendering standing (toasts, tier-up modal, faction screen).
 */

export const TIER_ORDER = ['hated', 'hostile', 'unfriendly', 'neutral', 'friendly', 'honored', 'exalted'];

export const TIER_INFO = {
  hated: { color: '#8b0000', label: 'Hated' },
  hostile: { color: '#dc2626', label: 'Hostile' },
  unfriendly: { color: '#f97316', label: 'Unfriendly' },
  neutral: { color: '#6b7280', label: 'Neutral' },
  friendly: { color: '#3b82f6', label: 'Friendly' },
  honored: { color: '#8b5cf6', label: 'Honored' },
  exalted: { color: '#fbbf24', label: 'Exalted' }
};

export function getTierInfo(tier) {
  return TIER_INFO[tier] || TIER_INFO.neutral;
}

export function getTierColor(tier) {
  return getTierInfo(tier).color;
}

export function getTierLabel(tier) {
  return getTierInfo(tier).label;
}

/**
 * Direction of a tier change: 1 = promotion, -1 = demotion, 0 = same/unknown.
 */
export function tierDirection(oldTier, newTier) {
  const a = TIER_ORDER.indexOf(oldTier);
  const b = TIER_ORDER.indexOf(newTier);
  if (a === -1 || b === -1) return 0;
  return Math.sign(b - a);
}
