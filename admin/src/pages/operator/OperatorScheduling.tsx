import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarClock, CalendarPlus, GraduationCap, Inbox, Layers3, Plus, Search, UsersRound, WandSparkles } from "lucide-react";
import { platform } from "../../lib/platform";
import { usePlatformStore } from "../../store/usePlatformStore";
import { currentUser, fillRate, getBookedCount, getLesson, getSession, getWaitlist } from "../../lib/domain";
import { getAcademicSchoolId, workspaceState } from "../../lib/academicScope";
import { formatDateTime, inputDateTime } from "../../lib/format";
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, ProgressBar, Select, Tabs, TextInput } from "../../components/ui";
import { ClassSessionCard } from "../../components/ClassSessionCard";
import { SeriesSessionDots } from "../../components/SeriesSessionDots";
import type { ClassSession } from "../../domain/types";

type ScheduleTab = "sessions" | "series";
type CreateMode = "single" | "series" | null;

/** 按首节课时间与课节间隔预排每一节的日期时间；只做预填，创建前可以逐节调整。 */
function buildAutoSchedule(lessonIds: string[], startAt: string, intervalWeeks: number) {
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) return {};
  const interval = Math.max(1, Number(intervalWeeks) || 1);
  return lessonIds.reduce<Record<string, string>>((acc, lessonId, index) => {
    const slot = new Date(start.getTime());
    slot.setDate(slot.getDate() + index * 7 * interval);
    acc[lessonId] = inputDateTime(slot);
    return acc;
  }, {});
}

/** 重新自动预排时保留人工改过的课次时间，避免调整全局参数把手工修改冲掉。 */
function mergeAutoSchedule(
  lessonIds: string[],
  startAt: string,
  intervalWeeks: number,
  current: Record<string, string>,
  manualIds: string[]
) {
  const autoSchedule = buildAutoSchedule(lessonIds, startAt, intervalWeeks);
  return lessonIds.reduce<Record<string, string>>((acc, lessonId) => {
    acc[lessonId] = manualIds.includes(lessonId) && current[lessonId] ? current[lessonId] : autoSchedule[lessonId];
    return acc;
  }, {});
}

export function OperatorScheduling({
  academic = false,
  basePath = "/operator"
}: {
  academic?: boolean;
  basePath?: string;
} = {}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state: rawState, run } = usePlatformStore();
  const user = currentUser(rawState);
  const state = useMemo(() => (academic ? workspaceState(rawState, getAcademicSchoolId(rawState, user)) : rawState), [academic, rawState, user]);
  const [tab, setTab] = useState<ScheduleTab>("sessions");
  const [query, setQuery] = useState("");
  const [createMode, setCreateMode] = useState<CreateMode>(null);
  const [scheduleSeriesId, setScheduleSeriesId] = useState<string | null>(null);
  const [seriesTimes, setSeriesTimes] = useState<Record<string, string>>({});
  const defaultStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
  defaultStart.setMinutes(0, 0, 0);
  const [form, setForm] = useState({
    title: "",
    schoolId: academic ? getAcademicSchoolId(rawState, user) : state.schools.find((item) => item.status === "active")?.id ?? "",
    classId: state.classes.find((item) => item.status === "active")?.id ?? "__new",
    className: "",
    lessonId: state.lessons[0]?.id ?? "",
    folderId: state.lessons[0]?.folderId ?? state.folders[0]?.id ?? "",
    lessonIds: [] as string[],
    sessionSchedule: {} as Record<string, string>,
    manualScheduleIds: [] as string[],
    teacherId: state.users.find((item) => item.role === "teacher")?.id ?? "",
    startAt: inputDateTime(defaultStart),
    durationMinutes: 40,
    capacity: 30,
    intervalWeeks: 1,
    roomLabel: "大班教室 A",
    description: ""
  });

  const requestKindLabels: Record<string, string> = {
    reschedule: "申请改期",
    add_session: "申请加课",
    new_lesson_plan: "申请新增课节",
    teacher_swap: "申请更换授课老师",
    cancel: "申请取消课次"
  };
  const pendingRequests = state.changeRequests.filter((request) => request.status === "pending");

  const sessions = state.sessions
    .filter((session) => !query || session.title.toLowerCase().includes(query.toLowerCase()) || session.className.toLowerCase().includes(query.toLowerCase()) || getLesson(state, session.lessonId)?.title.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const themeFolders = state.folders.filter(
    (folder) =>
      state.lessons.filter((lesson) => lesson.folderId === folder.id && lesson.status === "published").length >= 2
  );
  const themeLessons = state.lessons.filter(
    (lesson) => lesson.folderId === form.folderId && lesson.status === "published"
  );

  function openCreate(mode: Exclude<CreateMode, null>) {
    if (mode === "series") {
      const folderId = themeFolders.some((folder) => folder.id === form.folderId)
        ? form.folderId
        : themeFolders[0]?.id ?? "";
      const defaultLessonIds = state.lessons
        .filter((lesson) => lesson.folderId === folderId && lesson.status === "published")
        .slice(0, 2)
        .map((lesson) => lesson.id);
      setForm((value) => ({
        ...value,
        folderId,
        lessonIds: defaultLessonIds,
        sessionSchedule: buildAutoSchedule(defaultLessonIds, value.startAt, value.intervalWeeks),
        manualScheduleIds: []
      }));
    }
    setCreateMode(mode);
  }

  function chooseTheme(folderId: string) {
    setForm((value) => ({ ...value, folderId, lessonIds: [], sessionSchedule: {}, manualScheduleIds: [] }));
  }

  function toggleSeriesLesson(lessonId: string) {
    setForm((value) => {
      const orderedIds = state.lessons
        .filter((lesson) => lesson.folderId === value.folderId && lesson.status === "published")
        .map((lesson) => lesson.id);
      const lessonIds = value.lessonIds.includes(lessonId)
        ? value.lessonIds.filter((id) => id !== lessonId)
        : orderedIds.filter((id) => value.lessonIds.includes(id) || id === lessonId);
      const autoSchedule = buildAutoSchedule(lessonIds, value.startAt, value.intervalWeeks);
      return {
        ...value,
        lessonIds,
        sessionSchedule: lessonIds.reduce<Record<string, string>>((acc, id) => {
          acc[id] = value.sessionSchedule[id] || autoSchedule[id];
          return acc;
        }, {}),
        manualScheduleIds: value.manualScheduleIds.filter((id) => lessonIds.includes(id))
      };
    });
  }

  function changeStartAt(startAt: string) {
    setForm((value) => ({
      ...value,
      startAt,
      ...(createMode === "series"
        ? {
            sessionSchedule: mergeAutoSchedule(
              value.lessonIds,
              startAt,
              value.intervalWeeks,
              value.sessionSchedule,
              value.manualScheduleIds
            )
          }
        : {})
    }));
  }

  function changeIntervalWeeks(intervalWeeks: number) {
    setForm((value) => ({
      ...value,
      intervalWeeks,
      sessionSchedule: mergeAutoSchedule(
        value.lessonIds,
        value.startAt,
        intervalWeeks,
        value.sessionSchedule,
        value.manualScheduleIds
      )
    }));
  }

  function applyAutoSchedule() {
    setForm((value) => ({
      ...value,
      sessionSchedule: buildAutoSchedule(value.lessonIds, value.startAt, value.intervalWeeks),
      manualScheduleIds: []
    }));
  }

  function updateSessionTime(lessonId: string, startAt: string) {
    setForm((value) => ({
      ...value,
      sessionSchedule: { ...value.sessionSchedule, [lessonId]: startAt },
      manualScheduleIds: value.manualScheduleIds.includes(lessonId)
        ? value.manualScheduleIds
        : [...value.manualScheduleIds, lessonId]
    }));
  }

  function create() {
    const start = new Date(form.startAt);
    const end = new Date(start.getTime() + Number(form.durationMinutes) * 60_000);
    if (createMode === "single") {
      const result = run(
        () =>
          platform.createSession({
            schoolId: form.schoolId,
            title: form.title || `${getLesson(state, form.lessonId)?.title} · 大班课`,
            lessonId: form.lessonId,
            teacherId: form.teacherId,
            classId: form.classId === "__new" ? undefined : form.classId,
            className: form.classId === "__new" ? (form.className.trim() || "待分配班级") : undefined,
            startAt: start.toISOString(),
            endAt: end.toISOString(),
            capacity: Number(form.capacity),
            bookingCloseAt: new Date(start.getTime() - 30 * 60_000).toISOString(),
            cancelCloseAt: new Date(start.getTime() - 2 * 60 * 60_000).toISOString(),
            roomLabel: form.roomLabel,
            actorId: user.id
          }),
        t("operator.sessionCreated")
      );
      if (result.ok) setCreateMode(null);
    } else {
      if (form.lessonIds.length < 2) return;
      if (form.lessonIds.some((lessonId) => !form.sessionSchedule[lessonId])) return;
      const sessionSchedule = form.lessonIds.map((lessonId) => ({
        lessonId,
        startAt: new Date(form.sessionSchedule[lessonId]).toISOString()
      }));
      const themeName = state.folders.find((folder) => folder.id === form.folderId)?.name ?? "系列";
      const result = run(
        () =>
          platform.createSeries({
            schoolId: form.schoolId,
            title: form.title || `${themeName} · 系列班`,
            classId: form.classId === "__new" ? undefined : form.classId,
            className: form.classId === "__new" ? (form.className.trim() || "待分配班级") : undefined,
            folderId: form.folderId,
            lessonIds: form.lessonIds,
            sessionSchedule,
            teacherId: form.teacherId,
            startAt: start.toISOString(),
            intervalWeeks: Number(form.intervalWeeks),
            durationMinutes: Number(form.durationMinutes),
            capacity: Number(form.capacity),
            roomLabel: form.roomLabel,
            description: form.description,
            actorId: user.id
          }),
        t("operator.seriesCreated")
      );
      if (result.ok) setCreateMode(null);
    }
  }

  const scheduleSeries = state.series.find((item) => item.id === scheduleSeriesId);

  /** 打开某系列班的时间配置：先把每个课次的当前时间填进表单。 */
  function openSeriesSchedule(seriesId: string) {
    const target = state.series.find((item) => item.id === seriesId);
    if (!target) return;
    const times: Record<string, string> = {};
    target.sessionIds.forEach((sessionId) => {
      const session = getSession(state, sessionId);
      if (session) times[sessionId] = inputDateTime(session.startAt);
    });
    setSeriesTimes(times);
    setScheduleSeriesId(seriesId);
  }

  /** 以第 1 课的时间为基准，按每周一节重排后续课次。 */
  function spreadSeriesTimes() {
    setSeriesTimes((value) => {
      const firstValue = scheduleSeries?.sessionIds.map((sessionId) => value[sessionId]).find(Boolean);
      const first = new Date(firstValue ?? "");
      if (Number.isNaN(first.getTime()) || !scheduleSeries) return value;
      const next = { ...value };
      scheduleSeries.sessionIds.forEach((sessionId, index) => {
        const slot = new Date(first.getTime());
        slot.setDate(slot.getDate() + index * 7);
        next[sessionId] = inputDateTime(slot);
      });
      return next;
    });
  }

  function saveSeriesSchedule() {
    if (!scheduleSeries) return;
    const entries = scheduleSeries.sessionIds
      .map((sessionId) => ({ sessionId, value: seriesTimes[sessionId] }))
      .filter((item) => Boolean(item.value));
    if (!entries.length) return;
    if (entries.some((item) => Number.isNaN(new Date(item.value).getTime()))) return;
    const result = run(
      () =>
        platform.updateSeriesSchedule({
          seriesId: scheduleSeries.id,
          schedule: entries.map((item) => ({ sessionId: item.sessionId, startAt: new Date(item.value).toISOString() })),
          actorId: user.id,
          reason: academic ? "学校教务调整本校系列班课次时间" : "教学管理调整系列班课次时间"
        }),
      "系列班课次时间已更新"
    );
    if (result.ok) setScheduleSeriesId(null);
  }

  return (
    <>
      {pendingRequests.length > 0 && (
        <Card className="teacher-request-panel">
          <div className="card-heading">
            <div>
              <span className="eyebrow">Teacher requests</span>
              <h2>教师申请（{pendingRequests.length}）</h2>
              <p>{academic ? "排课、容量与名单由学校教务维护" : "排课、容量与名单由教学管理维护"}；老师只能提交申请，处理结果会通知对方。</p>
            </div>
            <Inbox size={20} />
          </div>
          <div className="teacher-request-list">
            {pendingRequests.map((request) => {
              const session = getSession(state, request.sessionId);
              const teacher = state.users.find((item) => item.id === request.teacherId);
              return (
                <article key={request.id}>
                  <div>
                    <strong>{session?.title ?? "课次已删除"}</strong>
                    <small>
                      {teacher?.name} · {requestKindLabels[request.kind]} · {formatDateTime(request.createdAt, state.ui.timeZone, state.ui.language)}
                      {session ? ` · 原时间 ${formatDateTime(session.startAt, state.ui.timeZone, state.ui.language)}` : ""}
                    </small>
                    <p>{request.reason}</p>
                  </div>
                  <div className="teacher-request-actions">
                    <Button size="sm" variant="secondary" onClick={() => session && navigate(`${basePath}/sessions/${session.id}`)}>查看课次</Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => run(() => platform.resolveChangeRequest({ requestId: request.id, status: "rejected", resolutionNote: "教学管理已沟通，暂不调整排课。", actorId: user.id }), "已驳回申请")}
                    >
                      驳回
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => run(() => platform.resolveChangeRequest({ requestId: request.id, status: "handled", resolutionNote: "教学管理已调整排课，请查看最新课表。", actorId: user.id }), "已处理申请")}
                    >
                      标记已处理
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </Card>
      )}

      <PageHeader
        eyebrow="Scheduling"
        title={t("operator.sessionTitle")}
        description={academic ? "学校教务统一维护本校班次时间、教师、容量、预约与取消截止时间。" : "教学管理统一维护班次时间、教师、容量、预约与取消截止时间。"}
        actions={
          <>
            <Button variant="secondary" onClick={() => openCreate("series")}><Layers3 size={17} /> {t("operator.newSeries")}</Button>
            <Button onClick={() => openCreate("single")}><CalendarPlus size={17} /> {t("operator.newSession")}</Button>
          </>
        }
      />

      <Card className="content-filter-bar">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "sessions", label: "单次班次", count: sessions.filter((session) => session.source === "single").length },
            { value: "series", label: "系列班", count: state.series.length }
          ]}
        />
        <div className="search-box">
          <Search size={17} />
          <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索班次或课节" />
        </div>
      </Card>

      {tab === "sessions" && (
        <div className="session-list">
          {sessions.filter((session) => session.source === "single").map((session) => (
            <ClassSessionCard
              key={session.id}
              state={state}
              session={session}
              actions={
                <>
                  <Button variant="ghost" onClick={() => navigate(`${basePath}/sessions/${session.id}`)}>名单与候补</Button>
                  <Button variant="secondary" onClick={() => navigate(`${basePath}/sessions/${session.id}`)}>管理班次</Button>
                </>
              }
            />
          ))}
          {sessions.length === 0 && <EmptyState title="暂无匹配班次" />}
        </div>
      )}

      {tab === "series" && (
        <div className="series-grid">
          {state.series.map((series) => {
            const seriesSessions = series.sessionIds
              .map((id) => getSession(state, id))
              .filter((session): session is ClassSession => Boolean(session));
            const lesson = getLesson(state, series.lessonId);
            const enrolled = seriesSessions.reduce((sum, session) => sum + (session ? getBookedCount(state, session.id) : 0), 0);
            const firstSession = [...seriesSessions].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];
            return (
              <Card className="operator-series-card" key={series.id}>
                <div className="series-cover" style={{ background: `linear-gradient(145deg, ${lesson?.color}, #eef0ff)` }}>
                  <span>{lesson?.coverEmoji}</span>
                  <Badge tone="purple">{series.lessonIds.length} 个课节 · {series.sessionIds.length} 次课</Badge>
                </div>
                <div className="series-body">
                  <h2>{series.title}</h2>
                  <p>{series.description}</p>
                  <p className="series-lesson-chain">
                    {series.lessonIds.map((lessonId) => getLesson(state, lessonId)?.title).filter(Boolean).join(" → ")}
                  </p>
                  <div className="series-meta">
                    <span><GraduationCap size={16} /> {seriesSessions[0]?.className ?? "待分配班级"}</span>
                    <span><Layers3 size={16} /> 每 {series.durationMinutes} 分钟</span>
                    <span><UsersRound size={16} /> {series.capacity} 人容量</span>
                  </div>
                  <SeriesSessionDots
                    sessions={seriesSessions}
                    renderSession={(session) => (
                      <button key={session.id} onClick={() => navigate(`${basePath}/sessions/${session.id}`)}>
                        <strong>{new Intl.DateTimeFormat(state.ui.language, { timeZone: state.ui.timeZone, day: "2-digit" }).format(new Date(session.startAt))}</strong>
                        <small>{getBookedCount(state, session.id)}/{session.capacity}</small>
                      </button>
                    )}
                  />
                  <div className="operator-series-footer">
                    <div>
                      <span>累计预约课次</span>
                      <strong>{enrolled}</strong>
                    </div>
                    <ProgressBar value={seriesSessions.length ? (enrolled / (series.capacity * seriesSessions.length)) * 100 : 0} />
                  </div>
                  <div className="operator-series-actions">
                    <small>{firstSession ? `首课 ${formatDateTime(firstSession.startAt, state.ui.timeZone, state.ui.language)}` : "暂未排课次时间"}</small>
                    <Button size="sm" variant="secondary" onClick={() => openSeriesSchedule(series.id)}>
                      <CalendarClock size={15} /> 配置课次时间
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(scheduleSeries)}
        title={scheduleSeries ? `配置课次时间 · ${scheduleSeries.title}` : "配置课次时间"}
        onClose={() => setScheduleSeriesId(null)}
        width="760px"
        footer={
          <div className="modal-footer-split">
            <small>保存时会整组校验教师时间冲突；有冲突则所有课次保持原时间。已预约学生会收到时间变更通知。</small>
            <div>
              <Button variant="ghost" onClick={() => setScheduleSeriesId(null)}>取消</Button>
              <Button onClick={saveSeriesSchedule} disabled={!scheduleSeries?.sessionIds.some((sessionId) => seriesTimes[sessionId])}>保存课次时间</Button>
            </div>
          </div>
        }
      >
        {scheduleSeries && (
          <>
            <div className="series-schedule-list">
              {scheduleSeries.sessionIds.map((sessionId, index) => {
                const session = getSession(state, sessionId);
                if (!session) return null;
                const itemLesson = getLesson(state, session.lessonId);
                const durationMinutes = Math.max(
                  1,
                  Math.round((new Date(session.endAt).getTime() - new Date(session.startAt).getTime()) / 60000)
                );
                return (
                  <label key={sessionId} className="series-schedule-row">
                    <span className="series-schedule-index">第 {index + 1} 课</span>
                    <span className="series-schedule-copy">
                      <strong>{itemLesson?.coverEmoji} {itemLesson?.title}</strong>
                      <small>{session.className} · 每次 {durationMinutes} 分钟 · {session.roomLabel}</small>
                    </span>
                    <TextInput
                      type="datetime-local"
                      value={seriesTimes[sessionId] ?? ""}
                      onChange={(event) => setSeriesTimes((value) => ({ ...value, [sessionId]: event.target.value }))}
                    />
                  </label>
                );
              })}
            </div>
            <div className="series-schedule-toolbar">
              <small>默认保留每个课次当前的时长与间隔；点「按每周顺延」会用第 1 课时间重排后续课次。</small>
              <Button size="sm" variant="ghost" onClick={spreadSeriesTimes}>按每周顺延</Button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(createMode)}
        title={createMode === "series" ? t("operator.newSeries") : t("operator.newSession")}
        onClose={() => setCreateMode(null)}
        width="720px"
        footer={
          <div className="modal-footer-split">
            <small>
              {createMode === "series"
                ? `已选 ${form.lessonIds.length} 个课节 · ${form.lessonIds.filter((id) => form.sessionSchedule[id]).length} 个课次已排时间`
                : "保存时会自动检查教师时间冲突"}
            </small>
            <div>
              <Button variant="ghost" onClick={() => setCreateMode(null)}>取消</Button>
              <Button
                disabled={createMode === "series" && (form.lessonIds.length < 2 || form.lessonIds.some((id) => !form.sessionSchedule[id]))}
                onClick={create}
              >
                创建并发布
              </Button>
            </div>
          </div>
        }
      >
        <div className="editor-grid">
          <Field label="班次标题" className="field-span-2">
            <TextInput value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} placeholder={createMode === "series" ? "留空则按主题名自动生成" : "留空则按课节名自动生成"} />
          </Field>
          {!academic && (
            <Field label="所属学校">
              <Select
                value={form.schoolId}
                onChange={(event) => setForm((value) => ({ ...value, schoolId: event.target.value, classId: "__new", className: "", teacherId: "" }))}
              >
                {state.schools.filter((item) => item.status === "active").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </Field>
          )}
          <Field label="班级名称">
            <Select
              value={form.classId}
              onChange={(event) => {
                const classId = event.target.value;
                const classGroup = state.classes.find((item) => item.id === classId);
                setForm((value) => ({ ...value, classId, schoolId: classGroup?.schoolId ?? value.schoolId, teacherId: classGroup?.teacherId ?? value.teacherId }));
              }}
            >
              <option value="__new">＋ 新建班级</option>
              {state.classes.filter((item) => item.status === "active" && item.schoolId === form.schoolId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
            {form.classId === "__new" && (
              <TextInput className="schedule-new-class-input" value={form.className} onChange={(event) => setForm((value) => ({ ...value, className: event.target.value }))} placeholder="输入新班级名称" />
            )}
          </Field>
          {createMode === "series" ? (
            <>
              <Field label="系列主题">
                <Select value={form.folderId} onChange={(event) => chooseTheme(event.target.value)}>
                  {themeFolders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                </Select>
              </Field>
              <div className="field field-span-2">
                <span className="field-label">系列课节（已选 {form.lessonIds.length} 个，按目录顺序开课）</span>
                <div className="assign-session-list">
                  {themeLessons.map((lesson) => {
                    const checked = form.lessonIds.includes(lesson.id);
                    return (
                      <label key={lesson.id} className={`assign-session-row ${checked ? "selected" : ""}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleSeriesLesson(lesson.id)} />
                        <span className="assign-session-copy">
                          <strong>{lesson.coverEmoji} {lesson.title}</strong>
                          <small>{lesson.subtitle} · {lesson.durationMinutes} 分钟</small>
                        </span>
                        <Badge tone={checked ? "mint" : "neutral"}>
                          {checked ? `第 ${form.lessonIds.indexOf(lesson.id) + 1} 课` : "未选"}
                        </Badge>
                      </label>
                    );
                  })}
                  {themeLessons.length === 0 && <p className="muted-copy">这个主题下还没有课节，请先到课程目录创建。</p>}
                </div>
                <small>系列班由同一主题下的多个课节组成，每个课节生成一个课次；至少选择两个课节。</small>
              </div>
            </>
          ) : (
            <Field label="关联课节">
              <Select value={form.lessonId} onChange={(event) => setForm((value) => ({ ...value, lessonId: event.target.value }))}>
                {state.lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
              </Select>
            </Field>
          )}
          <Field label={t("operator.teacherAssignment")}>
            <Select value={form.teacherId} onChange={(event) => setForm((value) => ({ ...value, teacherId: event.target.value }))}>
              {state.users.filter((item) => item.role === "teacher").filter((teacher) => state.schoolMemberships.some((membership) => membership.schoolId === form.schoolId && membership.userId === teacher.id && membership.role === "teacher" && membership.status === "active")).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
            </Select>
          </Field>
          <Field label={createMode === "series" ? "首节课时间（用于自动预排）" : "开始时间"}>
            <TextInput type="datetime-local" value={form.startAt} onChange={(event) => changeStartAt(event.target.value)} />
          </Field>
          <Field label="单次时长（分钟）">
            <TextInput type="number" value={form.durationMinutes} onChange={(event) => setForm((value) => ({ ...value, durationMinutes: Number(event.target.value) }))} />
          </Field>
          <Field label={t("common.capacity")}>
            <TextInput type="number" value={form.capacity} onChange={(event) => setForm((value) => ({ ...value, capacity: Number(event.target.value) }))} />
          </Field>
          <Field label="教室名称">
            <TextInput value={form.roomLabel} onChange={(event) => setForm((value) => ({ ...value, roomLabel: event.target.value }))} />
          </Field>
          {createMode === "series" && (
            <>
              <Field label="课节间隔（周）">
                <TextInput type="number" value={form.intervalWeeks} onChange={(event) => changeIntervalWeeks(Number(event.target.value))} />
              </Field>
              <Field label="系列说明" className="field-span-2">
                <textarea className="input textarea" value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} />
              </Field>
              <div className="field field-span-2">
                <span className="field-label">课次时间安排（AI 预排，可逐节调整）</span>
                <div className="series-schedule-list">
                  {form.lessonIds.map((lessonId, index) => {
                    const lesson = getLesson(state, lessonId);
                    return (
                      <label key={lessonId} className="series-schedule-row">
                        <span className="series-schedule-index">第 {index + 1} 课</span>
                        <span className="series-schedule-copy">
                          <strong>{lesson?.coverEmoji} {lesson?.title}</strong>
                          <small>{lesson?.subtitle}</small>
                        </span>
                        <TextInput
                          type="datetime-local"
                          value={form.sessionSchedule[lessonId] ?? ""}
                          onChange={(event) => updateSessionTime(lessonId, event.target.value)}
                        />
                      </label>
                    );
                  })}
                  {form.lessonIds.length === 0 && <p className="muted-copy">先选择课节，系统会按首节课时间与间隔自动预排。</p>}
                </div>
                <div className="series-schedule-toolbar">
                  <small>AI 按「首节课时间 + 课节间隔」预排；手动改过的课次不会被自动覆盖，点「重新自动预排」可整体重排。</small>
                  <Button size="sm" variant="ghost" disabled={form.lessonIds.length === 0} onClick={applyAutoSchedule}>重新自动预排</Button>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="schedule-preview-note">
          <WandSparkles size={20} />
          <div>
            <strong>自动配置预约窗口</strong>
            <span>开课前 30 分钟关闭预约，开课前 2 小时关闭学生自主取消。</span>
          </div>
        </div>
      </Modal>
    </>
  );
}
