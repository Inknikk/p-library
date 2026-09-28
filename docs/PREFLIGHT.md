# Pre-Flight Checklist: inkwell

> Run BEFORE declaring done. Any unchecked item = not shipped.
>
> **A note on this list.** The scaffold checklist is written for an Awwwards
> marketing page: hero meshes, marquees, magnetic buttons, 3D tilt. `inkwell`
> is a reading tool, and several of those items are not merely unnecessary
> here, they are the exact AI-slop tells the anti-slop section below bans.
> Those rows are marked **N/A with a reason** instead of being quietly ticked.
> Everything that does apply is ticked with the measurement that proves it.
>
> Reproduce every number here with:
> ```
> node tools/check_dom.js      # markup and script DOM contract
> node tools/check_css.js      # braces, dead declarations, unresolved var()
> node tools/test_markdown.mjs # 42 unit tests, the pure parser functions
> python3 tools/verify.py      # 94 checks, real browser, real HTTP and file://
> ```

## Phase Gates

- [x] **Gate 0**: Research complete. `docs/PROJECT_BRIEF.md`, 6 reference points recorded
- [x] **Gate 1**: Design Read complete. `docs/DESIGN_READ.md`, all dials set
- [x] **Gate 2**: Skills Consulted. `SKILLS_MANIFEST.md`, all Required `[x]`
- [x] **Gate 3**: Build Complete. tokens only, zero raw values in component CSS
- [x] **Gate 4**: Verify Passed. 94 browser checks and 42 unit tests, 0 failures

## Pre-requirements

- [x] `SKILLS_MANIFEST.md` exists, all Required skills `[x]`
- [x] Cross-deps loaded in the documented order
- [x] `QUALITY_REPORT.md` filled with measured evidence
- [x] Skill templates applied manually (no `--load-skills` flag in this harness)

## Layout

- [x] No hero section; the masthead states the shelf in one line and the books are the first thing below it
- [x] `DESIGN_VARIANCE 6` honoured by asymmetry rather than a hero: the shelf head pairs a two-line title against a right-aligned label, and the grid is a fixed-measure column that never centres text
- [x] Single-line app bar at every width, no hamburger on desktop (the menu button is a shelf/contents control, not a nav)
- [x] No section-layout repetition: masthead, shelf head, resume card, card grid, colophon footer, reader bar, drawer, TTS panel, prefs dialog
- [x] Zigzag ≤ 2 consecutive: N/A, no image/text splits exist
- [x] No split-header-as-default
- [x] Different layout families ≥ 4: centred masthead, two-column shelf head, auto-fill card grid, one-line reader chrome, side drawer, dialog
- [x] Asymmetric layout used where variance > 4: the shelf head is a 2-column split that collapses to 1 column under 860px
- [x] Whitespace on the `--space-*` scale, `--space-7`/`--space-8` between shelf regions

## Premium Components

- [x] Hero mesh gradient: **N/A**: there is no hero, and a mesh gradient behind a reading surface would cut contrast for every one of the eight grounds
- [x] Magnetic buttons: **N/A**: attraction would fight the reading pointer position and it does not survive `prefers-reduced-motion`
- [x] Scroll reveal: **N/A on the reader, by rule**: a paragraph must not fade in as it is scrolled to, because a reader scrolls fast and would see blank text. The shelf uses a single staggered entrance that runs once on first paint
- [x] Text scramble: **N/A**: unreadable during the animation, banned by the "read slowly" premise
- [x] Image parallax: **N/A**: there are no images, only typographic covers
- [x] Card 3D tilt: **N/A**: covers are CSS, not photos, and a tilt would distort the title block
- [x] Marquee infinite: **N/A**: nothing to announce, and a moving element is a WCAG 2.2 failure waiting to happen
- [x] Theme switch: **present**, 8 grounds, animated, `localStorage`-backed, all 8 measured
- [x] Counter animate: **N/A**: the only number that changes is the reading percentage, which must be trustworthy at a glance, not animated
- [x] Progress ring: **N/A**: reading progress is a linear position, a ring would misstate it near the start and end
- [x] Nav morph: **N/A**: the app bar has no multi-page nav
- [x] Form float labels: **N/A**: no text inputs; every control is a button, a slider or a segmented option
- [x] Gallery masonry / lightbox: **N/A**: no gallery

## Buttons & Forms

- [x] Primary CTA ≤ 3 words: "Resume", "Close", "Find"
- [x] Button text contrast ≥ 4.5:1: measured on all 8 grounds, worst case 10.26:1
- [x] Ghost button over photo: **N/A**: no photographs; the About button sits on `--surface-raised` with a `--border` stroke
- [x] Inputs, placeholders, focus rings, helper text: all pass AA. The only form controls are one range input and four segmented button groups, all with a visible label or a group label
- [x] No webfonts, so no `<link>` to a font host and no FOUT: system UI stack plus `Georgia`/serif fallbacks. Font payload is 0 bytes
- [x] Magnetic buttons: N/A as above
- [x] Focus rings: `0 0 0 2px var(--bg-sunk), 0 0 0 4px var(--focus)`, and a check asserts `outline: none` never appears

## Anti-slop: visual

- [x] No Fraunces / Instrument Serif: type is the system UI stack for chrome and `Georgia, ui-serif, serif` for the text itself
- [x] No generic AI gradient; no beige+brass+espresso. The shell is cold smoke (`#0b0d10`) with a single jade accent (`#5ee0a0`) and amber only where a highlight exists
- [x] Icons are hand-drawn SVGs: **deviation, accepted**. The brief forbids runtime CDNs, and an icon library would be one. The set is 18 symbols on a shared 24px grid, all `stroke-width: 1.5`, all defined once in a `<defs>` block and referenced by `<use>`
- [x] No div-based fake screenshots
- [x] No eyebrow over heading, no gradient text, no hero metrics, no zero-offset halo
- [x] Distinctive pairing: system UI chrome against a book serif, deliberately un-brutalist
- [x] Custom palette: jade accent and 8 grounds, none of them the default `#6d5efc` placeholder

## Anti-slop: writing

- [x] Em dashes: 3, all in `<title>` and its two social copies, where it reads as punctuation rather than prose. Every other string uses a comma, colon or full stop. The one prose use, the notes export header, was a dash and is now a colon
- [x] A fourth dash is the `—` shown for a book with no progress yet. That is a typographic placeholder for an empty value, not prose
- [x] None of: delve, leverage, harness, empower, transform, revolutionize, game-changer, seamless, cutting-edge, robust, scalable, innovative, unlock, supercharge, elevate, amplify
- [x] None of: "Here's the thing", "Let's dive in", "In today's world", "It's worth noting", "That said"
- [x] No filler openers
- [x] No generic SaaS copy
- [x] Copy written for this app, not templated

## Motion & Interaction

- [x] CSS Grid for the shelf and dialogs; flex only where a row of controls needs to align
- [x] `100dvh` for both the shelf frame and the reader, never `h-screen`
- [x] Motion gated by `.motion-ready` and `prefers-reduced-motion`; with motion off, the shelf renders in its final state
- [x] Staggered shelf entrance; `scale(0.98)` press on controls; `tabular-nums` on the percentage and word counters
- [x] Dark mode: 8 grounds, 5 of them dark, all measured in both directions
- [x] Cursor glow: **N/A**: banned in `DESIGN.md`; the reading pointer is a text caret and must not be decorated
- [x] Magnetic buttons, card tilt, scroll reveals: N/A as above
- [x] Page transitions: `--dur` 200ms for controls, `--dur-slow` 380ms for the drawer and dialog, 120ms `--dur-fast` for icon swaps

## Tokens & Code Quality

- [x] Zero raw hex/px/rem in `base.css`, `components.css`, `sections.css`, `motion.css`: enforced by a check
- [x] All colours from `css/tokens.css` primitives
- [x] Spacing only from `--space-*`
- [x] Radii only from `--radius*`
- [x] Shadows only from `--shadow-*`
- [x] Transitions only from `--dur*` and `--ease*`
- [x] `--brand-rgb` for glows: **N/A**: no glows exist
- [x] **Documented exception**: five `@media` breakpoint widths are bare numbers, because `@media` does not accept custom properties in any shipping browser. They are named in `tokens.css` as `--bp-*` so the decision is visible

## Performance

Measured by Playwright, not Lighthouse. Lighthouse is not installed in this environment, and the numbers below are the ones the check suite asserts.

- [x] LCP < 2.5s: **832ms** desktop, **712ms** phone
- [x] CLS < 0.1: **0.0000** on both. It was 0.41 on a phone until the footer moved out of document flow; the cause and the fix are in `QUALITY_REPORT.md`
- [x] TBT < 200ms: **37ms** desktop, **12ms** phone, each from a single long task. Measured with a `longtask` PerformanceObserver and asserted by `tools/verify.py`, not estimated. A draft of this file quoted 33ms from a one-off probe
- [x] Opening a book costs one further block, which is input latency rather than TBT because it happens after the click. It was **445ms** and is now **218ms**, from two separate faults. This one is measured by hand, not gated:
  - `open()` set the location hash, which fired `hashchange`, which ran `route()`, which called `open()` again. Every book was parsed and rendered twice and the first render was thrown away. Guarded, and the guard is asserted by checking the page still has no skeleton left in it
  - the inline Markdown parser walked the text one character at a time and ran five sequential `replace` calls on each one, so a 163KB book cost 199ms. One combined escape pass plus a bulk fast path for ordinary prose took the same book to **19ms**, with byte-identical output
- [x] JS < 50KB gzipped: **18.4KB** across the five application files. The offline bundle is separate and larger: **135.8KB** gzipped, 139,050 bytes, loaded only on `file://` and never on the deployed site. Total JS on disk is 154KB gzipped, so the honest reading of this row is "application JS", not "all JS"
- [x] CSS < 30KB gzipped: **14.6KB** across five files
- [x] Fonts < 100KB: 0 bytes, no webfont is requested
- [x] Images: there are none. Covers are CSS grounds with type on top
- [x] No render-blocking third-party resources. Five stylesheets and five scripts are same-origin; the five script tags are parser-blocking and last in `<body>` on purpose, so the DOM they need already exists

## Accessibility (WCAG 2.2 AA)

- [x] Contrast ≥ 4.5:1: measured per ground, worst 10.26:1 (sepia), best 16.34:1 (ink). Body text and chrome separately
- [x] Focus visible on all interactive elements, asserted by a check
- [x] Reduced motion: `prefers-reduced-motion` disables entrances, icon swap and smooth scrolling
- [x] Semantic landmarks: `header`, `main`, `section`, `footer`, `aside` present
- [x] ARIA labels on all 18 icon-only buttons, asserted by a check
- [x] Skip link to the shelf. One is enough: WCAG 2.4.1 asks for a bypass mechanism, and the reader is reached from the shelf, not linked into
- [x] The one numeric control, the pace slider, exposes `aria-valuetext` so it announces "a little fast" rather than "1.4". Asserted, and asserted again after the value moves
- [x] The About dialog is labelled, takes focus, and closes on `Escape`. All three asserted
- [x] The shelf app bar and main are `inert` while a book is open, so neither a screen reader nor `Tab` can reach four book cards and an app bar hidden behind the reader. Asserted
- [x] Heading hierarchy: exactly one `h1`; book chapters are `h2`; the dialog title is `h2`
- [x] Alt text: N/A, no `<img>` elements
- [x] `lang="en"` on `<html>`

## SEO & Metadata

- [x] Title 33 characters, unique
- [x] Description 154 characters
- [x] Open Graph: type, site_name, title, description, locale, url
- [x] Twitter Card: `summary` with title and description
- [x] JSON-LD `WebSite` with a `url` and a `hasPart` list of the four `Book` entries; parses clean
- [x] Canonical URL: `https://inknikk.github.io/p-library/`, the Pages URL for `Inknikk/p-library`. The absolute host is known, so the tag is written rather than guessed. A `file://` reader ignores it
- [x] `robots.txt` present, allowing everything. The app is one page with a hash route, so there is no URL tree to restrict
- [x] `sitemap.xml` present, naming the same host, and referenced from `robots.txt`
- [x] Semantic HTML

## Cross-Device Verification

| Viewport | Cards | Book | H2 | Words | Bar height | Console errors | Horizontal overflow | Vision gate |
|----------|-------|------|----|-------|------------|-----------------|--------------------|-------------|
| Desktop 1440×900 | 4 | Moby-Dick | 3 | 9,363 | 56px | 0 | none | pass |
| Tablet 768×1024 | 4 | Moby-Dick | 3 | 9,363 | 52px | 0 | none | pass |
| Phone 375×812 | 4 | Moby-Dick | 3 | 9,363 | 52px | 0 | none | pass |
| Laptop 980×700 | 4 | Moby-Dick | 3 | 9,363 | 56px | 0 | none | pass |
| Largest book, desktop | 4 | **Walden** | 2 | 29,550 | 56px | 0 | none | pass |
| Offline `file://` | 4 | **Walden** | 2 | 29,550 | 56px | 0 | none | pass |

All four viewport rows open the first card, which is Moby-Dick. The offline row opens Walden, the largest excerpt, because that is where the parse and the render are at their worst. The bar drops to 52px under 860px and the secondary tools move into the drawer, so the chrome stays on one line; asserted at every width, and 980×700 is a real case in `VIEWPORTS` rather than a one-off probe.

## Rubric

Scored against what a reading tool is judged on, not against a marketing page.

| Category | Score | Max | Note |
|----------|-------|-----|------|
| Reading comfort | 24 | 25 | 640px measure, 18px/27px, 8 grounds, no layout shift |
| Interaction design | 19 | 20 | find, notes, TTS, focus mode, drawer, all keyboard reachable |
| Motion & animation | 17 | 20 | restrained on purpose; -3 for no scroll-linked effect, which is a choice for a reader |
| Typography | 14 | 15 | book serif against system UI; -1 for no display face |
| Technical execution | 10 | 10 | 0 raw values, 0 console errors, 0 failed requests, sanitiser proven |
| Content & copy | 5 | 5 | four real texts, no lorem, no filler |
| Cross-device | 5 | 5 | 4 viewports plus offline |
| **TOTAL** | **94** | **100** | **≥ 90** |

## Loop Engine Verification

- [x] Iterations: 6 bounded passes, each one inspect-then-fix-then-confirm
- [x] Best iteration: the final run, 94/94
- [x] Vision gate: passed, zero defects outstanding
- [x] Regression gates: 5 named checks that exist specifically to stop a previous fix from regressing, namely the CSS structure check, the position-restore check, the raw-value check, the `transition: all` check and the CLS check
- [x] `QUALITY_REPORT.md` filled with every iteration

## Final Verification

- [x] `impeccable detect.mjs`: not present in this environment. `tools/verify.py` covers the same ground: overflow, targets, contrast, motion, semantics, security, storage, routing
- [x] Playwright: 0 console errors, 0 page errors, 0 failed requests across 4 viewports and offline
- [x] Bounded passes: inspect once, fix in one batch, confirm once, stop
- [x] Verdict recorded as **SHIP** in `QUALITY_REPORT.md`

---

**Verdict:** ☑ **SHIP**: 94 browser checks and 42 unit tests, 0 failures, every applicable preflight item measured
**Signed:** opencode
**Date:** 2026-09-28
