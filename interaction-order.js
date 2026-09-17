(function (global) {
  "use strict";

  const ITEMS = [
    { id: "apple", text: "苹果", pinyin: "píng guǒ" },
    { id: "me", text: "我", pinyin: "wǒ" },
    { id: "one", text: "一个", pinyin: "yí ge" },
    { id: "want", text: "想", pinyin: "xiǎng" },
    { id: "buy", text: "买", pinyin: "mǎi" }
  ];

  const BANK_ORDER = ["apple", "me", "one", "want", "buy"];
  const CORRECT_ORDER = ["me", "want", "buy", "one", "apple"];
  const EXPLAIN_ZH = "中文语序是「谁 ＋ 想做什么 ＋ 做什么」；数量词「一个」放在名词「苹果」前面。";
  const EXPLAIN_ID = "Urutan bahasa Mandarin: subjek dulu, lalu keinginan dan kata kerja; kata jumlah diletakkan sebelum kata benda.";
  const MODAL_DELAY = 1400;
  const CLASS_REDIRECT_DELAY = 2600;

  const types = global.AICloudActivityTypes;
  const bridge = global.AICloudActivity;
  const startedAt = Date.now();

  const answerNode = document.querySelector("[data-order-answer]");
  const bankNode = document.querySelector("[data-order-bank]");
  const submitNode = document.querySelector("[data-order-submit]");
  const clearNode = document.querySelector("[data-order-clear]");
  const feedbackNode = document.querySelector("[data-order-feedback]");
  const announcerNode = document.querySelector("[data-order-announcer]");
  const statusNode = document.querySelector("[data-activity-status]");
  const modalNode = document.querySelector("[data-order-complete]");

  let picked = [];
  let submitted = false;

  function itemFor(id) {
    return ITEMS.filter(function (entry) { return entry.id === id; })[0] || null;
  }

  function textFor(id) {
    const entry = itemFor(id);
    return entry ? entry.text : "";
  }

  function sentence(ids) {
    return ids.map(textFor).join(" ");
  }

  function setText(node, text) {
    if (node) node.textContent = text;
  }

  function announce(message) {
    if (announcerNode) announcerNode.textContent = message;
  }

  function fillTile(tile, entry) {
    const word = document.createElement("strong");
    word.textContent = entry.text;
    const pinyin = document.createElement("small");
    pinyin.textContent = entry.pinyin;
    tile.appendChild(word);
    tile.appendChild(pinyin);
    return tile;
  }

  function buildAnswerWord(id, index, settings) {
    const entry = itemFor(id) || { text: id, pinyin: "" };
    const button = document.createElement("button");
    button.type = "button";
    button.className = "order-tile order-answer-word";
    button.dataset.orderId = id;
    button.dataset.orderAnswerWord = "true";
    button.setAttribute("aria-label", "把词语 " + entry.text + " 放回词库");
    button.disabled = submitted;
    fillTile(button, entry);

    if (submitted) {
      const right = id === CORRECT_ORDER[index];
      button.classList.add(right ? "is-correct" : "is-wrong");
      const mark = document.createElement("span");
      mark.className = "order-tile-mark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = right ? "✓" : "✕";
      button.appendChild(mark);
    } else if (settings.popId === id) {
      button.classList.add("is-new");
    }
    return button;
  }

  function buildBankTile(id, settings) {
    const entry = itemFor(id) || { text: id, pinyin: "" };
    const button = document.createElement("button");
    button.type = "button";
    button.className = "order-tile order-bank-tile";
    button.dataset.orderId = id;
    button.setAttribute("aria-label", "选择词语 " + entry.text);
    button.disabled = submitted;
    fillTile(button, entry);
    if (settings.popId === id) button.classList.add("is-new");
    return button;
  }

  function buildBankGhost(id) {
    const entry = itemFor(id) || { text: id, pinyin: "" };
    const ghost = document.createElement("span");
    ghost.className = "order-tile order-tile-ghost";
    ghost.setAttribute("aria-hidden", "true");
    return fillTile(ghost, entry);
  }

  function renderAnswer(settings) {
    if (!answerNode) return;
    answerNode.textContent = "";
    if (picked.length === 0) {
      const hint = document.createElement("p");
      hint.className = "order-answer-hint";
      hint.textContent = "点下面的词开始组句";
      answerNode.appendChild(hint);
      return;
    }
    picked.forEach(function (id, index) {
      answerNode.appendChild(buildAnswerWord(id, index, settings));
    });
  }

  function renderBank(settings) {
    if (!bankNode) return;
    bankNode.textContent = "";
    BANK_ORDER.forEach(function (id) {
      bankNode.appendChild(picked.indexOf(id) >= 0 ? buildBankGhost(id) : buildBankTile(id, settings));
    });
  }

  function syncControls() {
    if (submitNode) {
      submitNode.disabled = submitted || picked.length === 0;
      submitNode.textContent = submitted ? "已提交" : "提交答案";
    }
    if (clearNode) clearNode.disabled = submitted;
  }

  function focusTarget(target) {
    if (!target) return;
    const scope = target.where === "bank" ? bankNode : answerNode;
    if (!scope) return;
    const node = scope.querySelector('[data-order-id="' + target.id + '"]');
    if (node && !node.disabled && typeof node.focus === "function") node.focus();
  }

  function render(options) {
    const settings = options || {};
    renderAnswer(settings);
    renderBank(settings);
    syncControls();
    focusTarget(settings.focus);
  }

  function pick(id) {
    if (submitted || picked.indexOf(id) >= 0) return;
    picked = picked.concat(id);
    render({ popId: id, focus: { id: id, where: "answer" } });
    announce("已选入「" + textFor(id) + "」，已选 " + picked.length + " 个词");
  }

  function putBack(id) {
    if (submitted || picked.indexOf(id) < 0) return;
    picked = picked.filter(function (entry) { return entry !== id; });
    render({ popId: id, focus: { id: id, where: "bank" } });
    announce("已把「" + textFor(id) + "」放回词库，已选 " + picked.length + " 个词");
  }

  function clearAll() {
    if (submitted || picked.length === 0) return;
    picked = [];
    render();
    announce("已清空答案行，词已全部放回词库，已选 0 个词");
  }

  function feedbackHead(iconText, label) {
    const head = document.createElement("p");
    head.className = "order-feedback-head";
    const icon = document.createElement("span");
    icon.className = "order-feedback-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = iconText;
    const text = document.createElement("span");
    text.textContent = label;
    head.appendChild(icon);
    head.appendChild(text);
    return head;
  }

  function buildAnswerList() {
    const list = document.createElement("ol");
    list.className = "order-feedback-list";
    CORRECT_ORDER.forEach(function (id, index) {
      const entry = itemFor(id) || { text: id, pinyin: "" };
      const line = document.createElement("li");
      const badge = document.createElement("span");
      badge.setAttribute("aria-hidden", "true");
      badge.textContent = String(index + 1);
      const word = document.createElement("strong");
      word.textContent = entry.text;
      const pinyin = document.createElement("small");
      pinyin.textContent = entry.pinyin;
      line.appendChild(badge);
      line.appendChild(word);
      line.appendChild(pinyin);
      list.appendChild(line);
    });
    return list;
  }

  function showFeedback(correct) {
    if (!feedbackNode) return;
    feedbackNode.textContent = "";
    feedbackNode.classList.remove("hidden", "is-correct", "is-wrong");
    feedbackNode.classList.add(correct ? "is-correct" : "is-wrong");
    feedbackNode.appendChild(feedbackHead(correct ? "✓" : "✕", correct ? "排对了！" : "再想想"));

    if (correct) {
      const line = document.createElement("p");
      line.className = "order-feedback-sentence";
      line.textContent = sentence(picked);
      feedbackNode.appendChild(line);
    } else {
      const label = document.createElement("p");
      label.className = "order-feedback-label";
      label.textContent = "正确顺序：";
      feedbackNode.appendChild(label);
      feedbackNode.appendChild(buildAnswerList());
    }

    const explain = document.createElement("p");
    explain.className = "order-feedback-explain";
    explain.textContent = "解析：" + EXPLAIN_ZH;
    feedbackNode.appendChild(explain);

    const explainId = document.createElement("p");
    explainId.className = "order-feedback-id";
    explainId.lang = "id";
    explainId.textContent = EXPLAIN_ID;
    feedbackNode.appendChild(explainId);

    if (typeof feedbackNode.focus === "function") feedbackNode.focus();
  }

  function openModal(correct) {
    if (!modalNode) return;
    if (correct) {
      setText(modalNode.querySelector("[data-order-complete-badge]"), "🎉");
      setText(modalNode.querySelector("[data-order-complete-title]"), "排对了，真棒！");
      setText(modalNode.querySelector("[data-order-complete-id]"), "Susunanmu benar!");
      setText(modalNode.querySelector("[data-order-complete-copy]"), "你把词块排成了一句通顺的中文。可以换一个题型，也可以回课堂看看。");
    } else {
      setText(modalNode.querySelector("[data-order-complete-badge]"), "💪");
      setText(modalNode.querySelector("[data-order-complete-title]"), "本题已提交");
      setText(modalNode.querySelector("[data-order-complete-id]"), "Sudah dikirim, lihat urutan yang benar ya!");
      setText(modalNode.querySelector("[data-order-complete-copy]"), "正确顺序是「" + sentence(CORRECT_ORDER) + "」。再读一遍，下次一定排得对。");
    }
    modalNode.classList.remove("hidden");
    const nextLink = modalNode.querySelector(".primary-button");
    if (nextLink && typeof nextLink.focus === "function") nextLink.focus();
  }

  function submit() {
    if (submitted || picked.length === 0) return;
    submitted = true;
    const correct = picked.length === CORRECT_ORDER.length && picked.every(function (id, index) {
      return id === CORRECT_ORDER[index];
    });
    const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    render();
    showFeedback(correct);
    announce(correct
      ? "排对了！" + EXPLAIN_ZH
      : "再想想。正确顺序是：" + sentence(CORRECT_ORDER) + "。" + EXPLAIN_ZH);

    const ctx = bridge && bridge.context ? bridge.context() : { mode: "solo" };
    const outcome = bridge && bridge.finish
      ? bridge.finish({
        correct: correct,
        seconds: seconds,
        detail: sentence(picked),
        delay: ctx.mode === "class" ? CLASS_REDIRECT_DELAY : 0
      })
      : null;

    if (outcome && outcome.recorded) {
      if (statusNode) {
        statusNode.classList.remove("hidden");
        statusNode.textContent = outcome.next === "complete.html"
          ? "本题已记录，正在进入完成页…"
          : "本题已记录，正在返回课堂继续下一题…";
      }
      return;
    }

    global.setTimeout(function () { openModal(correct); }, MODAL_DELAY);
  }

  function initBadge() {
    const meta = types && types.get ? types.get("order") : null;
    if (!meta) return;
    setText(document.querySelector("[data-order-badge-icon]"), meta.icon);
    setText(document.querySelector("[data-order-badge-text]"), meta.title);
  }

  if (bankNode) {
    bankNode.addEventListener("click", function (event) {
      const tile = event.target && event.target.closest ? event.target.closest("button.order-bank-tile") : null;
      if (!tile || tile.disabled) return;
      pick(tile.dataset.orderId);
    });
  }

  if (answerNode) {
    answerNode.addEventListener("click", function (event) {
      const tile = event.target && event.target.closest ? event.target.closest("button.order-answer-word") : null;
      if (!tile || tile.disabled) return;
      putBack(tile.dataset.orderId);
    });
  }

  if (submitNode) submitNode.addEventListener("click", submit);
  if (clearNode) clearNode.addEventListener("click", clearAll);

  initBadge();
  render();
})(typeof window !== "undefined" ? window : globalThis);
