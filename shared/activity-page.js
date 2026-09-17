(function (global) {
  "use strict";

  const types = global.AICloudActivityTypes;
  const bridge = global.AICloudActivity;
  let booted = false;

  function setText(node, text) {
    if (node && typeof text === "string") node.textContent = text;
  }

  function boot() {
    if (booted) return;
    booted = true;

    const type = document.body.dataset.activityType || "";
    const meta = types && types.get ? types.get(type) : null;
    const ctx = bridge && bridge.context ? bridge.context() : { mode: "solo", slot: 0, type: type };

    setText(document.querySelector("[data-activity-title]"), meta ? meta.title : "题型页面");
    setText(document.querySelector("[data-activity-subtitle]"), meta ? meta.titleId : "Aktivitas");
    setText(document.querySelector("[data-activity-task]"), meta ? meta.cardDescription : "");

    const step = document.querySelector("[data-activity-step]");
    if (step) {
      step.textContent = ctx.mode === "class" && ctx.slot ? "互动 " + ctx.slot + " / 2" : "题型体验";
    }

    const back = document.querySelector("[data-activity-back]");
    if (back) back.setAttribute("href", "classroom.html");

    const status = document.querySelector("[data-activity-status]");
    const demo = document.querySelector("[data-activity-demo-finish]");
    if (demo) {
      demo.addEventListener("click", function () {
        const outcome = bridge && bridge.finish ? bridge.finish({ correct: true, seconds: 8, detail: "占位页面标记完成" }) : { recorded: false };
        if (outcome.recorded) {
          setText(status, outcome.next === "complete.html" ? "本题已完成，正在进入完成页…" : "本题已完成，正在返回课堂继续下一题…");
        } else {
          setText(status, "本题已完成（单独体验不会计入课堂进度）。");
        }
      });
    }

    const meta2 = document.querySelector("[data-activity-meta]");
    if (meta2 && meta) {
      meta2.textContent = "题型标识：" + meta.type + " · 页面文件：" + meta.page;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  global.AICloudActivityPage = { boot: boot };
})(typeof window !== "undefined" ? window : globalThis);
