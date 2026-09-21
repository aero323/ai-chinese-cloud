import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, CalendarCheck2, CheckCircle2, ClipboardList, TrendingUp, UsersRound } from "lucide-react";
import { usePlatformStore } from "../../store/usePlatformStore";
import { currentUser, getBookedCount, getLesson, teacherMetrics } from "../../lib/domain";
import { formatDateTime, relativeTime } from "../../lib/format";
import { Badge, Button, Card, PageHeader, ProgressBar, StatCard } from "../../components/ui";
import { ClassSessionCard } from "../../components/ClassSessionCard";

export function TeacherDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const state = usePlatformStore((store) => store.state);
  const user = currentUser(state);
  const metrics = teacherMetrics(state, user.id);
  const today = metrics.upcoming.filter((session) => new Date(session.startAt).toDateString() === new Date().toDateString());
  const next = metrics.upcoming[0];

  return (
    <>
      <PageHeader
        eyebrow={`Teacher workspace · ${user.name}`}
        title={t("teacher.hello")}
        description={t("teacher.subtitle")}
      />

      <section className="teacher-welcome">
        <div>
          <h2>{next ? `下一节：${next.title}` : "今天暂无排课"}</h2>
          <p>
            {next
              ? `${formatDateTime(next.startAt, state.ui.timeZone, state.ui.language)} · ${getBookedCount(state, next.id)} 位学生已预约 · ${next.roomLabel}`
              : "可以趁现在优化互动内容与材料。"}
          </p>
        </div>
      </section>

      <section className="stat-grid stat-grid-4">
        <StatCard label={t("teacher.weeklyClasses")} value={metrics.upcoming.length} detail={`${metrics.sessions.length} 节全部排课`} icon={<CalendarCheck2 size={20} />} tone="purple" />
        <StatCard label={t("teacher.totalStudents")} value={metrics.booked} detail={`${Math.round(metrics.fillRate)}% 平均满班率`} icon={<UsersRound size={20} />} tone="blue" progress={metrics.fillRate} />
        <StatCard label={t("teacher.averageScore")} value={metrics.averageScore ? Math.round(metrics.averageScore) : "--"} detail="所有已提交互动" icon={<TrendingUp size={20} />} tone="orange" />
        <StatCard label={t("teacher.completion")} value={`${Math.round(metrics.completionRate)}%`} detail="按预约与互动数估算" icon={<CheckCircle2 size={20} />} tone="mint" progress={metrics.completionRate} />
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
            {today.map((session) => {
              const lesson = getLesson(state, session.lessonId);
              return (
                <button key={session.id} onClick={() => navigate(`/teacher/session/${session.id}`)}>
                  <span className="today-time">
                    <strong>{new Intl.DateTimeFormat(state.ui.language, { timeZone: state.ui.timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(session.startAt))}</strong>
                    <small>{relativeTime(session.startAt, state.ui.language)}</small>
                  </span>
                  <span className="today-lesson">
                    <strong>{lesson?.coverEmoji} {lesson?.title}</strong>
                    <small>{getBookedCount(state, session.id)} 位学生 · {session.roomLabel}</small>
                  </span>
                  <ArrowRight size={17} />
                </button>
              );
            })}
            {today.length === 0 && <p className="muted-copy">今天没有排课，可以在课程内容里继续准备。</p>}
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
            {next && [
              { phase: "preview", badge: "课前", label: "预习互动已发布", ready: true },
              { phase: "live", badge: "课中", label: "课堂材料已关联", ready: true },
              { phase: "review", badge: "课后", label: "复习内容待确认", ready: false }
            ].map((item) => (
              <div key={item.phase}>
                <span className={`health-dot ${item.ready ? "done" : ""}`} />
                <div>
                  <span className="content-health-title">
                    <span className={`phase-badge phase-${item.phase} content-health-badge`}>{item.badge}</span>
                    <strong>{item.label}</strong>
                  </span>
                  <small>{item.ready ? "已准备好" : "建议课前完成检查"}</small>
                </div>
                <ProgressBar value={item.ready ? 100 : 45} tone={item.ready ? "mint" : "orange"} />
              </div>
            ))}
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
