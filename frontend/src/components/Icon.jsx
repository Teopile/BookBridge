/**
 * BookBridge icon set — inline SVG, single-color, 24×24 grid, ~1.9px stroke.
 * Usage: <Icon name="book" size={20} />
 */

const ICONS = {
  book: (
    <>
      <path d="M3 4.5a1.5 1.5 0 0 1 1.5-1.5H11v18H4.5A1.5 1.5 0 0 1 3 19.5v-15Z" />
      <path d="M21 4.5a1.5 1.5 0 0 0-1.5-1.5H13v18h6.5a1.5 1.5 0 0 0 1.5-1.5v-15Z" />
    </>
  ),
  books: (
    <>
      <path d="M4 19V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5V19" />
      <path d="M4 19h16v2H4z" />
      <path d="M8 8v8M12 8v8M16 8v8" />
    </>
  ),
  bookOpen: (
    <>
      <path d="M3 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3V5Z" />
      <path d="M21 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8V5Z" />
    </>
  ),
  mountain: (
    <>
      <path d="m3 20 6.5-10 4 6 2.5-3.5L21 20H3Z" />
      <circle cx="16" cy="6" r="2" />
    </>
  ),
  heart: (
    <path d="M12 20s-7-4.35-7-10a4.5 4.5 0 0 1 8-2.83A4.5 4.5 0 0 1 19 10c0 5.65-7 10-7 10Z" />
  ),
  send: (
    <>
      <path d="M21 3L3 10l8 3 3 8 7-18Z" />
      <path d="m11 13 5-5" />
    </>
  ),
  truck: (
    <>
      <path d="M3 7h11v9H3z" />
      <path d="M14 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  check: (
    <path d="m5 12 5 5L20 7" />
  ),
  arrowRight: (
    <>
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </>
  ),
  arrowDown: (
    <>
      <path d="M12 5v14" />
      <path d="m5 13 7 7 7-7" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </>
  ),
  school: (
    <>
      <path d="m3 10 9-6 9 6v9H3z" />
      <path d="M9 19v-5h6v5" />
      <path d="M12 4v2" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  sparkle: (
    <>
      <path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  shield: (
    <path d="M12 3 4 6v6c0 4.5 3.5 8 8 9 4.5-1 8-4.5 8-9V6l-8-3Z" />
  ),
  gift: (
    <>
      <path d="M4 11h16v9H4z" />
      <path d="M2 7h20v4H2z" />
      <path d="M12 7v13" />
      <path d="M12 7s-1.5-4-4-4-2 3 0 4h4Z" />
      <path d="M12 7s1.5-4 4-4 2 3 0 4h-4Z" />
    </>
  ),
  mailEnvelope: (
    <>
      <path d="M3 6h18v12H3z" />
      <path d="m3 7 9 7 9-7" />
    </>
  ),
  medal: (
    <>
      <circle cx="12" cy="14" r="6" />
      <path d="M8 8 6 3h4l2 4" />
      <path d="m16 8 2-5h-4l-2 4" />
      <path d="M12 11v3l2 1" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </>
  ),
  map: (
    <>
      <path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z" />
      <path d="M9 4v16M15 6v16" />
    </>
  ),
};

export default function Icon({ name, size = 20, color = 'currentColor', stroke = 1.9, fill = 'none' }) {
  const path = ICONS[name];
  if (!path) return null;
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={fill} stroke={color} strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}
