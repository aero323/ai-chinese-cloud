/* 对话补全 · interaction-dialogue.html 页面脚本
   状态机：待作答 → 已选择 → 已提交 → 正确 / 错误（每题只判一次，不提供重试）。
   提交后把选中的句子填进右边气泡，学生能直接看出对话是否通顺。
   进度记账和课堂跳转都由 shared/activity-bridge.js 负责，本页只做界面并调用 finish()。 */
(function (global) {
  "use strict";

  const LETTERS = ["A", "B", "C", "D", "E", "F"];
  const SOLO_MODAL_DELAY = 2000;      // 体验模式：提交后留多久看对错，再弹完成弹窗
  const CLASS_REDIRECT_DELAY = 2600;  // 课堂模式：公共脚本按这个延迟跳转

  /* 单题数据：候选句顺序固定 A / B / C，和任务书一致，不做打乱。
     icon / image / imageAlt 是留给以后可选场景小图槽（72×72）的字段，
     本批不渲染图槽，样式位置已经在 interaction-dialogue.css 里留好。 */
  const QUESTION = {
    id: "restroom",
    icon: "🚻",
    image: "",
    imageAlt: "洗手间的标志",
    prompt: "选出合适的下一句",
    options: [
      { id: "a", text: "在二楼，往左走。", correct: true },
      { id: "b", text: "我叫小明。" },
      { id: "c", text: "今天很热。" }
    ],
    explanation: "上一句问的是「在哪儿」，所以要回答位置；B 是在自我介绍，C 是在说天气，都接不上。"
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

  function cache() {
    el.question = document.querySelector("[data-dialogue-question]");
    el.me = document.querySelector("[data-dialogue-me]");
    el.mark = document.querySelector("[data-dialogue-mark]");
    el.correctLine = document.querySelector("[data-dialogue-correct-line]");
    el.options = document.querySelector("[data-dialogue-options]");
    el.submit = document.querySelector("[data-dialogue-submit]");
    el.feedback = document.querySelector("[data-dialogue-feedback]");
    el.feedbackIcon = document.querySelector("[data-dialogue-feedback-icon]");
    el.feedbackTitle = document.querySelector("[data-dialogue-feedback-title]");
    el.feedbackAnswer = document.querySelector("[data-dialogue-feedback-answer]");
    el.feedbackCopy = document.querySelector("[data-dialogue-feedback-copy]");
    el.status = document.querySelector("[data-activity-status]");
    el.badgeIcon = document.querySelector("[data-dialogue-type-icon]");
    el.badgeName = document.querySelector("[data-dialogue-type-name]");
    el.modal = document.querySelector("[data-dialogue-complete]");
    el.modalBadge = document.querySelector("[data-dialogue-modal-badge]");
    el.modalTitle = document.querySelector("[data-dialogue-modal-title]");
    el.modalId = document.querySelector("[data-dialogue-modal-id]");
    el.modalCopy = document.querySelector("[data-dialogue-modal-copy]");
    el.modalChange = document.querySelector("[data-dialogue-change]");
    el.modalReturn = document.querySelector("[data-dialogue-return]");
  }

  function activityBridge() {
    return global.AICloudActivity || null;
  }

  function activityMeta() {
    const types = global.AICloudActivityTypes;
    const type = document.body.dataset.activityType || "dialogue";
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

  function eachOptionButton(callback) {
    if (!el.options) return;
    options.forEach(function (option) {
      const button = el.options.querySelector('[data-dialogue-id="' + option.id + '"]');
      if (button) callback(button, option);
    });
  }

  function renderOptions() {
    if (!el.options) return;
    el.options.innerHTML = "";
    options.forEach(function (option) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dialogue-option";
      button.dataset.dialogueId = option.id;
      button.setAttribute("aria-pressed", "false");

      const letter = document.createElement("span");
      letter.className = "dialogue-letter";
      letter.setAttribute("aria-hidden", "true");
      letter.textContent = option.letter;

      const text = document.createElement("span");
      text.className = "dialogue-option-text";
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

  /* 提交后把选中的句子填进右边气泡；选对了保持主色并给对勾，选错了变红 */
  function fillBubble(picked, isCorrect) {
    if (!el.me) return;
    setText(el.me, picked ? picked.text : "？");
    el.me.classList.toggle("is-placeholder", !picked);
    el.me.classList.toggle("is-wrong", !isCorrect);
    setHidden(el.mark, !isCorrect);
  }

  function showCorrectLine(correctOption) {
    if (!el.correctLine || !correctOption) return;
    setText(el.correctLine, "正确的下一句：" + correctOption.text);
    setHidden(el.correctLine, false);
  }

  /* 全对：绿色「答对了！」＋ 一行解析；有错：红色「再想想」＋ 正确的下一句 ＋ 解析 */
  function showFeedback(isCorrect, correctOption) {
    if (!el.feedback || !correctOption) return;
    el.feedback.classList.remove("is-correct", "is-wrong");
    el.feedback.classList.add(isCorrect ? "is-correct" : "is-wrong");
    setText(el.feedbackIcon, isCorrect ? "✓" : "✗");
    setText(el.feedbackTitle, isCorrect ? "答对了！" : "再想想");
    setText(el.feedbackAnswer, "正确的下一句：" + correctOption.text);
    setHidden(el.feedbackAnswer, isCorrect);
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
      : "正确的下一句和解析就在上面，可以换一个题型再练一练。");
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
    const picked = options.filter(function (option) {
      return option.id === selectedId;
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

    fillBubble(picked, lastCorrect);
    if (!lastCorrect) showCorrectLine(correctOption);
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
    options = QUESTION.options.map(function (option, index) {
      return {
        id: option.id,
        letter: LETTERS[index] || "?",
        text: option.text,
        correct: option.correct === true
      };
    });

    setText(el.question, QUESTION.prompt);
    if (el.me) {
      setText(el.me, "？");
      el.me.classList.add("is-placeholder");
      el.me.classList.remove("is-wrong");
    }
    setHidden(el.mark, true);
    setHidden(el.correctLine, true);
    setText(el.correctLine, "");

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

  global.AICloudDialoguePage = { boot: boot, startQuestion: startQuestion };
})(typeof window !== "undefined" ? window : globalThis);
