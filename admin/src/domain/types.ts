export type Role = "student" | "teacher" | "operator";
export type Phase = "preview" | "live" | "review";
export type SessionStatus = "published" | "cancelled" | "draft";
export type BookingStatus = "booked" | "cancelled";
export type WaitlistStatus = "waiting" | "promoted" | "cancelled";
export type InteractionType = "match" | "memory" | "choice" | "order" | "fill" | "poll";

export interface PlatformUser {
  id: string;
  role: Role;
  name: string;
  nameZh?: string;
  phone?: string;
  avatar: string;
  timeZone: string;
  locale: string;
  status: "active" | "paused";
  specialties?: string[];
  experienceYears?: number;
  bio?: string;
  title?: string;
}

export interface StudentProfile {
  userId: string;
  program: string;
  level: string;
  learningGoal: string;
  preferredTeacherId: string;
  preferredTimeZone: string;
  joinedAt: string;
  tags: string[];
  notes: string;
}

export interface CourseFolder {
  id: string;
  parentId: string | null;
  name: string;
  order: number;
  color: string;
  description: string;
}

export interface Lesson {
  id: string;
  folderId: string;
  title: string;
  subtitle: string;
  description: string;
  durationMinutes: number;
  tags: string[];
  color: string;
  coverEmoji: string;
  status: "published" | "draft";
}

export interface ClassSeries {
  id: string;
  lessonId: string;
  title: string;
  description: string;
  teacherId: string;
  capacity: number;
  durationMinutes: number;
  sessionIds: string[];
  weekdays: number[];
  status: SessionStatus;
  createdAt: string;
}

export interface ClassSession {
  id: string;
  lessonId: string;
  seriesId: string | null;
  teacherId: string;
  title: string;
  startAt: string;
  endAt: string;
  capacity: number;
  status: SessionStatus;
  bookingCloseAt: string;
  cancelCloseAt: string;
  language: string;
  roomLabel: string;
  source: "single" | "series";
  cancelledAt?: string;
  cancelReason?: string;
}

export interface Booking {
  id: string;
  sessionId: string;
  studentId: string;
  status: BookingStatus;
  source: "student" | "operator" | "waitlist";
  createdAt: string;
  enrollmentId: string | null;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
}

export interface WaitlistEntry {
  id: string;
  sessionId: string | null;
  sessionIds: string[];
  seriesId: string | null;
  studentId: string;
  status: WaitlistStatus;
  createdAt: string;
  enrollmentId: string | null;
  promotedAt?: string;
  cancelledAt?: string;
}

export interface InteractionPair {
  id: string;
  left: string;
  right: string;
}

export interface InteractionChoice {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface InteractionItem {
  id: string;
  type: InteractionType;
  prompt: string;
  explanation: string;
  multiple?: boolean;
  choices?: InteractionChoice[];
  pairs?: InteractionPair[];
  orderItems?: Array<{ id: string; text: string }>;
  correctOrder?: string[];
  sentence?: string;
  blanks?: Array<{ id: string; answers: string[] }>;
  pollOptions?: Array<{ id: string; text: string }>;
}

export interface InteractionSet {
  id: string;
  lessonId: string;
  title: string;
  description: string;
  phase: Phase;
  status: "draft" | "published";
  currentVersionId: string;
  order: number;
  updatedAt: string;
}

export interface InteractionVersion {
  id: string;
  setId: string;
  version: number;
  status: "published" | "archived";
  publishedAt: string;
  publishedBy: string;
  publishNote: string;
  items: InteractionItem[];
}

export interface InteractionAttempt {
  id: string;
  setId: string;
  versionId: string;
  studentId: string;
  sessionId: string | null;
  phase: Phase;
  score: number;
  bestScore: number;
  attempt: number;
  timeSpentSeconds: number;
  completedAt: string;
  answers: Record<string, unknown>;
  wrongItemIds: string[];
  pollAnswers: Record<string, string>;
}

export interface MaterialVersion {
  version: number;
  fileName: string;
  sizeLabel: string;
  url: string;
  publishedAt: string;
}

export interface Material {
  id: string;
  title: string;
  description: string;
  kind: "file" | "link" | "courseware";
  fileType: string;
  language: string;
  ownerId: string;
  status: "published" | "unpublished";
  currentVersion: number;
  downloadCount: number;
  createdAt: string;
  versions: MaterialVersion[];
  externalUrl?: string;
}

export interface LessonMaterialRef {
  id: string;
  materialId: string;
  lessonId: string;
  phase: Phase;
  order: number;
  published: boolean;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  link: string;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  reason: string;
  createdAt: string;
}

export interface PlatformState {
  version: 2;
  generatedAt: string;
  currentUserId: string;
  ui: {
    language: "zh-CN" | "id-ID";
    timeZone: string;
    sidebarCollapsed: boolean;
  };
  users: PlatformUser[];
  students: StudentProfile[];
  folders: CourseFolder[];
  lessons: Lesson[];
  series: ClassSeries[];
  sessions: ClassSession[];
  bookings: Booking[];
  waitlist: WaitlistEntry[];
  interactionSets: InteractionSet[];
  interactionVersions: InteractionVersion[];
  interactionAttempts: InteractionAttempt[];
  materials: Material[];
  materialRefs: LessonMaterialRef[];
  notifications: NotificationItem[];
  auditEvents: AuditEvent[];
}

export interface StoreResult<T = unknown> {
  ok: boolean;
  data: T | null;
  error: string;
  code: string;
}

export interface PlatformStoreApi {
  STORE_KEY: string;
  LEGACY_KEY: string;
  CHANGE_EVENT: string;
  getState(): PlatformState;
  subscribe(listener: (state: PlatformState) => void): () => void;
  resetDemo(): StoreResult<PlatformState>;
  setCurrentUser(userId: string): StoreResult<PlatformUser>;
  updatePreferences(patch: { language?: "zh-CN" | "id-ID"; timeZone?: string; sidebarCollapsed?: boolean }): StoreResult<PlatformState["ui"]>;
  bookSession(input: { studentId: string; sessionId: string; force?: boolean; reason?: string; source?: string; actorId?: string }): StoreResult<Booking>;
  joinWaitlist(input: { studentId: string; sessionId: string; seriesId?: string | null; sessionIds?: string[] }): StoreResult<WaitlistEntry>;
  leaveWaitlist(input: { waitlistId: string; actorId?: string; reason?: string }): StoreResult<WaitlistEntry>;
  cancelBooking(input: { bookingId: string; actorId?: string; force?: boolean; reason?: string }): StoreResult<Booking[]>;
  enrollSeries(input: { studentId: string; seriesId: string; joinAsWaitlist?: boolean; force?: boolean; reason?: string; actorId?: string }): StoreResult<Booking[] | WaitlistEntry>;
  createSession(input: Partial<ClassSession> & { title: string; lessonId: string; teacherId: string; startAt: string; endAt: string; capacity: number; actorId?: string; reason?: string }): StoreResult<ClassSession>;
  createSeries(input: { title: string; description?: string; lessonId: string; teacherId: string; startAt: string; sessionCount: number; intervalWeeks: number; durationMinutes: number; capacity: number; roomLabel?: string; actorId?: string; reason?: string }): StoreResult<ClassSeries>;
  updateSession(input: { sessionId: string; patch: Partial<ClassSession>; actorId?: string; reason?: string }): StoreResult<ClassSession>;
  cancelSession(input: { sessionId: string; actorId: string; reason: string }): StoreResult<ClassSession>;
  saveInteractionSet(input: Partial<InteractionSet> & { setId?: string; lessonId: string; title: string; description: string; phase: Phase; items: InteractionItem[]; actorId?: string; publishNote?: string }): StoreResult<{ set: InteractionSet; version: InteractionVersion }>;
  rollbackInteractionVersion(input: { setId: string; versionId: string; actorId?: string }): StoreResult<{ set: InteractionSet; version: InteractionVersion }>;
  createFolder(input: { parentId?: string; name: string; description?: string; color?: string; actorId?: string }): StoreResult<CourseFolder>;
  createLesson(input: { folderId: string; title: string; subtitle?: string; description?: string; durationMinutes?: number; tags?: string[]; color?: string; coverEmoji?: string; actorId?: string }): StoreResult<Lesson>;
  createStudent(input: { name: string; phone?: string; timeZone?: string; locale?: string; program?: string; level?: string; learningGoal?: string; preferredTeacherId?: string; actorId?: string }): StoreResult<{ user: PlatformUser; profile: StudentProfile }>;
  addMockMaterial(input: { title: string; description: string; fileType?: string; language?: string; ownerId?: string; phase?: Phase; lessonId?: string; fileName?: string; sizeLabel?: string }): StoreResult<Material>;
  attachMaterial(input: { materialId: string; lessonId: string; phase: Phase; order?: number; actorId?: string }): StoreResult<Material>;
  addMaterialVersion(input: { materialId: string; fileName: string; sizeLabel: string; actorId?: string }): StoreResult<Material>;
  setMaterialStatus(input: { materialId: string; status: "published" | "unpublished"; actorId?: string; reason?: string }): StoreResult<Material>;
  trackDownload(materialId: string): StoreResult<Material>;
  recordAttempt(input: { setId: string; studentId: string; sessionId?: string | null; phase: Phase; answers: Record<string, unknown>; score: number; timeSpentSeconds: number; wrongItemIds?: string[]; pollAnswers?: Record<string, string> }): StoreResult<InteractionAttempt>;
  updateStudent(input: { studentId: string; patch: Partial<PlatformUser & StudentProfile>; actorId?: string; reason?: string }): StoreResult<{ user: PlatformUser; profile: StudentProfile }>;
  markNotificationRead(notificationId: string): StoreResult<NotificationItem>;
  markAllNotificationsRead(userId: string): StoreResult<boolean>;
}

declare global {
  interface Window {
    AICloudPlatformStore: PlatformStoreApi;
  }
}
