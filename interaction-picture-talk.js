/* 看图说话 · interaction-picture-talk.html 页面脚本
   状态机：待作答 → 录音中 → 识别中 → 出学习卡（＝交卷）→ 已说完。
   录音和识别都是假的：不碰麦克风、不弹授权框、不发出任何声音；
   假识别固定 1 秒，整段假流程不超过 2 秒。这一页没有对错：录音即交卷，没有「完成」按钮。
   按住说话：按住超过 350ms 再松开就算说完了；也支持点一下开始、再点一下结束。
   说完后按钮变成安静款「再说一次」：按下才重录，不自动开录；记账只记第一次。
   图槽、参考答案都按可替换字段写：图片路径一填、识别接上，页面代码不用重写。
   出结果就交卷：两种模式都在约 2 秒后弹 shared/feedback-modal.js 的公共弹窗，
   课堂模式下由弹窗按钮跳回课堂（进度记账在 shared/activity-bridge.js）。 */
(function (global) {
  "use strict";

  const HOLD_MS = 350;                 // 按住超过这个时长，松开就算说完了；短按则等学生再点一下结束
  const RECOGNIZE_MS = 1000;           // 假识别固定 1 秒
  const SOLO_MODAL_DELAY = 2000;       // 演示模式：出结果后留 2 秒看反馈，再自动弹「收到啦」（同听音页节奏）
  const CHEER = { zh: "说得不错！", id: "Bagus!" };  // 只夸「开口说了」，不评结果（这一页不打分）
  const modal = global.AICloudFeedbackModal || null;
  const copy = global.AICloudFeedbackCopy || {};

  /* 单题数据（任务书 7.4 的例子）。prompt 只给读屏，页面上让大图自己说话。
     image 先留空字符串：以后把真图放进 public/shared/demo-materials/，
     把路径填到这个字段里，图槽就渲染 <img>——页面代码不用改。 */
  const QUESTION = {
    id: "kan-tu-paobu",
    prompt: "看这张图，用中文说一句话。",
    hint: "试试说：谁 + 在做什么 · Coba: siapa + sedang apa",
    icon: "🏃",
    image: "",
    imageAlt: "一个小朋友在跑步",
    answer: "小朋友在跑步。",
    answerId: "Anak itu sedang berlari."
  };

  const el = {};
  let micState = "idle";       // idle（待作答）| recording（录音中）| recognizing（识别中）| done（已说完）
  let finished = false;
  let lastSeconds = 0;
  let startedAt = 0;
  let pressStartedAt = 0;
  let pressedWhileRecording = false;
  let recognizeTimer = 0;
  let modalTimer = 0;                  // 演示模式的自动弹窗计时器：重录要取消它

  function setText(node, text) {
    if (node) node.textContent = text;
  }

  function setHidden(node, hidden) {
    if (node) node.classList.toggle("hidden", !!hidden);
  }

  function cache() {
    el.prompt = document.querySelector("[data-picture-talk-prompt]");
    el.slot = document.querySelector("[data-picture-talk-slot]");
    el.hint = document.querySelector("[data-picture-talk-hint]");
    el.mic = document.querySelector("[data-picture-talk-mic]");
    el.micLabel = document.querySelector("[data-picture-talk-mic-label]");
    el.wave = document.querySelector("[data-picture-talk-wave]");
    el.card = document.querySelector(".picture-talk-card");
    el.result = document.querySelector("[data-picture-talk-result]");
    el.answer = document.querySelector("[data-picture-talk-answer]");
    el.answerId = document.querySelector("[data-picture-talk-answer-id]");
    el.cheer = document.querySelector("[data-picture-talk-cheer]");
    el.announcer = document.querySelector("[data-picture-talk-announcer]");
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

  /* 图槽：image 有值渲染 <img src alt>，为空渲染放大后的 emoji（同一套可替换槽位） */
  function renderPictureSlot() {
    if (!el.slot) return;
    el.slot.innerHTML = "";

    const inner = document.createElement("div");
    inner.className = "picture-talk-slot-inner";

    if (QUESTION.image) {
      const image = document.createElement("img");
      image.src = QUESTION.image;
      image.alt = QUESTION.imageAlt || "";
      inner.appendChild(image);
    } else {
      const emoji = document.createElement("span");
      emoji.className = "picture-talk-slot-emoji";
      emoji.setAttribute("role", "img");
      emoji.setAttribute("aria-label", QUESTION.imageAlt || "");
      emoji.textContent = QUESTION.icon;
      inner.appendChild(emoji);
    }

    el.slot.appendChild(inner);
  }

  /* 按钮、波形、朗读文案都跟着状态走：待作答 / 录音中 / 识别中 / 已说完 */
  function paintMic() {
    if (!el.mic) return;
    const recording = micState === "recording";
    const recognizing = micState === "recognizing";
    el.mic.classList.toggle("is-recording", recording);
    el.mic.classList.toggle("is-recognizing", recognizing);
    /* 说完：紫色大按钮降级成安静款「再说一次」（不禁用，按一下才重录） */
    el.mic.classList.toggle("is-retry", micState === "done");
    /* 结果态：按钮下面那行小字收走（初始态还留着） */
    if (el.card) el.card.classList.toggle("is-result", micState === "done");
    el.mic.setAttribute("aria-pressed", recording ? "true" : "false");
    el.mic.setAttribute("aria-busy", recognizing ? "true" : "false");
    setText(el.micLabel, recording
      ? "正在录音…"
      : recognizing
        ? "识别中…"
        : micState === "done" ? "再说一次" : "按住说话");
    if (el.wave) el.wave.classList.toggle("is-visible", recording);
  }

  /* 按下：只改状态和动效，不碰麦克风 */
  function startRecording() {
    if (micState !== "idle") return;
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

  /* 假识别的终点：学习卡给出一句鼓励 + 参考答案，这一页不打分、不给星级。
     出结果就是交卷，所以这里顺手把账记了。 */
  function showResult() {
    micState = "done";
    lastSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    paintMic();
    announce(CHEER.zh + "参考答案：" + QUESTION.answer);
    if (el.result) {
      el.result.classList.remove("hidden");
      if (typeof el.result.focus === "function") el.result.focus({ preventScroll: true });
      if (typeof el.result.scrollIntoView === "function") el.result.scrollIntoView({ block: "center" });
    }
    submitResult();
  }

  function completeOnce() {
    if (finished) return null;
    finished = true;
    const bridge = activityBridge();
    if (!bridge || typeof bridge.finish !== "function") return { recorded: false, next: "" };
    return bridge.finish({
      correct: true,                 /* 这一页没有对错，如实写 true */
      seconds: lastSeconds,
      detail: "看图说话"
    });
  }

  /* 录音即交卷：课堂模式由公共脚本记进度；两种模式都弹弹窗，跳转由弹窗按钮负责 */
  function submitResult() {
    completeOnce();
    scheduleModal();
  }

  /* 演示模式的自动弹窗：留 2 秒看反馈；重录取消它，出了新结果再重新计时 */
  function scheduleModal() {
    global.clearTimeout(modalTimer);
    modalTimer = global.setTimeout(openModal, SOLO_MODAL_DELAY);
  }

  /* 完成弹窗：公共模具（这一页没有对错，用中性语气 + 记录类文案） */
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
    closeModal();
    startQuestion();
  }

  /* 按住说话：按下开始，松开结束（按住超过 HOLD_MS 才算「说完」）；
     短按两下就是「点一下开始、再点一下结束」，桌面演示和无障碍都方便 */
  function handleMicDown(event) {
    if (typeof event.button === "number" && event.button !== 0) return;
    /* 结果态：这一下是「再说一次」——按下去才重录，不自动开录 */
    if (micState === "done") { restartQuestion(); return; }
    if (micState !== "idle" && micState !== "recording") return;
    pressedWhileRecording = micState === "recording";
    pressStartedAt = Date.now();
    if (micState === "idle") startRecording();
  }

  function handleMicUp(event) {
    if (micState !== "recording") return;
    if (typeof event.button === "number" && event.button !== 0) return;
    const held = Date.now() - pressStartedAt;
    if (pressedWhileRecording || held >= HOLD_MS) stopRecording();
    /* 短按：保持在录音态，等学生再点一下结束 */
  }

  function handleMicClick(event) {
    /* 鼠标和触摸的 click 已经由 pointerdown / pointerup 处理，这里只管键盘（Enter / 空格）；
       浏览器不支持 PointerEvent 时（老 Safari），click 就是唯一入口 */
    const fromKeyboard = !event || event.detail === 0;
    if (!fromKeyboard && typeof global.PointerEvent === "function") return;
    if (micState === "done") { restartQuestion(); return; }
    if (micState === "idle") startRecording();
    else if (micState === "recording") stopRecording();
  }

  function startQuestion() {
    global.clearTimeout(recognizeTimer);
    global.clearTimeout(modalTimer);     /* 重录：取消还没弹的自动弹窗 */
    closeModal();

    micState = "idle";
    lastSeconds = 0;
    startedAt = Date.now();
    pressStartedAt = 0;
    pressedWhileRecording = false;

    setText(el.prompt, QUESTION.prompt);
    setText(el.hint, QUESTION.hint);
    setHidden(el.hint, !QUESTION.hint);
    setText(el.answer, QUESTION.answer);
    setText(el.answerId, QUESTION.answerId);
    setHidden(el.answerId, !QUESTION.answerId);

    renderPictureSlot();
    setText(el.cheer, CHEER.zh + " · " + CHEER.id);
    paintMic();
    if (el.result) el.result.classList.add("hidden");
    announce("待作答。" + QUESTION.prompt);
  }

  function bindEvents() {
    if (el.mic) {
      el.mic.addEventListener("pointerdown", handleMicDown);
      el.mic.addEventListener("click", handleMicClick);
      /* 按下后手指滑出按钮再松开也算说完 */
      global.addEventListener("pointerup", handleMicUp);
      global.addEventListener("pointercancel", handleMicUp);
    }
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

  global.AICloudPictureTalkPage = { boot: boot, startQuestion: startQuestion };
})(typeof window !== "undefined" ? window : globalThis);
