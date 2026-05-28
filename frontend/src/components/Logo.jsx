import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';

// Module-level cache so the /logo.png probe runs at most once per page session,
// even when <Logo /> mounts in multiple places (Nav, Footer, Home hero).
let _logoStatus = 'checking'; // 'checking' | 'loaded' | 'failed'

/**
 * BookBridge brand mark.
 * Renders the SVG fallback first, then swaps to /logo.png once a preload probe
 * confirms it exists. Prevents the broken-image flash and avoids 2–3× 404s per
 * render when the file is missing.
 *
 * Accessibility: when withWordmark is true, the visible "BookBridge" text IS
 * the name — no aria-label on the wrapper (avoids double-announce). When the
 * wordmark is hidden, the fallback span / img carries the accessible name.
 */
export default function Logo({ size = 36, withWordmark = true, wordmarkColor }) {
  const [status, setStatus] = useState(_logoStatus);

  useEffect(() => {
    if (status !== 'checking') return;
    const probe = new Image();
    probe.onload = () => { _logoStatus = 'loaded'; setStatus('loaded'); };
    probe.onerror = () => { _logoStatus = 'failed'; setStatus('failed'); };
    probe.src = '/logo.png';
  }, [status]);

  const needsAriaName = !withWordmark;

  return (
    <span className="logo">
      {status === 'loaded' ? (
        <img
          src="/logo.png"
          alt={needsAriaName ? 'BookBridge' : ''}
          className="logo-img"
          width={size}
          height={size}
        />
      ) : (
        <span
          className="logo-mark-fallback"
          style={{ width: size, height: size }}
          aria-label={needsAriaName ? 'BookBridge' : undefined}
          role={needsAriaName ? 'img' : undefined}
        >
          <Icon
            name="books"
            size={Math.round(size * 0.6)}
            color="var(--honey-200)"
            stroke={2}
          />
        </span>
      )}
      {withWordmark && (
        <span
          className="logo-text"
          style={wordmarkColor ? { color: wordmarkColor } : undefined}
        >
          BookBridge
        </span>
      )}
    </span>
  );
}
