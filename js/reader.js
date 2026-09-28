/* reader.js - the reader controller.
 *
 * Owns the whole reading surface: load, render, table of contents, find,
 * highlights, notes, backgrounds, type controls, focus mode, fullscreen,
 * speech, keyboard, and per book progress.
 *
 * It talks to three other modules and nothing else:
 *   library.js  what books exist
 *   store.js    preferences and reading state
 *   markdown.js parse and sanitize
 */
(function (global) {
  "use strict";

  var Inkwell = global.Inkwell;
  var WORDS_PER_MIN = 165;

  function el(id) { return document.getElementById(id); }

  function fmtTime(ms) {
    var total = Math.max(0, Math.round(ms / 1000));
    var m = Math.floor(total / 60);
    var s = total % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function fmtWhen(stamp) {
    if (!stamp) return "";
    var d = new Date(stamp);
    var days = Math.floor((Date.now() - stamp) / 86400000);
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return days + " days ago";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  /* Load order:
       1. an already loaded inlined bundle (file:// after one injection)
       2. fetch, the normal path over http
       3. XHR, for servers that answer fetch oddly
       4. inject js/books-inline.js, which is the only way a book can be
          read from a file:// path, because the browser blocks both
          fetch and XHR there
     A failure at every step becomes one honest message, not a blank page. */
  var inlineTried = false;

  function loadInlineBundle() {
    return new Promise(function (resolve, reject) {
      var tag = document.createElement("script");
      tag.src = "js/books-inline.js";
      tag.onload = resolve;
      tag.onerror = function () { reject(new Inkwell.AppError("books-inline.js missing", "NO_INLINE")); };
      document.head.appendChild(tag);
    });
  }

  function xhrText(url) {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      x.open("GET", url, true);
      x.onload = function () {
        if (x.status === 200 || x.status === 0) resolve(x.responseText);
        else reject(new Inkwell.AppError("HTTP " + x.status, "LOAD_FAILED"));
      };
      x.onerror = function () { reject(new Inkwell.AppError("network", "LOAD_FAILED")); };
      x.send();
    });
  }

  function inline(slug) {
    return global.INKWELL_RAW && global.INKWELL_RAW[slug] ? global.INKWELL_RAW[slug] : null;
  }

  function loadText(url) {
    var slug = url.replace(/^books\//, "").replace(/\.md$/, "");
    var onDisk = global.location.protocol === "file:";

    if (onDisk) {
      /* From a file:// path the browser refuses both fetch and XHR, and a
         blocked request logs a console error that looks like a real fault.
         So the bundle is the only source, and we go straight to it instead
         of provoking a failure we already know the answer to. */
      var have = inline(slug);
      if (have) return Promise.resolve(have);
      if (inlineTried) {
        return Promise.reject(new Inkwell.AppError("not in the inline bundle", "NOT_INLINE"));
      }
      inlineTried = true;
      return loadInlineBundle().then(function () {
        var text = inline(slug);
        if (text) return text;
        throw new Inkwell.AppError("not in the inline bundle", "NOT_INLINE");
      });
    }

    var have2 = inline(slug);
    if (have2) return Promise.resolve(have2);
    return fetch(url, { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Inkwell.AppError("HTTP " + r.status, "LOAD_FAILED");
        return r.text();
      })
      .catch(function () {
        /* HTTP failed, so the host is fine but this one book is not there.
           The inline bundle is the offline copy of the same text, so it is
           a better answer than a CORS error from an XHR fallback. */
        if (!inlineTried) {
          inlineTried = true;
          return loadInlineBundle()
            .then(function () {
              var text = inline(slug);
              if (text) return text;
              throw new Inkwell.AppError("HTTP failure", "LOAD_FAILED");
            })
            .catch(function () { return xhrText(url); });
        }
        return xhrText(url);
      });
  }

  function create(dom) {
    var api = {};
    var book = null;
    var prefs = Inkwell.prefs();
    var scroll = null;
    var progress = 0;
    var findHits = [];
    var findIndex = -1;
    var marks = [];
    var notes = [];
    var panel = null;
    var observer = null;
    var speech = null;
    var chromeTimer = null;
    var saveTimer = null;
    var sections = [];
    var activeSection = null;

    /* ---------------- toasts ---------------- */
    function toast(message, tone) {
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

    /* ---------------- panels ---------------- */
    function setPanel(name) {
      panel = name;
      [dom.findBar, dom.prefsPanel, dom.notesPanel, dom.speechPanel].forEach(function (p) {
        p.hidden = true;
      });
      if (!name) { dom.dock.hidden = true; return; }
      dom.dock.hidden = false;
      var target = { find: dom.findBar, prefs: dom.prefsPanel, notes: dom.notesPanel, speech: dom.speechPanel }[name];
      target.hidden = false;
      if (name === "find") { dom.findInput.value = ""; findHits = []; findIndex = -1; dom.findInput.focus(); }
      if (name === "notes") renderNotes();
    }

    function togglePanel(name) { setPanel(panel === name ? null : name); }

    /* ---------------- drawer ---------------- */
    function setDrawer(open) {
      dom.drawer.setAttribute("data-open", open ? "true" : "false");
      dom.scrim.setAttribute("data-open", open ? "true" : "false");
      dom.menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) {
        var focusable = dom.drawer.querySelector("button, a, input");
        if (focusable) focusable.focus();
      }
    }

    /* The drawer shows the shelf until a book is open, then the contents
       plus the tools the narrow toolbar cannot hold. */
    function drawerMode(mode) {
      if (dom.shelfList) dom.shelfList.hidden = mode === "toc";
      if (dom.tocWrap) dom.tocWrap.hidden = mode !== "toc";
      if (dom.toolsWrap) dom.toolsWrap.hidden = mode !== "toc";
    }

    /* ---------------- settings ----------------
     * Every dial is an attribute on the reader element. css/tokens.css owns
     * the actual values, so there is exactly one place a size can change
     * and the script never writes a length. */
    function applyPrefs() {
      prefs = Inkwell.prefs();
      ["reader", "size", "leading", "measure", "font"].forEach(function (k) {
        dom.reader.setAttribute("data-" + k, prefs[k]);
      });
      syncPressed(dom.bgChips, "reader", prefs.reader);
      syncPressed(dom.fontSeg, "font", prefs.font);
      syncPressed(dom.sizeSeg, "size", prefs.size);
      syncPressed(dom.leadSeg, "leading", prefs.leading);
      syncPressed(dom.measureSeg, "measure", prefs.measure);
      dom.speechRate.value = String(prefs.speechRate);
      setRateText(Number(prefs.speechRate) || 1);
    }

    function syncPressed(group, key, value) {
      group.querySelectorAll("[data-value]").forEach(function (btn) {
        btn.setAttribute("aria-pressed", btn.getAttribute("data-value") === value ? "true" : "false");
      });
    }

    function setPref(key, value) {
      Inkwell.setPref(key, value);
      applyPrefs();
    }

    /* ---------------- TOC ---------------- */
    function buildToc() {
      sections = Array.prototype.slice.call(dom.page.querySelectorAll("h2, h3"));
      dom.tocList.innerHTML = "";
      sections.forEach(function (h) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "toc-item";
        btn.textContent = h.textContent;
        btn.addEventListener("click", function () {
          h.scrollIntoView({ behavior: "smooth", block: "start" });
          setDrawer(false);
        });
        dom.tocList.appendChild(btn);
      });
      if (observer) observer.disconnect();
      observer = new IntersectionObserver(onSection, { root: scroll, rootMargin: "-12% 0px -70% 0px" });
      sections.forEach(function (h) { observer.observe(h); });
    }

    function onSection(entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) setActiveSection(e.target.id);
      });
    }

    function setActiveSection(id) {
      if (activeSection === id) return;
      activeSection = id;
      Array.prototype.slice.call(dom.tocList.children).forEach(function (btn, i) {
        btn.setAttribute("aria-current", sections[i] && sections[i].id === id ? "true" : "false");
      });
      dom.sectionNow.textContent = sections.findIndex(function (h) { return h.id === id; }) > -1
        ? sections[sections.findIndex(function (h) { return h.id === id; })].textContent
        : "";
    }

    /* ---------------- find ---------------- */
    function clearFind() {
      findHits.forEach(function (n) {
        var parent = n.parentNode;
        if (!parent) return;
        parent.replaceChild(document.createTextNode(n.textContent), n);
        parent.normalize();
      });
      findHits = [];
      findIndex = -1;
      dom.findCount.textContent = "";
    }

    function find() {
      clearFind();
      var needle = dom.findInput.value.trim().toLowerCase();
      if (needle.length < 2) { dom.findCount.textContent = ""; return; }

      var walker = document.createTreeWalker(dom.page, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          if (!n.nodeValue.toLowerCase().includes(needle)) return NodeFilter.FILTER_REJECT;
          if (n.parentNode.closest("script, style")) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      var nodes = [];
      var n;
      while ((n = walker.nextNode())) nodes.push(n);

      nodes.forEach(function (node) {
        var text = node.nodeValue;
        var lower = text.toLowerCase();
        var at = 0;
        var frag = document.createDocumentFragment();
        var made = 0;
        while (at < lower.length) {
          var hit = lower.indexOf(needle, at);
          if (hit === -1) { frag.appendChild(document.createTextNode(text.slice(at))); break; }
          if (hit > at) frag.appendChild(document.createTextNode(text.slice(at, hit)));
          var mark = document.createElement("span");
          mark.className = "hit";
          mark.textContent = text.slice(hit, hit + needle.length);
          frag.appendChild(mark);
          findHits.push(mark);
          made += 1;
          at = hit + needle.length;
        }
        node.parentNode.replaceChild(frag, node);
      });

      findIndex = findHits.length ? 0 : -1;
      dom.findCount.textContent = findHits.length ? "1 / " + findHits.length : "No results";
      if (findIndex > -1) {
        findHits[0].setAttribute("data-current", "true");
        findHits[0].scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }

    function stepFind(step) {
      if (!findHits.length) return;
      findHits[findIndex].removeAttribute("data-current");
      findIndex = (findIndex + step + findHits.length) % findHits.length;
      findHits[findIndex].setAttribute("data-current", "true");
      dom.findCount.textContent = findIndex + 1 + " / " + findHits.length;
      findHits[findIndex].scrollIntoView({ block: "center", behavior: "smooth" });
    }

    /* ---------------- highlights and notes ---------------- */
    function selectedQuote() {
      var sel = global.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
      var range = sel.getRangeAt(0);
      if (!dom.page.contains(range.commonAncestorContainer)) return null;
      var text = sel.toString().trim();
      if (text.length < 3) return null;
      return { text: text, range: range, rect: range.getBoundingClientRect() };
    }

    function addMark(quote, note) {
      var entry = { id: Date.now() + "-" + marks.length, text: quote, note: note || "", at: Date.now() };
      marks.push(entry);
      if (note) notes.push(entry);
      applyMarks();
      save();
    }

    function applyMarks() {
      marks.forEach(function (m) {
        if (findText(dom.page, m.text)) return;
        wrapFirst(dom.page, m.text, m.id);
      });
    }

    function findText(root, needle) {
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      var n;
      while ((n = walker.nextNode())) if (n.nodeValue.indexOf(needle) > -1) return n;
      return null;
    }

    function wrapFirst(root, needle, id) {
      var node = findText(root, needle);
      if (!node) return false;
      var at = node.nodeValue.indexOf(needle);
      var mark = document.createElement("mark");
      mark.className = "rd-mark";
      mark.setAttribute("data-id", id || "");
      mark.addEventListener("click", function () { setPanel("notes"); });
      var frag = document.createDocumentFragment();
      if (at > 0) frag.appendChild(document.createTextNode(node.nodeValue.slice(0, at)));
      mark.appendChild(document.createTextNode(needle));
      frag.appendChild(mark);
      if (at + needle.length < node.nodeValue.length) {
        frag.appendChild(document.createTextNode(node.nodeValue.slice(at + needle.length)));
      }
      node.parentNode.replaceChild(frag, node);
      return true;
    }

    function renderNotes() {
      dom.noteList.innerHTML = "";
      if (!notes.length) {
        dom.noteList.innerHTML = '<p class="note-empty">No notes yet. Select a passage, then choose Note.</p>';
        return;
      }
      notes.forEach(function (n) {
        var el = document.createElement("article");
        el.className = "note";
        el.innerHTML = '<p class="note-quote"></p><p class="note-text"></p>' +
          '<div class="note-meta"><span class="note-when"></span><span class="note-loc"></span></div>';
        el.querySelector(".note-quote").textContent = "“" + n.text + "”";
        el.querySelector(".note-text").textContent = n.note || "Highlighted, no note.";
        el.querySelector(".note-when").textContent = fmtWhen(n.at);
        dom.noteList.appendChild(el);
      });
    }

    function exportNotes() {
      if (!book) return;
      var lines = ["# Notes: " + book.title, ""];
      notes.forEach(function (n) {
        lines.push("> " + n.text.replace(/\n/g, " "));
        lines.push("");
        if (n.note) lines.push(n.note, "");
      });
      var blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = book.slug + "-notes.md";
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      toast("Notes exported");
    }

    function showSelectionBar(quote) {
      hideSelectionBar();
      var bar = document.createElement("div");
      bar.className = "find";
      bar.id = "selectionBar";
      bar.style.position = "absolute";
      bar.style.zIndex = "var(--z-sticky)";
      bar.innerHTML = '<button type="button" class="btn btn-sm" data-act="mark">Highlight</button>' +
        '<button type="button" class="btn btn-sm" data-act="note">Add note</button>';
      var top = quote.rect.top - dom.reader.getBoundingClientRect().top - 48;
      bar.style.top = Math.max(8, top) + "px";
      bar.style.left = Math.max(8, quote.rect.left - dom.reader.getBoundingClientRect().left - 8) + "px";
      bar.querySelector('[data-act="mark"]').addEventListener("click", function () {
        addMark(quote.text, "");
        global.getSelection().removeAllRanges();
        hideSelectionBar();
        toast("Highlighted");
      });
      bar.querySelector('[data-act="note"]').addEventListener("click", function () {
        var text = window.prompt("Note for this passage", "");
        addMark(quote.text, text || "");
        global.getSelection().removeAllRanges();
        hideSelectionBar();
        setPanel("notes");
        toast("Note saved");
      });
      dom.reader.appendChild(bar);
    }

    function hideSelectionBar() {
      var bar = el("selectionBar");
      if (bar) bar.remove();
    }

    /* ---------------- progress ---------------- */
    function measure() {
      var max = scroll.scrollHeight - scroll.clientHeight;
      progress = max > 8 ? Math.min(1, Math.max(0, scroll.scrollTop / max)) : 1;
      dom.progress.style.setProperty("--rd-progress", String(progress));
      dom.progressPct.textContent = Math.round(progress * 100) + "%";
    }

    /* Progress is written on a trailing debounce, because a scroll fires
       this dozens of times a second. But a debounce alone loses the last
       position if the tab closes mid scroll, so pagehide and visibility
       changes flush it straight away. */
    function flush() {
      if (!book) return;
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      Inkwell.patchState(book.slug, {
        offset: scroll.scrollTop,
        percent: progress,
        marks: marks,
        notes: notes,
        opened: Date.now()
      });
      if (global.INKWELL_onProgress) global.INKWELL_onProgress(book.slug, progress);
    }

    function save() {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(flush, 400);
    }

    function onScroll() {
      measure();
      hideSelectionBar();
      if (scroll.scrollTop > 120) dom.reader.classList.add("reader-chrome-hidden");
      else dom.reader.classList.remove("reader-chrome-hidden");
      if (panel === "find" && findHits.length) {
        var current = findHits[findIndex];
        if (current && !isInView(current)) {
          clearFind();
          find();
        }
      }
      save();
    }

    function isInView(node) {
      var r = node.getBoundingClientRect();
      var s = scroll.getBoundingClientRect();
      return r.top >= s.top + 40 && r.bottom <= s.bottom - 40;
    }

    /* ---------------- fullscreen ---------------- */
    function toggleFullscreen() {
      var target = dom.reader;
      if (document.fullscreenElement || dom.reader.classList.contains("is-fullscreen")) {
        if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
        dom.reader.classList.remove("is-fullscreen");
        dom.fsBtn.setAttribute("aria-pressed", "false");
        return;
      }
      var req = target.requestFullscreen || target.webkitRequestFullscreen;
      if (req) {
        req.call(target).then(function () {
          dom.reader.classList.add("is-fullscreen");
          dom.fsBtn.setAttribute("aria-pressed", "true");
        }).catch(function () {
          dom.reader.classList.add("is-fullscreen");
          dom.fsBtn.setAttribute("aria-pressed", "true");
          toast("Fullscreen needs a click outside the frame");
        });
      } else {
        dom.reader.classList.add("is-fullscreen");
        dom.fsBtn.setAttribute("aria-pressed", "true");
      }
    }

    document.addEventListener("fullscreenchange", function () {
      if (!document.fullscreenElement) {
        dom.reader.classList.remove("is-fullscreen");
        dom.fsBtn.setAttribute("aria-pressed", "false");
      }
    });

    /* ---------------- speech ---------------- */
    function sentences() {
      var paras = Array.prototype.slice.call(dom.page.querySelectorAll("p, h1, h2, h3, li, blockquote"));
      var out = [];
      paras.forEach(function (p) {
        var t = p.textContent.trim();
        if (!t) return;
        t.split(/(?<=[.!?…])\s+/).forEach(function (s) {
          if (s.trim().length > 1) out.push(s.trim());
        });
      });
      return out;
    }

    function startSpeech() {
      if (!("speechSynthesis" in global)) { toast("This browser has no speech engine", "error"); return; }
      var chunks = sentences();
      if (!chunks.length) return;
      speech = { chunks: chunks, index: 0, char: 0, playing: true };
      speakAt(0);
    }

    function speakAt(i) {
      if (!speech) return;
      speech.index = Math.max(0, Math.min(i, speech.chunks.length - 1));
      var u = new SpeechSynthesisUtterance(speech.chunks[speech.index]);
      u.rate = Number(prefs.speechRate) || 1;
      u.onboundary = function (e) {
        if (e.name === "word" && typeof e.charIndex === "number") speech.char = e.charIndex;
        paintSpeech();
      };
      u.onend = function () {
        if (!speech || !speech.playing) return;
        if (speech.index >= speech.chunks.length - 1) { stopSpeech(); toast("Finished reading aloud"); return; }
        speakAt(speech.index + 1);
      };
      u.onerror = function () {
        stopSpeech();
        toast("Speech stopped: no voice available", "error");
      };
      global.speechSynthesis.speak(u);
      paintSpeech();
    }

    function toggleSpeech() {
      if (!speech) { startSpeech(); return; }
      if (global.speechSynthesis.paused) { global.speechSynthesis.resume(); speech.playing = true; paintSpeech(); }
      else { global.speechSynthesis.pause(); speech.playing = false; paintSpeech(); }
    }

    function stopSpeech() {
      if ("speechSynthesis" in global) global.speechSynthesis.cancel();
      speech = null;
      dom.speechPlay.setAttribute("aria-pressed", "false");
      dom.speechTime.textContent = "0:00 / 0:00";
      dom.speechTrack.style.setProperty("--speech", "0");
    }

    /* 15 seconds is a fixed promise, so estimate it: 165 wpm at rate 1. */
    function skip(seconds) {
      if (!speech) return;
      var wps = (WORDS_PER_MIN / 60) * (Number(prefs.speechRate) || 1);
      var targetWords = speech.index * 0 + Math.round(speech.char / 6) + Math.round(wps * seconds);
      var seen = 0;
      for (var i = 0; i < speech.chunks.length; i += 1) {
        seen += speech.chunks[i].split(/\s+/).length;
        if (seen >= targetWords) { speakAt(i); return; }
      }
      speakAt(speech.chunks.length - 1);
    }

    function paintSpeech() {
      if (!speech) return;
      var wps = (WORDS_PER_MIN / 60) * (Number(prefs.speechRate) || 1);
      var done = 0;
      for (var i = 0; i < speech.index; i += 1) done += speech.chunks[i].split(/\s+/).length;
      done += Math.round(speech.char / 6);
      var total = speech.chunks.reduce(function (a, c) { return a + c.split(/\s+/).length; }, 0);
      dom.speechPlay.setAttribute("aria-pressed", speech.playing ? "true" : "false");
      dom.speechTime.textContent = fmtTime((done / wps) * 1000) + " / " + fmtTime((total / wps) * 1000);
      dom.speechTrack.style.setProperty("--speech", String(total ? done / total : 0));
    }

    /* ---------------- keyboard ---------------- */
    function onKey(e) {
      if (dom.reader.hidden) return;
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || "");
      var mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); togglePanel("find"); return; }
      if (mod && e.key.toLowerCase() === "j") { e.preventDefault(); setDrawer(dom.drawer.getAttribute("data-open") !== "true"); return; }
      if (e.key === "Escape") {
        if (panel) { setPanel(null); return; }
        if (dom.drawer.getAttribute("data-open") === "true") { setDrawer(false); return; }
        if (dom.reader.classList.contains("is-fullscreen")) { toggleFullscreen(); return; }
        return;
      }
      if (typing) return;

      if (e.key === "+" || e.key === "=") { cycleSize(1); }
      else if (e.key === "-") { cycleSize(-1); }
      else if (e.key.toLowerCase() === "f") { e.preventDefault(); toggleFullscreen(); }
      else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        var next = dom.reader.getAttribute("data-mode") === "focus" ? "reader" : "focus";
        setMode(next);
        toast(next === "focus" ? "Focus mode" : "Reader mode");
      } else if (e.key.toLowerCase() === "t") { e.preventDefault(); setPanel("speech"); }
      else if (e.key === "PageDown" || e.key === "PageUp") {
        var dir = e.key === "PageDown" ? 1 : -1;
        scroll.scrollBy({ top: dir * scroll.clientHeight * 0.9, behavior: "smooth" });
        e.preventDefault();
      }
    }

    function cycleSize(step) {
      var order = ["s", "m", "l", "xl"];
      var i = order.indexOf(prefs.size);
      setPref("size", order[Math.max(0, Math.min(order.length - 1, i + step))]);
    }

    /* The reader covers the shelf but does not replace it, so without this
       the shelf stays in the tab order and in the accessibility tree
       behind an open book: a screen reader would read four book cards and
       an app bar that cannot be reached, and Tab would walk into them.
       inert takes a subtree out of both without waiting for a layout. */
    function shelfInert(on) {
      if (dom.appbar) dom.appbar.inert = on;
      if (dom.main) dom.main.inert = on;
    }

    /* A bare 0.6 to 1.6 tells a screen reader user nothing about what the
       number does. The name stays "Pace", the value becomes a phrase. */
    function setRateText(rate) {
      var label;
      if (rate < 0.8) label = "slow";
      else if (rate < 0.95) label = "a little slow";
      else if (rate <= 1.05) label = "normal";
      else if (rate <= 1.25) label = "a little fast";
      else label = "fast";
      dom.speechRate.setAttribute("aria-valuetext", label);
    }

    /* ---------------- open and close ---------------- */
    function open(slug) {
      /* Opening a book sets the hash so the view can be linked and reloaded.
         That fires hashchange, route() runs, and it calls open() with the
         same slug. Without this guard every book was parsed and rendered
         twice: 250ms plus 186ms of main thread for one chapter, and the
         first render, including the restored position, was thrown away. */
      if (book && book.slug === slug && !dom.reader.hidden && dom.page.childElementCount) return;

      book = global.INKWELL_findBook(slug);
      if (!book) { toast("No such book: " + slug, "error"); return; }

      var state = Inkwell.bookState(slug);
      marks = state.marks.slice();
      notes = state.notes.slice();

      shelfInert(true);
      dom.reader.hidden = false;
      dom.reader.setAttribute("data-mode", "reader");
      dom.reader.classList.remove("reader-chrome-hidden");
      dom.modeBtn.setAttribute("aria-pressed", "false");
      dom.readerTitle.textContent = book.title;
      dom.readerAuthor.textContent = book.author;
      dom.page.innerHTML = '<div class="skeleton skeleton-title"></div>' +
        '<div class="skeleton skeleton-line" data-w="80"></div>'.repeat(4);
      applyPrefs();
      scroll = dom.scroll;
      scroll.scrollTop = 0;
      setPanel(null);
      setDrawer(false);
      drawerMode("toc");
      document.body.style.overflow = "hidden";
      global.location.hash = "#/book/" + slug;

      loadText(book.src)
        .then(function (text) {
          /* The parse, the sanitise pass and the DOM write are one block and
             nothing else belongs in it: it is the only thing standing between
             a click and readable text. Measured at about 225ms for a 9,363
             word chapter. */
          dom.page.innerHTML = Inkwell.markdown.render(text);

          /* Reading layout is what turned that 225ms into a 420ms task, so
             the restore waits a frame. The browser has already laid the
             chapter out in order to paint it, which makes these reads
             almost free and splits the work across two tasks. */
          requestAnimationFrame(function () {
            applyMarks();
            buildToc();
            /* Only if the reader has not been scrolled by hand in the frame
               it took to get here. It is reset to the top, so any movement
               means the reader got there first. */
            if (scroll.scrollTop < 8) scroll.scrollTop = state.offset || 0;
            measure();
            if (!state.opened) Inkwell.patchState(slug, { opened: Date.now() });
            /* preventScroll matters here: focusing the close button at the top
               of the bar would otherwise drag the reading position back to
               the first line on every reload. */
            dom.closeBtn.focus({ preventScroll: true });
          });
        })
        .catch(function (err) {
          dom.page.innerHTML = "";
          var box = document.createElement("div");
          box.className = "error";
          box.innerHTML = '<h3></h3><p></p>';
          box.querySelector("h3").textContent = "Could not open this book";
          box.querySelector("p").textContent = book.src +
            " failed to load (" + (err.code || err.message || "unknown") +
            "). Over the deployed site this is a network problem; from a file:// " +
            "path it means the browser blocked the request. Serve the folder over " +
            "http (python3 -m http.server) and it will work.";
          dom.page.appendChild(box);
        });
    }

    function close() {
      flush();
      stopSpeech();
      shelfInert(false);
      dom.reader.hidden = true;
      dom.reader.classList.remove("reader-chrome-hidden");
      setPanel(null);
      setDrawer(false);
      drawerMode("shelf");
      document.body.style.overflow = "";
      global.location.hash = "";
      if (global.INKWELL_onClose) global.INKWELL_onClose();
    }

    /* Focus mode takes the chrome out of the flow, which reflows the
       viewport. Reapply the same fraction afterwards so the reader lands on
       the paragraph they left, not a screen further down. */
    function setMode(mode) {
      measure();
      var at = progress;
      if (mode === "focus") setPanel(null);
      dom.reader.setAttribute("data-mode", mode);
      dom.modeBtn.setAttribute("aria-pressed", mode === "focus" ? "true" : "false");
      var max = scroll.scrollHeight - scroll.clientHeight;
      scroll.scrollTop = max > 8 ? at * max : 0;
    }

    /* ---------------- wiring ---------------- */
    function bind() {
      /* The scroll container never changes, so bind to it once here rather
         than leaving it null until a book happens to open. */
      scroll = dom.scroll;

      dom.closeBtn.addEventListener("click", close);
      dom.readerMenu.addEventListener("click", function () {
        setDrawer(dom.drawer.getAttribute("data-open") !== "true");
      });
      dom.menuBtn.addEventListener("click", function () {
        setDrawer(dom.drawer.getAttribute("data-open") !== "true");
      });
      dom.scrim.addEventListener("click", function () { setDrawer(false); });
      dom.findBtn.addEventListener("click", function () { togglePanel("find"); });
      dom.typeBtn.addEventListener("click", function () { togglePanel("prefs"); });
      dom.notesBtn.addEventListener("click", function () { togglePanel("notes"); });
      dom.ttsBtn.addEventListener("click", function () { togglePanel("speech"); });
      dom.modeBtn.addEventListener("click", function () {
        setMode(dom.reader.getAttribute("data-mode") === "focus" ? "reader" : "focus");
      });
      dom.fsBtn.addEventListener("click", toggleFullscreen);
      dom.topBtn.addEventListener("click", function () { scroll.scrollTo({ top: 0, behavior: "smooth" }); });
      dom.copyBtn.addEventListener("click", function () {
        loadText(book.src).then(function (t) {
          if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast("Markdown source copied"); });
          else toast("Clipboard unavailable in this browser", "error");
        });
      });

      dom.drawerClose.addEventListener("click", function () { setDrawer(false); });

      /* The drawer duplicates five controls on narrow screens. One action
         table, so the two places can never disagree. */
      dom.toolsWrap.addEventListener("click", function (e) {
        var row = e.target.closest("[data-tool]");
        if (!row) return;
        var tool = row.getAttribute("data-tool");
        setDrawer(false);
        if (tool === "top") { scroll.scrollTo({ top: 0, behavior: "smooth" }); toast("Back to the top"); }
        else if (tool === "notes") setPanel("notes");
        else if (tool === "speech") { setPanel("speech"); toggleSpeech(); }
        else if (tool === "mode") setMode(dom.reader.getAttribute("data-mode") === "focus" ? "reader" : "focus");
        else if (tool === "fs") toggleFullscreen();
      });

      dom.bgChips.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-value]");
        if (btn) setPref("reader", btn.getAttribute("data-value"));
      });
      [[dom.fontSeg, "font"], [dom.sizeSeg, "size"], [dom.leadSeg, "leading"], [dom.measureSeg, "measure"]]
        .forEach(function (pair) {
          pair[0].addEventListener("click", function (e) {
            var btn = e.target.closest("[data-value]");
            if (btn) setPref(pair[1], btn.getAttribute("data-value"));
          });
        });

      dom.findInput.addEventListener("input", find);
      dom.findInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); stepFind(e.shiftKey ? -1 : 1); }
      });
      dom.findNext.addEventListener("click", function () { stepFind(1); });
      dom.findPrev.addEventListener("click", function () { stepFind(-1); });
      dom.findClose.addEventListener("click", function () { clearFind(); setPanel(null); });

      dom.noteExport.addEventListener("click", exportNotes);
      dom.noteClear.addEventListener("click", function () {
        if (!book) return;
        if (!global.confirm("Delete every highlight and note in " + book.title + "?")) return;
        marks = []; notes = [];
        Inkwell.patchState(book.slug, { marks: [], notes: [] });
        dom.page.querySelectorAll("mark.rd-mark").forEach(function (m) {
          var p = m.parentNode;
          p.replaceChild(document.createTextNode(m.textContent), m);
          p.normalize();
        });
        renderNotes();
        toast("Cleared");
      });

      dom.speechPlay.addEventListener("click", toggleSpeech);
      dom.speechStop.addEventListener("click", stopSpeech);
      dom.speechBack.addEventListener("click", function () { skip(-15); });
      dom.speechFwd.addEventListener("click", function () { skip(15); });
      dom.speechRate.addEventListener("input", function () {
        setRateText(Number(dom.speechRate.value));
        Inkwell.setPref("speechRate", Number(dom.speechRate.value));
        prefs = Inkwell.prefs();
        if (speech) paintSpeech();
      });

      scroll.addEventListener("scroll", onScroll, { passive: true });

      var selectTimer = null;
      dom.page.addEventListener("mouseup", function () {
        if (selectTimer) clearTimeout(selectTimer);
        selectTimer = setTimeout(function () {
          var q = selectedQuote();
          if (q) showSelectionBar(q); else hideSelectionBar();
        }, 10);
      });

      dom.reader.addEventListener("mousemove", function (e) {
        if (e.movementY < -6) dom.reader.classList.remove("reader-chrome-hidden");
        else if (e.movementY > 10 && scroll.scrollTop > 120) dom.reader.classList.add("reader-chrome-hidden");
        if (chromeTimer) clearTimeout(chromeTimer);
        chromeTimer = setTimeout(function () { hideSelectionBar(); }, 4000);
      });

      document.addEventListener("keydown", onKey);

      /* Never lose a place to a closed tab or a locked phone. */
      global.addEventListener("pagehide", flush);
      global.addEventListener("beforeunload", flush);
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") flush();
      });
    }

    api.open = open;
    api.close = close;
    api.toggleFullscreen = toggleFullscreen;
    api.bind = bind;
    api.applyPrefs = applyPrefs;
    return api;
  }

  global.Inkwell.Reader = { create: create };
})(window);
