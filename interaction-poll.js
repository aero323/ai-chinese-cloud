/* 课堂投票 · interaction-poll.html 页面脚本
   状态机：待作答 → 已选择 → 已提交（每题只提交一次；投票不计分，没有对错）
   进度记账由 shared/activity-bridge.js 负责（课堂跳转由完成弹窗的按钮执行），本页只负责界面和调用 finish() */
(() => {
  "use strict";

  const bridge = window.AICloudActivity;
  const modal = window.AICloudFeedbackModal || null;
  const copy = window.AICloudFeedbackCopy || {};

  const card = document.querySelector("[data-poll-card]");
  const options = Array.from(document.querySelectorAll("[data-poll-option]"));
  const submitButton = document.querySelector("[data-poll-submit]");
  const submitLabel = document.querySelector("[data-poll-submit-label]");
  const submitLabelId = document.querySelector("[data-poll-submit-label-id]");

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

  /* 选中态整块一起变（描边 + 底色 + 右上角对勾），不只靠颜色 */
  const paintOptions = () => {
    options.forEach((option) => {
      const input = inputOf(option);
      const selected = Boolean(input && input.checked);
      option.classList.toggle("is-selected", selected);
    });
  };

  const refreshSubmit = () => {
    if (submitButton) submitButton.disabled = submitted || !selectedOption();
  };

  /* 完成弹窗：公共模具（投票没有对错，用中性样式 + 记录类文案） */
  const openModal = () => {
    if (!modal || typeof modal.open !== "function") return;
    const praise = copy && copy.record ? copy.record : { zh: "收到啦！", id: "Sudah diterima!" };
    modal.open({
      badge: "🗳️",
      titleZh: praise.zh,
      titleId: praise.id,
      actions: [
        {
          label: "返回课堂",
          onSelect: () => {
            window.location.href = "classroom.html";
          }
        },
        { label: "再练一次", icon: "↻", onSelect: restartRound }
      ]
    });
  };

  /* 再练一次：清掉已记录状态，重新投一次 */
  const restartRound = () => {
    if (modal && typeof modal.close === "function") modal.close();
    submitted = false;
    options.forEach((option) => {
      const input = inputOf(option);
      if (input) {
        input.disabled = false;
        input.checked = false;
      }
      option.classList.remove("is-selected");
    });
    if (card) card.classList.remove("is-submitted");
    if (submitLabel) submitLabel.textContent = "提交";
    if (submitLabelId) submitLabelId.textContent = "Kirim";
    paintOptions();
    refreshSubmit();
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
      submitButton.disabled = true;
    }
    if (submitLabel) submitLabel.textContent = "已提交";
    if (submitLabelId) submitLabelId.textContent = "Terkirim";

    const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    if (bridge && typeof bridge.finish === "function") {
      /* 课堂模式：公共脚本只记进度；跳转由弹窗按钮负责，页面不自己写跳转 */
      bridge.finish({ correct: true, seconds, detail: `投票：${picked.zh}` });
    }

    /* 两种模式都弹公共情绪弹窗 */
    window.setTimeout(openModal, 650);
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
