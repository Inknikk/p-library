/* library.js - the shelf contents.
 *
 * A book is one Markdown file plus one entry here. Adding a book means
 * dropping the file in books/ and adding a row to BOOKS. No build step.
 *
 * `tone` picks a cover ground from css/tokens.css, never a raw colour.
 * `cover` is optional: when it is absent the cover is typographic, which
 * is a finished state rather than a placeholder. Point it at
 * assets/covers/<slug>.jpg to use real artwork.
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
      tone: "plum",
      chapters: 114,
      words: 685000,
      blurb: "A story of love, dreams, and forbidden desires spanning ten chapters across Guangzhou's seasons."
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