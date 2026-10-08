import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarOff,
  CheckCircle2,
  Clock3,
  Layers3,
  PlayCircle,
  TrendingUp,
  UsersRound
} from "lucide-react";
import { usePlatformStore } from "../../store/usePlatformStore";
import { buildClassAnalytics } from "../../lib/classAnalytics";
import { currentUser, getBookedCount, getLesson, teacherMetrics } from "../../lib/domain";
import { formatDateTime, formatRange } from "../../lib/format";
import { buildTeacherLiveDemo, setTeacherDemoMode, useTeacherDemoMode } from "../../lib/teacherLiveDemo";
import { Badge, Button, Card, PageHeader, ProgressBar, StatCard } from "../../components/ui";
import { ClassSessionCard } from "../../components/ClassSessionCard";
import { PmNote } from "../../components/PmNote";
import { SessionRosterModal } from "../../components/SessionRosterModal";

/** 完成率配色：≥80 完成较好、≥50 基本完成、其余偏弱。 */
function rateTone(rate: number) {
  if (rate >= 80) return "is-good";
  if (rate >= 50) return "is-ok";
  return "is-weak";
}

export function TeacherDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const state = usePlatformStore((store) => store.state);
  const user = currentUser(state);
  const [demoMode] = useTeacherDemoMode();
  const [rosterSessionId, setRosterSessionId] = useState<string | null>(null);
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
  /** 最近两节已结束课次的全班完成情况，作为课程结果的缩略摘要。 */
  const recentResults = metrics.sessions
    .filter((session) => new Date(session.endAt).getTime() < Date.now())
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
    .slice(0, 2)
    .map((session) => {
      const analytics = buildClassAnalytics(state, session);
      return {
        session,
        rate: analytics.averageRate,
        reached: analytics.reachedStudents,
        roster: analytics.rosterSize
      };
    });

  return (
    <>
      <PageHeader
        eyebrow={`Teacher workspace · ${user.name}`}
        title={t("teacher.hello")}
        description={t("teacher.subtitle")}
      />

      {liveDemo ? (
        <PmNote kind="流程" block note="入口绑定当前进行中的课次；进入后所有实时数据都以该课次为上下文。">
          <div
            className="teacher-live-banner"
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/teacher/live/${liveDemo.session.id}`)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              navigate(`/teacher/live/${liveDemo.session.id}`);
            }}
          >
            <div className="teacher-live-banner-main">
              <span className="teacher-live-badge"><span className="live-pulse-dot" /> 正在进行中</span>
              <h2>{liveDemo.lessonTitle}</h2>
              <p>{liveDemo.session.className} · {liveDemo.session.title} · {liveDemo.session.roomLabel} · {liveDemo.lessonSubtitle}</p>
              <div className="teacher-live-meta">
                <span><Clock3 size={14} /> 已进行 {liveDemo.elapsedMinutes} 分钟</span>
                <span><UsersRound size={14} /> {liveDemo.presentCount}/{liveDemo.participantTotal} 人在线</span>
              </div>
            </div>

            <PmNote
              block
              kind="规则"
              note="所有互动未开始时，默认展示第一个互动，进度条为 0 并显示“未开始”；课次没有配置互动时，不展示这一块。"
            >
              <div className="teacher-live-now">
                <span className="teacher-live-now-label">当前互动</span>
                <strong>{activeInteraction?.title ?? "等待开启互动"}</strong>
                <div className="teacher-live-now-progress">
                  <span>{activeInteraction?.answered ?? 0}/{activeInteraction?.participantCount ?? liveDemo.presentCount} 已作答</span>
                  <ProgressBar value={currentCompletion} tone="mint" />
                </div>
                <span className="teacher-live-enter">进入实时课堂 <ArrowRight size={16} /></span>
              </div>
            </PmNote>
            <span className="teacher-live-orbit live-orbit-one" />
            <span className="teacher-live-orbit live-orbit-two" />
          </div>
        </PmNote>
      ) : (
        <section className="teacher-welcome teacher-welcome-empty">
          <span className="teacher-welcome-empty-icon"><CalendarOff size={24} /></span>
          <div>
            <Badge tone="neutral">演示：没课</Badge>
            <h2>现在暂无演示中的课堂</h2>
            <p>可以趁现在检查课程内容和互动设计；需要演示课堂状态时，切换到“有课”即可。</p>
          </div>
          <Button variant="secondary" onClick={() => setTeacherDemoMode("live")}><PlayCircle size={16} /> 切换到有课演示</Button>
        </section>
      )}

      <section className="stat-grid stat-grid-4">
        <PmNote block kind="口径" note="本周：周一到周日；只统计当前教师本周已发布课次，之后周次不计。">
          <StatCard label={t("teacher.weeklyClasses")} value={metrics.upcoming.length} detail={`${metrics.sessions.length} 节全部排课`} icon={<CalendarCheck2 size={20} />} tone="purple" />
        </PmNote>
        <PmNote block kind="口径" note="按课次席位累计；同一学生报名多节课会重复计数。">
          <StatCard label={t("teacher.totalStudents")} value={liveDemo?.presentCount ?? metrics.booked} detail={liveDemo ? `本课在线 ${liveDemo.presentCount}/${liveDemo.participantTotal}` : `${Math.round(metrics.fillRate)}% 平均满班率`} icon={<UsersRound size={20} />} tone="blue" progress={liveDemo ? (liveDemo.presentCount / liveDemo.participantTotal) * 100 : metrics.fillRate} />
        </PmNote>
        <PmNote block kind="口径" note={liveDemo ? "进行中互动的已答人数 ÷ 在线人数。" : "取已提交互动成绩的平均值，不包含未开始互动。"}>
          <StatCard label={liveDemo ? "当前答题率" : t("teacher.averageScore")} value={liveDemo ? `${currentCompletion}%` : metrics.averageScore ? Math.round(metrics.averageScore) : "--"} detail={liveDemo ? `${activeInteraction?.answered ?? 0} 人已完成当前互动` : "所有已提交互动"} icon={<TrendingUp size={20} />} tone="orange" />
        </PmNote>
        <PmNote block kind="口径" note={liveDemo ? "按课次计划结束时间倒计时。" : "按预约学生与应完成互动数估算。"}>
          <StatCard label={liveDemo ? "课堂剩余" : t("teacher.completion")} value={liveDemo ? `${liveDemo.remainingMinutes} 分` : `${Math.round(metrics.completionRate)}%`} detail={liveDemo ? "按当前节奏估算" : "按预约与互动数估算"} icon={<CheckCircle2 size={20} />} tone="mint" progress={liveDemo ? Math.min(100, ((40 - liveDemo.remainingMinutes) / 40) * 100) : metrics.completionRate} />
        </PmNote>
      </section>

      <div className="dashboard-columns">
        <PmNote block kind="流程" note="只显示今天开课且状态为已发布的课次；点击进入课堂或预约名单。">
          <Card>
          <div className="card-heading">
            <div>
              <span className="eyebrow">Today</span>
              <h2>今日排课</h2>
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
                <button key={session.id} onClick={() => (isLive ? navigate(`/teacher/live/${session.id}`) : setRosterSessionId(session.id))}>
                  <span className={`today-time ${isLive ? "is-live" : ""}`}>
                    <strong>{formatRange(session.startAt, session.endAt, state.ui.timeZone, state.ui.language)}</strong>
                  </span>
                  <span className="today-lesson">
                    <strong>{lesson?.coverEmoji} {lesson?.title}</strong>
                    <small>
                      {session.className} · {session.roomLabel} · {isLive
                        ? `${liveDemo?.presentCount ?? 0}/${liveDemo?.participantTotal ?? session.capacity}`
                        : `${getBookedCount(state, session.id)}/${session.capacity}`} 人
                    </small>
                  </span>
                  <ArrowRight size={17} />
                </button>
              );
            })}
            {todaySessions.length === 0 && <p className="muted-copy">今天没有排课，可以在课程内容里继续准备。</p>}
          </div>
          </Card>
        </PmNote>

        <PmNote block kind="规则" note="按上课时间取最近三节已结束课次，展示全班内容完成率与参与人数，点击进入完整课程结果。">
          <Card>
          <div className="card-heading">
            <div>
              <span className="eyebrow">Recent results</span>
              <h2>最近课程结果</h2>
            </div>
            <TrendingUp size={20} />
          </div>
          <div className="recent-content-list is-results">
            {recentResults.map((item) => (
              <button
                className="recent-content-row"
                key={item.session.id}
                onClick={() => navigate(`/teacher/results?sessionId=${item.session.id}`)}
                title={`${item.session.title} · 完成率 ${item.rate}%`}
              >
                <span className="recent-result-rate-group">
                  <small>内容完成率</small>
                  <span className={`recent-result-rate ${rateTone(item.rate)}`}>{item.rate}%</span>
                </span>
                <span className="recent-result-copy">
                  <strong>{item.session.title}</strong>
                  <small>{formatDateTime(item.session.startAt, state.ui.timeZone, state.ui.language)} · {item.session.className}</small>
                </span>
                <small className="recent-result-meta">{item.reached}/{item.roster} 人</small>
              </button>
            ))}
            {recentResults.length === 0 && <p className="muted-copy">上完第一节课后，这里会显示完成情况。</p>}
          </div>
          </Card>
        </PmNote>
      </div>

      {next && (
        <PmNote block kind="规则" note="优先展示下一节未结束的已发布课次，并以其上下文准备课堂内容和名单。">
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
              <>
                <Button variant="secondary" onClick={() => setRosterSessionId(next.id)}>
                  <UsersRound size={16} /> 学生名单
                </Button>
                <Button onClick={() => navigate(`/teacher/session/${next.id}/design`)}>
                  <Layers3 size={16} /> 课堂设计 <ArrowRight size={16} />
                </Button>
              </>
            }
            showTeacher={false}
            showSeats={false}
          />
          </section>
        </PmNote>
      )}

      <SessionRosterModal sessionId={rosterSessionId} onClose={() => setRosterSessionId(null)} />
    </>
  );
}
