/* 拼音—汉字—含义匹配 · interaction-pinyin-match.html 页面脚本
   一屏一组、共 3 组，流程是「拼音 → 选汉字 → 选意思」：
   待作答（只有汉字候选）→ 选对汉字（锁定标绿、含义候选出现）→ 选对意思（本组完成、
   固定到已完成清单）→ 0.4 秒后自动进入下一组 → 三组完成（全部锁定）→ 0.6 秒后弹完成弹窗。
   闯关式手感：选错只标红加抖动、原地重试、不显示正确答案，所以 correct 恒为 true。
   进度记账和课堂跳转都由 shared/activity-bridge.js 负责，本页只做界面并调用 finish()。 */
(function (global) {
  "use strict";

  /* 三组模拟内容（任务书 3.4 的例子；第 2、3 组的候选按同样规则配：
     汉字和含义各 3 个、都含正确项、干扰项同类） */
  const GROUPS = [
    {
      key: "shu",
      pinyin: "shū",
      word: "书",
      meaning: "buku",
      wordOptions: ["书", "笔", "本"],
      meaningOptions: ["buku", "pena", "buku tulis"]
    },
    {
      key: "bi",
      pinyin: "bǐ",
      word: "笔",
      meaning: "pena",
      wordOptions: ["本", "笔", "书"],
      meaningOptions: ["buku tulis", "pena", "buku"]
    },
    {
      key: "benzi",
      pinyin: "běnzi",
      word: "本子",
      meaning: "buku tulis",
      wordOptions: ["书", "本子", "笔"],
      meaningOptions: ["pena", "buku tulis", "buku"]
    }
  ];

  const TOTAL_GROUPS = GROUPS.length;
  const WRONG_RESET_DELAY = 720;      // 选错：红框和抖动保留 720ms 后复原，可以继续点
  const ADVANCE_DELAY = 400;          // 本组完成后 0.4 秒自动进入下一组
  const SOLO_MODAL_DELAY = 600;       // 体验模式：三组完成后约 0.6 秒弹完成弹窗
  const CLASS_REDIRECT_DELAY = 2600;  // 课堂模式：公共脚本按这个延迟跳转

  const el = {};
  const wrongTimers = new Map();
  const completed = [];
  let groupIndex = 0;
  let stage = "word";       // "word"：正在选汉字；"meaning"：正在选意思
  let finished = false;
  let lastSeconds = 0;
  let startedAt = 0;
  let advanceTimer = 0;
  let modalTimer = 0;

  function setText(node, text) {
    if (node) node.textContent = text;
  }

  function setHidden(node, hidden) {
    if (node) node.classList.toggle("hidden", !!hidden);
  }

  function cache() {
    el.pinyin = document.querySelector("[data-py-pinyin]");
    el.words = document.querySelector("[data-py-words]");
    el.meanings = document.querySelector("[data-py-meanings]");
    el.meaningStage = document.querySelector("[data-py-meaning-stage]");
    el.feedback = document.querySelector("[data-py-feedback]");
    el.feedbackIcon = document.querySelector("[data-py-feedback-icon]");
    el.feedbackTitle = document.querySelector("[data-py-feedback-title]");
    el.feedbackCopy = document.querySelector("[data-py-feedback-copy]");
    el.doneList = document.querySelector("[data-py-done-list]");
    el.progress = document.querySelector("[data-py-progress]");
    el.announcer = document.querySelector("[data-py-announcer]");
    el.status = document.querySelector("[data-activity-status]");
    el.badgeIcon = document.querySelector("[data-py-badge-icon]");
    el.badgeName = document.querySelector("[data-py-badge-name]");
    el.modal = document.querySelector("[data-py-complete]");
    el.modalPairs = document.querySelector("[data-py-modal-pairs]");
    el.modalChange = document.querySelector("[data-py-change]");
    el.modalReturn = document.querySelector("[data-py-return]");
  }

  function activityBridge() {
    return global.AICloudActivity || null;
  }

  function activityMeta() {
    const types = global.AICloudActivityTypes;
    const type = document.body.dataset.activityType || "pinyin-match";
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
      back.setAttribute("href", "classroom.html");
      back.setAttribute("aria-label", isClass ? "返回课堂互动" : "返回课堂");
    }
  }

  /* 对照行：一行小字「拼音 — 汉字 — 意思」，已完成清单和完成弹窗共用 */
  function buildPairRow(group, tagName) {
    const item = document.createElement(tagName || "li");
    item.dataset.key = group.key;
    [
      { tag: "span", className: "py-pair-pinyin", text: group.pinyin },
      { tag: "span", className: "py-pair-sep", text: "—", hidden: true },
      { tag: "strong", className: "py-pair-word", text: group.word },
      { tag: "span", className: "py-pair-sep", text: "—", hidden: true },
      { tag: "span", className: "py-pair-meaning", text: group.meaning }
    ].forEach(function (part) {
      const node = document.createElement(part.tag);
      node.className = part.className;
      node.textContent = part.text;
      if (part.hidden) node.setAttribute("aria-hidden", "true");
      item.appendChild(node);
    });
    return item;
  }

  function renderOptions(container, values, kind, answer) {
    if (!container) return;
    container.innerHTML = "";
    values.forEach(function (value) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "py-option py-option-" + kind;
      button.dataset.value = value;
      button.dataset.correct = value === answer ? "true" : "false";
      const label = document.createElement("span");
      label.className = "py-option-text";
      label.textContent = value;
      button.appendChild(label);
      button.addEventListener("click", function () {
        onOptionClick(button, kind);
      });
      container.appendChild(button);
    });
  }

  function replayPinyinPop() {
    if (!el.pinyin) return;
    el.pinyin.classList.remove("py-pinyin-pop");
    void el.pinyin.offsetWidth;
    el.pinyin.classList.add("py-pinyin-pop");
  }

  function renderGroup() {
    const group = GROUPS[groupIndex];
    setText(el.pinyin, group.pinyin);
    replayPinyinPop();
    renderOptions(el.words, group.wordOptions, "word", group.word);
    renderOptions(el.meanings, group.meaningOptions, "meaning", group.meaning);
    setHidden(el.meaningStage, true);
    stage = "word";
    resetFeedback();
    updateProgress();
    updateStatus();
  }

  function goToGroup(index) {
    groupIndex = index;
    renderGroup();
    announce("第 " + (index + 1) + " 组：" + GROUPS[index].pinyin);
  }

  function renderDoneList() {
    if (!el.doneList) return;
    el.doneList.innerHTML = "";
    if (completed.length === 0) {
      const empty = document.createElement("li");
      empty.className = "py-done-empty";
      empty.textContent = "配好的组合会按顺序固定在这里。 · Pasangan yang benar muncul di sini.";
      el.doneList.appendChild(empty);
      return;
    }
    completed.forEach(function (group) {
      el.doneList.appendChild(buildPairRow(group, "li"));
    });
  }

  function renderModalPairs() {
    if (!el.modalPairs) return;
    el.modalPairs.innerHTML = "";
    GROUPS.forEach(function (group) {
      el.modalPairs.appendChild(buildPairRow(group, "li"));
    });
  }

  function updateProgress() {
    setText(el.progress, "第 " + Math.min(groupIndex + 1, TOTAL_GROUPS) + " / " + TOTAL_GROUPS + " 组");
  }

  function updateStatus() {
    if (!el.status) return;
    if (completed.length >= TOTAL_GROUPS) {
      setText(el.status, "当前状态：三组全部配好");
      return;
    }
    const position = "第 " + (groupIndex + 1) + " / " + TOTAL_GROUPS + " 组";
    setText(el.status, stage === "meaning"
      ? "当前状态：已选汉字，正在选意思（" + position + "）"
      : "当前状态：待作答（" + position + "）");
  }

  function announce(message) {
    if (el.announcer) el.announcer.textContent = message || "";
  }

  function resetFeedback() {
    if (!el.feedback) return;
    el.feedback.classList.add("hidden");
    el.feedback.classList.remove("is-correct", "is-wrong");
    setText(el.feedbackIcon, "");
    setText(el.feedbackTitle, "");
    setText(el.feedbackCopy, "");
  }

  function showFeedback(isCorrect, title, copy) {
    if (!el.feedback) return;
    el.feedback.classList.remove("hidden");
    el.feedback.classList.toggle("is-correct", isCorrect);
    el.feedback.classList.toggle("is-wrong", !isCorrect);
    setText(el.feedbackIcon, isCorrect ? "✓" : "✗");
    setText(el.feedbackTitle, title);
    setText(el.feedbackCopy, copy);
  }

  function lockCorrect(button) {
    button.classList.remove("wrong");
    button.classList.add("correct");
    button.disabled = true;
  }

  /* 选错：标红 ＋ 抖动 ＋ 一行提示，不显示正确答案；抖动结束后保持可点 */
  function markWrong(button, kind) {
    const timer = wrongTimers.get(button);
    if (timer) global.clearTimeout(timer);
    button.classList.remove("wrong");
    void button.offsetWidth;
    button.classList.add("wrong");
    if (kind === "word") {
      showFeedback(false, "再想想", "这个音对应哪个字？ · Huruf mana yang cocok dengan bunyi ini?");
      announce("不是这个字，再试试");
    } else {
      showFeedback(false, "再想想", "这个字是什么意思？ · Apa arti hanzi ini?");
      announce("意思不对，再试试");
    }
    updateStatus();
    wrongTimers.set(button, global.setTimeout(function () {
      button.classList.remove("wrong");
      wrongTimers.delete(button);
    }, WRONG_RESET_DELAY));
  }

  function lockAllOptions() {
    document.querySelectorAll(".py-option").forEach(function (button) {
      button.disabled = true;
    });
  }

  function onOptionClick(button, kind) {
    if (finished || !button || button.disabled) return;
    const group = GROUPS[groupIndex];

    if (button.dataset.correct !== "true") {
      markWrong(button, kind);
      return;
    }

    if (kind === "word") {
      lockCorrect(button);
      setHidden(el.meaningStage, false);
      stage = "meaning";
      showFeedback(true, "选对汉字了！", "再选它的意思。 · Sekarang pilih artinya.");
      updateStatus();
      announce("汉字选对了：" + group.word + "，接着选它的意思");
      return;
    }

    lockCorrect(button);
    completeGroup(group);
  }

  /* 一组配好：固定到已完成清单、组进度 +1，0.4 秒后自动进入下一组 */
  function completeGroup(group) {
    completed.push(group);
    lockAllOptions();
    setHidden(el.meaningStage, false);
    updateProgress();
    renderDoneList();
    showFeedback(true, "配好了：" + group.pinyin + " — " + group.word + " — " + group.meaning,
      completed.length === TOTAL_GROUPS
        ? "三组都配好了！ · Semua sudah lengkap!"
        : "马上进入下一组… · Lanjut ke kelompok berikutnya…");
    updateStatus();
    announce("配好一组：" + group.pinyin + " " + group.word + " " + group.meaning);

    if (completed.length >= TOTAL_GROUPS) {
      finishBoard();
      return;
    }
    advanceTimer = global.setTimeout(function () {
      goToGroup(groupIndex + 1);
    }, ADVANCE_DELAY);
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

  /* 三组全部配好：全部锁定，调用 finish()；课堂模式交给公共脚本跳转，
     体验模式等 0.6 秒弹完成弹窗 */
  function finishBoard() {
    lockAllOptions();
    lastSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const outcome = completeOnce(lastSeconds);
    if (outcome && outcome.recorded) {
      setText(el.status, outcome.next === "complete.html"
        ? "三组已配好，正在进入完成页…"
        : "三组已配好，正在返回课堂继续下一题…");
      return;
    }
    modalTimer = global.setTimeout(showModal, SOLO_MODAL_DELAY);
  }

  function startBoard() {
    global.clearTimeout(advanceTimer);
    global.clearTimeout(modalTimer);
    hideModal();
    completed.length = 0;
    groupIndex = 0;
    stage = "word";
    finished = false;
    lastSeconds = 0;
    startedAt = Date.now();
    announce("");
    renderModalPairs();
    renderDoneList();
    renderGroup();
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

  global.AICloudPinyinMatchPage = { boot: boot, startBoard: startBoard, groups: GROUPS };
})(typeof window !== "undefined" ? window : globalThis);
