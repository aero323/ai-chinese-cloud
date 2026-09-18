(function (global) {
  "use strict";

  const types = global.AICloudActivityTypes || {
    get: function () { return null; }
  };
  const STORAGE_KEY = "ai-chinese-cloud-classroom-demo-v1";
  const CHANGE_EVENT = "classroom-state-change";
  const DEFAULTS = {
    phase: "live",
    task1Done: false,
    task2Done: false,
    results: []
  };

  function read() {
    let stored = {};
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      stored = raw ? JSON.parse(raw) : {};
    } catch (error) {
      stored = {};
    }
    if (!stored || typeof stored !== "object") stored = {};
    const state = Object.assign({}, DEFAULTS, stored);
    if (!Array.isArray(state.results)) state.results = [];
    return state;
  }

  function write(patch) {
    const next = Object.assign(read(), patch || {});
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      next.storageBlocked = true;
    }
    if (typeof global.dispatchEvent === "function" && typeof global.CustomEvent === "function") {
      global.dispatchEvent(new global.CustomEvent(CHANGE_EVENT, { detail: next }));
    }
    return next;
  }

  function recordResult(result) {
    const state = read();
    const slot = Number(result && result.slot) || 0;
    const entry = {
      slot: slot,
      type: (result && result.type) || "",
      correct: !(result && result.correct === false),
      seconds: Math.max(0, Number(result && result.seconds) || 0),
      detail: (result && result.detail) || "",
      completedAt: new Date().toISOString()
    };
    const results = state.results
      .filter(function (item) { return item.slot !== slot; })
      .concat(entry)
      .sort(function (a, b) { return a.slot - b.slot; });
    const patch = { results: results };
    if (slot === 1) patch.task1Done = true;
    if (slot === 2) patch.task2Done = true;
    return write(patch);
  }

  function slotResult(slot) {
    return read().results.filter(function (item) { return item.slot === slot; })[0] || null;
  }

  function context() {
    let params;
    try {
      params = new URLSearchParams(global.location && global.location.search ? global.location.search : "");
    } catch (error) {
      params = new URLSearchParams("");
    }
    const mode = params.get("mode") === "class" ? "class" : "solo";
    const slot = Number(params.get("slot")) || 0;
    const type = params.get("type") || "";
    return {
      mode: mode,
      slot: slot,
      type: type,
      activity: types.get(type),
      state: read()
    };
  }

  function finish(result) {
    const ctx = context();
    const outcome = { recorded: false, next: "", slot: ctx.slot, type: ctx.type };
    if (ctx.mode !== "class" || ctx.slot <= 0) return outcome;
    recordResult(Object.assign({}, result || {}, { slot: ctx.slot, type: ctx.type }));
    outcome.recorded = true;
    outcome.next = "classroom.html";
    const delay = Math.max(0, Number(result && result.delay) || 0);
    if (typeof global.setTimeout === "function" && global.location) {
      global.setTimeout(function () {
        global.location.href = outcome.next;
      }, delay);
    }
    return outcome;
  }

  const api = {
    STORAGE_KEY: STORAGE_KEY,
    CHANGE_EVENT: CHANGE_EVENT,
    read: read,
    write: write,
    recordResult: recordResult,
    slotResult: slotResult,
    context: context,
    finish: finish
  };

  global.AICloudActivity = api;
})(typeof window !== "undefined" ? window : globalThis);
