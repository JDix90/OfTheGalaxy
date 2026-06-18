/**
 * ActionCluster — the bottom-center "action lane": ability hotbar + consumable
 * quickslot (when abilities are available) over the unified PlayerVitals, with a
 * single hint line (movement hints when idle → combat hints in a fight). It
 * replaces the duplicated inline combat HUD in the 3D pages, and slides out of
 * the way when a dialogue is open so it cedes the lower-third to ConversationView.
 *
 * The pages own `worldRef`/`castAbility` and the polled `combat`/`hotbar`/`cdSnap`
 * snapshots (one interval, already there) and pass them down — no second poll.
 */

import React from 'react';
import './ActionCluster.css';
import { useDialogueStore } from '../../state/dialogueStore';
import ConsumableQuickslot from './ConsumableQuickslot';
import PlayerVitals from './PlayerVitals';
import { HUD, Z } from './hudTokens';

const abilityAccent = (type) =>
  type === 'heal' ? HUD.heal : type === 'buff' ? HUD.warn : type === 'debuff' ? '#d18cff' : '#ff8d6c';

export default function ActionCluster({
  worldRef, characterId, inputEnabledRef,
  combat = null, hotbar = [], cdSnap = {}, castAbility, hint = null,
}) {
  const inDialogue = useDialogueStore((s) => !!s.npc);
  const abilities = (hotbar || []).slice(0, 9);
  const now = Date.now();

  return (
    <div className={`ac${inDialogue ? ' ac-hidden' : ''}`} style={{ zIndex: Z.VITALS }}>
      {abilities.length > 0 && (
        <div className="ac-hotbar">
          <ConsumableQuickslot world={worldRef} characterId={characterId} enabledRef={inputEnabledRef} />
          {abilities.map((ab, i) => {
            const ready = (cdSnap[ab.id] || 0) <= now;
            const cdLeft = Math.max(0, ((cdSnap[ab.id] || 0) - now) / 1000);
            return (
              <button
                key={ab.id}
                className="ac-ability"
                title={`${ab.name} (${ab.stam} stamina)`}
                onClick={() => castAbility && castAbility(ab)}
                style={{ borderColor: ready ? abilityAccent(ab.type) : HUD.border, color: ready ? HUD.textPrimary : '#6f7c98' }}
              >
                <span className="ac-ability-key">{i + 1}</span>
                <span className="ac-ability-name">{ab.name.replace(/ (Mastery|Insight)$/, '')}</span>
                {!ready && <span className="ac-ability-cd">{cdLeft.toFixed(1)}</span>}
              </button>
            );
          })}
        </div>
      )}

      <PlayerVitals combat={combat} />

      {(combat || hint) && (
        <div className="ac-hint">
          {combat
            ? (<>click a hostile · <b>1–9</b> abilities · <b>Space</b> dodge</>)
            : hint}
        </div>
      )}
    </div>
  );
}
