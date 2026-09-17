/* 补全句子 · interaction-fill.html 页面脚本（词库填空版）
   点词库里的词 → 填进最左边的空；点句子中已填的词 → 退回词库原位置。
   状态机：待作答 → 已选择（空都填了）→ 已提交（每题只提交一次）→ 正确 / 错误 */
(function () {
  "use strict";

  const bridge = window.AICloudActivity;
  const types = window.AICloudActivityTypes;

  // 模拟题目：字段结构与后台 InteractionPlayer 的 fill 题型一致，sentence 里 ____ 表示空
  const QUESTION = {
    id: "fill-greeting-1",
    sentence: "我每天 ____ 七点 ____，然后 ____ 学校。",
    blanks: [
      { id: "time", answer: "早上" },
      { id: "wake", answer: "起床" },
      { id: "go", answer: "去" }
    ],
    // 3 个正确词 + 2 个干扰词（填进去明显不通）
    words: [
      { id: "w-time", text: "早上", pinyin: "zǎo shang" },
      { id: "w-wake", text: "起床", pinyin: "qǐ chuáng" },
      { id: "w-go", text: "去", pinyin: "qù" },
      { id: "w-bag", text: "书包", pinyin: "shū bāo" },
      { id: "w-drink", text: "喝", pinyin: "hē" }
    ],
    explanation: "「早上」是时间词，放在「七点」前面；「起床」是睡醒后离开床；「去」后面接要去的地方。"
  };

  const STATE_TEXT = {
    idle: "当前状态：待作答（点下面的词，把它填进空里）",
    ready: "当前状态：已选择（所有空都填好了，可以提交）",
    submitted: "当前状态：已提交（每题只提交一次）",
    correct: "当前状态：已提交 · 正确（答对了！）",
    wrong: "当前状态：已提交 · 错误（看看正确答案，再练一次）"
  };

  const dom = {
    card: document.querySelector(".fill-card"),
    badge: document.querySelector("[data-fill-badge]"),
    sentence: document.querySelector("[data-fill-sentence]"),
    bank: document.querySelector("[data-fill-bank]"),
    clear: document.querySelector("[data-fill-clear]"),
    submit: document.querySelector("[data-fill-submit]"),
    progress: document.querySelector("[data-fill-progress]"),
    status: document.querySelector("[data-activity-status]"),
    live: document.querySelector("[data-fill-live]"),
    feedback: document.querySelector("[data-fill-feedback]"),
    feedbackIcon: document.querySelector("[data-fill-feedback-icon]"),
    verdict: document.querySelector("[data-fill-verdict]"),
    fullSentence: document.querySelector("[data-fill-full-sentence]"),
    answerLine: document.querySelector("[data-fill-answer-line]"),
    explanation: document.querySelector("[data-fill-explanation]"),
    modal: document.querySelector("[data-fill-complete]"),
    modalBadge: document.querySelector("[data-fill-modal-badge]"),
    modalTitle: document.querySelector("[data-fill-modal-title]"),
    modalCopy: document.querySelector("[data-fill-modal-copy]"),
    modalDescription: document.querySelector("[data-fill-modal-description]")
  };

  const blanks = QUESTION.blanks.map(function (item, index) {
    return { id: item.id, answer: item.answer, index: index, word: null, el: null, button: null, hint: null };
  });

  // 词块顺序每次进页面都打乱
  const words = shuffle(QUESTION.words).map(function (item) {
    return { id: item.id, text: item.text, pinyin: item.pinyin, home: null, button: null };
  });

  let state = "idle";
  let startedAt = Date.now();

  function shuffle(list) {
    const items = list.slice();
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const swap = items[i];
      items[i] = items[j];
      items[j] = swap;
    }
    return items;
  }

  function isLocked() {
    return state === "submitted" || state === "correct" || state === "wrong";
  }

  function emptyCount() {
    return blanks.filter(function (blank) { return !blank.word; }).length;
  }

  function wordOfBlank(blank) {
    return blank.word;
  }

  function announce(message) {
    if (dom.live) dom.live.textContent = message;
  }

  function setState(next) {
    state = next;
    if (dom.card) dom.card.dataset.fillState = next;
    if (dom.status) dom.status.textContent = STATE_TEXT[next] || "";
  }

  function fullSentenceText() {
    const parts = QUESTION.sentence.split("____");
    let text = "";
    parts.forEach(function (part, index) {
      text += part;
      if (index < blanks.length) text += blanks[index].answer;
    });
    return text;
  }

  /* ---------- 渲染 ---------- */

  function createBlankElement(blank) {
    const slotEl = document.createElement("span");
    slotEl.className = "fill-slot";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "fill-blank";
    button.dataset.blankId = blank.id;
    button.disabled = true;
    button.setAttribute("aria-label", "第 " + (blank.index + 1) + " 个空，还没有填");
    button.addEventListener("click", function (event) {
      takeBackWord(blank, event);
    });

    const hint = document.createElement("span");
    hint.className = "fill-blank-hint";
    hint.hidden = true;

    slotEl.appendChild(button);
    slotEl.appendChild(hint);

    blank.el = slotEl;
    blank.button = button;
    blank.hint = hint;
    return slotEl;
  }

  function renderSentence() {
    const parts = QUESTION.sentence.split("____");
    const fragment = document.createDocumentFragment();
    parts.forEach(function (part, index) {
      fragment.appendChild(document.createTextNode(part));
      if (index < blanks.length) fragment.appendChild(createBlankElement(blanks[index]));
    });
    dom.sentence.textContent = "";
    dom.sentence.appendChild(fragment);
  }

  function renderBank() {
    const fragment = document.createDocumentFragment();
    words.forEach(function (word) {
      const slotEl = document.createElement("span");
      slotEl.className = "fill-word";
      slotEl.dataset.wordId = word.id;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "fill-chip";
      button.dataset.wordId = word.id;
      button.setAttribute("aria-label", "选择词语 " + word.text);

      const text = document.createElement("strong");
      text.textContent = word.text;
      const pinyin = document.createElement("span");
      pinyin.textContent = word.pinyin;
      button.appendChild(text);
      button.appendChild(pinyin);

      button.addEventListener("click", function (event) {
        placeWord(word, event);
      });

      slotEl.appendChild(button);
      fragment.appendChild(slotEl);

      word.home = slotEl;
      word.button = button;
    });
    dom.bank.textContent = "";
    dom.bank.appendChild(fragment);
  }

  function updateBlank(blank) {
    const button = blank.button;
    const word = wordOfBlank(blank);
    if (word) {
      button.textContent = word.text;
      button.classList.add("is-filled");
      button.setAttribute("aria-label", "把词语 " + word.text + " 放回词库");
    } else {
      button.textContent = "";
      button.classList.remove("is-filled");
      button.setAttribute("aria-label", "第 " + (blank.index + 1) + " 个空，还没有填");
    }
    button.disabled = isLocked() || !word;
  }

  function updateWord(word) {
    const placed = blanks.some(function (blank) { return blank.word === word; });
    word.button.classList.toggle("is-placed", placed);
    word.button.disabled = placed || isLocked();
    word.home.classList.toggle("is-empty", placed);
  }

  /* ---------- 词块与空格的来回 ---------- */

  function firstEmptyBlank() {
    return blanks.filter(function (blank) { return !blank.word; })[0] || null;
  }

  function placeWord(word, event) {
    if (isLocked()) return;
    const blank = firstEmptyBlank();
    if (!blank) {
      announce("三个空都填好了，可以点提交答案，或者点句子里已填的词把它放回词库");
      return;
    }

    blank.word = word;
    updateBlank(blank);
    updateWord(word);
    syncReady();

    const left = emptyCount();
    announce(left > 0
      ? "已填入「" + word.text + "」，还剩 " + left + " 个空"
      : "已填入「" + word.text + "」，三个空都填好了，可以提交");

    if (event && event.detail === 0) focusNextChip(word);
  }

  function takeBackWord(blank, event) {
    if (isLocked()) return;
    const word = blank.word;
    if (!word) return;

    blank.word = null;
    updateBlank(blank);
    updateWord(word);
    syncReady();
    announce("已把「" + word.text + "」放回词库");

    if (event && event.detail === 0) word.button.focus();
  }

  function clearAll(event) {
    if (isLocked()) return;
    blanks.forEach(function (blank) {
      blank.word = null;
      updateBlank(blank);
    });
    words.forEach(updateWord);
    syncReady();
    announce("已全部放回词库，可以重新选择");

    if (event && event.detail === 0) {
      const first = words.filter(function (word) { return !word.button.disabled; })[0];
      if (first) first.button.focus();
    }
  }

  function focusNextChip(word) {
    const index = words.indexOf(word);
    const ordered = words.slice(index + 1).concat(words.slice(0, index));
    const next = ordered.filter(function (item) { return !item.button.disabled; })[0];
    if (next) {
      next.button.focus();
      return;
    }
    if (!dom.submit.disabled) dom.submit.focus();
    else if (!dom.clear.disabled) dom.clear.focus();
  }

  function syncReady() {
    if (isLocked()) return;
    const left = emptyCount();
    dom.submit.disabled = left > 0;
    dom.clear.disabled = left === blanks.length;
    dom.progress.textContent = left > 0 ? "还有 " + left + " 个空没填" : "所有空都填好了，可以提交";
    setState(left > 0 ? "idle" : "ready");
  }

  /* ---------- 提交与反馈 ---------- */

  function renderFeedback(allCorrect, misses) {
    dom.feedback.classList.remove("hidden");
    dom.feedback.classList.toggle("is-correct", allCorrect);
    dom.feedback.classList.toggle("is-wrong", !allCorrect);
    dom.feedbackIcon.textContent = allCorrect ? "🎉" : "🤔";
    dom.verdict.textContent = allCorrect ? "答对了！" : "再想想";

    if (allCorrect) {
      dom.fullSentence.textContent = fullSentenceText();
      dom.fullSentence.classList.remove("hidden");
      dom.answerLine.classList.add("hidden");
      dom.answerLine.textContent = "";
    } else {
      dom.fullSentence.classList.add("hidden");
      dom.fullSentence.textContent = "";
      dom.answerLine.classList.remove("hidden");
      dom.answerLine.textContent = "正确答案：" + misses.join(" / ");
    }
    dom.explanation.textContent = QUESTION.explanation;
  }

  function showCompleteModal(allCorrect, misses) {
    dom.modalBadge.textContent = allCorrect ? "🎉" : "💪";
    dom.modalTitle.textContent = allCorrect ? "全部答对，太棒了！" : "本题已提交，再练一次！";
    dom.modalCopy.textContent = allCorrect ? "Semua jawaban benar!" : "Sudah dikirim, ayo coba lagi!";
    dom.modalDescription.textContent = (allCorrect
      ? "本题已完成，"
      : "正确答案：" + misses.join(" / ") + "。") + "单独体验不计分，也不影响课堂进度；可以换一个题型，或回课堂看看。";
    dom.modal.classList.remove("hidden");
    const firstLink = dom.modal.querySelector("a");
    if (firstLink) firstLink.focus();
  }

  function reportFinish(allCorrect, results, misses, seconds) {
    const ctx = bridge && typeof bridge.context === "function" ? bridge.context() : { mode: "solo" };
    const isClass = ctx.mode === "class";
    const correctCount = results.filter(function (entry) { return entry.correct; }).length;

    if (!bridge || typeof bridge.finish !== "function") {
      window.setTimeout(function () { showCompleteModal(allCorrect, misses); }, allCorrect ? 1000 : 1800);
      return;
    }

    // 课堂模式由公共脚本记录进度并跳转，这里留 2 秒给学生看对错；体验模式不记账
    const outcome = bridge.finish({
      correct: allCorrect,
      seconds: seconds,
      delay: isClass ? 2000 : 0,
      detail: "补全句子：答对 " + correctCount + " / " + results.length + " 个空"
    }) || {};

    if (isClass) {
      dom.progress.textContent = outcome.next === "complete.html"
        ? "本题已完成，正在进入完成页…"
        : "本题已完成，正在返回课堂继续下一题…";
      return;
    }

    window.setTimeout(function () { showCompleteModal(allCorrect, misses); }, allCorrect ? 1000 : 1800);
  }

  function submit() {
    if (isLocked()) return;
    if (emptyCount() > 0) return;

    const results = blanks.map(function (blank) {
      return { blank: blank, correct: blank.word.text === blank.answer };
    });
    const allCorrect = results.every(function (entry) { return entry.correct; });
    const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const misses = [];

    setState("submitted");
    dom.submit.disabled = true;
    dom.clear.disabled = true;
    dom.bank.classList.add("is-locked");
    dom.progress.textContent = "本题已提交，答案已锁定";

    results.forEach(function (entry) {
      const blank = entry.blank;
      blank.button.disabled = true;
      blank.button.classList.add(entry.correct ? "is-correct" : "is-wrong");
      blank.el.classList.add(entry.correct ? "is-correct" : "is-wrong");
      if (entry.correct) return;
      misses.push(blank.answer);
      blank.hint.textContent = "正确答案：" + blank.answer;
      blank.hint.hidden = false;
    });

    words.forEach(function (word) { word.button.disabled = true; });

    renderFeedback(allCorrect, misses);
    setState(allCorrect ? "correct" : "wrong");
    reportFinish(allCorrect, results, misses, seconds);
  }

  function boot() {
    const ctx = bridge && typeof bridge.context === "function" ? bridge.context() : { type: "fill", mode: "solo" };
    const meta = types && typeof types.get === "function" ? (types.get(ctx.type) || types.get("fill")) : null;
    if (meta && dom.badge) dom.badge.textContent = meta.icon + " " + meta.title;

    renderSentence();
    renderBank();
    words.forEach(updateWord);
    blanks.forEach(updateBlank);

    dom.submit.addEventListener("click", submit);
    dom.clear.addEventListener("click", clearAll);

    startedAt = Date.now();
    setState("idle");
    syncReady();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
