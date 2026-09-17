/* 听音选图/选词 · interaction-listening.html 页面脚本（占位版）
   状态机：待作答 → 播放中 → 已选择 → 已提交 → 正确 / 错误（每题只判一次，不提供重试）。
   判分是真的：按题目数据里标了 correct 的那一项判，选对才算对。
   播放是假的：不发出声音、不碰麦克风；题目数据里的 audio 一旦填上真实路径，
   同一个播放按钮就走 <audio> 真播放，页面代码不用重写。
   进度记账和课堂跳转都由 shared/activity-bridge.js 负责，本页只做界面并调用 finish()。 */
(function (global) {
  "use strict";

  const LETTERS = ["A", "B", "C", "D", "E", "F"];
  const FAKE_PLAY_MS = 1000;          // 占位播放：按钮「播放中…」保持 1 秒
  const HINT_VISIBLE_MS = 2000;       // 占位小字「音频待录制（占位）」显示 2 秒后自动淡出
  const SOLO_MODAL_DELAY = 2000;      // 体验模式：提交后留多久看对错，再弹完成弹窗
  const CLASS_REDIRECT_DELAY = 2600;  // 课堂模式：公共脚本按这个延迟跳转

  /* 单题数据（任务书 5.4 的例子）。
     audio 先留空字符串：以后录音文件放进 public/shared/demo-materials/，
     把路径填到这个字段里，播放就是真的了——页面代码不用改。 */
  const QUESTION = {
    id: "ting-shengdiao-san",
    prompt: "听一听，选出你听到的",
    promptId: "Dengarkan, lalu pilih yang kamu dengar.",
    audio: "",
    audioText: "三",
    pinyin: "sān",
    options: [
      { text: "三", pinyin: "sān", correct: true },
      { text: "四", pinyin: "sì" },
      { text: "山", pinyin: "shān" },
      { text: "伞", pinyin: "sǎn" }
    ],
    explain: "三 sān 是第一声，读得又平又高；四 sì 是第四声，往下掉。",
    explainId: "三 sān memakai nada pertama (datar dan tinggi); 四 sì memakai nada keempat (turun)."
  };

  const el = {};
  let options = [];        // [{ id, letter, text, pinyin, correct }]，按数据顺序
  let selectedId = "";
  let submitted = false;
  let playing = false;
  let finished = false;
  let lastCorrect = false;
  let lastSeconds = 0;
  let startedAt = 0;
  let playTimer = 0;
  let hintTimer = 0;
  let modalTimer = 0;

  function setText(node, text) {
    if (node) node.textContent = text;
  }

  function setHidden(node, hidden) {
    if (node) node.classList.toggle("hidden", !!hidden);
  }

  function cache() {
    el.prompt = document.querySelector("[data-listening-prompt]");
    el.promptId = document.querySelector("[data-listening-prompt-id]");
    el.play = document.querySelector("[data-listening-play]");
    el.playLabel = document.querySelector("[data-listening-play-label]");
    el.playHint = document.querySelector("[data-listening-play-hint]");
    el.playHintText = document.querySelector("[data-listening-play-hint-text]");
    el.audio = document.querySelector("[data-listening-audio]");
    el.options = document.querySelector("[data-listening-options]");
    el.submit = document.querySelector("[data-listening-submit]");
    el.feedback = document.querySelector("[data-listening-feedback]");
    el.feedbackIcon = document.querySelector("[data-listening-feedback-icon]");
    el.feedbackTitle = document.querySelector("[data-listening-feedback-title]");
    el.feedbackTitleId = document.querySelector("[data-listening-feedback-title-id]");
    el.feedbackAnswer = document.querySelector("[data-listening-feedback-answer]");
    el.feedbackCopy = document.querySelector("[data-listening-feedback-copy]");
    el.feedbackId = document.querySelector("[data-listening-feedback-id]");
    el.announcer = document.querySelector("[data-listening-announcer]");
    el.status = document.querySelector("[data-activity-status]");
    el.badgeIcon = document.querySelector("[data-listening-type-icon]");
    el.badgeName = document.querySelector("[data-listening-type-name]");
    el.modal = document.querySelector("[data-listening-complete]");
    el.modalBadge = document.querySelector("[data-listening-modal-badge]");
    el.modalTitle = document.querySelector("[data-listening-modal-title]");
    el.modalId = document.querySelector("[data-listening-modal-id]");
    el.modalCopy = document.querySelector("[data-listening-modal-copy]");
    el.modalChange = document.querySelector("[data-listening-change]");
    el.modalReturn = document.querySelector("[data-listening-return]");
  }

  function activityBridge() {
    return global.AICloudActivity || null;
  }

  function activityMeta() {
    const types = global.AICloudActivityTypes;
    const type = document.body.dataset.activityType || "listening";
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

  function hasRealAudio() {
    return typeof QUESTION.audio === "string" && QUESTION.audio.trim() !== "";
  }

  function setPlaying(isPlaying) {
    playing = isPlaying;
    if (el.play) el.play.classList.toggle("is-playing", isPlaying);
  }

  function clearPlayTimers() {
    global.clearTimeout(playTimer);
    global.clearTimeout(hintTimer);
  }

  /* 回到「待播放」：不自动播放、不留上一次的占位小字 */
  function resetPlay() {
    clearPlayTimers();
    setPlaying(false);
    if (el.playHint) el.playHint.classList.remove("is-visible");
    if (el.playHintText) setText(el.playHintText, "");
    setText(el.playLabel, "听一听");
    if (el.audio && !el.audio.paused && typeof el.audio.pause === "function") el.audio.pause();
  }

  /* 占位小字：出现后 2 秒自动淡出 */
  function showPlayHint() {
    if (el.playHintText) setText(el.playHintText, "音频待录制（占位）");
    if (el.playHint) el.playHint.classList.add("is-visible");
    global.clearTimeout(hintTimer);
    hintTimer = global.setTimeout(function () {
      if (el.playHint) el.playHint.classList.remove("is-visible");
    }, HINT_VISIBLE_MS);
  }

  /* 假播放：不发出声音，只把按钮状态走一遍 */
  function playPlaceholder() {
    setPlaying(true);
    setText(el.playLabel, "播放中…");
    announce("占位播放，不会发出声音。");
    playTimer = global.setTimeout(function () {
      setPlaying(false);
      setText(el.playLabel, "再听一次");
      showPlayHint();
      announce("音频待录制（占位），可以再听一次。");
    }, FAKE_PLAY_MS);
  }

  /* 真音频就位后（QUESTION.audio 填了路径）走这里，其余逻辑不变 */
  function playRealAudio() {
    const audio = el.audio;
    if (!audio) {
      playPlaceholder();
      return;
    }
    setPlaying(true);
    setText(el.playLabel, "播放中…");
    announce("正在播放音频。");
    try {
      audio.currentTime = 0;
    } catch (error) {
      /* 音频还没载入时忽略，直接播 */
    }
    const started = audio.play();
    if (started && typeof started.catch === "function") {
      started.catch(function () {
        setPlaying(false);
        setText(el.playLabel, "再听一次");
      });
    }
  }

  function handlePlay() {
    if (playing) return;
    clearPlayTimers();
    if (hasRealAudio()) playRealAudio();
    else playPlaceholder();
  }

  function eachOptionButton(callback) {
    if (!el.options) return;
    options.forEach(function (option) {
      const button = el.options.querySelector('[data-listening-id="' + option.id + '"]');
      if (button) callback(button, option);
    });
  }

  function correctOptionOf() {
    return options.filter(function (option) {
      return option.correct;
    })[0] || null;
  }

  function updateStatus() {
    if (!el.status) return;
    let text = "当前状态：待作答";
    if (submitted) text = "当前状态：已提交";
    else if (selectedId) text = "当前状态：已选择";
    setText(el.status, text);
  }

  function paintSelection() {
    eachOptionButton(function (button, option) {
      const isSelected = option.id === selectedId;
      button.classList.toggle("selected", isSelected);
      button.setAttribute("aria-pressed", isSelected ? "true" : "false");
    });
    if (el.submit) el.submit.disabled = !selectedId;
  }

  function renderOptions() {
    if (!el.options) return;
    el.options.innerHTML = "";
    options.forEach(function (option) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "listening-option";
      button.dataset.listeningId = option.id;
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", "选项 " + option.letter + "：" + option.text);

      const letter = document.createElement("span");
      letter.className = "listening-letter";
      letter.setAttribute("aria-hidden", "true");
      letter.textContent = option.letter;

      const text = document.createElement("span");
      text.className = "listening-option-text";
      text.textContent = option.text;

      button.appendChild(letter);
      button.appendChild(text);
      button.addEventListener("click", function () {
        selectOption(option.id);
      });
      el.options.appendChild(button);
    });
  }

  /* 选中：可以改选，提交后点不动 */
  function selectOption(id) {
    if (submitted || id === selectedId) return;
    selectedId = id;
    paintSelection();
    updateStatus();
    const picked = options.filter(function (option) {
      return option.id === id;
    })[0];
    if (picked) announce("已选择 " + picked.letter + " " + picked.text + "，点提交看结果。");
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

  /* 提交后锁定：正确项标绿，选错的那一项标红 */
  function lockOptions() {
    const correct = correctOptionOf();
    eachOptionButton(function (button, option) {
      button.disabled = true;
      if (correct && option.id === correct.id) button.classList.add("correct");
      else if (option.id === selectedId) button.classList.add("wrong");
    });
  }

  function showFeedback(isCorrect, correct) {
    if (!el.feedback) return;
    el.feedback.classList.remove("is-correct", "is-wrong");
    el.feedback.classList.add(isCorrect ? "is-correct" : "is-wrong");
    setText(el.feedbackIcon, isCorrect ? "✓" : "✗");
    setText(el.feedbackTitle, isCorrect ? "答对了！" : "再想想");
    setText(el.feedbackTitleId, isCorrect
      ? "Bagus, jawabanmu benar!"
      : "Belum tepat. Coba ingat lagi ya.");
    setText(el.feedbackAnswer, isCorrect
      ? "你听到的是 " + QUESTION.audioText + " " + QUESTION.pinyin
      : "正确答案：" + correct.letter + " " + correct.text + " " + correct.pinyin);
    setText(el.feedbackCopy, "解析：" + QUESTION.explain);
    setText(el.feedbackId, "Penjelasan: " + QUESTION.explainId);
    el.feedback.classList.remove("hidden");
  }

  function completeOnce() {
    if (finished) return null;
    finished = true;
    const bridge = activityBridge();
    if (!bridge || typeof bridge.finish !== "function") return { recorded: false, next: "" };
    const picked = options.filter(function (option) {
      return option.id === selectedId;
    })[0];
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
    setText(el.modalTitle, lastCorrect ? "答对了，真棒！" : "再想想也没关系");
    setText(el.modalId, lastCorrect
      ? "Bagus! Jawabanmu benar."
      : "Tidak apa-apa, coba lagi ya!");
    setText(el.modalCopy, lastCorrect
      ? "本题已完成，可以换一个题型再练一练，或者回到课堂。"
      : "正确答案和解析就在上面，可以换一个题型再练一练。");
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

    const correct = correctOptionOf();
    lastCorrect = !!correct && selectedId === correct.id;

    lockOptions();
    if (el.submit) {
      el.submit.disabled = true;
      el.submit.textContent = "已提交";
    }

    showFeedback(lastCorrect, correct || { letter: "", text: QUESTION.audioText, pinyin: QUESTION.pinyin });
    updateStatus();
    announce(lastCorrect
      ? "答对了！你听到的是 " + QUESTION.audioText + " " + QUESTION.pinyin + "。" + QUESTION.explain
      : "再想想。正确答案：" + (correct ? correct.letter + " " + correct.text + " " + correct.pinyin + "。" : "") + QUESTION.explain);
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
    global.clearTimeout(playTimer);
    global.clearTimeout(hintTimer);
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

    resetPlay();
    if (el.audio) {
      if (hasRealAudio()) el.audio.setAttribute("src", QUESTION.audio);
      else el.audio.removeAttribute("src");
    }

    options = QUESTION.options.map(function (option, index) {
      return {
        id: "listening-" + index,
        letter: LETTERS[index] || "?",
        text: option.text,
        pinyin: option.pinyin || "",
        correct: option.correct === true
      };
    });

    renderOptions();
    resetFeedback();
    if (el.submit) {
      el.submit.disabled = true;
      el.submit.textContent = "提交";
    }
    updateStatus();
    announce("待作答。先点播放按钮听一听。");
  }

  function bindEvents() {
    if (el.play) el.play.addEventListener("click", handlePlay);
    if (el.submit) el.submit.addEventListener("click", submitAnswer);
    if (el.audio) {
      /* 真音频播完 / 播不动时，按钮状态照常回来 */
      el.audio.addEventListener("ended", function () {
        setPlaying(false);
        setText(el.playLabel, "再听一次");
      });
      el.audio.addEventListener("error", function () {
        setPlaying(false);
        setText(el.playLabel, "再听一次");
        announce("音频暂时无法播放。");
      });
    }
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

  global.AICloudListeningPage = { boot: boot, startQuestion: startQuestion };
})(typeof window !== "undefined" ? window : globalThis);
