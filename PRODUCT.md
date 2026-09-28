# PRODUCT.md

Captured 2026-09-28 from the user's brief. Product truth only. Visual decisions
live in `DESIGN.md` and `docs/DESIGN_READ.md`.

## What this is

A book library web app. A handful of book listings on a shelf, each opening into
a Markdown reader that lives in the page or takes the whole screen.

## Who it is for

People who already read on a screen and want the chrome to disappear. The
audience picks the aesthetic: nobody wants to admire an interface while they are
trying to read a chapter.

## What the reader must do

1. Open a book and start reading inside the listing page, no page navigation.
2. Leave the page into a full screen reading surface.
3. Switch the reading background without leaving the text.
4. Find a passage, mark it, attach a note to it, and come back to it later.
5. Listen to the book read aloud, with skip back and skip forward.
6. Resume exactly where they stopped, per book.

## What the reader must never do

- Compete with the text. No motion that fires on scroll, no marquee, no cursor
  effects, no parallax, no entrance animations on paragraphs.
- Present a wall of menus. One toolbar, one overflow menu, nothing else.
- Refuse to work. The site is static: no build step, no framework, no CDN. It
  must render from `file://` and from GitHub Pages with the network offline
  after first load.

## Content shape

Markdown files stored in the repository. The reader fetches them at runtime and
parses them in the browser. Adding a book means dropping in a `.md` file and one
entry in `js/library.js`.

## Non negotiable technical constraints

| Constraint | Reason |
|---|---|
| No npm, no bundler, no framework | The deliverable is a GitHub repo that must render as pushed. A build step is a broken Pages deploy. |
| No runtime CDN | Offline and `file://` support are hard requirements. |
| `localStorage` holds preferences only | Never tokens or secrets. Anything in `localStorage` is readable by any script on the origin. |
| Markdown output is untrusted | It is sanitized with a tag and attribute allowlist before it reaches `innerHTML`. |
| Every interactive element reachable by keyboard | Reader users navigate by key. Mouse-only affordances do not ship. |

## Success test

A reader opens a book, reads for ten minutes, changes the background twice,
marks one passage, and never once notices the interface.
