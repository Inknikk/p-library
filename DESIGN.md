# DESIGN.md: inkwell

The design system for a four book shelf with a Markdown reader. This file is
the contract: if a value is not here and not in `css/tokens.css`, it does not
exist. Component stylesheets reference the semantic token layer only.

Design read: `docs/DESIGN_READ.md`. Research: `docs/PROJECT_BRIEF.md`.
Dials: `DESIGN_VARIANCE 6`, `MOTION_INTENSITY 4`, `VISUAL_DENSITY 3`.

---

## 1. The problem this design solves

A reader is looked at for hours, so the design has one hard job: put the
text in the middle of attention and then get out of the way. Everything
below follows from that.

The interesting consequence is that the project needs **two colour systems
that never meet**. The shelf is chrome, and chrome is cold: near black
smoke, one jade accent, nothing warm anywhere. The reading surface is
whatever the reader chooses, and the eight options include warm papers and
three night grounds. A reader who picks sepia for a warm surface must not
then see warm chrome, and a reader who picks ink must not be handed a
washed out page. Chrome and reading surface are tokenised separately for
exactly this reason.

---

## 2. System one: app chrome

Cold luxury smoke. Smoke carries a slight blue cast so the jade accent reads
as a deliberate signal rather than a tint of the background.

| Token | Value | Use |
| --- | --- | --- |
| `--c-void` | `#08090b` | sunken ground, focus ring inner |
| `--c-smoke-900` | `#0d0f12` | page background |
| `--c-smoke-800` | `#14171b` | cards, drawer |
| `--c-smoke-700` | `#1b1f24` | raised panels, toolbars |
| `--c-smoke-600` | `#242931` | hover |
| `--c-smoke-500` | `#2e343d` | active border, swatch edge |
| `--c-line` | `#262b33` | default border |
| `--c-line-soft` | `#1c2026` | section rules |
| `--c-fog-600` | `#6d757f` | faint text, 4.6:1 on smoke 900 |
| `--c-fog-400` | `#9aa1ab` | muted text, 7.6:1 |
| `--c-chalk` | `#eef1f4` | body text |
| `--c-jade` | `#17b98a` | the only accent |
| `--c-amber` | `#e8b13a` | highlight marks, nothing else |
| `--c-danger` | `#e06a5c` | errors only |

Semantic aliases: `--bg`, `--bg-sunk`, `--surface`, `--surface-raised`,
`--surface-hover`, `--border`, `--border-soft`, `--fg`, `--fg-muted`,
`--fg-faint`, `--accent`, `--accent-dim`, `--accent-wash`, `--mark`,
`--mark-wash`, `--focus`.

**Accent budget.** Jade appears on: primary buttons, active icons, the
brand mark, the reading progress hairline, active shelf row, pressed chips,
and focus rings. Nowhere else. There is no second accent. Amber appears
only where a reader has marked text.

---

## 3. System two: reading surfaces

Each surface sets its own four values, so no component has to know which
one is active.

| Theme | Ground | Ink | Body contrast |
| --- | --- | --- | --- |
| `paper` | `#faf9f7` | `#23211d` | 13.9:1 |
| `sepia` | `#f2e7d3` | `#3b3227` | 10.4:1 |
| `sand` | `#e8e2d6` | `#2a2620` | 12.6:1 |
| `mint` | `#e4eee8` | `#1e2a25` | 12.9:1 |
| `slate` | `#e6e8ec` | `#1c2026` | 13.4:1 |
| `dusk` | `#2a2f3a` | `#e2e6ee` | 11.1:1 |
| `night` | `#14161a` | `#dfe2e7` | 14.6:1 |
| `ink` | `#0a0b0d` | `#e8eaed` | 17.2:1 |

Tokens per surface: `--rd-bg`, `--rd-fg`, `--rd-muted`, `--rd-rule`,
`--rd-mark-wash`. Ratios are measured in `QUALITY_REPORT.md`, not assumed.

The three night grounds are not the same colour three times. `dusk` is a
blue slate, `night` is a neutral graphite, `ink` is the darkest and the
flattest. They are distinguishable at a glance in the switcher, which is
why each chip carries a real swatch rather than a label alone.

---

## 4. Type

Two independent type systems, because chrome and body text have different
jobs.

**Chrome** uses the system UI stack, so nothing is downloaded and the
numbers stay aligned with `tabular-nums`. Scale `--fs-100` (12) to
`--fs-900` (clamp 36 to 56), tracking `-0.011em` on body and `0.14em` on
small caps labels only.

**Reading** uses `--f-read-serif`: Iowan Old Style, Palatino, Charter,
Georgia. Serif because long measures of serif hold a line better, and
because the shelf is selling reading, not software. The reader can switch
to sans or mono from the type panel. Body defaults to `--fs-400` (18px) at
`--lh-prose` (1.5), which is the measured Readwise pair from the brief.

Reader dials are attributes, not script written lengths:

| Attribute | Values | Token |
| --- | --- | --- |
| `data-size` | `s` `m` `l` `xl` | `--rd-size` 0.875 to 1.3125rem |
| `data-leading` | `tight` `normal` `open` | `--rd-lh` 1.4 / 1.5 / 1.75 |
| `data-measure` | `narrow` `normal` `wide` | `--measure-reader` 28/34/42rem |
| `data-font` | `serif` `sans` `mono` | `--rd-font` |
| `data-reader` | eight grounds | the surface block above |

`js/reader.js` sets the attribute. It never writes a length, so there is one
place to change a size and the scale stays a scale.

**Measure.** 34rem is roughly 66 characters at 18px, the middle of the 45
to 75 range from the brief. `--maxw-shell` is 1240px and holds four covers
plus a gap at desktop without a single horizontal scroll.

---

## 5. Space, radius, elevation

8pt base, named by step rather than by number, so `--space-6` is legible as
"this much air" and not as "32 pixels".

Radii follow one documented rule. Chips and pills are fully round, controls
are 10px, surfaces are 16px, covers are 4px because a book spine is not a
pill. Where one surface sits inside another, the inner radius equals the
outer radius minus the padding, so the curves stay parallel
(`--radius-control-inner`).

Shadows are layered, tinted to the surface hue, and never have a zero
offset. A flat shadow reads as a bug, not as restraint.

---

## 6. Components

| Component | Note |
| --- | --- |
| `.appbar` | one line, capped at 64px, sticky |
| `.card` | a cover plus title, author and progress. Covers are the right component for a book, which is why this is not a list of thin rows |
| `.cover` | typographic by default, `data-tone` picks one of five grounds. Real artwork is a drop in at `assets/covers/<slug>.jpg` |
| `.resume` | the one filled panel on the page, because continue reading is the only reason most people come back |
| `.btn`, `.icon-btn` | 44px minimum target, the icon box stays 40px and a pseudo element carries the extra 2px on each side |
| `.chip`, `.swatch` | the background switcher, each chip carrying its real ground |
| `.seg` | segmented control for type, size, leading, measure. The chosen option is a pressed state, never a colour swap |
| `.drawer` | shelf on the way in, contents once a book is open. One component, two jobs, 300px |
| `.find` | find bar, doubles as the selection toolbar |
| `.note` | a quote, a note, a date. No cards inside cards |
| `.skeleton` | shaped like the content it replaces. No spinner |
| `.toast` | 50ms out, 2.4s hold, one at a time |
| `.progress-line` | 2px jade hairline, transform width only |

---

## 7. Motion

`MOTION_INTENSITY 4`, so every transition names its properties, every
duration comes from `--dur-fast` (120ms), `--dur` (200ms) or `--dur-slow`
(380ms), and the easing comes from `--ease` or `--ease-out`. There is no
`transition: all` in this project and there will not be one.

- **Press**: `scale(0.96)`, never below 0.95, on every interactive element.
- **Shelf entrance**: a 10px rise, 380ms, staggered 40ms, capped at 220ms
  so the fourth card is not waiting on the tenth.
- **Drawer**: 380ms `ease-out` transform, nothing else.
- **Reader**: no entrance animation anywhere. Text that fades in is text you
  wait for, and a reader who opens a book at 2am does not want a curtain.
- **Auto hide chrome**: scrolling down hides the bar, any upward movement
  brings it back. The bar keeps its box, so nothing reflows and the reading
  position never jumps.
- **Focus mode**: takes the chrome out of the flow, then the script reapplies
  the same scroll fraction, so the paragraph you left is the paragraph you
  land on.
- **Reduced motion**: a hard block that collapses every duration to 0.01ms,
  kills the skeleton sweep, and neutralises press transforms. The base HTML
  renders identically with it applied, so nothing depends on an animation
  having run.

---

## 8. Accessibility

- Focus is never removed. `--focus-ring` is a two layer ring, 2px of sunken
  ground under 2px of jade, so it survives on every one of the eight
  reading grounds.
- Every icon button carries an `aria-label`; every toggle carries
  `aria-pressed`; the drawer carries `aria-expanded` and `aria-controls`.
- Segmented controls are `role="group"` with an accessible name; the
  pressed state is a real `aria-pressed`, not a class.
- Reading progress is announced in a visually small `tabular-nums` readout,
  and the toast dock is `role="status" aria-live="polite"`.
- The skip link is the first focusable element and becomes visible on focus.
- 44px minimum touch target, including on icon buttons.
- 100dvh for the fullscreen reader so mobile browser chrome cannot crop the
  progress line.
- Both keyboard and pointer work for every action. Nothing is hover only.
  Full keyboard map is in the About dialog and in `README.md`.

---

## 9. Security

The reader takes untrusted text and puts it in the DOM, so:

- Every book is parsed by `js/markdown.js`, which HTML escapes text before
  generating any markup.
- The generated string is then parsed off document by a hard allowlist
  sanitizer. Unknown elements are unwrapped or dropped with their content.
  Only `script`, `style`, `iframe`, `object`, `embed`, `noscript` and
  `template` are dropped with contents; everything else keeps its text.
- Attributes are allowlisted per tag, any `on*` attribute is removed, and
  `href` / `src` are scheme checked so `javascript:` and `data:` cannot
  survive.
- `innerHTML` is only ever fed a string that came out of that sanitizer.
- `localStorage` holds preferences, reading position, highlights and notes
  only. No token, no identifier, nothing sensitive. Storage failures degrade
  to an in memory map for the session and never throw into the UI.

---

## 10. What was deliberately rejected

| Rejected | Why |
| --- | --- |
| Warm cream chrome | The design read is cold smoke. A cream shelf fights every reading surface the reader can pick. |
| Hero with `min-height: 100dvh` | Four books do not need a curtain. The resume card is the first thing in the viewport. |
| Marquee and carousel | A shelf of four is not a feed. |
| Card grid of thin rows | Books have covers. Covers are the component. |
| Floating action button | Nothing here needs one primary floating action. |
| Glassmorphism and mesh gradients | Neither survives a reading surface, and both cost contrast. |
| Scroll driven text effects | Unreadable while reading, which is the one job. |
| Emoji as icons | Inline SVG, 1.5px stroke, inherits `currentColor`. |
| A second accent colour | One accent, so it keeps meaning. Amber is reserved for the reader's own marks. |
| Icon fonts | One more request, one more failure mode, less control. |
| A framework or bundler | Four books and a parser. Not justified, and it would break the `file://` promise. |
