# Redesign 2026 — visual layer

Restyle only: same pages, same IA, same copy, same palette (tints/shades of existing
hues allowed). Branch: `redesign-2026`.

## Audit — inconsistencies & weak spots (2026-06-11)

1. **Georgian renders in a fallback font.** Fredoka + Nunito contain no Georgian
   glyphs, so the *default locale* falls through to Noto Sans Georgian — headings and
   body mismatch the Latin design, and the display font never appears in Georgian.
2. **No disabled states** anywhere (buttons, inputs, selects); input hover states
   missing; loading→content transitions abrupt.
3. **Inline-style sprawl.** Form inputs hand-styled inline 5+ times (SchoolManage,
   VolunteerManage, Donate selects); headings sized inline (Account h1 styled as h2,
   Track h2 at raw 20px); raw 8/22/24/32px margins bypass the spacing tokens.
4. **Off-palette colors.** NotificationBell badge `#E5654B` and text `#1C2B27` are
   not in the palette.
5. **Radius drift.** Raw 2/4/6/10/12/30px radii; no documented radius rule.
6. **Shadow drift.** `.btn-secondary` bespoke shadows; NotificationBell popover uses
   an untinted black shadow.
7. **Type-scale leaks.** Raw 12.5/15/18/19/21px font sizes (stamp, hero-kicker,
   hero-poetic, lede, logo-text, captions).
8. **One-off components.** hero-kicker pill (7×15px padding, 30px radius), books-tag
   asymmetric padding, NotificationBell popover all-inline, SchoolDetail book-request
   rows styled inline.
9. **Breakpoint inconsistency.** 600px and 880px mixed; no documented set.
10. **A11y.** No skip-link; `--text-subtle` (#8A8275) fails AA on cream for normal
    text; tap targets mix 44/48px; numbers not tabular.
11. **Polish gaps.** Images lack neutral inset outlines; no `text-wrap:
    balance/pretty`; section rhythm flat (48px everywhere).

## Mini design system — "Mountain Library"

**Typography (Georgian-native — both scripts in one voice, verified at every weight):**
- Display/headings: **Noto Serif Georgian** 500/600/700 — literary, warm; fits a book
  charity on parchment. Used for h1–h4, logo wordmark, stat numerals, blockquotes.
- Body/UI: **Noto Sans Georgian** 400/500/600/700.
- Fluid scale: display clamp(38–62) · h1 clamp(31–42) · h2 clamp(25–32) ·
  h3 clamp(21–24) · h4 19 · lg 20 · md 18 · base 16 · sm 14 · xs 13.
- Headings: lh 1.18, tracking −0.012em (display sizes), `text-wrap: balance`.
- Body: lh 1.65; prose capped ~65ch; stats/counters `tabular-nums`.

**Spacing:** existing 4px ladder kept; section rhythm goes fluid:
`--space-section: clamp(56px, 4vw + 40px, 96px)`.

**Radius rule (one system, applied everywhere):**
pill = chips/badges/lang · `--r-sm` 10 = buttons/inputs/tags · `--r-md` 14 = media
inside cards · `--r-lg` 18 = cards/popovers/modals · `--r-xl` 24 = hero/cover surfaces.

**Shadows:** all tinted to the espresso/forest ground (no pure black);
`--sh-1/2/3` refined + `--sh-pop` (popovers) + tokenized honey CTA shadows.

**States (every interactive element):** hover (tint + lift), active
(translateY(1px)), focus-visible (existing forest ring), disabled (.55 opacity,
no motion, not-allowed), loading skeletons, designed empty states.

**Motion:** existing 120/180/260ms tokens; explicit transition properties only
(no `transition: all`); reduced-motion already gated, kept.

**Color additions (shades/tints of existing hues only):**
- `--text-subtle` darkened #8A8275 → #6F685C (AA on cream).
- `--forest-100` #D9E3DC hover wash.
- NotificationBell badge → `--danger` (palette rust).

**Breakpoints (standardized):** 640 / 880 / 1024.

**A11y:** skip-link; 1px neutral inset outlines on photos; tap-min unified at 48px;
alt text + width/height audited.
