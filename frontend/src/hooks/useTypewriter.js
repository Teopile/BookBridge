import { useEffect, useRef, useState } from 'react';

// Animated typewriter text: types `terms[i]` char by char, pauses, deletes
// faster, then moves to the next term — looping forever. Dependency-free
// (myhome.ge uses the typewriter-effect package for the same UX).
// All timers are cleared on unmount / when `enabled` flips off.
export function useTypewriter(terms, { typeMs = 100, deleteMs = 50, pauseMs = 1800, enabled = true } = {}) {
  const [text, setText] = useState('');
  // Mutable cursor so the timeout chain survives re-renders without resetting.
  const pos = useRef({ term: 0, len: 0, deleting: false });

  useEffect(() => {
    if (!enabled || !terms?.length) return undefined;
    let timer;

    function tick() {
      const s = pos.current;
      const word = terms[s.term % terms.length];
      let delay;
      if (!s.deleting) {
        s.len = Math.min(s.len + 1, word.length);
        if (s.len === word.length) {
          s.deleting = true;
          delay = pauseMs; // linger on the completed term
        } else {
          delay = typeMs;
        }
      } else {
        s.len = Math.max(s.len - 1, 0);
        if (s.len === 0) {
          s.deleting = false;
          s.term = (s.term + 1) % terms.length;
          delay = typeMs;
        } else {
          delay = deleteMs;
        }
      }
      setText(word.slice(0, s.len));
      timer = setTimeout(tick, delay);
    }

    timer = setTimeout(tick, typeMs);
    return () => clearTimeout(timer);
  }, [terms, enabled, typeMs, deleteMs, pauseMs]);

  return text;
}

// True when the user asks for reduced motion — the caller should render a
// static fallback instead of animating.
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}
