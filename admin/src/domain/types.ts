export type Role = "student" | "teacher" | "operator";
export type Phase = "preview" | "live" | "review";
export type SessionStatus = "published" | "cancelled" | "draft";
export type BookingStatus = "booked" | "cancelled";
export type WaitlistStatus = "waiting" | "promoted" | "cancelled";
export type InteractionType =
  | "match"
  | "memory"
  | "choice"
  | "order"
  | "fill"
  | "poll"
  | "picture"
  | "picture-match"
  | "situation"
  | "dialogue"
  | "pinyin-match"
  | "category"
  | "word-build"
  | "correction"
  | "listening"
  | "read-aloud"
  | "picture-talk"
  | "open-qa";

/** 语音题型（跟读 / 看图说话 / 开放问答）共用的评分项。 */
export interface InteractionScoreItem {
  id: string;
  label: string;
  stars: number;
}
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

/** 图槽：image 有值时显示真图，为空时显示 emoji；alt 同时作为无障碍文案。 */
export interface InteractionMedia {
  icon: string;
  image: string;
  alt: string;
}

export interface InteractionPair {
  id: string;
  left: string;
  right: string;
  /** 图片—词语连线：左列的图槽；有值时左列显示图片，left 作为图片说明。 */
  media?: InteractionMedia;
  /** 图片—词语连线：右列词语的拼音。 */
  rightPinyin?: string;
}

export interface InteractionChoice {
  id: string;
  text: string;
  isCorrect?: boolean;
  /** 看图单选：选项拼音；情景选择：这个说法的点评。 */
  hint?: string;
}

export interface InteractionCategoryGroup {
  id: string;
  name: string;
  hint?: string;
}

export interface InteractionCategoryWord {
  id: string;
  text: string;
  pinyin?: string;
  /** 这个词正确归属的类别 id。 */
  group: string;
}

export interface InteractionBadWord {
  id: string;
  text: string;
  pinyin?: string;
  /** 用错的词，学生要把它点出来。 */
  wrong?: boolean;
}

export interface InteractionPinyinGroup {
  id: string;
  pinyin: string;
  word: string;
  meaning: string;
  wordOptions: string[];
  meaningOptions: string[];
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
  /** 看图单选 / 情景选择：题干图槽。 */
  media?: InteractionMedia;
  /** 看图单选：题干拼音。 */
  promptPinyin?: string;
  /** 情景选择：场景中文描述。 */
  scene?: string;
  /** 情景选择：场景印尼语翻译。 */
  sceneTranslation?: string;
  /** 对话补全：对方说的上一句。 */
  dialogueThem?: string;
  /** 对话补全：我的气泡在作答前的提示文字。 */
  dialoguePlaceholder?: string;

  /* ---- 第三批新题型（与学生学习端同名页面字段保持一致） ---- */

  /** 分类归组：类别。 */
  groups?: InteractionCategoryGroup[];
  /** 分类归组：待归类的词，group 指向 groups[].id。 */
  words?: InteractionCategoryWord[];

  /** 拼字 / 组词：正确答案（按字拆分，支持重复字）。 */
  answer?: string[];
  /** 拼字 / 组词：答案词语。 */
  answerWord?: string;
  /** 拼字 / 组词：答案拼音。 */
  answerPinyin?: string;
  /** 拼字 / 组词：字块池；留空时按答案自动生成。 */
  tileBank?: string[];
  /** 拼字 / 组词：提示词（词语意思，通常是印尼语）。 */
  meaning?: string;

  /** 找错误 / 改错：句子切分后的词块，wrong 标出用错的词。 */
  badWords?: InteractionBadWord[];
  /** 找错误 / 改错：正确的词。 */
  fixText?: string;
  /** 找错误 / 改错：改好的整句。 */
  fixedSentence?: string;
  /** 找错误 / 改错：整句拼音。 */
  fixedPinyin?: string;

  /** 听音选图 / 选词：音频地址，留空时按占位播放。 */
  audioSrc?: string;
  /** 听音选图 / 选词：会读出来的内容，也是答案文本。 */
  audioText?: string;
  /** 听音选图 / 选词：答案拼音。 */
  audioPinyin?: string;

  /** 拼音—汉字—含义匹配：一组一轮，逐组作答。 */
  pinyinGroups?: InteractionPinyinGroup[];

  /** 看图说话：图片说明（印尼语含义）。 */
  mediaTranslation?: string;
  /** 语音题型：参考回答 / 范文，答题后展示。 */
  sampleAnswer?: string;
  /** 语音题型：参考回答拼音。 */
  sampleAnswerPinyin?: string;
  /** 语音题型：回答模板，用 ______ 表示要替换的部分。 */
  samplePattern?: string;
  /** 语音题型：思考提示（例：谁 ＋ 在做什么）。 */
  speakingHint?: string;
  /** 语音题型：提示词，学生可以选着用。 */
  speakingWords?: Array<{ id: string; text: string; pinyin?: string }>;
  /** 语音题型：占位评分项。 */
  scores?: InteractionScoreItem[];
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
  /** 为空 = 作用于该课节的所有课次；否则只在列出的课次出现。 */
  sessionIds?: string[];
}

export type InteractionTemplateLevel = "beginner" | "intermediate" | "advanced";

export interface InteractionTemplate {
  id: string;
  type: InteractionType;
  title: string;
  summary: string;
  topic: string;
  topicId: string;
  level: InteractionTemplateLevel;
  language: string;
  tags: string[];
  item: InteractionItem;
}

export interface InteractionTemplateSummary {
  total: number;
  byType: Record<string, number>;
  byTopic: Record<string, number>;
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

export type ChangeRequestKind = "reschedule" | "add_session" | "new_lesson_plan" | "teacher_swap" | "cancel";

export interface ChangeRequest {
  id: string;
  sessionId: string;
  teacherId: string;
  kind: ChangeRequestKind;
  reason: string;
  status: "pending" | "handled" | "rejected";
  createdAt: string;
  handledAt?: string;
  handledBy?: string;
  resolutionNote?: string;
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
  interactionTemplates: InteractionTemplate[];
  interactionAttempts: InteractionAttempt[];
  materials: Material[];
  materialRefs: LessonMaterialRef[];
  notifications: NotificationItem[];
  changeRequests: ChangeRequest[];
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
  assignInteractionSessions(input: { setId: string; sessionIds: string[]; actorId?: string }): StoreResult<InteractionSet>;
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
  requestSessionChange(input: { sessionId: string; kind: ChangeRequestKind; reason: string; actorId?: string }): StoreResult<ChangeRequest>;
  resolveChangeRequest(input: { requestId: string; status?: "handled" | "rejected"; resolutionNote?: string; actorId?: string }): StoreResult<ChangeRequest>;
  markNotificationRead(notificationId: string): StoreResult<NotificationItem>;
  markAllNotificationsRead(userId: string): StoreResult<boolean>;
}

declare global {
  interface Window {
    AICloudPlatformStore: PlatformStoreApi;
  }
}
