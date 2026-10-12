/* library.js - the shelf contents.
 *
 * A book is one Markdown file plus one entry here. Adding a book means
 * dropping the file in books/ and adding a row to BOOKS. No build step.
 *
 * `tone` picks a cover ground from css/tokens.css, never a raw colour.
 * `cover` is optional: when it is absent the cover is typographic, which
 * is a finished state rather than a placeholder. Point it at
 * assets/covers/<slug>.jpg to use real artwork.
 *
 * `status` is "available" or "locked". Only one title is available right
 * now; the rest stay on the shelf, greyed and unopenable, so the library
 * still reads as a library without pretending the texts are ready.
 * `featured` marks the one title the home page presents as the hero.
 * `glyph` is a decorative Chinese seal set into the cover.
 */
(function (global) {
  "use strict";

  var BOOKS = [
    {
      slug: "forbidden-flower",
      title: "Forbidden Flower",
      author: "Anonymous",
      year: 2026,
      src: "books/forbidden-flower.md",
      tone: "clay",
      glyph: "禁花",
      sections: 10,
      chapters: 114,
      words: 126568,
      status: "available",
      featured: true,
      blurb: "From Guangzhou's wet springs to its slow summers, a story about wanting what you were never meant to have."
    },
    {
      slug: "frankenstein",
      title: "Frankenstein",
      author: "Mary Shelley",
      year: 1818,
      src: "books/frankenstein.md",
      tone: "slate",
      chapters: 4,
      words: 11988,
      status: "locked",
      blurb: "Four letters from the Arctic, and the thing that followed the ship home."
    },
    {
      slug: "moby-dick",
      title: "Moby-Dick",
      author: "Herman Melville",
      year: 1851,
      src: "books/moby-dick.md",
      tone: "ink",
      chapters: 3,
      words: 9342,
      status: "locked",
      blurb: "A whaling voyage, a pale deck, and a captain who has read too much about whales."
    },
    {
      slug: "walden",
      title: "Walden",
      author: "Henry David Thoreau",
      year: 1854,
      src: "books/walden.md",
      tone: "moss",
      chapters: 2,
      words: 29526,
      status: "locked",
      blurb: "Two years in a hut by a pond, written down plainly on purpose."
    },
    {
      slug: "wonderland",
      title: "Alice's Adventures in Wonderland",
      author: "Lewis Carroll",
      year: 1865,
      src: "books/wonderland.md",
      tone: "plum",
      chapters: 6,
      words: 12024,
      status: "locked",
      blurb: "Six chapters of falling down holes, taken at the pace of a curious child."
    }
  ];

  global.INKWELL_LIBRARY = BOOKS;
  global.INKWELL_findBook = function (slug) {
    for (var i = 0; i < BOOKS.length; i += 1) {
      if (BOOKS[i].slug === slug) return BOOKS[i];
    }
    return null;
  };
})(window);
