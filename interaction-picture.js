/* 看图单选 · interaction-picture.html 页面脚本
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
    id: "cat",
    icon: "🐱",
    image: "",
    imageAlt: "一只猫",
    prompt: "这是什么？",
    promptPinyin: "Zhè shì shénme?",
    options: [
      { id: "cat", text: "猫", pinyin: "māo", correct: true },
      { id: "dog", text: "狗", pinyin: "gǒu" },
      { id: "bird", text: "鸟", pinyin: "niǎo" },
      { id: "fish", text: "鱼", pinyin: "yú" }
    ],
    explanation: "「猫」是家里常见的小动物，māo；「狗」是 gǒu。"
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
    el.slot = document.querySelector("[data-picture-slot]");
    el.answer = document.querySelector("[data-picture-answer]");
    el.answerWord = document.querySelector("[data-picture-answer-word]");
    el.answerPinyin = document.querySelector("[data-picture-answer-pinyin]");
    el.pinyin = document.querySelector("[data-picture-pinyin]");
    el.stem = document.querySelector("[data-picture-question]");
    el.options = document.querySelector("[data-picture-options]");
    el.submit = document.querySelector("[data-picture-submit]");
    el.feedback = document.querySelector("[data-picture-feedback]");
    el.feedbackIcon = document.querySelector("[data-picture-feedback-icon]");
    el.feedbackTitle = document.querySelector("[data-picture-feedback-title]");
    el.feedbackAnswer = document.querySelector("[data-picture-feedback-answer]");
    el.feedbackCopy = document.querySelector("[data-picture-feedback-copy]");
    el.status = document.querySelector("[data-activity-status]");
    el.badgeIcon = document.querySelector("[data-picture-type-icon]");
    el.badgeName = document.querySelector("[data-picture-type-name]");
    el.modal = document.querySelector("[data-picture-complete]");
    el.modalBadge = document.querySelector("[data-picture-modal-badge]");
    el.modalTitle = document.querySelector("[data-picture-modal-title]");
    el.modalId = document.querySelector("[data-picture-modal-id]");
    el.modalCopy = document.querySelector("[data-picture-modal-copy]");
    el.modalChange = document.querySelector("[data-picture-change]");
    el.modalReturn = document.querySelector("[data-picture-return]");
  }

  function activityBridge() {
    return global.AICloudActivity || null;
  }

  function activityMeta() {
    const types = global.AICloudActivityTypes;
    const type = document.body.dataset.activityType || "picture";
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
    if (!meta) return;
    setText(el.badgeIcon, meta.icon);
    setText(el.badgeName, meta.title);
    const back = document.querySelector("[data-activity-back]");
    if (back) {
      const isClass = mode() === "class";
      back.setAttribute("href", "classroom.html");
      back.setAttribute("aria-label", isClass ? "返回课堂互动" : "返回课堂");
    }
  }

  /* 图槽：image 有值渲染 <img src alt>，为空渲染套了 role="img" 的 emoji */
  function renderPictureSlot() {
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
    emoji.className = "picture-slot-emoji";
    emoji.setAttribute("role", "img");
    emoji.setAttribute("aria-label", QUESTION.imageAlt || "");
    emoji.textContent = QUESTION.icon;
    el.slot.appendChild(emoji);
  }

  function eachOptionButton(callback) {
    if (!el.options) return;
    options.forEach(function (option) {
      const button = el.options.querySelector('[data-picture-id="' + option.id + '"]');
      if (button) callback(button, option);
    });
  }

  function renderOptions() {
    if (!el.options) return;
    el.options.innerHTML = "";
    options.forEach(function (option) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "picture-option";
      button.dataset.pictureId = option.id;
      button.setAttribute("aria-pressed", "false");

      const letter = document.createElement("span");
      letter.className = "picture-letter";
      letter.setAttribute("aria-hidden", "true");
      letter.textContent = option.letter;

      const text = document.createElement("span");
      text.className = "picture-option-text";
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
    setHidden(el.feedbackAnswer, true);
  }

  /* 提交后图槽下方出现答案文字和拼音 */
  function showAnswerCaption(correctOption) {
    if (!el.answer || !correctOption) return;
    setText(el.answerWord, correctOption.text);
    setText(el.answerPinyin, correctOption.pinyin || "");
    setHidden(el.answer, false);
  }

  function showFeedback(isCorrect, correctOption) {
    if (!el.feedback || !correctOption) return;
    el.feedback.classList.remove("is-correct", "is-wrong");
    el.feedback.classList.add(isCorrect ? "is-correct" : "is-wrong");
    setText(el.feedbackIcon, isCorrect ? "✓" : "✗");
    setText(el.feedbackTitle, isCorrect ? "答对了！" : "再想想");
    setText(el.feedbackAnswer, isCorrect
      ? "图上是 " + correctOption.text + " " + correctOption.pinyin
      : "正确答案：" + correctOption.letter + " " + correctOption.text + " " + correctOption.pinyin);
    setHidden(el.feedbackAnswer, false);
    setText(el.feedbackCopy, QUESTION.explanation);
    el.feedback.classList.remove("hidden");
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
      ? "本题已完成，可以换一个题型再练一练，或者回到课堂。"
      : "正确答案和解析就在上面，可以换一个题型再练一练。");
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

    showAnswerCaption(correctOption);
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
        pinyin: option.pinyin || "",
        correct: option.correct === true
      };
    });

    setText(el.pinyin, QUESTION.promptPinyin || "");
    setHidden(el.pinyin, !QUESTION.promptPinyin);
    setText(el.stem, QUESTION.prompt);
    setHidden(el.answer, true);

    renderPictureSlot();
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

  global.AICloudPicturePage = { boot: boot, startQuestion: startQuestion };
})(typeof window !== "undefined" ? window : globalThis);
