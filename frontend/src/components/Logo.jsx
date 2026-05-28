import { useEffect, useState } from 'react';

// Module-level cache so the /logo.png probe runs at most once per page session,
// even when <Logo /> mounts in multiple places (Nav, Footer, Home hero).
let _pngStatus = 'checking'; // 'checking' | 'loaded' | 'failed'

/**
 * BookBridge brand mark.
 *
 * Asset chain:
 *   1. /logo.svg — always ships in the build (frontend/public/logo.svg). Used
 *      as the default so the first paint shows a real logo and no broken-image
 *      flash ever occurs.
 *   2. /logo.png — optional painterly upgrade. If the user drops a higher-
 *      resolution PNG into frontend/public/, a one-shot background <Image>
 *      probe detects it and swaps in. Status is cached at module scope so
 *      multiple <Logo> mounts share a single probe.
 *
 * Accessibility:
 *   - When withWordmark is true the visible "BookBridge" text provides the
 *     accessible name — img alt and wrapper aria-label stay empty (avoids
 *     double-announce).
 *   - When withWordmark is false (decorative hero illustration), the img alt
 *     carries the accessible name.
 */
export default function Logo({ size = 36, withWordmark = true, wordmarkColor }) {
  const [pngStatus, setPngStatus] = useState(_pngStatus);

  useEffect(() => {
    if (pngStatus !== 'checking') return;
    const probe = new Image();
    probe.onload = () => { _pngStatus = 'loaded'; setPngStatus('loaded'); };
    probe.onerror = () => { _pngStatus = 'failed'; setPngStatus('failed'); };
    probe.src = '/logo.png';
  }, [pngStatus]);

  const src = pngStatus === 'loaded' ? '/logo.png' : '/logo.svg';
  const altText = withWordmark ? '' : 'BookBridge';

  return (
    <span className="logo">
      <img
        src={src}
        alt={altText}
        className="logo-img"
        width={size}
        height={size}
      />
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
