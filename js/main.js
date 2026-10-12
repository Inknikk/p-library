/* main.js - boot the shelf, present the one book that is ready, keep the
 * locked titles honest, run the command palette, and hand the reader the
 * pieces it needs. Nothing here parses Markdown or stores state; it only
 * wires the two views together.
 */
(function (global) {
  "use strict";

  var Inkwell = global.Inkwell;
  var BOOKS = global.INKWELL_LIBRARY;
  var reader = null;
  var dom = {};
  var paletteItems = [];
  var paletteIndex = 0;
  var paletteReturn = null;

  function collect() {
    [
      "shelfGrid", "shelfList", "tocWrap", "tocList", "toolsWrap", "drawer", "drawerClose", "scrim",
      "menuBtn", "readerMenu", "reader",
      "readerBar", "readerTitle", "readerAuthor", "dock", "findBar", "findInput",
      "findCount", "findPrev", "findNext", "findClose", "prefsPanel", "prefsClose", "bgChips",
      "fontSeg", "sizeSeg", "leadSeg", "measureSeg", "notesPanel", "noteList",
      "noteExport", "noteClear", "speechPanel", "speechPlay", "speechStop",
      "speechBack", "speechFwd", "speechRate", "speechTime", "speechTrack",
      "closeBtn", "fsBtn", "modeBtn", "typeBtn", "notesBtn", "findBtn", "ttsBtn",
      "topBtn", "chapterPrevBtn", "chapterNextBtn", "copyBtn", "readerScroll", "readerPage", "readerHeading", "progress", "progressPct", "sectionNow",
      "toastDock", "aboutDialog", "aboutOpen", "aboutClose", "storageWarn", "countLabel",
      "appbar", "main",
      "heroCover", "heroGlyph", "heroCoverAuthor", "heroTitle", "heroByline",
      "heroLede", "heroMeta", "heroProgress", "heroBar", "heroPct", "heroRead", "heroToc",
      "paletteOpen", "palette", "paletteInput", "paletteList", "paletteEmpty"
    ].forEach(function (id) { dom[id] = document.getElementById(id); });

    /* Two names the reader uses for elements whose ids spell out the role.
       Aliased here so the script never has to know the markup ids. */
    dom.scroll = dom.readerScroll;
    dom.page = dom.readerPage;
  }

  function esc(s) { return Inkwell.markdown.escapeHTML(s); }

  function bookProgress(slug) { return Inkwell.bookState(slug); }

  function featured() {
    for (var i = 0; i < BOOKS.length; i += 1) {
      if (BOOKS[i].status === "available") return BOOKS[i];
    }
    return BOOKS[0] || null;
  }

  function lockedBooks() {
    return BOOKS.filter(function (b) { return b.status !== "available"; });
  }

  function toast(message, tone) {
    if (!dom.toastDock) return;
    var node = document.createElement("div");
    node.className = "toast";
    node.setAttribute("data-tone", tone || "info");
    node.textContent = message;
    dom.toastDock.appendChild(node);
    requestAnimationFrame(function () { node.setAttribute("data-show", "true"); });
    setTimeout(function () {
      node.setAttribute("data-show", "false");
      setTimeout(function () { node.remove(); }, 300);
    }, 2400);
  }

  /* ---------------- the featured book ---------------- */

  function heroMetaItems(b) {
    var parts = [];
    if (b.sections) parts.push(b.sections + " sections");
    if (b.chapters) parts.push(b.chapters + " chapters");
    parts.push(b.words.toLocaleString() + " words");
    var mins = Math.round(b.words / 200);
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    parts.push("about " + (h ? h + "h" + (m ? " " + m + "m" : "") : m + "m") + " to read");
    return parts;
  }

  function renderHero() {
    var b = featured();
    if (!b) return;
    var pct = Math.round((bookProgress(b.slug).percent || 0) * 100);
    dom.heroCover.setAttribute("data-tone", b.tone);
    dom.heroGlyph.textContent = b.glyph || "";
    dom.heroCoverAuthor.textContent = b.author;
    dom.heroTitle.textContent = b.title;
    dom.heroByline.innerHTML = "<span>" + esc(b.author) + "</span> <span>" + b.year + "</span>";
    dom.heroLede.textContent = b.blurb;
    dom.heroMeta.innerHTML = heroMetaItems(b).map(function (t) {
      return "<li>" + esc(t) + "</li>";
    }).join("");
    if (pct > 0) {
      dom.heroProgress.hidden = false;
      dom.heroBar.style.width = pct + "%";
      dom.heroPct.textContent = pct + "% read";
      dom.heroRead.textContent = "Continue reading";
    } else {
      dom.heroProgress.hidden = true;
      dom.heroRead.textContent = "Start reading";
    }
  }

  /* ---------------- the locked rail ---------------- */

  function lockedCard(b) {
    return '<button type="button" class="card" data-slug="' + b.slug + '" data-locked="true" ' +
      'aria-label="' + esc(b.title) + " by " + esc(b.author) + ', coming soon">' +
      '<span class="cover" data-tone="' + b.tone + '" data-locked="true" aria-hidden="true">' +
        '<span class="cover-lock" aria-hidden="true"><svg class="ico"><use href="#i-lock"></use></svg></span>' +
        '<span class="cover-title">' + esc(b.title) + "</span>" +
        '<span class="cover-author">' + esc(b.author) + "</span>" +
      "</span>" +
      '<span class="card-body" aria-hidden="true">' +
        '<span class="card-title">' + esc(b.title) + "</span>" +
        '<span class="card-author">' + esc(b.author) + "</span>" +
      "</span>" +
      '<span class="card-foot" aria-hidden="true"><span>Coming soon</span></span>' +
    "</button>";
  }

  function renderRail() {
    dom.shelfGrid.innerHTML = lockedBooks().map(lockedCard).join("");
  }

  /* ---------------- the drawer shelf ---------------- */

  function renderDrawerList() {
    dom.shelfList.innerHTML = BOOKS.map(function (b) {
      var pct = Math.round((bookProgress(b.slug).percent || 0) * 100);
      var locked = b.status !== "available";
      var right = locked
        ? '<span class="shelf-pct"><svg class="ico" aria-hidden="true"><use href="#i-lock"></use></svg></span>'
        : '<span class="shelf-pct">' + (pct ? pct + "%" : "—") + "</span>";
      return '<button type="button" class="shelf-row" data-slug="' + b.slug + '"' +
        (locked ? ' data-locked="true"' : "") + ">" +
        '<span class="shelf-thumb" data-tone="' + b.tone + '"></span>' +
        '<span><span class="shelf-name">' + esc(b.title) + "</span>" +
        '<span class="shelf-meta">' + esc(b.author) + (locked ? ", coming soon" : "") + "</span></span>" +
        right +
      "</button>";
    }).join("");
  }

  function renderAll() {
    renderHero();
    renderRail();
    renderDrawerList();
    dom.countLabel.textContent = lockedBooks().length === BOOKS.length - 1
      ? "1 of " + BOOKS.length + " ready"
      : BOOKS.length + " titles";
  }

  function markCurrent(slug) {
    dom.shelfList.querySelectorAll(".shelf-row").forEach(function (row) {
      row.setAttribute("aria-current", row.getAttribute("data-slug") === slug ? "true" : "false");
    });
  }

  /* ---------------- command palette ----------------
   * Shelf scoped: the reader keeps Ctrl K for find in a book. On the home
   * view Ctrl K opens this, which lists the one book that opens, the
   * contents jump, the four titles still coming, and the About panel. */

  function buildPalette() {
    var items = [];
    var b = featured();
    if (b) {
      var pct = Math.round((bookProgress(b.slug).percent || 0) * 100);
      items.push({
        label: (pct > 0 ? "Continue " : "Start ") + b.title,
        hint: pct > 0 ? pct + "% read" : "Open the book",
        icon: "i-play",
        run: function () { reader.open(b.slug); }
      });
      items.push({
        label: "Contents for " + b.title,
        hint: "Jump to a chapter",
        icon: "i-shelf",
        run: function () { reader.open(b.slug, { toc: true }); }
      });
    }
    lockedBooks().forEach(function (lb) {
      items.push({
        label: lb.title,
        hint: lb.author + ", coming soon",
        icon: "i-lock",
        locked: true,
        run: function () { toast(lb.title + " is still being prepared.", "info"); }
      });
    });
    items.push({
      label: "About and keyboard shortcuts",
      hint: "What this is, and every key",
      icon: "i-info",
      run: function () { dom.aboutDialog.showModal(); }
    });
    return items;
  }

  function paintPalette() {
    var opts = dom.paletteList.querySelectorAll(".palette-item");
    opts.forEach(function (li, i) {
      li.setAttribute("aria-selected", i === paletteIndex ? "true" : "false");
    });
    var sel = opts[paletteIndex];
    if (sel) {
      dom.paletteInput.setAttribute("aria-activedescendant", sel.id);
      if (sel.scrollIntoView) sel.scrollIntoView({ block: "nearest" });
    } else {
      dom.paletteInput.setAttribute("aria-activedescendant", "");
    }
  }

  function renderPalette(query) {
    var q = (query || "").trim().toLowerCase();
    paletteItems = buildPalette().filter(function (it) {
      if (!q) return true;
      return it.label.toLowerCase().indexOf(q) > -1 || it.hint.toLowerCase().indexOf(q) > -1;
    });
    paletteIndex = 0;
    dom.paletteList.innerHTML = paletteItems.map(function (it, i) {
      return '<li class="palette-item' + (it.locked ? " is-locked" : "") + '" role="option" ' +
        'id="palette-opt-' + i + '" data-index="' + i + '" aria-selected="false">' +
        '<svg class="ico" aria-hidden="true"><use href="#' + it.icon + '"></use></svg>' +
        '<span class="palette-item-label">' + esc(it.label) + "</span>" +
        '<span class="palette-item-hint">' + esc(it.hint) + "</span>" +
      "</li>";
    }).join("");
    dom.paletteEmpty.hidden = paletteItems.length > 0;
    paintPalette();
  }

  function movePalette(delta) {
    if (!paletteItems.length) return;
    paletteIndex = (paletteIndex + delta + paletteItems.length) % paletteItems.length;
    paintPalette();
  }

  function openPalette() {
    if (dom.palette.open) return;
    paletteReturn = document.activeElement;
    renderPalette("");
    dom.paletteInput.value = "";
    if (typeof dom.palette.showModal === "function") dom.palette.showModal();
    else dom.palette.setAttribute("open", "");
    dom.paletteInput.focus();
  }

  function closePalette() {
    if (typeof dom.palette.close === "function") {
      if (dom.palette.open) dom.palette.close();
    } else {
      dom.palette.removeAttribute("open");
    }
  }

  function runPalette(i) {
    var it = paletteItems[i];
    if (!it) return;
    closePalette();
    it.run();
  }

  /* ---------------- routing ---------------- */

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

    renderAll();
    if (!Inkwell.storageAvailable()) dom.storageWarn.hidden = false;

    dom.heroRead.addEventListener("click", function () {
      var b = featured();
      if (b) reader.open(b.slug);
    });
    dom.heroToc.addEventListener("click", function () {
      var b = featured();
      if (b) reader.open(b.slug, { toc: true });
    });

    dom.shelfGrid.addEventListener("click", function (e) {
      var card = e.target.closest(".card");
      if (!card) return;
      if (card.getAttribute("data-locked") === "true") {
        toast("This title is still being prepared.", "info");
        return;
      }
      reader.open(card.getAttribute("data-slug"));
    });
    dom.shelfList.addEventListener("click", function (e) {
      var row = e.target.closest(".shelf-row");
      if (!row) return;
      if (row.getAttribute("data-locked") === "true") {
        toast("This title is still being prepared.", "info");
        return;
      }
      reader.open(row.getAttribute("data-slug"));
      reader.setDrawer(false);
    });

    global.INKWELL_onClose = function () { renderAll(); };
    global.INKWELL_onProgress = function () { renderAll(); };

    dom.paletteOpen.addEventListener("click", openPalette);
    dom.paletteInput.addEventListener("input", function () {
      renderPalette(dom.paletteInput.value);
    });
    dom.paletteInput.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); movePalette(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); movePalette(-1); }
      else if (e.key === "Enter") { e.preventDefault(); runPalette(paletteIndex); }
    });
    dom.paletteList.addEventListener("click", function (e) {
      var li = e.target.closest(".palette-item");
      if (li) runPalette(Number(li.getAttribute("data-index")));
    });
    dom.palette.addEventListener("close", function () {
      if (paletteReturn && paletteReturn.focus) paletteReturn.focus();
      paletteReturn = null;
    });
    dom.palette.addEventListener("click", function (e) {
      if (e.target === dom.palette) closePalette();
    });

    /* Ctrl or Cmd K opens the palette on the shelf. The reader listens for
       the same chord itself and keeps it for find in a book, so this only
       acts when no book is open. */
    document.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (dom.reader && !dom.reader.hidden) return;
        e.preventDefault();
        openPalette();
      }
    });

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
