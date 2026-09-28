/* Unit tests for the pure functions in js/markdown.js.
 *
 * QUALITY_REPORT.md named missing pure-function coverage of the parser as a
 * real gap. It is closed here with node:test, which ships inside Node itself:
 * no package.json, no install, no build step, and nothing added to what a
 * reader downloads.
 *
 * sanitize() and render() need a DOMParser, so they are not tested here. They
 * are covered where they run for real, by the hostile-input checks in
 * tools/verify.py against a live browser. That split is the point: this file
 * covers the string logic branch by branch, the browser suite covers the
 * sanitizer.
 *
 *   node --test tools/test_markdown.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

/* markdown.js is a classic script that ends in }(window). Running it in a vm
   context with one fake global is the same trick a <script> tag performs, and
   it keeps the source file free of any module-system concern. */
const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "..", "js", "markdown.js"), "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: "js/markdown.js" });
const md = sandbox.window.Inkwell.markdown;

/* ------------------------------------------------------------------ *
 * escapeHTML
 * ------------------------------------------------------------------ */

test("escapeHTML escapes all five characters", () => {
  assert.equal(md.escapeHTML(`&<>"'`), "&amp;&lt;&gt;&quot;&#39;");
});

test("escapeHTML leaves ordinary prose alone", () => {
  assert.equal(md.escapeHTML("Call me Ishmael."), "Call me Ishmael.");
});

test("escapeHTML handles a non string without throwing", () => {
  assert.equal(md.escapeHTML(42), "42");
  assert.equal(md.escapeHTML(null), "null");
});

/* ------------------------------------------------------------------ *
 * slugify
 * ------------------------------------------------------------------ */

test("slugify lowercases and hyphenates", () => {
  assert.equal(md.slugify("Loomings"), "loomings");
  assert.equal(md.slugify("A Chapter of Contrasts"), "a-chapter-of-contrasts");
});

test("slugify drops leading and trailing separators", () => {
  assert.equal(md.slugify("  ...Loomings...  "), "loomings");
});

test("slugify falls back to section when nothing survives", () => {
  assert.equal(md.slugify("!!!"), "section");
  assert.equal(md.slugify(""), "section");
});

test("slugify truncates at 64 characters", () => {
  assert.equal(md.slugify("a".repeat(200)).length, 64);
});

/* ------------------------------------------------------------------ *
 * parse: blocks
 * ------------------------------------------------------------------ */

test("parse wraps prose in a paragraph", () => {
  assert.equal(md.parse("Call me Ishmael."), "<p>Call me Ishmael.</p>");
});

test("parse joins wrapped lines into one paragraph", () => {
  assert.equal(md.parse("one\ntwo\n\nnext"), "<p>one two</p>\n<p>next</p>");
});

test("parse emits headings with slugs at every level", () => {
  assert.equal(md.parse("# One"), '<h1 id="one">One</h1>');
  assert.equal(md.parse("## Two"), '<h2 id="two">Two</h2>');
  assert.equal(md.parse("### Three"), '<h3 id="three">Three</h3>');
  assert.equal(md.parse("#### Four"), '<h4 id="four">Four</h4>');
});

test("parse keeps duplicate headings distinct", () => {
  const out = md.parse("# Same\n\n# Same");
  assert.match(out, /id="same"/);
  assert.match(out, /id="same-2"/);
});

test("parse emits a horizontal rule", () => {
  assert.equal(md.parse("---"), "<hr>");
  assert.equal(md.parse("***"), "<hr>");
});

test("parse emits unordered and ordered lists", () => {
  assert.equal(md.parse("- a\n- b"), "<ul>\n<li>a</li>\n<li>b</li>\n</ul>");
  assert.equal(md.parse("1. a\n2. b"), "<ol>\n<li>a</li>\n<li>b</li>\n</ol>");
});

test("parse merges consecutive items of the same list type", () => {
  assert.equal(md.parse("- a\n- b\n- c").match(/<ul>/g).length, 1);
});

test("parse closes a list when the type changes", () => {
  const out = md.parse("- a\n1. b");
  assert.match(out, /<\/ul>\n<ol>/);
});

test("parse emits a blockquote", () => {
  assert.equal(md.parse("> quoted"), "<blockquote><p>quoted</p></blockquote>");
});

test("parse keeps fenced code verbatim and escaped", () => {
  assert.equal(md.parse("```\n<b> & raw\n```"), "<pre><code>&lt;b&gt; &amp; raw</code></pre>");
});

test("parse closes an unterminated code fence rather than dropping it", () => {
  assert.equal(md.parse("```\nlonely"), "<pre><code>lonely</code></pre>");
});

test("parse normalises CRLF and a leading byte order mark", () => {
  assert.equal(md.parse("\uFEFF# One"), '<h1 id="one">One</h1>');
  assert.equal(md.parse("a\r\nb"), "<p>a b</p>");
});

/* ------------------------------------------------------------------ *
 * parse: inline
 * ------------------------------------------------------------------ */

/* Both of these were broken and both are covered here on purpose. Emphasis
   used to search for a two character closing slice, so *a* never terminated
   and every italic rendered as literal asterisks. */
test("parse handles emphasis and strong", () => {
  assert.equal(md.parse("*a*"), "<p><em>a</em></p>");
  assert.equal(md.parse("_a_"), "<p><em>a</em></p>");
  assert.equal(md.parse("**a**"), "<p><strong>a</strong></p>");
  assert.equal(md.parse("__a__"), "<p><strong>a</strong></p>");
});

test("emphasis works inside a sentence, not just alone", () => {
  assert.equal(md.parse("a *b* c"), "<p>a <em>b</em> c</p>");
  assert.equal(md.parse("a **b** c"), "<p>a <strong>b</strong> c</p>");
  assert.equal(md.parse("a _b_ c"), "<p>a <em>b</em> c</p>");
});

test("emphasis inside a list item and a heading", () => {
  assert.equal(md.parse("- *a*"), "<ul>\n<li><em>a</em></li>\n</ul>");
  assert.equal(md.parse("# *a*"), '<h1 id="a"><em>a</em></h1>');
});

test("parse handles inline code and leaves its contents alone", () => {
  assert.equal(md.parse("`<b>&</b>`"), "<p><code>&lt;b&gt;&amp;&lt;/b&gt;</code></p>");
});

test("a soft line break inside a paragraph becomes a space", () => {
  // Markdown's soft wrap. parse() joins wrapped lines with a space before it
  // ever calls inline(), so the <br> branch in inline() is not reachable from
  // a paragraph. This asserts the behaviour a reader actually gets.
  assert.equal(md.parse("a\nb"), "<p>a b</p>");
});

test("parse renders a link and marks external ones", () => {
  const out = md.parse("[text](https://example.com)");
  assert.match(out, /<a href="https:\/\/example\.com" target="_blank" rel="noopener noreferrer">text<\/a>/);
});

test("parse leaves an internal link without target", () => {
  assert.equal(
    md.parse("[notes](#notes)"),
    '<p><a href="#notes">notes</a></p>'
  );
});

test("parse renders an image with lazy loading", () => {
  assert.match(
    md.parse("![alt text](https://example.com/cover.png)"),
    /<img src="https:\/\/example\.com\/cover\.png" alt="alt text" loading="lazy" decoding="async">/
  );
});

test("an image with a rejected source keeps its alt text", () => {
  // Relative paths are refused by safeURL, the same rule that applies to
  // links. The alt text survives so the sentence does not disappear.
  assert.equal(md.parse("![alt text](cover.png)"), "<p>alt text</p>");
});

test("SAFE_SCHEME decides which sources survive", () => {
  // /^(https?:|mailto:|#|\.|\/)/i. A bare relative name is refused because
  // it only resolves on the machine that wrote the book. A rooted path is
  // same origin, so it is allowed, and so is an in document anchor.
  assert.equal(md.parse("[t](x.png)"), "<p>t</p>");
  assert.equal(md.parse("[t](/local/page)"), '<p><a href="/local/page">t</a></p>');
  assert.equal(md.parse("[t](#notes)"), '<p><a href="#notes">t</a></p>');
  assert.equal(md.parse("[t](mailto:a@example.com)"),
    '<p><a href="mailto:a@example.com">t</a></p>');
  assert.equal(md.parse("[t](vbscript:x)"), "<p>t</p>");
});

test("parse drops an unsafe link but keeps its label", () => {
  // The closing paren of alert(1) is left as prose. Cosmetic, not a leak:
  // no href is emitted at all.
  assert.equal(md.parse("[click](javascript:alert(1))"), "<p>click)</p>");
});

test("a scheme broken by a tab is not a link at all", () => {
  // The URL pattern refuses whitespace, so a tab inside the scheme means no
  // link is formed and the text stays literal.
  assert.equal(md.parse("[x](java\tscript:alert(1))"), "<p>[x](java\tscript:alert(1))</p>");
});

test("whitespace inside a URL means no link is formed", () => {
  // The URL pattern refuses whitespace outright, so leading spaces stop the
  // match before a link exists. The text stays literal, which is the safest
  // outcome and needs no sanitiser to catch it.
  assert.equal(md.parse("[x](  JaVaScRiPt:alert(1))"), "<p>[x](  JaVaScRiPt:alert(1))</p>");
});

test("parse refuses data and vbscript URLs", () => {
  assert.equal(md.parse("[x](data:text/html,<script>)"), "<p>x</p>");
  assert.equal(md.parse("[x](vbscript:msgbox)"), "<p>x</p>");
});

test("parse escapes a backslash escape instead of treating it as markup", () => {
  assert.equal(md.parse("\\*not em\\*"), "<p>*not em*</p>");
});

test("parse escapes raw HTML rather than emitting it", () => {
  assert.equal(md.parse("<script>alert(1)</script>"),
    "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
  assert.equal(md.parse('<img src=x onerror="alert(1)">'),
    "<p>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</p>");
});

/* The two fallbacks that close out the bulk fast path. A special character
   that starts no construct has to be escaped and stepped over, or the inline
   loop never advances. Neither case appears in the four excerpts, so this is
   the only coverage these branches get. */
test("a lone asterisk is escaped, not swallowed or looped on", () => {
  assert.equal(md.parse("*"), "<p>*</p>");
  assert.equal(md.parse("a * b"), "<p>a * b</p>");
});

test("a lone bang is escaped, not swallowed or looped on", () => {
  assert.equal(md.parse("!"), "<p>!</p>");
  assert.equal(md.parse("! not an image"), "<p>! not an image</p>");
});

test("an unclosed emphasis marker degrades to text", () => {
  assert.equal(md.parse("*never closed"), "<p>*never closed</p>");
});

test("an unclosed code span degrades to text", () => {
  assert.equal(md.parse("`never closed"), "<p>`never closed</p>");
});

test("an unclosed link degrades to text", () => {
  assert.equal(md.parse("[never]("), "<p>[never](</p>");
});

/* ------------------------------------------------------------------ *
 * The fast path has to agree with the naive one.
 * ------------------------------------------------------------------ */

test("ordinary prose passes through the bulk path byte for byte", () => {
  const prose = "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.";
  assert.equal(md.parse(prose), `<p>${prose}</p>`);
});

test("text between two special characters is escaped once, correctly", () => {
  // The ampersand sits between two characters the regex treats as special,
  // which is exactly the case a run-based rewrite could get wrong.
  assert.equal(md.parse("a & b"), "<p>a &amp; b</p>");
  assert.equal(md.parse("<b> & </b>"), "<p>&lt;b&gt; &amp; &lt;/b&gt;</p>");
});
