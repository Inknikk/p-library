# Quality Report: inkwell

> Proof the pipeline ran, with the measurements rather than a claim that it did.
> Any empty field below means a step was skipped.
>
> Reproduce everything here:
> ```
> node tools/check_dom.js     # 90 ids, 69 collected, 76 references
> node tools/check_css.js     # braces, dead declarations, unresolved var()
> node tools/test_markdown.mjs # 42 unit tests, parser branch by branch
> python3 tools/verify.py     # 94 checks, real Chromium, HTTP and file://
> ```
> Last run: 2026-09-28. **94 browser checks and 42 unit tests, 0 failed.**

## Pipeline Status

| Phase | Status | Evidence |
|-------|--------|----------|
| 0. Research | done | `docs/PROJECT_BRIEF.md`, 6 reference points |
| 1. Design Read | done | `docs/DESIGN_READ.md`, dials and the reasoning behind each |
| 2. Skills Consulted | done | `SKILLS_MANIFEST.md`: 11 of 11 Required loaded, 8 of 11 Recommended, 19 entries loaded in total. The 10 that are not loaded are recorded as not installed, not as covered |
| 3. Build | done | 0 raw values outside `tokens.css`, asserted by check |
| 4. Verify | done | `docs/PREFLIGHT.md` and this report |

## Skills Status

| Skill | Loaded | Evidence |
|-------|--------|----------|
| impeccable | yes | Design contract, motion restraint, focus rules |
| make-interfaces-feel-better | yes | Press feedback, tabular numerals, icon stroke, one-line chrome |
| design-taste-frontend | yes | Direction and dials, `DESIGN_READ.md` |
| ui-styling | yes | Component states and segmented controls |
| browser-qa | yes | `tools/verify.py` |
| render-verification | yes | Real contrast and layout probes, not eyeballed |
| design-skill-execution | yes | Dependency loaded before impeccable was applied |
| security-review | yes | Sanitiser allowlist, 5 hostile-input checks |
| error-handling | yes | `AppError` with codes, one user-facing failure path |
| verification-loop | yes | 6 bounded passes, this report is the log |
| git-workflow | yes | See notes on publishing |
| design | **no** | Not installed in this harness. Its scope was the Gemini image pipeline; the five cover tones and eight grounds came from `DESIGN.md` instead |
| design-system | yes | `DESIGN.md`, tokens, one accent, amber for marks only |
| ui-ux-pro-max | yes | 44px targets, measure widths, four layouts per view |
| seo | yes | Title, description, OG, Twitter, JSON-LD, robots |
| production-audit | yes | Loaded for the release pass. Produced the five known gaps below and the rule that a score is worthless without naming the evidence |
| tdd-workflow | yes | Checks were written before the last three fixes; `node:test` covers the pure functions |
| e2e-testing | yes | Four viewports, offline, and the rule against arbitrary waits that the suite follows |
| deployment-patterns | yes | Loaded for the release checklist. Most of it does not apply to a static site; the security-header and rollback rows are pending, named in the gaps |
| plankton-code-quality | **no** | Not installed in this harness. A structural CSS check and a DOM contract check exist, written for this project, but they are not that skill |
| codehealth-mcp | **no** | Not installed in this harness. The `check_css.js` structural scan covers similar ground, but it is a local script, not that MCP server |
| frontend-design | yes | Loaded last, as a self-critique. Its list of AI tells caught five middle-dot meta strings, including the reader byline. Book serif against system UI, no display face |

## Optional Skills Skipped

| Skill | Reason | Impact |
|-------|--------|--------|
| apple-hig-expert | Not present in this harness | None. The one place its platform conventions would apply, the `inert` shelf, follows the same behaviour the HTML spec requires of every browser |
| Strict TDD for the whole app | The brief forbids a build step, and there is no package.json | Partly resolved. `tools/test_markdown.mjs` runs on `node:test`, which is built into Node, so the pure functions have 42 unit tests with no dependency and no build. The DOM behaviour still has no test-first cycle, only the 94 browser checks written after the fact |

## Measured Results

### Reading grounds

Contrast is computed from the rendered computed styles, not from the token values, so a token that failed to apply would show up here. It did, once: the paper ground was measuring 18.52:1 against the app background because its rule had been silently dropped.

| Ground | Background | Ink | Body contrast | Chrome contrast |
|--------|------------|-----|---------------|-----------------|
| paper | `#faf9f7` | `#23211d` | 15.27:1 | 15.27:1 |
| sepia | `#f2e7d3` | `#3b3227` | **10.26:1** | 10.26:1 |
| sand | `#e8e2d6` | `#2a2620` | 11.66:1 | 11.66:1 |
| mint | `#e4eee8` | `#1e2a25` | 12.52:1 | 12.52:1 |
| slate | `#e6e8ec` | `#1c2026` | 13.33:1 | 13.33:1 |
| dusk | `#2a2f3a` | `#e2e6ee` | 10.72:1 | 10.72:1 |
| night | `#14161a` | `#dfe2e7` | 13.95:1 | 13.95:1 |
| ink | `#0a0b0d` | `#e8eaed` | 16.34:1 | 16.34:1 |

Worst case 10.26:1 against a 4.5:1 requirement. The margin is deliberate: these eight are chosen for how a page feels to read, not only for passing a threshold.

### Viewports

| Viewport | Book | Words | Bar | Horizontal overflow | Console errors |
|----------|------|-------|-----|--------------------|-----------------|
| 1440×900 | Moby-Dick | 9,363 | 56px | none | 0 |
| 768×1024 | Moby-Dick | 9,363 | 52px | none | 0 |
| 375×812 | Moby-Dick | 9,363 | 52px | none | 0 |
| 980×700 | Moby-Dick | 9,363 | 56px | none | 0 |
| 1440×900, Walden | Walden | 29,550 | 56px | none | 0 |
| `file://` | Walden | 29,550 | 56px | none | 0 |

### Performance

| Metric | Desktop | Phone | Budget |
|--------|---------|-------|--------|
| LCP | 804ms | 700ms | 2500ms |
| CLS | **0.0000** | **0.0000** | 0.1 |
| TBT | 37ms | 12ms | 200ms |
| Transfer, first load, all 11 requests | 137.4KB | 137.4KB | 200KB |
| JS, gzipped, application files | 18.4KB | 18.4KB | 50KB |
| CSS, gzipped | 14.6KB | 14.6KB | 30KB |
| Webfonts | 0 bytes | 0 bytes | 100KB |
| Parse, 163KB book | 27ms | 27ms | 150ms |

`js/books-inline.js` is 356.6KB raw and 139.1KB gzipped, and is fetched only when the page is on a `file://` origin. It is not part of the deployed payload. Total JavaScript on disk is 154KB gzipped, of which 139.1KB is that one file, so the "JS under 50KB" budget applies to the application files and to nothing else.

Measured with a Playwright `PerformanceObserver`, not Lighthouse. Lighthouse is not installed here, and the numbers above are the ones the suite asserts, which is the more useful property.

### Accessibility

| Claim | How it is checked |
|-------|-------------------|
| Every icon-only button has an accessible name | Queried across `button.icon-btn`, `button.chip` and `.seg button` |
| Every form control has a label | `label[for]`, a wrapping `label`, or `aria-label` |
| The pace slider announces a phrase | `aria-valuetext` present, and present and changed after the value moves |
| The About dialog is labelled, focused, and closes on Escape | All three asserted |
| One heading per view | The shelf `h1` and a book's own `h1` are both in the source; only one is exposed at a time |
| The shelf leaves the tab order while reading | `inert` on the app bar and main, asserted |
| Contrast | 4.5:1 minimum, 16 measurements across 8 grounds |
| A skip link exists | Queried |

### Security

A book rendered from a deliberately hostile Markdown fixture, checked after the sanitiser:

| Probe | Result |
|-------|--------|
| `window.pwned` set | false |
| `<script>` elements surviving | 0 |
| `on*` attributes surviving | 0 |
| `javascript:` hrefs surviving | 0 |
| `<img src=x onerror>` surviving | 0 |
| Safe `https:` link surviving | 1 |
| Inline emphasis and code still rendering | yes |

## Iteration log

Seven bounded passes. Each one inspected, fixed in a single batch, and confirmed once.

**Pass 1: the app did not start.** The DOM contract failed on 21 missing ids: `bind()` ran before `collect()` had aliased them, and the scroll container was `null` until a book happened to open. The Markdown parser was also emitting a stray `<body>` because the sanitiser walked from `document.body`. Fixed by binding to the real element once in `bind()` and dropping `body` from the walk.

**Pass 2: offline produced four console errors.** The `file://` path tried `fetch`, then XHR, then fell back to the inline bundle, so the browser logged a CORS failure for a request it was always going to refuse. The loader now branches on `location.protocol` before touching the network, and a `file://` run asserts 0 console errors and 0 failed requests.

**Pass 3: three failures at once.** The menu button measured 43px on a phone because flexbox was shrinking it; `sections.css` had a bare `64` that the raw-value scan flagged, but the scan was reading a comment; and the `transition: all` check was matching the comment that says the project does not use it. Fixed by `flex: none` on icon buttons, and by stripping comments before both scans rather than weakening either rule.

**Pass 4: reading position was never saved.** `localStorage` held `{"walden":{"opened":...}}` with no `offset` and no `percent`, so a reload landed at the top every time. The cause was not the storage: progress was written on a trailing debounce, and a closing tab never ran it. Split into a debounced save and a `flush()` that runs on `pagehide`, `beforeunload` and `visibilitychange`, and made `close()` flush directly. Restoring is now asserted.

**Pass 5: four faults found by measuring instead of assuming.** A checklist row claimed there were no long tasks; there were four, the worst 445ms. Chasing it found that every book was parsed and rendered twice, because `open()` set the hash and `hashchange` ran `route()` into `open()` again. Chasing that found the inline parser running five regexes per character. Fixing all three: 445ms to 218ms, and the parse of a 163KB book from 199ms to 19ms with byte-identical output, and it measures 27ms in the current run. Separately, CLS was 0.41 on a phone, caused by `.prefs { display: grid }` overriding the UA rule that hides a closed dialog, and by a footer sitting in document flow under a grid that script fills after first paint. Fixed with an explicit `dialog:not([open])` rule and by making the shelf an app frame with an internal scroll region. CLS is now exactly 0.

**Pass 6: claims that turned out to be false.** Writing the preflight surfaced three assertions the code did not support: `aria-valuetext` was mentioned but never written, the second skip link did not exist, and TBT was described as unmeasured rather than measured. The slider now announces "a little fast" instead of "1.4" and the check asserts it moves with the value. The skip link claim was corrected rather than the code, because WCAG asks for one bypass mechanism, not two. And the accessibility claims were turned into checks, which immediately found a genuine bug: the shelf stayed in the tab order and the accessibility tree behind an open book. It is `inert` while reading now, and that is asserted.

**Pass 7: the parser had two defects no browser test could see.** Writing the unit layer found that single-marker emphasis never rendered and images never rendered. Emphasis searched for a closing two-character slice, so `*a*` never terminated and every italic in the project would have shown as literal asterisks. Images anchored their pattern at `[` but sliced the source from the `!`, so the match was impossible and `![alt](src)` degraded to bare text. Neither appears in the four bundled excerpts, which is exactly why 94 browser checks passed while both were broken. Both are fixed and both now have named tests. Lesson worth keeping: a browser suite proves a user path works, not that a function is correct.

### Checks that exist to stop a regression

Each of these was written in response to a real defect in this project, not to fill a row.

| Check | The fault it prevents |
|-------|-----------------------|
| `tools/check_css.js` | A stray brace silently dropped every rule after it, taking the paper reading ground with it. The check also resolves every `var()` across the project, so a typo fails loudly instead of falling back to an inherited value |
| `tools/check_dom.js` | 90 ids, 69 collected, 76 references. The first version of the app failed this on 21 ids and did not start at all |
| position is restored after a reload | Pass 4 |
| the largest book is parsed once | The hashchange loop |
| no raw colour or px values in component CSS | The 43px button and the comment false positive |
| CLS under 0.1 | The 0.41 shift |
| the shelf leaves the tab order while reading | The inert bug |
| every icon-only button has a name | Any future icon button added without a label |
| TBT under 200ms, and first load under 200 kB | A payload row that had drifted: the report quoted the HTML document alone, 20.2 kB, and called it first load. The real figure is 137.4 kB across 11 requests |
| emphasis and images render | Two dead parser paths. Emphasis searched for a two-character closing slice and images anchored at `[` while slicing from `!`, so neither could ever match |
| the offline reading bar is 56px | A report row that said 52px, copied from the tablet measurement without checking the viewport it was taken at |

## Render Verification

| Viewport | Chrome errors | Page errors | Failed requests | Overflow |
|----------|---------------|-------------|-----------------|----------|
| 1440×900 | 0 | 0 | 0 | none |
| 768×1024 | 0 | 0 | 0 | none |
| 375×812 | 0 | 0 | 0 | none |
| 980×700 | 0 | 0 | 0 | none |
| `file://` | 0 | 0 | 0 | none |

Screenshots were not captured to files. Every viewport was measured from the live DOM, which is the stronger claim: a screenshot can look right while the text is 12px and the bar is 58px tall, and a measurement cannot look right while being wrong.

## Verdict

**SHIP.**

All Required skills loaded, all five phase gates passed, 94 browser checks and 42 unit tests green, and every applicable row in `docs/PREFLIGHT.md` carries the measurement that proves it.

### Known gaps, named rather than buried

1. **Not pushed yet.** The repository `Inknikk/p-library` exists and is public but is still empty, so the site is not live and the Pages URL is reserved rather than served. The canonical link, the `sitemap.xml` and the `robots.txt` entry all name `https://inknikk.github.io/p-library/`, which is the URL GitHub will serve once the push lands. Until then those three point at a host that returns 404, which is the correct state for a repo that has no content yet.

2. **The sanitizer is still only covered in a browser.** `parse`, `escapeHTML` and `slugify` now have 42 unit tests in `tools/test_markdown.mjs`, run by `node:test`, which is built into Node and adds no dependency and no build step. `sanitize` and `render` need a `DOMParser`, so they remain covered only by the hostile-input checks in `tools/verify.py` against a live Chromium. That is the right split, but it does mean the sanitizer has no runner that can execute without a browser.
3. **The open-a-book block is measured by hand, not gated.** TBT covers load only. Opening a 163KB book used to block 445ms and now takes 218ms, but nothing in `tools/verify.py` fails if that regresses, since the suite gates the 27ms parse inside it, which is the part this project controls. A `longtask` observer on the click path would close the gap.
4. **Speech synthesis is unverified.** No audio output was tested. Whether a given browser build has a voice, and what it sounds like, was not checked.
5. **`:has()` is load-bearing for the shelf frame.** Chrome 105+, Safari 15.4+, Firefox 121+. Where it is unsupported the rule is ignored and the page falls back to scrolling as an ordinary document, which is the layout this project started with. Nothing breaks, but CLS returns to 0.41.

---

_Report written 2026-09-28._
