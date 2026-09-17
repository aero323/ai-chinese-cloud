/* 看图说话 · interaction-picture-talk.html 页面脚本（占位版）
   状态机：待作答 → 录音中（占位）→ 识别中（占位）→ 占位结果卡 → 已完成。
   录音和识别都是假的：不碰麦克风、不弹授权框、不发出任何声音；
   假识别固定 1 秒，整段假流程不超过 2 秒。
   按住说话：按住超过 350ms 再松开就算说完了；也支持点一下开始、再点一下结束。
   图槽、参考答案、示例评分都按可替换字段写：图片路径一填、识别接上，页面代码不用重写。
   进度记账和课堂跳转都由 shared/activity-bridge.js 负责，本页只做界面并调用 finish()。 */
(function (global) {
  "use strict";

  const HOLD_MS = 350;                 // 按住超过这个时长，松开就算说完了；短按则等学生再点一下结束
  const RECOGNIZE_MS = 1000;           // 假识别固定 1 秒
  const CLASS_REDIRECT_DELAY = 2600;   // 课堂模式：公共脚本按这个延迟跳转
  const STAR_TOTAL = 5;                // 星级上限

  /* 单题数据（任务书 7.4 的例子）。
     image 先留空字符串：以后把真图放进 public/shared/demo-materials/，
     把路径填到这个字段里，图槽就渲染 <img>——页面代码不用改。 */
  const QUESTION = {
    id: "kan-tu-paobu",
    prompt: "看这张图，用中文说一句话。",
    promptId: "Lihat gambar ini, ucapkan satu kalimat dalam bahasa Mandarin.",
    hint: "试试说：谁 ＋ 在做什么",
    icon: "🏃",
    image: "",
    imageAlt: "一个小朋友在跑步",
    slotNote: "图片待替换（占位）",
    answer: "小朋友在跑步。",
    answerId: "Anak itu sedang berlari.",
    scores: [
      { label: "内容", stars: 3 },
      { label: "完整度", stars: 3 },
      { label: "发音", stars: 3 }
    ]
  };

  const el = {};
  let micState = "idle";       // idle（待作答）| recording（录音中）| recognizing（识别中）| done（已完成）
  let finished = false;
  let lastSeconds = 0;
  let startedAt = 0;
  let pressStartedAt = 0;
  let pressedWhileRecording = false;
  let recognizeTimer = 0;

  function setText(node, text) {
    if (node) node.textContent = text;
  }

  function setHidden(node, hidden) {
    if (node) node.classList.toggle("hidden", !!hidden);
  }

  function cache() {
    el.prompt = document.querySelector("[data-picture-talk-prompt]");
    el.promptId = document.querySelector("[data-picture-talk-prompt-id]");
    el.slot = document.querySelector("[data-picture-talk-slot]");
    el.hint = document.querySelector("[data-picture-talk-hint]");
    el.mic = document.querySelector("[data-picture-talk-mic]");
    el.micLabel = document.querySelector("[data-picture-talk-mic-label]");
    el.wave = document.querySelector("[data-picture-talk-wave]");
    el.result = document.querySelector("[data-picture-talk-result]");
    el.answer = document.querySelector("[data-picture-talk-answer]");
    el.answerId = document.querySelector("[data-picture-talk-answer-id]");
    el.scores = document.querySelector("[data-picture-talk-scores]");
    el.done = document.querySelector("[data-picture-talk-done]");
    el.announcer = document.querySelector("[data-picture-talk-announcer]");
    el.status = document.querySelector("[data-activity-status]");
    el.badgeIcon = document.querySelector("[data-picture-talk-type-icon]");
    el.badgeName = document.querySelector("[data-picture-talk-type-name]");
    el.modal = document.querySelector("[data-picture-talk-complete]");
    el.modalChange = document.querySelector("[data-picture-talk-change]");
    el.modalReturn = document.querySelector("[data-picture-talk-return]");
  }

  function activityBridge() {
    return global.AICloudActivity || null;
  }

  function activityMeta() {
    const types = global.AICloudActivityTypes;
    const type = document.body.dataset.activityType || "picture-talk";
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

  /* 图槽：image 有值渲染 <img src alt>，为空渲染 emoji ＋「图片待替换（占位）」小字 */
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

      const note = document.createElement("span");
      note.className = "picture-talk-slot-note";
      note.setAttribute("aria-hidden", "true");
      note.textContent = QUESTION.slotNote;

      inner.appendChild(emoji);
      inner.appendChild(note);
    }

    el.slot.appendChild(inner);
  }

  /* 星级：实心 stars 个，空心补满 STAR_TOTAL 个 */
  function starsFor(stars) {
    const filled = Math.max(0, Math.min(STAR_TOTAL, Number(stars) || 0));
    return "★".repeat(filled) + "☆".repeat(STAR_TOTAL - filled);
  }

  /* 示例评分：固定值，接上语音识别后换成真数据 */
  function renderScores() {
    if (!el.scores) return;
    el.scores.innerHTML = "";
    QUESTION.scores.forEach(function (item) {
      const li = document.createElement("li");
      li.className = "picture-talk-score";

      const label = document.createElement("span");
      label.className = "picture-talk-score-label";
      label.textContent = item.label;

      const stars = document.createElement("span");
      stars.className = "picture-talk-score-stars";
      stars.setAttribute("role", "img");
      stars.setAttribute("aria-label", item.label + "：" + item.stars + " / " + STAR_TOTAL + " 星（占位示例）");
      stars.textContent = starsFor(item.stars);

      li.appendChild(label);
      li.appendChild(stars);
      el.scores.appendChild(li);
    });
  }

  function updateStatus() {
    if (!el.status) return;
    let text = "当前状态：待作答";
    if (micState === "recording") text = "当前状态：录音中（占位）";
    else if (micState === "recognizing") text = "当前状态：识别中（占位）";
    else if (micState === "done") text = "当前状态：已完成（占位）";
    setText(el.status, text);
  }

  function setMicLabel(text) {
    setText(el.micLabel, text);
  }

  /* 待作答：按钮可点，波形和结果卡都收起来 */
  function resetMic() {
    if (el.mic) {
      el.mic.disabled = false;
      el.mic.classList.remove("is-recording", "is-thinking");
      el.mic.setAttribute("aria-pressed", "false");
    }
    if (el.wave) el.wave.classList.remove("is-on");
    setMicLabel("按住说话");
  }

  /* 按下：只改状态和动效，不碰麦克风 */
  function startRecording() {
    if (micState !== "idle") return;
    micState = "recording";
    if (el.mic) {
      el.mic.classList.add("is-recording");
      el.mic.setAttribute("aria-pressed", "true");
    }
    if (el.wave) el.wave.classList.add("is-on");
    setMicLabel("正在录音…（占位）");
    updateStatus();
    announce("正在录音（占位），不会真的录音，说完点一下结束。");
  }

  /* 松开 / 再点一下：进入假识别，固定 1 秒 */
  function stopRecording() {
    if (micState !== "recording") return;
    micState = "recognizing";
    lastSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    if (el.mic) {
      el.mic.classList.remove("is-recording");
      el.mic.classList.add("is-thinking");
      el.mic.disabled = true;
    }
    if (el.wave) el.wave.classList.remove("is-on");
    setMicLabel("识别中…（占位）");
    updateStatus();
    announce("识别中（占位），马上给出参考答案。");
    global.clearTimeout(recognizeTimer);
    recognizeTimer = global.setTimeout(showResult, RECOGNIZE_MS);
  }

  /* 假识别的终点：固定占位结果卡，不判分 */
  function showResult() {
    micState = "done";
    lastSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    if (el.mic) {
      el.mic.classList.remove("is-thinking");
      el.mic.setAttribute("aria-pressed", "false");
      el.mic.disabled = true;
    }
    setMicLabel("已完成");
    updateStatus();
    announce("占位结果卡：参考答案 " + QUESTION.answer + "。分数是占位示例，不是真实评分。");
    if (el.result) {
      el.result.classList.remove("hidden");
      if (typeof el.result.focus === "function") el.result.focus({ preventScroll: true });
      if (typeof el.result.scrollIntoView === "function") el.result.scrollIntoView({ block: "center" });
    }
  }

  function completeOnce() {
    if (finished) return null;
    finished = true;
    const bridge = activityBridge();
    if (!bridge || typeof bridge.finish !== "function") return { recorded: false, next: "" };
    return bridge.finish({
      correct: true,                 // 占位版没有对错，如实写 true
      seconds: lastSeconds,
      detail: "看图说话（占位演示）",
      delay: CLASS_REDIRECT_DELAY
    });
  }

  /* 结果卡上的「完成」：课堂模式交给公共脚本记账跳转，体验模式自己弹完成弹窗 */
  function finishQuestion() {
    if (finished) return;
    const outcome = completeOnce();
    if (outcome && outcome.recorded) {
      setText(el.status, outcome.next === "complete.html"
        ? "已完成，正在进入完成页…"
        : "已完成，正在返回课堂继续下一题…");
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

  /* 按住说话：按下开始，松开结束（按住超过 HOLD_MS 才算「说完」）；
     短按两下就是「点一下开始、再点一下结束」，桌面演示和无障碍都方便 */
  function handleMicDown(event) {
    if (micState !== "idle" && micState !== "recording") return;
    if (typeof event.button === "number" && event.button !== 0) return;
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
    if (micState === "idle") startRecording();
    else if (micState === "recording") stopRecording();
  }

  function startQuestion() {
    global.clearTimeout(recognizeTimer);
    hideModal();

    micState = "idle";
    finished = false;
    lastSeconds = 0;
    startedAt = Date.now();
    pressStartedAt = 0;
    pressedWhileRecording = false;

    setText(el.prompt, QUESTION.prompt);
    setText(el.promptId, QUESTION.promptId);
    setHidden(el.promptId, !QUESTION.promptId);
    setText(el.hint, QUESTION.hint);
    setHidden(el.hint, !QUESTION.hint);
    setText(el.answer, QUESTION.answer);
    setText(el.answerId, QUESTION.answerId);
    setHidden(el.answerId, !QUESTION.answerId);

    renderPictureSlot();
    renderScores();
    resetMic();
    if (el.result) el.result.classList.add("hidden");
    updateStatus();
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
    if (el.done) el.done.addEventListener("click", finishQuestion);
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

  global.AICloudPictureTalkPage = { boot: boot, startQuestion: startQuestion };
})(typeof window !== "undefined" ? window : globalThis);
