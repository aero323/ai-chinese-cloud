import type { PlatformState, PlatformUser, SchoolMembership } from "../domain/types";

export function getAcademicMembership(state: PlatformState, userId: string): SchoolMembership | undefined {
  return state.schoolMemberships.find(
    (item) => item.userId === userId && item.role === "academic" && item.status === "active"
  );
}

export function getAcademicSchoolId(state: PlatformState, user?: PlatformUser) {
  const actor = user ?? state.users.find((item) => item.id === state.currentUserId);
  return actor ? getAcademicMembership(state, actor.id)?.schoolId ?? "" : "";
}

export function activeSchoolMemberIds(state: PlatformState, schoolId: string, role: SchoolMembership["role"]) {
  return new Set(
    state.schoolMemberships
      .filter((item) => item.schoolId === schoolId && item.role === role && item.status === "active")
      .map((item) => item.userId)
  );
}

export function teacherIdsForSchool(state: PlatformState, schoolId: string) {
  return activeSchoolMemberIds(state, schoolId, "teacher");
}

export function studentIdsForSchool(state: PlatformState, schoolId: string) {
  return activeSchoolMemberIds(state, schoolId, "student");
}

/**
 * 生成学校教务的只读数据视图。页面仍拿完整 store 执行操作，
 * 但所有业务列表只从该视图取数，避免跨校数据出现在界面结构里。
 */
export function workspaceState(state: PlatformState, academicSchoolId = ""): PlatformState {
  if (!academicSchoolId) return state;
  const classIds = new Set(state.classes.filter((item) => item.schoolId === academicSchoolId).map((item) => item.id));
  const sessionIds = new Set(state.sessions.filter((item) => item.schoolId === academicSchoolId || classIds.has(item.classId)).map((item) => item.id));
  const seriesIds = new Set(state.series.filter((item) => item.schoolId === academicSchoolId).map((item) => item.id));
  const studentIds = studentIdsForSchool(state, academicSchoolId);
  const teacherIds = teacherIdsForSchool(state, academicSchoolId);
  const assessmentIds = new Set(state.assessments.filter((item) => item.schoolId === academicSchoolId).map((item) => item.id));
  const visibleUserIds = new Set([
    state.currentUserId,
    ...studentIds,
    ...teacherIds,
    ...state.schoolMemberships
      .filter((item) => item.schoolId === academicSchoolId && item.role === "academic" && item.status === "active")
      .map((item) => item.userId),
    ...state.users.filter((item) => item.role === "operator").map((item) => item.id)
  ]);

  return {
    ...state,
    users: state.users.filter((item) => visibleUserIds.has(item.id)),
    schools: state.schools.filter((item) => item.id === academicSchoolId),
    schoolMemberships: state.schoolMemberships.filter((item) => item.schoolId === academicSchoolId),
    students: state.students.filter((item) => studentIds.has(item.userId)),
    classes: state.classes.filter((item) => classIds.has(item.id)),
    classEnrollments: state.classEnrollments.filter((item) => classIds.has(item.classId)),
    series: state.series.filter((item) => seriesIds.has(item.id)),
    sessions: state.sessions.filter((item) => sessionIds.has(item.id)),
    bookings: state.bookings.filter((item) => sessionIds.has(item.sessionId)),
    waitlist: state.waitlist.filter(
      (item) =>
        (item.sessionId && sessionIds.has(item.sessionId)) ||
        (item.sessionIds || []).some((sessionId) => sessionIds.has(sessionId))
    ),
    interactionAttempts: state.interactionAttempts.filter(
      (item) => item.sessionId && sessionIds.has(item.sessionId) && studentIds.has(item.studentId)
    ),
    gradePolicies: state.gradePolicies.filter(
      (item) => item.schoolId === null || item.schoolId === academicSchoolId
    ),
    assessments: state.assessments.filter((item) => assessmentIds.has(item.id)),
    assessmentScores: state.assessmentScores.filter((item) => assessmentIds.has(item.assessmentId)),
    notifications: state.notifications.filter((item) => item.userId === state.currentUserId),
    changeRequests: state.changeRequests.filter((item) => sessionIds.has(item.sessionId)),
    auditEvents: state.auditEvents.filter((item) => item.schoolId === academicSchoolId)
  };
}

export function stateForRole(state: PlatformState, user?: PlatformUser) {
  if ((user ?? state.users.find((item) => item.id === state.currentUserId))?.role !== "academic") return state;
  return workspaceState(state, getAcademicSchoolId(state, user));
}
