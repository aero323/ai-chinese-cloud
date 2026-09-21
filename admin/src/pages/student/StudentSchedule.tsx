import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarCheck, CalendarDays, History, Hourglass, PlayCircle } from "lucide-react";
import { platform } from "../../lib/platform";
import { usePlatformStore } from "../../store/usePlatformStore";
import { currentUser, getLesson, getSession, getStudentWaitlist, lessonContent, studentMetrics } from "../../lib/domain";
import type { ClassSession } from "../../domain/types";
import { relativeTime } from "../../lib/format";
import { Badge, Button, Card, EmptyState, PageHeader, Tabs } from "../../components/ui";
import { ClassSessionCard } from "../../components/ClassSessionCard";
import { CoursewareModal } from "../../components/CoursewareModal";
import { StudentCalendarModal } from "../../components/StudentCalendarModal";

type ScheduleTab = "upcoming" | "history" | "waitlist";

export function StudentSchedule() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, run } = usePlatformStore();
  const user = currentUser(state);
  const metrics = studentMetrics(state, user.id);
  const waitlist = getStudentWaitlist(state, user.id);
  const [tab, setTab] = useState<ScheduleTab>("upcoming");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [courseware, setCourseware] = useState<{
    title: string;
    url: string;
    badgeLabel: string;
    note: string;
    lessonId: string;
    sessionId: string;
  } | null>(null);

  function openCourseware(session: ClassSession) {
    const lesson = getLesson(state, session.lessonId);
    const materials = lesson ? lessonContent(state, lesson.id).materials.filter(Boolean) : [];
    const currentUrl = (material: (typeof materials)[number]) =>
      material!.versions.find((item) => item.version === material!.currentVersion)?.url ?? material!.versions.at(-1)?.url;

    const coursewareMaterial = materials.find((material) => material!.kind === "courseware" && material!.versions.length > 0);
    const coursewareUrl = coursewareMaterial ? currentUrl(coursewareMaterial) : undefined;
    if (lesson && coursewareMaterial && coursewareUrl) {
      setCourseware({
        title: `${lesson.title} · 互动课件`,
        url: coursewareUrl,
        badgeLabel: "互动 HTML 课件",
        note: "支持词汇点读、选择题和句子排序，可直接在后台内播放。",
        lessonId: lesson.id,
        sessionId: session.id
      });
      return;
    }

    const pdfMaterial = materials.find((material) => material!.fileType === "pdf" && material!.versions.length > 0);
    const pdfUrl = pdfMaterial ? currentUrl(pdfMaterial) : undefined;
    if (lesson && pdfMaterial && pdfUrl) {
      setCourseware({
        title: `${lesson.title} · 课件预览`,
        url: pdfUrl,
        badgeLabel: "PDF 课件",
        note: "这节课的互动课件还没上传，先展示老师上传的 PDF 课件；如果下方没有显示，可点「新窗口打开」。",
        lessonId: lesson.id,
        sessionId: session.id
      });
      return;
    }

    setCourseware({
      title: `${lesson?.title ?? session.title} · 示例互动课件`,
      url: "/shared/demo-materials/friends-courseware.html",
      badgeLabel: "示例互动课件",
      note: "这节课暂未上传课件，先演示一份示例互动课件：支持词汇点读、选择题和句子排序。",
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
        actions={
          <Button onClick={() => navigate("/student/book")}>
            <CalendarCheck size={17} /> {t("student.quickBook")}
          </Button>
        }
      />

      <Card className="schedule-summary-strip">
        <div>
          <span className="quick-ring purple-ring"><CalendarCheck size={19} /></span>
          <strong>{metrics.upcoming.length}</strong>
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

      <div className="section-heading-row">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "upcoming", label: "即将开始", count: metrics.upcoming.length },
            { value: "history", label: "历史课程", count: metrics.past.length },
            { value: "waitlist", label: "候补队列", count: waitlist.length }
          ]}
        />
      </div>

      {tab === "upcoming" && (
        <div className="session-list">
          {metrics.upcoming.map((session) => (
            <ClassSessionCard
              key={session.id}
              state={state}
              session={session}
              showSeats={false}
              showSpecialty={false}
              actions={
                <>
                  <Button onClick={() => openCourseware(session)}>
                    <PlayCircle size={17} /> {t("student.viewCourseware")}
                  </Button>
                  <Button variant="ghost" onClick={() => cancel(session.id)}>
                    {t("common.cancel")}
                  </Button>
                </>
              }
            />
          ))}
          {metrics.upcoming.length === 0 && <EmptyState title="暂无即将开始的课程" description="去约课中心看看新的大班课时间。" action={<Button onClick={() => navigate("/student/book")}>去约课</Button>} />}
        </div>
      )}

      {tab === "history" && (
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
                  <Button variant="soft" onClick={() => navigate(`/student/lesson/${session.lessonId}?sessionId=${session.id}&phase=review`)}>
                    {t("student.review")}
                  </Button>
                  <Button variant="ghost" onClick={() => navigate(`/student/lesson/${session.lessonId}?sessionId=${session.id}&phase=preview`)}>
                    查看材料
                  </Button>
                </>
              }
            />
          ))}
          {metrics.past.length === 0 && <EmptyState title="还没有历史课程" />}
        </div>
      )}

      {tab === "waitlist" && (
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
      )}

      <StudentCalendarModal
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        state={state}
        sessions={metrics.sessions}
        onOpenCourseware={(session) => {
          setCalendarOpen(false);
          openCourseware(session);
        }}
      />

      <CoursewareModal
        open={Boolean(courseware)}
        title={courseware?.title ?? "互动课件"}
        url={courseware?.url}
        badgeLabel={courseware?.badgeLabel}
        note={courseware?.note}
        onClose={() => setCourseware(null)}
        onOpenLesson={
          courseware
            ? () => navigate(`/student/lesson/${courseware.lessonId}?sessionId=${courseware.sessionId}&phase=preview`)
            : undefined
        }
      />
    </>
  );
}
