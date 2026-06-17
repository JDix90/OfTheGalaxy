/**
 * SayElse — the optional free-text path. Collapsed by default into a quiet
 * "Say something else…" affordance so curated choices lead; expands into a
 * single-line input for players who want to type their own line. Preserves the
 * tutorial input/send targets so highlight steps still land on a real element.
 */

import React, { useEffect, useRef, useState } from 'react';
import { addTutorialTarget, TUTORIAL_TARGETS } from '../../../services/tutorialTargetRegistry';

export default function SayElse({ onSend, disabled }) {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef(null);
  const collapsedRef = useRef(null);
  const sendRef = useRef(null);

  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
      addTutorialTarget(inputRef.current, TUTORIAL_TARGETS.DIALOGUE_INPUT);
    } else if (!expanded && collapsedRef.current) {
      addTutorialTarget(collapsedRef.current, TUTORIAL_TARGETS.DIALOGUE_INPUT);
    }
    if (sendRef.current) addTutorialTarget(sendRef.current, TUTORIAL_TARGETS.DIALOGUE_SEND_BUTTON);
  }, [expanded]);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
    setExpanded(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
    else if (e.key === 'Escape') { setExpanded(false); setValue(''); }
    e.stopPropagation(); // don't let number-key choice shortcuts fire while typing
  };

  if (!expanded) {
    return (
      <button
        ref={collapsedRef}
        type="button"
        className="cv-sayelse-trigger"
        onClick={() => setExpanded(true)}
        disabled={disabled}
      >
        <span className="cv-sayelse-icon" aria-hidden="true">✎</span> Say something else…
      </button>
    );
  }

  return (
    <div className="cv-sayelse">
      <input
        ref={inputRef}
        className="cv-sayelse-input"
        type="text"
        value={value}
        placeholder="Type your reply…"
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => { if (!value.trim()) setExpanded(false); }}
      />
      <button
        ref={sendRef}
        type="button"
        className="cv-sayelse-send"
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Send"
      >
        Send
      </button>
    </div>
  );
}
