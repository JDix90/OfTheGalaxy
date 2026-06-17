/**
 * NpcLine — the NPC's current spoken line as a subtitle, typewriter-revealed.
 * While the reply is in flight it shows a "thinking" indicator. Clicking the
 * line skips the reveal to the end. System lines (errors) render muted.
 */

import React, { useEffect, useRef } from 'react';
import { useTypewriter } from '../useTypewriter';

export default function NpcLine({ line, thinking, onRevealProgress }) {
  const isSystem = line?.sender === 'system';
  // While a line is live-streaming (or already streamed), bypass the typewriter —
  // the real token stream IS the reveal; re-animating would restart on every delta.
  const streaming = !!line?.streaming;
  const { shown, done, skip } = useTypewriter(line?.text || '', {
    enabled: !isSystem && !streaming && !line?.streamed,
  });
  const lastTick = useRef(0);

  // Keep the message list pinned to the bottom as text streams in.
  useEffect(() => {
    if (!onRevealProgress) return;
    const now = shown.length;
    if (now !== lastTick.current) {
      lastTick.current = now;
      onRevealProgress();
    }
  }, [shown, onRevealProgress]);

  if (thinking) {
    return (
      <div className="cv-npcline cv-thinking" aria-live="polite" aria-label="NPC is responding">
        <span className="cv-dot" /><span className="cv-dot" /><span className="cv-dot" />
      </div>
    );
  }

  if (!line) return <div className="cv-npcline cv-npcline-empty" />;

  const showCaret = streaming || !done;
  const canSkip = !streaming && !done; // skipping only makes sense for the typewriter

  return (
    <div
      className={`cv-npcline${isSystem ? ' cv-npcline-system' : ''}`}
      onClick={canSkip ? skip : undefined}
      role={canSkip ? 'button' : undefined}
      title={canSkip ? 'Skip' : undefined}
      aria-live="polite"
    >
      <span className="cv-npcline-text">{shown}</span>
      {showCaret && <span className="cv-caret" aria-hidden="true" />}
    </div>
  );
}
