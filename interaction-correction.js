/* 找错误/改错 · interaction-correction.html 页面脚本
   状态机：待作答 → 已选择 → 已提交 → 正确 / 错误（每题只判一次，不提供重试）。
   第一版只做「用错的词」这一种错误类型：一句话里只有一个错点，选中它才算对；
   提交后一定给出改好的整句，这是改错题的价值。
   进度记账和课堂跳转都由 shared/activity-bridge.js 负责，本页只做界面并调用 finish()。 */
(function (global) {
  "use strict";

  const SOLO_MODAL_DELAY = 2000;      // 体验模式：提交后留多久看对错，再弹完成弹窗
  const CLASS_REDIRECT_DELAY = 2600;  // 课堂模式：公共脚本按这个延迟跳转

  /* 单题数据（任务书 6.4 的例子）：words 按原句顺序横排，wrong 标出唯一的错点 */
  const QUESTION = {
    id: "liangci-ben",
    prompt: "下面这句话里有一个词用错了，点出来。",
    promptId: "Di kalimat ini ada satu kata yang salah. Ketuk kata itu.",
    words: [
      { id: "wo", text: "我", pinyin: "wǒ" },
      { id: "mai", text: "买", pinyin: "mǎi" },
      { id: "yi", text: "一", pinyin: "yī" },
      { id: "zhang", text: "张", pinyin: "zhāng", wrong: true },
      { id: "shu", text: "书", pinyin: "shū" },
      { id: "dot", text: "。", pinyin: "" }
    ],
    fixText: "本",                  // 正确的是哪个词
    fixedSentence: "我买一本书。",   // 改好的整句（反馈里一定要给）
    fixedPinyin: "Wǒ mǎi yì běn shū.",
    explain: "「书」要用量词「本」——一本；「张」用来数纸、桌子、床。",
    explainId: "Kalimat yang benar: Wǒ mǎi yì běn shū. Kata 「书」memakai kata bantu bilangan 「本」(一本); 「张」dipakai untuk kertas, meja, dan ranjang."
  };

  const el = {};
  let tiles = [];         // [{ word, button }]，按句子顺序
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
    el.prompt = document.querySelector("[data-correction-prompt]");
    el.promptId = document.querySelector("[data-correction-prompt-id]");
    el.sentence = document.querySelector("[data-correction-sentence]");
    el.submit = document.querySelector("[data-correction-submit]");
    el.feedback = document.querySelector("[data-correction-feedback]");
    el.feedbackIcon = document.querySelector("[data-correction-feedback-icon]");
    el.feedbackTitle = document.querySelector("[data-correction-feedback-title]");
    el.feedbackTitleId = document.querySelector("[data-correction-feedback-title-id]");
    el.feedbackAnswer = document.querySelector("[data-correction-feedback-answer]");
    el.fixedSentence = document.querySelector("[data-correction-fixed-sentence]");
    el.fixedPinyin = document.querySelector("[data-correction-fixed-pinyin]");
    el.feedbackCopy = document.querySelector("[data-correction-feedback-copy]");
    el.feedbackId = document.querySelector("[data-correction-feedback-id]");
    el.announcer = document.querySelector("[data-correction-announcer]");
    el.status = document.querySelector("[data-activity-status]");
    el.badgeIcon = document.querySelector("[data-correction-type-icon]");
    el.badgeName = document.querySelector("[data-correction-type-name]");
    el.modal = document.querySelector("[data-correction-complete]");
    el.modalBadge = document.querySelector("[data-correction-modal-badge]");
    el.modalTitle = document.querySelector("[data-correction-modal-title]");
    el.modalId = document.querySelector("[data-correction-modal-id]");
    el.modalCopy = document.querySelector("[data-correction-modal-copy]");
    el.modalChange = document.querySelector("[data-correction-change]");
    el.modalReturn = document.querySelector("[data-correction-return]");
  }

  function activityBridge() {
    return global.AICloudActivity || null;
  }

  function activityMeta() {
    const types = global.AICloudActivityTypes;
    const type = document.body.dataset.activityType || "correction";
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

  function wordFor(id) {
    return QUESTION.words.filter(function (word) { return word.id === id; })[0] || null;
  }

  function wrongWord() {
    return QUESTION.words.filter(function (word) { return word.wrong === true; })[0] || null;
  }

  function labelOf(word) {
    return word.pinyin ? word.text + " " + word.pinyin : word.text;
  }

  function announce(message) {
    if (el.announcer) el.announcer.textContent = message;
  }

  function addMark(button, text) {
    const mark = document.createElement("span");
    mark.className = "correction-word-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = text;
    button.appendChild(mark);
  }

  function renderSentence() {
    if (!el.sentence) return;
    el.sentence.textContent = "";
    tiles = QUESTION.words.map(function (word) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "correction-word";
      button.dataset.correctionId = word.id;
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", "点选 " + labelOf(word));

      const text = document.createElement("strong");
      text.className = "correction-word-text";
      text.textContent = word.text;
      button.appendChild(text);

      if (word.pinyin) {
        const pinyin = document.createElement("small");
        pinyin.className = "correction-word-pinyin";
        pinyin.textContent = word.pinyin;
        button.appendChild(pinyin);
      } else {
        button.classList.add("is-punct");
      }

      button.addEventListener("click", function () {
        selectWord(word.id);
      });
      el.sentence.appendChild(button);
      return { word: word, button: button };
    });
  }

  function paintSelection() {
    tiles.forEach(function (tile) {
      const isPicked = tile.word.id === selectedId;
      tile.button.classList.toggle("is-selected", isPicked);
      tile.button.setAttribute("aria-pressed", isPicked ? "true" : "false");
    });
    if (el.submit) el.submit.disabled = !selectedId;
  }

  function updateStatus() {
    if (!el.status) return;
    let text = "当前状态：待作答";
    if (submitted) text = "当前状态：已提交";
    else if (selectedId) text = "当前状态：已选择（" + wordFor(selectedId).text + "）";
    setText(el.status, text);
  }

  function resetFeedback() {
    if (!el.feedback) return;
    el.feedback.classList.add("hidden");
    el.feedback.classList.remove("is-correct", "is-wrong");
    setText(el.feedbackIcon, "");
    setText(el.feedbackTitle, "");
    setText(el.feedbackTitleId, "");
    setText(el.feedbackAnswer, "");
    setText(el.feedbackCopy, "");
    setText(el.feedbackId, "");
  }

  /* 单词块只有一种状态：点一下选中，点别的词块换过去，再点自己取消 */
  function selectWord(id) {
    if (submitted) return;
    selectedId = selectedId === id ? "" : id;
    paintSelection();
    updateStatus();
    const word = wordFor(id);
    announce(selectedId
      ? "已选中：" + labelOf(word)
      : "已取消选择");
  }

  /* 提交后：真正错的词块标红；选对了加「✓ 找到了」，选错了打灰叉 */
  function lockSentence() {
    const error = wrongWord();
    tiles.forEach(function (tile) {
      const button = tile.button;
      const word = tile.word;
      button.disabled = true;
      button.classList.remove("is-selected");
      button.setAttribute("aria-pressed", "false");
      if (error && word.id === error.id) {
        if (lastCorrect) {
          button.classList.add("is-found");
          addMark(button, "✓ 找到了");
          button.setAttribute("aria-label", "「" + word.text + "」就是用错的词，你找到了");
        } else {
          button.classList.add("is-error");
          addMark(button, "错在这里");
          button.setAttribute("aria-label", "「" + word.text + "」用错了，应该改成「" + QUESTION.fixText + "」");
        }
      } else if (word.id === selectedId) {
        button.classList.add("is-miss");
        addMark(button, "✕");
        button.setAttribute("aria-label", "「" + word.text + "」是你选的词，这里没有错");
      }
    });
  }

  function showFeedback(isCorrect, error) {
    if (!el.feedback) return;
    el.feedback.classList.remove("is-correct", "is-wrong");
    el.feedback.classList.add(isCorrect ? "is-correct" : "is-wrong");
    setText(el.feedbackIcon, isCorrect ? "✓" : "✗");
    setText(el.feedbackTitle, isCorrect ? "找对了！" : "再想想");
    setText(el.feedbackTitleId, isCorrect
      ? "Kamu menemukan kata yang salah!"
      : "Belum tepat. Lihat kalimat yang benar ya.");
    setText(el.feedbackAnswer, isCorrect
      ? "应该是：" + QUESTION.fixText
      : "正确答案：「" + error.text + "」应该改成「" + QUESTION.fixText + "」");
    setText(el.fixedSentence, QUESTION.fixedSentence);
    setText(el.fixedPinyin, QUESTION.fixedPinyin);
    setText(el.feedbackCopy, "解析：" + QUESTION.explain);
    setText(el.feedbackId, QUESTION.explainId);
    el.feedback.classList.remove("hidden");
  }

  function completeOnce() {
    if (finished) return null;
    finished = true;
    const bridge = activityBridge();
    if (!bridge || typeof bridge.finish !== "function") return { recorded: false, next: "" };
    const picked = wordFor(selectedId);
    return bridge.finish({
      correct: lastCorrect,
      seconds: lastSeconds,
      detail: picked ? "选了「" + picked.text + "」" : "",
      delay: CLASS_REDIRECT_DELAY
    });
  }

  function showModal() {
    if (!el.modal) return;
    setText(el.modalBadge, lastCorrect ? "🎉" : "💪");
    setText(el.modalTitle, lastCorrect ? "找对了，真棒！" : "本题已提交");
    setText(el.modalId, lastCorrect
      ? "Hebat, kamu menemukan kata yang salah!"
      : "Lihat kalimat yang benar ya!");
    setText(el.modalCopy, lastCorrect
      ? "本题已完成，可以换一个题型再练一练，或者回到课堂。"
      : "正确答案就在上面：" + QUESTION.fixedSentence + "可以换一个题型再练一练。");
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

    const error = wrongWord();
    lastCorrect = !!error && selectedId === error.id;

    lockSentence();
    if (el.submit) {
      el.submit.disabled = true;
      el.submit.textContent = "已提交";
    }

    showFeedback(lastCorrect, error || { text: "" });
    updateStatus();
    announce(lastCorrect
      ? "找对了！应该是：" + QUESTION.fixText + "。" + QUESTION.fixedSentence
      : "再想想。「" + (error ? error.text : "") + "」应该改成「" + QUESTION.fixText + "」。" + QUESTION.fixedSentence);
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

    setText(el.prompt, QUESTION.prompt);
    setText(el.promptId, QUESTION.promptId);
    setHidden(el.promptId, !QUESTION.promptId);
    renderSentence();
    resetFeedback();
    if (el.submit) {
      el.submit.disabled = true;
      el.submit.textContent = "提交";
    }
    updateStatus();
    announce("待作答。" + QUESTION.prompt);
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

  global.AICloudCorrectionPage = { boot: boot, startQuestion: startQuestion };
})(typeof window !== "undefined" ? window : globalThis);
