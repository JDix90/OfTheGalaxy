/**
 * usePlayerVitals — the single authoritative source for the player's HP/stamina,
 * replacing the two desynced readouts (stale character store vs live world).
 *
 * HP: when a live combat snapshot is present (online, server-authoritative —
 * `world.combat()` returns `{hp,maxHp,dead}`), HP comes from the WORLD. Offline /
 * not-in-combat / on 2D pages it falls back to the character store. Stamina is
 * NOT streamed to the client (netClient carries no stamina), so it always comes
 * from the store. Pass the already-polled `combat` snapshot in so we don't add a
 * second interval — the 3D pages already poll it.
 */

import { useMemo } from 'react';
import { useCharacterStore } from '../state/characterSlice';

export function usePlayerVitals(combat = null) {
  const character = useCharacterStore((s) => s.currentCharacter);

  return useMemo(() => {
    const live = !!combat;
    const maxHp = (live ? combat.maxHp : character?.maxHealth) || 0;
    const hp = live ? (combat.hp ?? 0) : (character?.currentHealth || 0);
    const maxStamina = character?.maxStamina || 0;
    const stamina = character?.currentStamina || 0;
    const dead = live ? !!combat.dead : (maxHp > 0 && hp <= 0);
    const clampPct = (cur, max) => (max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0);

    return {
      hp, maxHp, stamina, maxStamina,
      hpPct: clampPct(hp, maxHp),
      stamPct: clampPct(stamina, maxStamina),
      dead,
      live,
      character,
    };
  }, [combat, character]);
}
