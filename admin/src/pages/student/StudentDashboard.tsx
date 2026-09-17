import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, CalendarClock, ChevronRight, Clock3, Sparkles, Star, Target } from "lucide-react";
import { Badge, Button, Card, PageHeader, ProgressBar, StatCard } from "../../components/ui";
import { ClassSessionCard } from "../../components/ClassSessionCard";
import { currentUser, getLesson, lessonContent, studentMetrics } from "../../lib/domain";
import { formatDateTime } from "../../lib/format";
import { usePlatformStore } from "../../store/usePlatformStore";

export function StudentDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const state = usePlatformStore((store) => store.state);
  const user = currentUser(state);
  const metrics = studentMetrics(state, user.id);
  const nextSession = metrics.upcoming[0];
  const lesson = nextSession ? getLesson(state, nextSession.lessonId) : undefined;
  const content = lesson ? lessonContent(state, lesson.id) : { sets: [], materials: [] };
  const completedSets = content.sets.filter((set) => metrics.completedSetIds.has(set.id)).length;

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
              <div className="hero-progress">
                <span>
                  {completedSets}/{content.sets.length} {t("student.interactionDone")}
                </span>
                <ProgressBar value={content.sets.length ? (completedSets / content.sets.length) * 100 : 0} />
              </div>
              <Button variant="soft" onClick={() => navigate(`/student/lesson/${nextSession.lessonId}?sessionId=${nextSession.id}&phase=preview`)}>
                {t("student.openLesson")} <ArrowRight size={17} />
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
          label={t("student.interactionDone")}
          value={`${metrics.completedSetIds.size}`}
          detail={`${metrics.attempts.length} 次练习记录`}
          icon={<Target size={20} />}
          tone="purple"
        />
        <StatCard
          label={t("student.averageScore")}
          value={metrics.attempts.length ? `${Math.round(metrics.averageScore)}` : "--"}
          detail="自动评分，投票不计分"
          icon={<Star size={20} />}
          tone="orange"
        />
        <StatCard
          label={t("student.studyMinutes")}
          value={`${metrics.totalStudyMinutes}`}
          detail="来自互动用时记录"
          icon={<Clock3 size={20} />}
          tone="mint"
        />
      </section>

      <div className="dashboard-columns">
        <Card className="next-actions-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">{t("student.todayTask")}</span>
              <h2>{lesson?.title ?? "今日学习任务"}</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/student/schedule")}>
              查看全部 <ChevronRight size={16} />
            </Button>
          </div>
          <div className="learning-task-list">
            {content.sets.slice(0, 3).map((set) => (
              <button
                key={set.id}
                className="learning-task"
                onClick={() => navigate(`/student/lesson/${set.lessonId}?sessionId=${nextSession?.id ?? ""}&phase=${set.phase}`)}
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
            {content.sets.length === 0 && <p className="muted-copy">预约课堂后，老师发布的预习内容会显示在这里。</p>}
          </div>
        </Card>

        <Card className="mini-calendar-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">Upcoming</span>
              <h2>接下来</h2>
            </div>
            <CalendarClock size={20} />
          </div>
          <div className="upcoming-mini-list">
            {metrics.upcoming.slice(0, 3).map((session) => {
              const itemLesson = getLesson(state, session.lessonId);
              return (
                <button key={session.id} onClick={() => navigate(`/student/lesson/${session.lessonId}?sessionId=${session.id}&phase=preview`)}>
                  <span className="mini-date">
                    <strong>{new Intl.DateTimeFormat(state.ui.language, { timeZone: state.ui.timeZone, day: "2-digit" }).format(new Date(session.startAt))}</strong>
                    <small>{new Intl.DateTimeFormat(state.ui.language, { timeZone: state.ui.timeZone, month: "short" }).format(new Date(session.startAt))}</small>
                  </span>
                  <span>
                    <strong>{itemLesson?.title}</strong>
                    <small>{new Intl.DateTimeFormat(state.ui.language, { timeZone: state.ui.timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(session.startAt))}</small>
                  </span>
                  <ChevronRight size={16} />
                </button>
              );
            })}
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
