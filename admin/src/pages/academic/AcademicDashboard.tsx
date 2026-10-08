import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, CalendarPlus, CheckCircle2, ClipboardCheck, TrendingUp, UserRoundCheck, UsersRound, XCircle } from "lucide-react";
import { Badge, Button, Card, EmptyState, PageHeader, ProgressBar, StatCard } from "../../components/ui";
import { currentUser, getBookedCount, getLesson } from "../../lib/domain";
import { getAcademicSchoolId, workspaceState } from "../../lib/academicScope";
import { defaultGradeRange } from "../../lib/gradeAnalytics";
import { buildTeacherRanking } from "../../lib/teacherPerformance";
import { formatDateTime } from "../../lib/format";
import { platform } from "../../lib/platform";
import { usePlatformStore } from "../../store/usePlatformStore";

export function AcademicDashboard() {
  const navigate = useNavigate();
  const { state: rawState, run } = usePlatformStore();
  const user = currentUser(rawState);
  const schoolId = getAcademicSchoolId(rawState, user);
  const state = useMemo(() => workspaceState(rawState, schoolId), [rawState, schoolId]);
  const school = state.schools.find((item) => item.id === schoolId);
  const published = state.sessions.filter((session) => session.status === "published");
  const capacity = published.reduce((sum, session) => sum + session.capacity, 0);
  const booked = published.reduce((sum, session) => sum + getBookedCount(state, session.id), 0);
  const todayKey = new Date().toISOString().slice(0, 10);
  const todaySessions = published.filter((session) => session.startAt.slice(0, 10) === todayKey);
  const pendingBookings = state.bookings.filter((booking) => booking.status === "pending_review");
  const pendingRequests = state.changeRequests.filter((request) => request.status === "pending");
  const teacherRanking = useMemo(
    () => buildTeacherRanking(state, schoolId, defaultGradeRange(state.ui.timeZone)).teachers.slice(0, 3),
    [schoolId, state]
  );
  const upcoming = published
    .filter((session) => new Date(session.endAt).getTime() >= Date.now())
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 5);

  function approve(bookingId: string) {
    run(() => platform.reviewBooking({ bookingId, decision: "approve", reason: "学校教务审核通过", actorId: user.id }), "报名已通过");
  }

  function reject(bookingId: string) {
    const reason = window.prompt("请输入驳回原因");
    if (!reason) return;
    run(() => platform.reviewBooking({ bookingId, decision: "reject", reason, actorId: user.id }), "报名已驳回");
  }

  return (
    <>
      <PageHeader
        eyebrow={`School operations · ${user.name}`}
        title={`${school?.name ?? "本校"}教学运行中心`}
        description="排课、学生、考务与教师表现集中在本校范围内，课程内容仍由平台教学管理维护。"
        actions={<Button onClick={() => navigate("/academic/scheduling")}><CalendarPlus size={17} /> 新建班次</Button>}
      />

      <section className="operator-hero">
        <div>
          <Badge tone="mint">学校教务态势总览</Badge>
          <h2>{pendingBookings.length ? `${pendingBookings.length} 条报名等待处理` : "本校教学运行状态正常"}</h2>
          <p>{todaySessions.length} 节课今天进行，{published.length} 节已发布课次，教师表现按实际授课归属统计。</p>
        </div>
        <div className="operator-hero-visual">
          <span className="orb orb-a" />
          <span className="orb orb-b" />
          <strong>{capacity ? Math.round((booked / capacity) * 100) : 0}%</strong>
          <small>本校满班率</small>
        </div>
      </section>

      <section className="stat-grid stat-grid-4">
        <StatCard label="本校教师" value={state.schoolMemberships.filter((item) => item.role === "teacher" && item.status === "active").length} detail="可排课教师成员" icon={<UsersRound size={20} />} tone="blue" />
        <StatCard label="本校学生" value={state.students.length} detail="有效成员档案" icon={<UserRoundCheck size={20} />} tone="mint" />
        <StatCard label="待审核报名" value={pendingBookings.length} detail="批准后占用名额" icon={<ClipboardCheck size={20} />} tone="orange" />
        <StatCard label="待处理申请" value={pendingRequests.length} detail="教师调课与排课申请" icon={<AlertCircle size={20} />} tone="purple" />
      </section>

      <div className="dashboard-columns">
        <Card>
          <div className="card-heading">
            <div><span className="eyebrow">Review queue</span><h2>报名审核待办</h2></div>
            <ClipboardCheck size={20} />
          </div>
          <div className="attention-list">
            {pendingBookings.slice(0, 5).map((booking) => {
              const session = state.sessions.find((item) => item.id === booking.sessionId);
              const student = state.users.find((item) => item.id === booking.studentId);
              if (!session) return null;
              return (
                <div className="academic-review-row" key={booking.id}>
                  <span>
                    <strong>{student?.name ?? "学生"} · {session.title}</strong>
                    <small>{session.className} · {formatDateTime(session.startAt, state.ui.timeZone, state.ui.language)}</small>
                  </span>
                  <span className="teacher-request-actions">
                    <Button size="sm" variant="ghost" onClick={() => reject(booking.id)}><XCircle size={14} /> 驳回</Button>
                    <Button size="sm" onClick={() => approve(booking.id)}><CheckCircle2 size={14} /> 通过</Button>
                  </span>
                </div>
              );
            })}
            {pendingBookings.length === 0 && <EmptyState title="没有待审核报名" description="学生提交需审核的报名后会出现在这里。" />}
          </div>
        </Card>

        <Card>
          <div className="card-heading">
            <div><span className="eyebrow">Teacher pulse</span><h2>教师表现速览</h2></div>
            <TrendingUp size={20} />
          </div>
          <div className="capacity-health-list">
            {teacherRanking.map((teacher) => (
              <button key={teacher.teacherId} onClick={() => navigate(`/academic/performance/${teacher.teacherId}`)}>
                <div>
                  <strong>{teacher.rank ? `#${teacher.rank} ${teacher.teacherName}` : teacher.teacherName}</strong>
                  <span>{teacher.ranked ? `${teacher.sampleSize} 名学生 · ${teacher.compositeAverage}` : "样本不足"}</span>
                </div>
                <ProgressBar value={teacher.compositeAverage ?? 0} tone={teacher.ranked ? "mint" : "neutral"} />
              </button>
            ))}
            {teacherRanking.length === 0 && <EmptyState title="暂无可统计教师" />}
          </div>
        </Card>
      </div>

      <Card className="operator-subsection">
        <div className="card-heading">
          <div><span className="eyebrow">Schedule</span><h2>近期课次</h2></div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/academic/scheduling")}>查看全部 <ArrowRight size={15} /></Button>
        </div>
        <div className="attention-list">
          {upcoming.map((session) => (
            <button key={session.id} onClick={() => navigate(`/academic/sessions/${session.id}`)}>
              <span className="attention-dot success" />
              <span>
                <strong>{session.title}</strong>
                <small>{session.className} · {getLesson(state, session.lessonId)?.title}</small>
              </span>
              <span className="attention-value">
                <strong>{getBookedCount(state, session.id)}/{session.capacity}</strong>
                <ArrowRight size={15} />
              </span>
            </button>
          ))}
          {upcoming.length === 0 && <EmptyState title="暂无近期课次" />}
        </div>
      </Card>
    </>
  );
}
