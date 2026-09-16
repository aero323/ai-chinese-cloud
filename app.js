(() => {
  "use strict";

  const STORAGE_KEY = "ai-chinese-cloud-classroom-demo-v1";
  const DEFAULT_STATE = Object.freeze({
    phase: "live",
    task1Done: false,
    task2Done: false
  });

  const PHASES = {
    before: {
      label: "课前",
      shortLabel: "未开始",
      status: "课堂还未开始",
      detail: "今天 10:00 开课",
      description: "互动将在老师上课后开放，请先看看今天的课堂任务。",
      open: false,
      cardClass: "locked"
    },
    live: {
      label: "课中",
      shortLabel: "课中",
      status: "课堂互动进行中",
      detail: "今天 10:00 - 10:40",
      description: "互动 1 和互动 2 已开放，完成一个后再进入下一个。",
      open: true,
      cardClass: ""
    },
    after: {
      label: "课后",
      shortLabel: "可回看",
      status: "今天的互动可回看",
      detail: "今天 23:59 前可进入",
      description: "课上没做完也没关系，今天结束前可以继续完成或重新练习。",
      open: true,
      cardClass: "replay"
    },
    expired: {
      label: "次日",
      shortLabel: "已结束",
      status: "今天的课堂互动已结束",
      detail: "本期入口已关闭",
      description: "新的互动内容会在下次大班课时开放。",
      open: false,
      cardClass: "expired"
    }
  };

  let appState = loadState();
  let redirectTimer = null;

  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_STATE };
      const parsed = JSON.parse(raw);
      return {
        phase: PHASES[parsed.phase] ? parsed.phase : DEFAULT_STATE.phase,
        task1Done: Boolean(parsed.task1Done),
        task2Done: Boolean(parsed.task2Done)
      };
    } catch (error) {
      return { ...DEFAULT_STATE };
    }
  }

  function persistState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch (error) {
      // The prototype still works for the current page if storage is unavailable.
    }
  }

  function updateState(patch) {
    appState = { ...appState, ...patch };
    persistState();
    window.dispatchEvent(new CustomEvent("classroom-state-change", { detail: { ...appState } }));
  }

  function phase() {
    return PHASES[appState.phase] || PHASES.live;
  }

  function showToast(message, duration = 2200) {
    let toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), duration);
  }

  function installDemoControls() {
    if (document.querySelector(".demo-fab")) return;

    const fab = document.createElement("button");
    fab.type = "button";
    fab.className = "demo-fab";
    fab.setAttribute("aria-label", "打开原型演示状态切换");
    fab.innerHTML = '<span class="demo-dot"></span><span data-demo-label>演示 · 课中</span>';
    document.body.appendChild(fab);

    const overlay = document.createElement("div");
    overlay.className = "demo-sheet-overlay";
    overlay.innerHTML = `
      <section class="demo-sheet" role="dialog" aria-modal="true" aria-labelledby="demo-title">
        <div class="demo-handle"></div>
        <div class="demo-sheet-head">
          <h3 id="demo-title">原型演示状态</h3>
          <p>仅用于评审课堂入口的开放规则与完成流程，不会影响真实课程数据。</p>
        </div>
        <div class="demo-states">
          ${Object.entries(PHASES).map(([key, item]) => `
            <button type="button" class="demo-state-button" data-demo-phase="${key}">
              <strong>${item.label} · ${item.shortLabel}</strong>
              <span>${item.detail}</span>
            </button>
          `).join("")}
        </div>
        <button type="button" class="demo-reset" data-demo-reset>重置两项互动进度</button>
      </section>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.classList.remove("open");
    const renderActive = () => {
      const current = phase();
      const label = document.querySelector("[data-demo-label]");
      if (label) label.textContent = `演示 · ${current.label}`;
      overlay.querySelectorAll("[data-demo-phase]").forEach((button) => {
        const active = button.dataset.demoPhase === appState.phase;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
    };

    fab.addEventListener("click", () => {
      renderActive();
      overlay.classList.add("open");
    });

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });

    overlay.querySelectorAll("[data-demo-phase]").forEach((button) => {
      button.addEventListener("click", () => {
        const next = button.dataset.demoPhase;
        updateState({ phase: next });
        renderActive();
        showToast(`演示状态：${PHASES[next].label} · ${PHASES[next].status}`);
        close();

        if (document.body.dataset.requiresOpen === "true" && !PHASES[next].open) {
          window.clearTimeout(redirectTimer);
          redirectTimer = window.setTimeout(() => {
            window.location.href = "classroom.html?locked=1";
          }, 700);
        }
      });
    });

    overlay.querySelector("[data-demo-reset]").addEventListener("click", () => {
      updateState({ task1Done: false, task2Done: false });
      showToast("两项互动进度已重置");
      renderActive();
      close();
      const currentPage = document.body.dataset.page;
      if (currentPage === "memory" || currentPage === "complete") {
        window.setTimeout(() => { window.location.href = "classroom.html"; }, 450);
      }
    });

    window.addEventListener("classroom-state-change", renderActive);
    renderActive();
  }

  function goToClassroom() {
    if (phase().open) {
      window.location.href = "classroom.html";
      return;
    }

    if (appState.phase === "before") {
      showToast("课堂互动将在今天 10:00 开课后开放");
    } else {
      showToast("今天的课堂互动已经结束");
    }
  }

  function initHome() {
    const status = document.querySelector("[data-home-status]");
    const classroomLabel = document.querySelector("[data-home-classroom-label]");

    const render = () => {
      const current = phase();
      if (status) {
        status.textContent = current.shortLabel;
        status.className = `quick-status ${current.cardClass}`.trim();
      }
      if (classroomLabel) {
        classroomLabel.textContent = current.open ? "进入互动" : "等待开课";
      }
    };

    document.querySelectorAll("[data-classroom-entry]").forEach((button) => {
      button.addEventListener("click", goToClassroom);
    });

    document.querySelectorAll("[data-demo-feature]").forEach((button) => {
      button.addEventListener("click", () => showToast("这个入口在原型中暂未展开"));
    });

    document.querySelectorAll(".nav-item:not(.active)").forEach((button) => {
      button.addEventListener("click", () => showToast("当前原型聚焦课堂互动流程"));
    });

    window.addEventListener("classroom-state-change", render);
    render();
  }

  function initClassroom() {
    const statusNode = document.querySelector("[data-classroom-status]");
    const detailNode = document.querySelector("[data-classroom-detail]");
    const descriptionNode = document.querySelector("[data-classroom-description]");
    const metaCard = document.querySelector(".course-status-card");
    const progressText = document.querySelector("[data-course-progress]");
    const dots = [...document.querySelectorAll("[data-progress-dot]")];
    const task1 = document.querySelector("[data-task1-card]");
    const task2 = document.querySelector("[data-task2-card]");
    const task1Status = document.querySelector("[data-task1-status]");
    const task2Status = document.querySelector("[data-task2-status]");
    const task1Description = document.querySelector("[data-task1-description]");
    const task2Description = document.querySelector("[data-task2-description]");

    const render = () => {
      const current = phase();
      const completed = Number(appState.task1Done) + Number(appState.task2Done);
      const open = current.open;

      if (statusNode) {
        statusNode.textContent = current.status;
        statusNode.classList.toggle("is-locked", !open);
      }
      if (detailNode) detailNode.textContent = current.detail;
      if (descriptionNode) descriptionNode.textContent = current.description;
      if (metaCard) metaCard.dataset.phase = appState.phase;
      if (progressText) progressText.textContent = `${completed} / 2 已完成`;
      dots.forEach((dot, index) => dot.classList.toggle("done", index < completed));

      if (task1) task1.classList.toggle("is-locked", !open);
      if (task1) task1.classList.toggle("is-complete", appState.task1Done);
      if (task1Status) {
        task1Status.textContent = !open
          ? (appState.phase === "before" ? "等待开课" : "已关闭")
          : appState.task1Done ? "再练一次" : "开始互动";
      }
      if (task1Description) {
        task1Description.textContent = appState.task1Done
          ? "已全部连对，可以重新练习或继续下一项。"
          : "把中文时间和正确的印尼语意思连起来。";
      }

      const task2Unlocked = open && appState.task1Done;
      if (task2) task2.classList.toggle("is-locked", !task2Unlocked);
      if (task2) task2.classList.toggle("is-complete", appState.task2Done);
      if (task2Status) {
        task2Status.textContent = !open
          ? (appState.phase === "before" ? "等待开课" : "已关闭")
          : !appState.task1Done ? "先完成 1" : appState.task2Done ? "再练一次" : "开始挑战";
      }
      if (task2Description) {
        task2Description.textContent = task2Unlocked
          ? appState.task2Done
            ? "四组问候全部配对成功，可以再次挑战。"
            : "翻开卡片，找到中文和印尼语问候语配对。"
          : "完成互动 1 后自动解锁。";
      }
    };

    if (task1) {
      task1.addEventListener("click", () => {
        if (!phase().open) {
          showToast(appState.phase === "before" ? "请在开课后进入互动" : "互动入口已关闭");
          return;
        }
        window.location.href = "match.html";
      });
    }

    if (task2) {
      task2.addEventListener("click", () => {
        if (!phase().open) {
          showToast(appState.phase === "before" ? "请在开课后进入互动" : "互动入口已关闭");
          return;
        }
        if (!appState.task1Done) {
          showToast("先完成互动 1，才能解锁翻牌配对");
          return;
        }
        window.location.href = "memory.html";
      });
    }

    window.addEventListener("classroom-state-change", render);
    render();

    const lockedReason = new URLSearchParams(window.location.search).get("locked");
    if (lockedReason) {
      const message = lockedReason === "2"
        ? "先完成互动 1，才能解锁翻牌配对"
        : "当前演示状态不可进入课堂互动";
      window.setTimeout(() => showToast(message), 250);
    }
  }

  function guardOpenPage() {
    if (document.body.dataset.requiresOpen !== "true") return true;
    if (phase().open) return true;
    window.location.replace("classroom.html?locked=1");
    return false;
  }

  function makeSvgPath(board, svg, from, to, className = "") {
    const boardRect = board.getBoundingClientRect();
    const fromRect = from.getBoundingClientRect();
    const toRect = to.getBoundingClientRect();
    const x1 = fromRect.right - boardRect.left;
    const y1 = fromRect.top - boardRect.top + fromRect.height / 2;
    const x2 = toRect.left - boardRect.left;
    const y2 = toRect.top - boardRect.top + toRect.height / 2;
    const bend = Math.max(24, (x2 - x1) * 0.48);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`);
    if (className) path.setAttribute("class", className);
    svg.appendChild(path);
    return path;
  }

  function initMatch() {
    const board = document.querySelector("[data-match-board]");
    const svg = document.querySelector("[data-match-lines]");
    const progress = document.querySelector("[data-match-progress]");
    const modal = document.querySelector("[data-match-complete]");
    const returnHomeButton = document.querySelector("[data-match-return-home]");
    if (!board || !svg) return;

    const matched = new Set();
    let selected = null;
    let resolving = false;

    const leftItems = [...board.querySelectorAll('[data-side="left"]')];
    const rightItems = [...board.querySelectorAll('[data-side="right"]')];

    const redraw = () => {
      svg.innerHTML = "";
      const rect = board.getBoundingClientRect();
      svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
      matched.forEach((key) => {
        const left = board.querySelector(`[data-side="left"][data-key="${key}"]`);
        const right = board.querySelector(`[data-side="right"][data-key="${key}"]`);
        if (left && right) makeSvgPath(board, svg, left, right);
      });
    };

    const updateProgress = () => {
      if (progress) progress.textContent = `${matched.size} / 4 组`;
    };

    const markCorrect = (key) => {
      board.querySelectorAll(`[data-key="${key}"]`).forEach((item) => {
        item.classList.remove("selected", "wrong");
        item.classList.add("correct");
        item.disabled = true;
      });
    };

    const clearSelection = () => {
      board.querySelectorAll(".selected, .wrong").forEach((item) => {
        item.classList.remove("selected", "wrong");
      });
      selected = null;
    };

    board.querySelectorAll(".match-item").forEach((item) => {
      item.addEventListener("click", () => {
        if (resolving || item.disabled || item.classList.contains("correct")) return;

        if (!selected) {
          selected = item;
          item.classList.add("selected");
          return;
        }

        if (selected === item) {
          item.classList.remove("selected");
          selected = null;
          return;
        }

        if (selected.dataset.side === item.dataset.side) {
          selected.classList.remove("selected");
          selected = item;
          item.classList.add("selected");
          return;
        }

        const left = selected.dataset.side === "left" ? selected : item;
        const right = selected.dataset.side === "right" ? selected : item;
        const key = left.dataset.key;

        if (key === right.dataset.key) {
          matched.add(key);
          left.classList.remove("selected");
          right.classList.remove("selected");
          selected = null;
          markCorrect(key);
          updateProgress();
          redraw();

          if (matched.size === leftItems.length) {
            updateState({ task1Done: true });
            window.setTimeout(() => {
              if (modal) {
                modal.classList.remove("hidden");
              }
            }, 520);
          }
          return;
        }

        resolving = true;
        left.classList.remove("selected");
        right.classList.remove("selected");
        left.classList.add("wrong");
        right.classList.add("wrong");
        const wrongPath = makeSvgPath(board, svg, left, right, "wrong");
        selected = null;

        window.setTimeout(() => {
          left.classList.remove("wrong");
          right.classList.remove("wrong");
          wrongPath.remove();
          resolving = false;
        }, 720);
      });
    });

    if (returnHomeButton) {
      returnHomeButton.addEventListener("click", () => {
        window.location.href = "index.html";
      });
    }

    const resizeObserver = new ResizeObserver(redraw);
    resizeObserver.observe(board);
    window.addEventListener("resize", redraw);
    redraw();
    updateProgress();
  }

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function initMemory() {
    const grid = document.querySelector("[data-memory-grid]");
    const progress = document.querySelector("[data-memory-progress]");
    const modal = document.querySelector("[data-memory-complete]");
    const nextButton = document.querySelector("[data-memory-next]");
    if (!grid) return;

    if (!appState.task1Done) {
      window.location.replace("classroom.html?locked=2");
      return;
    }

    const pairs = [
      { key: "hello", zh: "你好", pinyin: "nǐ hǎo", id: "Halo", emoji: "👋" },
      { key: "polite", zh: "您好", pinyin: "nín hǎo", id: "Halo sopan", emoji: "🙇" },
      { key: "everyone", zh: "大家好", pinyin: "dàjiā hǎo", id: "Halo semuanya", emoji: "👥" },
      { key: "teacher", zh: "老师好", pinyin: "lǎoshī hǎo", id: "Halo, Guru", emoji: "👩‍🏫" }
    ];

    const cards = shuffle(pairs.flatMap((pair) => [
      { key: pair.key, type: "zh", label: pair.zh, sub: pair.pinyin, emoji: "" },
      { key: pair.key, type: "id", label: pair.id, sub: "", emoji: pair.emoji }
    ]));

    let firstCard = null;
    let secondCard = null;
    let resolving = false;
    let matchedPairs = 0;

    cards.forEach((card) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "memory-card";
      button.dataset.key = card.key;
      button.dataset.type = card.type;
      button.setAttribute("aria-label", "尚未翻开的卡片");
      button.innerHTML = `
        <span class="memory-card-inner">
          <span class="memory-face front" aria-hidden="true"></span>
          <span class="memory-face back">
            ${card.emoji ? `<span class="card-emoji">${card.emoji}</span>` : ""}
            <strong>${card.label}</strong>
            ${card.sub ? `<small>${card.sub}</small>` : ""}
          </span>
        </span>
      `;
      grid.appendChild(button);
    });

    const updateProgress = () => {
      if (progress) progress.textContent = `已找到 ${matchedPairs} / 4 对`;
    };

    const clearTurn = () => {
      if (firstCard) firstCard.classList.remove("flipped");
      if (secondCard) secondCard.classList.remove("flipped");
      if (firstCard) firstCard.classList.remove("mismatch");
      if (secondCard) secondCard.classList.remove("mismatch");
      firstCard = null;
      secondCard = null;
      resolving = false;
    };

    grid.addEventListener("click", (event) => {
      const card = event.target.closest(".memory-card");
      if (!card || resolving || card.classList.contains("matched") || card.classList.contains("flipped")) return;

      card.classList.add("flipped");
      card.setAttribute("aria-label", "已翻开的卡片");

      if (!firstCard) {
        firstCard = card;
        return;
      }

      secondCard = card;

      if (firstCard.dataset.key === secondCard.dataset.key && firstCard.dataset.type !== secondCard.dataset.type) {
        firstCard.classList.add("matched");
        secondCard.classList.add("matched");
        firstCard.disabled = true;
        secondCard.disabled = true;
        firstCard = null;
        secondCard = null;
        matchedPairs += 1;
        updateProgress();

        if (matchedPairs === pairs.length) {
          updateState({ task2Done: true });
          window.setTimeout(() => modal && modal.classList.remove("hidden"), 520);
        }
        return;
      }

      resolving = true;
      firstCard.classList.add("mismatch");
      secondCard.classList.add("mismatch");
      window.setTimeout(clearTurn, 850);
    });

    if (nextButton) {
      nextButton.addEventListener("click", () => {
        window.location.href = "complete.html";
      });
    }

    updateProgress();
  }

  function initComplete() {
    if (!appState.task2Done) {
      window.location.replace(appState.task1Done ? "memory.html" : "classroom.html");
      return;
    }

    const reset = document.querySelector("[data-replay-all]");
    const home = document.querySelector("[data-go-home]");

    if (reset) {
      reset.addEventListener("click", () => {
        updateState({ task1Done: false, task2Done: false });
        window.location.href = "match.html";
      });
    }

    if (home) {
      home.addEventListener("click", () => {
        window.location.href = "index.html";
      });
    }
  }

  function init() {
    installDemoControls();

    if (!guardOpenPage()) return;

    const page = document.body.dataset.page;
    if (page === "home") initHome();
    if (page === "classroom") initClassroom();
    if (page === "match") initMatch();
    if (page === "memory") initMemory();
    if (page === "complete") initComplete();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
