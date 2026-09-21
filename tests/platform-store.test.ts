import { beforeEach, describe, expect, it } from "vitest";
import "../admin/src/lib/platform";
import { platform } from "../admin/src/lib/platform";
import { formatDateTime } from "../admin/src/lib/format";
import { lessonContent } from "../admin/src/lib/domain";

describe("AI Chinese Cloud platform store", () => {
  beforeEach(() => {
    platform.resetDemo();
  });

  it("prevents duplicate bookings and sends full sessions to waitlist", () => {
    const duplicate = platform.bookSession({ studentId: "student-anisa", sessionId: "session-live" });
    expect(duplicate.ok).toBe(false);
    expect(duplicate.code).toBe("ALREADY_BOOKED");

    const full = platform.bookSession({ studentId: "student-kevin", sessionId: "session-waitlist-full" });
    expect(full.ok).toBe(false);
    expect(full.code).toBe("SESSION_FULL");

    const waitlist = platform.joinWaitlist({ studentId: "student-kevin", sessionId: "session-waitlist-full" });
    expect(waitlist.ok).toBe(true);
    expect(waitlist.data?.status).toBe("waiting");
  });

  it("automatically promotes the earliest waitlisted student after cancellation", () => {
    const before = platform.getState();
    const entry = before.waitlist.find((item) => item.id === "wait-session-waitlist-anisa");
    expect(entry?.status).toBe("waiting");

    const booking = before.bookings.find((item) => item.id === "booking-waitlist-raymond");
    expect(booking).toBeTruthy();
    const result = platform.cancelBooking({ bookingId: booking!.id, actorId: "operator-ray", force: true, reason: "测试候补转正" });
    expect(result.ok).toBe(true);

    const after = platform.getState();
    expect(after.waitlist.find((item) => item.id === entry!.id)?.status).toBe("promoted");
    expect(after.bookings.some((item) => item.studentId === "student-anisa" && item.sessionId === "session-waitlist-full" && item.status === "booked")).toBe(true);
  });

  it("enrolls a series atomically across every session", () => {
    const result = platform.enrollSeries({ studentId: "student-anisa", seriesId: "series-weekly-food" });
    expect(result.ok).toBe(true);
    const state = platform.getState();
    const bookings = state.bookings.filter((booking) => booking.studentId === "student-anisa" && booking.enrollmentId);
    expect(bookings).toHaveLength(4);
    expect(new Set(bookings.map((booking) => booking.sessionId)).size).toBe(4);
  });

  it("blocks teacher schedule conflicts", () => {
    const live = platform.getState().sessions.find((session) => session.id === "session-live")!;
    const result = platform.createSession({
      title: "冲突测试课堂",
      lessonId: "lesson-time",
      teacherId: live.teacherId,
      startAt: live.startAt,
      endAt: live.endAt,
      capacity: 20
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("TEACHER_CONFLICT");
  });

  it("creates course structure and student profiles", () => {
    const folder = platform.createFolder({ parentId: "folder-root", name: "节日主题" });
    expect(folder.ok).toBe(true);

    const lesson = platform.createLesson({
      folderId: folder.data!.id,
      title: "春节问候",
      subtitle: "Salam Tahun Baru Imlek",
      tags: ["节日", "文化"]
    });
    expect(lesson.ok).toBe(true);

    const student = platform.createStudent({
      name: "Nadia",
      timeZone: "Asia/Jakarta",
      learningGoal: "日常会话"
    });
    expect(student.ok).toBe(true);
    expect(platform.getState().students.some((profile) => profile.userId === student.data!.user.id)).toBe(true);
  });

  it("keeps interaction versions and supports rollback", () => {
    const before = platform.getState();
    const set = before.interactionSets.find((item) => item.id === "set-greetings-preview")!;
    const versionOne = before.interactionVersions.find((version) => version.id === "ver-greetings-preview-1")!;
    expect(set.currentVersionId).not.toBe(versionOne.id);

    const result = platform.rollbackInteractionVersion({ setId: set.id, versionId: versionOne.id, actorId: "operator-ray" });
    expect(result.ok).toBe(true);
    expect(platform.getState().interactionSets.find((item) => item.id === set.id)?.currentVersionId).toBe(versionOne.id);
  });

  it("ships the four new interaction types in templates and the demo set", () => {
    const state = platform.getState();
    const templateTypes = new Set(state.interactionTemplates.map((template) => template.type));
    ["picture", "picture-match", "situation", "dialogue"].forEach((type) => {
      expect(templateTypes.has(type as never)).toBe(true);
    });

    const scenarioSet = state.interactionSets.find((set) => set.id === "set-greetings-scenario");
    expect(scenarioSet?.lessonId).toBe("lesson-greetings");
    const scenarioVersion = state.interactionVersions.find((version) => version.id === scenarioSet?.currentVersionId);
    expect(scenarioVersion?.items.map((item) => item.type)).toEqual(["picture", "picture-match", "situation", "dialogue"]);
  });

  it("ships the batch-three interaction types in templates and the demo set", () => {
    const state = platform.getState();
    const templateTypes = new Set(state.interactionTemplates.map((template) => template.type));
    ["pinyin-match", "category", "word-build", "correction", "listening", "read-aloud", "picture-talk", "open-qa"].forEach((type) => {
      expect(templateTypes.has(type as never)).toBe(true);
    });
    // 每个新题型至少有两套模板可挑。
    const batchThreeTypes = ["pinyin-match", "category", "word-build", "correction", "listening", "read-aloud", "picture-talk", "open-qa"];
    batchThreeTypes.forEach((type) => {
      const count = state.interactionTemplates.filter((template) => template.type === type).length;
      expect(count).toBeGreaterThanOrEqual(2);
    });

    const demoSet = state.interactionSets.find((set) => set.id === "set-greetings-batch-three");
    expect(demoSet?.lessonId).toBe("lesson-greetings");
    const demoVersion = state.interactionVersions.find((version) => version.id === demoSet?.currentVersionId);
    expect([...(demoVersion?.items.map((item) => item.type) ?? [])].sort()).toEqual([...batchThreeTypes].sort());
  });

  it("round-trips a category question through save and publish", () => {
    const result = platform.saveInteractionSet({
      lessonId: "lesson-greetings",
      title: "新题型保存测试",
      description: "分类归组",
      phase: "live",
      actorId: "teacher-lina",
      items: [
        {
          id: "item-test-category",
          type: "category",
          prompt: "把下面的词放到对应的类别里。",
          explanation: "见面和道别要分开。",
          groups: [
            { id: "group-hello", name: "见面时" },
            { id: "group-bye", name: "离开时" }
          ],
          words: [
            { id: "word-hello", text: "你好", pinyin: "nǐ hǎo", group: "group-hello" },
            { id: "word-bye", text: "再见", pinyin: "zàijiàn", group: "group-bye" }
          ]
        }
      ]
    });
    expect(result.ok).toBe(true);
    const savedSetId = result.data!.set.id;
    const saved = platform.getState();
    const version = saved.interactionVersions.find((item) => item.id === saved.interactionSets.find((set) => set.id === savedSetId)?.currentVersionId);
    expect(version?.items[0].groups?.[0].name).toBe("见面时");
    expect(version?.items[0].words?.[1].group).toBe("group-bye");
  });

  it("round-trips a picture question through save and publish", () => {
    const result = platform.saveInteractionSet({
      lessonId: "lesson-greetings",
      title: "新题型保存测试",
      description: "看图单选",
      phase: "live",
      actorId: "teacher-lina",
      items: [
        {
          id: "item-test-picture",
          type: "picture",
          prompt: "这是哪个时间？",
          explanation: "月亮代表晚上。",
          media: { icon: "🌙", image: "", alt: "夜晚的月亮" },
          promptPinyin: "Zhè shì nǎge shíjiān?",
          choices: [
            { id: "test-night", text: "晚上", hint: "wǎnshang", isCorrect: true },
            { id: "test-noon", text: "中午", hint: "zhōngwǔ", isCorrect: false }
          ]
        }
      ]
    });
    expect(result.ok).toBe(true);
    const savedSetId = result.data!.set.id;
    const saved = platform.getState();
    const version = saved.interactionVersions.find((item) => item.id === saved.interactionSets.find((set) => set.id === savedSetId)?.currentVersionId);
    expect(version?.items[0].media?.icon).toBe("🌙");
    expect(version?.items[0].choices?.[0].hint).toBe("wǎnshang");
  });

  it("attaches the time lesson courseware and review materials per phase", () => {
    const state = platform.getState();

    const preview = lessonContent(state, "lesson-time", "preview", "session-waitlist-full");
    const courseware = preview.materials.find((material) => material?.id === "material-time-courseware");
    expect(courseware?.kind).toBe("courseware");
    expect(courseware?.versions.find((entry) => entry.version === courseware.currentVersion)?.url).toBe(
      "/shared/demo-materials/time-courseware.html"
    );

    const review = lessonContent(state, "lesson-time", "review", "session-waitlist-full");
    const reviewIds = review.materials.map((material) => material?.id);
    expect(reviewIds).toEqual(["material-time-review-sheet", "material-time-review-audio"]);
    const sheet = review.materials[0];
    const audio = review.materials[1];
    expect(sheet?.kind).toBe("file");
    expect(sheet?.versions.at(-1)?.url).toBe("/shared/demo-materials/time-review-sheet.pdf");
    expect(audio?.fileType).toBe("wav");
    expect(audio?.versions.at(-1)?.url).toBe("/shared/demo-materials/time-review-audio.wav");

    // 课中阶段仍然不显示预习和复习材料。
    expect(lessonContent(state, "lesson-time", "live", "session-waitlist-full").materials).toHaveLength(0);
  });

  it("records attempts and keeps the best score", () => {
    platform.recordAttempt({
      setId: "set-greetings-review",
      studentId: "student-maya",
      sessionId: "session-past",
      phase: "review",
      answers: {},
      score: 60,
      timeSpentSeconds: 40,
      wrongItemIds: ["item-review-order"]
    });
    const second = platform.recordAttempt({
      setId: "set-greetings-review",
      studentId: "student-maya",
      sessionId: "session-past",
      phase: "review",
      answers: {},
      score: 90,
      timeSpentSeconds: 35,
      wrongItemIds: []
    });
    expect(second.data?.bestScore).toBe(90);
  });

  it("formats the same UTC time differently for Jakarta and Shanghai", () => {
    const iso = "2026-09-16T12:00:00.000Z";
    const jakarta = formatDateTime(iso, "Asia/Jakarta", "zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
    const shanghai = formatDateTime(iso, "Asia/Shanghai", "zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
    expect(jakarta).toContain("19:00");
    expect(shanghai).toContain("20:00");
  });
});
