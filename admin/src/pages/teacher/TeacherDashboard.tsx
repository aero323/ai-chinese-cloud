import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarOff,
  CheckCircle2,
  ClipboardList,
  Clock3,
  PlayCircle,
  Radio,
  TrendingUp,
  UsersRound
} from "lucide-react";
import { usePlatformStore } from "../../store/usePlatformStore";
import { currentUser, getBookedCount, getLesson, teacherMetrics } from "../../lib/domain";
import { formatDateTime, relativeTime } from "../../lib/format";
import { buildTeacherLiveDemo, setTeacherDemoMode, useTeacherDemoMode } from "../../lib/teacherLiveDemo";
import { Badge, Button, Card, PageHeader, ProgressBar, StatCard } from "../../components/ui";
import { ClassSessionCard } from "../../components/ClassSessionCard";

export function TeacherDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const state = usePlatformStore((store) => store.state);
  const user = currentUser(state);
  const [demoMode] = useTeacherDemoMode();
  const metrics = teacherMetrics(state, user.id);
  const liveDemo = demoMode === "live" ? buildTeacherLiveDemo(state, user.id) : null;
  const today = metrics.upcoming.filter((session) => new Date(session.startAt).toDateString() === new Date().toDateString());
  const liveSessionId = liveDemo?.session.id ?? "";
  const next = metrics.upcoming.find((session) => session.id !== liveSessionId) ?? metrics.upcoming[0];
  const activeInteraction = liveDemo?.interactions.find((interaction) => interaction.id === liveDemo.activeInteractionId) ?? liveDemo?.interactions[0];
  const currentCompletion = activeInteraction?.participantCount
    ? Math.round((activeInteraction.answered / activeInteraction.participantCount) * 100)
    : 0;
  const todaySessions = liveDemo
    ? [liveDemo.session, ...today.filter((session) => session.id !== liveDemo.session.id)]
    : today;
  const healthItems = liveDemo
    ? [
        { id: "live-interaction", phase: "live", badge: "课中", label: "互动正在实时进行", ready: true },
        { id: "live-courseware", phase: "live", badge: "课中", label: "课堂课件已投影", ready: true },
        { id: "live-review", phase: "review", badge: "课后", label: "回顾数据待归档", ready: false }
      ]
    : next
      ? [
          { id: "next-preview", phase: "preview", badge: "课前", label: "预习互动已发布", ready: true },
          { id: "next-live", phase: "live", badge: "课中", label: "课堂材料已关联", ready: true },
          { id: "next-review", phase: "review", badge: "课后", label: "复习内容待确认", ready: false }
        ]
      : [];

  return (
    <>
      <PageHeader
        eyebrow={`Teacher workspace · ${user.name}`}
        title={t("teacher.hello")}
        description={t("teacher.subtitle")}
      />

      {liveDemo ? (
        <button className="teacher-live-banner" onClick={() => navigate(`/teacher/live/${liveDemo.session.id}`)}>
          <div className="teacher-live-banner-main">
            <span className="teacher-live-badge"><span className="live-pulse-dot" /> 正在进行中</span>
            <h2>{liveDemo.lessonTitle}</h2>
            <p>{liveDemo.session.title} · {liveDemo.session.roomLabel} · {liveDemo.lessonSubtitle}</p>
            <div className="teacher-live-meta">
              <span><Clock3 size={14} /> 已进行 {liveDemo.elapsedMinutes} 分钟</span>
              <span><UsersRound size={14} /> {liveDemo.presentCount}/{liveDemo.participantTotal} 人在线</span>
              <span><Radio size={14} /> {liveDemo.interactions.length} 组互动同步中</span>
            </div>
          </div>

          <div className="teacher-live-now">
            <span className="teacher-live-now-label">当前互动</span>
            <strong>{activeInteraction?.title ?? "等待开启互动"}</strong>
            <div className="teacher-live-now-progress">
              <span>{activeInteraction?.answered ?? 0}/{activeInteraction?.participantCount ?? liveDemo.presentCount} 已作答</span>
              <ProgressBar value={currentCompletion} tone="mint" />
            </div>
            <span className="teacher-live-enter">进入实时课堂 <ArrowRight size={16} /></span>
          </div>
          <span className="teacher-live-orbit live-orbit-one" />
          <span className="teacher-live-orbit live-orbit-two" />
        </button>
      ) : (
        <section className="teacher-welcome teacher-welcome-empty">
          <span className="teacher-welcome-empty-icon"><CalendarOff size={24} /></span>
          <div>
            <Badge tone="neutral">演示：没课</Badge>
            <h2>今天暂无进行中的课堂</h2>
            <p>可以趁现在检查课程内容和互动设计；需要演示课堂状态时，切换到“有课”即可。</p>
          </div>
          <Button variant="secondary" onClick={() => setTeacherDemoMode("live")}><PlayCircle size={16} /> 切换到有课演示</Button>
        </section>
      )}

      <section className="stat-grid stat-grid-4">
        <StatCard label={t("teacher.weeklyClasses")} value={metrics.upcoming.length} detail={`${metrics.sessions.length} 节全部排课`} icon={<CalendarCheck2 size={20} />} tone="purple" />
        <StatCard label={t("teacher.totalStudents")} value={liveDemo?.presentCount ?? metrics.booked} detail={liveDemo ? `本课在线 ${liveDemo.presentCount}/${liveDemo.participantTotal}` : `${Math.round(metrics.fillRate)}% 平均满班率`} icon={<UsersRound size={20} />} tone="blue" progress={liveDemo ? (liveDemo.presentCount / liveDemo.participantTotal) * 100 : metrics.fillRate} />
        <StatCard label={liveDemo ? "当前答题率" : t("teacher.averageScore")} value={liveDemo ? `${currentCompletion}%` : metrics.averageScore ? Math.round(metrics.averageScore) : "--"} detail={liveDemo ? `${activeInteraction?.answered ?? 0} 人已完成当前互动` : "所有已提交互动"} icon={<TrendingUp size={20} />} tone="orange" />
        <StatCard label={liveDemo ? "课堂剩余" : t("teacher.completion")} value={liveDemo ? `${liveDemo.remainingMinutes} 分` : `${Math.round(metrics.completionRate)}%`} detail={liveDemo ? "按当前节奏估算" : "按预约与互动数估算"} icon={<CheckCircle2 size={20} />} tone="mint" progress={liveDemo ? Math.min(100, ((40 - liveDemo.remainingMinutes) / 40) * 100) : metrics.completionRate} />
      </section>

      <div className="dashboard-columns">
        <Card>
          <div className="card-heading">
            <div>
              <span className="eyebrow">Today</span>
              <h2>课堂内容</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/teacher/schedule")}>
              全部排课 <ArrowRight size={15} />
            </Button>
          </div>
          <div className="teacher-today-list">
            {todaySessions.map((session) => {
              const lesson = getLesson(state, session.lessonId);
              const isLive = session.id === liveSessionId;
              return (
                <button key={session.id} onClick={() => navigate(isLive ? `/teacher/live/${session.id}` : `/teacher/session/${session.id}`)}>
                  <span className={`today-time ${isLive ? "is-live" : ""}`}>
                    <strong>{isLive ? "直播中" : new Intl.DateTimeFormat(state.ui.language, { timeZone: state.ui.timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(session.startAt))}</strong>
                    <small>{isLive ? `已 ${liveDemo?.elapsedMinutes ?? 0} 分钟` : relativeTime(session.startAt, state.ui.language)}</small>
                  </span>
                  <span className="today-lesson">
                    <strong>{isLive ? liveDemo?.lessonTitle : lesson?.coverEmoji} {isLive ? "" : lesson?.title}</strong>
                    <small>{isLive ? `${activeInteraction?.answered ?? 0} 人已作答当前互动` : `${getBookedCount(state, session.id)} 位学生 · ${session.roomLabel}`}</small>
                  </span>
                  <ArrowRight size={17} />
                </button>
              );
            })}
            {todaySessions.length === 0 && <p className="muted-copy">今天没有排课，可以在课程内容里继续准备。</p>}
          </div>
        </Card>

        <Card>
          <div className="card-heading">
            <div>
              <span className="eyebrow">Content health</span>
              <h2>内容准备度</h2>
            </div>
            <ClipboardList size={20} />
          </div>
          <div className="content-health-list">
            {healthItems.map((item) => (
              <div key={item.id}>
                <span className={`health-dot ${item.ready ? "done" : ""}`} />
                <div>
                  <span className="content-health-title">
                    <span className={`phase-badge phase-${item.phase} content-health-badge`}>{item.badge}</span>
                    <strong>{item.label}</strong>
                  </span>
                  <small>{item.ready ? "已准备好" : liveDemo ? "课堂结束后自动整理" : "建议课前完成检查"}</small>
                </div>
                <ProgressBar value={item.ready ? 100 : 45} tone={item.ready ? "mint" : "orange"} />
              </div>
            ))}
            {healthItems.length === 0 && <p className="muted-copy">暂时没有待检查的课程内容。</p>}
          </div>
        </Card>
      </div>

      {next && (
        <section className="section-block">
          <div className="section-heading-row">
            <div>
              <span className="eyebrow">Next session</span>
              <h2>下一节课程</h2>
            </div>
          </div>
          <ClassSessionCard
            state={state}
            session={next}
            actions={
              <Button onClick={() => navigate(`/teacher/session/${next.id}`)}>
                查看预约与内容 <ArrowRight size={16} />
              </Button>
            }
            showTeacher={false}
            showSeats={false}
          />
        </section>
      )}
    </>
  );
}
