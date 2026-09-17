/* 图片—词语连线 · interaction-picture-match.html 页面脚本
   状态机：待作答 → 已配对 N / 4 组 → 全部配对成功。
   交互和原版连线题（app.js 的 initMatch）同一套判定：先点左列的图，再点右列对应的词，
   配对成功两边变绿打勾并锁定，配错两边红框抖动约 0.7 秒后复原，可以继续尝试；
   本题是纯点选配对、不画线：没有连线层（<svg>），也没有窗口尺寸重算逻辑。
   进度记账和课堂跳转都由 shared/activity-bridge.js 负责，本页只做界面并调用 finish()。
   图槽数据固定保留 icon / image / imageAlt 三个字段：image 有值时渲染真图，
   为空时渲染 emoji；以后换真图只改 PAIRS 数据，不改页面结构和样式。 */
(function (global) {
  "use strict";

  /* 左列固定顺序：🏫 学校、🏥 医院、🏪 商店、🌳 公园 */
  const PAIRS = [
    { key: "school",   icon: "🏫", image: "", imageAlt: "学校的教学楼", word: "学校", pinyin: "xué xiào" },
    { key: "hospital", icon: "🏥", image: "", imageAlt: "医院的大楼",   word: "医院", pinyin: "yī yuàn" },
    { key: "shop",     icon: "🏪", image: "", imageAlt: "商店的门面",   word: "商店", pinyin: "shāng diàn" },
    { key: "park",     icon: "🌳", image: "", imageAlt: "公园里的大树", word: "公园", pinyin: "gōng yuán" }
  ];

  /* 右列固定顺序（乱序排列，自上而下）：公园、学校、商店、医院 */
  const RIGHT_ORDER = ["park", "school", "shop", "hospital"];

  const GROUP_TOTAL = PAIRS.length;
  const WRONG_RESET_DELAY = 720;      // 配错：红框和抖动保留 720ms 后复原（照原版连线题）
  const SOLO_MODAL_DELAY = 600;       // 体验模式：全部配对成功后约 0.6 秒弹完成弹窗
  const CLASS_REDIRECT_DELAY = 2600;  // 课堂模式：公共脚本按这个延迟跳转

  const el = {};
  const matched = new Set();
  let selected = null;
  let resolving = false;
  let finished = false;
  let lastSeconds = 0;
  let startedAt = 0;
  let modalTimer = 0;

  function setText(node, text) {
    if (node) node.textContent = text;
  }

  function setHidden(node, hidden) {
    if (node) node.classList.toggle("hidden", !!hidden);
  }

  function cache() {
    el.board = document.querySelector("[data-pm-board]");
    el.progress = document.querySelector("[data-pm-progress]");
    el.step = document.querySelector("[data-pm-step]");
    el.announcer = document.querySelector("[data-pm-announcer]");
    el.status = document.querySelector("[data-activity-status]");
    el.badgeIcon = document.querySelector("[data-pm-badge-icon]");
    el.badgeName = document.querySelector("[data-pm-badge-name]");
    el.modal = document.querySelector("[data-pm-complete]");
    el.modalChange = document.querySelector("[data-pm-change]");
    el.modalReturn = document.querySelector("[data-pm-return]");
  }

  function activityBridge() {
    return global.AICloudActivity || null;
  }

  function activityMeta() {
    const types = global.AICloudActivityTypes;
    const type = document.body.dataset.activityType || "picture-match";
    if (!types || typeof types.get !== "function") return null;
    return types.get(type);
  }

  function mode() {
    const bridge = activityBridge();
    if (!bridge || typeof bridge.context !== "function") return "solo";
    return bridge.context().mode;
  }

  /* 题型角标文案取自题型清单，不在页面里另写一份；返回按钮跟着模式走 */
  function applyShellText() {
    const meta = activityMeta();
    if (meta) {
      setText(el.badgeIcon, meta.icon);
      setText(el.badgeName, meta.title);
    }
    const back = document.querySelector("[data-activity-back]");
    if (back) {
      const isClass = mode() === "class";
      back.setAttribute("href", isClass ? "classroom.html" : "index.html");
      back.setAttribute("aria-label", isClass ? "返回课堂互动" : "返回首页");
    }
  }

  function pairFor(key) {
    return PAIRS.filter(function (pair) { return pair.key === key; })[0] || null;
  }

  /* 图槽：image 有值渲染 <img src alt>，为空渲染套了 role="img" 的 emoji */
  function buildSlot(pair) {
    const slot = document.createElement("span");
    slot.className = "pm-slot";
    if (pair.image) {
      const image = document.createElement("img");
      image.src = pair.image;
      image.alt = pair.imageAlt || "";
      slot.appendChild(image);
      return slot;
    }
    slot.setAttribute("role", "img");
    slot.setAttribute("aria-label", pair.imageAlt || "");
    slot.textContent = pair.icon;
    return slot;
  }

  function buildLeftItem(pair) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "match-item";
    button.dataset.side = "left";
    button.dataset.key = pair.key;
    button.setAttribute("aria-label", "图片：" + pair.imageAlt);
    button.appendChild(buildSlot(pair));
    button.addEventListener("click", function () { onItemClick(button); });
    return button;
  }

  function buildRightItem(pair) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "match-item";
    button.dataset.side = "right";
    button.dataset.key = pair.key;
    button.setAttribute("aria-label", "词语：" + pair.word + " " + pair.pinyin);
    const word = document.createElement("strong");
    word.textContent = pair.word;
    const pinyin = document.createElement("span");
    pinyin.textContent = pair.pinyin;
    button.appendChild(word);
    button.appendChild(pinyin);
    button.addEventListener("click", function () { onItemClick(button); });
    return button;
  }

  function renderBoard() {
    if (!el.board) return;
    el.board.textContent = "";
    const leftColumn = document.createElement("div");
    leftColumn.className = "match-column";
    const rightColumn = document.createElement("div");
    rightColumn.className = "match-column";
    PAIRS.forEach(function (pair) {
      leftColumn.appendChild(buildLeftItem(pair));
    });
    RIGHT_ORDER.forEach(function (key) {
      const pair = pairFor(key);
      if (pair) rightColumn.appendChild(buildRightItem(pair));
    });
    el.board.appendChild(leftColumn);
    el.board.appendChild(rightColumn);
  }

  function markCorrect(key) {
    if (!el.board) return;
    el.board.querySelectorAll('[data-key="' + key + '"]').forEach(function (item) {
      item.classList.remove("selected", "wrong");
      item.classList.add("correct");
      item.disabled = true;
    });
  }

  function updateProgress() {
    setText(el.progress, matched.size + " / " + GROUP_TOTAL + " 组");
  }

  function updateStatus() {
    if (!el.status) return;
    if (matched.size >= GROUP_TOTAL) {
      setText(el.status, "当前状态：全部配对成功");
      return;
    }
    if (matched.size > 0) {
      setText(el.status, "当前状态：已配对 " + matched.size + " / " + GROUP_TOTAL + " 组");
      return;
    }
    setText(el.status, "当前状态：待作答");
  }

  function announce(message) {
    if (el.announcer) el.announcer.textContent = message || "";
  }

  function completeOnce(seconds) {
    if (finished) return null;
    finished = true;
    const bridge = activityBridge();
    if (!bridge || typeof bridge.finish !== "function") return { recorded: false, next: "" };
    return bridge.finish({ correct: true, seconds: seconds, delay: CLASS_REDIRECT_DELAY });
  }

  function showModal() {
    if (!el.modal) return;
    el.modal.classList.remove("hidden");
    if (el.modalChange && typeof el.modalChange.focus === "function") el.modalChange.focus();
  }

  function hideModal() {
    if (el.modal) el.modal.classList.add("hidden");
  }

  /* 全部 4 组配对成功：调用 finish()；课堂模式交给公共脚本跳转，体验模式自己弹窗 */
  function finishBoard() {
    lastSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const outcome = completeOnce(lastSeconds);
    if (outcome && outcome.recorded) {
      setText(el.status, "已全部配对，正在返回课堂继续下一题…");
      return;
    }
    modalTimer = global.setTimeout(showModal, SOLO_MODAL_DELAY);
  }

  /* 点选流转（照 initMatch，去掉画线）：同一项再点＝取消；同侧另一项＝选中转移；另一侧＝判定 */
  function onItemClick(item) {
    if (!item || resolving || item.disabled || item.classList.contains("correct")) return;

    if (!selected) {
      selected = item;
      item.classList.add("selected");
      return;
    }

    if (selected === item) {
      item.classList.remove("selected");
      selected = null;
      return;
    }

    if (selected.dataset.side === item.dataset.side) {
      selected.classList.remove("selected");
      selected = item;
      item.classList.add("selected");
      return;
    }

    const left = selected.dataset.side === "left" ? selected : item;
    const right = selected.dataset.side === "right" ? selected : item;
    const key = left.dataset.key;
    const pair = pairFor(key);

    if (key === right.dataset.key) {
      matched.add(key);
      left.classList.remove("selected");
      right.classList.remove("selected");
      selected = null;
      markCorrect(key);
      updateProgress();
      updateStatus();
      announce("配对成功：" + (pair ? pair.word : key) + "，还剩 " + (GROUP_TOTAL - matched.size) + " 组");
      if (matched.size === GROUP_TOTAL) finishBoard();
      return;
    }

    resolving = true;
    left.classList.remove("selected");
    right.classList.remove("selected");
    left.classList.add("wrong");
    right.classList.add("wrong");
    selected = null;
    announce("这两个不是一对，再试试");

    global.setTimeout(function () {
      left.classList.remove("wrong");
      right.classList.remove("wrong");
      resolving = false;
    }, WRONG_RESET_DELAY);
  }

  function startBoard() {
    global.clearTimeout(modalTimer);
    hideModal();
    matched.clear();
    selected = null;
    resolving = false;
    finished = false;
    startedAt = Date.now();
    announce("");
    renderBoard();
    updateProgress();
    updateStatus();
  }

  function bindEvents() {
    [el.modalChange, el.modalReturn].forEach(function (link) {
      if (!link) return;
      link.addEventListener("click", function () {
        completeOnce(lastSeconds);
      });
    });
  }

  function boot() {
    cache();
    applyShellText();
    bindEvents();
    startBoard();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  document.addEventListener("DOMContentLoaded", applyShellText);

  global.AICloudPictureMatchPage = { boot: boot, startBoard: startBoard };
})(typeof window !== "undefined" ? window : globalThis);
