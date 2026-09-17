/* 开放问答 · interaction-open-qa.html 页面脚本（占位版）
   状态机：待作答 → 录音中（占位） → 识别中（占位） → 占位结果卡 → 已提交。
   录音是假的：不调用麦克风、不申请授权、不发出声音；假波形只是 CSS 动画，
   所以浏览器不会弹授权框。以后接上真录音（MediaRecorder）＋ 语音识别时，
   只要换掉录制和识别这两步，状态机和页面骨架不用重写。
   进度记账和课堂跳转都由 shared/activity-bridge.js 负责，本页只做界面并调用 finish()。 */
(function (global) {
  "use strict";

  const RECOGNIZE_MS = 1000;          // 识别态固定 1 秒（假流程，整段不超过 2 秒）
  const TAP_MS = 260;                 // 按下不超过这么久算「点一下」，进点按模式
  const CLASS_REDIRECT_DELAY = 2600;  // 课堂模式：公共脚本按这个延迟跳转
  const MAX_STARS = 5;

  const PHASE_IDLE = "idle";
  const PHASE_RECORDING = "recording";
  const PHASE_RECOGNIZING = "recognizing";
  const PHASE_RESULT = "result";
  const PHASE_DONE = "done";

  /* 单题数据（任务书 8.4 的例子）。
     以后转正时换成接口返回的题目即可，界面和状态机不用动。 */
  const QUESTION = {
    id: "zhoumo-xihuan-zuo-shenme",
    prompt: "你周末喜欢做什么？",
    promptId: "Akhir pekan kamu suka melakukan apa?",
    hints: [
      { text: "听音乐", pinyin: "tīng yīnyuè" },
      { text: "打篮球", pinyin: "dǎ lánqiú" },
      { text: "和朋友玩", pinyin: "hé péngyou wán" }
    ],
    answer: "我周末喜欢听音乐。",
    answerPinyin: "Wǒ zhōumò xǐhuan tīng yīnyuè.",
    pattern: "我周末喜欢 ______ 。",
    patternId: "Pada akhir pekan saya suka ______ .",
    scores: [
      { name: "内容", nameId: "Isi", stars: 3 },
      { name: "完整度", nameId: "Kelengkapan", stars: 3 },
      { name: "发音", nameId: "Pelafalan", stars: 3 }
    ],
    detail: "占位演示：说完一句回答"
  };

  const el = {};
  let phase = PHASE_IDLE;
  let finished = false;
  let startedAt = 0;
  let lastSeconds = 0;
  let holdActive = false;       // 当前这次录音是不是「按住」发起的
  let pressAt = 0;
  let recognizeTimer = 0;

  function setText(node, text) {
    if (node) node.textContent = text;
  }

  function setHidden(node, hidden) {
    if (node) node.classList.toggle("hidden", !!hidden);
  }

  function cache() {
    el.question = document.querySelector("[data-openqa-question]");
    el.questionId = document.querySelector("[data-openqa-question-id]");
    el.hints = document.querySelector("[data-openqa-hints]");
    el.mic = document.querySelector("[data-openqa-mic]");
    el.micLabel = document.querySelector("[data-openqa-mic-label]");
    el.wave = document.querySelector("[data-openqa-wave]");
    el.result = document.querySelector("[data-openqa-result]");
    el.answer = document.querySelector("[data-openqa-answer]");
    el.answerPinyin = document.querySelector("[data-openqa-answer-pinyin]");
    el.pattern = document.querySelector("[data-openqa-pattern]");
    el.patternId = document.querySelector("[data-openqa-pattern-id]");
    el.scores = document.querySelector("[data-openqa-scores]");
    el.finish = document.querySelector("[data-openqa-finish]");
    el.announcer = document.querySelector("[data-openqa-announcer]");
    el.status = document.querySelector("[data-activity-status]");
    el.badgeIcon = document.querySelector("[data-openqa-type-icon]");
    el.badgeName = document.querySelector("[data-openqa-type-name]");
    el.modal = document.querySelector("[data-openqa-complete]");
    el.modalBadge = document.querySelector("[data-openqa-modal-badge]");
    el.modalTitle = document.querySelector("[data-openqa-modal-title]");
    el.modalId = document.querySelector("[data-openqa-modal-id]");
    el.modalCopy = document.querySelector("[data-openqa-modal-copy]");
    el.modalChange = document.querySelector("[data-openqa-change]");
    el.modalReturn = document.querySelector("[data-openqa-return]");
  }

  function activityBridge() {
    return global.AICloudActivity || null;
  }

  function activityMeta() {
    const types = global.AICloudActivityTypes;
    const type = document.body.dataset.activityType || "open-qa";
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

  function renderHints() {
    if (!el.hints) return;
    el.hints.innerHTML = "";
    QUESTION.hints.forEach(function (hint) {
      const item = document.createElement("li");
      item.className = "openqa-hint";
      const text = document.createElement("span");
      text.textContent = hint.text;
      item.appendChild(text);
      if (hint.pinyin) {
        const pinyin = document.createElement("span");
        pinyin.className = "openqa-hint-pinyin";
        pinyin.lang = "zh-Latn-pinyin";
        pinyin.textContent = hint.pinyin;
        item.appendChild(pinyin);
      }
      el.hints.appendChild(item);
    });
  }

  /* 占位评分：固定值，每次一样，不是真实评分 */
  function renderScores() {
    if (!el.scores) return;
    el.scores.innerHTML = "";
    QUESTION.scores.forEach(function (score) {
      const filled = Math.max(0, Math.min(MAX_STARS, Number(score.stars) || 0));
      const row = document.createElement("li");
      row.className = "openqa-score";

      const name = document.createElement("span");
      name.className = "openqa-score-name";
      name.textContent = score.name;

      const stars = document.createElement("span");
      stars.className = "openqa-stars";
      stars.setAttribute("role", "img");
      stars.setAttribute("aria-label", score.name + " " + filled + " / " + MAX_STARS + " 星（占位示例）");
      stars.textContent = new Array(filled + 1).join("★");

      const dim = document.createElement("span");
      dim.className = "openqa-stars-dim";
      dim.textContent = new Array(MAX_STARS - filled + 1).join("☆");
      stars.appendChild(dim);

      row.appendChild(name);
      row.appendChild(stars);
      el.scores.appendChild(row);
    });
  }

  /* 按钮上的文案和样式都跟着状态走，录音 / 识别时给不同的颜色和动画 */
  function paintMic() {
    if (!el.mic) return;
    const isRecording = phase === PHASE_RECORDING;
    const isBusy = phase === PHASE_RECOGNIZING;
    const isLocked = isBusy || phase === PHASE_RESULT || phase === PHASE_DONE;

    el.mic.classList.toggle("is-recording", isRecording);
    el.mic.classList.toggle("is-busy", isBusy);
    el.mic.disabled = isLocked;
    el.mic.setAttribute("aria-pressed", isRecording ? "true" : "false");

    let label = "按住说话";
    if (isRecording) label = "正在录音…（占位）";
    else if (isBusy) label = "识别中…（占位）";
    else if (isLocked) label = "已作答（占位）";
    setText(el.micLabel, label);
    if (el.mic) el.mic.setAttribute("aria-label", label);

    if (el.wave) el.wave.classList.toggle("is-visible", isRecording);
  }

  function updateStatus() {
    if (!el.status) return;
    let text = "当前状态：待作答";
    if (phase === PHASE_RECORDING) text = "当前状态：录音中（占位）";
    else if (phase === PHASE_RECOGNIZING) text = "当前状态：识别中（占位）";
    else if (phase === PHASE_RESULT) text = "当前状态：已生成占位结果";
    else if (phase === PHASE_DONE) text = "当前状态：已完成（单独体验不计入课堂进度）";
    setText(el.status, text);
  }

  function setPhase(next) {
    phase = next;
    paintMic();
    updateStatus();
  }

  function resetResult() {
    setHidden(el.result, true);
  }

  function showModal() {
    if (!el.modal) return;
    setText(el.modalBadge, "✅");
    setText(el.modalTitle, "本题已完成");
    setText(el.modalId, "Aktivitas ini sudah selesai.");
    setText(el.modalCopy, "作答已完成，可以换一个题型再练一练，或者回到课堂。");
    el.modal.classList.remove("hidden");
    if (el.modalChange && typeof el.modalChange.focus === "function") el.modalChange.focus();
  }

  function hideModal() {
    if (el.modal) el.modal.classList.add("hidden");
  }

  function startRecording() {
    if (phase !== PHASE_IDLE) return;
    setPhase(PHASE_RECORDING);
    announce("正在录音（占位）。不会打开麦克风，说完松开按钮。");
  }

  /* 松开就进识别态：固定转 1 秒，不给假流程拖时间 */
  function stopRecording() {
    if (phase !== PHASE_RECORDING) return;
    setPhase(PHASE_RECOGNIZING);
    announce("识别中（占位），不会上传任何声音。");
    global.clearTimeout(recognizeTimer);
    recognizeTimer = global.setTimeout(showResult, RECOGNIZE_MS);
  }

  function showResult() {
    global.clearTimeout(recognizeTimer);
    setPhase(PHASE_RESULT);
    if (el.result) {
      el.result.classList.remove("hidden");
      if (typeof el.result.focus === "function") el.result.focus({ preventScroll: true });
      if (typeof el.result.scrollIntoView === "function") el.result.scrollIntoView({ block: "center" });
    }
    announce("占位结果已生成。参考答案：" + QUESTION.answer + "分数是占位示例，不是真实评分。");
  }

  function completeOnce() {
    if (finished) return null;
    finished = true;
    const bridge = activityBridge();
    if (!bridge || typeof bridge.finish !== "function") return { recorded: false, next: "" };
    return bridge.finish({
      correct: true,               // 占位版没有对错，如实写 true
      seconds: lastSeconds,
      detail: QUESTION.detail,
      delay: CLASS_REDIRECT_DELAY
    });
  }

  /* 结果卡上的「完成」：体验模式自己弹完成弹窗，课堂模式交给公共脚本记账跳转 */
  function handleFinish() {
    if (phase !== PHASE_RESULT && phase !== PHASE_DONE) return;
    lastSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    setPhase(PHASE_DONE);
    if (el.finish) {
      el.finish.disabled = true;
      el.finish.textContent = "已完成";
    }

    const outcome = completeOnce();
    if (outcome && outcome.recorded) {
      setText(el.status, outcome.next === "complete.html"
        ? "已提交，正在进入完成页…"
        : "已提交，正在返回课堂继续下一题…");
      return;
    }
    showModal();
  }

  function onPointerDown(event) {
    if (event && event.pointerType === "mouse" && event.button !== 0) return;
    if (phase !== PHASE_IDLE && phase !== PHASE_RECORDING) return;

    if (el.mic && event && typeof el.mic.setPointerCapture === "function") {
      try {
        el.mic.setPointerCapture(event.pointerId);
      } catch (error) {
        /* 不支持指针捕获时靠 window 上的 pointerup 兜底 */
      }
    }

    if (phase === PHASE_IDLE) {
      pressAt = Date.now();
      holdActive = true;
      startRecording();
      return;
    }
    /* 点按模式：再按一下就来结束这次录音 */
    if (!holdActive) stopRecording();
  }

  function onPointerUp() {
    if (!holdActive) return;
    holdActive = false;
    if (phase !== PHASE_RECORDING) return;
    /* 按一下就松（桌面演示、无障碍都常用）：当成「点一下开始」，继续录，等下一次点击结束 */
    if (Date.now() - pressAt < TAP_MS) {
      announce("已开始录音（占位）。再点一下按钮结束。");
      return;
    }
    stopRecording();
  }

  function onPointerCancel() {
    holdActive = false;
    if (phase === PHASE_RECORDING) stopRecording();
  }

  /* 键盘（回车 / 空格）没有指针事件，这里补一个开关式的入口 */
  function onMicClick(event) {
    if (event && typeof event.detail === "number" && event.detail !== 0) return;
    if (phase === PHASE_IDLE) startRecording();
    else if (phase === PHASE_RECORDING) stopRecording();
  }

  function startQuestion() {
    global.clearTimeout(recognizeTimer);
    hideModal();
    holdActive = false;

    finished = false;
    lastSeconds = 0;
    startedAt = Date.now();

    setText(el.question, QUESTION.prompt);
    setText(el.questionId, QUESTION.promptId);
    setHidden(el.questionId, !QUESTION.promptId);
    setText(el.answer, QUESTION.answer);
    setText(el.answerPinyin, QUESTION.answerPinyin);
    setText(el.pattern, QUESTION.pattern);
    setText(el.patternId, QUESTION.patternId);

    renderHints();
    renderScores();
    resetResult();
    if (el.finish) {
      el.finish.disabled = false;
      el.finish.textContent = "完成";
    }
    setPhase(PHASE_IDLE);
    announce("待作答。" + QUESTION.prompt);
  }

  function bindEvents() {
    if (el.mic) {
      el.mic.addEventListener("pointerdown", onPointerDown);
      el.mic.addEventListener("pointerup", onPointerUp);
      el.mic.addEventListener("pointercancel", onPointerCancel);
      el.mic.addEventListener("click", onMicClick);
      /* 长按不要弹出系统的复制 / 选择菜单 */
      el.mic.addEventListener("contextmenu", function (event) {
        event.preventDefault();
      });
    }
    /* 指针捕获没生效时（老浏览器）在 window 上收尾，避免一直停在录音态 */
    global.addEventListener("pointerup", onPointerUp);
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

  global.AICloudOpenQaPage = { boot: boot, startQuestion: startQuestion };
})(typeof window !== "undefined" ? window : globalThis);
