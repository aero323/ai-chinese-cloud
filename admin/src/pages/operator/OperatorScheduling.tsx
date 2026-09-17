import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarPlus, Layers3, Plus, Search, UsersRound, WandSparkles } from "lucide-react";
import { platform } from "../../lib/platform";
import { usePlatformStore } from "../../store/usePlatformStore";
import { currentUser, fillRate, getBookedCount, getLesson, getSession, getWaitlist } from "../../lib/domain";
import { formatDateTime, inputDateTime } from "../../lib/format";
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, ProgressBar, Select, Tabs, TextInput } from "../../components/ui";
import { ClassSessionCard } from "../../components/ClassSessionCard";

type ScheduleTab = "sessions" | "series";
type CreateMode = "single" | "series" | null;

export function OperatorScheduling() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, run } = usePlatformStore();
  const user = currentUser(state);
  const [tab, setTab] = useState<ScheduleTab>("sessions");
  const [query, setQuery] = useState("");
  const [createMode, setCreateMode] = useState<CreateMode>(null);
  const defaultStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
  defaultStart.setMinutes(0, 0, 0);
  const [form, setForm] = useState({
    title: "",
    lessonId: state.lessons[0]?.id ?? "",
    teacherId: state.users.find((item) => item.role === "teacher")?.id ?? "",
    startAt: inputDateTime(defaultStart),
    durationMinutes: 40,
    capacity: 30,
    sessionCount: 4,
    intervalWeeks: 1,
    roomLabel: "大班教室 A",
    description: ""
  });

  const sessions = state.sessions
    .filter((session) => !query || session.title.toLowerCase().includes(query.toLowerCase()) || getLesson(state, session.lessonId)?.title.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  function create() {
    const start = new Date(form.startAt);
    const end = new Date(start.getTime() + Number(form.durationMinutes) * 60_000);
    if (createMode === "single") {
      const result = run(
        () =>
          platform.createSession({
            title: form.title || `${getLesson(state, form.lessonId)?.title} · 大班课`,
            lessonId: form.lessonId,
            teacherId: form.teacherId,
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
      const result = run(
        () =>
          platform.createSeries({
            title: form.title || `${getLesson(state, form.lessonId)?.title} · 系列班`,
            lessonId: form.lessonId,
            teacherId: form.teacherId,
            startAt: start.toISOString(),
            sessionCount: Number(form.sessionCount),
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

  return (
    <>
      <PageHeader
        eyebrow="Scheduling"
        title={t("operator.sessionTitle")}
        description="运营统一维护班次时间、教师、容量、预约与取消截止时间。"
        actions={
          <>
            <Button variant="secondary" onClick={() => setCreateMode("series")}><Layers3 size={17} /> {t("operator.newSeries")}</Button>
            <Button onClick={() => setCreateMode("single")}><CalendarPlus size={17} /> {t("operator.newSession")}</Button>
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
                  <Button variant="ghost" onClick={() => navigate(`/operator/sessions/${session.id}`)}>名单与候补</Button>
                  <Button variant="secondary" onClick={() => navigate(`/operator/sessions/${session.id}`)}>管理班次</Button>
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
            const seriesSessions = series.sessionIds.map((id) => getSession(state, id)).filter(Boolean);
            const lesson = getLesson(state, series.lessonId);
            const enrolled = seriesSessions.reduce((sum, session) => sum + (session ? getBookedCount(state, session.id) : 0), 0);
            return (
              <Card className="operator-series-card" key={series.id}>
                <div className="series-cover" style={{ background: `linear-gradient(145deg, ${lesson?.color}, #eef0ff)` }}>
                  <span>{lesson?.coverEmoji}</span>
                  <Badge tone="purple">{series.sessionIds.length} 次课</Badge>
                </div>
                <div className="series-body">
                  <h2>{series.title}</h2>
                  <p>{series.description}</p>
                  <div className="series-meta">
                    <span><Layers3 size={16} /> 每 {series.durationMinutes} 分钟</span>
                    <span><UsersRound size={16} /> {series.capacity} 人容量</span>
                  </div>
                  <div className="series-session-dots">
                    {seriesSessions.map((session) => (
                      <button key={session!.id} onClick={() => navigate(`/operator/sessions/${session!.id}`)}>
                        <strong>{new Intl.DateTimeFormat(state.ui.language, { timeZone: state.ui.timeZone, day: "2-digit" }).format(new Date(session!.startAt))}</strong>
                        <small>{getBookedCount(state, session!.id)}/{session!.capacity}</small>
                      </button>
                    ))}
                  </div>
                  <div className="operator-series-footer">
                    <div>
                      <span>累计预约课次</span>
                      <strong>{enrolled}</strong>
                    </div>
                    <ProgressBar value={seriesSessions.length ? (enrolled / (series.capacity * seriesSessions.length)) * 100 : 0} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(createMode)}
        title={createMode === "series" ? t("operator.newSeries") : t("operator.newSession")}
        onClose={() => setCreateMode(null)}
        width="720px"
        footer={
          <div className="modal-footer-split">
            <small>保存时会自动检查教师时间冲突</small>
            <div><Button variant="ghost" onClick={() => setCreateMode(null)}>取消</Button><Button onClick={create}>创建并发布</Button></div>
          </div>
        }
      >
        <div className="editor-grid">
          <Field label="班次标题" className="field-span-2">
            <TextInput value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} placeholder="留空则按课节名自动生成" />
          </Field>
          <Field label="关联课节">
            <Select value={form.lessonId} onChange={(event) => setForm((value) => ({ ...value, lessonId: event.target.value }))}>
              {state.lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
            </Select>
          </Field>
          <Field label={t("operator.teacherAssignment")}>
            <Select value={form.teacherId} onChange={(event) => setForm((value) => ({ ...value, teacherId: event.target.value }))}>
              {state.users.filter((item) => item.role === "teacher").map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
            </Select>
          </Field>
          <Field label="开始时间">
            <TextInput type="datetime-local" value={form.startAt} onChange={(event) => setForm((value) => ({ ...value, startAt: event.target.value }))} />
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
              <Field label="系列课次数">
                <TextInput type="number" value={form.sessionCount} onChange={(event) => setForm((value) => ({ ...value, sessionCount: Number(event.target.value) }))} />
              </Field>
              <Field label="每隔几周">
                <TextInput type="number" value={form.intervalWeeks} onChange={(event) => setForm((value) => ({ ...value, intervalWeeks: Number(event.target.value) }))} />
              </Field>
              <Field label="系列说明" className="field-span-2">
                <textarea className="input textarea" value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} />
              </Field>
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
