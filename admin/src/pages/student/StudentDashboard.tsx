import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, BookOpenCheck, CalendarClock, ChevronRight, Clock3, Star } from "lucide-react";
import { Badge, Button, Card, PageHeader, StatCard } from "../../components/ui";
import { currentUser, getStudent, getUser, pickTodayTasks, studentMetrics, studentWebTasks } from "../../lib/domain";
import { formatDateTime } from "../../lib/format";
import { usePlatformStore } from "../../store/usePlatformStore";
import { InteractionSetPlayerModal } from "../../components/InteractionSetPlayerModal";
import { PmNote } from "../../components/PmNote";
import type { ClassSession, InteractionSet } from "../../domain/types";

/** 今日任务最多显示 4 条；三个推送窗口各先占 2 条，保证课前 / 课中 / 课后都露得出来。 */
const MAX_TODAY_TASKS = 4;
const PER_WINDOW_TASKS = 2;

export function StudentDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const state = usePlatformStore((store) => store.state);
  const user = currentUser(state);
  const metrics = studentMetrics(state, user.id);
  const profile = getStudent(state, user.id);
  const nextSession = metrics.upcoming[0];
  // 任务点开直接弹互动，不再跳到课节页。
  const [activeTask, setActiveTask] = useState<{ set: InteractionSet; session: ClassSession } | null>(null);
  const learningDays = profile
    ? Math.max(1, Math.ceil((Date.now() - new Date(profile.joinedAt).getTime()) / 86_400_000))
    : 0;
  // 今日任务按三个推送窗口来：课前提前 48 小时、课中上课当天、课后下课后 48 小时内。
  // 课中互动由学生端 App 承载，网页面只推课前 / 课后（见 studentWebTasks）。
  const tasksByWindow = studentWebTasks(state, user.id, Date.now(), state.ui.timeZone);
  const todayTasks = pickTodayTasks(tasksByWindow.map(({ tasks }) => tasks), MAX_TODAY_TASKS, PER_WINDOW_TASKS);

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
        <PmNote block kind="规则" note="网页展示课前和课后：课前提前 48 小时，课后下课起 48 小时内。最多展示 4 条，同一条互动只保留一个阶段。">
          <Card className="next-actions-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">Learning tasks</span>
              <h2>{t("student.todayTask")}</h2>
              <p className="muted-copy task-window-hint">{t("student.todayTaskHint")}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/student/schedule")}>
              查看全部 <ChevronRight size={16} />
            </Button>
          </div>
          <PmNote block kind="流程" note="点击任务直接进入互动；提交后记录答案、用时和错题，重练会保留历史并更新最佳分。">
            <div className="learning-task-list">
            {todayTasks.map(({ set, session }) => (
              <button
                key={set.id}
                className="learning-task"
                onClick={() => setActiveTask({ set, session })}
              >
                <span className={`task-phase phase-${set.phase}`}>
                  {set.phase === "preview" ? t("common.phasePreview") : set.phase === "live" ? t("common.phaseLive") : t("common.phaseReview")}
                </span>
                <span>
                  <strong>{set.title}</strong>
                  <small>
                    {session.title} · {formatDateTime(session.startAt, state.ui.timeZone, state.ui.language)} ·{' '}
                    {session.roomLabel} · {getUser(state, session.teacherId)?.name ?? ""}
                  </small>
                </span>
                <span className={metrics.completedSetIds.has(set.id) ? "task-done" : "task-open"}>
                  {metrics.completedSetIds.has(set.id) ? "已完成" : "去完成"}
                </span>
              </button>
            ))}
            {todayTasks.length === 0 && <p className="muted-copy">{t("student.noPrepYet")}</p>}
            </div>
          </PmNote>
          </Card>
        </PmNote>
      </div>

      {activeTask && (
        <InteractionSetPlayerModal
          set={activeTask.set}
          sessionId={activeTask.session.id}
          phase={activeTask.set.phase}
          onClose={() => setActiveTask(null)}
        />
      )}
    </>
  );
}
