/**
 * ConsumableQuickslot — a one-tap healing slot for real-time 3D combat (Phase 3).
 *
 * Picks the player's primary healing consumable from the inventory store and lets them use it
 * with a click or the `Q` key. Sends it through the world's in-world path (WS `t:'item'`), which
 * the server applies to the authoritative combatant (no currentHealth desync); the inventory
 * count is refreshed shortly after. The full inventory UI also works in 3D (the HTTP use-item
 * path routes in-world too) — this is just the fast-heal affordance.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { useInventoryStore } from '../../state/inventorySlice';

const HEAL_RE = /medpac|regen|bacta|kolto|hexol|medkit|stim|patch/i;

export default function ConsumableQuickslot({ world, characterId, enabledRef }) {
  const items = useInventoryStore((s) => s.items);
  const loadInventory = useInventoryStore((s) => s.loadInventory);

  // Load inventory once if it's empty (so the slot is populated on entering the 3D world).
  useEffect(() => {
    if (characterId && loadInventory && (!items || items.length === 0)) loadInventory(characterId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId]);

  const consumable = useMemo(() => {
    const cons = (items || []).filter((it) => ((it.itemType || it.type) === 'consumable') && (it.quantity > 0));
    // Prefer a health-restoring consumable; otherwise the first consumable.
    return cons.find((it) => (it.stats && it.stats.healthRestore) || HEAL_RE.test(it.itemId || '')) || cons[0] || null;
  }, [items]);

  const use = useCallback(() => {
    const w = world && world.current;
    if (!w || !w.useItem || !consumable) return;
    w.useItem(consumable.itemId);
    // Refresh the count after the server decrements (the heal fx confirms the effect in-world).
    if (characterId && loadInventory) setTimeout(() => loadInventory(characterId), 450);
  }, [world, consumable, characterId, loadInventory]);

  useEffect(() => {
    const onKey = (e) => {
      if (enabledRef && enabledRef.current === false) return; // not while a menu/modal is open
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'q' || e.key === 'Q') { e.preventDefault(); use(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [use, enabledRef]);

  if (!consumable) return null;
  const label = (consumable.name || consumable.itemId || 'Item').replace(/\s*\(.+\)$/, '');
  return (
    <button
      onClick={use}
      title={`${consumable.name || consumable.itemId} ×${consumable.quantity} — press Q`}
      style={{ position: 'relative', width: 48, height: 48, borderRadius: 8, background: 'rgba(10,15,28,0.92)', border: '1px solid #6cf0c2', color: '#e6eefc', cursor: 'pointer', overflow: 'hidden', fontFamily: 'system-ui' }}
    >
      <div style={{ position: 'absolute', top: 2, left: 4, fontSize: 10, color: '#8aa0c4' }}>Q</div>
      <div style={{ fontSize: 18, lineHeight: 1, paddingTop: 10, color: '#6cf0c2' }}>✚</div>
      <div style={{ fontSize: 8, lineHeight: 1.05, padding: '1px 2px 0', color: '#9fe8cf', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div style={{ position: 'absolute', bottom: 1, right: 4, fontSize: 11, fontWeight: 700, color: '#cfe3ff' }}>×{consumable.quantity}</div>
    </button>
  );
}
