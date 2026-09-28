/* store.js - preferences and reading state.
 *
 * What is stored: reading preferences (background, type size, leading,
 * measure, font), and per book reading state (scroll offset, marks, notes,
 * last opened). Nothing else. No tokens, no identifiers, no personal data:
 * anything in localStorage is readable by any script on the origin, so
 * nothing sensitive may go here.
 *
 * Every read and write is wrapped. A full quota or a disabled storage must
 * never take the reader down, so failures are reported, not thrown.
 */
(function (global) {
  "use strict";

  var PREF_KEY = "inkwell:prefs:v1";
  var STATE_KEY = "inkwell:reading:v1";

  var AppError = function (message, code) {
    this.name = "AppError";
    this.message = message;
    this.code = code;
    this.stack = new Error(message).stack;
  };
  AppError.prototype = Object.create(Error.prototype);
  AppError.prototype.constructor = AppError;

  function ok(value) { return { ok: true, value: value }; }
  function fail(code, message) { return { ok: false, error: new AppError(message, code) }; }

  /* A storage that throws (private mode, quota, disabled) must not break the
     app. Probe once, then degrade to an in memory map for this session. */
  var memory = {};
  var usable = (function () {
    try {
      var k = "inkwell:probe";
      global.localStorage.setItem(k, "1");
      global.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  })();

  function readRaw(key) {
    if (!usable) return memory[key] === undefined ? null : memory[key];
    try {
      return global.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function writeRaw(key, value) {
    if (!usable) {
      memory[key] = value;
      return true;
    }
    try {
      global.localStorage.setItem(key, value);
      return true;
    } catch (e) {
      // Out of quota. Fall back to memory so the session keeps working and
      // the reader keeps their position until they close the tab.
      memory[key] = value;
      return false;
    }
  }

  function readJSON(key, fallback) {
    var raw = readRaw(key);
    if (!raw) return fallback;
    try {
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  }

  var DEFAULT_PREFS = {
    reader: "paper",
    size: "l",
    leading: "normal",
    measure: "normal",
    font: "serif",
    speechRate: 1
  };

  function prefs() {
    var stored = readJSON(PREF_KEY, {});
    var out = {};
    Object.keys(DEFAULT_PREFS).forEach(function (k) {
      out[k] = typeof stored[k] === typeof DEFAULT_PREFS[k] ? stored[k] : DEFAULT_PREFS[k];
    });
    return out;
  }

  function setPref(key, value) {
    var all = prefs();
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_PREFS, key)) {
      return fail("UNKNOWN_PREF", "No such preference: " + key);
    }
    all[key] = value;
    return writeRaw(PREF_KEY, JSON.stringify(all)) ? ok(value) : ok(value);
  }

  function allState() {
    return readJSON(STATE_KEY, {});
  }

  function bookState(slug) {
    var all = allState();
    var s = all[slug];
    if (!s || typeof s !== "object") {
      return { offset: 0, percent: 0, marks: [], notes: [], opened: 0, done: false };
    }
    return {
      offset: typeof s.offset === "number" ? s.offset : 0,
      percent: typeof s.percent === "number" ? s.percent : 0,
      marks: Array.isArray(s.marks) ? s.marks : [],
      notes: Array.isArray(s.notes) ? s.notes : [],
      opened: typeof s.opened === "number" ? s.opened : 0,
      done: s.done === true
    };
  }

  function patchState(slug, patch) {
    var all = allState();
    var next = Object.assign({}, all[slug] || {}, patch);
    all[slug] = next;
    var stored = writeRaw(STATE_KEY, JSON.stringify(all));
    return stored ? ok(next) : ok(next);
  }

  function forget(slug) {
    var all = allState();
    delete all[slug];
    writeRaw(STATE_KEY, JSON.stringify(all));
    return ok(true);
  }

  function storageAvailable() { return usable; }

  global.Inkwell = global.Inkwell || {};
  global.Inkwell.AppError = AppError;
  global.Inkwell.ok = ok;
  global.Inkwell.fail = fail;
  global.Inkwell.prefs = prefs;
  global.Inkwell.setPref = setPref;
  global.Inkwell.bookState = bookState;
  global.Inkwell.patchState = patchState;
  global.Inkwell.forget = forget;
  global.Inkwell.storageAvailable = storageAvailable;
})(window);
