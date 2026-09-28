# Project Brief: inkwell

Phase 0 research output. Every claim below was measured with Playwright driving
Chromium on this machine, not recalled. Method: `sync_playwright` launched
`~/.cache/ms-playwright/chromium-1243`, each URL loaded at 1440x900 with a
desktop user agent, then `getComputedStyle` DOM probes plus control inventory
(`button`, `[role=button]`, `input`, `summary`, `[onclick]`) and enumeration of
root CSS custom properties. Raw output: `/tmp/opencode/reader-research/research.json`.

## 1. The subject

A small library of books, each a Markdown file. The listing page is the shelf.
The reader is the product.

## 2. Reference points measured

Twelve sites were loaded. Six returned usable data, four returned a dead page or
a marketing shell, two failed at the network. The six that carry design
authority are the references below.

### 2.1 Quartz 5, quartz.jzhao.xyz

The closest thing found to a real Markdown reader in the wild. An Obsidian
publish clone.

Measured: body `Source Sans Pro` at 16px / 25.6px (1.6 ratio), text `#4e4e4e` on
`#faf8f8`, headings in `Schibsted Grotesk`, code in `IBM Plex Mono`, 72 root
custom properties, accent `#284b63`, muted `#b8b8b8`, divider `#e5e5e5`.

Control inventory, verbatim labels: `Search`, `Dark mode`, `Reader mode`,
`Explorer` (a separate mobile and desktop trigger), `Copy source`,
`Table of Contents`.

Take: reader mode as a first class button, not a setting buried in a menu. Copy
source as a one click action. A warm neutral document background is legitimate
and reads as considered, but see section 4, we do not copy its palette.

### 2.2 SilverBullet, silverbullet.md

A keyboard first Markdown workspace. The header is a text input holding the page
name, nothing else. The whole UI is three shortcut hints, read straight off the
page: `Go to the index page (Ctrl-Shift-h)`, `Open page (Ctrl-k)`,
`Run command (Ctrl-/)`.

Take: the reader chrome gets a real keyboard layer and the shortcuts are shown,
not hidden. A reader is operated by key.

### 2.3 Readwise Reader, readwise.io/read

The product argument is annotation, stated in the page copy: "We believe that
annotations are the key". It also claims keyboard first navigation: "Glide
through your documents without ever using the mouse."

Measured type scale, from its own custom properties, which is the most useful
thing captured in this whole pass:

| Role | Size | Line height | Weight |
|---|---|---|---|
| body sm | 14px | 20px | 400 |
| body | 16px | 24px | 400 |
| body md | 18px | 28px | 400 |
| body lg | 20px | 28px | 400 |
| subheading | 20px | 48px | 400, letter spacing -0.01em |
| title xs | 18px | 22px | 600 |
| title sm | 20px | 24px | 600 |
| title md | 28px | 36px | 500 |
| title lg | 40px | 32px | 600 |

Surfaces: `--section-background` `#0c1117`, `--features-background-color`
`#151c23`, `--neutral-20` `#28313b`, `--neutral-30` `#3e4853`,
`--input-background` `#2e3745`, navbar `rgba(0,0,0,0.85)`.

Take: a 1.5 line height for body is the right default at 18px, not the 1.6 the
Markdown clones use. The dark surfaces are cool and near black, layered in small
steps, not pure black.

### 2.4 Libby, libbyapp.com

A real library app with a real audio player. Its control labels are the
specification for the read aloud feature:

`Rewind 15 seconds`, `Advance 15 seconds`, `Playback failed. Try opening the
audiobook`, `Now: Reading`, `Manage Loan`, `Pause update`, `Dismiss problem`,
`Scroll to top.`

Bottom navigation: `Search`, `Library`, `Shelf`, `Tags`, `Menu`.

Take: discrete 15 second skip in both directions, a visible failure state on
speech, and a resume card. Skip the five item bottom nav, this brief asked for
minimal menus.

### 2.5 Apple Books, books.apple.com

Measured: `SF Pro Text` 17px / 25px with letter spacing -0.374px (that is
-0.022em at 17px), `SF Pro Display` 24px / 28px with letter spacing +0.216px.
Text `#1d1d1f`, muted `#6e6e73`, focus ring `#0071e3`. Viewport breakpoints
320 / 834 / 1024, nav height 44px, and a text zoom factor as a named variable
(`--r-localnav-text-zoom-factor`) rather than a hardcoded scale.

Take: the negative tracking on body text at 17px is the single highest value
typography trick available, and it is free. Exposing a text zoom factor as a
first class control is expected, not optional.

### 2.6 Bionic Reading, bionicreading.com

A reading typography shop, which makes it a pure type specimen. `Inter`, text
`#3a3a3c` on `#ffffff`, muted `#8e8e93`, control chips on `#f2f2f7`, body
16px / 27.2px at letter spacing 0.5px.

Take: the reading background is the product. A dedicated reading theme company
sells nothing else.

### 2.7 Also loaded, lower authority

- Standard Ebooks, standardebooks.org: `Georgia` serif, 18px / 27px, zero
  chrome, 592,000px of scroll height. The proof that a reading surface can be
  literally nothing but text.
- Project Gutenberg, gutenberg.org: `Open Sans` 16px / 24px, and a
  `<summary>` disclosure labelled "Other formats & older devices" holding
  secondary metadata.
- Heptabase, heptabase.com: 4px / 6px / 1000px radius tokens, hairline borders
  built from `box-shadow` (`hsla(0,0%,6%,.1) 0 0 0 1px`), float shadow
  `0 10px 30px rgba(0,0,0,.06)`, and a nested document list that labels every
  entry with a duration and a relative recency.
- Koodo Reader, koodoreader.com: warm background `#f4f2ee`, `Onest` with
  `Inter` fallback, and copy about highlights and marking progress.
- Wikisource, archive.org, bldrs.sh, tome.app, Kindle web: loaded, no usable
  signal. `bldrs.sh` failed with `ERR_INTERNET_DISCONNECTED`, `tome.app`
  returned 404, and four sites that moved now serve GitHub's "Site not found".

## 3. Feature matrix

Every "adopt" row is traceable to a measured reference above.

| # | Feature | Reference evidence | Decision |
|---|---|---|---|
| 1 | Keyboard first, shortcuts shown on screen | SilverBullet ctrl hints, Readwise claim | Adopt |
| 2 | Highlight plus attached note, persisted per book | Readwise annotation argument, Koodo highlights | Adopt |
| 3 | Text to speech with 15s skip back and forward | Libby `Rewind 15 seconds` / `Advance 15 seconds` | Adopt |
| 4 | Visible speech failure state | Libby `Playback failed...` | Adopt |
| 5 | Table of contents built from headings, current section tracked | Quartz `Table of Contents` | Adopt |
| 6 | In document find with match count and next/previous | Quartz `Search`, Gutenberg `Search books` | Adopt |
| 7 | Reader mode, one button, hides everything else | Quartz `Reader mode` | Adopt |
| 8 | Eight swappable reading backgrounds | Bionic theme shop, Apple Books themes | Adopt |
| 9 | Full screen reading surface | User brief | Adopt |
| 10 | Type size, line height, measure and family controls | Apple `--r-localnav-text-zoom-factor`, Bionic | Adopt |
| 11 | Per book resume at the exact scroll offset | Koodo "mark progress", Libby `Now: Reading` | Adopt |
| 12 | Continue reading card on the shelf | Libby `Now: Reading` + `Manage Loan` + `Dismiss` | Adopt |
| 13 | Sidebar shelf with progress percent and last opened | Quartz `Explorer`, Heptabase duration and recency labels | Adopt |
| 14 | Copy raw Markdown | Quartz `Copy source` | Adopt |
| 15 | Transient toast for feedback, never a modal | Libby app footer toaster | Adopt |
| 16 | Metadata behind a disclosure | Gutenberg `<summary>` disclosure | Adopt |
| 17 | Visible focus ring from a token | Apple `--sk-focus-color` + focus offset | Adopt |
| 18 | Scroll to top control | Libby `Scroll to top.` | Adopt |
| 19 | Five item bottom nav | Libby bottom nav | Reject, brief asked for minimal menus |
| 20 | Nesting every document under folders | Quartz explorer, Heptabase tree | Reject, flat shelf reads faster at this size |
| 21 | Graph view, whiteboard, capture buttons | Heptabase, Quartz global graph | Reject, different product |
| 22 | Reading streaks and social proof | none measured | Reject, invented |

## 4. What the research changed about the plan

- **The scaffold's default palette gets replaced.** Its placeholder accent
  `#6d5efc` is an AI purple, and its paper `#f7f5f0` sits inside the exact
  warm cream family that premium consumer work defaults to. Both are
  reassigned in `DESIGN.md`.
- **Line height drops from 1.6 to 1.5 at 18px.** Readwise's own scale is
  18/28. The Markdown clones run 16/25.6 because they are UI first. A reader is
  prose first, so prose wins.
- **The reading background is separated from the app surface.** A reader needs
  paper toned surfaces to read on, but the chrome around it does not. The token
  file therefore has two independent systems: app chrome, and eight reading
  surfaces. They never bleed into each other.
- **The generated component library is cut.** The scaffold ships magnetic
  buttons, a cursor glow, text scramble, an infinite marquee, 3D card tilt and a
  cookie consent bar. For a reading surface those are the banned patterns, not
  features. They are deleted rather than left unused.
- **Contrast is verified per theme, not once.** Eight backgrounds means eight
  contrast checks. Any theme that fails body text at 4.5:1 is disabled, not
  shipped.

## 5. Constraints carried forward

- Static, no build step, no framework, no CDN. Verified render from `file://`
  and from a local server.
- Markdown output is sanitized through a tag allowlist. `javascript:` and
  `data:` URLs are stripped.
- `localStorage` holds preferences and reading state only.
- Reading state is per book and survives reload. It is stored per book id, not
  globally, so two books do not fight over one offset.
