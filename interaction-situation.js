
/* 情景选择 · interaction-situation.html 页面脚本
   状态机：待作答 → 已选择 → 已提交 → 正确 / 错误（每题只判一次，不提供重试）。
   进度记账和课堂跳转都由 shared/activity-bridge.js 负责，本页只做界面并调用 finish()。
   图槽数据固定保留 icon / image / imageAlt 三个字段：image 有值时渲染真图，
   为空时渲染 emoji；以后换真图只改 QUESTION 数据，不改页面结构和样式。 */
(function (global) {
  "use strict";

  const LETTERS = ["A", "B", "C", "D", "E", "F"];
  const SOLO_MODAL_DELAY = 2000;      // 体验模式：提交后留多久看对错，再弹完成弹窗
  const CLASS_REDIRECT_DELAY = 2600;  // 课堂模式：公共脚本按这个延迟跳转

  /* 单题数据（题型体验用的模拟题目；选项顺序在进入页面时打乱） */
  const QUESTION = {
    id: "borrow-pen",
    icon: "✏️",
    image: "",
    imageAlt: "一支铅笔",
    scene: "你想借同学的笔。",
    sceneId: "Kamu mau meminjam pulpen temanmu.",
    options: [
      { id: "rude", text: "喂，给我笔！", why: "太生硬" },
      { id: "polite", text: "请问，我可以借你的笔吗？", correct: true },
      { id: "blunt", text: "笔。", why: "话没说完" }
    ],
    reason: "向别人借东西要用「请问……可以吗」"
  };

  const el = {};
  let options = [];
  let selectedId = "";
  let submitted = false;
  let finished = false;
  let lastCorrect = false;
  let lastSeconds = 0;
  let startedAt = 0;
  let modalTimer = 0;

  function setText(node, text) {
    if (node) node.textContent = text;
  }

  function setHidden(node, hidden) {
    if (node) node.classList.toggle("hidden", !!hidden);
  }

  function shuffle(items) {
    const list = items.slice();
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const swap = list[i];
      list[i] = list[j];
      list[j] = swap;
    }
    return list;
  }

  function cache() {
    el.slot = document.querySelector("[data-situation-slot]");
    el.sceneId = document.querySelector("[data-situation-scene-id]");
    el.scene = document.querySelector("[data-situation-scene-text]");
    el.options = document.querySelector("[data-situation-options]");
    el.submit = document.querySelector("[data-situation-submit]");
    el.feedback = document.querySelector("[data-situation-feedback]");
    el.feedbackIcon = document.querySelector("[data-situation-feedback-icon]");
    el.feedbackTitle = document.querySelector("[data-situation-feedback-title]");
    el.feedbackAnswer = document.querySelector("[data-situation-feedback-answer]");
    el.feedbackCopy = document.querySelector("[data-situation-feedback-copy]");
    el.status = document.querySelector("[data-activity-status]");
    el.badgeIcon = document.querySelector("[data-situation-type-icon]");
    el.badgeName = document.querySelector("[data-situation-type-name]");
    el.modal = document.querySelector("[data-situation-complete]");
    el.modalBadge = document.querySelector("[data-situation-modal-badge]");
    el.modalTitle = document.querySelector("[data-situation-modal-title]");
    el.modalId = document.querySelector("[data-situation-modal-id]");
    el.modalCopy = document.querySelector("[data-situation-modal-copy]");
    el.modalChange = document.querySelector("[data-situation-change]");
    el.modalReturn = document.querySelector("[data-situation-return]");
  }

  function activityBridge() {
    return global.AICloudActivity || null;
  }

  function activityMeta() {
    const types = global.AICloudActivityTypes;
    const type = document.body.dataset.activityType || "situation";
    if (!types || typeof types.get !== "function") return null;
    return types.get(type);
  }

  function mode() {
    const bridge = activityBridge();
    if (!bridge || typeof bridge.context !== "function") return "solo";
    return bridge.context().mode;
  }

  /* 题型角标文案和标题都取自题型清单，不在页面里另写一份 */
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

  /* 场景图槽：image 有值渲染 <img src alt>，为空渲染套了 role="img" 的 emoji */
  function renderScenarioSlot() {
    if (!el.slot) return;
    el.slot.innerHTML = "";
    if (QUESTION.image) {
      const image = document.createElement("img");
      image.src = QUESTION.image;
      image.alt = QUESTION.imageAlt || "";
      el.slot.appendChild(image);
      return;
    }
    const emoji = document.createElement("span");
    emoji.className = "situation-slot-emoji";
    emoji.setAttribute("role", "img");
    emoji.setAttribute("aria-label", QUESTION.imageAlt || "");
    emoji.textContent = QUESTION.icon;
    el.slot.appendChild(emoji);
  }

  function eachOptionButton(callback) {
    if (!el.options) return;
    options.forEach(function (option) {
      const button = el.options.querySelector('[data-situation-id="' + option.id + '"]');
      if (button) callback(button, option);
    });
  }

  function renderOptions() {
    if (!el.options) return;
    el.options.innerHTML = "";
    options.forEach(function (option) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "situation-option";
      button.dataset.situationId = option.id;
      button.setAttribute("aria-pressed", "false");

      const letter = document.createElement("span");
      letter.className = "situation-letter";
      letter.setAttribute("aria-hidden", "true");
      letter.textContent = option.letter;

      const text = document.createElement("span");
      text.className = "situation-option-text";
      text.textContent = option.text;

      button.appendChild(letter);
      button.appendChild(text);
      button.addEventListener("click", function () {
        selectOption(option.id);
      });
      el.options.appendChild(button);
    });
  }

  function paintSelection() {
    eachOptionButton(function (button, option) {
      const isSelected = option.id === selectedId;
      button.classList.toggle("selected", isSelected);
      button.setAttribute("aria-pressed", isSelected ? "true" : "false");
    });
    if (el.submit) el.submit.disabled = !selectedId || submitted;
  }

  function updateStatus() {
    if (!el.status) return;
    let text = "当前状态：待作答";
    if (submitted) text = "当前状态：已提交";
    else if (selectedId) text = "当前状态：已选择";
    setText(el.status, text);
  }

  function resetFeedback() {
    if (!el.feedback) return;
    el.feedback.classList.add("hidden");
    el.feedback.classList.remove("is-correct", "is-wrong");
    setText(el.feedbackIcon, "");
    setText(el.feedbackTitle, "");
    setText(el.feedbackAnswer, "");
    setText(el.feedbackCopy, "");
  }

  function showFeedback(isCorrect, correctOption) {
    if (!el.feedback || !correctOption) return;
    el.feedback.classList.remove("is-correct", "is-wrong");
    el.feedback.classList.add(isCorrect ? "is-correct" : "is-wrong");
    setText(el.feedbackIcon, isCorrect ? "✓" : "✗");
    setText(el.feedbackTitle, isCorrect ? "答对了！" : "再想想");
    const answerLead = isCorrect ? "这个场合这样说最合适。" : "更合适的说法：";
    const answerQuote = isCorrect
      ? correctOption.text
      : correctOption.letter + " " + correctOption.text;
    el.feedbackAnswer.textContent = "";
    el.feedbackAnswer.appendChild(document.createTextNode(answerLead));
    if (isCorrect) {
      const quote = document.createElement("span");
      quote.className = "situation-feedback-quote";
      quote.textContent = answerQuote;
      el.feedbackAnswer.appendChild(quote);
    } else {
      el.feedbackAnswer.appendChild(document.createTextNode(answerQuote));
    }
    setText(el.feedbackCopy, buildExplanation());
    el.feedback.classList.remove("hidden");
  }

  /* 解析里要说清楚另外两句为什么不合适：
     选项每次进页面都会打乱，所以字母按当前屏幕上的 A / B / C 现算，
     不能写死在数据里，不然说的就不是同一句了 */
  function buildExplanation() {
    const others = options.filter(function (option) {
      return !option.correct && option.why;
    });
    const why = others.map(function (option) {
      return option.letter + " " + option.why;
    });
    if (!why.length) return QUESTION.reason;
    return QUESTION.reason + "；" + why.join("，") + "。";
  }

  function selectOption(id) {
    if (submitted) return;
    selectedId = selectedId === id ? "" : id;
    paintSelection();
    updateStatus();
  }

  function completeOnce() {
    if (finished) return null;
    finished = true;
    const bridge = activityBridge();
    if (!bridge || typeof bridge.finish !== "function") return { recorded: false, next: "" };
    return bridge.finish({ correct: lastCorrect, seconds: lastSeconds, delay: CLASS_REDIRECT_DELAY });
  }

  function showModal() {
    if (!el.modal) return;
    setText(el.modalBadge, lastCorrect ? "🎉" : "💪");
    setText(el.modalTitle, lastCorrect ? "答对了，真棒！" : "再想想也没关系");
    setText(el.modalId, lastCorrect ? "Bagus! Jawabanmu benar." : "Tidak apa-apa, coba lagi ya!");
    setText(el.modalCopy, lastCorrect
      ? "这个场合这样说最合适，可以换一个题型再练一练，或者回到课堂。"
      : "更得体的说法和解析就在上面，可以换一个题型再练一练。");
    el.modal.classList.remove("hidden");
    if (el.modalChange && typeof el.modalChange.focus === "function") el.modalChange.focus();
  }

  function hideModal() {
    if (el.modal) el.modal.classList.add("hidden");
  }

  function submitAnswer() {
    if (submitted || !selectedId) return;
    submitted = true;
    lastSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));

    const correctOption = options.filter(function (option) {
      return option.correct;
    })[0];
    lastCorrect = !!correctOption && selectedId === correctOption.id;

    eachOptionButton(function (button, option) {
      button.disabled = true;
      if (option.correct) button.classList.add("correct");
      else if (option.id === selectedId) button.classList.add("wrong");
    });

    if (el.submit) {
      el.submit.disabled = true;
      el.submit.textContent = "已提交";
    }

    showFeedback(lastCorrect, correctOption);
    updateStatus();
    if (el.feedback) {
      if (typeof el.feedback.focus === "function") el.feedback.focus({ preventScroll: true });
      if (typeof el.feedback.scrollIntoView === "function") el.feedback.scrollIntoView({ block: "center" });
    }

    const outcome = completeOnce();
    if (outcome && outcome.recorded) {
      setText(el.status, outcome.next === "complete.html"
        ? "已提交，正在进入完成页…"
        : "已提交，正在返回课堂继续下一题…");
      return;
    }
    modalTimer = global.setTimeout(showModal, SOLO_MODAL_DELAY);
  }

  function startQuestion() {
    global.clearTimeout(modalTimer);
    hideModal();

    submitted = false;
    finished = false;
    lastCorrect = false;
    selectedId = "";
    startedAt = Date.now();
    options = shuffle(QUESTION.options).map(function (option, index) {
      return {
        id: option.id,
        letter: LETTERS[index] || "?",
        text: option.text,
        why: option.why || "",
        correct: option.correct === true
      };
    });

    setText(el.sceneId, QUESTION.sceneId || "");
    setText(el.scene, QUESTION.scene);
    renderScenarioSlot();
    renderOptions();
    resetFeedback();
    if (el.submit) {
      el.submit.disabled = true;
      el.submit.textContent = "提交答案";
    }
    updateStatus();
  }

  function bindEvents() {
    if (el.submit) el.submit.addEventListener("click", submitAnswer);
    [el.modalChange, el.modalReturn].forEach(function (link) {
      if (!link) return;
      link.addEventListener("click", function () {
        completeOnce();
      });
    });
  }

  function boot() {
    cache();
    applyShellText();
    bindEvents();
    startQuestion();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  document.addEventListener("DOMContentLoaded", applyShellText);

  global.AICloudSituationPage = { boot: boot, startQuestion: startQuestion };
})(typeof window !== "undefined" ? window : globalThis);
