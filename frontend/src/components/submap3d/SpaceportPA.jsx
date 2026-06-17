/**
 * SpaceportPA — a public-address / departures-board banner for the spaceport concourse.
 *
 * A small, non-interactive HUD overlay that cycles flavor announcements so the port reads as
 * a live, operating place ("Now boarding at Hangar Bay A…"). Pure presentation: no audio (the
 * game has no audio system yet), no input capture. Rendered only on the spaceport.
 */

import React, { useEffect, useMemo, useState } from 'react';

const ROTATE_MS = 7000;

function buildAnnouncements(name) {
  const port = name || 'the spaceport';
  return [
    `Welcome to ${port}. Please keep the concourse walkways clear.`,
    'Now boarding at Hangar Bay A — passengers proceed to the gate.',
    'Hangar Bay B: inbound vessel on final approach. Mind the deck.',
    'Departing crews, report to Port Authority for clearance.',
    'Unattended cargo will be impounded. Secure your goods at all times.',
    'Travel Services is open — fares, charters, and connections at the desk.',
  ];
}

export default function SpaceportPA({ spaceportName }) {
  const lines = useMemo(() => buildAnnouncements(spaceportName), [spaceportName]);
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(true);

  useEffect(() => {
    let swapT;
    const id = setInterval(() => {
      // Fade out, swap the line, fade back in.
      setShown(false);
      swapT = setTimeout(() => { setI((n) => (n + 1) % lines.length); setShown(true); }, 400);
    }, ROTATE_MS);
    return () => { clearInterval(id); clearTimeout(swapT); };
  }, [lines.length]);

  return (
    <div
      style={{
        position: 'fixed', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 40,
        pointerEvents: 'none', maxWidth: 'min(620px, 86vw)',
      }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '7px 16px', borderRadius: 999,
          background: 'rgba(8,12,22,0.74)', border: '1px solid rgba(108,240,194,0.35)',
          boxShadow: '0 2px 18px rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
          fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12.5, letterSpacing: 0.3,
          color: '#cfe3ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6cf0c2', boxShadow: '0 0 8px #6cf0c2', flex: '0 0 auto', animation: 'paPulse 1.8s ease-in-out infinite' }} />
        <span style={{ color: '#6cf0c2', fontWeight: 700, flex: '0 0 auto' }}>PA</span>
        <span style={{ opacity: shown ? 1 : 0, transition: 'opacity 0.4s ease', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {lines[i]}
        </span>
      </div>
      <style>{`@keyframes paPulse { 0%,100% { opacity: 0.45; } 50% { opacity: 1; } }`}</style>
    </div>
  );
}
