/* 跟读模仿 · interaction-read-aloud.html 页面脚本（占位版）
   状态机：待朗读 → 录音中（占位）→ 识别中（占位）→ 已出占位结果。
   假流程：按住「按住说话」出现假波形，松开（或再点一下）后固定转 1 秒「识别中…」，
   然后出现占位结果卡。全程不调麦克风、不发声、不弹任何授权框。
   评分是固定的示例值，不是真实评分；以后接真录音 + 语音识别时替换结果卡即可，
   页面骨架和状态机不用重写。
   进度记账和课堂跳转都由 shared/activity-bridge.js 负责，本页只做界面并调用 finish()。 */
(function (global) {
  "use strict";

  const HOLD_MIN_MS = 300;           // 短于这个时长算「点一下」，转入点按切换模式
  const RECOGNIZE_MS = 1000;         // 假识别：固定 1 秒
  const HINT_VISIBLE_MS = 2000;      // 听范读小字显示 2 秒后自动淡出
  const CLICK_GUARD_MS = 500;        // 指针流程刚处理过的 click 不重复处理；键盘 / 读屏的 click 照常走
  const CLASS_REDIRECT_DELAY = 2600; // 课堂模式：公共脚本按这个延迟跳转
  const SCORE_MAX = 5;

  /* 单题数据（任务书 6.4 的例子）。scores 是固定占位值，接真识别时整组替换。 */
  const QUESTION = {
    id: "gen-du-ni-hao",
    prompt: "听一遍，然后跟着读",
    promptId: "Dengarkan dulu, lalu tirukan bacaannya.",
    text: "你好",
    pinyin: "nǐ hǎo",
    reference: "你好，nǐ hǎo",
    referenceNote: "第一声 ＋ 第三声 · Nada pertama + nada ketiga",
    scores: [
      { label: "发音", labelId: "Pelafalan", stars: 3 },
      { label: "流利度", labelId: "Kelancaran", stars: 4 },
      { label: "声调", labelId: "Nada", stars: 3 }
    ],
    flag: "占位演示 · 不是真实评分",
    disclaimer: "分数为占位示例，接入语音识别后替换。",
    disclaimerId: "Skor hanya contoh; akan diganti setelah pengenalan suara tersambung."
  };

  const el = {};
  let phase = "idle";           // idle | recording | recognizing | result
  let gesture = "";             // press = 按住松开结束；toggle = 点一下开始、再点一下结束
  let pressStartedAt = 0;
  let pressActive = false;      // 指针还按在按钮上
  let stopOnRelease = false;    // 这次松开就要结束录音（点按切换的第二次点击）
  let lastPointerHandledAt = 0;
  let finished = false;
  let lastSeconds = 0;
  let startedAt = 0;
  let recognizeTimer = 0;
  let hintTimer = 0;

  function setText(node, text) {
    if (node) node.textContent = text;
  }

  function setHidden(node, hidden) {
    if (node) node.classList.toggle("hidden", !!hidden);
  }

  function cache() {
    el.prompt = document.querySelector("[data-read-aloud-prompt]");
    el.promptId = document.querySelector("[data-read-aloud-prompt-id]");
    el.text = document.querySelector("[data-read-aloud-text]");
    el.pinyin = document.querySelector("[data-read-aloud-pinyin]");
    el.listen = document.querySelector("[data-read-aloud-listen]");
    el.listenHint = document.querySelector("[data-read-aloud-listen-hint]");
    el.listenHintText = document.querySelector("[data-read-aloud-listen-hint-text]");
    el.record = document.querySelector("[data-read-aloud-record]");
    el.recordIcon = document.querySelector("[data-read-aloud-record-icon]");
    el.recordLabel = document.querySelector("[data-read-aloud-record-label]");
    el.wave = document.querySelector("[data-read-aloud-wave]");
    el.result = document.querySelector("[data-read-aloud-result]");
    el.flag = document.querySelector("[data-read-aloud-flag]");
    el.reference = document.querySelector("[data-read-aloud-reference]");
    el.referenceNote = document.querySelector("[data-read-aloud-reference-note]");
    el.scores = document.querySelector("[data-read-aloud-scores]");
    el.disclaimer = document.querySelector("[data-read-aloud-disclaimer]");
    el.disclaimerId = document.querySelector("[data-read-aloud-disclaimer-id]");
    el.finish = document.querySelector("[data-read-aloud-finish]");
    el.announcer = document.querySelector("[data-read-aloud-announcer]");
    el.status = document.querySelector("[data-activity-status]");
    el.badgeIcon = document.querySelector("[data-read-aloud-type-icon]");
    el.badgeName = document.querySelector("[data-read-aloud-type-name]");
    el.modal = document.querySelector("[data-read-aloud-complete]");
    el.modalChange = document.querySelector("[data-read-aloud-change]");
    el.modalReturn = document.querySelector("[data-read-aloud-return]");
  }

  function activityBridge() {
    return global.AICloudActivity || null;
  }

  function activityMeta() {
    const types = global.AICloudActivityTypes;
    const type = document.body.dataset.activityType || "read-aloud";
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

  function announce(text) {
    setText(el.announcer, text);
  }

  /* 听范读：不发声，只在按钮下面出占位小字，2 秒后淡出，可反复点 */
  function handleListen() {
    setText(el.listenHintText, "范读音频待录制（占位）");
    if (el.listenHint) el.listenHint.classList.add("is-visible");
    global.clearTimeout(hintTimer);
    hintTimer = global.setTimeout(function () {
      if (el.listenHint) el.listenHint.classList.remove("is-visible");
    }, HINT_VISIBLE_MS);
    announce("范读音频待录制（占位），这是占位演示，不会发出声音。");
  }

  function resetListenHint() {
    global.clearTimeout(hintTimer);
    if (el.listenHint) el.listenHint.classList.remove("is-visible");
    setText(el.listenHintText, "");
  }

  /* 按钮和波形的样子跟着状态走：待朗读 / 录音中（占位）/ 识别中（占位）/ 已出结果 */
  function paintRecord() {
    if (!el.record) return;
    const recording = phase === "recording";
    const recognizing = phase === "recognizing";
    el.record.classList.toggle("is-recording", recording);
    el.record.classList.toggle("is-recognizing", recognizing);
    el.record.setAttribute("aria-pressed", recording ? "true" : "false");
    el.record.setAttribute("aria-busy", recognizing ? "true" : "false");
    setText(el.recordIcon, recording ? "🔴" : "🎤");
    setText(el.recordLabel, recording
      ? "正在录音…（占位）"
      : recognizing
        ? "识别中…（占位）"
        : phase === "result" ? "再读一次" : "按住说话");
    if (el.wave) el.wave.classList.toggle("is-visible", recording);
  }

  function updateStatus() {
    if (!el.status) return;
    const text = phase === "recording"
      ? "当前状态：录音中（占位）"
      : phase === "recognizing"
        ? "当前状态：识别中（占位）"
        : phase === "result"
          ? "当前状态：已出占位结果"
          : "当前状态：待朗读";
    setText(el.status, text);
  }

  function scoreSummary() {
    return QUESTION.scores.map(function (item) {
      return item.label + " " + item.stars + " 星";
    }).join("，");
  }

  function startRecording(nextGesture) {
    if (phase !== "idle" && phase !== "result") return;
    global.clearTimeout(recognizeTimer);
    gesture = nextGesture;
    phase = "recording";
    setHidden(el.result, true);
    paintRecord();
    updateStatus();
    announce("正在录音（占位）。读完松开按钮，也可以再点一下结束。");
  }

  function stopRecording() {
    if (phase !== "recording") return;
    global.clearTimeout(recognizeTimer);
    phase = "recognizing";
    gesture = "";
    paintRecord();
    updateStatus();
    announce("识别中（占位），请稍等。");
    recognizeTimer = global.setTimeout(showResult, RECOGNIZE_MS);
  }

  function showResult() {
    phase = "result";
    paintRecord();
    updateStatus();
    setHidden(el.result, false);
    announce("占位结果已出。参考朗读：" + QUESTION.reference + "。"
      + scoreSummary() + "。这是占位示例，不是真实评分。");
    if (el.result) {
      if (typeof el.result.focus === "function") el.result.focus({ preventScroll: true });
      if (typeof el.result.scrollIntoView === "function") el.result.scrollIntoView({ block: "center" });
    }
  }

  /* 按住说话：按下开始，松开结束；快速点一下则转成「点一下开始」，等第二次点击结束 */
  function onRecordPointerDown(event) {
    if (typeof event.button === "number" && event.button !== 0) return;
    if (pressActive) return;
    if (phase === "idle" || phase === "result") {
      pressActive = true;
      pressStartedAt = Date.now();
      stopOnRelease = false;
      lastPointerHandledAt = Date.now();
      startRecording("press");
      return;
    }
    if (phase === "recording" && gesture === "toggle") {
      pressActive = true;
      stopOnRelease = true;
      lastPointerHandledAt = Date.now();
    }
  }

  function onRecordPointerRelease() {
    if (!pressActive) return;
    pressActive = false;
    lastPointerHandledAt = Date.now();
    if (stopOnRelease) {
      stopOnRelease = false;
      stopRecording();
      return;
    }
    if (phase !== "recording" || gesture !== "press") return;
    if (Date.now() - pressStartedAt >= HOLD_MIN_MS) {
      stopRecording();
      return;
    }
    gesture = "toggle";
    announce("正在录音（占位）。读完再点一下按钮结束。");
  }

  /* 键盘和读屏走 click：点一下开始，再点一下结束；指针流程刚处理过的不重复响应 */
  function onRecordClick() {
    if (Date.now() - lastPointerHandledAt < CLICK_GUARD_MS) return;
    if (phase === "recording") {
      stopRecording();
      return;
    }
    if (phase === "idle" || phase === "result") startRecording("toggle");
  }

  function completeOnce() {
    if (finished) return null;
    finished = true;
    lastSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const bridge = activityBridge();
    if (!bridge || typeof bridge.finish !== "function") return { recorded: false, next: "" };
    return bridge.finish({
      correct: true, /* 占位版没有对错，如实写 true */
      seconds: lastSeconds,
      detail: "跟读「" + QUESTION.text + "」（占位评分）",
      delay: CLASS_REDIRECT_DELAY
    });
  }

  /* 体验模式：点「完成」自己弹完成弹窗；课堂模式：公共脚本记账后跳转 */
  function handleFinish() {
    if (finished) {
      /* 弹窗被点外面的灰色区域关掉后，体验模式还能再看一次；课堂模式正在跳转，不再弹 */
      if (mode() !== "class") showModal();
      return;
    }
    const outcome = completeOnce();
    if (outcome && outcome.recorded) {
      setText(el.status, outcome.next === "complete.html"
        ? "本题已完成，正在进入完成页…"
        : "本题已完成，正在返回课堂继续下一题…");
      return;
    }
    showModal();
  }

  function showModal() {
    if (!el.modal) return;
    el.modal.classList.remove("hidden");
    if (el.modalChange && typeof el.modalChange.focus === "function") el.modalChange.focus();
  }

  function hideModal() {
    if (el.modal) el.modal.classList.add("hidden");
  }

  function starsMarkup(item) {
    const filled = Math.max(0, Math.min(SCORE_MAX, Number(item.stars) || 0));
    const stars = document.createElement("span");
    stars.className = "read-aloud-stars";
    stars.setAttribute("role", "img");
    stars.setAttribute("aria-label", item.label + "：" + filled + " 星（满分 " + SCORE_MAX + " 星）");

    const on = document.createElement("span");
    on.className = "read-aloud-stars-on";
    on.setAttribute("aria-hidden", "true");
    on.textContent = "★".repeat(filled);

    const off = document.createElement("span");
    off.className = "read-aloud-stars-off";
    off.setAttribute("aria-hidden", "true");
    off.textContent = "☆".repeat(SCORE_MAX - filled);

    stars.appendChild(on);
    stars.appendChild(off);
    return stars;
  }

  function renderScores() {
    if (!el.scores) return;
    el.scores.textContent = "";
    QUESTION.scores.forEach(function (item) {
      const row = document.createElement("li");
      row.className = "read-aloud-score";

      const name = document.createElement("span");
      name.className = "read-aloud-score-name";

      const nameZh = document.createElement("strong");
      nameZh.textContent = item.label;
      name.appendChild(nameZh);

      const nameId = document.createElement("small");
      nameId.setAttribute("lang", "id");
      nameId.textContent = item.labelId;
      name.appendChild(nameId);

      row.appendChild(name);
      row.appendChild(starsMarkup(item));
      el.scores.appendChild(row);
    });
  }

  function renderResult() {
    setText(el.flag, QUESTION.flag);
    setText(el.reference, QUESTION.reference);
    setText(el.referenceNote, QUESTION.referenceNote);
    setText(el.disclaimer, QUESTION.disclaimer);
    setText(el.disclaimerId, QUESTION.disclaimerId);
    renderScores();
  }

  function startQuestion() {
    global.clearTimeout(recognizeTimer);
    hideModal();

    finished = false;
    phase = "idle";
    gesture = "";
    pressActive = false;
    stopOnRelease = false;
    lastPointerHandledAt = 0;
    startedAt = Date.now();

    setText(el.prompt, QUESTION.prompt);
    setText(el.promptId, QUESTION.promptId);
    setHidden(el.promptId, !QUESTION.promptId);
    setText(el.text, QUESTION.text);
    setText(el.pinyin, QUESTION.pinyin);

    resetListenHint();
    setHidden(el.result, true);
    renderResult();
    paintRecord();
    updateStatus();
    announce("待朗读。先点「听范读」看正确读音，再按住「按住说话」读一遍。");
  }

  function bindEvents() {
    if (el.listen) el.listen.addEventListener("click", handleListen);
    if (el.record) {
      el.record.addEventListener("pointerdown", onRecordPointerDown);
      el.record.addEventListener("click", onRecordClick);
      /* 长按别弹出右键菜单 / 文本选择 */
      el.record.addEventListener("contextmenu", function (event) {
        event.preventDefault();
      });
    }
    document.addEventListener("pointerup", onRecordPointerRelease);
    document.addEventListener("pointercancel", onRecordPointerRelease);
    global.addEventListener("blur", onRecordPointerRelease);
    if (el.finish) el.finish.addEventListener("click", handleFinish);
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

  global.AICloudReadAloudPage = { boot: boot, startQuestion: startQuestion };
})(typeof window !== "undefined" ? window : globalThis);
