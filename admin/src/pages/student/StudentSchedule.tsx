import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarCheck, CalendarDays, History, Hourglass, PlayCircle } from "lucide-react";
import { platform } from "../../lib/platform";
import { usePlatformStore } from "../../store/usePlatformStore";
import {
  currentUser,
  getLesson,
  getSession,
  getStudentPendingReviewBookings,
  getStudentWaitlist,
  isSessionPendingReview,
  lessonContent,
  studentMetrics
} from "../../lib/domain";
import type { ClassSession, Phase } from "../../domain/types";
import { relativeTime } from "../../lib/format";
import { Badge, Button, Card, EmptyState, PageHeader, Tabs } from "../../components/ui";
import { ClassSessionCard } from "../../components/ClassSessionCard";
import { PmNote } from "../../components/PmNote";
import { StudentCalendarModal } from "../../components/StudentCalendarModal";
import { SessionContentModal } from "../../components/SessionContentModal";

type ScheduleTab = "upcoming" | "history" | "waitlist";

export function StudentSchedule() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, run } = usePlatformStore();
  const user = currentUser(state);
  const metrics = studentMetrics(state, user.id);
  const waitlist = getStudentWaitlist(state, user.id);
  const pendingReviewSessions = getStudentPendingReviewBookings(state, user.id)
    .map((booking) => getSession(state, booking.sessionId))
    .filter((session): session is ClassSession => Boolean(session && session.status === "published" && new Date(session.endAt).getTime() >= Date.now()));
  const upcomingCount = metrics.upcoming.length + pendingReviewSessions.length;
  const [tab, setTab] = useState<ScheduleTab>("upcoming");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [preview, setPreview] = useState<{
    phase: Phase;
    title: string;
    url?: string;
    materialId?: string;
    badgeLabel: string;
    note: string;
    lessonId: string;
    sessionId: string;
  } | null>(null);

  /** 打开课前 / 课后内容弹窗：课件 + 该阶段材料 + 该阶段互动都在同一个弹窗里。 */
  function openSessionContent(session: ClassSession, phase: Phase) {
    const lesson = getLesson(state, session.lessonId);
    const materials = lesson ? lessonContent(state, lesson.id, phase, session.id).materials.filter(Boolean) : [];
    const coursewareMaterial = materials.find(
      (material) => material!.kind === "courseware" && material!.versions.length > 0
    );
    const coursewareUrl = coursewareMaterial
      ? coursewareMaterial.versions.find((item) => item.version === coursewareMaterial.currentVersion)?.url ??
        coursewareMaterial.versions.at(-1)?.url
      : undefined;

    setPreview({
      phase,
      title: lesson?.title ?? session.title,
      url: coursewareUrl,
      materialId: coursewareMaterial?.id,
      badgeLabel: "互动课件",
      note: "支持词汇点读、选择题和句子排序，可直接在播放器里操作。",
      lessonId: session.lessonId,
      sessionId: session.id
    });
  }

  function cancel(sessionId: string) {
    const booking = state.bookings.find((item) => item.studentId === user.id && item.sessionId === sessionId && item.status === "booked");
    if (!booking) return;
    if (window.confirm("确定取消这套课程预约吗？如果属于系列班，将整套取消。")) {
      run(() => platform.cancelBooking({ bookingId: booking.id, actorId: user.id }), "预约已取消");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="My learning calendar"
        title={t("student.scheduleTitle")}
      />

      <PmNote block kind="口径" note="即将开始包含正式预约和待审核报名；候补数量只统计仍在等待的课程。">
        <Card className="schedule-summary-strip">
        <div>
          <span className="quick-ring purple-ring"><CalendarCheck size={19} /></span>
          <strong>{upcomingCount}</strong>
          <small>即将开始</small>
        </div>
        <div>
          <span className="quick-ring mint-ring"><History size={19} /></span>
          <strong>{metrics.past.length}</strong>
          <small>历史课程</small>
        </div>
        <div>
          <span className="quick-ring orange-ring"><Hourglass size={19} /></span>
          <strong>{waitlist.length}</strong>
          <small>候补中的课程</small>
        </div>
        <button className="calendar-tile" onClick={() => setCalendarOpen(true)}>
          <span className="quick-ring blue-ring"><CalendarDays size={19} /></span>
          <strong>课程日历</strong>
          <small>看过去与未来哪天有课</small>
        </button>
        </Card>
      </PmNote>

      <div className="section-heading-row">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "upcoming", label: "即将开始", count: upcomingCount },
            { value: "history", label: "历史课程", count: metrics.past.length },
            { value: "waitlist", label: "候补队列", count: waitlist.length }
          ]}
        />
      </div>

      {tab === "upcoming" && (
        <PmNote block kind="流程" note="「课前预习」在一个弹窗里查看课件、课前材料与互动；取消会释放名额，系列班则整套取消。需审核班次审核前显示「待审核」，不占用班级名额。">
          <div className="session-list">
          {[...pendingReviewSessions, ...metrics.upcoming].map((session) => {
            const pendingReview = isSessionPendingReview(state, user.id, session.id);
            return (
              <ClassSessionCard
                key={session.id}
                state={state}
                session={session}
                showSeats={false}
                showSpecialty={false}
                actions={pendingReview ? (
                  <>
                    <Badge tone="orange">{t("student.pendingReview")}</Badge>
                    <span className="action-caption">{t("student.pendingReviewHint")}</span>
                  </>
                ) : (
                  <>
                    <Button onClick={() => openSessionContent(session, "preview")}>
                      <PlayCircle size={17} /> {t("student.prep")}
                    </Button>
                    <Button variant="ghost" onClick={() => cancel(session.id)}>
                      {t("common.cancel")}
                    </Button>
                  </>
                )}
              />
            );
          })}
          {upcomingCount === 0 && <EmptyState title="暂无即将开始的课程" description="去约课中心看看新的大班课时间。" action={<Button onClick={() => navigate("/student/book")}>去约课</Button>} />}
          </div>
        </PmNote>
      )}

      {tab === "history" && (
        <PmNote block kind="流程" note="点击复习进入该课次的课后内容。">
          <div className="session-list">
          {metrics.past.map((session) => (
            <ClassSessionCard
              key={session.id}
              state={state}
              session={session}
              showSeats={false}
              showSpecialty={false}
              actions={
                <>
                  <Button variant="soft" onClick={() => openSessionContent(session, "review")}>
                    {t("student.review")}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => navigate(`/student/lesson/${session.lessonId}?sessionId=${session.id}&phase=review`)}
                  >
                    {t("student.courseDetail")}
                  </Button>
                </>
              }
            />
          ))}
          {metrics.past.length === 0 && <EmptyState title="还没有历史课程" />}
          </div>
        </PmNote>
      )}

      {tab === "waitlist" && (
        <PmNote block kind="规则" note="候补按加入时间排序；释放名额后自动转正并发送通知。">
          <div className="waitlist-grid">
          {waitlist.map((entry) => {
            const session = entry.sessionId ? getSession(state, entry.sessionId) : undefined;
            const series = entry.seriesId ? state.series.find((item) => item.id === entry.seriesId) : undefined;
            return (
              <Card className="waitlist-card" key={entry.id}>
                <div className="waitlist-status">
                  <Hourglass size={21} />
                  <Badge tone="blue">候补中</Badge>
                </div>
                <h3>{series?.title ?? session?.title}</h3>
                <p>
                  {entry.sessionIds.length > 0
                    ? `整套 ${entry.sessionIds.length} 次课程已锁定候补顺序。`
                    : "出现空位后，系统会按排队顺序自动为你转正。"}
                </p>
                <div className="waitlist-meta">
                  <span>加入时间：{relativeTime(entry.createdAt, state.ui.language)}</span>
                  <span>当前排位：第 {state.waitlist.filter((item) => item.status === "waiting" && ((item.sessionId && item.sessionId === entry.sessionId) || item.seriesId === entry.seriesId)).findIndex((item) => item.id === entry.id) + 1} 位</span>
                </div>
                <Button variant="secondary" onClick={() => run(() => platform.leaveWaitlist({ waitlistId: entry.id }), "已退出候补")}>
                  退出候补
                </Button>
              </Card>
            );
          })}
          {waitlist.length === 0 && <EmptyState title="暂无候补课程" description="满员班次可以在约课中心加入候补。" />}
          </div>
        </PmNote>
      )}

      <StudentCalendarModal
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        state={state}
        sessions={metrics.sessions}
        onOpenCourseware={(session) => {
          setCalendarOpen(false);
          openSessionContent(session, "preview");
        }}
      />

      <SessionContentModal
        open={Boolean(preview)}
        state={state}
        phase={preview?.phase ?? "preview"}
        title={preview?.title ?? "课前预习"}
        lessonId={preview?.lessonId ?? ""}
        sessionId={preview?.sessionId ?? ""}
        coursewareUrl={preview?.url}
        coursewareMaterialId={preview?.materialId}
        coursewareBadge={preview?.badgeLabel}
        coursewareNote={preview?.note}
        onClose={() => setPreview(null)}
        onOpenLesson={() => {
          if (!preview) return;
          const target = `/student/lesson/${preview.lessonId}?sessionId=${preview.sessionId}&phase=preview`;
          setPreview(null);
          navigate(target);
        }}
      />
    </>
  );
}
