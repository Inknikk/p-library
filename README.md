# Inkwell

Four public domain books, read slowly. A small shelf and a full screen reader that
keeps your place, your highlights and your reading preferences on your own machine.

No account. No tracking. Nothing you do leaves the machine. The only network
requests the page makes are the ones that load it, and one same-origin fetch when
you open a book that has not been bundled inline, and there is no analytics, no CDN,
no font service and no telemetry.

## Try it

Clone, then open the file. That is the whole install.

```bash
git clone https://github.com/Inknikk/p-library.git
cd p-library
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

You can also just double click `index.html`. It works from a `file://` path, which
is unusual for a web app and is deliberate: see *Offline* below.

To publish it, upload the folder to any static host. There is no build step, no
`npm install`, and nothing that has to compile before the page works.

## What is in the shelf

| Book | Author | Words |
|------|--------|-------|
| Moby-Dick | Herman Melville | 9,369 |
| Alice's Adventures in Wonderland | Lewis Carroll | 12,057 |
| Walden | Henry David Thoreau | 29,555 |
| Frankenstein | Mary Wollstonecraft Shelley | 12,017 |

Opening chapters, from Project Gutenberg. The texts live in `books/` as plain
Markdown, and each one carries its own front matter for title, author, year,
source and licence.

## What the reader does

- **Keeps your place.** Scroll position and percentage are saved per book. Close
  the tab, come back later, land on the same paragraph.
- **Eight reading grounds.** Paper, sepia, sand, mint, slate, dusk, night, ink.
  Every one is measured for contrast, worst case 10.26:1.
- **Type that fits.** Four sizes, four line heights, four measure widths, two
  typefaces, all remembered.
- **Find.** Case-insensitive, walks matches, count in the bar.
- **Highlights and notes.** Select text to highlight, attach a note, export the
  lot as Markdown.
- **Read aloud.** The browser's own voice, with pace control. Nothing is sent
  anywhere.
- **Focus mode.** Takes the chrome away without moving your place.
- **Keyboard.** `Control K` find, `R` focus mode, `F` fullscreen, `Escape` to
  leave a panel, arrow keys for find matches. Full list under *About & keys*.
- **Deep links.** The URL carries the book, so `#/book/walden` is shareable and
  survives a reload.

## Offline

A browser will not let a `file://` page fetch a sibling file, through either
`fetch` or XHR. So the book texts are also compiled into a single script,
`js/books-inline.js`, which is injected only when the page notices it is on a
`file://` origin. On a normal server that file is never loaded, and it is not
part of the deployed payload.

If you add a book, regenerate it:

```bash
python3 tools/build_inline.py
```

## Adding a book

1. Put the Markdown in `books/`, with front matter:

   ```markdown
   ---
   title: The Example
   author: A. Writer
   year: 1901
   source: Project Gutenberg ebook 12345
   url: https://www.gutenberg.org/ebooks/12345
   license: Public domain in the United States
   ---

   # The Example

   *A. Writer*

   ## Chapter One
   ```

2. Add a row to `BOOKS` in `js/library.js`:

   ```js
   { slug: "the-example", title: "The Example", author: "A. Writer",
     year: 1901, tone: "moss", src: "books/the-example.md" }
   ```

3. Run `python3 tools/build_inline.py` if you want it available offline.

`tone` is one of `slate`, `moss`, `clay`, `plum`, `ink`, and it is what the
typographic cover is drawn in. Nothing else needs touching.

## How the text is handled

Book text is never trusted. It is escaped, parsed to HTML, and then walked
against an allowlist of tags and attributes. Event handler attributes and
`javascript:` and `data:` URLs do not survive, and the suite checks this with a
hostile fixture rather than by reading the code.

The same code path renders your own notes, so a note cannot inject anything
either.

## Verify it

```bash
node tools/check_dom.js      # markup and script agree on every id
node tools/check_css.js      # braces, dead declarations, unresolved var()
node tools/test_markdown.mjs # 42 unit tests for the parser
python3 tools/verify.py      # 94 checks in a real browser
```

`verify.py` needs `playwright` and a Chromium install, and it needs a server
running on port 8412. It covers four viewports plus offline, all eight grounds,
contrast, touch targets, focus, the sanitiser, storage, routing, LCP and CLS.

## Project layout

```
index.html            the whole page
css/tokens.css        every colour, size, space and duration in the project
css/base.css          reset, focus, skip link
css/components.css    buttons, cards, covers, drawer, dialogs
css/sections.css      shelf and reader layouts
css/motion.css        entrances, icon swaps, reduced motion
js/store.js           preferences and per-book state
js/markdown.js        parser and sanitiser
js/library.js         the four books
js/reader.js          the reader
js/main.js            shelf, routing, boot
books/*.md            the texts
tools/                build and verification
```

Everything is a plain classic script, in order, at the end of `<body>`. That is
what lets it run from a local file with no server.

## Design

`DESIGN.md` is the contract. Short version: a cold smoke shell, one jade accent,
amber used only where a highlight exists, and no scroll-driven effects anywhere,
because a paragraph that fades in as you scroll to it is a paragraph you will
scroll past unread.

## Licence

Code: MIT. Texts: public domain in the United States, from Project Gutenberg.
