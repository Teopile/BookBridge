/**
 * BookBridge brand lockup (mark + "BOOKBRIDGE" wordmark).
 *
 * Two color files ship in frontend/public:
 *   /logo.svg        — dark ink lockup, for light (cream) surfaces (nav, hero)
 *   /logo-white.svg  — cream lockup, for the dark (burgundy) footer
 *
 * The wordmark is part of the SVG, so the <img alt> carries the accessible
 * name and there is no separate text span. `size` is the rendered height in px;
 * width scales from the SVG's intrinsic aspect ratio.
 */
export default function Logo({ size = 34, onDark = false, priority = false }) {
  return (
    <img
      src={onDark ? '/logo-white.svg' : '/logo.svg'}
      alt="BookBridge"
      className="logo-lockup"
      height={size}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      fetchpriority={priority ? 'high' : undefined}
    />
  );
}
