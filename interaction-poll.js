/* 课堂投票 · interaction-poll.html 页面脚本
   状态机：待作答 → 已选择 → 已提交（每题只提交一次；投票不计分，没有对错）
   进度记账和课堂跳转都由 shared/activity-bridge.js 负责，本页只负责界面和调用 finish() */
(() => {
  "use strict";

  const bridge = window.AICloudActivity;

  const card = document.querySelector("[data-poll-card]");
  const options = Array.from(document.querySelectorAll("[data-poll-option]"));
  const submitButton = document.querySelector("[data-poll-submit]");
  const feedback = document.querySelector("[data-poll-feedback]");
  const completeModal = document.querySelector("[data-poll-complete]");
  const completeCopy = document.querySelector("[data-poll-complete-copy]");
  const moreButton = document.querySelector("[data-poll-more]");

  const type = (document.body.dataset.activityType || "poll").trim();
  const ctx = bridge && typeof bridge.context === "function"
    ? bridge.context()
    : { mode: "solo", slot: 0, type };
  const inClass = ctx.mode === "class" && Number(ctx.slot) > 0;
  const startedAt = Date.now();

  let submitted = false;

  const inputOf = (option) => (option ? option.querySelector(".poll-option-input") : null);

  const selectedOption = () => options.filter((option) => {
    const input = inputOf(option);
    return Boolean(input && input.checked);
  })[0] || null;

  const textOf = (option) => {
    const zh = option ? option.querySelector(".poll-option-body strong") : null;
    const id = option ? option.querySelector(".poll-option-body small") : null;
    return {
      zh: zh ? zh.textContent.trim() : "",
      id: id ? id.textContent.trim() : ""
    };
  };

  /* 圆点、边框、右侧的小标签一起变，不只靠颜色 */
  const paintOptions = () => {
    options.forEach((option) => {
      const input = inputOf(option);
      const selected = Boolean(input && input.checked);
      const tag = option.querySelector("[data-poll-option-state]");
      option.classList.toggle("is-selected", selected);
      if (!tag) return;
      if (submitted) tag.textContent = selected ? "已记录" : "未选择";
      else tag.textContent = selected ? "已选择" : "选择";
    });
  };

  const refreshSubmit = () => {
    if (submitButton) submitButton.disabled = submitted || !selectedOption();
  };

  const showFeedback = (picked) => {
    if (!feedback) return;
    feedback.textContent = "";
    const title = document.createElement("strong");
    title.textContent = `已记录你的选择 · ${picked.zh}`;
    const sub = document.createElement("span");
    sub.textContent = `Pilihanmu sudah dicatat · ${picked.id}`;
    feedback.append(title, sub);
  };

  const submitAnswer = () => {
    if (submitted) return;
    const option = selectedOption();
    if (!option) return;

    submitted = true;
    const picked = textOf(option);

    options.forEach((item) => {
      const input = inputOf(item);
      if (input) input.disabled = true;
    });
    if (card) card.classList.add("is-submitted");
    paintOptions();

    if (submitButton) {
      submitButton.textContent = "已提交";
      submitButton.disabled = true;
    }

    showFeedback(picked);

    if (completeCopy) {
      completeCopy.textContent = `已记录你的选择 · ${picked.zh}。不计分，老师会在课堂上看到全班的统计。`;
    }

    const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    if (bridge && typeof bridge.finish === "function") {
      /* 课堂模式：公共脚本按 delay 记进度并跳转，页面不自己写跳转 */
      bridge.finish({ correct: true, seconds, detail: `投票：${picked.zh}`, delay: inClass ? 900 : 0 });
    }
    if (inClass) return;

    /* 体验模式：不记账、不跳转，自己弹完成弹窗 */
    window.setTimeout(() => {
      if (!completeModal) return;
      completeModal.classList.remove("hidden");
      if (moreButton && typeof moreButton.focus === "function") moreButton.focus();
    }, 650);
  };

  options.forEach((option) => {
    const input = inputOf(option);
    if (!input) return;
    input.addEventListener("change", () => {
      if (submitted) return;
      paintOptions();
      refreshSubmit();
    });
  });

  if (submitButton) submitButton.addEventListener("click", submitAnswer);

  /* 顶栏返回：统一回课堂页，href 与文案由 shared/activity-page.js 负责 */

  paintOptions();
  refreshSubmit();
})();
