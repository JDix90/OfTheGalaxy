/**
 * hudTokens — the single source of truth for HUD layering and styling.
 *
 * The HUD grew ad-hoc z-index values (40/45/60/1000/1002/1004/3000…) that
 * caused real occlusion bugs (the ability hotbar sat BELOW the side panels, so
 * panels blocked clicking abilities; the proximity prompt had no z-index at
 * all). `Z` replaces every one of those with a named layer on a deliberate
 * scale, and `HUD` holds the flat-dark palette/shape tokens shared across every
 * overlay so the HUD reads as one system.
 *
 * Mirror of `hud-tokens.css` — keep the two in lockstep. Use this module for
 * inline-styled overlays (R3F <Html>, page-level JSX); use the CSS vars in
 * stylesheets.
 */

// Named z-layer scale. Values live in the existing 1000+ ecosystem because the
// global HUD container is `position:fixed` (its own stacking context at z1001),
// so any ROOT-SIBLING overlay must be >1001 to sit above the HUD panels. The
// inside-HUD elements (panels/menu/modal overlays) keep their own values — they
// only order among themselves within the HUD's context.
export const Z = {
  WORLD: 0,              // the 3D canvas
  AMBIENT_HINTS: 990,    // below the HUD (combat log / passive hints, pointer-events:none)
  HUD_BASE: 1001,        // global HUD container (unchanged)
  PANELS: 1002,          // QuestTracker, Minimap (inside HUD; also the page minimap)
  VITALS: 1010,          // bottom action cluster — ABOVE the HUD so abilities stay clickable
  WORLD_PROMPTS: 1020,   // proximity "▸ Enter" prompts
  CONTEXT_MENUS: 1030,   // NPC / POI interaction menus (at click point)
  STATUS: 1040,          // net-status pill, top-right page controls
  TOASTS: 1050,          // combat toasts, spaceport PA
  DIALOGUE_SCRIM: 1060,  // dialogue vignette + low-HP vignette
  DIALOGUE: 1070,        // dialogue lower-third
  DOCK_PANELS: 1080,     // vendor panel — ABOVE dialogue (a shop opened from a chat)
  DEFEAT: 1100,          // full-screen defeat / victory
  OVERLAYS: 2000,        // quest log, character sheet (inside HUD)
  OVERLAYS_TOP: 3000,    // inventory (inside HUD)
  TUTORIAL: 4000,        // tutorial spotlight
};

// Flat-dark palette + shapes, lifted from the dialogue/combat look that the
// rest of the HUD is migrating onto.
export const HUD = {
  surface: 'rgba(10, 15, 28, 0.9)',
  surfaceSoft: 'rgba(8, 12, 22, 0.8)',
  surfaceStrong: 'rgba(10, 14, 24, 0.96)',
  accent: '#4a9eff',
  accentSoft: 'rgba(74, 158, 255, 0.15)',
  heal: '#6cf0c2',
  danger: '#ff5a4a',
  warn: '#ffd24a',
  textPrimary: '#e6eefc',
  textSecondary: '#cfe0fb',
  textMuted: '#8aa0c4',
  border: '#2a3654',
  borderSoft: 'rgba(120, 150, 200, 0.18)',
  radius: 12,
  radiusSm: 8,
  blur: 'blur(9px)',
  font: 'system-ui, -apple-system, sans-serif',
};

// Shared button style — replaces the inline `btnStyle` duplicated in the 3D
// pages and unifies the HUD's small buttons on the flat-dark look.
export const hudButton = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '7px 12px',
  borderRadius: HUD.radiusSm,
  background: HUD.surfaceSoft,
  border: `1px solid ${HUD.borderSoft}`,
  color: HUD.textSecondary,
  font: `500 13px ${HUD.font}`,
  cursor: 'pointer',
  transition: 'background 0.15s ease, border-color 0.15s ease',
};
