/**
 * useTypewriter — progressively reveal `text`, giving the LLM reply a "spoken"
 * cadence without any backend streaming. Returns the visible substring, whether
 * the reveal is done, and skip() to jump to the end (click-to-advance).
 * Honours prefers-reduced-motion by revealing instantly.
 */

import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useTypewriter(text, { cps = 55, enabled = true } = {}) {
  const [count, setCount] = useState(0);
  const raf = useRef(0);
  const startRef = useRef(0);
  const full = text || '';

  useEffect(() => {
    cancelAnimationFrame(raf.current);
    if (!enabled || prefersReducedMotion() || !full) {
      setCount(full.length);
      return undefined;
    }
    setCount(0);
    startRef.current = 0;
    const step = (now) => {
      if (!startRef.current) startRef.current = now;
      const elapsed = (now - startRef.current) / 1000;
      const n = Math.min(full.length, Math.floor(elapsed * cps));
      setCount(n);
      if (n < full.length) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [full, cps, enabled]);

  const skip = () => {
    cancelAnimationFrame(raf.current);
    setCount(full.length);
  };

  return { shown: full.slice(0, count), done: count >= full.length, skip };
}
