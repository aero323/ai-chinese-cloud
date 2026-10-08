import { beforeEach, describe, expect, it } from "vitest";
import "../admin/src/lib/platform";
import { platform } from "../admin/src/lib/platform";
import { relativeGradeRange } from "../admin/src/lib/gradeAnalytics";
import { buildTeacherRanking, teacherPerformanceCsv } from "../admin/src/lib/teacherPerformance";

describe("teacher performance ranking", () => {
  beforeEach(() => {
    platform.resetDemo();
  });

  it("ranks only teachers with at least five valid students", () => {
    const base = platform.getState();
    const state = structuredClone(base);
    state.users.push({
      id: "teacher-empty",
      role: "teacher",
      name: "Empty Teacher",
      avatar: "ET",
      timeZone: "Asia/Jakarta",
      locale: "zh-CN",
      status: "active"
    });
    state.schoolMemberships.push({
      id: "membership-teacher-empty",
      schoolId: "school-sacred-heart",
      userId: "teacher-empty",
      role: "teacher",
      status: "active",
      joinedAt: new Date().toISOString()
    });
    const range = relativeGradeRange(state.ui.timeZone, 90);
    const result = buildTeacherRanking(state, "school-sacred-heart", range);
    const lina = result.teachers.find((item) => item.teacherId === "teacher-lina")!;
    const berenice = result.teachers.find((item) => item.teacherId === "teacher-berenice")!;
    const empty = result.teachers.find((item) => item.teacherId === "teacher-empty")!;
    expect(lina.ranked).toBe(true);
    expect(lina.sampleSize).toBeGreaterThanOrEqual(5);
    expect(berenice.ranked).toBe(true);
    expect(new Set([lina.rank, berenice.rank])).toEqual(new Set([1, 2]));
    expect(empty.ranked).toBe(false);
    expect(empty.rank).toBeNull();
  });

  it("attributes a session result to the actual substitute teacher, not the class owner", () => {
    const state = platform.getState();
    const sacredClass = state.classes.find((item) => item.schoolId === "school-sacred-heart")!;
    const start = new Date(Date.now() - 2 * 86400000);
    const created = platform.createSession({
      title: "代课教师实测课",
      lessonId: "lesson-greetings",
      teacherId: "teacher-berenice",
      classId: sacredClass.id,
      startAt: start.toISOString(),
      endAt: new Date(start.getTime() + 40 * 60_000).toISOString(),
      capacity: 20,
      actorId: "operator-ray"
    });
    expect(created.ok).toBe(true);
    expect(platform.recordAttempt({
      setId: "set-greetings-preview",
      sessionId: created.data!.id,
      studentId: "student-anisa",
      phase: "preview",
      answers: {},
      score: 96,
      timeSpentSeconds: 90
    }).ok).toBe(true);

    const after = platform.getState();
    const result = buildTeacherRanking(after, "school-sacred-heart", relativeGradeRange(after.ui.timeZone, 90));
    const berenice = result.teachers.find((item) => item.teacherId === "teacher-berenice")!;
    const lina = result.teachers.find((item) => item.teacherId === "teacher-lina")!;
    expect(berenice.students.some((student) => student.studentId === "student-anisa")).toBe(true);
    expect(lina.students.find((student) => student.studentId === "student-anisa")?.records.some((record) => record.sessionId === created.data!.id)).toBe(false);
  });

  it("exports only teacher-level aggregates", () => {
    const state = platform.getState();
    const result = buildTeacherRanking(state, "school-sacred-heart", relativeGradeRange(state.ui.timeZone, 90));
    const csv = teacherPerformanceCsv("印尼圣心学校", relativeGradeRange(state.ui.timeZone, 90), result.teachers);
    expect(csv).toContain("Lina 老师");
    expect(csv).toContain("有效学生数");
    expect(csv).not.toContain("Anisa");
    expect(csv).not.toContain("student-anisa");
  });
});
