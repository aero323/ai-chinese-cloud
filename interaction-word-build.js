/* 拼字/组词 · interaction-word-build.html 页面脚本
   状态机：待作答 → 已选择 → 已提交 → 正确 / 错误（每题只判一次，不提供重试）。
   进度记账和课堂跳转都由 shared/activity-bridge.js 负责，本页只做界面并调用 finish()。
   提示槽数据固定保留 icon / image / imageAlt 三个字段：image 有值时渲染真图，
   为空时渲染 emoji；以后换真图只改 QUESTION 数据，不改页面结构和样式。
   记账用「字块 id」而不是汉字本身：答案「妈妈」里有重复字，两个字块各自独立，
   判定时按位置逐字比对。 */
(function (global) {
  "use strict";

  const SOLO_MODAL_DELAY = 2000;      // 体验模式：提交后留多久看对错，再弹完成弹窗
  const CLASS_REDIRECT_DELAY = 2600;  // 课堂模式：公共脚本按这个延迟跳转

  /* 单题数据（题型体验用的模拟题目；字块顺序在进入页面时打乱） */
  const QUESTION = {
    id: "mother",
    icon: "👩",
    image: "",
    imageAlt: "一位妈妈 / seorang ibu",
    prompt: "拼出这个词",
    meaning: "ibu",
    answer: ["妈", "妈"],
    answerWord: "妈妈",
    answerPinyin: "māma",
    tiles: ["妈", "妈", "爸", "姐", "哥", "弟"],
    explanation: "「妈妈」两个字一样，读 māma；「爸爸」是 bàba，第一个字不一样。",
    explanationId: "「妈妈」ditulis dengan dua huruf yang sama, dibaca māma; 「爸爸」dibaca bàba, huruf pertamanya berbeda.",
    meaningNote: "印尼语意思 / arti bahasa Indonesia"
  };

  const el = {};
  let tiles = [];          // [{ id, text }]，打乱后的字块，重复字各有各的 id
  let slots = [];          // 每个作答槽存字块 id，空格是 null
  let submitted = false;
  let finished = false;
  let lastCorrect = false;
  let lastSeconds = 0;
  let startedAt = 0;
  let modalTimer = 0;
  let focusRequest = null; // { where: "slot" | "tile", key: Number | String }

  function setText(node, text) {
    if (node) node.textContent = text;
  }

  /* 学生看到的长文案都中印双语：中文一行，印尼语换行跟在后面 */
  function setBilingual(node, zhText, idText) {
    if (!node) return;
    node.textContent = "";
    node.appendChild(document.createTextNode(zhText));
    if (!idText) return;
    node.appendChild(document.createElement("br"));
    node.appendChild(document.createTextNode(idText));
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
    el.prompt = document.querySelector("[data-word-prompt]");
    el.meaning = document.querySelector("[data-word-hint-meaning]");
    el.meaningNote = document.querySelector(".word-hint-note");
    el.hintSlot = document.querySelector("[data-word-hint-slot]");
    el.slots = document.querySelector("[data-word-slots]");
    el.bank = document.querySelector("[data-word-bank]");
    el.submit = document.querySelector("[data-word-submit]");
    el.reset = document.querySelector("[data-word-reset]");
    el.announcer = document.querySelector("[data-word-announcer]");
    el.feedback = document.querySelector("[data-word-feedback]");
    el.status = document.querySelector("[data-activity-status]");
    el.badgeIcon = document.querySelector("[data-word-badge-icon]");
    el.badgeName = document.querySelector("[data-word-badge-name]");
    el.modal = document.querySelector("[data-word-complete]");
    el.modalBadge = document.querySelector("[data-word-modal-badge]");
    el.modalTitle = document.querySelector("[data-word-modal-title]");
    el.modalId = document.querySelector("[data-word-modal-id]");
    el.modalCopy = document.querySelector("[data-word-modal-copy]");
    el.modalChange = document.querySelector("[data-word-change]");
    el.modalReturn = document.querySelector("[data-word-return]");
  }

  function activityBridge() {
    return global.AICloudActivity || null;
  }

  function activityMeta() {
    const types = global.AICloudActivityTypes;
    const type = document.body.dataset.activityType || "word-build";
    if (!types || typeof types.get !== "function") return null;
    return types.get(type);
  }

  function mode() {
    const bridge = activityBridge();
    if (!bridge || typeof bridge.context !== "function") return "solo";
    return bridge.context().mode;
  }

  /* 题型角标文案取自题型清单，不在页面里另写一份 */
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

  function tileById(id) {
    return tiles.filter(function (tile) { return tile.id === id; })[0] || null;
  }

  function usedTileIds() {
    return slots.filter(function (id) { return !!id; });
  }

  function filledCount() {
    return usedTileIds().length;
  }

  function firstEmptySlot() {
    for (let index = 0; index < slots.length; index += 1) {
      if (!slots[index]) return index;
    }
    return -1;
  }

  /* 提示槽：image 有值渲染 <img src alt>，为空渲染套了 role="img" 的 emoji */
  function renderHint() {
    if (!el.hintSlot) return;
    el.hintSlot.textContent = "";
    if (QUESTION.image) {
      const image = document.createElement("img");
      image.src = QUESTION.image;
      image.alt = QUESTION.imageAlt || "";
      el.hintSlot.appendChild(image);
      return;
    }
    const emoji = document.createElement("span");
    emoji.className = "word-hint-emoji";
    emoji.setAttribute("role", "img");
    emoji.setAttribute("aria-label", QUESTION.imageAlt || "");
    emoji.textContent = QUESTION.icon;
    el.hintSlot.appendChild(emoji);
  }

  function buildSlot(index) {
    const wrap = document.createElement("div");
    wrap.className = "word-slot-wrap";

    const tileId = slots[index];
    const tile = tileId ? tileById(tileId) : null;
    const filled = !!tile;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "word-slot";
    button.dataset.wordSlot = String(index);
    if (filled) {
      button.classList.add("is-filled");
      button.textContent = tile.text;
    }
    if (!filled || submitted) button.disabled = true;
    button.setAttribute("aria-label", filled
      ? "第 " + (index + 1) + " 格：" + tile.text + "，点一下把这个字拿回字块区"
      : "第 " + (index + 1) + " 格：空着");

    if (submitted && filled) {
      const right = tile.text === QUESTION.answer[index];
      button.classList.add(right ? "is-correct" : "is-wrong");
      const mark = document.createElement("span");
      mark.className = "word-slot-mark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = right ? "✓" : "✕";
      button.appendChild(mark);
    }
    wrap.appendChild(button);

    if (submitted && filled && tile.text !== QUESTION.answer[index]) {
      const fix = document.createElement("span");
      fix.className = "word-slot-fix";
      const label = document.createElement("small");
      label.textContent = "正确 / benar";
      const word = document.createElement("strong");
      word.textContent = QUESTION.answer[index];
      fix.appendChild(label);
      fix.appendChild(word);
      wrap.appendChild(fix);
    }
    return wrap;
  }

  function renderSlots() {
    if (!el.slots) return;
    el.slots.textContent = "";
    slots.forEach(function (tileId, index) {
      el.slots.appendChild(buildSlot(index));
    });
  }

  function buildTile(tile) {
    const used = usedTileIds().indexOf(tile.id) >= 0;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "word-tile";
    button.dataset.wordTile = tile.id;
    button.textContent = tile.text;
    if (used) button.classList.add("is-used");
    button.disabled = used || submitted;
    button.setAttribute("aria-label", used
      ? "字块 " + tile.text + "，已经用在空格里"
      : "字块 " + tile.text + "，点一下填进空格");
    return button;
  }

  function renderBank() {
    if (!el.bank) return;
    el.bank.textContent = "";
    tiles.forEach(function (tile) {
      el.bank.appendChild(buildTile(tile));
    });
  }

  function syncControls() {
    const full = filledCount() === slots.length;
    if (el.submit) {
      el.submit.disabled = submitted || !full;
      el.submit.textContent = submitted ? "已提交" : "提交";
    }
    if (el.reset) el.reset.disabled = submitted;
  }

  function updateStatus() {
    if (!el.status) return;
    if (submitted) {
      setBilingual(el.status, "当前状态：已提交", "Status: sudah dikirim");
      return;
    }
    if (filledCount() > 0) {
      setBilingual(el.status, "当前状态：已选择", "Status: sudah memilih");
      return;
    }
    setBilingual(el.status, "当前状态：待作答", "Status: belum dijawab");
  }

  function applyFocus() {
    if (!focusRequest) return;
    const request = focusRequest;
    focusRequest = null;
    const selector = request.where === "slot"
      ? '[data-word-slot="' + request.key + '"]'
      : '[data-word-tile="' + request.key + '"]';
    const node = document.querySelector(selector);
    if (!node || node.disabled || typeof node.focus !== "function") return;
    node.focus({ preventScroll: true });
  }

  function render() {
    renderSlots();
    renderBank();
    syncControls();
    updateStatus();
    applyFocus();
  }

  function announce(message) {
    if (el.announcer) el.announcer.textContent = message;
  }

  function resetFeedback() {
    if (!el.feedback) return;
    el.feedback.textContent = "";
    el.feedback.classList.add("hidden");
    el.feedback.classList.remove("is-correct", "is-wrong");
  }

  function feedbackHead(iconText, label) {
    const head = document.createElement("p");
    head.className = "word-feedback-head";
    const icon = document.createElement("span");
    icon.className = "word-feedback-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = iconText;
    const text = document.createElement("span");
    text.textContent = label;
    head.appendChild(icon);
    head.appendChild(text);
    return head;
  }

  function showFeedback() {
    if (!el.feedback) return;
    el.feedback.textContent = "";
    el.feedback.classList.remove("hidden", "is-correct", "is-wrong");
    el.feedback.classList.add(lastCorrect ? "is-correct" : "is-wrong");
    el.feedback.appendChild(feedbackHead(lastCorrect ? "✓" : "✕", lastCorrect ? "答对了！" : "再想想"));

    const idCopy = document.createElement("p");
    idCopy.className = "word-feedback-id";
    idCopy.lang = "id";
    idCopy.textContent = lastCorrect
      ? "Benar sekali! Susunan hanzi-mu tepat."
      : "Belum tepat. Lihat jawaban yang benar ya.";
    el.feedback.appendChild(idCopy);

    const answer = document.createElement("p");
    answer.className = "word-feedback-answer";
    if (lastCorrect) {
      answer.appendChild(document.createTextNode(QUESTION.answerWord + " " + QUESTION.answerPinyin));
    } else {
      answer.appendChild(document.createTextNode("正确答案：" + QUESTION.answerWord));
    }
    const meaning = document.createElement("small");
    meaning.textContent = QUESTION.meaning;
    answer.appendChild(meaning);
    el.feedback.appendChild(answer);

    const explain = document.createElement("p");
    explain.className = "word-feedback-explain";
    explain.textContent = "解析：" + QUESTION.explanation;
    el.feedback.appendChild(explain);

    const explainId = document.createElement("p");
    explainId.className = "word-feedback-explain-id";
    explainId.lang = "id";
    explainId.textContent = QUESTION.explanationId;
    el.feedback.appendChild(explainId);

    if (typeof el.feedback.focus === "function") el.feedback.focus({ preventScroll: true });
    if (typeof el.feedback.scrollIntoView === "function") el.feedback.scrollIntoView({ block: "nearest" });
  }

  function placeTile(tileId) {
    if (submitted) return;
    const tile = tileById(tileId);
    if (!tile || usedTileIds().indexOf(tileId) >= 0) return;
    const index = firstEmptySlot();
    if (index < 0) return;
    slots[index] = tileId;
    focusRequest = { where: "slot", key: index };
    render();
    announce("已把「" + tile.text + "」填进第 " + (index + 1) + " 格，已填 " + filledCount() + " / " + slots.length + " 格");
  }

  function returnTile(index) {
    if (submitted) return;
    const tileId = slots[index];
    if (!tileId) return;
    const tile = tileById(tileId);
    slots[index] = null;
    focusRequest = { where: "tile", key: tileId };
    render();
    announce("已把「" + (tile ? tile.text : "") + "」放回字块区，已填 " + filledCount() + " / " + slots.length + " 格");
  }

  function resetAll() {
    if (submitted) return;
    if (filledCount() === 0) {
      announce("作答区已经是空的，可以直接点字块开始");
      return;
    }
    slots = slots.map(function () { return null; });
    focusRequest = null;
    render();
    announce("已把所有字块放回字块区，已填 0 / " + slots.length + " 格");
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
    setBilingual(el.modalCopy,
      lastCorrect
        ? "本题已完成，可以换一个题型再练一练，或者回到课堂。"
        : "正确答案和解析就在上面，可以换一个题型再练一练。",
      lastCorrect
        ? "Aktivitas ini selesai. Kamu bisa mencoba jenis soal lain atau kembali ke kelas."
        : "Jawaban dan penjelasannya ada di atas. Kamu bisa mencoba jenis soal lain.");
    el.modal.classList.remove("hidden");
    if (el.modalChange && typeof el.modalChange.focus === "function") el.modalChange.focus();
  }

  function hideModal() {
    if (el.modal) el.modal.classList.add("hidden");
  }

  function submitAnswer() {
    if (submitted || filledCount() !== slots.length) return;
    submitted = true;
    lastSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));

    /* 逐槽按位置比对：重复字不比文字，比这一格放的是不是这个字块该在的位置 */
    lastCorrect = slots.every(function (tileId, index) {
      const tile = tileById(tileId);
      return !!tile && tile.text === QUESTION.answer[index];
    });

    focusRequest = null;
    render();
    showFeedback();
    announce(lastCorrect
      ? "答对了！" + QUESTION.answerWord + " " + QUESTION.answerPinyin + "。" + QUESTION.explanation
      : "再想想。正确答案是：" + QUESTION.answerWord + "。" + QUESTION.explanation);

    const outcome = completeOnce();
    if (outcome && outcome.recorded) {
      setBilingual(el.status,
        outcome.next === "complete.html" ? "本题已记录，正在进入完成页…" : "本题已记录，正在返回课堂继续下一题…",
        "Jawaban tercatat. Sebentar lagi berpindah halaman…");
      return;
    }
    modalTimer = global.setTimeout(showModal, SOLO_MODAL_DELAY);
  }

  function startQuestion() {
    global.clearTimeout(modalTimer);
    hideModal();
    resetFeedback();

    submitted = false;
    finished = false;
    lastCorrect = false;
    lastSeconds = 0;
    startedAt = Date.now();
    focusRequest = null;
    slots = QUESTION.answer.map(function () { return null; });
    tiles = shuffle(QUESTION.tiles).map(function (text, index) {
      return { id: "tile-" + index, text: text };
    });

    setText(el.prompt, QUESTION.prompt);
    setText(el.meaning, QUESTION.meaning);
    setText(el.meaningNote, QUESTION.meaningNote);
    renderHint();
    render();
  }

  function bindEvents() {
    if (el.bank) {
      el.bank.addEventListener("click", function (event) {
        const button = event.target && event.target.closest ? event.target.closest("button.word-tile") : null;
        if (!button || button.disabled) return;
        placeTile(button.dataset.wordTile);
      });
    }
    if (el.slots) {
      el.slots.addEventListener("click", function (event) {
        const button = event.target && event.target.closest ? event.target.closest("button.word-slot") : null;
        if (!button || button.disabled) return;
        returnTile(Number(button.dataset.wordSlot));
      });
    }
    if (el.submit) el.submit.addEventListener("click", submitAnswer);
    if (el.reset) el.reset.addEventListener("click", resetAll);
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

  global.AICloudWordBuildPage = { boot: boot, startQuestion: startQuestion };
})(typeof window !== "undefined" ? window : globalThis);
