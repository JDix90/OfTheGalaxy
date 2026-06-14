/**
 * ReputationHost — single global listener for faction standing changes. Mounted
 * once in the app shell (next to ToastHost). For every gameEventBus REP_CHANGED
 * event it pushes a rep toast, and when the change crosses a tier boundary it
 * queues a TierUpModal. Any code can surface standing simply by emitting the
 * event — no per-call-site UI wiring.
 */

import React, { useEffect, useState } from 'react';
import { gameEventBus, GAME_EVENTS } from '../../services/gameEventBus';
import { pushToast } from '../../state/toastSlice';
import { getTierLabel } from '../../utils/factionTiers';
import TierUpModal from './TierUpModal';

export default function ReputationHost() {
  const [tierQueue, setTierQueue] = useState([]); // [{ factionName, factionId, oldTier, newTier }]

  useEffect(() => {
    const off = gameEventBus.on(GAME_EVENTS.REP_CHANGED, (change) => {
      if (!change || !change.factionId) return;
      const name = change.factionName || change.factionId;
      const up = (change.delta ?? 0) >= 0;

      pushToast({
        type: 'rep',
        icon: up ? '🤝' : '💢',
        message: `${up ? '+' : ''}${change.delta} reputation · ${name} (${getTierLabel(change.newTier)})`
      });

      if (change.tierChanged) {
        setTierQueue((q) => [...q, {
          factionId: change.factionId,
          factionName: name,
          oldTier: change.oldTier,
          newTier: change.newTier
        }]);
      }
    });
    return off;
  }, []);

  if (tierQueue.length === 0) return null;

  const current = tierQueue[0];
  return (
    <TierUpModal
      {...current}
      onClose={() => setTierQueue((q) => q.slice(1))}
    />
  );
}
