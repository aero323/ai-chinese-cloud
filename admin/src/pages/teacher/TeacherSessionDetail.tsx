import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CalendarClock, Eye, FileText, Lock, MapPin, UsersRound } from "lucide-react";
import { usePlatformStore } from "../../store/usePlatformStore";
import { getBookedCount, getLesson, getSession, getStudent, getUser } from "../../lib/domain";
import { formatDate, formatRange, timeZoneLabel } from "../../lib/format";
import { Avatar, Badge, Button, Card, EmptyState, PageHeader, ProgressBar, SourceBadge } from "../../components/ui";

export function TeacherSessionDetail() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const state = usePlatformStore((store) => store.state);
  const session = getSession(state, sessionId);
  const lesson = session ? getLesson(state, session.lessonId) : undefined;
  if (!session || !lesson) return <EmptyState title="课程不存在" action={<Button onClick={() => navigate("/teacher/schedule")}>返回课表</Button>} />;
  const bookings = state.bookings
    .filter((booking) => booking.sessionId === session.id && booking.status === "booked")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const sets = state.interactionSets.filter((set) => set.lessonId === lesson.id);
  const booked = getBookedCount(state, session.id);

  return (
    <>
      <PageHeader
        eyebrow="Session detail"
        title={session.title}
        description={`${lesson.title} · ${formatDate(session.startAt, state.ui.timeZone, state.ui.language)}`}
        actions={<Button variant="secondary" onClick={() => navigate("/teacher/schedule")}><ArrowLeft size={17} /> 返回课表</Button>}
      />

      <section className="teacher-session-hero">
        <div className="session-hero-cover" style={{ background: `linear-gradient(135deg, ${lesson.color}, #f6f2ff)` }}>{lesson.coverEmoji}</div>
        <div>
          <Badge tone="orange"><Lock size={13} /> 教师只读</Badge>
          <h2>{lesson.title}</h2>
          <p>{lesson.description}</p>
          <div className="lesson-overview-meta">
            <span><CalendarClock size={16} /> {formatRange(session.startAt, session.endAt, state.ui.timeZone, state.ui.language)}</span>
            <span><MapPin size={16} /> {session.roomLabel}</span>
            <span><UsersRound size={16} /> {booked}/{session.capacity}</span>
          </div>
        </div>
        <div className="timezone-note">{timeZoneLabel(state.ui.timeZone)}</div>
      </section>

      <div className="dashboard-columns teacher-detail-layout">
        <Card className="roster-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">Roster</span>
              <h2>{t("teacher.sessionRoster")}</h2>
              <p>{t("teacher.rosterHint")}</p>
            </div>
            <Badge tone="blue">{bookings.length} 人</Badge>
          </div>
          <div className="roster-list">
            {bookings.map((booking) => {
              const user = getUser(state, booking.studentId);
              const profile = getStudent(state, booking.studentId);
              if (!user || !profile) return null;
              return (
                <article className="roster-row" key={booking.id}>
                  <Avatar label={user.avatar} tone="purple" />
                  <div>
                    <strong>{user.name}</strong>
                    <small>{profile.level} · {profile.program}</small>
                  </div>
                  <div className="roster-tags">
                    {profile.tags.slice(0, 2).map((tag) => <Badge key={tag} tone="neutral">{tag}</Badge>)}
                  </div>
                  <SourceBadge source={booking.source} />
                </article>
              );
            })}
          </div>
          <p className="privacy-note">{t("teacher.noContact")}</p>
        </Card>

        <div className="teacher-detail-side">
          <Card>
            <div className="card-heading">
              <div>
                <span className="eyebrow">Readiness</span>
                <h2>课程内容准备</h2>
              </div>
              <FileText size={20} />
            </div>
            <div className="readiness-list">
              {["preview", "live", "review"].map((phase) => {
                const phaseSets = sets.filter((set) => set.phase === phase);
                const label = phase === "preview" ? "预习" : phase === "live" ? "课中" : "复习";
                return (
                  <div key={phase}>
                    <strong>{label}内容</strong>
                    <span>{phaseSets.length} 项</span>
                    <ProgressBar value={phaseSets.length ? 100 : 0} tone={phaseSets.length ? "mint" : "orange"} />
                  </div>
                );
              })}
            </div>
            <Button variant="secondary" onClick={() => navigate("/teacher/interactions")}>进入互动设计</Button>
          </Card>

          <Card>
            <div className="card-heading">
              <div>
                <span className="eyebrow">Results</span>
                <h2>课堂结果概览</h2>
              </div>
              <Eye size={20} />
            </div>
            <div className="result-mini-metrics">
              <div><strong>{state.interactionAttempts.filter((attempt) => attempt.sessionId === session.id).length}</strong><small>答题次数</small></div>
              <div><strong>{booked ? Math.round((bookings.filter((booking) => state.interactionAttempts.some((attempt) => attempt.studentId === booking.studentId)).length / booked) * 100) : 0}%</strong><small>参与率</small></div>
            </div>
            <Button variant="ghost" onClick={() => navigate("/teacher/results")}>查看完整结果</Button>
          </Card>
        </div>
      </div>
    </>
  );
}
