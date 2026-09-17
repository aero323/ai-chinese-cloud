(function (global) {
  "use strict";

  const types = global.AICloudActivityTypes;

  let overlay = null;
  let list = null;

  function buildRows() {
    if (!list || !types || typeof types.all !== "function") return;
    list.innerHTML = "";
    types.all().forEach(function (meta) {
      const row = document.createElement(meta.ready ? "a" : "span");
      row.className = "demo-activity-row" + (meta.ready ? "" : " is-pending");
      if (meta.ready) {
        row.setAttribute("href", types.linkFor(meta.type));
      } else {
        row.setAttribute("aria-disabled", "true");
      }
      row.innerHTML = "<span aria-hidden=\"true\">" + meta.icon + "</span><strong>" + meta.title + "</strong><em>" + (meta.ready ? "可体验" : "待认领") + "</em>";
      list.appendChild(row);
    });
  }

  function open() {
    if (!overlay) return;
    buildRows();
    overlay.classList.add("open");
  }

  function close() {
    if (overlay) overlay.classList.remove("open");
  }

  function wantsAutoOpen() {
    try {
      if (global.location.hash === "#activities") return true;
      const params = new URLSearchParams(global.location.search || "");
      const flag = params.get("activities");
      return flag === "1" || flag === "true";
    } catch (error) {
      return false;
    }
  }

  function clearAutoOpenFlag() {
    if (!global.history || typeof global.history.replaceState !== "function") return;
    try {
      const url = new URL(global.location.href);
      url.searchParams.delete("activities");
      if (url.hash === "#activities") url.hash = "";
      global.history.replaceState(null, "", url.pathname + url.search + url.hash);
    } catch (error) {
      return;
    }
  }

  function install() {
    if (document.querySelector(".activity-fab")) return;
    if (!types || typeof types.all !== "function") return;

    const fab = document.createElement("button");
    fab.type = "button";
    fab.className = "activity-fab";
    fab.setAttribute("aria-label", "打开题型体验清单");
    fab.innerHTML = "<span aria-hidden=\"true\">🎮</span><span>题型体验</span>";
    document.body.appendChild(fab);

    overlay = document.createElement("div");
    overlay.className = "demo-sheet-overlay activity-sheet-overlay";
    overlay.innerHTML = [
      '<section class="demo-sheet activity-sheet" role="dialog" aria-modal="true" aria-labelledby="activity-sheet-title">',
      '  <div class="demo-handle"></div>',
      '  <div class="demo-sheet-head">',
      '    <h3 id="activity-sheet-title">题型体验</h3>',
      '    <p>挑一个题型单独体验：不计分，也不会影响课堂页那两道题的进度。</p>',
      '  </div>',
      '  <div class="demo-activity-list" data-activity-list></div>',
      '  <p class="activity-sheet-note">灰底的行还在认领中，做完会自动出现在这里。</p>',
      '  <button type="button" class="demo-reset" data-activity-close>关闭</button>',
      '</section>'
    ].join("");
    document.body.appendChild(overlay);

    list = overlay.querySelector("[data-activity-list]");

    buildRows();

    fab.addEventListener("click", open);

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) close();
    });

    const closeButton = overlay.querySelector("[data-activity-close]");
    if (closeButton) closeButton.addEventListener("click", close);

    overlay.addEventListener("click", function (event) {
      const link = event.target.closest ? event.target.closest("a.demo-activity-row") : null;
      if (link) close();
    });

    global.addEventListener("keydown", function (event) {
      if (event.key === "Escape") close();
    });

    if (wantsAutoOpen()) {
      open();
      clearAutoOpenFlag();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }

  global.AICloudActivityFab = { install: install, open: open, close: close };
})(typeof window !== "undefined" ? window : globalThis);
