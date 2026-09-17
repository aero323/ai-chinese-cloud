/* 分类归组 · interaction-category.html 页面脚本
   状态机：待作答 → 已选择 → 已提交 → 正确 / 错误（每题只判一次，不提供重试）。
   进度记账和课堂跳转都由 shared/activity-bridge.js 负责，本页只做界面并调用 finish()。
   交互只做点选：点词 → 点类别框 → 放进去；点框里的词 → 拿回待归类区。 */
(function (global) {
  "use strict";

  const SOLO_MODAL_DELAY = 2000;      // 体验模式：提交后留多久看对错，再弹完成弹窗
  const CLASS_REDIRECT_DELAY = 2600;  // 课堂模式：公共脚本按这个延迟跳转

  /* 单题数据（题型体验用的模拟题目）：2 个类别 + 6 个待归类的词 */
  const GROUPS = [
    { id: "eat", name: "吃", nameId: "makan" },
    { id: "drink", name: "喝", nameId: "minum" }
  ];

  const WORDS = [
    { id: "rice", text: "米饭", pinyin: "mǐfàn", group: "eat" },
    { id: "water", text: "水", pinyin: "shuǐ", group: "drink" },
    { id: "bread", text: "面包", pinyin: "miànbāo", group: "eat" },
    { id: "tea", text: "茶", pinyin: "chá", group: "drink" },
    { id: "dumpling", text: "饺子", pinyin: "jiǎozi", group: "eat" },
    { id: "juice", text: "果汁", pinyin: "guǒzhī", group: "drink" }
  ];

  const EXPLAIN_ZH = "「吃」后面接要嚼的食物，「喝」后面接液体。饺子是食物，果汁是饮料。";
  const EXPLAIN_ID = '"吃" diikuti makanan yang perlu dikunyah, "喝" diikuti cairan. Jiaozi adalah makanan, jus adalah minuman.';

  const el = {};
  let placed = {};        // 词 id → 类别 id（提交后只剩放对的词）
  let wrongInfo = {};     // 提交后：放错的词 id → 它该去的类别 id
  let selectedId = "";
  let submitted = false;
  let finished = false;
  let lastCorrect = false;
  let lastSeconds = 0;
  let startedAt = 0;
  let modalTimer = 0;
  let nudgeTimer = 0;
  let focusRequest = null;

  function setText(node, text) {
    if (node) node.textContent = text;
  }

  function setHidden(node, hidden) {
    if (node) node.classList.toggle("hidden", !!hidden);
  }

  function wordById(id) {
    return WORDS.filter(function (word) { return word.id === id; })[0] || null;
  }

  function groupById(id) {
    return GROUPS.filter(function (group) { return group.id === id; })[0] || null;
  }

  function groupName(id) {
    const group = groupById(id);
    return group ? group.name : id;
  }

  function wordText(id) {
    const word = wordById(id);
    return word ? word.text : id;
  }

  function placedList(groupId) {
    return WORDS.filter(function (word) { return placed[word.id] === groupId; });
  }

  function placedTotal() {
    return WORDS.filter(function (word) { return placed[word.id] !== undefined; }).length;
  }

  function allPlaced() {
    return WORDS.every(function (word) { return placed[word.id] !== undefined; });
  }

  function cache() {
    el.pool = document.querySelector("[data-category-pool]");
    el.poolDone = document.querySelector("[data-category-pool-done]");
    el.groups = document.querySelector("[data-category-groups]");
    el.submit = document.querySelector("[data-category-submit]");
    el.submitLabel = document.querySelector("[data-category-submit-label]");
    el.submitLabelId = document.querySelector("[data-category-submit-label-id]");
    el.reset = document.querySelector("[data-category-reset]");
    el.progress = document.querySelector("[data-category-progress]");
    el.feedback = document.querySelector("[data-category-feedback]");
    el.feedbackIcon = document.querySelector("[data-category-feedback-icon]");
    el.feedbackTitle = document.querySelector("[data-category-feedback-title]");
    el.feedbackTitleId = document.querySelector("[data-category-feedback-title-id]");
    el.feedbackSummaryZh = document.querySelector("[data-category-feedback-summary-zh]");
    el.feedbackSummaryId = document.querySelector("[data-category-feedback-summary-id]");
    el.feedbackExplain = document.querySelector("[data-category-feedback-explain]");
    el.feedbackExplainId = document.querySelector("[data-category-feedback-explain-id]");
    el.announcer = document.querySelector("[data-category-announcer]");
    el.status = document.querySelector("[data-activity-status]");
    el.badgeIcon = document.querySelector("[data-category-badge-icon]");
    el.badgeName = document.querySelector("[data-category-badge-name]");
    el.badgeId = document.querySelector("[data-category-badge-id]");
    el.modal = document.querySelector("[data-category-complete]");
    el.modalBadge = document.querySelector("[data-category-modal-badge]");
    el.modalTitle = document.querySelector("[data-category-modal-title]");
    el.modalId = document.querySelector("[data-category-modal-id]");
    el.modalCopyZh = document.querySelector("[data-category-modal-copy-zh]");
    el.modalCopyId = document.querySelector("[data-category-modal-copy-id]");
    el.modalChange = document.querySelector("[data-category-change]");
    el.modalReturn = document.querySelector("[data-category-return]");
  }

  function activityBridge() {
    return global.AICloudActivity || null;
  }

  function activityMeta() {
    const types = global.AICloudActivityTypes;
    const type = document.body.dataset.activityType || "category";
    if (!types || typeof types.get !== "function") return null;
    return types.get(type);
  }

  /* 体验模式还是课堂模式，一律问公共脚本，页面不自己解析网址参数 */
  function mode() {
    const bridge = activityBridge();
    if (!bridge || typeof bridge.context !== "function") return "solo";
    return bridge.context().mode;
  }

  /* 题型角标文案取自题型清单，不在页面里另写一份 */
  function applyShellText() {
    const meta = activityMeta();
    if (!meta) return;
    setText(el.badgeIcon, meta.icon);
    setText(el.badgeName, meta.title);
    setText(el.badgeId, meta.titleId);
    const back = document.querySelector("[data-activity-back]");
    if (back) {
      const isClass = mode() === "class";
      back.setAttribute("href", "classroom.html");
      back.setAttribute("aria-label", isClass ? "返回课堂互动" : "返回课堂");
    }
  }

  function announce(message) {
    setText(el.announcer, message);
  }

  function updateStatus() {
    if (!el.status) return;
    let text = "当前状态：待作答";
    if (submitted) text = lastCorrect ? "当前状态：已提交（全对）" : "当前状态：已提交（有错）";
    else if (selectedId) text = "当前状态：已选择「" + wordText(selectedId) + "」";
    else if (placedTotal() > 0) text = "当前状态：已归类 " + placedTotal() + " / " + WORDS.length;
    setText(el.status, text);
  }

  /* 一个词块：待归类区、类别框、提交后的对错状态都用它 */
  function buildChip(word, settings) {
    const place = settings.place;
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "category-chip";
    chip.dataset.categoryWord = word.id;
    chip.disabled = submitted;

    const text = document.createElement("strong");
    text.textContent = word.text;
    const pinyin = document.createElement("small");
    pinyin.textContent = word.pinyin;
    chip.appendChild(text);
    chip.appendChild(pinyin);

    if (place === "group") {
      if (submitted) {
        chip.classList.add("is-correct");
        chip.setAttribute("aria-label", "「" + word.text + "」分类正确");
      } else {
        chip.classList.add("is-placed");
        chip.setAttribute("aria-label", "把「" + word.text + "」拿回待归类区 / Ambil kembali");
      }
      return chip;
    }

    if (submitted && wrongInfo[word.id]) {
      chip.classList.add("is-wrong");
      chip.setAttribute("aria-label", "「" + word.text + "」放错了，应该放在「" + groupName(wrongInfo[word.id]) + "」里");
      return chip;
    }

    chip.setAttribute("aria-pressed", word.id === selectedId ? "true" : "false");
    if (word.id === selectedId) {
      chip.classList.add("is-selected");
      chip.setAttribute("aria-label", "已选中「" + word.text + "」，再点一个类别 / Sudah dipilih");
    } else {
      chip.setAttribute("aria-label", "选择「" + word.text + "」，再点它该去的类别 / Pilih kata");
    }
    return chip;
  }

  /* 待归类区里的词：提交后放错的词后面跟一个小标签，标出它该去的类别 */
  function buildPoolItem(word) {
    const item = document.createElement("span");
    item.className = "category-pool-item";
    item.appendChild(buildChip(word, { place: "pool" }));
    if (submitted && wrongInfo[word.id]) {
      const group = groupById(wrongInfo[word.id]);
      const name = group ? group.name : wrongInfo[word.id];
      const nameId = group ? group.nameId : "";
      const tag = document.createElement("span");
      tag.className = "category-chip-arrow";
      tag.setAttribute("aria-hidden", "true");
      tag.textContent = "→ " + name + (nameId ? " · " + nameId : "");
      item.appendChild(tag);
    }
    return item;
  }

  function renderPool() {
    if (!el.pool) return;
    el.pool.textContent = "";
    const rest = WORDS.filter(function (word) { return placed[word.id] === undefined; });
    rest.forEach(function (word) {
      el.pool.appendChild(buildPoolItem(word));
    });
    setHidden(el.poolDone, submitted || rest.length > 0);
  }

  function buildGroupEmpty(group) {
    const empty = document.createElement("p");
    empty.className = "category-group-empty";
    const zh = document.createElement("span");
    const id = document.createElement("span");
    id.lang = "id";
    if (submitted) {
      zh.textContent = "这个类别里没有词。";
      id.textContent = "Tidak ada kata di kategori ini.";
    } else if (selectedId) {
      zh.textContent = "点这里，放进「" + group.name + "」。";
      id.textContent = "Ketuk: masukkan ke sini.";
    } else {
      zh.textContent = "先点一个词，再点这里。";
      id.textContent = "Ketuk kata dulu, lalu ke sini.";
    }
    empty.appendChild(zh);
    empty.appendChild(document.createElement("br"));
    empty.appendChild(id);
    return empty;
  }

  function buildGroup(group) {
    const box = document.createElement("section");
    box.className = "category-group";
    box.dataset.categoryGroup = group.id;
    box.setAttribute("aria-label", "类别「" + group.name + "」");

    const head = document.createElement("button");
    head.type = "button";
    head.className = "category-group-head";
    head.dataset.categoryGroupTarget = group.id;
    head.disabled = submitted;
    head.setAttribute("aria-label", "把选中的词放进「" + group.name + "」 / Masukkan ke kategori " + group.name);

    const name = document.createElement("strong");
    name.className = "category-group-name";
    name.textContent = group.name;
    const nameId = document.createElement("span");
    nameId.className = "category-group-id";
    nameId.lang = "id";
    nameId.textContent = group.nameId;
    const count = document.createElement("span");
    count.className = "category-group-count";
    count.setAttribute("aria-hidden", "true");
    count.textContent = String(placedList(group.id).length);
    head.appendChild(name);
    head.appendChild(nameId);
    head.appendChild(count);

    const items = document.createElement("div");
    items.className = "category-group-items";
    items.dataset.categoryGroupItems = group.id;
    const list = placedList(group.id);
    if (list.length === 0) {
      items.appendChild(buildGroupEmpty(group));
    } else {
      list.forEach(function (word) {
        items.appendChild(buildChip(word, { place: "group" }));
      });
    }

    box.classList.toggle("is-filled", list.length > 0);
    box.classList.toggle("is-ready", !!selectedId && !submitted);
    box.appendChild(head);
    box.appendChild(items);
    return box;
  }

  function renderGroups() {
    if (!el.groups) return;
    el.groups.textContent = "";
    GROUPS.forEach(function (group) {
      el.groups.appendChild(buildGroup(group));
    });
  }

  function renderProgress() {
    setText(el.progress, "已归类 " + placedTotal() + " / " + WORDS.length);
  }

  function syncControls() {
    if (el.submit) el.submit.disabled = submitted || !allPlaced();
    if (el.reset) el.reset.disabled = submitted;
    if (el.submitLabel) setText(el.submitLabel, submitted ? "已提交" : "提交");
    if (el.submitLabelId) setText(el.submitLabelId, submitted ? "Terkirim" : "Kirim");
  }

  /* 重新渲染后把焦点还给刚动过的那个词，键盘操作不会丢位置 */
  function applyFocus() {
    if (!focusRequest || !focusRequest.wordId) return;
    let scope = el.pool;
    if (focusRequest.where === "group" && focusRequest.groupId && el.groups) {
      scope = el.groups.querySelector('[data-category-group-items="' + focusRequest.groupId + '"]');
    }
    if (!scope) return;
    const node = scope.querySelector('[data-category-word="' + focusRequest.wordId + '"]');
    if (node && !node.disabled && typeof node.focus === "function") node.focus();
  }

  function render(focus) {
    focusRequest = focus || null;
    renderPool();
    renderGroups();
    renderProgress();
    syncControls();
    updateStatus();
    applyFocus();
  }

  function placeSummary() {
    return "已归类 " + placedTotal() + " / " + WORDS.length + "。";
  }

  function nudgePool() {
    if (el.pool) {
      el.pool.classList.add("is-nudge");
      global.clearTimeout(nudgeTimer);
      nudgeTimer = global.setTimeout(function () {
        if (el.pool) el.pool.classList.remove("is-nudge");
      }, 900);
    }
    announce("先点一个词，再点它该去的类别。 / Ketuk satu kata dulu, lalu ketuk kategorinya.");
  }

  function selectWord(wordId) {
    if (submitted) return;
    selectedId = selectedId === wordId ? "" : wordId;
    render({ wordId: wordId, where: "pool" });
    announce(selectedId
      ? "已选中「" + wordText(wordId) + "」，再点一个类别。"
      : "已取消选择「" + wordText(wordId) + "」。");
  }

  function placeSelected(groupId) {
    if (submitted) return;
    if (!selectedId) {
      nudgePool();
      return;
    }
    const movedId = selectedId;
    placed[movedId] = groupId;
    selectedId = "";
    render({ wordId: movedId, where: "group", groupId: groupId });
    announce("已把「" + wordText(movedId) + "」放进「" + groupName(groupId) + "」。" + placeSummary());
  }

  function returnWord(wordId) {
    if (submitted) return;
    if (placed[wordId] === undefined) return;
    delete placed[wordId];
    if (selectedId === wordId) selectedId = "";
    render({ wordId: wordId, where: "pool" });
    announce("已把「" + wordText(wordId) + "」拿回待归类区。" + placeSummary());
  }

  function resetAll() {
    if (submitted) return;
    placed = {};
    wrongInfo = {};
    selectedId = "";
    resetFeedback();
    render();
    announce("已重置：所有词都回到了待归类区，可以重新归。");
  }

  function resetFeedback() {
    if (!el.feedback) return;
    el.feedback.classList.add("hidden");
    el.feedback.classList.remove("is-correct", "is-wrong");
    setText(el.feedbackIcon, "");
    setText(el.feedbackTitle, "");
    setText(el.feedbackTitleId, "");
    setText(el.feedbackSummaryZh, "");
    setText(el.feedbackSummaryId, "");
    setText(el.feedbackExplain, "");
    setText(el.feedbackExplainId, "");
  }

  function showFeedback(wrong) {
    if (!el.feedback) return;
    el.feedback.classList.remove("hidden", "is-correct", "is-wrong");
    el.feedback.classList.add(lastCorrect ? "is-correct" : "is-wrong");
    setText(el.feedbackIcon, lastCorrect ? "✓" : "✗");
    setText(el.feedbackTitle, lastCorrect ? "答对了！" : "再想想");
    setText(el.feedbackTitleId, lastCorrect ? "Bagus, semua benar!" : "Coba pikir lagi ya!");
    setText(el.feedbackSummaryZh, lastCorrect
      ? WORDS.length + " 个词全部分类正确。"
      : "有 " + wrong.length + " 个词放错了，已经放回上面的待归类区。");
    setText(el.feedbackSummaryId, lastCorrect
      ? WORDS.length + " kata sudah dikelompokkan dengan benar."
      : wrong.length + " kata salah dan sudah dikembalikan ke atas.");

    setText(el.feedbackExplain, "解析：" + EXPLAIN_ZH);
    setText(el.feedbackExplainId, "Penjelasan: " + EXPLAIN_ID);
    if (typeof el.feedback.focus === "function") el.feedback.focus({ preventScroll: true });
    if (typeof el.feedback.scrollIntoView === "function") el.feedback.scrollIntoView({ block: "center" });
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
    setText(el.modalId, lastCorrect ? "Bagus! Semua kata sudah benar." : "Tidak apa-apa, coba lagi ya!");
    setText(el.modalCopyZh, lastCorrect
      ? WORDS.length + " 个词全部分类正确。可以换一个题型再练一练，或者回到课堂。"
      : "放错的词已经放回待归类区，上面写着它该去的类别。可以换一个题型再练一练。");
    setText(el.modalCopyId, lastCorrect
      ? "Semua kata sudah dikelompokkan dengan benar. Pilih aktivitas lain atau kembali ke kelas."
      : "Kata yang salah sudah dikembalikan, lihat kategorinya di atas. Pilih aktivitas lain untuk berlatih lagi.");
    el.modal.classList.remove("hidden");
    if (el.modalChange && typeof el.modalChange.focus === "function") el.modalChange.focus();
  }

  function hideModal() {
    if (el.modal) el.modal.classList.add("hidden");
  }

  function submit() {
    if (submitted || !allPlaced()) return;
    submitted = true;
    lastSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));

    wrongInfo = {};
    const wrong = [];
    WORDS.forEach(function (word) {
      if (placed[word.id] !== word.group) {
        wrongInfo[word.id] = word.group;
        wrong.push(word);
        delete placed[word.id];   // 放错的词移回待归类区，提交后不再可改
      }
    });
    lastCorrect = wrong.length === 0;

    render();
    showFeedback(wrong);
    announce(lastCorrect
      ? "答对了！" + WORDS.length + " 个词全部分类正确。" + EXPLAIN_ZH
      : "再想想。" + wrong.length + " 个词放错了，已经放回待归类区。" + EXPLAIN_ZH);

    const outcome = completeOnce();
    if (outcome && outcome.recorded) {
      setText(el.status, outcome.next === "complete.html"
        ? "已提交，正在进入完成页…"
        : "已提交，正在返回课堂继续下一题…");
      return;
    }
    modalTimer = global.setTimeout(showModal, SOLO_MODAL_DELAY);
  }

  function bindEvents() {
    if (el.submit) el.submit.addEventListener("click", submit);
    if (el.reset) el.reset.addEventListener("click", resetAll);

    if (el.pool) {
      el.pool.addEventListener("click", function (event) {
        const chip = event.target && event.target.closest ? event.target.closest("[data-category-word]") : null;
        if (!chip || chip.disabled) return;
        selectWord(chip.dataset.categoryWord);
      });
    }

    if (el.groups) {
      el.groups.addEventListener("click", function (event) {
        const target = event.target;
        if (!target || !target.closest) return;
        const chip = target.closest("[data-category-word]");
        if (chip) {
          if (!chip.disabled) returnWord(chip.dataset.categoryWord);
          return;
        }
        const box = target.closest("[data-category-group]");
        if (box) placeSelected(box.dataset.categoryGroup);
      });
    }

    [el.modalChange, el.modalReturn].forEach(function (link) {
      if (!link) return;
      link.addEventListener("click", function () {
        completeOnce();
      });
    });
  }

  function startQuestion() {
    global.clearTimeout(modalTimer);
    hideModal();
    placed = {};
    wrongInfo = {};
    selectedId = "";
    submitted = false;
    finished = false;
    lastCorrect = false;
    startedAt = Date.now();
    resetFeedback();
    render();
    announce("题目已开始：把 " + WORDS.length + " 个词放进对应的类别里。");
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

  global.AICloudCategoryPage = { boot: boot, startQuestion: startQuestion };
})(typeof window !== "undefined" ? window : globalThis);
