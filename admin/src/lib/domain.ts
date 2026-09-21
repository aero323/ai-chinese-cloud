import type {
  Booking,
  ClassSession,
  InteractionSet,
  InteractionVersion,
  Lesson,
  Phase,
  PlatformState,
  StudentProfile,
  WaitlistEntry
} from "../domain/types";

export function currentUser(state: PlatformState) {
  return state.users.find((user) => user.id === state.currentUserId) ?? state.users[0];
}

export function getUser(state: PlatformState, userId: string) {
  return state.users.find((user) => user.id === userId);
}

export function getStudent(state: PlatformState, studentId: string): StudentProfile | undefined {
  return state.students.find((item) => item.userId === studentId);
}

export function getLesson(state: PlatformState, lessonId: string): Lesson | undefined {
  return state.lessons.find((lesson) => lesson.id === lessonId);
}

export function getSession(state: PlatformState, sessionId: string) {
  return state.sessions.find((session) => session.id === sessionId);
}

export function getTeacherSessions(state: PlatformState, teacherId: string) {
  return state.sessions
    .filter((session) => session.teacherId === teacherId && session.status !== "cancelled")
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

export function getStudentBookings(state: PlatformState, studentId: string): Booking[] {
  return state.bookings
    .filter((booking) => booking.studentId === studentId && booking.status === "booked")
    .sort((a, b) => {
      const aSession = getSession(state, a.sessionId);
      const bSession = getSession(state, b.sessionId);
      return new Date(aSession?.startAt ?? 0).getTime() - new Date(bSession?.startAt ?? 0).getTime();
    });
}

export function getBookedCount(state: PlatformState, sessionId: string) {
  return state.bookings.filter((booking) => booking.sessionId === sessionId && booking.status === "booked").length;
}

export function getWaitlist(state: PlatformState, sessionId: string) {
  return state.waitlist
    .filter((entry) => entry.status === "waiting" && (entry.sessionId === sessionId || entry.sessionIds.includes(sessionId)))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function getStudentWaitlist(state: PlatformState, studentId: string): WaitlistEntry[] {
  return state.waitlist.filter((entry) => entry.studentId === studentId && entry.status === "waiting");
}

export function isSessionBooked(state: PlatformState, studentId: string, sessionId: string) {
  return state.bookings.some((booking) => booking.studentId === studentId && booking.sessionId === sessionId && booking.status === "booked");
}

export function isSessionWaitlisted(state: PlatformState, studentId: string, sessionId: string) {
  return state.waitlist.some((entry) => entry.studentId === studentId && entry.status === "waiting" && (entry.sessionId === sessionId || entry.sessionIds.includes(sessionId)));
}

export function fillRate(state: PlatformState, session: ClassSession) {
  if (!session.capacity) return 0;
  return (getBookedCount(state, session.id) / session.capacity) * 100;
}

export function sessionPhase(session: ClassSession, phase: Phase, now = Date.now()) {
  const start = new Date(session.startAt).getTime();
  const end = new Date(session.endAt).getTime();
  if (phase === "preview") return now < end;
  if (phase === "live") return now >= start - 10 * 60_000 && now <= end + 10 * 60_000;
  return now > end;
}

export function phaseAvailabilityLabel(session: ClassSession, phase: Phase, now = Date.now()) {
  if (sessionPhase(session, phase, now)) return "open";
  const start = new Date(session.startAt).getTime();
  const end = new Date(session.endAt).getTime();
  if (phase === "preview" && now >= end) return "ended";
  if (phase === "live" && now < start - 10 * 60_000) return "upcoming";
  if (phase === "review" && now <= end) return "upcoming";
  return "locked";
}

export function getCurrentInteractionVersion(state: PlatformState, set: InteractionSet): InteractionVersion | undefined {
  return state.interactionVersions.find((version) => version.id === set.currentVersionId) ??
    state.interactionVersions
      .filter((version) => version.setId === set.id)
      .sort((a, b) => b.version - a.version)[0];
}

/** 互动集是否作用于某个课次：未指定课次 = 该课节全部课次。 */
export function setAppliesToSession(set: InteractionSet, sessionId?: string | null) {
  if (!sessionId) return true;
  if (!set.sessionIds || set.sessionIds.length === 0) return true;
  return set.sessionIds.includes(sessionId);
}

export function setsForSession(state: PlatformState, session: ClassSession) {
  return state.interactionSets
    .filter((set) => set.lessonId === session.lessonId && setAppliesToSession(set, session.id))
    .sort((a, b) => a.order - b.order);
}

export function lessonContent(state: PlatformState, lessonId: string, phase?: Phase, sessionId?: string | null) {
  const sets = state.interactionSets
    .filter((set) => set.lessonId === lessonId && (!phase || set.phase === phase) && setAppliesToSession(set, sessionId))
    .sort((a, b) => a.order - b.order);
  const refs = state.materialRefs
    .filter((ref) => ref.lessonId === lessonId && ref.published && (!phase || ref.phase === phase))
    .sort((a, b) => a.order - b.order);
  return {
    sets,
    materials: refs
      .map((ref) => state.materials.find((material) => material.id === ref.materialId))
      .filter((material) => material && material.status === "published")
  };
}

export function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function teacherMetrics(state: PlatformState, teacherId: string) {
  const sessions = getTeacherSessions(state, teacherId);
  const active = sessions.filter((session) => session.status === "published");
  const booked = active.reduce((sum, session) => sum + getBookedCount(state, session.id), 0);
  const capacity = active.reduce((sum, session) => sum + session.capacity, 0);
  const setIds = new Set(
    active
      .map((session) => getLesson(state, session.lessonId))
      .filter(Boolean)
      .flatMap((lesson) => state.interactionSets.filter((set) => set.lessonId === lesson!.id).map((set) => set.id))
  );
  const attempts = state.interactionAttempts.filter((attempt) => setIds.has(attempt.setId));
  return {
    sessions,
    upcoming: active.filter((session) => new Date(session.endAt).getTime() > Date.now()),
    booked,
    capacity,
    fillRate: capacity ? (booked / capacity) * 100 : 0,
    averageScore: average(attempts.map((attempt) => attempt.score)),
    completionRate: setIds.size ? Math.min(100, (attempts.length / Math.max(1, booked * setIds.size)) * 100) : 0
  };
}

export function operatorMetrics(state: PlatformState) {
  const published = state.sessions.filter((session) => session.status === "published");
  const capacity = published.reduce((sum, session) => sum + session.capacity, 0);
  const booked = published.reduce((sum, session) => sum + getBookedCount(state, session.id), 0);
  const activeWaitlist = state.waitlist.filter((entry) => entry.status === "waiting");
  const today = published.filter((session) => new Date(session.startAt).toDateString() === new Date().toDateString());
  return {
    published,
    capacity,
    booked,
    fillRate: capacity ? (booked / capacity) * 100 : 0,
    waitlist: activeWaitlist,
    today,
    students: state.students.length,
    averageDownload: average(state.materials.map((material) => material.downloadCount))
  };
}

export function studentMetrics(state: PlatformState, studentId: string) {
  const bookings = getStudentBookings(state, studentId);
  const sessions = bookings.map((booking) => getSession(state, booking.sessionId)).filter(Boolean) as ClassSession[];
  const attempts = state.interactionAttempts.filter((attempt) => attempt.studentId === studentId);
  const completedSetIds = new Set(attempts.map((attempt) => attempt.setId));
  const upcoming = sessions
    .filter((session) => new Date(session.endAt).getTime() >= Date.now())
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const past = sessions
    .filter((session) => new Date(session.endAt).getTime() < Date.now())
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
  return {
    bookings,
    sessions,
    upcoming,
    past,
    attempts,
    completedSetIds,
    averageScore: average(attempts.map((attempt) => attempt.score)),
    totalStudyMinutes: Math.round(attempts.reduce((sum, attempt) => sum + attempt.timeSpentSeconds, 0) / 60)
  };
}
