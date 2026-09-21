import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, BookOpenCheck, CalendarClock, ChevronRight, Clock3, Sparkles, Star } from "lucide-react";
import { Badge, Button, Card, PageHeader, StatCard } from "../../components/ui";
import { ClassSessionCard } from "../../components/ClassSessionCard";
import { currentUser, getLesson, getStudent, lessonContent, studentMetrics } from "../../lib/domain";
import { formatDateTime } from "../../lib/format";
import { usePlatformStore } from "../../store/usePlatformStore";

export function StudentDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const state = usePlatformStore((store) => store.state);
  const user = currentUser(state);
  const metrics = studentMetrics(state, user.id);
  const profile = getStudent(state, user.id);
  const nextSession = metrics.upcoming[0];
  const lesson = nextSession ? getLesson(state, nextSession.lessonId) : undefined;
  const content = lesson ? lessonContent(state, lesson.id, undefined, nextSession?.id) : { sets: [], materials: [] };
  const learningDays = profile
    ? Math.max(1, Math.ceil((Date.now() - new Date(profile.joinedAt).getTime()) / 86_400_000))
    : 0;
  // 今日任务：优先列出刚上完课的复习任务，再补上下一节课的预习/课中任务。
  const reviewWindowMs = 7 * 86_400_000;
  const reviewTasks = metrics.past
    .filter((session) => Date.now() - new Date(session.endAt).getTime() <= reviewWindowMs)
    .flatMap((session) =>
      lessonContent(state, session.lessonId, "review", session.id).sets.map((set) => ({ set, sessionId: session.id }))
    )
    .filter((item) => !metrics.completedSetIds.has(item.set.id));
  const upcomingTasks = content.sets.map((set) => ({ set, sessionId: nextSession?.id ?? "" }));
  const seenSetIds = new Set<string>();
  const todayTasks = [...reviewTasks, ...upcomingTasks]
    .filter((item) => {
      if (seenSetIds.has(item.set.id)) return false;
      seenSetIds.add(item.set.id);
      return true;
    })
    .slice(0, 4);
  const joinedDateLabel = profile
    ? new Intl.DateTimeFormat(state.ui.language, {
        timeZone: state.ui.timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(profile.joinedAt))
    : "--";

  return (
    <>
      <PageHeader
        eyebrow={t("student.journey")}
        title={t("student.greeting", { name: user.name })}
        description={`${t("common.timezone")}：${state.ui.timeZone}。今天也来练一点中文吧。`}
        actions={
          <Button onClick={() => navigate("/student/book")}>
            <Sparkles size={17} /> {t("student.quickBook")}
          </Button>
        }
      />

      <section className="student-hero-card">
        <div className="student-hero-copy">
          <Badge tone="purple">
            <CalendarClock size={13} /> {t("student.nextClass")}
          </Badge>
          {nextSession ? (
            <>
              <h2>{nextSession.title}</h2>
              <p>
                {formatDateTime(nextSession.startAt, state.ui.timeZone, state.ui.language)} · {nextSession.roomLabel}
              </p>
              <Button variant="soft" onClick={() => navigate(`/student/lesson/${nextSession.lessonId}?sessionId=${nextSession.id}&phase=preview`)}>
                {t("student.viewCourseware")} <ArrowRight size={17} />
              </Button>
            </>
          ) : (
            <>
              <h2>还没有即将开始的课堂</h2>
              <p>从约课中心选择一个适合你的时间吧。</p>
              <Button variant="soft" onClick={() => navigate("/student/book")}>
                {t("student.quickBook")} <ArrowRight size={17} />
              </Button>
            </>
          )}
        </div>
        <div className="student-panda-scene" aria-hidden="true">
          <span className="scene-sun" />
          <span className="scene-cloud cloud-a" />
          <span className="scene-cloud cloud-b" />
          <span className="scene-panda">🐼</span>
          <span className="scene-book">中文</span>
        </div>
      </section>

      <section className="stat-grid stat-grid-3">
        <StatCard
          label={t("student.lessonsTaken")}
          value={`${metrics.past.length}`}
          detail={t("student.lessonsTakenDetail")}
          icon={<BookOpenCheck size={20} />}
          tone="purple"
        />
        <StatCard
          label={t("student.learningDays")}
          value={t("student.daysValue", { days: learningDays })}
          detail={t("student.sinceJoined", { date: joinedDateLabel })}
          icon={<Star size={20} />}
          tone="orange"
        />
        <StatCard
          label={t("student.upcomingLessons")}
          value={`${metrics.upcoming.length}`}
          detail={t("student.upcomingLessonsDetail")}
          icon={<Clock3 size={20} />}
          tone="mint"
        />
      </section>

      <div className="dashboard-columns dashboard-single">
        <Card className="next-actions-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">{t("student.todayTask")}</span>
              <h2>{reviewTasks.length ? "今日学习任务" : lesson?.title ?? "今日学习任务"}</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/student/schedule")}>
              查看全部 <ChevronRight size={16} />
            </Button>
          </div>
          <div className="learning-task-list">
            {todayTasks.map(({ set, sessionId }) => (
              <button
                key={set.id}
                className="learning-task"
                onClick={() => navigate(`/student/lesson/${set.lessonId}?sessionId=${sessionId}&phase=${set.phase}`)}
              >
                <span className={`task-phase phase-${set.phase}`}>
                  {set.phase === "preview" ? t("common.phasePreview") : set.phase === "live" ? t("common.phaseLive") : t("common.phaseReview")}
                </span>
                <span>
                  <strong>{set.title}</strong>
                  <small>{set.description}</small>
                </span>
                <span className={metrics.completedSetIds.has(set.id) ? "task-done" : "task-open"}>
                  {metrics.completedSetIds.has(set.id) ? "已完成" : "去完成"}
                </span>
              </button>
            ))}
            {todayTasks.length === 0 && <p className="muted-copy">{t("student.noPrepYet")}</p>}
          </div>
        </Card>
      </div>

      {nextSession && (
        <section className="section-block">
          <div className="section-heading-row">
            <div>
              <span className="eyebrow">My series</span>
              <h2>{t("student.currentSeries")}</h2>
            </div>
          </div>
          <ClassSessionCard
            state={state}
            session={nextSession}
            showSeats={false}
            showSpecialty={false}
            actions={
              <Button onClick={() => navigate(`/student/lesson/${nextSession.lessonId}?sessionId=${nextSession.id}&phase=preview`)}>
                {t("student.openLesson")} <ArrowRight size={16} />
              </Button>
            }
          />
        </section>
      )}
    </>
  );
}
