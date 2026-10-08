import { useNavigate } from "react-router-dom";
import { platform } from "../../lib/platform";
import { useTranslation } from "react-i18next";
import { AlertCircle, ArrowRight, CalendarPlus, CircleDollarSign, Layers3, TrendingUp, UserRoundCheck, UsersRound } from "lucide-react";
import { usePlatformStore } from "../../store/usePlatformStore";
import { currentUser, fillRate, getBookedCount, getLesson, getWaitlist, operatorMetrics } from "../../lib/domain";
import { formatDateTime } from "../../lib/format";
import { Badge, Button, Card, PageHeader, ProgressBar, StatCard } from "../../components/ui";

export function OperatorDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, run } = usePlatformStore();
  const user = currentUser(state);
  const metrics = operatorMetrics(state);
  const pendingReviews = state.bookings.filter((booking) => booking.status === "pending_review");
  const urgentSessions = metrics.published
    .filter((session) => getWaitlist(state, session.id).length > 0 || fillRate(state, session) >= 90)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 4);

  return (
    <>
      <PageHeader
        eyebrow={`Operations · ${user.name}`}
        title={t("operator.hello")}
        description={t("operator.subtitle")}
        actions={
          <Button onClick={() => navigate("/operator/scheduling")}>
            <CalendarPlus size={17} /> {t("operator.newSession")}
          </Button>
        }
      />

      <section className="operator-hero">
        <div>
          <Badge tone="blue">教学管理态势总览</Badge>
          <h2>今天的课程供给和预约都在健康范围内</h2>
          <p>{metrics.today.length} 节课程正在进行或即将开始，{metrics.waitlist.length} 位学生正在候补。</p>
        </div>
        <div className="operator-hero-visual">
          <span className="orb orb-a" />
          <span className="orb orb-b" />
          <strong>{Math.round(metrics.fillRate)}%</strong>
          <small>整体满班率</small>
        </div>
      </section>

      <section className="stat-grid stat-grid-4">
        <StatCard label={t("operator.fillRate")} value={`${Math.round(metrics.fillRate)}%`} detail={`${metrics.booked}/${metrics.capacity} 个座位`} icon={<TrendingUp size={20} />} tone="purple" progress={metrics.fillRate} />
        <StatCard label={t("operator.activeWaitlist")} value={metrics.waitlist.length} detail="等待自动补位" icon={<UsersRound size={20} />} tone="blue" />
        <StatCard label={t("operator.todayClasses")} value={metrics.today.length} detail="今天进行的班次" icon={<Layers3 size={20} />} tone="orange" />
        <StatCard label={t("operator.studentTotal")} value={metrics.students} detail="完整学生档案" icon={<UserRoundCheck size={20} />} tone="mint" />
      </section>

      {pendingReviews.length > 0 && (
        <Card className="operator-subsection">
          <div className="card-heading">
            <div><span className="eyebrow">Booking review</span><h2>全校待审核报名</h2><p>学校教务处理本校待办；这里保留平台教学管理兜底入口。</p></div>
            <AlertCircle size={20} />
          </div>
          <div className="attention-list">
            {pendingReviews.map((booking) => {
              const session = state.sessions.find((item) => item.id === booking.sessionId);
              const student = state.users.find((item) => item.id === booking.studentId);
              const school = state.schools.find((item) => item.id === session?.schoolId);
              if (!session) return null;
              return (
                <div className="academic-review-row" key={booking.id}>
                  <span><strong>{student?.name} · {session.title}</strong><small>{school?.name} · {session.className}</small></span>
                  <span className="teacher-request-actions">
                    <Button size="sm" variant="ghost" onClick={() => {
                      const reason = window.prompt("请输入驳回原因");
                      if (reason) run(() => platform.reviewBooking({ bookingId: booking.id, decision: "reject", reason, actorId: user.id }), "报名已驳回");
                    }}>驳回</Button>
                    <Button size="sm" onClick={() => run(() => platform.reviewBooking({ bookingId: booking.id, decision: "approve", reason: "平台教学管理审核通过", actorId: user.id }), "报名已通过")}>通过</Button>
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="dashboard-columns">
        <Card>
          <div className="card-heading">
            <div>
              <span className="eyebrow">Attention</span>
              <h2>{t("operator.dataTrend")}</h2>
            </div>
            <AlertCircle size={20} />
          </div>
          <div className="attention-list">
            {urgentSessions.map((session) => {
              const lesson = getLesson(state, session.lessonId);
              const waitlist = getWaitlist(state, session.id).length;
              return (
                <button key={session.id} onClick={() => navigate(`/operator/sessions/${session.id}`)}>
                  <span className={`attention-dot ${waitlist > 0 ? "warning" : "success"}`} />
                  <span>
                    <strong>{session.title}</strong>
                    <small>{session.className} · {formatDateTime(session.startAt, state.ui.timeZone, state.ui.language)}</small>
                  </span>
                  <span className="attention-value">
                    <strong>{waitlist > 0 ? `${waitlist} 候补` : `${Math.round(fillRate(state, session))}% 满`}</strong>
                    <ArrowRight size={15} />
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="card-heading">
            <div>
              <span className="eyebrow">Capacity</span>
              <h2>课程容量健康度</h2>
            </div>
            <CircleDollarSign size={20} />
          </div>
          <div className="capacity-health-list">
            {metrics.published.slice(0, 5).map((session) => {
              const rate = fillRate(state, session);
              return (
                <div key={session.id}>
                  <div><strong>{session.title}</strong><span>{getBookedCount(state, session.id)}/{session.capacity}</span></div>
                  <ProgressBar value={rate} tone={rate >= 90 ? "orange" : rate >= 60 ? "mint" : "purple"} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </>
  );
}
