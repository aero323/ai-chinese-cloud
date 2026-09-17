import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CalendarPlus, Pencil, Save, Star, TrendingUp } from "lucide-react";
import { platform } from "../../lib/platform";
import { usePlatformStore } from "../../store/usePlatformStore";
import { currentUser, getLesson, getSession, getStudent, getUser, studentMetrics } from "../../lib/domain";
import { formatDateTime, relativeTime } from "../../lib/format";
import type { PlatformUser, StudentProfile } from "../../domain/types";
import { Avatar, Badge, Button, Card, EmptyState, Field, PageHeader, ProgressBar, Select, StatCard, Tabs, TextInput } from "../../components/ui";

export function OperatorStudentDetail() {
  const { studentId = "" } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { state, run } = usePlatformStore();
  const operator = currentUser(state);
  const user = getUser(state, studentId);
  const profile = getStudent(state, studentId);
  const metrics = studentMetrics(state, studentId);
  const [tab, setTab] = useState<"bookings" | "results" | "profile">("bookings");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => ({
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    status: user?.status ?? "active",
    level: profile?.level ?? "",
    program: profile?.program ?? "",
    learningGoal: profile?.learningGoal ?? "",
    notes: profile?.notes ?? ""
  }));

  if (!user || !profile) return <EmptyState title="学生不存在" action={<Button onClick={() => navigate("/operator/students")}>返回学生列表</Button>} />;

  function save() {
    const result = run(
      () =>
        platform.updateStudent({
          studentId,
          patch: form as Partial<PlatformUser & StudentProfile>,
          actorId: operator.id,
          reason: "运营更新学生档案"
        }),
      "学生档案已更新"
    );
    if (result.ok) setEditing(false);
  }

  return (
    <>
      <PageHeader
        eyebrow="Student profile"
        title={user.name}
        description={`${profile.level} · ${profile.program} · ${user.timeZone}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("/operator/scheduling")}><CalendarPlus size={16} /> 去代约课程</Button>
            {editing ? <Button onClick={save}><Save size={16} /> 保存档案</Button> : <Button onClick={() => setEditing(true)}><Pencil size={16} /> 编辑档案</Button>}
          </>
        }
      />

      <section className="student-profile-hero">
        <Avatar label={user.avatar} size="lg" tone="purple" />
        <div>
          <div className="profile-name-row"><h2>{user.name}</h2><Badge tone="mint">{user.status === "active" ? "活跃" : "暂停"}</Badge></div>
          <p>{profile.learningGoal}</p>
          <div className="profile-tags">{profile.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        </div>
        <div className="profile-joined">
          <small>加入时间</small>
          <strong>{formatDateTime(profile.joinedAt, state.ui.timeZone, state.ui.language)}</strong>
          <span>{relativeTime(profile.joinedAt, state.ui.language)}</span>
        </div>
      </section>

      <section className="stat-grid stat-grid-4">
        <StatCard label="待上课程" value={metrics.upcoming.length} detail="已预约的未来课堂" icon={<CalendarPlus size={20} />} tone="purple" />
        <StatCard label="互动完成" value={metrics.completedSetIds.size} detail={`${metrics.attempts.length} 次作答`} icon={<TrendingUp size={20} />} tone="mint" />
        <StatCard label="平均得分" value={metrics.averageScore ? Math.round(metrics.averageScore) : "--"} detail="所有互动记录" icon={<Star size={20} />} tone="orange" />
        <StatCard label="练习时长" value={`${metrics.totalStudyMinutes} 分`} detail="互动累计用时" icon={<CalendarPlus size={20} />} tone="blue" />
      </section>

      <div className="section-heading-row">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "bookings", label: "预约记录", count: metrics.bookings.length },
            { value: "results", label: "学习结果", count: metrics.attempts.length },
            { value: "profile", label: "档案信息" }
          ]}
        />
      </div>

      {tab === "bookings" && (
        <Card className="student-booking-table-card">
          <div className="data-table">
            <div className="data-table-head"><span>课程</span><span>时间</span><span>来源</span><span>状态</span></div>
            {metrics.bookings.map((booking) => {
              const session = getSession(state, booking.sessionId);
              const lesson = session ? getLesson(state, session.lessonId) : undefined;
              return (
                <div className="data-table-row" key={booking.id}>
                  <span><strong>{lesson?.title}</strong><small>{session?.title}</small></span>
                  <span>{session ? formatDateTime(session.startAt, state.ui.timeZone, state.ui.language) : "-"}</span>
                  <span><Badge tone={booking.source === "operator" ? "orange" : "mint"}>{booking.source === "operator" ? "运营代约" : "学生预约"}</Badge></span>
                  <span><Badge tone="mint">已预约</Badge></span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {tab === "results" && (
        <div className="attempt-list">
          {metrics.attempts.map((attempt) => {
            const set = state.interactionSets.find((item) => item.id === attempt.setId);
            return (
              <Card className="attempt-row" key={attempt.id}>
                <span className={`attempt-score ${attempt.score >= 80 ? "good" : "medium"}`}>{attempt.score}</span>
                <div><strong>{set?.title}</strong><p>{formatDateTime(attempt.completedAt, state.ui.timeZone, state.ui.language)} · {attempt.timeSpentSeconds} 秒</p></div>
                <Badge tone={attempt.wrongItemIds.length ? "orange" : "mint"}>{attempt.wrongItemIds.length} 个错题</Badge>
              </Card>
            );
          })}
        </div>
      )}

      {tab === "profile" && (
        <Card className="profile-edit-card">
          {editing ? (
            <div className="editor-grid">
              <Field label="姓名"><TextInput value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} /></Field>
              <Field label="联系方式"><TextInput value={form.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} /></Field>
              <Field label="状态"><Select value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value as "active" | "paused" }))}><option value="active">活跃</option><option value="paused">暂停</option></Select></Field>
              <Field label="等级"><TextInput value={form.level} onChange={(event) => setForm((value) => ({ ...value, level: event.target.value }))} /></Field>
              <Field label="课程项目" className="field-span-2"><TextInput value={form.program} onChange={(event) => setForm((value) => ({ ...value, program: event.target.value }))} /></Field>
              <Field label="学习目标" className="field-span-2"><TextInput value={form.learningGoal} onChange={(event) => setForm((value) => ({ ...value, learningGoal: event.target.value }))} /></Field>
              <Field label="运营备注" className="field-span-2"><textarea className="input textarea" value={form.notes} onChange={(event) => setForm((value) => ({ ...value, notes: event.target.value }))} /></Field>
            </div>
          ) : (
            <div className="profile-detail-grid">
              <div><small>联系方式</small><strong>{user.phone}</strong></div>
              <div><small>时区</small><strong>{user.timeZone}</strong></div>
              <div><small>等级</small><strong>{profile.level}</strong></div>
              <div><small>课程项目</small><strong>{profile.program}</strong></div>
              <div className="span-2"><small>学习目标</small><strong>{profile.learningGoal}</strong></div>
              <div className="span-2"><small>运营备注</small><strong>{profile.notes}</strong></div>
            </div>
          )}
        </Card>
      )}
    </>
  );
}
