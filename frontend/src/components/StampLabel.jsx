/**
 * StampLabel — Direction F "hand-stamped" small-caps section label with a
 * wobbly hand-drawn underline (inline SVG <path>). The underline draws on via
 * the .stamp .underline path motion rules in global.css (gated on html.js +
 * prefers-reduced-motion: no-preference).
 *
 * The label text carries the real meaning; the SVG underline is decorative and
 * marked aria-hidden. Pass `onDark` for honey-on-forest sections.
 *
 * @param {{ children: React.ReactNode, onDark?: boolean }} props
 */
export default function StampLabel({ children, onDark = false }) {
  return (
    <span className={'stamp reveal' + (onDark ? ' on-dark' : '')}>
      {children}
      <svg className="underline" viewBox="0 0 120 6" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M1 4 C30 2, 60 5, 90 2 S118 4, 119 4"
          fill="none"
          stroke="var(--clay)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
