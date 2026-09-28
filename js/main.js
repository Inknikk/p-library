/* main.js - boot the shelf, keep the URL honest, and hand the reader the
 * pieces it needs. Nothing here knows how to parse Markdown or store
 * state; it only wires the two pages together.
 */
(function (global) {
  "use strict";

  var Inkwell = global.Inkwell;
  var BOOKS = global.INKWELL_LIBRARY;
  var reader = null;
  var dom = {};

  function toast(message) {
    var dock = dom.toastDock;
    if (!dock) return;
    var node = document.createElement("div");
    node.className = "toast";
    node.textContent = message;
    node.style.cssText = "position:fixed;left:50%;bottom:2rem;transform:translateX(-50%);background:#1a1a22;border:1px solid #2a2a32;padding:.75rem 1.25rem;border-radius:999px;font-size:.875rem;color:#e8e6f0;z-index:50;box-shadow:0 8px 30px rgba(0,0,0,.4);";
    dock.appendChild(node);
    setTimeout(function () { node.style.opacity = "0"; node.style.transition = "opacity .3s"; setTimeout(function () { node.remove(); }, 300); }, 2000);
  }

  function collect() {
    [
      "shelfGrid", "resumeCard", "resumeTitle", "resumeMeta", "resumePct", "resumeBar",
      "resumeCover", "resumeCoverTitle", "resumeCoverAuthor",
      "shelfList", "tocWrap", "tocList", "toolsWrap", "drawer", "drawerClose", "scrim",
      "menuBtn", "readerMenu", "reader",
      "readerBar", "readerTitle", "readerAuthor", "dock", "findBar", "findInput",
      "findCount", "findPrev", "findNext", "findClose", "prefsPanel", "prefsClose", "bgChips",
      "fontSeg", "sizeSeg", "leadSeg", "measureSeg", "notesPanel", "noteList",
      "noteExport", "noteClear", "speechPanel", "speechPlay", "speechStop",
      "speechBack", "speechFwd", "speechRate", "speechTime", "speechTrack",
      "closeBtn", "fsBtn", "modeBtn", "typeBtn", "notesBtn", "findBtn", "ttsBtn",
      "topBtn", "copyBtn", "readerScroll", "readerPage", "progress", "progressPct", "sectionNow",
      "toastDock", "aboutDialog", "aboutOpen", "aboutClose", "storageWarn", "countLabel",
      "appbar", "main"
    ].forEach(function (id) { dom[id] = document.getElementById(id); });

    /* Two names the reader uses for elements whose ids spell out the role.
       Aliased here so the script never has to know the markup ids. */
    dom.scroll = dom.readerScroll;
    dom.page = dom.readerPage;
  }

  function bookProgress(slug) {
    return Inkwell.bookState(slug);
  }

  function mostRecent() {
    var best = null;
    BOOKS.forEach(function (b) {
      var s = bookProgress(b.slug);
      if (s.opened && (!best || s.opened > best.state.opened)) best = { book: b, state: s };
    });
    if (!best) {
      // No reading history yet - return first book as default
      return { book: BOOKS[0], state: { percent: 0, opened: 0 } };
    }
    if (best.state.percent > 0.98) best.state.percent = 0;
    return best;
  }

  function coverMarkup(book, extra) {
    /* A span, not a div: the card is a button, and a button may only hold
       phrasing content. */
    return '<span class="cover" data-tone="' + book.tone + '"' + (extra || "") + ">" +
      '<span class="cover-title">' + Inkwell.markdown.escapeHTML(book.title) + "</span>" +
      '<span class="cover-author">' + Inkwell.markdown.escapeHTML(book.author) + "</span>" +
      "</span>";
  }

  function renderShelf() {
    dom.shelfGrid.innerHTML = BOOKS.map(function (b) {
      var s = bookProgress(b.slug);
      var pct = Math.round((s.percent || 0) * 100);
      var foot = s.opened && pct > 0
        ? '<span class="card-pct">' + pct + "%</span><span>in progress</span>"
        : '<span>' + b.words.toLocaleString() + " words</span>";
      return '<button type="button" class="card" data-slug="' + b.slug + '">' +
        coverMarkup(b) +
        '<span class="card-body">' +
        '<span class="card-title">' + Inkwell.markdown.escapeHTML(b.title) + "</span>" +
        '<span class="card-author">' + Inkwell.markdown.escapeHTML(b.author) + "</span>" +
        "</span>" +
        '<span class="card-foot">' + foot + "</span>" +
        "</button>";
    }).join("");

    var recent = mostRecent();
    var r = recent.state;
    var pct2 = Math.round((r.percent || 0) * 100);
    dom.resumeCard.hidden = false;
    dom.resumeTitle.textContent = recent.book.title;
    var rCover = dom.resumeCover || null;
    if (rCover) {
      rCover.setAttribute("data-tone", recent.book.tone || "ink");
      var rt = dom.resumeCoverTitle, ra = dom.resumeCoverAuthor;
      if (rt) rt.textContent = recent.book.title;
      if (ra) ra.textContent = recent.book.author;
    }
    dom.resumeMeta.innerHTML = '<span>' + Inkwell.markdown.escapeHTML(recent.book.author) + "</span>" +
      "<span>" + pct2 + "% read</span>";
    dom.resumePct.textContent = pct2 + "%";
    if (dom.resumeBar.firstElementChild) {
      dom.resumeBar.firstElementChild.style.width = pct2 + "%";
    }

    dom.countLabel.textContent = BOOKS.length + (BOOKS.length === 1 ? " title" : " titles");

    dom.shelfList.innerHTML = BOOKS.map(function (b) {
      var s = bookProgress(b.slug);
      var pct = Math.round((s.percent || 0) * 100);
      return '<button type="button" class="shelf-row" data-slug="' + b.slug + '">' +
        '<span class="shelf-thumb" data-tone="' + b.tone + '"></span>' +
        '<span><span class="shelf-name">' + Inkwell.markdown.escapeHTML(b.title) + "</span>" +
        '<span class="shelf-meta">' + Inkwell.markdown.escapeHTML(b.author) + "</span></span>" +
        '<span class="shelf-pct">' + (pct ? pct + "%" : "—") + "</span>" +
        "</button>";
    }).join("");
  }

  function markCurrent(slug) {
    dom.shelfList.querySelectorAll(".shelf-row").forEach(function (row) {
      row.setAttribute("aria-current", row.getAttribute("data-slug") === slug ? "true" : "false");
    });
  }

  function route() {
    var m = /^#\/book\/(.+)$/.exec(global.location.hash || "");
    if (m) {
      reader.open(decodeURIComponent(m[1]));
      markCurrent(m[1]);
    } else if (dom.reader && !dom.reader.hidden) {
      reader.close();
    }
  }

  function start() {
    collect();
    reader = Inkwell.Reader.create(dom);
    reader.bind();

    renderShelf();
    if (!Inkwell.storageAvailable()) dom.storageWarn.hidden = false;

    dom.shelfGrid.addEventListener("click", function (e) {
      var card = e.target.closest(".card");
      if (card) { toast("Opening: " + card.getAttribute("data-slug")); reader.open(card.getAttribute("data-slug")); }
    });
    dom.shelfGrid.addEventListener("touchend", function (e) {
      var card = e.target.closest(".card");
      if (card) { e.preventDefault(); toast("Touch: " + card.getAttribute("data-slug")); reader.open(card.getAttribute("data-slug")); }
    }, { passive: false });
    dom.shelfList.addEventListener("click", function (e) {
      var row = e.target.closest(".shelf-row");
      if (!row) return;
      toast("Drawer: " + row.getAttribute("data-slug"));
      reader.open(row.getAttribute("data-slug"));
      dom.drawer.setAttribute("data-open", "false");
      dom.scrim.setAttribute("data-open", "false");
    });
    dom.shelfList.addEventListener("touchend", function (e) {
      var row = e.target.closest(".shelf-row");
      if (!row) return;
      e.preventDefault();
      toast("Drawer touch: " + row.getAttribute("data-slug"));
      reader.open(row.getAttribute("data-slug"));
      dom.drawer.setAttribute("data-open", "false");
      dom.scrim.setAttribute("data-open", "false");
    }, { passive: false });
    dom.resumeCard.addEventListener("click", function () {
      var recent = mostRecent();
      if (recent && recent.book) { toast("Resume click: " + recent.book.slug); reader.open(recent.book.slug); }
    });
    dom.resumeCard.addEventListener("touchend", function (e) {
      e.preventDefault();
      var recent = mostRecent();
      if (recent && recent.book) { toast("Resume touch: " + recent.book.slug); reader.open(recent.book.slug); }
    }, { passive: false });

    global.INKWELL_onClose = function () { renderShelf(); };
    global.INKWELL_onProgress = function () { renderShelf(); };

    dom.aboutOpen.addEventListener("click", function () { dom.aboutDialog.showModal(); });
    dom.aboutClose.addEventListener("click", function () { dom.aboutDialog.close(); });
    dom.aboutDialog.addEventListener("click", function (e) {
      if (e.target === dom.aboutDialog) dom.aboutDialog.close();
    });

    global.addEventListener("hashchange", route);
    if (global.location.hash) route();
  }

  /* The script tag is the last thing in <body>, so every element start()
     needs is already parsed and it can run in this same frame. Waiting for
     DOMContentLoaded instead meant the shelf painted empty first and the
     footer jumped once the cards arrived: 0.41 CLS on a phone. The readyState
     guard only matters if someone moves this file into <head>. */
  if (document.readyState === "loading" && !document.getElementById("shelfGrid")) {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})(window);
