/**
 * Motion / juice gating. Returns true when heavy motion (shake, big pops) should
 * be suppressed — honours the OS `prefers-reduced-motion` AND an in-game
 * accessibility setting (added with the settings panel). Floating numbers still
 * show; only the jarring motion is dropped.
 */
import { useSettingsStore } from '../state/settingsSlice';

export function prefersReducedMotion() {
  try {
    const store = useSettingsStore.getState?.();
    if (store?.getSetting && store.getSetting('accessibility', 'reduceMotion')) return true;
  } catch (_) { /* settings store may not be ready */ }
  return typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
