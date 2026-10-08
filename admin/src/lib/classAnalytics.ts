import type { ClassSession, Material, Phase, PlatformState } from "../domain/types";
import { getBookedCount, getCurrentInteractionVersion, getUser, sessionMaterials, setsForSession } from "./domain";

/**
 * 学习结果页的「全班完成情况」。
 * 口径刻意不用分数：互动只有完成情况与用时；材料看有多少人播放 / 查看 / 下载，以及平均用时。
 * 原型阶段：真实提交（state.interactionAttempts）优先，其余按课次 / 内容 / 学生做确定性模拟。
 */
export type ClassContentKind = "interaction" | "material";
export type ClassContentStatus = "good" | "ok" | "weak";

export interface ClassContentStudent {
  studentId: string;
  name: string;
  avatar: string;
  level: string;
  className: string;
  done: boolean;
  minutes: number;
  completedAt: string;
}

export interface ClassContentRow {
  id: string;
  kind: ClassContentKind;
  title: string;
  phase: Phase;
  /** 副标题：互动是题数，材料是格式与大小。 */
  detail: string;
  /** 学生端的动作：完成 / 播放 / 查看 / 下载。 */
  actionLabel: string;
  doneCount: number;
  total: number;
  rate: number;
  averageMinutes: number;
  status: ClassContentStatus;
  students: ClassContentStudent[];
}

export interface ClassAnalytics {
  rosterSize: number;
  rows: ClassContentRow[];
  interactionCount: number;
  materialCount: number;
  reachedStudents: number;
  totalActions: number;
  averageRate: number;
  averageMinutes: number;
  totalMinutes: number;
  goodCount: number;
  weakCount: number;
}

/** 稳定的字符串哈希：同一个课次 / 内容 / 学生每次刷新得到同样的模拟结果。 */
function seededRandom(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

/** 只看触达 / 完成率：≥85% 完成较好，≥60% 基本完成，其余需要关注。 */
function statusOf(rate: number): ClassContentStatus {
  if (rate >= 85) return "good";
  if (rate >= 60) return "ok";
  return "weak";
}

/** 材料类型决定学生端的动作与参考触达率 / 用时。 */
function materialProfile(material: Material) {
  const type = material.fileType;
  if (type === "wav" || type === "mp3") return { action: "播放", rate: 0.92, minMinutes: 2, maxMinutes: 7 };
  if (type === "video") return { action: "播放", rate: 0.86, minMinutes: 2, maxMinutes: 6 };
  if (type === "pptx" || type === "html") return { action: "查看", rate: 0.82, minMinutes: 2, maxMinutes: 6 };
  if (type === "png" || type === "image") return { action: "查看", rate: 0.8, minMinutes: 1, maxMinutes: 3 };
  if (type === "pdf") return { action: "查看", rate: 0.74, minMinutes: 1, maxMinutes: 4 };
  if (material.kind === "link") return { action: "查看", rate: 0.7, minMinutes: 2, maxMinutes: 5 };
  return { action: "下载", rate: 0.68, minMinutes: 1, maxMinutes: 4 };
}

export function buildClassAnalytics(state: PlatformState, session: ClassSession): ClassAnalytics {
  const roster = state.bookings
    .filter((booking) => booking.sessionId === session.id && booking.status === "booked")
    .map((booking) => {
      const user = getUser(state, booking.studentId);
      const profile = state.students.find((item) => item.userId === booking.studentId);
      return {
        studentId: booking.studentId,
        name: user?.name ?? "学生",
        avatar: user?.avatar ?? "学",
        level: profile?.level ?? "—",
        className: profile?.className ?? "待分班"
      };
    });
  const total = roster.length || getBookedCount(state, session.id);
  const sessionSets = setsForSession(state, session).filter((set) => set.status === "published");
  const sessionAttempts = state.interactionAttempts.filter((attempt) => attempt.sessionId === session.id);
  // 课中材料供老师投影或参考，不作为学生学习内容的完成口径；只统计课前和课后材料。
  const materialEntries = (["preview", "review"] as Phase[]).flatMap((phase) =>
    sessionMaterials(state, session, phase).map((entry) => ({ ...entry, phase }))
  );

  const rows: ClassContentRow[] = [];

  sessionSets.forEach((set, index) => {
    const difficulty = seededRandom(`${session.id}:${set.id}:difficulty`);
    const version = getCurrentInteractionVersion(state, set);
    const baseRate = 0.96 - difficulty * 0.55;
    const students: ClassContentStudent[] = roster.map((member) => {
      const real = sessionAttempts.find((attempt) => attempt.setId === set.id && attempt.studentId === member.studentId);
      const done = Boolean(real) || seededRandom(`${session.id}:${set.id}:${member.studentId}:done`) < baseRate;
      const minutes = real
        ? Math.max(1, Math.round(real.timeSpentSeconds / 60))
        : Math.max(1, Math.round(2 + seededRandom(`${session.id}:${set.id}:${member.studentId}:time`) * 7));
      return {
        ...member,
        done,
        minutes: done ? minutes : 0,
        completedAt: real?.completedAt ?? (done ? new Date(new Date(session.endAt).getTime() + (index + 1) * 6 * 60_000).toISOString() : "")
      };
    });
    const doneStudents = students.filter((student) => student.done);
    const rate = total ? (doneStudents.length / total) * 100 : 0;
    rows.push({
      id: set.id,
      kind: "interaction",
      title: set.title,
      phase: set.phase,
      detail: `${version?.items.length ?? 0} 题`,
      actionLabel: "完成",
      doneCount: doneStudents.length,
      total,
      rate,
      averageMinutes: doneStudents.length
        ? Math.round(doneStudents.reduce((sum, student) => sum + student.minutes, 0) / doneStudents.length)
        : 0,
      status: statusOf(rate),
      students
    });
  });

  materialEntries.forEach(({ material, phase }, index) => {
    const difficulty = seededRandom(`${session.id}:${material.id}:difficulty`);
    const profile = materialProfile(material);
    const baseRate = profile.rate - difficulty * 0.32;
    const sizeLabel = material.versions.find((version) => version.version === material.currentVersion)?.sizeLabel ?? "外链";
    const students: ClassContentStudent[] = roster.map((member) => {
      const done = seededRandom(`${session.id}:${material.id}:${member.studentId}:done`) < baseRate;
      const minutes = Math.max(
        profile.minMinutes,
        Math.round(profile.minMinutes + seededRandom(`${session.id}:${material.id}:${member.studentId}:time`) * (profile.maxMinutes - profile.minMinutes))
      );
      return {
        ...member,
        done,
        minutes: done ? minutes : 0,
        completedAt: done ? new Date(new Date(session.endAt).getTime() + (index + 1) * 5 * 60_000).toISOString() : ""
      };
    });
    const doneStudents = students.filter((student) => student.done);
    const rate = total ? (doneStudents.length / total) * 100 : 0;
    rows.push({
      id: material.id,
      kind: "material",
      title: material.title,
      phase,
      detail: `${(material.fileType || "file").toUpperCase()} · ${sizeLabel}`,
      actionLabel: profile.action,
      doneCount: doneStudents.length,
      total,
      rate,
      averageMinutes: doneStudents.length
        ? Math.round(doneStudents.reduce((sum, student) => sum + student.minutes, 0) / doneStudents.length)
        : 0,
      status: statusOf(rate),
      students
    });
  });

  // 展示顺序：课前 → 课中 → 课后；同一阶段里完成好的在前。
  const phaseRank: Record<Phase, number> = { preview: 0, live: 1, review: 2 };
  const sorted = [...rows].sort(
    (a, b) => phaseRank[a.phase] - phaseRank[b.phase] || b.rate - a.rate || a.title.localeCompare(b.title)
  );
  const allActions = rows.flatMap((row) => row.students.filter((student) => student.done));
  const reachedStudentIds = new Set(allActions.map((student) => student.studentId));

  return {
    rosterSize: total,
    rows: sorted,
    interactionCount: rows.filter((row) => row.kind === "interaction").length,
    materialCount: rows.filter((row) => row.kind === "material").length,
    reachedStudents: reachedStudentIds.size,
    totalActions: allActions.length,
    averageRate: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.rate, 0) / rows.length) : 0,
    averageMinutes: allActions.length
      ? Math.round(allActions.reduce((sum, student) => sum + student.minutes, 0) / allActions.length)
      : 0,
    totalMinutes: allActions.reduce((sum, student) => sum + student.minutes, 0),
    goodCount: rows.filter((row) => row.status === "good").length,
    weakCount: rows.filter((row) => row.status === "weak").length
  };
}
