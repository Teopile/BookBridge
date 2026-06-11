import { useTypewriter, usePrefersReducedMotion } from '../hooks/useTypewriter.js';

// Fake animated placeholder overlaid on a search input (myhome.ge pattern):
// static gray prefix ("მაგ."), an example term typed character by character
// with a blinking | cursor, pause, delete faster, next term, loop.
//
// Render it inside a position:relative wrapper around the <input>, and only
// while the input is blurred AND empty — unmounting stops every timer. It is
// purely decorative: pointer-events none + aria-hidden (the input keeps its
// aria-label for screen readers; remove the native placeholder so the two
// never overlap).
//
// Timings are configurable via props; with prefers-reduced-motion the first
// term renders statically with no animation and no cursor.
export default function TypewriterPlaceholder({ prefix, terms, typeMs, deleteMs, pauseMs }) {
  const reduced = usePrefersReducedMotion();
  const text = useTypewriter(terms, { typeMs, deleteMs, pauseMs, enabled: !reduced });

  return (
    <div className="tw-placeholder" aria-hidden="true">
      <span className="tw-prefix">{prefix}</span>
      <span className="tw-text">{reduced ? terms[0] : text}</span>
      {!reduced && <span className="tw-cursor">|</span>}
    </div>
  );
}
