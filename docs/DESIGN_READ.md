# Design Read

Phase 1 output. Follows `design-taste-frontend` section 0 (brief inference) and
section 1 (the three dials).

## The design read

> Reading this as: a reading tool for people who already read on a screen, with
> a cold monochrome chrome language that recedes on command, leaning toward
> layered near black surfaces, one saturated accent, and a measure locked around
> 68 characters.

## Why that read

Signals used, in the order the skill asks for them:

| Signal | Found in the brief | Effect on the read |
|---|---|---|
| Page kind | A library plus a reader, so a web app with two surfaces | Shelf is Operate, reader is Read. Modes differ per surface, so chrome stays quiet and the document does the work. |
| Vibe words | "sleek premium", "minimal menus", "different backgrounds" | Premium consumer restraint, not expression. Premium here means invisible, not impressive. |
| Reference signals | User asked for the best modern readers, named none | The measured reference set in `PROJECT_BRIEF.md` stands in, and it pointed at annotation, keyboard first, and theme switching as the three things that matter. |
| Audience | Readers mid session | Density must drop. Every control spent is attention stolen from the text. |
| Brand assets | None exist | The palette is derived, not inherited. The rotation rule in the taste skill applies: the scaffold shipped warm cream, so warm cream is out. |
| Quiet constraints | None stated | No override needed. |

## Dials

| Dial | Value | Reasoning |
|---|---|---|
| `DESIGN_VARIANCE` | **6** | Off, not symmetrical. The shelf is an asymmetric grid and the reader is strictly single column, because a document has one correct shape. Above 6 would start fighting the prose. |
| `MOTION_INTENSITY` | **4** | Fluid CSS only, and only where it carries meaning: background cross fade, drawer slide, toast, press feedback. The taste skill bans scroll listeners and the reading surface has zero scroll driven animation. Reduced motion collapses all of it. |
| `VISUAL_DENSITY` | **3** | Art gallery spacing. The premium consumer preset is 3 and the read is the reason: room around the text is the product. |

Baseline was 8 / 6 / 4. All three moved down, for the same reason: a reading
surface is a place where decoration is a defect.

## Palette family chosen, and why

The taste skill bans two defaults by name: AI purple accents, and the warm
cream plus brass plus espresso palette for premium consumer work. The scaffold
generated tokens that hit both bans, so both are reassigned.

Chosen: **cold luxury smoke**, the silver grey plus chrome family, with a single
saturated accent.

- Chrome runs cool, near black, layered in small steps: `#08090b` through
  `#2e343d`.
- One accent, jade, held under the 80% saturation cap and used only for active
  state, focus and progress.
- Amber is functional, not brand. It is the highlight colour and it is allowed to
  be a second colour because a highlighter is a tool, not decoration.
- Text is off white `#eef1f4`, never pure white, and never pure black anywhere.

The reading surfaces are a separate system with eight entries, because that is
what a reader actually asks for. The two systems never mix.

## Type

- UI and shell: system sans stack, no webfont download, so there is no render
  blocking and the site works offline. Self hosted faces were rejected because
  a font request is the first thing that breaks on `file://` and on a cold
  cache.
- Reader prose: a serif stack for long form and a sans stack for screen
  reading, switchable by the reader, defaulting to the serif. Serif is justified
  here rather than decorative: the surface is a manuscript, which is one of the
  three cases the taste skill allows.
- Negative tracking on body text at 17px and up, taken from the Apple Books
  measurement: -0.022em. This is the cheapest legibility win available.
- Line height 1.5 at 18px, from the Readwise scale. Not 1.6.

## The bans applied to this build

| Ban | Source | Action |
|---|---|---|
| AI purple accent | taste skill 4.2 | `#6d5efc` deleted |
| Warm cream plus brass plus espresso | taste skill 4.2 | `#f7f5f0` and `#c-paper-dim` deleted from the app surface |
| Inter as the default face | taste skill 4.1 | not used anywhere |
| Serif as the display face | taste skill 4.1 | serif is reader content only, never UI chrome |
| Gradient text | impeccable craft floor | none |
| Zero offset glow | impeccable craft floor | all shadows have both an x and a y offset |
| Eyebrow over every heading | taste skill 4.7 | one on the shelf, none in the reader |
| `transition: all` | interfaces skill | every transition lists its properties |
| `window.addEventListener("scroll")` | taste skill 5.D | the reader's progress bar uses an IntersectionObserver plus a passive rAF throttled read on a single container |
| Unicode symbols as icons | render verification | all icons are inline SVG with `currentColor` |
| `innerHTML` on raw Markdown | security review | tag and attribute allowlist first |

## Iterations

The skill asks for sequential visible iterations with per iteration
verification, not one mega batch. The build runs as four:

1. Tokens and shell. Verify computed values by DOM probe.
2. Shelf and listings. Verify at 1440, 768, 375 plus a 980x700 desktop site on
   mobile viewport for horizontal overflow.
3. Reader: render, table of contents, find, backgrounds, type controls. Verify
   each of the eight backgrounds for contrast by probe.
4. Annotations, read aloud, resume, full screen. Verify keyboard path end to
   end and the console error count.
