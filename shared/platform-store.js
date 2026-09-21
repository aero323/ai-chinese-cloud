(function attachPlatformStore(global) {
  "use strict";

  const STORE_KEY = "ai-chinese-cloud-platform-v2";
  const LEGACY_KEY = "ai-chinese-cloud-classroom-demo-v1";
  const CHANGE_EVENT = "aicloud:store-changed";
  const seedFactory = global.AICloudSeedData;

  if (!seedFactory) {
    throw new Error("AICloudSeedData must be loaded before AICloudPlatformStore");
  }

  let state = null;
  const listeners = new Set();

  function clone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function makeId(prefix) {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return `${prefix}-${global.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function result(ok, data, error, code) {
    return { ok, data: data ?? null, error: error ?? "", code: code ?? "" };
  }

  function emit(source) {
    listeners.forEach((listener) => listener(clone(state), source));
    if (typeof global.dispatchEvent === "function" && typeof global.CustomEvent === "function") {
      global.dispatchEvent(new global.CustomEvent(CHANGE_EVENT, { detail: { source } }));
    }
  }

  function save(mutator, source) {
    const draft = clone(state);
    const output = mutator(draft);
    state = draft;
    try {
      global.localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Unable to persist demo state", error);
    }
    emit(source);
    return output;
  }

  function normalize(input) {
    const seeded = seedFactory.createSeedData();
    const merged = {
      ...seeded,
      ...(input || {}),
      version: 2,
      ui: { ...seeded.ui, ...(input && input.ui ? input.ui : {}) }
    };
    const collectionKeys = [
      "users",
      "students",
      "folders",
      "lessons",
      "series",
      "sessions",
      "bookings",
      "waitlist",
      "interactionSets",
      "interactionVersions",
      "interactionTemplates",
      "interactionAttempts",
      "materials",
      "materialRefs",
      "notifications",
      "changeRequests",
      "auditEvents"
    ];
    collectionKeys.forEach((key) => {
      if (!Array.isArray(merged[key])) merged[key] = seeded[key];
    });

    // 新增题型上线后按 id 补齐模板与示例互动，老快照不必重置演示数据也能看到新题型。
    (seeded.interactionTemplates || []).forEach((template) => {
      if (!merged.interactionTemplates.some((item) => item.id === template.id)) {
        merged.interactionTemplates.push(clone(template));
      }
    });
    const demoInteractionSetIds = ["set-greetings-scenario", "set-greetings-batch-three"];
    demoInteractionSetIds.forEach((setId) => {
      const demoSet = (seeded.interactionSets || []).find((set) => set.id === setId);
      if (!demoSet || merged.interactionSets.some((set) => set.id === demoSet.id)) return;
      merged.interactionSets.push(clone(demoSet));
      (seeded.interactionVersions || [])
        .filter((version) => version.setId === demoSet.id)
        .forEach((version) => merged.interactionVersions.push(clone(version)));
    });

    // Repair core demo scenarios for users who already have an older v2 snapshot.
    if (merged.sessions.some((session) => session.id === "session-preview") &&
        !merged.bookings.some((booking) => booking.sessionId === "session-preview" && booking.studentId === "student-anisa" && booking.status === "booked")) {
      merged.bookings.push({
        id: "booking-preview-anisa",
        sessionId: "session-preview",
        studentId: "student-anisa",
        status: "booked",
        source: "student",
        createdAt: nowIso(),
        enrollmentId: null
      });
    }
    /* 新增材料与课件上线后按 id 补齐：老快照不必重置也能在学习页看到它们。 */
    const backfillRefIds = [
      "ref-friends-preview",
      "ref-time-courseware",
      "ref-time-review-sheet",
      "ref-time-review-audio"
    ];
    backfillRefIds.forEach((refId) => {
      const ref = (seeded.materialRefs || []).find((item) => item.id === refId);
      if (!ref) return;
      const material = (seeded.materials || []).find((item) => item.id === ref.materialId);
      if (material) {
        const existing = merged.materials.find((item) => item.id === material.id);
        if (!existing) {
          merged.materials.push(clone(material));
        } else if (material.kind === "courseware" && existing.kind !== "courseware") {
          existing.title = material.title;
          existing.description = material.description;
          existing.kind = material.kind;
          existing.fileType = material.fileType;
          existing.versions = clone(material.versions);
        }
      }
      if (!merged.materialRefs.some((item) => item.id === ref.id)) {
        merged.materialRefs.push(clone(ref));
      }
    });
    return merged;
  }

  function applyLegacyState(loaded) {
    try {
      const raw = global.localStorage.getItem(LEGACY_KEY);
      if (!raw) return loaded;
      const legacy = JSON.parse(raw);
      if (!legacy || (!legacy.task1Done && !legacy.task2Done)) return loaded;
      const studentId = "student-anisa";
      if (legacy.task1Done && !loaded.interactionAttempts.some((item) => item.id === "legacy-task-1")) {
        loaded.interactionAttempts.push({
          id: "legacy-task-1",
          setId: "set-greetings-live",
          versionId: "ver-greetings-live-1",
          studentId,
          sessionId: "session-live",
          phase: "live",
          score: 100,
          bestScore: 100,
          attempt: 1,
          timeSpentSeconds: 80,
          completedAt: nowIso(),
          answers: {},
          wrongItemIds: [],
          pollAnswers: {}
        });
      }
      if (legacy.task2Done && !loaded.interactionAttempts.some((item) => item.id === "legacy-task-2")) {
        loaded.interactionAttempts.push({
          id: "legacy-task-2",
          setId: "set-greetings-live",
          versionId: "ver-greetings-live-1",
          studentId,
          sessionId: "session-live",
          phase: "live",
          score: 100,
          bestScore: 100,
          attempt: 2,
          timeSpentSeconds: 110,
          completedAt: nowIso(),
          answers: {},
          wrongItemIds: [],
          pollAnswers: {}
        });
      }
      return loaded;
    } catch (error) {
      return loaded;
    }
  }

  function loadState() {
    try {
      const raw = global.localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === 2) return normalize(parsed);
      }
    } catch (error) {
      console.warn("Unable to read demo state, loading seed data", error);
    }
    return applyLegacyState(normalize(seedFactory.createSeedData()));
  }

  function getState() {
    if (!state) state = loadState();
    return clone(state);
  }

  function subscribe(listener) {
    if (!state) state = loadState();
    listeners.add(listener);
    const onCustom = () => listener(clone(state), "custom");
    const onStorage = (event) => {
      if (event.key === STORE_KEY && event.newValue) {
        try {
          state = normalize(JSON.parse(event.newValue));
          listener(clone(state), "storage");
        } catch (error) {
          console.warn("Unable to sync demo state", error);
        }
      }
    };
    global.addEventListener(CHANGE_EVENT, onCustom);
    global.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      global.removeEventListener(CHANGE_EVENT, onCustom);
      global.removeEventListener("storage", onStorage);
    };
  }

  function addNotification(draft, notification) {
    draft.notifications.unshift({
      id: makeId("notice"),
      read: false,
      createdAt: nowIso(),
      ...notification
    });
  }

  function addAudit(draft, event) {
    draft.auditEvents.unshift({
      id: makeId("audit"),
      createdAt: nowIso(),
      reason: "",
      ...event
    });
  }

  function getUser(draft, userId) {
    return draft.users.find((user) => user.id === userId);
  }

  function getSession(draft, sessionId) {
    return draft.sessions.find((session) => session.id === sessionId);
  }

  function getStudentBookings(draft, studentId) {
    return draft.bookings.filter((booking) => booking.studentId === studentId && booking.status === "booked");
  }

  function bookedCount(draft, sessionId) {
    return draft.bookings.filter((booking) => booking.sessionId === sessionId && booking.status === "booked").length;
  }

  function overlaps(aStart, aEnd, bStart, bEnd) {
    return new Date(aStart).getTime() < new Date(bEnd).getTime() && new Date(bStart).getTime() < new Date(aEnd).getTime();
  }

  function studentHasConflict(draft, studentId, session) {
    return getStudentBookings(draft, studentId).some((booking) => {
      if (booking.sessionId === session.id) return false;
      const existing = getSession(draft, booking.sessionId);
      return existing && overlaps(session.startAt, session.endAt, existing.startAt, existing.endAt);
    });
  }

  function teacherHasConflict(draft, teacherId, session, ignoreSessionId) {
    return draft.sessions.some((existing) => {
      if (existing.id === ignoreSessionId) return false;
      if (existing.teacherId !== teacherId) return false;
      if (existing.status === "cancelled") return false;
      return overlaps(session.startAt, session.endAt, existing.startAt, existing.endAt);
    });
  }

  function prepareAutomaticPromotions(draft, sessionId) {
    const session = getSession(draft, sessionId);
    if (!session) return;
    const openSeats = Math.max(0, session.capacity - bookedCount(draft, sessionId));
    if (openSeats <= 0) return;

    const candidates = draft.waitlist
      .filter((entry) => entry.status === "waiting" && (entry.sessionId === sessionId || (entry.sessionIds || []).includes(sessionId)))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    for (const candidate of candidates) {
      if (bookedCount(draft, sessionId) >= session.capacity) break;
      if (candidate.sessionIds && candidate.sessionIds.length > 0) {
        const allAvailable = candidate.sessionIds.every((id) => {
          const current = getSession(draft, id);
          return current && current.status !== "cancelled" && bookedCount(draft, id) < current.capacity;
        });
        if (!allAvailable) continue;
        const enrollmentId = candidate.enrollmentId || makeId("enrollment");
        candidate.sessionIds.forEach((id) => {
          draft.bookings.push({
            id: makeId("booking"),
            sessionId: id,
            studentId: candidate.studentId,
            status: "booked",
            source: "waitlist",
            createdAt: nowIso(),
            enrollmentId
          });
        });
      } else {
        draft.bookings.push({
          id: makeId("booking"),
          sessionId,
          studentId: candidate.studentId,
          status: "booked",
          source: "waitlist",
          createdAt: nowIso(),
          enrollmentId: candidate.enrollmentId || null
        });
      }
      candidate.status = "promoted";
      candidate.promotedAt = nowIso();
      addNotification(draft, {
        userId: candidate.studentId,
        type: "waitlist_promoted",
        title: "候补转正",
        body: `你已成功候补到“${session.title}”，请查看最新课表。`,
        link: "/student/schedule"
      });
      addAudit(draft, {
        actorId: "system",
        action: "waitlist_promoted",
        targetType: "session",
        targetId: sessionId,
        summary: `候补学生 ${candidate.studentId} 自动转正`
      });
    }
  }

  function setCurrentUser(userId) {
    const found = getState().users.find((user) => user.id === userId);
    if (!found) return result(false, null, "找不到演示账号", "USER_NOT_FOUND");
    return save((draft) => {
      draft.currentUserId = userId;
      draft.ui.timeZone = found.timeZone || draft.ui.timeZone;
      draft.ui.language = found.locale === "id-ID" ? "id-ID" : "zh-CN";
      return found;
    }, "current-user");
  }

  function updatePreferences({ language, timeZone, sidebarCollapsed }) {
    return save((draft) => {
      if (language) draft.ui.language = language;
      if (timeZone) draft.ui.timeZone = timeZone;
      if (typeof sidebarCollapsed === "boolean") draft.ui.sidebarCollapsed = sidebarCollapsed;
      const current = getUser(draft, draft.currentUserId);
      if (current && timeZone) current.timeZone = timeZone;
      return draft.ui;
    }, "preferences");
  }

  function bookSession({ studentId, sessionId, force = false, reason = "", source = "student", actorId = studentId }) {
    return save((draft) => {
      const session = getSession(draft, sessionId);
      const student = getUser(draft, studentId);
      if (!session || !student) return result(false, null, "班次或学生不存在", "NOT_FOUND");
      if (session.status !== "published") return result(false, null, "该班次当前不可预约", "SESSION_CLOSED");
      const existing = draft.bookings.find((booking) => booking.sessionId === sessionId && booking.studentId === studentId && booking.status === "booked");
      if (existing) return result(false, existing, "你已经预约该班次", "ALREADY_BOOKED");
      const waiting = draft.waitlist.find((entry) => entry.studentId === studentId && (entry.sessionId === sessionId || (entry.sessionIds || []).includes(sessionId)) && entry.status === "waiting");
      if (waiting) return result(false, waiting, "你已在候补队列中", "ALREADY_WAITLISTED");
      if (new Date(session.bookingCloseAt).getTime() < Date.now() && !force) {
        return result(false, null, "已超过预约截止时间", "BOOKING_CLOSED");
      }
      if (studentHasConflict(draft, studentId, session) && !force) {
        return result(false, null, "该时间与已有课程冲突", "STUDENT_CONFLICT");
      }
      if (bookedCount(draft, sessionId) >= session.capacity && !force) {
        return result(false, null, "该班次已满，可加入候补", "SESSION_FULL");
      }
      if (force && !reason.trim()) {
        return result(false, null, "强制预约必须填写原因", "REASON_REQUIRED");
      }
      const booking = {
        id: makeId("booking"),
        sessionId,
        studentId,
        status: "booked",
        source,
        createdAt: nowIso(),
        enrollmentId: null
      };
      draft.bookings.push(booking);
      addNotification(draft, {
        userId: studentId,
        type: "booking_confirmed",
        title: "预约成功",
        body: `已预约“${session.title}”，预习内容现在可以查看。`,
        link: `/student/lesson/${session.lessonId}?phase=preview&sessionId=${session.id}`
      });
      addAudit(draft, {
        actorId,
        action: force ? "proxy_booking_override" : (source === "operator" ? "proxy_booking" : "booking_created"),
        targetType: "session",
        targetId: sessionId,
        summary: `${source === "operator" ? "代" : ""}预约“${session.title}”`,
        reason
      });
      return result(true, booking);
    }, "booking");
  }

  function joinWaitlist({ studentId, sessionId, seriesId = null, sessionIds = [] }) {
    return save((draft) => {
      const session = getSession(draft, sessionId);
      if (!session) return result(false, null, "班次不存在", "NOT_FOUND");
      const exists = draft.waitlist.some((entry) => entry.studentId === studentId && entry.status === "waiting" && (entry.sessionId === sessionId || (entry.sessionIds || []).includes(sessionId)));
      if (exists) return result(false, null, "你已在候补队列中", "ALREADY_WAITLISTED");
      const bookingExists = draft.bookings.some((booking) => booking.studentId === studentId && booking.sessionId === sessionId && booking.status === "booked");
      if (bookingExists) return result(false, null, "你已经预约该班次", "ALREADY_BOOKED");
      const entry = {
        id: makeId("wait"),
        sessionId: sessionIds.length > 1 ? null : sessionId,
        sessionIds,
        seriesId,
        studentId,
        status: "waiting",
        createdAt: nowIso(),
        enrollmentId: seriesId ? makeId("enrollment") : null
      };
      draft.waitlist.push(entry);
      addNotification(draft, {
        userId: studentId,
        type: "waitlist_joined",
        title: "已加入候补",
        body: seriesId ? "系列班已整套加入候补，有名额时会自动转正。" : `你已加入“${session.title}”候补队列。`,
        link: "/student/schedule"
      });
      return result(true, entry);
    }, "waitlist");
  }

  function leaveWaitlist({ waitlistId, actorId = "", reason = "" }) {
    return save((draft) => {
      const entry = draft.waitlist.find((item) => item.id === waitlistId);
      if (!entry) return result(false, null, "候补记录不存在", "NOT_FOUND");
      entry.status = "cancelled";
      entry.cancelledAt = nowIso();
      addAudit(draft, {
        actorId: actorId || entry.studentId,
        action: "waitlist_cancelled",
        targetType: "waitlist",
        targetId: waitlistId,
        summary: "退出候补队列",
        reason
      });
      return result(true, entry);
    }, "waitlist");
  }

  function cancelBooking({ bookingId, actorId = "", force = false, reason = "" }) {
    return save((draft) => {
      const booking = draft.bookings.find((item) => item.id === bookingId);
      if (!booking) return result(false, null, "预约不存在", "NOT_FOUND");
      const session = getSession(draft, booking.sessionId);
      if (!session) return result(false, null, "班次不存在", "NOT_FOUND");
      if (!force && new Date(session.cancelCloseAt).getTime() < Date.now()) {
        return result(false, null, "已超过学生自主取消截止时间，请联系运营", "CANCEL_CLOSED");
      }
      const affected = booking.enrollmentId
        ? draft.bookings.filter((item) => item.enrollmentId === booking.enrollmentId && item.status === "booked")
        : [booking];
      affected.forEach((item) => {
        item.status = "cancelled";
        item.cancelledAt = nowIso();
        item.cancelledBy = actorId || booking.studentId;
        item.cancelReason = reason;
      });
      affected.forEach((item) => prepareAutomaticPromotions(draft, item.sessionId));
      addNotification(draft, {
        userId: booking.studentId,
        type: "booking_cancelled",
        title: booking.enrollmentId ? "系列班已取消" : "预约已取消",
        body: booking.enrollmentId ? "整套系列班预约已取消，名额已释放。" : `“${session.title}”的预约已取消。`,
        link: "/student/schedule"
      });
      addAudit(draft, {
        actorId: actorId || booking.studentId,
        action: force ? "booking_force_cancelled" : "booking_cancelled",
        targetType: "booking",
        targetId: booking.id,
        summary: `取消“${session.title}”预约`,
        reason
      });
      return result(true, affected);
    }, "booking");
  }

  function enrollSeries({ studentId, seriesId, joinAsWaitlist = false, force = false, reason = "", actorId = studentId }) {
    return save((draft) => {
      const series = draft.series.find((item) => item.id === seriesId);
      if (!series) return result(false, null, "系列班不存在", "NOT_FOUND");
      const sessions = series.sessionIds.map((id) => getSession(draft, id)).filter(Boolean);
      if (sessions.length !== series.sessionIds.length) return result(false, null, "系列班课次不完整", "INVALID_SERIES");
      const existing = draft.bookings.some((booking) => booking.studentId === studentId && series.sessionIds.includes(booking.sessionId) && booking.status === "booked");
      if (existing) return result(false, null, "你已报名该系列班", "ALREADY_ENROLLED");
      const full = sessions.some((session) => bookedCount(draft, session.id) >= session.capacity);
      const conflict = sessions.some((session) => studentHasConflict(draft, studentId, session));
      if (conflict && !force) return result(false, null, "系列班中有课次与你的现有课程冲突", "STUDENT_CONFLICT");
      if (full || joinAsWaitlist) {
        if (!joinAsWaitlist) return result(false, null, "系列班中有课次已满，可整套加入候补", "SERIES_FULL");
        const enrollmentId = makeId("enrollment");
        const entry = {
          id: makeId("wait"),
          sessionId: null,
          sessionIds: [...series.sessionIds],
          seriesId,
          studentId,
          status: "waiting",
          createdAt: nowIso(),
          enrollmentId
        };
        draft.waitlist.push(entry);
        addNotification(draft, {
          userId: studentId,
          type: "waitlist_joined",
          title: "系列班已加入候补",
          body: `“${series.title}”已整套加入候补，有名额时自动转正。`,
          link: "/student/schedule"
        });
        return result(true, entry);
      }
      if (force && !reason.trim()) return result(false, null, "强制报名必须填写原因", "REASON_REQUIRED");
      const enrollmentId = makeId("enrollment");
      const created = sessions.map((session) => ({
        id: makeId("booking"),
        sessionId: session.id,
        studentId,
        status: "booked",
        source: actorId === studentId ? "student" : "operator",
        createdAt: nowIso(),
        enrollmentId
      }));
      draft.bookings.push(...created);
      addNotification(draft, {
        userId: studentId,
        type: "series_enrolled",
        title: "系列班报名成功",
        body: `“${series.title}”的 ${created.length} 次课程已全部加入课表。`,
        link: "/student/schedule"
      });
      addAudit(draft, {
        actorId,
        action: force ? "series_force_enrolled" : "series_enrolled",
        targetType: "series",
        targetId: seriesId,
        summary: `报名“${series.title}”`,
        reason
      });
      return result(true, created);
    }, "series-enrollment");
  }

  function createSession(payload) {
    return save((draft) => {
      const session = {
        id: makeId("session"),
        status: "published",
        language: "zh-id",
        roomLabel: "大班教室",
        source: "single",
        seriesId: null,
        title: payload.title || "未命名大班课",
        capacity: Number(payload.capacity) || 30,
        ...payload,
        startAt: new Date(payload.startAt).toISOString(),
        endAt: new Date(payload.endAt).toISOString()
      };
      if (teacherHasConflict(draft, session.teacherId, session)) {
        return result(false, null, "教师在该时间段已有其他课程", "TEACHER_CONFLICT");
      }
      draft.sessions.push(session);
      addAudit(draft, {
        actorId: payload.actorId || draft.currentUserId,
        action: "create_session",
        targetType: "session",
        targetId: session.id,
        summary: `创建“${session.title}”`,
        reason: payload.reason || ""
      });
      return result(true, session);
    }, "session");
  }

  function createSeries(payload) {
    return save((draft) => {
      const sessionIds = [];
      const start = new Date(payload.startAt);
      const count = Math.max(1, Number(payload.sessionCount) || 4);
      const intervalWeeks = Math.max(1, Number(payload.intervalWeeks) || 1);
      const durationMinutes = Number(payload.durationMinutes) || 40;
      for (let index = 0; index < count; index += 1) {
        const sessionStart = new Date(start);
        sessionStart.setDate(sessionStart.getDate() + index * 7 * intervalWeeks);
        const session = {
          id: makeId("series-session"),
          lessonId: payload.lessonId,
          seriesId: "",
          teacherId: payload.teacherId,
          title: `${payload.title} · 第 ${index + 1} 课`,
          startAt: sessionStart.toISOString(),
          endAt: new Date(sessionStart.getTime() + durationMinutes * 60 * 1000).toISOString(),
          capacity: Number(payload.capacity) || 30,
          status: "published",
          bookingCloseAt: new Date(sessionStart.getTime() - 30 * 60 * 1000).toISOString(),
          cancelCloseAt: new Date(sessionStart.getTime() - 2 * 60 * 60 * 1000).toISOString(),
          language: "zh-id",
          roomLabel: payload.roomLabel || "系列教室",
          source: "series"
        };
        if (teacherHasConflict(draft, session.teacherId, session)) {
          return result(false, null, `第 ${index + 1} 次课与教师现有课程冲突`, "TEACHER_CONFLICT");
        }
        draft.sessions.push(session);
        sessionIds.push(session.id);
      }
      const series = {
        id: makeId("series"),
        lessonId: payload.lessonId,
        title: payload.title,
        description: payload.description || "",
        teacherId: payload.teacherId,
        capacity: Number(payload.capacity) || 30,
        durationMinutes,
        sessionIds,
        weekdays: [],
        status: "published",
        createdAt: nowIso()
      };
      sessionIds.forEach((id) => {
        const session = getSession(draft, id);
        session.seriesId = series.id;
      });
      draft.series.push(series);
      addAudit(draft, {
        actorId: payload.actorId || draft.currentUserId,
        action: "create_series",
        targetType: "series",
        targetId: series.id,
        summary: `创建系列班“${series.title}”`,
        reason: payload.reason || ""
      });
      return result(true, series);
    }, "series");
  }

  function updateSession({ sessionId, patch, actorId, reason = "" }) {
    return save((draft) => {
      const session = getSession(draft, sessionId);
      if (!session) return result(false, null, "班次不存在", "NOT_FOUND");
      const candidate = { ...session, ...patch };
      if (teacherHasConflict(draft, candidate.teacherId, candidate, sessionId)) {
        return result(false, null, "修改后教师时间冲突", "TEACHER_CONFLICT");
      }
      Object.assign(session, patch);
      if (patch.startAt) session.startAt = new Date(patch.startAt).toISOString();
      if (patch.endAt) session.endAt = new Date(patch.endAt).toISOString();
      if (patch.bookingCloseAt) session.bookingCloseAt = new Date(patch.bookingCloseAt).toISOString();
      if (patch.cancelCloseAt) session.cancelCloseAt = new Date(patch.cancelCloseAt).toISOString();
      const bookedStudents = draft.bookings.filter((booking) => booking.sessionId === sessionId && booking.status === "booked");
      bookedStudents.forEach((booking) => {
        addNotification(draft, {
          userId: booking.studentId,
          type: "session_updated",
          title: "课程信息有更新",
          body: `“${session.title}”的课程安排已更新，请重新查看时间。`,
          link: `/student/lesson/${session.lessonId}?phase=preview&sessionId=${session.id}`
        });
      });
      addAudit(draft, {
        actorId: actorId || draft.currentUserId,
        action: "update_session",
        targetType: "session",
        targetId: sessionId,
        summary: `更新“${session.title}”`,
        reason
      });
      return result(true, session);
    }, "session");
  }

  function cancelSession({ sessionId, actorId, reason }) {
    if (!reason || !reason.trim()) return result(false, null, "取消课堂必须填写原因", "REASON_REQUIRED");
    return save((draft) => {
      const session = getSession(draft, sessionId);
      if (!session) return result(false, null, "班次不存在", "NOT_FOUND");
      session.status = "cancelled";
      session.cancelledAt = nowIso();
      session.cancelReason = reason;
      const affected = draft.bookings.filter((booking) => booking.sessionId === sessionId && booking.status === "booked");
      affected.forEach((booking) => {
        booking.status = "cancelled";
        booking.cancelledAt = nowIso();
        booking.cancelledBy = actorId;
        booking.cancelReason = reason;
        addNotification(draft, {
          userId: booking.studentId,
          type: "session_cancelled",
          title: "课堂已取消",
          body: `“${session.title}”已取消。原因：${reason}`,
          link: "/student/schedule"
        });
      });
      addAudit(draft, {
        actorId: actorId || draft.currentUserId,
        action: "cancel_session",
        targetType: "session",
        targetId: sessionId,
        summary: `取消“${session.title}”`,
        reason
      });
      return result(true, session);
    }, "session");
  }

  function saveInteractionSet({ setId = "", lessonId, title, description, phase, items, actorId, publishNote = "" }) {
    return save((draft) => {
      let set = setId ? draft.interactionSets.find((item) => item.id === setId) : null;
      if (!set) {
        set = {
          id: makeId("set"),
          lessonId,
          title,
          description,
          phase,
          status: "published",
          currentVersionId: "",
          order: draft.interactionSets.filter((item) => item.lessonId === lessonId && item.phase === phase).length + 1,
          updatedAt: nowIso()
        };
        draft.interactionSets.push(set);
      }
      const versions = draft.interactionVersions.filter((version) => version.setId === set.id);
      const nextVersionNumber = versions.reduce((max, version) => Math.max(max, version.version), 0) + 1;
      versions.forEach((version) => {
        version.status = "archived";
      });
      const version = {
        id: makeId("ver"),
        setId: set.id,
        version: nextVersionNumber,
        status: "published",
        publishedAt: nowIso(),
        publishedBy: actorId || draft.currentUserId,
        publishNote: publishNote || "保存并发布",
        items: clone(items || [])
      };
      draft.interactionVersions.push(version);
      Object.assign(set, {
        lessonId,
        title,
        description,
        phase,
        status: "published",
        currentVersionId: version.id,
        updatedAt: nowIso()
      });
      addAudit(draft, {
        actorId: actorId || draft.currentUserId,
        action: "publish_interaction",
        targetType: "interaction_set",
        targetId: set.id,
        summary: `发布“${set.title}”第 ${version.version} 版`,
        reason: publishNote
      });
      return result(true, { set, version });
    }, "interaction");
  }

  function assignInteractionSessions({ setId, sessionIds = [], actorId }) {
    return save((draft) => {
      const set = draft.interactionSets.find((item) => item.id === setId);
      if (!set) return result(false, null, "互动不存在", "NOT_FOUND");
      const ids = [...new Set(sessionIds)];
      const invalid = ids.filter((id) => !draft.sessions.some((session) => session.id === id));
      if (invalid.length) return result(false, null, "课次不存在", "NOT_FOUND");
      set.sessionIds = ids;
      set.updatedAt = nowIso();
      const scope = ids.length
        ? draft.sessions.filter((session) => ids.includes(session.id)).map((session) => session.title).join("、")
        : "该课节的全部课次";
      addAudit(draft, {
        actorId: actorId || draft.currentUserId,
        action: "assign_interaction",
        targetType: "interaction_set",
        targetId: setId,
        summary: `把“${set.title}”配置到：${scope}`
      });
      return result(true, set);
    }, "interaction");
  }

  function rollbackInteractionVersion({ setId, versionId, actorId }) {
    return save((draft) => {
      const set = draft.interactionSets.find((item) => item.id === setId);
      if (!set) return result(false, null, "互动不存在", "NOT_FOUND");
      const version = draft.interactionVersions.find((item) => item.id === versionId && item.setId === setId);
      if (!version) return result(false, null, "版本不存在", "NOT_FOUND");
      draft.interactionVersions.filter((item) => item.setId === setId).forEach((item) => {
        item.status = item.id === versionId ? "published" : "archived";
      });
      set.currentVersionId = versionId;
      set.updatedAt = nowIso();
      addAudit(draft, {
        actorId: actorId || draft.currentUserId,
        action: "rollback_interaction",
        targetType: "interaction_set",
        targetId: setId,
        summary: `回滚“${set.title}”到第 ${version.version} 版`
      });
      return result(true, { set, version });
    }, "interaction");
  }

  const changeRequestLabels = {
    reschedule: "申请改期",
    add_session: "申请加课",
    new_lesson_plan: "申请新增课节",
    teacher_swap: "申请更换授课老师",
    cancel: "申请取消课次"
  };

  function requestSessionChange({ sessionId, kind, reason, actorId }) {
    return save((draft) => {
      const session = getSession(draft, sessionId);
      if (!session) return result(false, null, "课次不存在", "NOT_FOUND");
      if (!reason || reason.trim().length < 6) {
        return result(false, null, "请填写至少 6 个字的申请原因，方便运营判断", "REASON_REQUIRED");
      }
      const request = {
        id: makeId("request"),
        sessionId,
        teacherId: session.teacherId,
        kind,
        reason: reason.trim(),
        status: "pending",
        createdAt: nowIso()
      };
      draft.changeRequests.unshift(request);
      addAudit(draft, {
        actorId: actorId || draft.currentUserId,
        action: "teacher_request",
        targetType: "session",
        targetId: sessionId,
        summary: `${changeRequestLabels[kind] || "申请调整"}：${session.title}`,
        reason: request.reason
      });
      const operators = draft.users.filter((user) => user.role === "operator");
      operators.forEach((operator) => {
        draft.notifications.unshift({
          id: makeId("notice"),
          userId: operator.id,
          type: "change_request",
          title: `${changeRequestLabels[kind] || "教师申请"}待处理`,
          body: `${session.title}：${request.reason}`,
          read: false,
          createdAt: nowIso(),
          link: "/operator/scheduling"
        });
      });
      return result(true, request);
    }, "session");
  }

  function resolveChangeRequest({ requestId, status = "handled", resolutionNote = "", actorId }) {
    return save((draft) => {
      const request = draft.changeRequests.find((item) => item.id === requestId);
      if (!request) return result(false, null, "申请不存在", "NOT_FOUND");
      request.status = status;
      request.handledAt = nowIso();
      request.handledBy = actorId || draft.currentUserId;
      request.resolutionNote = resolutionNote;
      addAudit(draft, {
        actorId: actorId || draft.currentUserId,
        action: status === "handled" ? "resolve_change_request" : "reject_change_request",
        targetType: "session",
        targetId: request.sessionId,
        summary: `${status === "handled" ? "已处理" : "已驳回"}教师申请：${changeRequestLabels[request.kind] || request.kind}`,
        reason: resolutionNote
      });
      draft.notifications.unshift({
        id: makeId("notice"),
        userId: request.teacherId,
        type: "change_request_result",
        title: status === "handled" ? "你的申请已处理" : "你的申请未通过",
        body: resolutionNote || "运营已更新排课，请查看最新课表。",
        read: false,
        createdAt: nowIso(),
        link: "/teacher/schedule"
      });
      return result(true, request);
    }, "session");
  }

  function createFolder({ parentId = "folder-root", name, description = "", color = "#6552ff", actorId }) {
    return save((draft) => {
      const parent = draft.folders.find((folder) => folder.id === parentId);
      if (!parent) return result(false, null, "上级目录不存在", "NOT_FOUND");
      const folder = {
        id: makeId("folder"),
        parentId,
        name: name.trim(),
        description,
        color,
        order: draft.folders.filter((item) => item.parentId === parentId).length + 1
      };
      if (!folder.name) return result(false, null, "目录名称不能为空", "INVALID_NAME");
      draft.folders.push(folder);
      addAudit(draft, {
        actorId: actorId || draft.currentUserId,
        action: "create_folder",
        targetType: "folder",
        targetId: folder.id,
        summary: `创建课程目录“${folder.name}”`
      });
      return result(true, folder);
    }, "catalog");
  }

  function createLesson({ folderId, title, subtitle = "", description = "", durationMinutes = 40, tags = [], color = "#6552ff", coverEmoji = "📘", actorId }) {
    return save((draft) => {
      const folder = draft.folders.find((item) => item.id === folderId);
      if (!folder) return result(false, null, "课程目录不存在", "NOT_FOUND");
      if (!title.trim()) return result(false, null, "课节标题不能为空", "INVALID_NAME");
      const lesson = {
        id: makeId("lesson"),
        folderId,
        title: title.trim(),
        subtitle,
        description,
        durationMinutes: Number(durationMinutes) || 40,
        tags: tags.filter(Boolean),
        color,
        coverEmoji,
        status: "published"
      };
      draft.lessons.push(lesson);
      addAudit(draft, {
        actorId: actorId || draft.currentUserId,
        action: "create_lesson",
        targetType: "lesson",
        targetId: lesson.id,
        summary: `创建课节“${lesson.title}”`
      });
      return result(true, lesson);
    }, "catalog");
  }

  function createStudent({ name, phone = "", timeZone = "Asia/Jakarta", locale = "id-ID", program = "Mandarin Explorer", level = "初级 1", learningGoal = "", preferredTeacherId = "", actorId }) {
    return save((draft) => {
      if (!name.trim()) return result(false, null, "学生姓名不能为空", "INVALID_NAME");
      const userId = makeId("student");
      const user = {
        id: userId,
        role: "student",
        name: name.trim(),
        nameZh: name.trim().slice(0, 1),
        phone,
        avatar: name.trim().slice(0, 2),
        timeZone,
        locale,
        status: "active"
      };
      const profile = {
        userId,
        program,
        level,
        learningGoal,
        preferredTeacherId,
        preferredTimeZone: timeZone,
        joinedAt: nowIso(),
        tags: ["新建学生"],
        notes: ""
      };
      draft.users.push(user);
      draft.students.push(profile);
      addAudit(draft, {
        actorId: actorId || draft.currentUserId,
        action: "create_student",
        targetType: "student",
        targetId: userId,
        summary: `创建学生“${user.name}”`
      });
      return result(true, { user, profile });
    }, "student");
  }

  function addMockMaterial({ title, description, fileType = "pdf", language = "zh-id", ownerId, phase = "preview", lessonId, fileName = "uploaded-demo.pdf", sizeLabel = "32 KB" }) {
    return save((draft) => {
      const material = {
        id: makeId("material"),
        title,
        description,
        kind: "file",
        fileType,
        language,
        ownerId,
        status: "published",
        currentVersion: 1,
        downloadCount: 0,
        createdAt: nowIso(),
        versions: [
          {
            version: 1,
            fileName,
            sizeLabel,
            url: "/shared/demo-materials/greeting-preview.pdf",
            publishedAt: nowIso()
          }
        ]
      };
      draft.materials.unshift(material);
      if (lessonId) {
        draft.materialRefs.push({
          id: makeId("ref"),
          materialId: material.id,
          lessonId,
          phase,
          order: draft.materialRefs.filter((ref) => ref.lessonId === lessonId && ref.phase === phase).length + 1,
          published: true
        });
      }
      addAudit(draft, {
        actorId: ownerId || draft.currentUserId,
        action: "create_material",
        targetType: "material",
        targetId: material.id,
        summary: `模拟上传“${material.title}”`
      });
      return result(true, material);
    }, "material");
  }

  function attachMaterial({ materialId, lessonId, phase, order = 1, actorId }) {
    return save((draft) => {
      const material = draft.materials.find((item) => item.id === materialId);
      if (!material) return result(false, null, "材料不存在", "NOT_FOUND");
      const existing = draft.materialRefs.find((ref) => ref.materialId === materialId && ref.lessonId === lessonId && ref.phase === phase);
      if (existing) {
        existing.order = order;
        existing.published = true;
      } else {
        draft.materialRefs.push({
          id: makeId("ref"),
          materialId,
          lessonId,
          phase,
          order,
          published: true
        });
      }
      addAudit(draft, {
        actorId: actorId || draft.currentUserId,
        action: "attach_material",
        targetType: "material",
        targetId: materialId,
        summary: `将“${material.title}”加入 ${phase} 阶段`
      });
      return result(true, material);
    }, "material");
  }

  function addMaterialVersion({ materialId, fileName, sizeLabel, actorId }) {
    return save((draft) => {
      const material = draft.materials.find((item) => item.id === materialId);
      if (!material) return result(false, null, "材料不存在", "NOT_FOUND");
      const version = material.currentVersion + 1;
      material.versions.push({
        version,
        fileName,
        sizeLabel,
        url: "/shared/demo-materials/greeting-preview.pdf",
        publishedAt: nowIso()
      });
      material.currentVersion = version;
      addAudit(draft, {
        actorId: actorId || draft.currentUserId,
        action: "version_material",
        targetType: "material",
        targetId: materialId,
        summary: `上传“${material.title}”第 ${version} 版`
      });
      return result(true, material);
    }, "material");
  }

  function setMaterialStatus({ materialId, status, actorId, reason = "" }) {
    return save((draft) => {
      const material = draft.materials.find((item) => item.id === materialId);
      if (!material) return result(false, null, "材料不存在", "NOT_FOUND");
      material.status = status;
      addAudit(draft, {
        actorId: actorId || draft.currentUserId,
        action: status === "published" ? "publish_material" : "unpublish_material",
        targetType: "material",
        targetId: materialId,
        summary: `${status === "published" ? "恢复" : "下架"}“${material.title}”`,
        reason
      });
      return result(true, material);
    }, "material");
  }

  function trackDownload(materialId) {
    return save((draft) => {
      const material = draft.materials.find((item) => item.id === materialId);
      if (!material) return result(false, null, "材料不存在", "NOT_FOUND");
      material.downloadCount += 1;
      return result(true, material);
    }, "download");
  }

  function recordAttempt({ setId, studentId, sessionId, phase, answers, score, timeSpentSeconds, wrongItemIds = [], pollAnswers = {} }) {
    return save((draft) => {
      const set = draft.interactionSets.find((item) => item.id === setId);
      if (!set) return result(false, null, "互动不存在", "NOT_FOUND");
      const previous = draft.interactionAttempts.filter((attempt) => attempt.setId === setId && attempt.studentId === studentId);
      const bestPrevious = previous.reduce((max, attempt) => Math.max(max, attempt.bestScore || 0), 0);
      const attempt = {
        id: makeId("attempt"),
        setId,
        versionId: set.currentVersionId,
        studentId,
        sessionId: sessionId || null,
        phase,
        score,
        bestScore: Math.max(bestPrevious, score),
        attempt: previous.length + 1,
        timeSpentSeconds,
        completedAt: nowIso(),
        answers: answers || {},
        wrongItemIds,
        pollAnswers
      };
      draft.interactionAttempts.push(attempt);
      if (score === 100) {
        addNotification(draft, {
          userId: studentId,
          type: "interaction_complete",
          title: "练习完成",
          body: `你完成了“${set.title}”，得分 ${score} 分。`,
          link: `/student/results`
        });
      }
      return result(true, attempt);
    }, "attempt");
  }

  function updateStudent({ studentId, patch, actorId, reason = "" }) {
    return save((draft) => {
      const profile = draft.students.find((student) => student.userId === studentId);
      const user = getUser(draft, studentId);
      if (!profile || !user) return result(false, null, "学生不存在", "NOT_FOUND");
      const userFields = ["name", "nameZh", "phone", "timeZone", "locale", "status"];
      Object.entries(patch).forEach(([key, value]) => {
        if (userFields.includes(key)) user[key] = value;
        else profile[key] = value;
      });
      addAudit(draft, {
        actorId: actorId || draft.currentUserId,
        action: "update_student",
        targetType: "student",
        targetId: studentId,
        summary: `更新学生“${user.name}”档案`,
        reason
      });
      return result(true, { user, profile });
    }, "student");
  }

  function markNotificationRead(notificationId) {
    return save((draft) => {
      const notice = draft.notifications.find((item) => item.id === notificationId);
      if (!notice) return result(false, null, "通知不存在", "NOT_FOUND");
      notice.read = true;
      return result(true, notice);
    }, "notification");
  }

  function markAllNotificationsRead(userId) {
    return save((draft) => {
      draft.notifications.filter((item) => item.userId === userId).forEach((notice) => {
        notice.read = true;
      });
      return result(true, true);
    }, "notification");
  }

  function resetDemo() {
    state = normalize(seedFactory.createSeedData());
    try {
      global.localStorage.setItem(STORE_KEY, JSON.stringify(state));
      global.localStorage.removeItem(LEGACY_KEY);
    } catch (error) {
      console.warn("Unable to reset demo state", error);
    }
    emit("reset");
    return result(true, clone(state));
  }

  const api = {
    STORE_KEY,
    LEGACY_KEY,
    CHANGE_EVENT,
    getState,
    subscribe,
    resetDemo,
    setCurrentUser,
    updatePreferences,
    bookSession,
    joinWaitlist,
    leaveWaitlist,
    cancelBooking,
    enrollSeries,
    createSession,
    createSeries,
    updateSession,
    cancelSession,
    requestSessionChange,
    resolveChangeRequest,
    saveInteractionSet,
    rollbackInteractionVersion,
    assignInteractionSessions,
    createFolder,
    createLesson,
    createStudent,
    addMockMaterial,
    attachMaterial,
    addMaterialVersion,
    setMaterialStatus,
    trackDownload,
    recordAttempt,
    updateStudent,
    markNotificationRead,
    markAllNotificationsRead
  };

  global.AICloudPlatformStore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
