/**
 * CombatToasts — non-blocking victory/death feedback for the real-time 3D combat (Phase 2).
 *
 * A plain DOM overlay (rendered OUTSIDE the R3F Canvas) that drains the net client's toast
 * queue (`world.drainToasts()`) on a short interval and shows transient cards:
 *   - reward: xp / credits / loot (rarity-colored) + a LEVEL UP banner
 *   - death:  "revived at <safe location>" + the medical fee
 * Play never pauses — toasts auto-expire. Online-only (the queue is empty offline).
 */

import React, { useEffect, useRef, useState } from 'react';
import { useCharacterStore } from '../../state/characterSlice';

const TTL_MS = 4500;
const RARITY = { common: '#cfd6e6', uncommon: '#6cf0c2', rare: '#7db8ff', epic: '#d18cff', legendary: '#ffd24a' };

if (typeof document !== 'undefined' && !document.getElementById('otg-toast-css')) {
  const el = document.createElement('style');
  el.id = 'otg-toast-css';
  el.textContent = '@keyframes otgToastIn{0%{opacity:0;transform:translateY(-10px) scale(.96)}100%{opacity:1;transform:translateY(0) scale(1)}}';
  document.head.appendChild(el);
}

export default function CombatToasts({ world }) {
  const [toasts, setToasts] = useState([]);
  const seen = useRef(new Set());

  useEffect(() => {
    const tick = setInterval(() => {
      const w = world && world.current;
      const drained = (w && w.drainToasts ? w.drainToasts() : null) || [];
      const now = Date.now();
      const fresh = drained.filter((t) => !seen.current.has(t.id));
      fresh.forEach((t) => seen.current.add(t.id));

      // A reward toast means the server granted XP / credits / a level on a kill. Combat runs in the
      // 3D net layer, which never touches the character store — so re-sync the character here, else
      // the HUD's StatsBar (credits / level / XP) stays stale until a full reload.
      if (fresh.some((t) => t.kind === 'reward')) {
        const cs = useCharacterStore.getState();
        const cid = cs.currentCharacter && cs.currentCharacter.id;
        if (cid && cs.loadCharacter) cs.loadCharacter(cid).catch(() => {});
      }

      setToasts((prev) => {
        const next = fresh.length ? [...prev, ...fresh] : prev;
        const alive = next.filter((t) => now - t.at < TTL_MS);
        return alive.length === prev.length && next === prev ? prev : alive;
      });
    }, 200);
    return () => clearInterval(tick);
  }, [world]);

  if (!toasts.length) return null;
  return (
    <div style={{ position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 70, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', pointerEvents: 'none', fontFamily: 'system-ui, sans-serif' }}>
      {toasts.map((t) => (t.kind === 'reward' ? <RewardCard key={t.id} t={t} /> : <DeathCard key={t.id} t={t} />))}
    </div>
  );
}

function Card({ children, accent }) {
  return (
    <div style={{ minWidth: 200, maxWidth: 340, padding: '10px 16px', borderRadius: 10, background: 'rgba(8,12,22,0.92)', border: `1px solid ${accent}`, boxShadow: `0 4px 18px rgba(0,0,0,0.5), 0 0 14px ${accent}40`, color: '#e6eefc', textAlign: 'center', animation: 'otgToastIn .25s ease-out' }}>
      {children}
    </div>
  );
}

function RewardCard({ t }) {
  const leveled = Array.isArray(t.leveledUp) && t.leveledUp.length > 0;
  const loot = Array.isArray(t.loot) ? t.loot : [];
  // Faction standing lost for killing tagged enemies (Phase 8.1). Deltas are negative;
  // `name` + `newTier` are server-provided so no faction registry is needed here.
  const rep = (Array.isArray(t.reputation) ? t.reputation : []).filter((r) => r && r.delta);
  return (
    <Card accent={leveled ? '#ffd24a' : '#6cf0c2'}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.6, color: '#9affa0' }}>VICTORY</div>
      <div style={{ fontSize: 13, marginTop: 3 }}>
        {t.xp > 0 && <span style={{ color: '#7db8ff' }}>+{t.xp} XP</span>}
        {t.xp > 0 && t.credits > 0 && <span style={{ color: '#6f7c98' }}> · </span>}
        {t.credits > 0 && <span style={{ color: '#ffd98a' }}>+{t.credits} cr</span>}
        {t.xp <= 0 && t.credits <= 0 && <span style={{ color: '#9fb3d1' }}>No spoils</span>}
      </div>
      {loot.length > 0 && (
        <div style={{ fontSize: 12, marginTop: 4 }}>
          {loot.map((l, i) => (
            <span key={i} style={{ color: RARITY[l.rarity] || RARITY.common }}>
              {l.name || l.itemId}{l.quantity > 1 ? ` ×${l.quantity}` : ''}{i < loot.length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>
      )}
      {rep.length > 0 && (
        <div style={{ fontSize: 11, marginTop: 5, color: '#9fb3d1' }}>
          {rep.map((r, i) => (
            <div key={r.factionId || i} style={{ color: r.delta < 0 ? '#ff9a8a' : '#7ce0a0' }}>
              {r.name || r.factionId} {r.delta > 0 ? `+${r.delta}` : r.delta}
              {r.tierChanged && r.newTier ? <span style={{ color: '#cfa0ff' }}> · now {r.newTier}</span> : null}
            </div>
          ))}
        </div>
      )}
      {leveled && <div style={{ fontSize: 13, fontWeight: 800, color: '#ffd24a', marginTop: 5, textShadow: '0 0 8px rgba(255,210,74,0.5)' }}>LEVEL UP! → Lv {t.newLevel}</div>}
    </Card>
  );
}

function DeathCard({ t }) {
  return (
    <Card accent="#ff6a5a">
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.6, color: '#ff8a7a' }}>DEFEATED</div>
      <div style={{ fontSize: 12, marginTop: 3, color: '#cfe3ff' }}>
        Revived{t.area ? ` at ${t.area}` : ''}{typeof t.restored === 'number' ? ` · +${t.restored} HP` : ''}
      </div>
      {t.fee > 0 && <div style={{ fontSize: 12, marginTop: 2, color: '#ffb0a0' }}>−{t.fee} cr medical fee</div>}
    </Card>
  );
}
