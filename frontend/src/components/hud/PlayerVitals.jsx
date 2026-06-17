/**
 * PlayerVitals — the one HP + stamina readout, fed by usePlayerVitals (live
 * world HP when online, store otherwise). Lives in the bottom ActionCluster.
 * Carries the stamina status badge (Fatigued/Exhausted) and the heal "+N" flash
 * ported from the old StatsBar so that behaviour isn't lost.
 */

import React, { useEffect, useRef, useState } from 'react';
import './PlayerVitals.css';
import { usePlayerVitals } from '../../hooks/usePlayerVitals';
import {
  getActiveStaminaStatusEffects,
  getStaminaStatusColor,
  getStaminaWarning,
} from '../../utils/staminaStatusEffects';

export default function PlayerVitals({ combat = null }) {
  const v = usePlayerVitals(combat);
  const [healFlash, setHealFlash] = useState(0);
  const prevHp = useRef(v.hp);

  useEffect(() => {
    if (v.hp > prevHp.current && prevHp.current > 0) {
      setHealFlash(Math.round(v.hp - prevHp.current));
      const t = setTimeout(() => setHealFlash(0), 1200);
      prevHp.current = v.hp;
      return () => clearTimeout(t);
    }
    prevHp.current = v.hp;
    return undefined;
  }, [v.hp]);

  if (!v.character) return null;

  const status = getActiveStaminaStatusEffects(v.character);
  const stamColor = getStaminaStatusColor(v.stamPct);
  const warning = getStaminaWarning(v.stamPct);
  const lowHp = v.hpPct < 30;

  return (
    <div className="pv">
      <div className="pv-row">
        <span className="pv-tag">HP</span>
        <div className="pv-bar">
          <div className={`pv-fill pv-hp${lowHp ? ' pv-hp-low' : ''}`} style={{ width: `${v.hpPct}%` }} />
          <span className="pv-num">{Math.max(0, Math.round(v.hp))} / {v.maxHp}</span>
          {healFlash > 0 && <span className="pv-flash">+{healFlash}</span>}
        </div>
      </div>

      <div className="pv-row">
        <span className="pv-tag">
          SP
          {status.length > 0 && (
            <span className="pv-status" title={status.map((e) => e.description).join('\n')}>
              {status[0].icon} {status[0].name}
            </span>
          )}
        </span>
        <div className="pv-bar">
          <div className={`pv-fill pv-sp pv-sp-${stamColor}`} style={{ width: `${v.stamPct}%` }} />
          <span className="pv-num">{Math.round(v.stamina)} / {v.maxStamina}</span>
        </div>
      </div>

      {warning && <div className="pv-warning">{warning}</div>}
    </div>
  );
}
