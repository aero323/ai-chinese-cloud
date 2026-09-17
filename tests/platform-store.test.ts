import { beforeEach, describe, expect, it } from "vitest";
import "../admin/src/lib/platform";
import { platform } from "../admin/src/lib/platform";
import { formatDateTime } from "../admin/src/lib/format";

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
