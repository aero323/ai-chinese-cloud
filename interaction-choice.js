/* 快速选择 / 单选 · 多选 —— 黄金样板页脚本
   页面给事实（对错 + 正确答案），弹窗给情绪（句池来自 shared/feedback-copy.js）。 */
(function (global) {
  "use strict";

  const LETTERS = ["A", "B", "C", "D", "E", "F"];
  const MODAL_DELAY = 1400;
  const CLASS_REDIRECT_DELAY = 2600;

  const QUESTIONS = {
    single: {
      multiple: false,
      stem: "你想喝什么？",
      pinyin: "Nǐ xiǎng hē shénme?",
      options: [
        { text: "一杯茶", correct: true },
        { text: "一碗米饭" },
        { text: "一本书" },
        { text: "一件衣服" }
      ]
    },
    multiple: {
      multiple: true,
      stem: "下面哪些是水果？",
      pinyin: "Xiàmiàn nǎxiē shì shuǐguǒ?",
      options: [
        { text: "苹果", correct: true },
        { text: "香蕉", correct: true },
        { text: "桌子" },
        { text: "西瓜", correct: true }
      ]
    }
  };

  const el = {};
  const modal = global.AICloudFeedbackModal || null;
  const copy = global.AICloudFeedbackCopy || {};

  let variant = "single";
  let options = [];
  let selected = [];
  let submitted = false;
  let finished = false;
  let attempts = 0;
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
    el.options = document.querySelector("[data-choice-options]");
    el.stem = document.querySelector("[data-choice-question]");
    el.pinyin = document.querySelector("[data-choice-pinyin]");
    el.submit = document.querySelector("[data-choice-submit]");
    el.feedback = document.querySelector("[data-choice-feedback]");
    el.feedbackIcon = document.querySelector("[data-choice-feedback-icon]");
    el.feedbackTitle = document.querySelector("[data-choice-feedback-title]");
    el.feedbackAnswer = document.querySelector("[data-choice-feedback-answer]");
  }

  function activityBridge() {
    return global.AICloudActivity || null;
  }

  function mode() {
    const bridge = activityBridge();
    if (!bridge || typeof bridge.context !== "function") return "solo";
    return bridge.context().mode;
  }

  function applyShellText() {
    const back = document.querySelector("[data-activity-back]");
    if (!back) return;
    const isClass = mode() === "class";
    back.setAttribute("href", "classroom.html");
    back.setAttribute("aria-label", isClass ? "返回课堂互动" : "返回课堂");
  }

  function eachOptionButton(callback) {
    if (!el.options) return;
    options.forEach(function (option) {
      const button = el.options.querySelector('[data-choice-id="' + option.id + '"]');
      if (button) callback(button, option);
    });
  }

  function closeModal() {
    if (modal && typeof modal.close === "function") modal.close();
  }

  function resetFeedback() {
    if (!el.feedback) return;
    el.feedback.classList.add("hidden");
    el.feedback.classList.remove("is-correct", "is-wrong");
    setText(el.feedbackIcon, "");
    setText(el.feedbackTitle, "");
    setText(el.feedbackAnswer, "");
    setHidden(el.feedbackAnswer, true);
  }

  function paintSelection() {
    eachOptionButton(function (button, option) {
      const isSelected = selected.indexOf(option.id) >= 0;
      button.classList.toggle("selected", isSelected);
      button.setAttribute("aria-pressed", isSelected ? "true" : "false");
    });
    if (el.submit) el.submit.disabled = selected.length === 0;
  }

  function renderOptions() {
    if (!el.options) return;
    el.options.innerHTML = "";
    options.forEach(function (option) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-option";
      button.dataset.choiceId = option.id;
      button.setAttribute("aria-pressed", "false");

      const letter = document.createElement("span");
      letter.className = "choice-letter";
      letter.setAttribute("aria-hidden", "true");
      letter.textContent = option.letter;

      const text = document.createElement("span");
      text.className = "choice-option-text";
      text.textContent = option.text;

      button.appendChild(letter);
      button.appendChild(text);
      button.addEventListener("click", function () {
        toggleOption(option.id);
      });
      el.options.appendChild(button);
    });
  }

  function startQuestion() {
    const question = QUESTIONS[variant];
    global.clearTimeout(modalTimer);
    closeModal();

    submitted = false;
    finished = false;
    attempts = 0;
    lastCorrect = false;
    selected = [];
    startedAt = Date.now();
    options = shuffle(question.options).map(function (option, index) {
      return {
        id: variant + "-" + index,
        letter: LETTERS[index] || "?",
        text: option.text,
        correct: option.correct === true
      };
    });

    setText(el.pinyin, question.pinyin || "");
    setHidden(el.pinyin, !question.pinyin);
    setText(el.stem, question.stem);

    renderOptions();
    resetFeedback();
    if (el.submit) {
      el.submit.disabled = true;
      el.submit.textContent = "提交答案";
    }
  }

  /* 再练一次：清空作答、回到本题初始状态（选项不重排） */
  function restartQuestion() {
    global.clearTimeout(modalTimer);
    closeModal();
    submitted = false;
    finished = false;
    lastCorrect = false;
    selected = [];
    startedAt = Date.now();
    eachOptionButton(function (button) {
      button.disabled = false;
      button.classList.remove("selected", "correct", "wrong");
      button.setAttribute("aria-pressed", "false");
    });
    resetFeedback();
    if (el.submit) {
      el.submit.disabled = true;
      el.submit.textContent = "提交答案";
    }
  }

  function setVariant(key) {
    variant = QUESTIONS[key] ? key : "single";
    const chips = document.querySelectorAll("[data-choice-variant]");
    Array.prototype.forEach.call(chips, function (chip) {
      const active = chip.dataset.choiceVariant === variant;
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", active ? "true" : "false");
    });
    startQuestion();
  }

  function readVariantFromUrl() {
    try {
      const params = new URLSearchParams(global.location.search || "");
      const value = (params.get("variant") || "").toLowerCase();
      if (value === "multiple" || value === "multi" || value === "checkbox") return "multiple";
    } catch (error) {
      return "single";
    }
    return "single";
  }

  function toggleOption(id) {
    if (submitted) return;
    const question = QUESTIONS[variant];
    const index = selected.indexOf(id);
    if (index >= 0) {
      selected.splice(index, 1);
    } else if (question.multiple) {
      selected.push(id);
    } else {
      selected = [id];
    }
    paintSelection();
  }

  function showFeedback(isCorrect, correctOptions) {
    if (!el.feedback) return;
    el.feedback.classList.remove("is-correct", "is-wrong");
    el.feedback.classList.add(isCorrect ? "is-correct" : "is-wrong");
    setText(el.feedbackIcon, isCorrect ? "✓" : "");
    setText(el.feedbackTitle, isCorrect ? "答对了！" : "再想想");
    if (isCorrect) {
      setText(el.feedbackAnswer, "");
      setHidden(el.feedbackAnswer, true);
    } else {
      setText(el.feedbackAnswer, "正确答案：" + correctOptions.map(function (option) {
        return option.letter + " " + option.text;
      }).join("、"));
      setHidden(el.feedbackAnswer, false);
    }
    el.feedback.classList.remove("hidden");
  }

  function completeOnce() {
    if (finished) return null;
    finished = true;
    const bridge = activityBridge();
    if (!bridge || typeof bridge.finish !== "function") return { recorded: false, next: "" };
    return bridge.finish({ correct: lastCorrect, seconds: lastSeconds, delay: CLASS_REDIRECT_DELAY });
  }

  function openModal(isCorrect, praise) {
    if (!modal || typeof modal.open !== "function") return;
    modal.open({
      badge: isCorrect ? "🎉" : "💪",
      titleZh: praise ? praise.zh : "",
      titleId: praise ? praise.id : "",
      actions: [
        {
          label: "返回课堂",
          onSelect: function () {
            if (global.location) global.location.href = "classroom.html";
          }
        },
        { label: "↻ 再练一次", onSelect: restartQuestion }
      ]
    });
  }

  function submitAnswer() {
    if (submitted || selected.length === 0) return;
    submitted = true;
    attempts += 1;
    lastSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));

    const correctOptions = options.filter(function (option) {
      return option.correct;
    });
    const isCorrect = selected.length === correctOptions.length && correctOptions.every(function (option) {
      return selected.indexOf(option.id) >= 0;
    });
    lastCorrect = isCorrect;

    const firstTry = isCorrect && attempts === 1;
    const praise = typeof copy.draw === "function"
      ? copy.draw(isCorrect ? (firstTry ? "correctFirstTry" : "correct") : "wrong")
      : null;

    eachOptionButton(function (button, option) {
      button.disabled = true;
      if (option.correct) button.classList.add("correct");
      else if (selected.indexOf(option.id) >= 0) button.classList.add("wrong");
    });

    if (el.submit) {
      el.submit.disabled = true;
      el.submit.textContent = "已提交";
    }

    showFeedback(isCorrect, correctOptions);
    if (el.feedback && typeof el.feedback.scrollIntoView === "function") {
      el.feedback.scrollIntoView({ block: "center" });
    }

    const outcome = completeOnce();
    if (outcome && outcome.recorded) return;
    modalTimer = global.setTimeout(function () {
      openModal(isCorrect, praise);
    }, MODAL_DELAY);
  }

  function bindEvents() {
    if (el.submit) el.submit.addEventListener("click", submitAnswer);
    const chips = document.querySelectorAll("[data-choice-variant]");
    Array.prototype.forEach.call(chips, function (chip) {
      chip.addEventListener("click", function () {
        setVariant(chip.dataset.choiceVariant);
      });
    });
  }

  function boot() {
    cache();
    applyShellText();
    bindEvents();
    setVariant(readVariantFromUrl());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  document.addEventListener("DOMContentLoaded", applyShellText);

  global.AICloudChoicePage = { boot: boot, startQuestion: startQuestion };
})(typeof window !== "undefined" ? window : globalThis);
