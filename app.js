(() => {
  "use strict";

  const STORAGE_KEY = "ai-chinese-cloud-classroom-demo-v1";
  const platformStore = window.AICloudPlatformStore;
  const adminBase = "admin/";
  const TASK_STATE_KEYS = ["task1Done", "task2Done", "task3Done"];
  /* 班级人数：我 + 39 位同学（卡片人数和名次行共用这一个数，一页不许出现两个数字） */
  const CLASSROOM_TOTAL = 40;
  /* 每完成一关得多少分（做错不扣分，同一关重做不重复加） */
  const LEVEL_POINTS = 5;
  /* 满分：按关卡数算，不写死 */
  const MAX_SCORE = TASK_STATE_KEYS.length * LEVEL_POINTS;
  const DEFAULT_STATE = Object.freeze({
    phase: "live",
    task1Done: false,
    task2Done: false,
    task3Done: false,
    celebrated: false
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
      description: "互动 1、2、3 已开放，完成一个后再进入下一个。",
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
        task2Done: Boolean(parsed.task2Done),
        task3Done: Boolean(parsed.task3Done),
        celebrated: Boolean(parsed.celebrated)
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
        <a class="demo-admin-link" href="admin/">打开三角色管理后台 →</a>
        <button type="button" class="demo-reset" data-demo-reset>重置三关互动进度</button>
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
      updateState({ task1Done: false, task2Done: false, task3Done: false, celebrated: false });
      showToast("三关互动进度已重置");
      renderActive();
      close();
    });

    window.addEventListener("classroom-state-change", renderActive);
    renderActive();
  }

  function currentPlatformSnapshot() {
    if (!platformStore) return null;
    try {
      const platformState = platformStore.getState();
      const student = platformState.users.find((user) => user.id === platformState.currentUserId && user.role === "student")
        || platformState.users.find((user) => user.role === "student");
      if (!student) return null;
      const bookings = platformState.bookings
        .filter((booking) => booking.studentId === student.id && booking.status === "booked")
        .map((booking) => platformState.sessions.find((session) => session.id === booking.sessionId))
        .filter(Boolean)
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
      const nextSession = bookings.find((session) => new Date(session.endAt).getTime() > Date.now()) || bookings.at(-1);
      if (!nextSession) return null;
      const lesson = platformState.lessons.find((item) => item.id === nextSession.lessonId);
      const teacher = platformState.users.find((item) => item.id === nextSession.teacherId);
      return { platformState, student, nextSession, lesson, teacher };
    } catch (error) {
      return null;
    }
  }

  function openPlatformLesson() {
    const snapshot = currentPlatformSnapshot();
    if (!snapshot) {
      showToast("当前没有已预约的课节");
      return;
    }
    const now = Date.now();
    const start = new Date(snapshot.nextSession.startAt).getTime();
    const end = new Date(snapshot.nextSession.endAt).getTime();
    const phase = now > end ? "review" : now >= start - 10 * 60 * 1000 ? "live" : "preview";
    window.location.href = `${adminBase}#/student/lesson/${snapshot.nextSession.lessonId}?sessionId=${snapshot.nextSession.id}&phase=${phase}`;
  }

  function recordPlatformCompletion(taskIndex) {
    const snapshot = currentPlatformSnapshot();
    if (!snapshot) return;
    platformStore.recordAttempt({
      setId: "set-greetings-live",
      studentId: snapshot.student.id,
      sessionId: snapshot.nextSession.id,
      phase: "live",
      answers: {},
      score: 100,
      timeSpentSeconds: taskIndex === 1 ? 62 : 84,
      wrongItemIds: [],
      pollAnswers: {}
    });
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

    document.querySelectorAll("[data-platform-lesson]").forEach((button) => {
      button.addEventListener("click", openPlatformLesson);
    });

    const snapshot = currentPlatformSnapshot();
    if (snapshot) {
      const card = document.querySelector(".lesson-card");
      const badge = card && card.querySelector(".lesson-badge");
      const title = card && card.querySelector("h3");
      const subtitle = card && card.querySelector(".lesson-sub");
      const phrases = card && card.querySelector(".lesson-phrases");
      const action = card && card.querySelector("[data-platform-lesson]");
      if (badge) badge.textContent = `LESSON · ${snapshot.lesson?.title || "今日大班课"}`;
      if (title) title.textContent = snapshot.lesson?.title || snapshot.nextSession.title;
      if (subtitle) subtitle.textContent = `${snapshot.lesson?.subtitle || "Mandarin class"} · ${snapshot.teacher?.name || "老师"}`;
      if (phrases) {
        phrases.innerHTML = (snapshot.lesson?.tags || ["中文", "大班课", "互动"]).map((tag) => `<span>${tag}</span>`).join("");
      }
      if (action) action.textContent = "打开后台课节内容 →";
    }

    document.querySelectorAll("[data-demo-feature]").forEach((button) => {
      button.addEventListener("click", () => showToast("这个入口在原型中暂未展开"));
    });

    document.querySelectorAll(".nav-item:not(.active)").forEach((button) => {
      button.addEventListener("click", () => showToast("当前原型聚焦课堂互动流程"));
    });

    window.addEventListener("classroom-state-change", render);
    render();
  }

  const CLASSROOM_LEVELS = [
    { href: "interaction-choice.html?type=choice&mode=class&slot=1" },
    { href: "interaction-picture.html?type=picture&mode=class&slot=2" },
    { href: "match.html" }
  ];

  function initClassroom() {
    const strip = document.querySelector(".cls-strip");
    const stars = [...document.querySelectorAll("[data-stars] .cls-star")];
    const resetButton = document.querySelector("[data-classroom-reset]");
    const celebrateOverlay = document.querySelector("[data-celebrate-overlay]");
    const celebrateCard = document.querySelector("[data-celebrate-card]");
    const celebrateButton = document.querySelector("[data-celebrate-ok]");
    const rankLine = document.querySelector("[data-rank-line]");
    const rankNum = document.querySelector("[data-rank-num]");
    const rankSep = document.querySelector("[data-rank-sep]");
    const rankScore = document.querySelector("[data-rank-score]");

    /* 上一次看到的名次 + 分数：做完一关回课堂时才分得清"分数真的涨了"还是"名次被追/回落"。
       没有备忘 = 第一次进场；分数没变 = 重做旧关卡，都直接显示不播翻牌。 */
    const RANK_MEMO_KEY = "ai-chinese-cloud-classroom-rank-memo-v2";
    const readRankMemo = () => {
      try {
        const raw = window.localStorage.getItem(RANK_MEMO_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        return { rank: Number(parsed.rank) || 0, score: Number(parsed.score) || 0 };
      } catch (error) {
        return null;
      }
    };
    const writeRankMemo = (rank, score) => {
      try {
        window.localStorage.setItem(RANK_MEMO_KEY, JSON.stringify({ rank, score }));
      } catch (error) {
        /* 存不了就按"第一次进场"处理，不影响本轮显示 */
      }
    };

    /* 人数口径只留一处：卡片上的 /40 与名次行的 / 40 用同一个常量 */
    document.querySelectorAll(".cls-count-total").forEach((node) => {
      node.textContent = `/${CLASSROOM_TOTAL}`;
    });
    if (rankSep) rankSep.textContent = `/ ${CLASSROOM_TOTAL} ·`;

    const PLAY_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><path d="M8 4.6v14.8l12.2-7.4z"/></svg>`;
    const AGAIN_ICON = `<svg viewBox="-2 -2 28 28" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`;
    const LOCK_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4.8" y="10.6" width="14.4" height="9.2" rx="2.9" fill="currentColor" stroke="none"/><path d="M8.4 10.6V8.3a3.6 3.6 0 0 1 7.2 0v2.3"/></svg>`;
    const CHECK_ICON = `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#1fbf8f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5.4 12.9l4.4 4.4L18.7 7.9"/></svg>`;

    const levels = [...document.querySelectorAll(".cls-level")].map((node) => {
      const index = Number(node.dataset.level) || 0;
      return {
        node,
        index,
        key: TASK_STATE_KEYS[index - 1],
        href: (CLASSROOM_LEVELS[index - 1] || {}).href || "",
        badge: node.querySelector("[data-badge]"),
        action: node.querySelector("[data-action]"),
        count: node.querySelector("[data-level-count]")
      };
    });

    const unlockedBefore = (index) => TASK_STATE_KEYS
      .slice(0, Math.max(0, index - 1))
      .every((key) => Boolean(appState[key]));

    /* ---- 演示用：虚构的班级。只用来算名次和卡片人数，界面上不出现"模拟"字样。
       正式接后台后只改 myScore / myRank 这两个函数 ---- */
    const PEER_NAMES = [
      "Ayu", "Budi", "Citra", "Dewi", "Eka", "Fajar", "Gita", "Hadi", "Indah", "Joko",
      "Kartika", "Lina", "Made", "Nia", "Oscar", "Putri", "Rani", "Sari", "Tono", "Umi",
      "Vina", "Wawan", "Yani", "Zaki", "Adi", "Bella", "Chika", "Dimas", "Elsa", "Farid",
      "Hana", "Iwan", "Jihan", "Kevin", "Lala", "Mira", "Nanda", "Oki", "Rizky"
    ];
    const PEER_AVATARS = ["🐼", "🐨", "🦊", "🐯", "🐸", "🐵", "🐙", "🦄", "🐧", "🐰", "🐻", "🐹"];

    /* 进场时的局面：4 人已满分、7 人 10 分、10 人 5 分，其余慢慢往上涨 */
    const buildPeers = () => PEER_NAMES.map((name, index) => ({
      name,
      avatar: PEER_AVATARS[index % PEER_AVATARS.length],
      score: index < 4 ? MAX_SCORE : index < 11 ? LEVEL_POINTS * 2 : index < 21 ? LEVEL_POINTS : 0
    }));

    let peers = buildPeers();
    const rankMemo = readRankMemo();
    let lastRank = rankMemo ? rankMemo.rank : 0;
    /* 首帧标记：区分"刚打开页面"和"页面开着时的实时更新" */
    let booted = false;
    let dipUsed = false;
    let stageOneStarted = false;
    const scriptTimers = [];
    const rollTimers = new WeakMap();

    /* 我的分数：已完成关卡数 × 每关分值；只认完成状态，所以做错不扣分、重做不重复加
       —— 正式接后台后只改这里 —— */
    const myScore = () => TASK_STATE_KEYS.filter((key) => Boolean(appState[key])).length * LEVEL_POINTS;

    /* 名次 = 分数比我高的人数 + 1（同分并列，不比时间）
       —— 正式接后台后只改这里 —— */
    const myRank = () => (myScore() <= 0 ? 0 : peers.filter((peer) => peer.score > myScore()).length + 1);

    /* 卡片上的人数 = 完成这一关的同学（含我自己） */
    const countFor = (index) => {
      const threshold = index * LEVEL_POINTS;
      const classmates = peers.filter((peer) => peer.score >= threshold).length;
      return classmates + (myScore() >= threshold ? 1 : 0);
    };

    /* ---- 名次数字的翻牌：新数字从上落下，旧数字向下滚出 ---- */
    const ROLL_MS = 340;
    const slotItems = (slot) => (slot ? [...slot.querySelectorAll(".cls-roll")] : []);
    const slotText = (slot) => {
      const items = slotItems(slot);
      return items.length ? items[items.length - 1].textContent : "";
    };

    /* 立刻落定：停掉在飞的动画、清掉多余数字，只留当前这一个 */
    const settleSlot = (slot, keepShine = false) => {
      if (!slot) return;
      const pending = rollTimers.get(slot);
      if (pending) window.clearTimeout(pending);
      rollTimers.delete(slot);
      if (typeof slot.getAnimations === "function") {
        slot.getAnimations({ subtree: true }).forEach((animation) => {
          if (keepShine && animation.id === "rankShine") return;
          animation.cancel();
        });
      }
      const items = slotItems(slot);
      items.slice(0, -1).forEach((item) => item.remove());
      slot.style.transition = "none";
      slot.style.width = "";
      void slot.offsetWidth;
      slot.style.transition = "";
    };

    /* 不播翻牌，直接显示某个值（初次进场 / 重来一遍） */
    const setSlotText = (slot, text) => {
      if (!slot) return;
      settleSlot(slot);
      slotItems(slot).forEach((item) => item.remove());
      const item = document.createElement("span");
      item.className = "cls-roll";
      item.textContent = text;
      slot.appendChild(item);
    };

    /* 名次前进时的一道轻金光：挂在槽上（不跟着数字被裁掉） */
    const shineSlot = (slot) => {
      if (!slot || typeof slot.animate !== "function") return;
      const animation = slot.animate([
        { filter: "drop-shadow(0 0 0 rgba(255, 214, 130, 0))" },
        { filter: "drop-shadow(0 0 7px rgba(255, 214, 130, 0.95))", offset: 0.3 },
        { filter: "drop-shadow(0 0 0 rgba(255, 214, 130, 0))" }
      ], { duration: 880, easing: "ease-out" });
      animation.id = "rankShine";
    };

    /* 两个数字上下排着，整条向下滚一格；新数字落地时轻轻弹一下 */
    const rollSlot = (slot, text, instant = false) => {
      if (!slot) return;
      const current = slotText(slot);
      if (instant || current === text) {
        if (current !== text) setSlotText(slot, text);
        return;
      }

      const fromWidth = slot.getBoundingClientRect().width;
      const minWidth = parseFloat(window.getComputedStyle(slot).minWidth) || 0;

      const pending = rollTimers.get(slot);
      if (pending) window.clearTimeout(pending);
      if (typeof slot.getAnimations === "function") {
        slot.getAnimations({ subtree: true }).forEach((animation) => {
          if (animation.id === "rankShine") return;
          animation.cancel();
        });
      }
      const items = slotItems(slot);
      const outgoing = items[items.length - 1];
      items.slice(0, -1).forEach((item) => item.remove());

      const incoming = document.createElement("span");
      incoming.className = "cls-roll";
      incoming.textContent = text;
      slot.appendChild(incoming);

      /* 槽位先定宽再量新数字，保证整行不抖动 */
      slot.style.transition = "none";
      slot.style.width = fromWidth + "px";
      void slot.offsetWidth;

      const range = document.createRange();
      range.selectNodeContents(incoming);
      const targetWidth = Math.max(minWidth, range.getBoundingClientRect().width);
      /* 收窄排在"旧数字已出窗、新数字还没进窗"的当口，避免把旧字横向切掉 */
      slot.style.transition = "width " + Math.round(ROLL_MS * 0.21) + "ms cubic-bezier(.3, .85, .4, 1) " + Math.round(ROLL_MS * 0.1) + "ms";
      slot.style.width = targetWidth + "px";

      if (outgoing && typeof outgoing.animate === "function") {
        outgoing.animate([
          { transform: "translateY(0)", opacity: 1, easing: "cubic-bezier(.25, .6, .45, 1)" },
          { transform: "translateY(100%)", opacity: 0, offset: 0.45, easing: "linear" },
          { transform: "translateY(100%)", opacity: 0 }
        ], { duration: ROLL_MS, fill: "forwards" });
      }
      if (typeof incoming.animate === "function") {
        incoming.animate([
          { transform: "translateY(-200%)", opacity: 0, easing: "cubic-bezier(.3, .25, .5, .85)" },
          { transform: "translateY(-100%)", opacity: 1, offset: 0.74, easing: "ease-out" },
          { transform: "translateY(-95%)", opacity: 1, offset: 0.87, easing: "ease-in" },
          { transform: "translateY(-100%)", opacity: 1 }
        ], { duration: ROLL_MS, fill: "forwards" });
      }

      rollTimers.set(slot, window.setTimeout(() => settleSlot(slot, true), ROLL_MS + 60));
    };

    /* 名次行：0 分显示「等你上榜」，有分显示「12 / 40 · 5分」 */
    const renderRank = (force = false) => {
      if (!rankLine || !rankNum || !rankScore) return;
      const score = myScore();
      const rank = myRank();

      /* 首帧（刚打开页面）：第一次来、或分数和上次一样（重做旧关卡）→ 直接显示，不翻牌不闪光。
         首帧之后（同学们在涨分、偶尔追过我一位）：名次一变就翻牌，前进才闪光。 */
      const direct = booted ? force : force || !rankMemo || rankMemo.score === score;
      booted = true;

      if (rank === 0) {
        rankLine.classList.add("is-waiting");
        setSlotText(rankNum, "等你上榜");
        if (rankSep) rankSep.hidden = true;
        rankScore.hidden = true;
        setSlotText(rankScore, "0分");
        lastRank = 0;
        writeRankMemo(0, 0);
        return;
      }

      rankLine.classList.remove("is-waiting");
      if (rankSep) rankSep.hidden = false;
      rankScore.hidden = false;
      rollSlot(rankNum, String(rank), direct);
      rollSlot(rankScore, score + "分", direct);

      /* 名次前进了（数字变小）才给金光；被同学追过时不加奖励 */
      if (!direct && lastRank > 0 && rank < lastRank) shineSlot(rankNum);

      lastRank = rank;
      writeRankMemo(rank, score);
    };

    /* ---- 同学们缓慢得分：制造"实时"感，也带动卡片上的人数（演示模拟数据） ---- */
    const canAdvance = (peer) => {
      if (peer.score >= MAX_SCORE) return false;
      if (peer.score === 0) return true;
      if (peer.score === LEVEL_POINTS) return myScore() >= LEVEL_POINTS * 2;
      if (peer.score === LEVEL_POINTS * 2) return myScore() >= MAX_SCORE;
      return false;
    };

    const promoteBy = (score) => {
      const pool = peers.filter((peer) => peer.score === score && peer.score < MAX_SCORE);
      if (!pool.length) return false;
      pool[Math.floor(Math.random() * pool.length)].score += LEVEL_POINTS;
      return true;
    };

    const tick = () => {
      const pool = peers.filter(canAdvance);
      if (pool.length) {
        pool[Math.floor(Math.random() * pool.length)].score += LEVEL_POINTS;
        render();
      }
      window.setTimeout(tick, 2600 + Math.random() * 1400);
    };

    /* ---- 我的剧本：做完第一关之后两秒左右，名次会自己动一下（演示"实时"） ---- */
    const scheduleStageOne = () => {
      scriptTimers.push(window.setTimeout(() => {
        promoteBy(LEVEL_POINTS * 2);   /* 有人先满分 */
        render();
      }, 2200));
      scriptTimers.push(window.setTimeout(() => {
        if (dipUsed) return;
        if (promoteBy(LEVEL_POINTS)) {  /* 有人追平我又超过去：名次轻轻往后一位 */
          dipUsed = true;
          render();
        }
      }, 5600));
    };

    const clearScriptTimers = () => {
      scriptTimers.forEach((timer) => window.clearTimeout(timer));
      scriptTimers.length = 0;
    };

    const render = (force = false) => {
      const current = phase();
      const completed = TASK_STATE_KEYS.filter((key) => Boolean(appState[key])).length;
      const open = current.open;

      if (strip) strip.dataset.phase = appState.phase;
      stars.forEach((star, index) => star.classList.toggle("is-on", index < completed));

      levels.forEach((level) => {
        const done = Boolean(appState[level.key]);
        const canPlay = open && unlockedBefore(level.index);
        const state = done ? "done" : canPlay ? "todo" : "locked";
        level.node.dataset.state = state;
        if (level.badge) level.badge.innerHTML = done ? CHECK_ICON : String(level.index);
        if (level.action) {
          level.action.classList.toggle("is-play", !done && canPlay);
          level.action.classList.toggle("is-lock", !done && !canPlay);
          level.action.innerHTML = done ? AGAIN_ICON : canPlay ? PLAY_ICON : LOCK_ICON;
        }
        if (level.count) {
          const visible = done || canPlay;
          level.count.hidden = !visible;
          const value = countFor(level.index);
          const num = level.count.querySelector("[data-count-num]");
          if (num && num.textContent !== String(value)) {
            num.textContent = String(value);
            num.classList.remove("is-bump");
            void num.offsetWidth;
            num.classList.add("is-bump");
          }
          level.count.classList.toggle("is-full", value >= CLASSROOM_TOTAL);
          if (value >= CLASSROOM_TOTAL && !level.count.querySelector(".cls-count-flag")) {
            const flag = document.createElement("span");
            flag.className = "cls-count-flag";
            flag.textContent = "🎉";
            level.count.appendChild(flag);
          }
        }
      });

      /* 进场第一帧直接显示，不播翻牌 */
      renderRank(force);

      /* 做完第一关：两秒后名次自己动一下（演示"实时"）；重来一遍后再做还能重播 */
      if (completed === 0) {
        clearScriptTimers();
        stageOneStarted = false;
        dipUsed = false;
      } else if (!stageOneStarted) {
        stageOneStarted = true;
        scheduleStageOne();
      }
    };

    levels.forEach((level) => {
      level.node.addEventListener("click", () => {
        if (!phase().open) {
          showToast(appState.phase === "before" ? "请在开课后进入互动" : "互动入口已关闭");
          return;
        }
        if (!unlockedBefore(level.index)) {
          showToast(`先完成第 ${level.index - 1} 关，才能解锁这一关`);
          return;
        }
        window.location.href = level.href;
      });
    });

    let celebrateTimer = null;
    const allTasksDone = () => TASK_STATE_KEYS.every((key) => Boolean(appState[key]));
    const maybeCelebrate = () => {
      if (!celebrateOverlay || appState.celebrated || !allTasksDone()) return;
      if (celebrateTimer !== null || !celebrateOverlay.classList.contains("hidden")) return;
      /* 三星齐庆祝：亮齐后三颗一起跳一下、各扫一遍白光，然后才盖海报（走 WAAPI，保证能重播） */
      celebrateTimer = window.setTimeout(() => {
        stars.forEach((star) => {
          if (!star.classList.contains("is-on")) return;
          if (typeof star.animate === "function") {
            star.animate([
              { transform: "translateY(0) scale(1.16)" },
              { transform: "translateY(-8px) scale(1.22)", offset: 0.38 },
              { transform: "translateY(0) scale(1.16)", offset: 0.72 },
              { transform: "translateY(-3px) scale(1.17)", offset: 0.86 },
              { transform: "translateY(0) scale(1.16)" }
            ], { duration: 550, easing: "cubic-bezier(.3, 1.4, .5, 1)" });
          }
          const shine = star.querySelector(".cls-shine");
          if (shine && typeof shine.animate === "function") {
            shine.animate([
              { transform: "translateX(-8px) skewX(-18deg)", opacity: 0 },
              { opacity: 0.95, offset: 0.25 },
              { opacity: 0.9, offset: 0.7 },
              { transform: "translateX(26px) skewX(-18deg)", opacity: 0 }
            ], { duration: 500, easing: "ease-in-out" });
          }
        });
        /* 名次行的奖杯跟着跳一下、扫一遍白光 */
        const trophy = document.querySelector(".cls-trophy");
        if (trophy) {
          if (typeof trophy.animate === "function") {
            trophy.animate([
              { transform: "translateY(0) scale(1)" },
              { transform: "translateY(-2.5px) scale(1.2)", offset: 0.34 },
              { transform: "translateY(0) scale(1.02)", offset: 0.66 },
              { transform: "translateY(-1px) scale(1.09)", offset: 0.83 },
              { transform: "translateY(0) scale(1)" }
            ], { duration: 640, easing: "cubic-bezier(.3, 1.35, .45, 1)" });
          }
          const trophyShine = trophy.querySelector(".cls-shine");
          if (trophyShine && typeof trophyShine.animate === "function") {
            trophyShine.animate([
              { transform: "translateX(-8px) skewX(-18deg)", opacity: 0 },
              { opacity: 0.95, offset: 0.25 },
              { opacity: 0.9, offset: 0.7 },
              { transform: "translateX(26px) skewX(-18deg)", opacity: 0 }
            ], { duration: 500, easing: "ease-in-out" });
          }
        }
        celebrateTimer = window.setTimeout(() => {
          celebrateTimer = null;
          celebrateOverlay.classList.remove("hidden");
          if (celebrateCard && typeof celebrateCard.focus === "function") celebrateCard.focus();
        }, 880);
      }, 1250);
    };

    /* 重来一遍：清掉在跑的剧本与庆祝倒计时，同学们重新洗牌，名次直接回到「等你上榜」 */
    const replayRank = () => {
      clearScriptTimers();
      stageOneStarted = false;
      dipUsed = false;
      lastRank = 0;
      peers = buildPeers();
      if (celebrateTimer !== null) {
        window.clearTimeout(celebrateTimer);
        celebrateTimer = null;
      }
      if (celebrateOverlay) celebrateOverlay.classList.add("hidden");
      render(true);
    };

    if (celebrateButton) {
      celebrateButton.addEventListener("click", () => {
        if (celebrateOverlay) celebrateOverlay.classList.add("hidden");
        updateState({ celebrated: true });
      });
    }

    if (resetButton) {
      resetButton.addEventListener("click", () => {
        updateState({ task1Done: false, task2Done: false, task3Done: false, celebrated: false });
        replayRank();
        showToast("三关互动进度已重置");
      });
    }

    window.addEventListener("classroom-state-change", () => {
      render();
      maybeCelebrate();
    });
    /* 进场：第一次来、或重做旧关卡（分数没变）直接显示；分数真的涨了才翻一次牌（前进才给金光） */
    render();
    maybeCelebrate();
    /* 演示的同学得分：第一拍晚一点，让开场人数落在既定局面上（4 人满分 / 7 人 10 分 / 10 人 5 分） */
    window.setTimeout(tick, 2600 + Math.random() * 1400);

    const lockedReason = new URLSearchParams(window.location.search).get("locked");
    if (lockedReason) {
      window.setTimeout(() => showToast("当前演示状态不可进入课堂互动"), 250);
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
    if (!board || !svg) return;

    const matched = new Set();
    let selected = null;
    let resolving = false;
    let madeMistake = false;

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
      if (progress) progress.textContent = `已找到 ${matched.size} / 4 对`;
    };

    /* 呼吸引导：一直指着"第一张还没连上的左列卡"，连对一张自动移到下一张（整页唯一的循环动效） */
    const updateGuide = () => {
      board.querySelectorAll(".is-guide").forEach((item) => item.classList.remove("is-guide"));
      const next = leftItems.filter((item) => !item.classList.contains("correct"))[0];
      if (next) next.classList.add("is-guide");
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
          updateGuide();
          redraw();

          if (matched.size === leftItems.length) {
            updateState({ task3Done: true });
            recordPlatformCompletion(3);
            window.setTimeout(openCompleteModal, 520);
          }
          return;
        }

        resolving = true;
        left.classList.remove("selected");
        right.classList.remove("selected");
        left.classList.add("wrong");
        right.classList.add("wrong");
        madeMistake = true;
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

    const restartRound = () => {
      matched.clear();
      selected = null;
      resolving = false;
      madeMistake = false;
      board.querySelectorAll(".match-item").forEach((item) => {
        item.disabled = false;
        item.classList.remove("correct", "selected", "wrong");
      });
      updateProgress();
      updateGuide();
      redraw();
    };

    /* 完成弹窗走公共模具：从句池抽；一局没连错过走升级档 */
    const openCompleteModal = () => {
      const feedbackModal = window.AICloudFeedbackModal;
      const feedbackCopy = window.AICloudFeedbackCopy || {};
      if (!feedbackModal || typeof feedbackModal.open !== "function") return;
      const perfect = !madeMistake;
      const praise = (typeof feedbackCopy.draw === "function" ? feedbackCopy.draw("pair", { perfect }) : null)
        || { zh: "全部连对啦！", id: "Semua pasangan benar!", emoji: "🎉" };
      feedbackModal.open({
        tier: perfect ? "correctFirstTry" : "correct",
        badge: praise.emoji,
        titleZh: praise.zh,
        titleId: praise.id,
        actions: [
          {
            label: "返回课堂",
            onSelect: () => {
              window.location.href = "classroom.html";
            }
          },
          {
            label: "再练一次",
            icon: "↻",
            onSelect: () => {
              feedbackModal.close();
              restartRound();
            }
          }
        ]
      });
    };

    const resizeObserver = new ResizeObserver(redraw);
    resizeObserver.observe(board);
    window.addEventListener("resize", redraw);
    redraw();
    updateProgress();
    updateGuide();
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
    if (!grid) return;

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
    let madeMistake = false;

    const buildCard = (card) => {
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
      return button;
    };

    const renderGrid = () => {
      grid.textContent = "";
      cards.forEach((card) => grid.appendChild(buildCard(card)));
    };

    renderGrid();

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
          window.setTimeout(openCompleteModal, 520);
        }
        return;
      }

      resolving = true;
      firstCard.classList.add("mismatch");
      secondCard.classList.add("mismatch");
      madeMistake = true;
      window.setTimeout(clearTurn, 850);
    });

    const restartRound = () => {
      const reshuffled = shuffle(cards.slice());
      cards.splice(0, cards.length, ...reshuffled);
      clearTurn();
      matchedPairs = 0;
      madeMistake = false;
      updateProgress();
      renderGrid();
    };

    /* 完成弹窗走公共模具：从句池抽；一局没连错过走升级档 */
    const openCompleteModal = () => {
      const feedbackModal = window.AICloudFeedbackModal;
      const feedbackCopy = window.AICloudFeedbackCopy || {};
      if (!feedbackModal || typeof feedbackModal.open !== "function") return;
      const perfect = !madeMistake;
      const praise = (typeof feedbackCopy.draw === "function" ? feedbackCopy.draw("pair", { perfect }) : null)
        || { zh: "全部连对啦！", id: "Semua pasangan benar!", emoji: "🎉" };
      feedbackModal.open({
        tier: perfect ? "correctFirstTry" : "correct",
        badge: praise.emoji,
        titleZh: praise.zh,
        titleId: praise.id,
        actions: [
          {
            label: "返回课堂",
            onSelect: () => {
              window.location.href = "classroom.html";
            }
          },
          {
            label: "再练一次",
            icon: "↻",
            onSelect: () => {
              feedbackModal.close();
              restartRound();
            }
          }
        ]
      });
    };

    updateProgress();
  }

  function init() {
    installDemoControls();

    if (!guardOpenPage()) return;

    const page = document.body.dataset.page;
    if (page === "home") initHome();
    if (page === "classroom") initClassroom();
    if (page === "match") initMatch();
    if (page === "memory") initMemory();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
