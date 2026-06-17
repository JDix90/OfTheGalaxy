/**
 * ChoiceList — the player's curated responses as a compact, choices-first list
 * (the BioWare/Mass Effect paradigm), replacing the old "suggested" chip row
 * that sat above a dominant text box. Each choice shows a number hint (press
 * 1-9), an optional intent label (Accept / Trade / …) and the line itself.
 */

import React from 'react';
import { TUTORIAL_TARGETS } from '../../../services/tutorialTargetRegistry';

// Tone/label → chip accent. Backend-authored tones (Warm/Probe/Eager/…) plus the
// action-derived fallbacks; unmapped labels fall back to the default chip style.
const LABEL_ACCENT = {
  Warm: { bg: '#6cf0c2', fg: '#06342c' },
  Accept: { bg: '#6cf0c2', fg: '#06342c' },
  Ready: { bg: '#6cf0c2', fg: '#06342c' },
  Curious: { bg: '#85b7eb', fg: '#042c53' },
  Ask: { bg: '#85b7eb', fg: '#042c53' },
  Probe: { bg: '#b9a3f0', fg: '#26215c' },
  Eager: { bg: '#ffd24a', fg: '#412402' },
  Trade: { bg: '#ffd24a', fg: '#412402' },
  Decline: { bg: '#f0997b', fg: '#4a1b0c' },
  Resolve: { bg: '#f0997b', fg: '#4a1b0c' },
  Casual: { bg: '#b4b2a9', fg: '#2c2c2a' },
  Wait: { bg: '#b4b2a9', fg: '#2c2c2a' },
};

export default function ChoiceList({ suggestions = [], onChoose, disabled }) {
  if (!suggestions.length) return null;
  return (
    <div className="cv-choices" data-tutorial-target={TUTORIAL_TARGETS.DIALOGUE_SUGGESTED_REPLIES}>
      {suggestions.map((s, i) => {
        const accent = s.label ? LABEL_ACCENT[s.label] : null;
        return (
          <button
            key={i}
            type="button"
            className="cv-choice"
            disabled={disabled}
            onClick={() => onChoose(s)}
            title={s.text}
          >
            <span className="cv-choice-num" aria-hidden="true">{i + 1}</span>
            {s.label && (
              <span
                className="cv-choice-tag"
                style={accent ? { background: accent.bg, color: accent.fg } : undefined}
              >
                {s.label}
              </span>
            )}
            {s.icon && !s.label && <span className="cv-choice-icon" aria-hidden="true">{s.icon}</span>}
            <span className="cv-choice-text">{s.text}</span>
          </button>
        );
      })}
    </div>
  );
}
