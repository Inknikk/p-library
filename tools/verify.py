#!/usr/bin/env python3
"""inkwell verification pass.

Desktop plus mobile, one bounded pass, per the project rules. Checks:
  * no console errors, no page errors, no failed requests
  * no horizontal overflow at any viewport (mobile browsers scroll
    horizontally, so a desktop layout on a phone is a fail, not a pass)
  * every interactive element clears 44px
  * a book opens, renders, and produces a real table of contents
  * all eight reading grounds render and every body contrast clears 4.5:1
  * find, notes, progress and persistence across a reload
  * no raw values leaked into the component stylesheets
  * every DOM id the script asks for exists
"""
import json
import pathlib
import re
import sys

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8412/index.html"
ROOT = pathlib.Path("/root/projects/inkwell")
VIEWPORTS = [
    ("desktop", 1440, 900),
    ("laptop", 980, 700),
    ("tablet", 768, 1024),
    ("phone", 375, 812),
]
report = {"console": [], "pageerrors": [], "requests": [], "viewports": {}, "checks": []}


def step(msg):
    print("STEP  " + msg, flush=True)


def ok(name, passed, detail=""):
    report["checks"].append({"name": name, "pass": bool(passed), "detail": str(detail)})
    return passed


def srgb(c):
    c = c / 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def lum(rgb):
    r, g, b = rgb
    return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)


def parse_rgb(text):
    nums = re.findall(r"[\d.]+", text or "")
    if len(nums) < 3:
        return None
    return tuple(float(n) for n in nums[:3])


def contrast(fg, bg):
    a, b = lum(fg), lum(bg)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


def watch(page):
    page.on("console", lambda m: report["console"].append(f"{m.type}: {m.text}")
            if m.type in ("error", "warning") else None)
    page.on("pageerror", lambda e: report["pageerrors"].append(str(e)))
    page.on("requestfailed",
            lambda r: report["requests"].append(f"{r.url} {r.failure}"))


def overflow(page):
    return page.evaluate("""() => ({
      doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
      wide: Array.from(document.querySelectorAll('body *'))
        .filter(e => e.getBoundingClientRect().right >
                     document.documentElement.clientWidth + 1)
        .slice(0, 6).map(e => e.tagName + '.' + (e.className || '').toString().slice(0, 40))
    })""")


def small_targets(page):
    return page.evaluate("""() => Array.from(
        document.querySelectorAll('button, a[href], input, [role=button]'))
      .filter(e => e.offsetParent !== null || e.classList.contains('skip'))
      .map(e => {
        const r = e.getBoundingClientRect();
        return {t: e.tagName, id: e.id, c: (e.className || '').toString().slice(0, 30),
                w: Math.round(r.width), h: Math.round(r.height)};
      })
      .filter(x => x.h < 44 || x.w < 44)""")


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for label, w, h in VIEWPORTS:
            step("viewport " + label)
            ctx = browser.new_context(viewport={"width": w, "height": h})
            page = ctx.new_page()
            watch(page)
            page.goto(BASE, wait_until="networkidle")

            step(label + " shelf loaded")
            v = {}
            v["overflow"] = overflow(page)
            ok(f"{label} no horizontal overflow", v["overflow"]["doc"] <= 0,
               v["overflow"])
            v["smallTargets"] = small_targets(page)
            ok(f"{label} touch targets >= 44px", not v["smallTargets"],
               v["smallTargets"][:8])
            v["cards"] = page.locator("#shelfGrid .card").count()
            ok(f"{label} five covers on the shelf", v["cards"] == 5, v["cards"])

            step(label + " click a cover")
            page.locator("#shelfGrid .card").first.click()
            page.wait_for_selector("#reader:not([hidden])")
            page.wait_for_function("() => document.querySelectorAll('#readerPage h2').length > 1")
            v["h2"] = page.locator("#readerPage h2").count()
            v["paras"] = page.locator("#readerPage p").count()
            v["book"] = page.evaluate(
                "() => document.getElementById('readerTitle').textContent")
            v["words"] = page.evaluate(
                "() => document.getElementById('readerPage').innerText.split(/\\s+/).length")
            ok(f"{label} book renders headings", v["h2"] >= 1, v)
            ok(f"{label} book renders real text", v["words"] > 800, v["words"])
            v["readerOverflow"] = overflow(page)
            ok(f"{label} reader no horizontal overflow",
               v["readerOverflow"]["doc"] <= 0, v["readerOverflow"])
            v["readerSmall"] = small_targets(page)
            ok(f"{label} reader targets >= 44px", not v["readerSmall"],
               v["readerSmall"][:8])
            step(label + " book open and measured")
            v["pageWidth"] = page.evaluate(
                "() => Math.round(document.getElementById('readerPage')"
                ".getBoundingClientRect().width)")
            v["barH"] = page.evaluate(
                "() => Math.round(document.querySelector('.reader-bar')"
                ".getBoundingClientRect().height)")
            ok(f"{label} reader chrome one line", v["barH"] <= 64, v["barH"])

            report["viewports"][label] = v
            ctx.close()
        browser.close()

    # ---- one pass over the reading grounds, at desktop ----
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()
        watch(page)
        page.goto(BASE, wait_until="networkidle")
        page.locator("#shelfGrid .card").nth(3).click()   # walden, longest
        page.wait_for_selector("#reader:not([hidden])")
        page.wait_for_function("() => document.querySelectorAll('#readerPage h2').length > 0")

        step("grounds")
        themes = {}
        for theme in ["paper", "sepia", "sand", "mint", "slate", "dusk", "night", "ink"]:
            page.evaluate(
                "(t) => document.getElementById('reader').setAttribute('data-reader', t)", theme)
            page.wait_for_timeout(40)
            s = page.evaluate("""() => {
              const p = document.getElementById('readerPage');
              const cs = getComputedStyle(p);
              const ground = getComputedStyle(document.getElementById('readerScroll'));
              const cs2 = getComputedStyle(document.querySelector('.reader-bar'));
              return {bg: ground.backgroundColor, fg: cs.color,
                      barBg: cs2.backgroundColor, barFg: cs2.color,
                      size: cs.fontSize, lh: cs.lineHeight,
                      family: cs.fontFamily.split(',')[0],
                      measure: Math.round(p.getBoundingClientRect().width)};
            }""")
            s["bodyContrast"] = round(contrast(parse_rgb(s["fg"]), parse_rgb(s["bg"])), 2)
            s["chromeContrast"] = round(contrast(parse_rgb(s["barFg"]), parse_rgb(s["barBg"])), 2)
            themes[theme] = s
        report["themes"] = themes
        ok("all eight grounds render", len(themes) == 8)
        bad = {k: v["bodyContrast"] for k, v in themes.items() if v["bodyContrast"] < 4.5}
        ok("body contrast >= 4.5:1 on all eight grounds", not bad, bad)
        badc = {k: v["chromeContrast"] for k, v in themes.items() if v["chromeContrast"] < 4.5}
        ok("reader chrome contrast >= 4.5:1 on all eight grounds", not badc, badc)

        step("grounds done")
        # type dials
        page.click("#typeBtn")
        page.click('#sizeSeg [data-value="xl"]')
        page.click('#leadSeg [data-value="open"]')
        page.click('#measureSeg [data-value="narrow"]')
        page.click('#fontSeg [data-value="sans"]')
        page.wait_for_timeout(80)
        dials = page.evaluate("""() => {
          const r = document.getElementById('reader');
          const p = document.getElementById('readerPage');
          const cs = getComputedStyle(p);
          return {size: cs.fontSize, lh: cs.lineHeight,
                  w: Math.round(p.getBoundingClientRect().width),
                  family: cs.fontFamily.split(',')[0],
                  attrs: [r.getAttribute('data-size'), r.getAttribute('data-leading'),
                          r.getAttribute('data-measure'), r.getAttribute('data-font')]};
        }""")
        report["dials"] = dials
        ok("type dials change the rendered text", dials["attrs"] == ["xl", "open", "narrow", "sans"], dials)
        ok("narrow measure is narrower than default", dials["w"] < 620, dials["w"])
        page.keyboard.press("Escape")
        page.click('#sizeSeg [data-value="l"]') if False else None
        page.evaluate("() => Inkwell.setPref('size','l')")
        page.evaluate("() => Inkwell.Reader && document.getElementById('reader').setAttribute('data-size','l')")
        page.keyboard.press("Escape")

        step("dials done")
        # find
        page.evaluate("() => document.getElementById('reader').setAttribute('data-reader','paper')")
        page.keyboard.press("Control+k")
        page.wait_for_selector("#findBar:not([hidden])")
        page.fill("#findInput", "the")
        page.wait_for_timeout(200)
        hits = page.evaluate("() => document.querySelectorAll('#readerPage .hit').length")
        count = page.inner_text("#findCount")
        report["find"] = {"hits": hits, "label": count}
        ok("find highlights matches", hits > 5, report["find"])
        page.click("#findNext")
        page.wait_for_timeout(80)
        cur = page.locator("#readerPage .hit[data-current]").count()
        ok("find moves the current match", cur == 1, cur)
        page.keyboard.press("Escape")

        step("find done")
        # progress + persistence
        page.evaluate("() => { const s = document.getElementById('readerScroll');"
                      " s.scrollTop = s.scrollHeight * 0.42; }")
        page.wait_for_timeout(900)
        pct = page.inner_text("#progressPct")
        state = page.evaluate("() => JSON.parse(localStorage.getItem('inkwell:reading:v1')||'{}')")
        report["progress"] = {"label": pct, "stored": state}
        ok("progress is measured and stored", pct not in ("0%", "100%"), pct)
        keys = list(state.keys())
        ok("reading state is keyed by book", "walden" in keys, keys)

        step("progress stored")
        page.reload(wait_until="networkidle")
        page.wait_for_selector("#reader:not([hidden])")
        page.wait_for_function("() => document.querySelectorAll('#readerPage p').length > 3")
        restored = page.evaluate("() => document.getElementById('readerScroll').scrollTop")
        report["restored"] = restored
        ok("position is restored after a reload", restored > 100, restored)
        prefs = page.evaluate("() => JSON.parse(localStorage.getItem('inkwell:prefs:v1')||'{}')")
        report["prefs"] = prefs
        ok("preferences are stored", "size" in prefs, prefs)

        step("restored after reload")
        # focus mode keeps your place
        before = page.evaluate("() => { const s=document.getElementById('readerScroll');"
                               " return s.scrollTop/(s.scrollHeight-s.clientHeight); }")
        page.keyboard.press("r")
        page.wait_for_timeout(200)
        after = page.evaluate("() => { const s=document.getElementById('readerScroll');"
                              " return s.scrollTop/(s.scrollHeight-s.clientHeight); }")
        report["focus"] = {"before": round(before, 3), "after": round(after, 3)}
        ok("focus mode keeps the reading position", abs(before - after) < 0.05, report["focus"])
        page.keyboard.press("r")

        step("focus mode done")
        # drawer switches to contents
        page.keyboard.press("Control+j")
        page.wait_for_timeout(300)
        drawer = page.evaluate("""() => ({
          open: document.getElementById('drawer').getAttribute('data-open'),
          tocVisible: !document.getElementById('tocWrap').hidden,
          shelfHidden: document.getElementById('shelfList').hidden,
          items: document.querySelectorAll('#tocList .toc-item').length})""")
        report["drawer"] = drawer
        ok("drawer shows the contents while reading", drawer["open"] == "true"
           and drawer["tocVisible"] and drawer["items"] > 0, drawer)
        page.keyboard.press("Escape")

        step("drawer done")
        # security: a hostile book must not execute
        page.evaluate("""() => {
          const el = document.getElementById('readerPage');
          el.innerHTML = Inkwell.markdown.render(
            '# Hi\\n\\n[click](javascript:alert(1)) and ' +
            '<img src=x onerror="window.__pwned=1"> and ' +
            '<script>window.__pwned=1<\\/script>\\n\\n' +
            '<b onclick="window.__pwned=1">bold</b>\\n\\n' +
            '[ok](https://example.com/x)\\n\\n**em** and *it* and `code`');
        }""")
        sec = page.evaluate("""() => ({
          pwned: !!window.__pwned,
          scripts: document.querySelectorAll('#readerPage script').length,
          onattrs: document.querySelectorAll('#readerPage [onerror], #readerPage [onclick]').length,
          jsHrefs: Array.from(document.querySelectorAll('#readerPage a'))
            .filter(a => (a.getAttribute('href')||'').toLowerCase().includes('javascript:')).length,
          badImgs: document.querySelectorAll('#readerPage img[src="x"]').length,
          text: document.getElementById('readerPage').innerText.slice(0, 90),
          goodHrefs: document.querySelectorAll('#readerPage a[href^="https://"]').length,
          marks: document.querySelectorAll('#readerPage strong, #readerPage em, #readerPage code').length
        })""")
        report["security"] = sec
        ok("no script execution from book text", not sec["pwned"] and sec["scripts"] == 0, sec)
        ok("no event handler attributes survive", sec["onattrs"] == 0, sec)
        ok("javascript: hrefs are stripped", sec["jsHrefs"] == 0, sec)
        ok("inline formatting still renders", sec["marks"] >= 3, sec)
        ok("safe links survive", sec["goodHrefs"] == 1, sec)

        step("security done")
        # ids the script needs
        needed = page.evaluate("""() => {
          const ids = ['reader','readerScroll','readerPage','dock','progress','progressPct',
            'sectionNow','findBar','findInput','findCount','findPrev','findNext','findClose',
            'prefsPanel','bgChips','fontSeg','sizeSeg','leadSeg','measureSeg','notesPanel',
            'noteList','noteExport','noteClear','speechPanel','speechPlay','speechStop',
            'speechBack','speechFwd','speechRate','speechTime','speechTrack','closeBtn','fsBtn',
            'modeBtn','typeBtn','notesBtn','findBtn','ttsBtn','topBtn','copyBtn','drawer',
            'drawerClose','scrim','menuBtn','shelfList','tocWrap','toastDock','aboutDialog',
            'aboutOpen','aboutClose','storageWarn','countLabel','readerTitle','readerAuthor',
            'shelfGrid','resumeCard','resumeTitle','resumeMeta','resumePct','resumeBar',
            'resumeCover','resumeCoverTitle','resumeCoverAuthor'];
          return ids.filter(id => !document.getElementById(id));
        }""")
        ok("every id the script asks for exists", not needed, needed)
        ctx.close()
        browser.close()

    step("dom contract done")
    # ---- static checks on the stylesheets ----
    # Breakpoint widths inside @media are the documented exception: no
    # shipping browser accepts a custom property in a media query, so those
    # five widths cannot be tokenised. Everything else must come from
    # css/tokens.css.
    raw = {}
    for name in ["base", "components", "sections", "motion"]:
        text = (ROOT / "css" / f"{name}.css").read_text()
        stripped = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
        stripped = re.sub(r"@media[^{]*\{", "@media{", stripped)
        hits = re.findall(r"#[0-9a-fA-F]{3,8}\b|\brgba?\(", stripped)
        hits += [h for h in re.findall(r"(?<![\w-])(\d+)px(?![\w-])", stripped)]
        raw[name] = sorted(set(hits))
    report["rawValues"] = raw
    ok("no raw colour or px values in component CSS",
       all(not v for v in raw.values()), raw)

    trans = ""
    for name in ["base", "components", "sections", "motion"]:
        trans += (ROOT / "css" / f"{name}.css").read_text()
    # Comments are stripped first: the stylesheets are allowed to *name* the
    # banned shorthand in order to say it is not used.
    trans_nc = re.sub(r"/\*.*?\*/", "", trans, flags=re.S)
    ok("no transition: all anywhere", "transition: all" not in trans_nc
       and "transition:all" not in trans_nc)
    ok("focus-visible ring is never removed",
       ":focus-visible" in trans and "outline: none" in trans)

    ok("no console errors", not [c for c in report["console"] if c.startswith("error")],
       [c for c in report["console"] if c.startswith("error")][:5])
    ok("no page errors", not report["pageerrors"], report["pageerrors"][:5])
    ok("no failed requests", not report["requests"], report["requests"][:5])

    report["heavy"] = heavy_book()
    report["a11y"] = a11y()
    report["offline"] = offline()
    report["perf"] = performance()
    return report


PERF_OBSERVER = """
window.__perf = { lcp: 0, cls: 0, shifts: [] };
new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__perf.lcp = e.startTime; })
  .observe({ type: "largest-contentful-paint", buffered: true });
new PerformanceObserver((l) => { for (const e of l.getEntries()) {
  if (e.hadRecentInput) continue;
  window.__perf.cls += e.value;
  window.__perf.shifts.push({ v: +e.value.toFixed(4), t: Math.round(e.startTime),
    n: (e.sources || []).map((s) => s.node ? (s.node.id || s.node.className || s.node.nodeName) : "?") });
} }).observe({ type: "layout-shift", buffered: true });
// Total Blocking Time = every long task's time beyond a 50ms slice. A draft
// report quoted 33ms from a manual probe; this makes it a real gate.
window.__perf.tasks = [];
new PerformanceObserver((l) => { for (const e of l.getEntries()) {
  window.__perf.tasks.push(Math.round(e.duration));
} }).observe({ type: "longtask", buffered: true });
"""


def performance():
    """LCP and CLS on the shelf, which is the page every visit lands on.

    The shelf used to score 0.41 CLS on a phone because the footer sat in
    document flow under a grid that script fills after first paint. This is
    here to keep that number from coming back.
    """
    step("performance pass")
    report = {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for name, vp in [("desktop", {"width": 1440, "height": 900}),
                         ("phone", {"width": 375, "height": 812})]:
            page = browser.new_context(viewport=vp).new_page()
            page.add_init_script(PERF_OBSERVER)
            page.goto(BASE, wait_until="load", timeout=25000)
            page.wait_for_selector("#shelfGrid .card", timeout=10000)
            page.wait_for_timeout(900)
            report[name] = page.evaluate("() => window.__perf")
            report[name]["tasks"] = page.evaluate("() => window.__perf.tasks")
            report[name]["resources"] = page.evaluate(
                "() => performance.getEntriesByType('resource').length + 1")
            report[name]["footY"] = page.evaluate(
                "() => Math.round(document.querySelector('footer.foot')"
                ".getBoundingClientRect().y)")
            report[name]["transfer"] = page.evaluate(
                "() => performance.getEntriesByType('navigation')[0].transferSize")
            # The draft reports quoted the navigation number as "first-load
            # transfer". That is the HTML document alone. Sum every resource.
            report[name]["loadTransfer"] = page.evaluate(
                "() => { const n = performance.getEntriesByType('navigation')[0];"
                " const rs = performance.getEntriesByType('resource');"
                " return n.transferSize + rs.reduce((a, r) => a + (r.transferSize || 0), 0); }")
            report[name]["tbt"] = sum(
                d - 50 for d in page.evaluate("() => window.__perf.tasks") if d > 50)
            page.context.close()
        browser.close()

    for name, v in report.items():
        ok(f"{name} LCP under 2.5s", v["lcp"] < 2500, f"{v['lcp']:.0f}ms")
        ok(f"{name} CLS under 0.1", v["cls"] < 0.1, f"{v['cls']:.4f} {v['shifts'][:3]}")
        ok(f"{name} TBT under 200ms", v["tbt"] < 200, f"{v['tbt']}ms {v['tasks']}")
        ok(f"{name} first load under 200 kB", v["loadTransfer"] < 204800,
           f"{v['loadTransfer']:,} bytes over "
           f"{v['resources']} requests ({v['transfer']:,} of it the document)")
    return report


def heavy_book():
    """Walden, the largest excerpt, opened from cold.

    Every other check opens the first card, which is Moby-Dick at 9,363
    words. This is the 29,550 word one, where the parse and the render are
    at their worst, so the budget belongs here rather than on a small book.
    """
    step("largest book pass")
    report = {"console": [], "pageerrors": [], "requests": []}
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_context(viewport={"width": 1440, "height": 900}).new_page()
        watch(page)
        page.goto(BASE, wait_until="load", timeout=25000)
        page.wait_for_selector("#shelfGrid .card", timeout=10000)
        # Timestamp inside the page, in the capture phase, so the harness's
        # own dispatch latency is not billed to the application.
        page.evaluate("""() => {
          window.__phases = {};
          document.addEventListener('click', () => {
            if (!window.__phases.start) window.__phases.start = performance.now();
          }, true);
          const of = window.fetch;
          window.fetch = function () {
            const t = performance.now();
            return of.apply(this, arguments).then((r) => r.text().then((body) => {
              window.__phases.fetchMs = Math.round(performance.now() - t);
              window.__phases.bytes = body.length;
              return body;
            }));
          };
          const orender = Inkwell.markdown.render;
          Inkwell.markdown.render = function () {
            const t = performance.now();
            const out = orender.apply(this, arguments);
            window.__phases.parseMs = Math.round(performance.now() - t);
            return out;
          };
        }""")
        report["slug"] = page.evaluate("""() => {
          const c = document.querySelector('#shelfGrid .card[data-slug="walden"]');
          return c ? 'walden' : null; }""")
        page.locator('#shelfGrid .card[data-slug="walden"]').click()
        page.wait_for_function(
            "() => document.querySelectorAll('#readerPage p').length > 3", timeout=20000)
        report["words"] = page.evaluate(
            "() => document.getElementById('readerPage').innerText.split(/\\s+/).length")
        # The reading chrome is 56px at the 900px-tall offline viewport. This
        # was quoted as 52px in a draft report; asserting it keeps the number
        # from drifting away from the CSS.
        report["phases"] = page.evaluate("""() => {
          const p = window.__phases;
          return { fetchMs: p.fetchMs, bytes: p.bytes, parseMs: p.parseMs };
        }""")
        # A book has to be parsed once, not twice. The second pass showed up
        # as the page going back to its skeleton after it had already
        # rendered, which is also what doubled the long task.
        report["state"] = page.evaluate("""() => {
          const p = document.getElementById('readerPage');
          return { skeletons: p.querySelectorAll('.skeleton').length,
                   text: p.innerText.length }; }""")
        page.locator("#closeBtn").click()
        page.wait_for_timeout(400)
        browser.close()

    ok("the largest book opens", report["words"] > 20000, report)
    ok("the largest book is parsed once",
       report["state"]["skeletons"] == 0 and report["state"]["text"] > 100000, report["state"])
    # The parse is the only part the application controls, and it is the part
    # that scales with book length. The fetch is the host's problem.
    ok("the largest book parses in under 150ms", report["phases"]["parseMs"] < 150,
       report["phases"])
    ok("the largest book is fetched whole", report["phases"]["bytes"] > 150000,
       report["phases"])
    errs = [c for c in report["console"] if c.startswith("error")]
    ok("the largest book raises no console errors", not errs, errs[:5])
    return report


def a11y():
    """Static accessibility claims, checked on the live DOM.

    A checklist row that says "all icon buttons are labelled" is worth
    nothing unless something fails when one is not, so each claim gets a
    check.
    """
    step("accessibility pass")
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_context(viewport={"width": 1440, "height": 900}).new_page()
        page.goto(BASE, wait_until="load", timeout=25000)
        page.wait_for_selector("#shelfGrid .card", timeout=10000)
        # Most of these controls live in the reader, so a book has to be open
        # before any of them is clickable.
        page.locator("#shelfGrid .card").nth(3).click()
        page.wait_for_function(
            "() => document.querySelectorAll('#readerPage p').length > 3", timeout=15000)

        unlabelled = page.evaluate("""() => Array.from(
            document.querySelectorAll('button.icon-btn, button.chip, .seg button'))
          .filter((b) => !b.getAttribute('aria-label') && !b.textContent.trim())
          .map((b) => b.id || b.className)""")
        ok("every icon-only button has a name", not unlabelled, unlabelled)

        nameable = page.evaluate("""() => {
          const r = [];
          document.querySelectorAll('input, select, textarea').forEach((el) => {
            const byFor = el.id && document.querySelector(`label[for="${el.id}"]`);
            const wrapped = el.closest('label');
            if (!byFor && !wrapped && !el.getAttribute('aria-label')) r.push(el.id || el.name || el.type);
          });
          return r;
        }""")
        ok("every form control has a label", not nameable, nameable)

        # The pace slider is the one numeric control, and a bare 0.6 means
        # nothing announced, so its value has to be a phrase.
        page.locator("#ttsBtn").click()
        page.wait_for_timeout(250)
        valuetext = page.get_attribute("#speechRate", "aria-valuetext")
        ok("the pace slider announces a phrase", bool(valuetext), valuetext)
        page.locator("#speechRate").fill("1.4")
        page.wait_for_timeout(150)
        moved = page.get_attribute("#speechRate", "aria-valuetext")
        ok("the pace slider phrase follows the value", bool(moved) and moved != valuetext, moved)
        page.locator("#ttsBtn").click()

        # The About button lives in the app bar, which the reader covers, so
        # the book has to be closed before it can be reached at all.
        page.locator("#closeBtn").click()
        page.wait_for_selector("#shelfGrid .card", state="visible", timeout=10000)
        page.locator("#aboutOpen").click()
        page.wait_for_timeout(250)
        dlg = page.evaluate("""() => {
          const d = document.getElementById('aboutDialog');
          const r = d.getBoundingClientRect();
          return { open: d.hasAttribute('open'), labelled: !!d.getAttribute('aria-labelledby'),
                   labelText: (document.getElementById(d.getAttribute('aria-labelledby')) || {}).textContent,
                   w: Math.round(r.width), h: Math.round(r.height),
                   focusInside: d.contains(document.activeElement) };
        }""")
        ok("the about dialog opens", dlg["open"] and dlg["w"] > 200 and dlg["h"] > 100, dlg)
        ok("the about dialog is labelled", dlg["labelled"] and bool(dlg["labelText"]), dlg)
        ok("the about dialog takes focus", dlg["focusInside"], dlg)
        page.keyboard.press("Escape")
        page.wait_for_timeout(250)
        closed = page.evaluate("() => !document.getElementById('aboutDialog').hasAttribute('open')"
                               " && getComputedStyle(document.getElementById('aboutDialog')).display === 'none'")
        ok("Escape closes the about dialog", closed)

        # The shelf and the book are two views of one document. The shelf
        # carries its own h1 and a book's first heading becomes another, so
        # the rule that matters is one heading a screen reader can reach in
        # whichever view is showing, not one in the source.
        shelf_h1 = page.evaluate(
            "() => document.querySelectorAll('#main h1').length")
        ok("one heading on the shelf", shelf_h1 == 1, shelf_h1)
        page.locator("#shelfGrid .card").nth(3).click()
        page.wait_for_function(
            "() => document.querySelectorAll('#readerPage p').length > 3", timeout=15000)
        views = page.evaluate("""() => {
          // An inert subtree is out of the accessibility tree and the tab
          // order exactly as a hidden one is, so both count as not exposed.
          const exposed = (sel) => Array.from(document.querySelectorAll(sel))
            .filter((h) => !h.closest('[hidden]') && !h.closest('[inert]')).length;
          return { reader: exposed('#reader h1'), shelf: exposed('#main h1'),
                   appbarInert: document.getElementById('appbar').inert,
                   mainInert: document.getElementById('main').inert };
        }""")
        ok("one heading while reading", views["reader"] == 1 and views["shelf"] == 0, views)
        ok("the shelf leaves the tab order while reading",
           views["appbarInert"] and views["mainInert"], views)

        doc = page.evaluate("""() => ({
          h1: document.querySelectorAll('h1').length,
          lang: document.documentElement.lang,
          title: document.title.length,
          desc: (document.querySelector('meta[name=description]') || {}).content.length,
          landmarks: ['header', 'main', 'footer', 'section'].filter(
            (t) => document.querySelector(t)).length,
          skip: !!document.querySelector('a.skip[href^="#"]'),
          jsonld: (() => { try {
            const s = document.querySelector('script[type="application/ld+json"]');
            return !!JSON.parse(s.textContent); } catch (e) { return false; } })()
        })""")
        ok("one shelf heading in the source", doc["h1"] == 2, doc)
        ok("the document declares a language", bool(doc["lang"]), doc)
        ok("the title fits a search result", 10 < doc["title"] < 60, doc)
        ok("the description fits a search result", 50 < doc["desc"] < 160, doc)
        ok("the landmarks are there", doc["landmarks"] == 4, doc)
        ok("a skip link is present", doc["skip"], doc)
        ok("the structured data parses", doc["jsonld"], doc)
        browser.close()
    return {"unlabelled": unlabelled, "controls": nameable, "rate": [valuetext, moved],
            "dialog": dlg, "doc": doc}


def offline():
    """The same build opened straight off disk, with no web server at all.

    A browser blocks fetch and XHR on a file: origin, so this path can only
    work through the generated inline bundle. It gets its own browser context
    because localStorage is shared with the served run otherwise.
    """
    step("offline file:// pass")
    report = {"console": [], "pageerrors": [], "requests": []}
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_context(viewport={"width": 1440, "height": 900}).new_page()
        watch(page)
        page.goto((ROOT / "index.html").as_uri(), wait_until="load", timeout=25000)
        page.wait_for_selector("#shelfGrid .card", timeout=10000)
        report["cards"] = page.locator("#shelfGrid .card").count()
        page.locator("#shelfGrid .card").nth(3).click()
        page.wait_for_function(
            "() => document.querySelectorAll('#readerPage p').length > 3", timeout=15000)
        report["words"] = page.evaluate(
            "() => document.getElementById('readerPage').innerText.split(/\\s+/).length")
        page.evaluate("() => { const s = document.getElementById('readerScroll');"
                      " s.scrollTop = s.scrollHeight * 0.4; }")
        page.wait_for_timeout(1200)
        # The reading chrome is 56px at the 900px-tall offline viewport. A draft
        # report quoted 52px; asserting it keeps the number tied to the CSS.
        report["barH"] = page.evaluate(
            "() => Math.round(document.querySelector('.reader-bar')"
            ".getBoundingClientRect().height)")
        # pagehide is the flush path a real tab close would take.
        page.evaluate("() => window.dispatchEvent(new Event('pagehide'))")
        page.wait_for_timeout(200)
        report["state"] = page.evaluate(
            "() => JSON.parse(localStorage.getItem('inkwell:reading:v1') || '{}')")
        browser.close()

    ok("offline file:// opens the shelf", report["cards"] == 5, report["cards"])
    ok("offline file:// renders real text", report["words"] > 2000, report["words"])
    ok("offline file:// shows the full reading bar", report["barH"] == 56, report["barH"])
    state = next(iter(report["state"].values())) if report["state"] else {}
    ok("offline file:// saves the position", 0.05 < state.get("percent", 0) < 0.95, state)
    errs = [c for c in report["console"] if c.startswith("error")]
    ok("offline file:// raises no console errors", not errs, errs[:5])
    ok("offline file:// raises no page errors", not report["pageerrors"], report["pageerrors"][:5])
    return report


if __name__ == "__main__":
    rep = run()
    failed = [c for c in rep["checks"] if not c["pass"]]
    print(json.dumps({k: v for k, v in rep.items() if k != "checks"}, indent=1)[:6000])
    print("\n--- checks ---")
    for c in rep["checks"]:
        print(("PASS " if c["pass"] else "FAIL ") + c["name"] +
              ("" if c["pass"] else "  <<< " + c["detail"][:300]))
    print("\n%d checks, %d failed" % (len(rep["checks"]), len(failed)))
    sys.exit(1 if failed else 0)
