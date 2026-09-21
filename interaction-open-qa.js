/* 开放问答 · interaction-open-qa.html 页面脚本
   状态机：待作答 → 录音中 → 识别中（固定 1 秒）→ 学习卡（结果态）。
   假流程：按住「🎤 按住说话」出现假波形，松开（或再点一下）后转 1 秒「识别中…」，
   然后给一句鼓励和句型提示。这一页不打分，也没有【完成】键——录音本身就是交卷：
   学习卡一出现就记账；课堂模式由公共脚本按固定延迟自动跳回课堂，演示模式约 2 秒后
   自动弹「收到啦」弹窗。结果态那颗键原地换成安静款【再说一次】，按它才重录
   （重录只算练习，不重复记账；重录时撤销还没弹的弹窗，出新结果后重新计时）。
   全程不调用麦克风、不申请授权、不发声音。
   进度记账由 shared/activity-bridge.js 负责（课堂跳转也交给它），本页只做界面并调用 finish()。 */
(function (global) {
  "use strict";

  const RECOGNIZE_MS = 1000;          // 识别态固定 1 秒
  const TAP_MS = 260;                 // 按下不超过这么久算「点一下」
  const CLASS_REDIRECT_DELAY = 2600;  // 课堂模式：公共脚本记账后按这个延迟自动跳回课堂（节奏同完成键时代）
  const MODAL_DELAY = 2000;           // 演示模式：学习卡先出场，弹窗约 2 秒后到（同选择题节奏）
  const modal = global.AICloudFeedbackModal || null;
  const copy = global.AICloudFeedbackCopy || {};

  /* 单题数据。以后转正时换成接口返回的题目即可，界面和状态机不用动。 */
  const QUESTION = {
    id: "zhoumo-xihuan-zuo-shenme",
    prompt: "你周末喜欢做什么？",
    promptId: "Akhir pekan kamu suka melakukan apa?",
    hints: [
      { text: "听音乐", pinyin: "tīng yīnyuè", meaningId: "mendengarkan musik" },
      { text: "打篮球", pinyin: "dǎ lánqiú", meaningId: "bermain basket" },
      { text: "和朋友玩", pinyin: "hé péngyou wán", meaningId: "bermain dengan teman" }
    ],
    pattern: "我周末喜欢 ______ 。",
    patternId: "Pada akhir pekan saya suka ______ .",
    /* 只夸「开口了」这件事，不夸结果（没有真的在听学生说） */
    praise: { zh: "说得不错！", id: "Bagus!" }
  };

  const el = {};
  let micState = "idle";        // idle（待作答）| recording（录音中）| recognizing（识别中）| result（已出学习卡）
  let submitted = false;        // 交卷只记一次，重录不重置
  let startedAt = 0;
  let lastSeconds = 0;
  let holdActive = false;       // 当前这次录音是不是「按住」发起的
  let pressAt = 0;
  let recognizeTimer = 0;
  let modalTimer = 0;           // 还没弹出来的自动弹窗

  function setText(node, text) {
    if (node) node.textContent = text;
  }

  function setHidden(node, hidden) {
    if (node) node.classList.toggle("hidden", !!hidden);
  }

  function cache() {
    el.card = document.querySelector(".openqa-card");
    el.question = document.querySelector("[data-openqa-question]");
    el.questionId = document.querySelector("[data-openqa-question-id]");
    el.hints = document.querySelector("[data-openqa-hints]");
    el.mic = document.querySelector("[data-openqa-mic]");
    el.micLabel = document.querySelector("[data-openqa-mic-label]");
    el.wave = document.querySelector("[data-openqa-wave]");
    el.result = document.querySelector("[data-openqa-result]");
    el.pattern = document.querySelector("[data-openqa-pattern]");
    el.patternId = document.querySelector("[data-openqa-pattern-id]");
    el.praise = document.querySelector("[data-openqa-praise]");
    el.praiseId = document.querySelector("[data-openqa-praise-id]");
    el.announcer = document.querySelector("[data-openqa-announcer]");
  }

  function activityBridge() {
    return global.AICloudActivity || null;
  }

  function mode() {
    const bridge = activityBridge();
    if (!bridge || typeof bridge.context !== "function") return "solo";
    return bridge.context().mode;
  }

  /* 返回按钮：课堂模式回课堂互动，体验模式也回课堂页 */
  function applyShellText() {
    const back = document.querySelector("[data-activity-back]");
    if (!back) return;
    const isClass = mode() === "class";
    back.setAttribute("href", "classroom.html");
    back.setAttribute("aria-label", isClass ? "返回课堂互动" : "返回课堂");
  }

  function announce(text) {
    setText(el.announcer, text);
  }

  /* 关键词：汉字 + 一条「拼音 · 印尼语意思」，只展示、点不动 */
  function renderHints() {
    if (!el.hints) return;
    el.hints.innerHTML = "";
    QUESTION.hints.forEach(function (hint) {
      const item = document.createElement("li");
      item.className = "openqa-hint";

      const word = document.createElement("strong");
      word.className = "openqa-hint-word";
      word.textContent = hint.text;

      const note = document.createElement("span");
      note.className = "openqa-hint-note";

      if (hint.pinyin) {
        const pinyin = document.createElement("span");
        pinyin.className = "openqa-hint-pinyin";
        pinyin.lang = "zh-Latn-pinyin";
        pinyin.textContent = hint.pinyin;
        note.appendChild(pinyin);
      }

      if (hint.pinyin && hint.meaningId) {
        const sep = document.createElement("i");
        sep.className = "openqa-hint-sep";
        sep.setAttribute("aria-hidden", "true");
        sep.textContent = "·";
        note.appendChild(sep);
      }

      if (hint.meaningId) {
        const meaning = document.createElement("span");
        meaning.className = "openqa-hint-meaning";
        meaning.lang = "id";
        meaning.textContent = hint.meaningId;
        note.appendChild(meaning);
      }

      item.appendChild(word);
      item.appendChild(note);
      el.hints.appendChild(item);
    });
  }

  /* 按钮、波形都跟着状态走：待作答 / 录音中 / 识别中 / 出学习卡 */
  function paintMic() {
    if (!el.mic) return;
    const recording = micState === "recording";
    const recognizing = micState === "recognizing";
    /* 结果态：紫色大按钮降级成次要款【再说一次】（照跟读页）——键不灰、能再录 */
    const retry = micState === "result";
    if (el.card) el.card.classList.toggle("is-result", retry);
    el.mic.classList.toggle("is-recording", recording);
    el.mic.classList.toggle("is-recognizing", recognizing);
    el.mic.classList.toggle("is-retry", retry);
    el.mic.setAttribute("aria-pressed", recording ? "true" : "false");
    el.mic.setAttribute("aria-busy", recognizing ? "true" : "false");
    setText(el.micLabel, recording
      ? "正在录音…"
      : recognizing
        ? "识别中…"
        : retry ? "再说一次" : "按住说话");
    if (el.wave) el.wave.classList.toggle("is-visible", recording);
  }

  /* 按下（待作答或结果态都可）：重录时撤掉上一轮还没弹的自动弹窗，收起旧学习卡 */
  function startRecording() {
    if (micState !== "idle" && micState !== "result") return;
    cancelModalSoon();
    closeModal();
    setHidden(el.result, true);
    micState = "recording";
    paintMic();
    announce("正在录音。说完松开按钮。");
  }

  /* 松开 / 再点一下：进入假识别，固定 1 秒 */
  function stopRecording() {
    if (micState !== "recording") return;
    global.clearTimeout(recognizeTimer);
    micState = "recognizing";
    lastSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    paintMic();
    announce("识别中，请稍等。");
    recognizeTimer = global.setTimeout(showResult, RECOGNIZE_MS);
  }

  /* 假识别的终点：学习卡（一句鼓励 + 句型框）＝交卷那一刻，不做真判分 */
  function showResult() {
    global.clearTimeout(recognizeTimer);
    micState = "result";
    lastSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    paintMic();
    if (el.result) {
      el.result.classList.remove("hidden");
      if (typeof el.result.focus === "function") el.result.focus({ preventScroll: true });
      /* 一屏放得下时不动页面；实在放不下才滚最小距离（不强行居中，免得松手就跳一下） */
      if (typeof el.result.scrollIntoView === "function") el.result.scrollIntoView({ block: "nearest" });
    }
    announce("说完了。" + QUESTION.praise.zh + "你可以这样说：" + QUESTION.pattern);
    submitOnce();
  }

  /* 交卷：只记第一次（重录只算练习）。课堂模式记账后由公共脚本到点自动回课堂，页面不弹窗；
     演示模式学习卡先出场，约 2 秒后自动弹「收到啦」（同选择题节奏） */
  function submitOnce() {
    const outcome = completeOnce();
    cancelModalSoon();
    /* 课堂模式：记账交给公共脚本，到点自动回课堂，页面始终不弹窗（重录也不弹）；
       演示模式：没记成账（或已经记过一次、这次只是重练）才走自动弹窗 */
    if ((outcome && outcome.recorded) || mode() === "class") return;
    modalTimer = global.setTimeout(openModal, MODAL_DELAY);
  }

  function completeOnce() {
    if (submitted) return null;
    submitted = true;
    lastSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const bridge = activityBridge();
    if (!bridge || typeof bridge.finish !== "function") return { recorded: false, next: "" };
    return bridge.finish({
      correct: true,               /* 这一页没有对错，如实写 true */
      seconds: lastSeconds,
      detail: "开放问答",
      delay: CLASS_REDIRECT_DELAY  /* 课堂模式：记账后到点自动回课堂 */
    });
  }

  function cancelModalSoon() {
    global.clearTimeout(modalTimer);
    modalTimer = 0;
  }

  /* 自动弹窗：公共模具（这一页没有对错，用中性语气 + 记录类文案） */
  function openModal() {
    if (!modal || typeof modal.open !== "function") return;
    const praise = (copy && copy.record) || { zh: "收到啦！", id: "Sudah diterima!" };
    modal.open({
      badge: "🎤",
      titleZh: praise.zh,
      titleId: praise.id,
      actions: [
        {
          label: "返回课堂",
          onSelect: function () {
            if (global.location) global.location.href = "classroom.html";
          }
        },
        { label: "再练一次", icon: "↻", onSelect: restartQuestion }
      ]
    });
  }

  function closeModal() {
    if (modal && typeof modal.close === "function") modal.close();
  }

  /* 再练一次：关掉弹窗，回到「按住说话」的初始状态，可以重录 */
  function restartQuestion() {
    cancelModalSoon();
    closeModal();
    startQuestion();
  }

  function onPointerDown(event) {
    if (event && event.pointerType === "mouse" && event.button !== 0) return;
    if (micState !== "idle" && micState !== "recording" && micState !== "result") return;

    if (el.mic && event && typeof el.mic.setPointerCapture === "function") {
      try {
        el.mic.setPointerCapture(event.pointerId);
      } catch (error) {
        /* 不支持指针捕获时靠 window 上的 pointerup 兜底 */
      }
    }

    /* 待作答、结果态（【再说一次】）：按下即开始新一次录音 */
    if (micState === "idle" || micState === "result") {
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
    if (micState !== "recording") return;
    /* 按一下就松（桌面演示、无障碍都常用）：当成「点一下开始」，继续录，等下一次点击结束 */
    if (Date.now() - pressAt < TAP_MS) {
      announce("已开始录音。再点一下按钮结束。");
      return;
    }
    stopRecording();
  }

  function onPointerCancel() {
    holdActive = false;
    if (micState === "recording") stopRecording();
  }

  /* 键盘（回车 / 空格）没有指针事件，这里补一个开关式的入口 */
  function onMicClick(event) {
    if (event && typeof event.detail === "number" && event.detail !== 0) return;
    if (micState === "idle" || micState === "result") startRecording();
    else if (micState === "recording") stopRecording();
  }

  function startQuestion() {
    global.clearTimeout(recognizeTimer);
    cancelModalSoon();
    closeModal();
    holdActive = false;

    lastSeconds = 0;
    startedAt = Date.now();

    setText(el.question, QUESTION.prompt);
    setText(el.questionId, QUESTION.promptId);
    setText(el.praise, QUESTION.praise.zh);
    setText(el.praiseId, QUESTION.praise.id);
    setText(el.pattern, QUESTION.pattern);
    setText(el.patternId, QUESTION.patternId);

    renderHints();
    setHidden(el.result, true);
    micState = "idle";
    paintMic();
    announce("按住说话，用中文回答：" + QUESTION.prompt);
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
